import { supabase } from '../lib/supabase';
import { useCardsStore } from '../store/cards-store';
import { useDebtsStore, setDebtSyncHandlers } from '../store/debts-store';
import { useTransactionsStore, setTransactionSyncHandlers } from '../store/transactions-store';
import {
  bankToRow,
  rowToBank,
  cardToRow,
  rowToCard,
  personToRow,
  rowToPerson,
  debtToRow,
  rowToDebt,
  chargeToRow,
  rowToCharge,
  loanToRow,
  rowToLoan,
  transactionToRow,
  rowToTransaction,
  toDeterministicUuid,
  type BankRow,
  type CreditCardRow,
  type PersonRow,
  type PersonalDebtRow,
  type ThirdPartyCardChargeRow,
  type FriendLoanRow,
  type TransactionRow,
} from '../lib/sync-adapters';

export type SyncResult = {
  success: boolean;
  offline?: boolean;
  error?: string;
  syncedAt?: string;
  push?: SyncResult;
  pull?: SyncResult;
};

const mergeById = <T extends { id: string }>(local: T[], remote: T[]): T[] => {
  const map = new Map<string, T>();
  for (const item of local) {
    map.set(toDeterministicUuid(item.id), item);
  }
  for (const item of remote) {
    map.set(toDeterministicUuid(item.id), item);
  }
  return Array.from(map.values());
};

let isSyncInProgress = false;

export type SyncStateListener = (isSyncing: boolean) => void;
let isInitialSyncActive = false;
const syncListeners = new Set<SyncStateListener>();

export const notifySyncListeners = (status: boolean): void => {
  isInitialSyncActive = status;
  syncListeners.forEach((listener) => listener(status));
};

export const subscribeToInitialSync = (listener: SyncStateListener): (() => void) => {
  syncListeners.add(listener);
  listener(isInitialSyncActive);
  return () => {
    syncListeners.delete(listener);
  };
};

export const isInitialSyncing = (): boolean => isInitialSyncActive;

export const syncPush = async (userId?: string): Promise<SyncResult> => {
  try {
    let targetUserId = userId;
    if (!targetUserId) {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.user?.id) {
        return { success: false, offline: true, error: 'Usuario no autenticado' };
      }
      targetUserId = data.session.user.id;
    }

    const { banks, cards } = useCardsStore.getState();
    const { people, personalDebts, friendLoans, thirdPartyCharges } = useDebtsStore.getState();
    const { transactions } = useTransactionsStore.getState();

    // 1. Bancos
    const bankRows: BankRow[] = (banks || []).map((b) => bankToRow(b, targetUserId));
    const validBankIds = new Set<string>(bankRows.map((b) => b.id));
    if (bankRows.length > 0) {
      const { error } = await supabase.from('banks').upsert(bankRows, { onConflict: 'id' });
      if (error) {
        return { success: false, offline: true, error: error.message };
      }
    }

    // 2. Tarjetas de crédito
    const cardRows: CreditCardRow[] = (cards || []).map((c) => {
      const matchingBank = (banks || []).find(
        (b) => b.name.toLowerCase() === c.bankName.toLowerCase()
      );
      return cardToRow(c, targetUserId, matchingBank?.id);
    });
    const validCardIds = new Set<string>(cardRows.map((c) => c.id));
    if (cardRows.length > 0) {
      const { error } = await supabase
        .from('credit_cards')
        .upsert(cardRows, { onConflict: 'id' });
      if (error) {
        return { success: false, offline: true, error: error.message };
      }
    }

    // 3. Contactos / Personas
    const peopleRows: PersonRow[] = (people || []).map((p) => personToRow(p, targetUserId));
    const validPersonIds = new Set<string>(peopleRows.map((p) => p.id));
    if (peopleRows.length > 0) {
      const { error } = await supabase.from('people').upsert(peopleRows, { onConflict: 'id' });
      if (error) {
        return { success: false, offline: true, error: error.message };
      }
    }

    // 4. Deudas Personales
    const debtRows: PersonalDebtRow[] = (personalDebts || []).map((d) =>
      debtToRow(d, targetUserId, validBankIds, validCardIds)
    );
    const validDebtIds = new Set<string>(debtRows.map((d) => d.id));
    if (debtRows.length > 0) {
      const { error } = await supabase
        .from('personal_debts')
        .upsert(debtRows, { onConflict: 'id' });
      if (error) {
        return { success: false, offline: true, error: error.message };
      }
    }

    // 5. Préstamos a Amigos
    const loanRows: FriendLoanRow[] = (friendLoans || []).map((l) =>
      loanToRow(l, targetUserId, validPersonIds)
    );
    const validLoanIds = new Set<string>(loanRows.map((l) => l.id));
    if (loanRows.length > 0) {
      const { error } = await supabase
        .from('friend_loans')
        .upsert(loanRows, { onConflict: 'id' });
      if (error) {
        return { success: false, offline: true, error: error.message };
      }
    }

    // 6. Compras de Terceros
    const chargeRows: ThirdPartyCardChargeRow[] = (thirdPartyCharges || []).map((tc) =>
      chargeToRow(tc, targetUserId, validPersonIds, validCardIds)
    );
    const validChargeIds = new Set<string>(chargeRows.map((c) => c.id));
    if (chargeRows.length > 0) {
      const { error } = await supabase
        .from('third_party_card_charges')
        .upsert(chargeRows, { onConflict: 'id' });
      if (error) {
        return { success: false, offline: true, error: error.message };
      }
    }

    // 7. Transacciones del Libro Diario
    const txRows: TransactionRow[] = (transactions || []).map((t) =>
      transactionToRow(t, targetUserId, {
        cardIds: validCardIds,
        bankIds: validBankIds,
        debtIds: validDebtIds,
        loanIds: validLoanIds,
        chargeIds: validChargeIds,
        personIds: validPersonIds,
      })
    );
    if (txRows.length > 0) {
      const { error } = await supabase
        .from('transactions')
        .upsert(txRows, { onConflict: 'id' });
      if (error) {
        return { success: false, offline: true, error: error.message };
      }
    }

    return { success: true, syncedAt: new Date().toISOString() };
  } catch (error) {
    const errMessage =
      error instanceof Error ? error.message : 'Error de conexión o red durante syncPush';
    return { success: false, offline: true, error: errMessage };
  }
};

