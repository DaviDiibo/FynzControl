import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useCardsStore, setCardSyncHandlers } from '../store/cards-store';
import { useDebtsStore, setDebtSyncHandlers } from '../store/debts-store';
import { useTransactionsStore, setTransactionSyncHandlers } from '../store/transactions-store';
import { safeStorage } from '../store/safe-storage';
import {
  bankToRow,
  rowToBank,
  cardToRow,
  rowToCard,
  personToRow,
  rowToPerson,
  debtToRow,
  rowToDebt,
  rowToDebt as rowToPersonalDebt,
  chargeToRow,
  rowToCharge,
  rowToCharge as rowToThirdPartyCharge,
  loanToRow,
  rowToLoan,
  rowToLoan as rowToFriendLoan,
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

export type SyncTable =
  | 'transactions'
  | 'personal_debts'
  | 'friend_loans'
  | 'third_party_card_charges'
  | 'credit_cards'
  | 'banks'
  | 'people';

export type PendingDeletion = {
  id: string; // ID original o UUID
  table: SyncTable;
  deletedAt: string;
  attempts: number;
};

export const PENDING_DELETIONS_STORAGE_KEY = 'controlfynz-pending-deletions-v1';

let pendingDeletionsCache: PendingDeletion[] = [];
let isTombstoneQueueLoaded = false;
let isFlushingDeletions = false;
let hasPendingFlushRequest = false;

export const getPendingDeletions = async (): Promise<PendingDeletion[]> => {
  try {
    const raw = await safeStorage.getItem(PENDING_DELETIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        pendingDeletionsCache = parsed as PendingDeletion[];
        isTombstoneQueueLoaded = true;
        return [...pendingDeletionsCache];
      }
    }
  } catch {
    // Fallback a caché en memoria
  }
  isTombstoneQueueLoaded = true;
  return [...pendingDeletionsCache];
};

export const getPendingDeletionIdSet = (table: SyncTable): Set<string> => {
  const set = new Set<string>();
  for (const item of pendingDeletionsCache) {
    if (item.table === table) {
      set.add(item.id);
      set.add(toDeterministicUuid(item.id));
    }
  }
  return set;
};

export const enqueuePendingDeletion = async (
  table: SyncTable,
  id: string
): Promise<void> => {
  if (!isTombstoneQueueLoaded) {
    await getPendingDeletions();
  }

  const existingIndex = pendingDeletionsCache.findIndex(
    (item) =>
      item.table === table &&
      (item.id === id || toDeterministicUuid(item.id) === toDeterministicUuid(id))
  );

  const now = new Date().toISOString();
  if (existingIndex >= 0) {
    pendingDeletionsCache[existingIndex] = {
      ...pendingDeletionsCache[existingIndex],
      deletedAt: now,
    };
  } else {
    pendingDeletionsCache.push({
      id,
      table,
      deletedAt: now,
      attempts: 0,
    });
  }

  try {
    await safeStorage.setItem(
      PENDING_DELETIONS_STORAGE_KEY,
      JSON.stringify(pendingDeletionsCache)
    );
  } catch {
    // safeStorage maneja fallback a memoria internamente
  }

  // Disparar en segundo plano flushPendingDeletions sin bloquear al llamador
  flushPendingDeletions().catch(() => {});
};

export const flushPendingDeletions = async (
  userId?: string
): Promise<{ success: boolean; processed: number }> => {
  if (isFlushingDeletions) {
    hasPendingFlushRequest = true;
    return { success: false, processed: 0 };
  }

  isFlushingDeletions = true;
  try {
    let targetUserId = userId;
    if (!targetUserId) {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.user?.id) {
        return { success: false, processed: 0 };
      }
      targetUserId = data.session.user.id;
    }

    const currentDeletions = await getPendingDeletions();
    if (currentDeletions.length === 0) {
      return { success: true, processed: 0 };
    }

    const successfulKeys = new Set<string>();
    const failedAttemptMap = new Map<string, number>();
    let processedCount = 0;

    for (const item of currentDeletions) {
      const itemKey = `${item.table}:${toDeterministicUuid(item.id)}`;
      try {
        const uuid = toDeterministicUuid(item.id);
        const { error } = await supabase
          .from(item.table)
          .update({ deleted_at: item.deletedAt })
          .eq('id', uuid)
          .eq('user_id', targetUserId);

        if (error) {
          failedAttemptMap.set(itemKey, item.attempts + 1);
        } else {
          successfulKeys.add(itemKey);
          processedCount++;
        }
      } catch {
        failedAttemptMap.set(itemKey, item.attempts + 1);
      }
    }

    // Actualizar la caché conservando cualquier nuevo elemento encolado durante el flush
    pendingDeletionsCache = pendingDeletionsCache
      .filter((item) => !successfulKeys.has(`${item.table}:${toDeterministicUuid(item.id)}`))
      .map((item) => {
        const itemKey = `${item.table}:${toDeterministicUuid(item.id)}`;
        const updatedAttempts = failedAttemptMap.get(itemKey);
        return updatedAttempts !== undefined ? { ...item, attempts: updatedAttempts } : item;
      });

    try {
      await safeStorage.setItem(
        PENDING_DELETIONS_STORAGE_KEY,
        JSON.stringify(pendingDeletionsCache)
      );
    } catch {
      // safeStorage maneja fallback a memoria internamente
    }

    return { success: true, processed: processedCount };
  } catch {
    return { success: false, processed: 0 };
  } finally {
    isFlushingDeletions = false;
    if (hasPendingFlushRequest) {
      hasPendingFlushRequest = false;
      setTimeout(() => {
        flushPendingDeletions(userId).catch(() => {});
      }, 100);
    }
  }
};

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
  const result = Array.from(map.values());

  // Si los elementos corresponden a transacciones, ordenar cronológicamente descendente
  if (result.length > 0 && 'date' in result[0] && 'category' in result[0]) {
    return result.sort((a, b) => {
      const itemA = a as { date?: string | number | Date; createdAt?: string | number | Date };
      const itemB = b as { date?: string | number | Date; createdAt?: string | number | Date };
      const timeA = new Date(itemA.date || itemA.createdAt || 0).getTime();
      const timeB = new Date(itemB.date || itemB.createdAt || 0).getTime();
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });
  }

  return result;
};

