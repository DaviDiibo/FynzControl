import React, { useState } from 'react';
import type { JSX } from 'react';
import {
  Switch,
  TouchableOpacity,
  View,
  Text,
  Alert,
  StyleSheet,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../store/auth-store';
import { useSettingsStore, CurrencyCode } from '../../store/settings-store';
import { useTransactionsStore } from '../../store/transactions-store';
import { useDebtsStore } from '../../store/debts-store';
import { useCardsStore } from '../../store/cards-store';
import { authenticateWithBiometrics } from '../../utils/biometrics';

export type CurrencyOption = CurrencyCode;

export type SettingsSectionListProps = {
  isWide?: boolean;
  userProfileSlot?: React.ReactNode;
  onCurrencyChange?: (currency: CurrencyCode) => void;
};

const CURRENCIES: CurrencyCode[] = ['USD', 'EUR', 'BRL', 'ARS', 'COP', 'MXN'];

export const SettingsSectionList = ({
  isWide = false,
  userProfileSlot,
  onCurrencyChange,
}: SettingsSectionListProps = {}): JSX.Element => {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  const [isResetModalVisible, setIsResetModalVisible] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState(false);

  const {
    currency,
    privacyMode,
    biometricsEnabled,
    setCurrency,
    setPrivacyMode,
    setBiometricsEnabled,
  } = useSettingsStore();

  const handleCurrencySelect = (selectedCurrency: CurrencyCode): void => {
    setCurrency(selectedCurrency);
    onCurrencyChange?.(selectedCurrency);
  };

  const handleBiometricToggle = async (nextValue: boolean): Promise<void> => {
    if (nextValue) {
      const result = await authenticateWithBiometrics(
        'Verifica tu identidad para activar Face ID / Huella'
      );
      if (result.success) {
        setBiometricsEnabled(true);
      } else {
        if (result.error === 'hardware_unavailable') {
          Alert.alert(
            'No compatible',
            'Este dispositivo no cuenta con sensores biométricos disponibles.'
          );
        } else if (result.error === 'not_enrolled') {
          Alert.alert(
            'Sin registrar',
            'Configura tu huella o Face ID en los ajustes del dispositivo primero.'
          );
        }
        setBiometricsEnabled(false);
      }
    } else {
      const result = await authenticateWithBiometrics(
        'Verifica tu identidad para desactivar la seguridad biométrica'
      );
      if (result.success) {
        setBiometricsEnabled(false);
      }
    }
  };

  const handleExportBackup = (): void => {
    Alert.alert('Respaldo', 'Función de exportación de datos en desarrollo.');
  };

  const handleExecuteFullReset = async (): Promise<void> => {
    try {
      // 1. Limpieza de persistencia en Zustand
      await Promise.allSettled([
        useTransactionsStore.persist?.clearStorage?.(),
        useDebtsStore.persist?.clearStorage?.(),
        useCardsStore.persist?.clearStorage?.(),
      ]);

      // 2. Borrado explícito de claves y vaciado de almacenamiento nativo
      const storageKeys = [
        'controlfynz-debts-storage-v2',
        'controlfynz-transactions-storage-v2',
        'controlfynz-cards-storage',
        'controlfynz-debts-storage',
        'controlfynz-transactions-storage',
      ];
      await Promise.allSettled([
        AsyncStorage.multiRemove(storageKeys),
        AsyncStorage.clear(),
      ]);
    } catch {
      // Captura silenciosa defensiva
    }

    // 3. Vaciado exhaustivo de estados en memoria (incluyendo contactos y bancos)
    useTransactionsStore.getState().clearAllTransactions?.();
    useTransactionsStore.setState({ transactions: [] });

    useDebtsStore.getState().clearAllDebts?.();
    useDebtsStore.setState({
      personalDebts: [],
      thirdPartyCharges: [],
      friendLoans: [],
      people: [],
    });

    useCardsStore.setState({
      cards: [],
      banks: [],
    });

    setResetSuccessMessage(true);
    setTimeout(() => {
      setResetSuccessMessage(false);
      setIsResetModalVisible(false);
    }, 1200);
  };

  const financeCard = (
    <View style={styles.card}>
      <Text style={styles.sectionHeader}>FINANZAS & MONEDA</Text>

      <View style={styles.currencyRow}>
        <View style={styles.rowHeader}>
          <Ionicons name="cash-outline" size={18} color={colors.primary} />
          <Text style={styles.rowTitle}>Moneda Principal</Text>
        </View>
        <View style={styles.pillsRow}>
          {CURRENCIES.map((curr) => {
            const isSelected = currency === curr;
            return (
              <TouchableOpacity
                key={curr}
                style={[styles.pill, isSelected && styles.pillActive]}
                onPress={() => handleCurrencySelect(curr)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[
                    styles.pillText,
                    isSelected && styles.pillTextActive,
                  ]}
                >
                  {curr}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.separator} />

      <View style={styles.itemRow}>
        <View style={styles.itemLeft}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <Text style={styles.rowTitle}>Ciclo Mensual</Text>
        </View>
        <Text style={styles.itemValue}>Inicio de Mes: Día 1</Text>
      </View>
    </View>
  );

  const securityCard = (
    <View style={styles.card}>
      <Text style={styles.sectionHeader}>SEGURIDAD & PRIVACIDAD</Text>

      <View style={styles.switchRow}>
        <View style={styles.itemLeftFlex}>
          <Ionicons name="eye-off-outline" size={18} color={colors.primary} />
          <View style={styles.textContainer}>
            <Text style={styles.rowTitle}>Modo Privacidad</Text>
            <Text style={styles.rowSubtitle}>Ocultar saldos al iniciar</Text>
          </View>
        </View>
        <Switch
          value={privacyMode}
          onValueChange={(val) => setPrivacyMode(val)}
          thumbColor={privacyMode ? '#00FFA3' : '#8E8E93'}
          trackColor={{ false: '#2C2C2E', true: 'rgba(0, 255, 163, 0.3)' }}
        />
      </View>

      <View style={styles.separator} />

      <View style={styles.switchRow}>
        <View style={styles.itemLeftFlex}>
          <Ionicons
            name="finger-print-outline"
            size={18}
            color={colors.primary}
          />
          <View style={styles.textContainer}>
            <Text style={styles.rowTitle}>Bloqueo Biométrico</Text>
            <Text style={styles.rowSubtitle}>Requerir FaceID / Huella</Text>
          </View>
        </View>
        <Switch
          value={biometricsEnabled}
          onValueChange={handleBiometricToggle}
          thumbColor={biometricsEnabled ? '#00FFA3' : '#8E8E93'}
          trackColor={{ false: '#2C2C2E', true: 'rgba(0, 255, 163, 0.3)' }}
        />
      </View>

      <View style={styles.separator} />

      <View style={styles.itemRow}>
        <View style={styles.itemLeft}>
          <Ionicons name="timer-outline" size={18} color={colors.primary} />
          <Text style={styles.rowTitle}>Tiempo de Sesión</Text>
        </View>
        <Text style={styles.itemValue}>Sesión: Persistente (Segura)</Text>
      </View>
    </View>
  );

  const dataCard = (
    <View style={styles.card}>
      <Text style={styles.sectionHeader}>DATOS & ALMACENAMIENTO</Text>

      <TouchableOpacity
        style={styles.actionRow}
        onPress={handleExportBackup}
        activeOpacity={0.7}
      >
        <View style={styles.itemLeft}>
          <Ionicons name="download-outline" size={18} color={colors.primary} />
          <Text style={styles.rowTitle}>Exportar Respaldo</Text>
        </View>
        <View style={styles.actionRight}>
          <Text style={styles.actionHint}>JSON / CSV</Text>
          <Ionicons
            name="chevron-forward-outline"
            size={16}
            color={colors.textSecondary}
          />
        </View>
      </TouchableOpacity>

      <View style={styles.separator} />

      <TouchableOpacity
        style={styles.legacyRow}
        onPress={() =>
          router.push({
            pathname: '/(app)/(modal)/new-debt',
            params: { mode: 'legacy' },
          })
        }
        activeOpacity={0.7}
      >
        <View style={styles.itemLeftFlex}>
          <View style={styles.legacyIconBadge}>
            <Ionicons name="time-outline" size={18} color="#00FFA3" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.rowTitle}>
              Registrar Deudas / Compras Antiguas
            </Text>
            <Text style={styles.rowSubtitle}>
              Ingresa préstamos o compras en cuotas de meses pasados sin afectar tu saldo de hoy.
            </Text>
          </View>
        </View>
        <View style={styles.actionRight}>
          <View style={styles.legacyBadge}>
            <Text style={styles.legacyBadgeText}>[ HISTÓRICO ]</Text>
          </View>
          <Ionicons
            name="chevron-forward-outline"
            size={16}
            color={colors.textSecondary}
          />
        </View>
      </TouchableOpacity>

      <View style={styles.separator} />

      <TouchableOpacity
        style={styles.legacyRow}
        onPress={() =>
          router.push({
            pathname: '/(app)/(modal)/legacy-card-expense',
          })
        }
        activeOpacity={0.7}
      >
        <View style={styles.itemLeftFlex}>
          <View style={styles.cardLegacyIconBadge}>
            <Ionicons name="card-outline" size={18} color="#0A84FF" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.rowTitle}>
              Compras en Tarjeta (Cuotas Históricas)
            </Text>
            <Text style={styles.rowSubtitle}>
              Ingresa compras a cuotas de meses pasados para calibrar el valor mensual a pagar de tu tarjeta.
            </Text>
          </View>
        </View>
        <View style={styles.actionRight}>
          <View style={styles.cardLegacyBadge}>
            <Text style={styles.cardLegacyBadgeText}>[ TARJETAS ]</Text>
          </View>
          <Ionicons
            name="chevron-forward-outline"
            size={16}
            color={colors.textSecondary}
          />
        </View>
      </TouchableOpacity>

      <View style={styles.separator} />

      <TouchableOpacity
        style={styles.resetRow}
        onPress={() => setIsResetModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.itemLeftFlex}>
          <Ionicons name="flash-outline" size={18} color="#FF9F0A" />
          <View style={styles.textContainer}>
            <Text style={[styles.rowTitle, styles.amberText]}>
              Restablecer Base de Datos (Modo Pruebas)
            </Text>
            <Text style={styles.rowSubtitle}>
              Herramienta temporal para pruebas desde cero.
            </Text>
          </View>
        </View>
        <View style={styles.devBadge}>
          <Text style={styles.devBadgeText}>[ DEV / TEST ]</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const logoutButton = (
    <TouchableOpacity
      style={styles.logoutButton}
      onPress={logout}
      activeOpacity={0.8}
    >
      <Ionicons name="log-out-outline" size={20} color="#FF453A" />
      <Text style={styles.logoutText}>CERRAR SESIÓN</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {isWide ? (
        <View style={styles.wideGridContainer}>
          <View style={styles.column}>
            {userProfileSlot}
            {financeCard}
            {securityCard}
          </View>
          <View style={styles.column}>
            {dataCard}
            {logoutButton}
          </View>
        </View>
      ) : (
        <>
          {financeCard}
          {securityCard}
          {dataCard}
          {logoutButton}
        </>
      )}

      {/* Modal Cyberpunk de Confirmación de Reseteo */}
      <Modal
        visible={isResetModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!resetSuccessMessage) {
            setIsResetModalVisible(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalBadge}>
              <Text style={styles.modalBadgeText}>
                [ HERRAMIENTA TEMPORAL DE PRUEBAS ]
              </Text>
            </View>

            <Text style={styles.modalTitle}>
              RESTABLECER TODA LA BASE DE DATOS LOCAL
            </Text>

            <Text style={styles.modalMessage}>
              {'⚠️ Esta función es exclusiva para la fase de pruebas y construcción del proyecto.\n\nSe vaciarán al 100% todas las transacciones, deudas, abonos y tarjetas para permitirte ingresar datos limpios desde cero.'}
            </Text>

            {resetSuccessMessage ? (
              <View style={styles.modalSuccessContainer}>
                <Ionicons name="checkmark-circle" size={24} color="#00FFA3" />
                <Text style={styles.modalSuccessText}>
                  ✅ Base de datos restablecida a cero con éxito
                </Text>
              </View>
            ) : (
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setIsResetModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={handleExecuteFullReset}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalConfirmText}>VACIAR TODO A CERO</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  wideGridContainer: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  column: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1.2,
    marginBottom: 14,
    textTransform: 'uppercase',
  },
  currencyRow: {
    gap: 12,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    borderColor: '#00FFA3',
  },
  pillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#00FFA3',
    fontWeight: '700',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemLeftFlex: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  textContainer: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  rowSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemValue: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  actionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionHint: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  dangerText: {
    color: '#FF453A',
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FF453A',
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
  },
  logoutText: {
    color: '#FF453A',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  legacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: 8,
  },
  legacyIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 163, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legacyBadge: {
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 163, 0.45)',
    backgroundColor: 'rgba(0, 255, 163, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  legacyBadgeText: {
    color: '#00FFA3',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardLegacyIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLegacyBadge: {
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.45)',
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  cardLegacyBadgeText: {
    color: '#0A84FF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  resetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: 8,
  },
  amberText: {
    color: '#FF9F0A',
  },
  devBadge: {
    borderWidth: 1,
    borderColor: '#FF9F0A',
    backgroundColor: 'rgba(255, 159, 10, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  devBadgeText: {
    color: '#FF9F0A',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#1E1E1E',
    borderColor: '#2C2C2E',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 420,
  },
  modalBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FF9F0A',
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 12,
  },
  modalBadgeText: {
    color: '#FF9F0A',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  modalMessage: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  modalSuccessContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: 'rgba(0, 255, 163, 0.1)',
    borderRadius: 10,
    borderColor: '#00FFA3',
    borderWidth: 1,
  },
  modalSuccessText: {
    color: '#00FFA3',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3A3A3C',
    backgroundColor: '#2C2C2E',
  },
  modalCancelText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  modalConfirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FF453A',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default SettingsSectionList;