export const syncPull = async (userId: string): Promise<SyncResult> => {
  try {
    if (!userId) {
      return { success: false, offline: true, error: 'Usuario no autenticado' };
    }

    // 1. Pull bancos
    const { data: banksData, error: banksErr } = await supabase
      .from('banks')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null);
    if (banksErr) {
      return { success: false, offline: true, error: banksErr.message };
    }

    // 2. Pull tarjetas
    const { data: cardsData, error: cardsErr } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null);
    if (cardsErr) {
      return { success: false, offline: true, error: cardsErr.message };
    }

    // 3. Pull personas
    const { data: peopleData, error: peopleErr } = await supabase
      .from('people')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null);
    if (peopleErr) {
      return { success: false, offline: true, error: peopleErr.message };
    }

    // 4. Pull deudas personales
    const { data: debtsData, error: debtsErr } = await supabase
      .from('personal_debts')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null);
    if (debtsErr) {
      return { success: false, offline: true, error: debtsErr.message };
    }

    // 5. Pull préstamos a amigos
    const { data: loansData, error: loansErr } = await supabase
      .from('friend_loans')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null);
    if (loansErr) {
      return { success: false, offline: true, error: loansErr.message };
    }

    // 6. Pull compras de terceros
    const { data: chargesData, error: chargesErr } = await supabase
      .from('third_party_card_charges')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null);
    if (chargesErr) {
      return { success: false, offline: true, error: chargesErr.message };
    }

    // 7. Pull transacciones
    const { data: txData, error: txErr } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null);
    if (txErr) {
      return { success: false, offline: true, error: txErr.message };
    }

    // Aplicar actualizaciones a Zustand
    if (banksData && banksData.length > 0) {
      const pulledBanks = (banksData as BankRow[]).map(rowToBank);
      const currentBanks = useCardsStore.getState().banks;
      useCardsStore.setState({ banks: mergeById(currentBanks, pulledBanks) });
    }

    if (cardsData && cardsData.length > 0) {
      const pulledCards = (cardsData as CreditCardRow[]).map(rowToCard);
      const currentCards = useCardsStore.getState().cards;
      useCardsStore.setState({ cards: mergeById(currentCards, pulledCards) });
    }

    const debtsStoreUpdates: Partial<ReturnType<typeof useDebtsStore.getState>> = {};

    if (peopleData && peopleData.length > 0) {
      const pulledPeople = (peopleData as PersonRow[]).map(rowToPerson);
      const currentPeople = useDebtsStore.getState().people;
      debtsStoreUpdates.people = mergeById(currentPeople, pulledPeople);
    }

    if (debtsData && debtsData.length > 0) {
      const pulledDebts = (debtsData as PersonalDebtRow[]).map(rowToDebt);
      const currentDebts = useDebtsStore.getState().personalDebts;
      debtsStoreUpdates.personalDebts = mergeById(currentDebts, pulledDebts);
    }

    if (loansData && loansData.length > 0) {
      const pulledLoans = (loansData as FriendLoanRow[]).map(rowToLoan);
      const currentLoans = useDebtsStore.getState().friendLoans;
      debtsStoreUpdates.friendLoans = mergeById(currentLoans, pulledLoans);
    }

    if (chargesData && chargesData.length > 0) {
      const pulledCharges = (chargesData as ThirdPartyCardChargeRow[]).map(rowToCharge);
      const currentCharges = useDebtsStore.getState().thirdPartyCharges;
      debtsStoreUpdates.thirdPartyCharges = mergeById(currentCharges, pulledCharges);
    }

    if (Object.keys(debtsStoreUpdates).length > 0) {
      useDebtsStore.setState(debtsStoreUpdates);
    }

    if (txData && txData.length > 0) {
      const pulledTx = (txData as TransactionRow[]).map(rowToTransaction);
      const currentTx = useTransactionsStore.getState().transactions;
      useTransactionsStore.setState({ transactions: mergeById(currentTx, pulledTx) });
    }

    return { success: true, syncedAt: new Date().toISOString() };
  } catch (error) {
    const errMessage =
      error instanceof Error ? error.message : 'Error de conexión o red durante syncPull';
    return { success: false, offline: true, error: errMessage };
  }
};