let isSyncInProgress = false;
let isPullInProgress = false;
let isPushInProgress = false;
let hasPendingPushRequest = false;
let pushDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastSyncTimestamp: string | null = null;

export const getLastSyncTime = (): string | null => lastSyncTimestamp;

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

export const isSyncing = (): boolean =>
  isSyncInProgress || isPullInProgress || isPushInProgress;

export type SyncStatus = {
  isSyncing: boolean;
  lastSyncTime: string | null;
};
export type SyncStatusListener = (status: SyncStatus) => void;
const syncStatusListeners = new Set<SyncStatusListener>();

export const notifySyncStatusListeners = (): void => {
  const currentStatus: SyncStatus = {
    isSyncing: isSyncing(),
    lastSyncTime: lastSyncTimestamp,
  };
  syncStatusListeners.forEach((listener) => listener(currentStatus));
};

export const subscribeToSyncStatus = (listener: SyncStatusListener): (() => void) => {
  syncStatusListeners.add(listener);
  listener({
    isSyncing: isSyncing(),
    lastSyncTime: lastSyncTimestamp,
  });
  return () => {
    syncStatusListeners.delete(listener);
  };
};

export const syncPush = async (userId?: string): Promise<SyncResult> => {
  if (isPushInProgress) {
    hasPendingPushRequest = true;
    return { success: false, offline: true, error: 'Sincronización push ya en curso' };
  }
  isPushInProgress = true;
  notifySyncStatusListeners();
  try {
    let targetUserId = userId;
    if (!targetUserId) {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.user?.id) {
        return { success: false, offline: true, error: 'Usuario no autenticado' };
      }
      targetUserId = data.session.user.id;
    }

    // Escudo de salida: procesar y vaciar prioritariamente los borrados pendientes antes de push
    await flushPendingDeletions(targetUserId);

    const { banks, cards } = useCardsStore.getState();
    const { people, personalDebts, friendLoans, thirdPartyCharges } = useDebtsStore.getState();
    const { transactions } = useTransactionsStore.getState();

    // 1. Bancos
    const pendingBankIds = getPendingDeletionIdSet('banks');
    const filteredBanks = (banks || []).filter(
      (b) => !pendingBankIds.has(b.id) && !pendingBankIds.has(toDeterministicUuid(b.id))
    );
    const bankRows: BankRow[] = filteredBanks.map((b) => bankToRow(b, targetUserId));
    const validBankIds = new Set<string>(bankRows.map((b) => b.id));
    if (bankRows.length > 0) {
      const { error } = await supabase.from('banks').upsert(bankRows, { onConflict: 'id' });
      if (error) {
        return { success: false, offline: true, error: error.message };
      }
    }

    // 2. Tarjetas de cr??dito
    const pendingCardIds = getPendingDeletionIdSet('credit_cards');
    const filteredCards = (cards || []).filter(
      (c) => !pendingCardIds.has(c.id) && !pendingCardIds.has(toDeterministicUuid(c.id))
    );
    const cardRows: CreditCardRow[] = filteredCards.map((c) => {
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
    const pendingPeopleIds = getPendingDeletionIdSet('people');
    const filteredPeople = (people || []).filter(
      (p) => !pendingPeopleIds.has(p.id) && !pendingPeopleIds.has(toDeterministicUuid(p.id))
    );
    const peopleRows: PersonRow[] = filteredPeople.map((p) => personToRow(p, targetUserId));
    const validPersonIds = new Set<string>(peopleRows.map((p) => p.id));
    if (peopleRows.length > 0) {
      const { error } = await supabase.from('people').upsert(peopleRows, { onConflict: 'id' });
      if (error) {
        return { success: false, offline: true, error: error.message };
      }
    }

    // 4. Deudas Personales
    const pendingDebtIds = getPendingDeletionIdSet('personal_debts');
    const filteredDebts = (personalDebts || []).filter(
      (d) => !pendingDebtIds.has(d.id) && !pendingDebtIds.has(toDeterministicUuid(d.id))
    );
    const debtRows: PersonalDebtRow[] = filteredDebts.map((d) =>
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

    // 5. Pr??stamos a Amigos
    const pendingLoanIds = getPendingDeletionIdSet('friend_loans');
    const filteredLoans = (friendLoans || []).filter(
      (l) => !pendingLoanIds.has(l.id) && !pendingLoanIds.has(toDeterministicUuid(l.id))
    );
    const loanRows: FriendLoanRow[] = filteredLoans.map((l) =>
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
    const pendingChargeIds = getPendingDeletionIdSet('third_party_card_charges');
    const filteredCharges = (thirdPartyCharges || []).filter(
      (tc) => !pendingChargeIds.has(tc.id) && !pendingChargeIds.has(toDeterministicUuid(tc.id))
    );
    const chargeRows: ThirdPartyCardChargeRow[] = filteredCharges.map((tc) =>
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
    const pendingTxIds = getPendingDeletionIdSet('transactions');
    const filteredTx = (transactions || []).filter(
      (t) => !pendingTxIds.has(t.id) && !pendingTxIds.has(toDeterministicUuid(t.id))
    );
    const txRows: TransactionRow[] = filteredTx.map((t) =>
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
    lastSyncTimestamp = new Date().toISOString();
    return { success: true, syncedAt: lastSyncTimestamp };
  } catch (error) {
    const errMessage =
      error instanceof Error ? error.message : 'Error de conexión o red durante syncPush';
    return { success: false, offline: true, error: errMessage };
  } finally {
    isPushInProgress = false;
    notifySyncStatusListeners();
    if (hasPendingPushRequest) {
      hasPendingPushRequest = false;
      setTimeout(() => {
        syncPush(userId).catch(() => {});
      }, 100);
    }
  }
};

export const syncPull = async (userId?: string): Promise<SyncResult> => {
  if (isPullInProgress) {
    return { success: false, offline: true, error: 'Sincronización pull ya en curso' };
  }
  isPullInProgress = true;
  notifySyncStatusListeners();
  try {
    let targetUserId = userId;
    if (!targetUserId) {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.user?.id) {
        return { success: false, offline: true, error: 'Usuario no autenticado' };
      }
      targetUserId = data.session.user.id;
    }

    // Cargar cola de borrados pendientes para el escudo anti-zombis de entrada
    await getPendingDeletions();

    // 1. Pull bancos
    const { data: banksData, error: banksErr } = await supabase
      .from('banks')
      .select('*')
      .eq('user_id', targetUserId)
      .is('deleted_at', null);
    if (banksErr) {
      return { success: false, offline: true, error: banksErr.message };
    }
    const { data: deletedBanksData } = await supabase
      .from('banks')
      .select('id')
      .eq('user_id', targetUserId)
      .not('deleted_at', 'is', null);

    // 2. Pull tarjetas
    const { data: cardsData, error: cardsErr } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('user_id', targetUserId)
      .is('deleted_at', null);
    if (cardsErr) {
      return { success: false, offline: true, error: cardsErr.message };
    }
    const { data: deletedCardsData } = await supabase
      .from('credit_cards')
      .select('id')
      .eq('user_id', targetUserId)
      .not('deleted_at', 'is', null);

    // 3. Pull personas
    const { data: peopleData, error: peopleErr } = await supabase
      .from('people')
      .select('*')
      .eq('user_id', targetUserId)
      .is('deleted_at', null);
    if (peopleErr) {
      return { success: false, offline: true, error: peopleErr.message };
    }
    const { data: deletedPeopleData } = await supabase
      .from('people')
      .select('id')
      .eq('user_id', targetUserId)
      .not('deleted_at', 'is', null);

    // 4. Pull deudas personales
    const { data: debtsData, error: debtsErr } = await supabase
      .from('personal_debts')
      .select('*')
      .eq('user_id', targetUserId)
      .is('deleted_at', null);
    if (debtsErr) {
      return { success: false, offline: true, error: debtsErr.message };
    }
    const { data: deletedDebtsData } = await supabase
      .from('personal_debts')
      .select('id')
      .eq('user_id', targetUserId)
      .not('deleted_at', 'is', null);

    // 5. Pull pr??stamos a amigos
    const { data: loansData, error: loansErr } = await supabase
      .from('friend_loans')
      .select('*')
      .eq('user_id', targetUserId)
      .is('deleted_at', null);
    if (loansErr) {
      return { success: false, offline: true, error: loansErr.message };
    }
    const { data: deletedLoansData } = await supabase
      .from('friend_loans')
      .select('id')
      .eq('user_id', targetUserId)
      .not('deleted_at', 'is', null);

    // 6. Pull compras de terceros
    const { data: chargesData, error: chargesErr } = await supabase
      .from('third_party_card_charges')
      .select('*')
      .eq('user_id', targetUserId)
      .is('deleted_at', null);
    if (chargesErr) {
      return { success: false, offline: true, error: chargesErr.message };
    }
    const { data: deletedChargesData } = await supabase
      .from('third_party_card_charges')
      .select('id')
      .eq('user_id', targetUserId)
      .not('deleted_at', 'is', null);

    // 7. Pull transacciones
    const { data: txData, error: txErr } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', targetUserId)
      .is('deleted_at', null)
      .order('date', { ascending: false });
    if (txErr) {
      return { success: false, offline: true, error: txErr.message };
    }
    const { data: deletedTxData } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', targetUserId)
      .not('deleted_at', 'is', null);

    // Aplicar actualizaciones a Zustand con Escudo Anti-Zombis (filtrar bajas pendientes)
    if (banksData && banksData.length > 0) {
      const pendingBankIds = getPendingDeletionIdSet('banks');
      const filteredBanks = (banksData as BankRow[]).filter(
        (row) => !pendingBankIds.has(row.id) && !pendingBankIds.has(toDeterministicUuid(row.id))
      );
      const pulledBanks = filteredBanks.map(rowToBank);
      const currentBanks = useCardsStore.getState().banks;
      useCardsStore.setState({ banks: mergeById(currentBanks, pulledBanks) });
    }
    if (deletedBanksData && deletedBanksData.length > 0) {
      const deletedBankIdSet = new Set<string>();
      for (const row of deletedBanksData as { id: string }[]) {
        deletedBankIdSet.add(row.id);
        deletedBankIdSet.add(toDeterministicUuid(row.id));
      }
      const currentBanks = useCardsStore.getState().banks;
      const prunedBanks = currentBanks.filter(
        (b) => !deletedBankIdSet.has(b.id) && !deletedBankIdSet.has(toDeterministicUuid(b.id))
      );
      if (prunedBanks.length !== currentBanks.length) {
        useCardsStore.setState({ banks: prunedBanks });
      }
    }

    if (cardsData && cardsData.length > 0) {
      const pendingCardIds = getPendingDeletionIdSet('credit_cards');
      const filteredCards = (cardsData as CreditCardRow[]).filter(
        (row) => !pendingCardIds.has(row.id) && !pendingCardIds.has(toDeterministicUuid(row.id))
      );
      const pulledCards = filteredCards.map(rowToCard);
      const currentCards = useCardsStore.getState().cards;
      useCardsStore.setState({ cards: mergeById(currentCards, pulledCards) });
    }
    if (deletedCardsData && deletedCardsData.length > 0) {
      const deletedCardIdSet = new Set<string>();
      for (const row of deletedCardsData as { id: string }[]) {
        deletedCardIdSet.add(row.id);
        deletedCardIdSet.add(toDeterministicUuid(row.id));
      }
      const currentCards = useCardsStore.getState().cards;
      const prunedCards = currentCards.filter(
        (c) => !deletedCardIdSet.has(c.id) && !deletedCardIdSet.has(toDeterministicUuid(c.id))
      );
      if (prunedCards.length !== currentCards.length) {
        useCardsStore.setState({ cards: prunedCards });
      }
    }

    const debtsStoreUpdates: Partial<ReturnType<typeof useDebtsStore.getState>> = {};

    if (peopleData && peopleData.length > 0) {
      const pendingPeopleIds = getPendingDeletionIdSet('people');
      const filteredPeople = (peopleData as PersonRow[]).filter(
        (row) => !pendingPeopleIds.has(row.id) && !pendingPeopleIds.has(toDeterministicUuid(row.id))
      );
      const pulledPeople = filteredPeople.map(rowToPerson);
      const currentPeople = useDebtsStore.getState().people;
      debtsStoreUpdates.people = mergeById(currentPeople, pulledPeople);
    }
    if (deletedPeopleData && deletedPeopleData.length > 0) {
      const deletedPeopleIdSet = new Set<string>();
      for (const row of deletedPeopleData as { id: string }[]) {
        deletedPeopleIdSet.add(row.id);
        deletedPeopleIdSet.add(toDeterministicUuid(row.id));
      }
      const basePeople = debtsStoreUpdates.people ?? useDebtsStore.getState().people;
      const prunedPeople = basePeople.filter(
        (p) => !deletedPeopleIdSet.has(p.id) && !deletedPeopleIdSet.has(toDeterministicUuid(p.id))
      );
      if (prunedPeople.length !== basePeople.length) {
        debtsStoreUpdates.people = prunedPeople;
      }
    }

    if (debtsData && debtsData.length > 0) {
      const pendingDebtIds = getPendingDeletionIdSet('personal_debts');
      const filteredDebts = (debtsData as PersonalDebtRow[]).filter(
        (row) => !pendingDebtIds.has(row.id) && !pendingDebtIds.has(toDeterministicUuid(row.id))
      );
      const pulledDebts = filteredDebts.map(rowToDebt);
      const currentDebts = useDebtsStore.getState().personalDebts;
      debtsStoreUpdates.personalDebts = mergeById(currentDebts, pulledDebts);
    }
    if (deletedDebtsData && deletedDebtsData.length > 0) {
      const deletedDebtIdSet = new Set<string>();
      for (const row of deletedDebtsData as { id: string }[]) {
        deletedDebtIdSet.add(row.id);
        deletedDebtIdSet.add(toDeterministicUuid(row.id));
      }
      const baseDebts = debtsStoreUpdates.personalDebts ?? useDebtsStore.getState().personalDebts;
      const prunedDebts = baseDebts.filter(
        (d) => !deletedDebtIdSet.has(d.id) && !deletedDebtIdSet.has(toDeterministicUuid(d.id))
      );
      if (prunedDebts.length !== baseDebts.length) {
        debtsStoreUpdates.personalDebts = prunedDebts;
      }
    }

    if (loansData && loansData.length > 0) {
      const pendingLoanIds = getPendingDeletionIdSet('friend_loans');
      const filteredLoans = (loansData as FriendLoanRow[]).filter(
        (row) => !pendingLoanIds.has(row.id) && !pendingLoanIds.has(toDeterministicUuid(row.id))
      );
      const pulledLoans = filteredLoans.map(rowToLoan);
      const currentLoans = useDebtsStore.getState().friendLoans;
      debtsStoreUpdates.friendLoans = mergeById(currentLoans, pulledLoans);
    }
    if (deletedLoansData && deletedLoansData.length > 0) {
      const deletedLoanIdSet = new Set<string>();
      for (const row of deletedLoansData as { id: string }[]) {
        deletedLoanIdSet.add(row.id);
        deletedLoanIdSet.add(toDeterministicUuid(row.id));
      }
      const baseLoans = debtsStoreUpdates.friendLoans ?? useDebtsStore.getState().friendLoans;
      const prunedLoans = baseLoans.filter(
        (l) => !deletedLoanIdSet.has(l.id) && !deletedLoanIdSet.has(toDeterministicUuid(l.id))
      );
      if (prunedLoans.length !== baseLoans.length) {
        debtsStoreUpdates.friendLoans = prunedLoans;
      }
    }

    if (chargesData && chargesData.length > 0) {
      const pendingChargeIds = getPendingDeletionIdSet('third_party_card_charges');
      const filteredCharges = (chargesData as ThirdPartyCardChargeRow[]).filter(
        (row) => !pendingChargeIds.has(row.id) && !pendingChargeIds.has(toDeterministicUuid(row.id))
      );
      const pulledCharges = filteredCharges.map(rowToCharge);
      const currentCharges = useDebtsStore.getState().thirdPartyCharges;
      debtsStoreUpdates.thirdPartyCharges = mergeById(currentCharges, pulledCharges);
    }
    if (deletedChargesData && deletedChargesData.length > 0) {
      const deletedChargeIdSet = new Set<string>();
      for (const row of deletedChargesData as { id: string }[]) {
        deletedChargeIdSet.add(row.id);
        deletedChargeIdSet.add(toDeterministicUuid(row.id));
      }
      const baseCharges = debtsStoreUpdates.thirdPartyCharges ?? useDebtsStore.getState().thirdPartyCharges;
      const prunedCharges = baseCharges.filter(
        (c) => !deletedChargeIdSet.has(c.id) && !deletedChargeIdSet.has(toDeterministicUuid(c.id))
      );
      if (prunedCharges.length !== baseCharges.length) {
        debtsStoreUpdates.thirdPartyCharges = prunedCharges;
      }
    }

    if (Object.keys(debtsStoreUpdates).length > 0) {
      useDebtsStore.setState(debtsStoreUpdates);
    }

    if (txData && txData.length > 0) {
      const pendingTxIds = getPendingDeletionIdSet('transactions');
      const filteredTx = (txData as TransactionRow[]).filter(
        (row) => !pendingTxIds.has(row.id) && !pendingTxIds.has(toDeterministicUuid(row.id))
      );
      const pulledTx = filteredTx.map(rowToTransaction);
      const currentTx = useTransactionsStore.getState().transactions;
      useTransactionsStore.setState({ transactions: mergeById(currentTx, pulledTx) });
    }
    if (deletedTxData && deletedTxData.length > 0) {
      const deletedTxIdSet = new Set<string>();
      for (const row of deletedTxData as { id: string }[]) {
        deletedTxIdSet.add(row.id);
        deletedTxIdSet.add(toDeterministicUuid(row.id));
      }
      const currentTx = useTransactionsStore.getState().transactions;
      const prunedTx = currentTx.filter(
        (t) => !deletedTxIdSet.has(t.id) && !deletedTxIdSet.has(toDeterministicUuid(t.id))
      );
      if (prunedTx.length !== currentTx.length) {
        useTransactionsStore.setState({ transactions: prunedTx });
      }
    }
    lastSyncTimestamp = new Date().toISOString();
    return { success: true, syncedAt: lastSyncTimestamp };
  } catch (error) {
    const errMessage =
      error instanceof Error ? error.message : 'Error de conexión o red durante syncPull';
    return { success: false, offline: true, error: errMessage };
  } finally {
    isPullInProgress = false;
    notifySyncStatusListeners();
  }
};

export const syncAll = async (userId?: string): Promise<SyncResult> => {
  if (isSyncInProgress) {
    return { success: false, offline: true, error: 'Sincronización ya en curso' };
  }

  isSyncInProgress = true;
  notifySyncListeners(true);
  notifySyncStatusListeners();
  const safetyTimeout = setTimeout(() => {
    notifySyncListeners(false);
    notifySyncStatusListeners();
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

    // Escudo de salida: procesar y vaciar prioritariamente los borrados pendientes
    await flushPendingDeletions(targetUserId);

    // 1. Pull remote changes first
    const pullResult = await syncPull(targetUserId);

    // 2. Push local changes
    const pushResult = await syncPush(targetUserId);

    const success = pullResult.success && pushResult.success;
    const error = pullResult.error || pushResult.error;

    if (success) {
      lastSyncTimestamp = new Date().toISOString();
    }

    return {
      success,
      push: pushResult,
      pull: pullResult,
      error,
      offline: pullResult.offline || pushResult.offline,
      syncedAt: lastSyncTimestamp || pullResult.syncedAt || pushResult.syncedAt,
    };
  } catch (error) {
    const errMessage =
      error instanceof Error ? error.message : 'Error imprevisto durante syncAll';
    return { success: false, offline: true, error: errMessage };
  } finally {
    clearTimeout(safetyTimeout);
    notifySyncListeners(false);
    isSyncInProgress = false;
    notifySyncStatusListeners();
  }
};

export const deleteRemoteRecord = async (
  table: SyncTable,
  localId: string
): Promise<void> => {
  try {
    await enqueuePendingDeletion(table, localId);
    const targetUuid = toDeterministicUuid(localId);
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUserId = sessionData.session?.user?.id;
    if (currentUserId) {
      let query = supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', targetUuid);
      if ((table as string) !== 'profiles') {
        query = query.eq('user_id', currentUserId);
      }
      await query;
    }
  } catch {
    // Silencioso ante fallas de persistencia o indisponibilidad offline
  }
};

export const triggerBackgroundPush = (): void => {
  if (pushDebounceTimer) {
    clearTimeout(pushDebounceTimer);
  }
  pushDebounceTimer = setTimeout(() => {
    pushDebounceTimer = null;
    syncPush().catch(() => {});
  }, 300);
};

let activeRealtimeChannel: RealtimeChannel | null = null;
let activeRealtimeUserId: string | null = null;
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export const startRealtimeSubscription = (userId?: string): void => {
  const targetUserId = userId || activeRealtimeUserId;
  if (!targetUserId) return;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (
    activeRealtimeUserId === targetUserId &&
    activeRealtimeChannel &&
    (activeRealtimeChannel.state === 'joined' || activeRealtimeChannel.state === 'joining')
  ) {
    return;
  }

  const existingChannels = supabase
    .getChannels()
    .filter((c) => c.topic.includes('user-sync-'));
  for (const ch of existingChannels) {
    try {
      supabase.removeChannel(ch);
    } catch {
      // Silencioso
    }
  }
  activeRealtimeChannel = null;
  activeRealtimeUserId = targetUserId;

  const channel = supabase.channel('user-sync-' + targetUserId);

  channel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${targetUserId}`,
      },
      (payload) => {
        const eventType = payload.eventType;
        const newRow = payload.new as TransactionRow | null;
        const oldRow = payload.old as Partial<TransactionRow> | null;

        if (eventType === 'DELETE' || (newRow && Boolean(newRow.deleted_at))) {
          const idToDelete = newRow?.id || oldRow?.id;
          if (idToDelete) {
            const targetUuid = toDeterministicUuid(idToDelete);
            const currentTx = useTransactionsStore.getState().transactions;
            useTransactionsStore.setState({
              transactions: currentTx.filter((t) => toDeterministicUuid(t.id) !== targetUuid),
            });
          }
        } else if (newRow && (eventType === 'INSERT' || eventType === 'UPDATE')) {
          const pendingTxIds = getPendingDeletionIdSet('transactions');
          if (pendingTxIds.has(newRow.id) || pendingTxIds.has(toDeterministicUuid(newRow.id))) {
            return;
          }
          const incomingTx = rowToTransaction(newRow);
          const currentTx = useTransactionsStore.getState().transactions;
          useTransactionsStore.setState({
            transactions: mergeById(currentTx, [incomingTx]),
          });
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'personal_debts',
        filter: `user_id=eq.${targetUserId}`,
      },
      (payload) => {
        const eventType = payload.eventType;
        const newRow = payload.new as PersonalDebtRow | null;
        const oldRow = payload.old as Partial<PersonalDebtRow> | null;

        if (eventType === 'DELETE' || (newRow && Boolean(newRow.deleted_at))) {
          const idToDelete = newRow?.id || oldRow?.id;
          if (idToDelete) {
            const targetUuid = toDeterministicUuid(idToDelete);
            const currentDebts = useDebtsStore.getState().personalDebts;
            useDebtsStore.setState({
              personalDebts: currentDebts.filter((d) => toDeterministicUuid(d.id) !== targetUuid),
            });
          }
        } else if (newRow && (eventType === 'INSERT' || eventType === 'UPDATE')) {
          const pendingDebtIds = getPendingDeletionIdSet('personal_debts');
          if (pendingDebtIds.has(newRow.id) || pendingDebtIds.has(toDeterministicUuid(newRow.id))) {
            return;
          }
          const incomingDebt = rowToPersonalDebt(newRow);
          const currentDebts = useDebtsStore.getState().personalDebts;
          useDebtsStore.setState({
            personalDebts: mergeById(currentDebts, [incomingDebt]),
          });
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'friend_loans',
        filter: `user_id=eq.${targetUserId}`,
      },
      (payload) => {
        const eventType = payload.eventType;
        const newRow = payload.new as FriendLoanRow | null;
        const oldRow = payload.old as Partial<FriendLoanRow> | null;

        if (eventType === 'DELETE' || (newRow && Boolean(newRow.deleted_at))) {
          const idToDelete = newRow?.id || oldRow?.id;
          if (idToDelete) {
            const targetUuid = toDeterministicUuid(idToDelete);
            const currentLoans = useDebtsStore.getState().friendLoans;
            useDebtsStore.setState({
              friendLoans: currentLoans.filter((l) => toDeterministicUuid(l.id) !== targetUuid),
            });
          }
        } else if (newRow && (eventType === 'INSERT' || eventType === 'UPDATE')) {
          const pendingLoanIds = getPendingDeletionIdSet('friend_loans');
          if (pendingLoanIds.has(newRow.id) || pendingLoanIds.has(toDeterministicUuid(newRow.id))) {
            return;
          }
          const incomingLoan = rowToFriendLoan(newRow);
          const currentLoans = useDebtsStore.getState().friendLoans;
          useDebtsStore.setState({
            friendLoans: mergeById(currentLoans, [incomingLoan]),
          });
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'third_party_card_charges',
        filter: `user_id=eq.${targetUserId}`,
      },
      (payload) => {
        const eventType = payload.eventType;
        const newRow = payload.new as ThirdPartyCardChargeRow | null;
        const oldRow = payload.old as Partial<ThirdPartyCardChargeRow> | null;

        if (eventType === 'DELETE' || (newRow && Boolean(newRow.deleted_at))) {
          const idToDelete = newRow?.id || oldRow?.id;
          if (idToDelete) {
            const targetUuid = toDeterministicUuid(idToDelete);
            const currentCharges = useDebtsStore.getState().thirdPartyCharges;
            useDebtsStore.setState({
              thirdPartyCharges: currentCharges.filter((c) => toDeterministicUuid(c.id) !== targetUuid),
            });
          }
        } else if (newRow && (eventType === 'INSERT' || eventType === 'UPDATE')) {
          const pendingChargeIds = getPendingDeletionIdSet('third_party_card_charges');
          if (pendingChargeIds.has(newRow.id) || pendingChargeIds.has(toDeterministicUuid(newRow.id))) {
            return;
          }
          const incomingCharge = rowToThirdPartyCharge(newRow);
          const currentCharges = useDebtsStore.getState().thirdPartyCharges;
          useDebtsStore.setState({
            thirdPartyCharges: mergeById(currentCharges, [incomingCharge]),
          });
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'people',
        filter: `user_id=eq.${targetUserId}`,
      },
      (payload) => {
        const eventType = payload.eventType;
        const newRow = payload.new as PersonRow | null;
        const oldRow = payload.old as Partial<PersonRow> | null;

        if (eventType === 'DELETE' || (newRow && Boolean(newRow.deleted_at))) {
          const idToDelete = newRow?.id || oldRow?.id;
          if (idToDelete) {
            const targetUuid = toDeterministicUuid(idToDelete);
            const currentPeople = useDebtsStore.getState().people;
            useDebtsStore.setState({
              people: currentPeople.filter((p) => toDeterministicUuid(p.id) !== targetUuid),
            });
          }
        } else if (newRow && (eventType === 'INSERT' || eventType === 'UPDATE')) {
          const pendingPeopleIds = getPendingDeletionIdSet('people');
          if (pendingPeopleIds.has(newRow.id) || pendingPeopleIds.has(toDeterministicUuid(newRow.id))) {
            return;
          }
          const incomingPerson = rowToPerson(newRow);
          const currentPeople = useDebtsStore.getState().people;
          useDebtsStore.setState({
            people: mergeById(currentPeople, [incomingPerson]),
          });
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'credit_cards',
        filter: `user_id=eq.${targetUserId}`,
      },
      (payload) => {
        const eventType = payload.eventType;
        const newRow = payload.new as CreditCardRow | null;
        const oldRow = payload.old as Partial<CreditCardRow> | null;

        if (eventType === 'DELETE' || (newRow && Boolean(newRow.deleted_at))) {
          const idToDelete = newRow?.id || oldRow?.id;
          if (idToDelete) {
            const targetUuid = toDeterministicUuid(idToDelete);
            const currentCards = useCardsStore.getState().cards;
            useCardsStore.setState({
              cards: currentCards.filter((c) => toDeterministicUuid(c.id) !== targetUuid),
            });
          }
        } else if (newRow && (eventType === 'INSERT' || eventType === 'UPDATE')) {
          const pendingCardIds = getPendingDeletionIdSet('credit_cards');
          if (pendingCardIds.has(newRow.id) || pendingCardIds.has(toDeterministicUuid(newRow.id))) {
            return;
          }
          const incomingCard = rowToCard(newRow);
          const currentCards = useCardsStore.getState().cards;
          useCardsStore.setState({
            cards: mergeById(currentCards, [incomingCard]),
          });
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'banks',
        filter: `user_id=eq.${targetUserId}`,
      },
      (payload) => {
        const eventType = payload.eventType;
        const newRow = payload.new as BankRow | null;
        const oldRow = payload.old as Partial<BankRow> | null;

        if (eventType === 'DELETE' || (newRow && Boolean(newRow.deleted_at))) {
          const idToDelete = newRow?.id || oldRow?.id;
          if (idToDelete) {
            const targetUuid = toDeterministicUuid(idToDelete);
            const currentBanks = useCardsStore.getState().banks;
            useCardsStore.setState({
              banks: currentBanks.filter((b) => toDeterministicUuid(b.id) !== targetUuid),
            });
          }
        } else if (newRow && (eventType === 'INSERT' || eventType === 'UPDATE')) {
          const pendingBankIds = getPendingDeletionIdSet('banks');
          if (pendingBankIds.has(newRow.id) || pendingBankIds.has(toDeterministicUuid(newRow.id))) {
            return;
          }
          const incomingBank = rowToBank(newRow);
          const currentBanks = useCardsStore.getState().banks;
          useCardsStore.setState({
            banks: mergeById(currentBanks, [incomingBank]),
          });
        }
      }
    );

  channel.subscribe((status, _err) => {
    if (status === 'SUBSCRIBED') {
      reconnectAttempts = 0;
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      reconnectAttempts++;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (activeRealtimeChannel === channel) {
          try {
            supabase.removeChannel(channel);
          } catch {
            // Ignorar errores al desuscribir
          }
          activeRealtimeChannel = null;
        }
        startRealtimeSubscription(targetUserId);
      }, delay);
    }
  });

  activeRealtimeChannel = channel;
};

export const stopRealtimeSubscription = (): void => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectAttempts = 0;

  const existingChannels = supabase
    .getChannels()
    .filter((c) => c.topic.includes('user-sync-'));
  for (const ch of existingChannels) {
    try {
      supabase.removeChannel(ch);
    } catch {
      // Silencioso
    }
  }

  activeRealtimeChannel = null;
  activeRealtimeUserId = null;
};

export const purgeLocalSyncState = (): void => {
  stopRealtimeSubscription();
  if (pushDebounceTimer) {
    clearTimeout(pushDebounceTimer);
    pushDebounceTimer = null;
  }
  hasPendingPushRequest = false;
  isSyncInProgress = false;
  isPullInProgress = false;
  isPushInProgress = false;
  isInitialSyncActive = false;
  lastSyncTimestamp = null;
  pendingDeletionsCache = [];
  try {
    void safeStorage.removeItem(PENDING_DELETIONS_STORAGE_KEY);
  } catch {
    // Silencioso
  }
  notifySyncStatusListeners();
  notifySyncListeners(false);
};

export const syncService = {
  syncPush,
  syncPull,
  syncAll,
  flushPendingDeletions,
  getPendingDeletions,
  enqueuePendingDeletion,
  getPendingDeletionIdSet,
  deleteRemoteRecord,
  triggerBackgroundPush,
  isSyncing,
  isInitialSyncing,
  subscribeToInitialSync,
  getLastSyncTime,
  subscribeToSyncStatus,
  startRealtimeSubscription,
  stopRealtimeSubscription,
  purgeLocalSyncState,
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

setCardSyncHandlers({
  onCardAdded: (): void => {
    syncService.triggerBackgroundPush();
  },
  onCardUpdated: (): void => {
    syncService.triggerBackgroundPush();
  },
  onCardDeleted: (cardId: string): void => {
    syncService.deleteRemoteRecord('credit_cards', cardId).catch(() => {});
  },
  onBankAdded: (): void => {
    syncService.triggerBackgroundPush();
  },
  onBankUpdated: (): void => {
    syncService.triggerBackgroundPush();
  },
  onBankDeleted: (bankId: string): void => {
    syncService.deleteRemoteRecord('banks', bankId).catch(() => {});
  },
});

// Carga temprana de la cola de bajas persistidas para mantener la caché caliente
getPendingDeletions().catch(() => {});