export const syncAll = async (userId?: string): Promise<SyncResult> => {
  if (isSyncInProgress) {
    return { success: false, offline: true, error: 'Sincronización ya en curso' };
  }

  isSyncInProgress = true;
  notifySyncListeners(true);
  const safetyTimeout = setTimeout(() => {
    notifySyncListeners(false);
  }, 4000);

  try {
    let targetUserId = userId;
    if (!targetUserId) {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.user?.id) {
        return { success: false, offline: true, error: 'Sin sesión activa' };
      }
      targetUserId = data.session.user.id;
    }

    // 1. Pull remote changes first
    const pullResult = await syncPull(targetUserId);

    // 2. Push local changes
    const pushResult = await syncPush(targetUserId);

    const success = pullResult.success && pushResult.success;
    const error = pullResult.error || pushResult.error;

    return {
      success,
      push: pushResult,
      pull: pullResult,
      error,
      offline: pullResult.offline || pushResult.offline,
      syncedAt: pullResult.syncedAt || pushResult.syncedAt,
    };
  } catch (error) {
    const errMessage =
      error instanceof Error ? error.message : 'Error imprevisto durante syncAll';
    return { success: false, offline: true, error: errMessage };
  } finally {
    clearTimeout(safetyTimeout);
    notifySyncListeners(false);
    isSyncInProgress = false;
  }
};

export type SyncTable =
  | 'transactions'
  | 'personal_debts'
  | 'friend_loans'
  | 'third_party_card_charges'
  | 'credit_cards'
  | 'banks'
  | 'people';

export const deleteRemoteRecord = async (
  table: SyncTable,
  localId: string
): Promise<void> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (error || !userId) {
      return;
    }

    const uuid = toDeterministicUuid(localId);

    await supabase
      .from(table)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', uuid)
      .eq('user_id', userId);
  } catch {
    // Silencioso ante fallas de red o indisponibilidad offline
  }
};

export const triggerBackgroundPush = (): void => {
  // Ejecutar en microtarea / segundo plano sin bloquear
  setTimeout(() => {
    syncPush().catch(() => {});
  }, 300);
};

export const syncService = {
  syncPush,
  syncPull,
  syncAll,
  deleteRemoteRecord,
  triggerBackgroundPush,
  isSyncing: (): boolean => isSyncInProgress,
  isInitialSyncing,
  subscribeToInitialSync,
};

setTransactionSyncHandlers({
  onTransactionAdded: (): void => {
    syncService.triggerBackgroundPush();
  },
  onTransactionDeleted: (id: string): void => {
    syncService.deleteRemoteRecord('transactions', id).catch(() => {});
  },
});

setDebtSyncHandlers({
  onDebtAddedOrUpdated: (): void => {
    syncService.triggerBackgroundPush();
  },
  onPersonalDebtDeleted: (id: string): void => {
    syncService.deleteRemoteRecord('personal_debts', id).catch(() => {});
  },
  onFriendLoanDeleted: (id: string): void => {
    syncService.deleteRemoteRecord('friend_loans', id).catch(() => {});
  },
  onThirdPartyChargeDeleted: (id: string): void => {
    syncService.deleteRemoteRecord('third_party_card_charges', id).catch(() => {});
  },
  onPersonDeleted: (id: string): void => {
    syncService.deleteRemoteRecord('people', id).catch(() => {});
  },
});
