import React from 'react';
import type { JSX } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export type ThirdPartyPaymentMode = 'end_of_month' | 'installments';

export type ThirdPartyDebt = {
  id: string;
  personName: string; // ej: "Carlos M.", "Andrea R." (sin sufijos como amigo o ex)
  cardName: string; // ej: "Tarjeta Visa Platinum", "Tarjeta Mastercard Black"
  paymentMode: ThirdPartyPaymentMode;
  totalAmount: number; // Monto a cubrir en este corte
  paidAmount: number; // Monto transferido hasta la fecha
  dueDateFormatted: string; // Fecha de corte de la tarjeta
  daysRemaining: number;
  currency?: string;
};

export type ThirdPartyDebtsCardProps = {
  items?: ThirdPartyDebt[];
  onRegisterPayment?: (debt: ThirdPartyDebt) => void;
};

export const defaultThirdPartyDebts: ThirdPartyDebt[] = [
  {
    id: 'tp-1',
    personName: 'Carlos M.',
    cardName: 'Tarjeta Visa Platinum',
    paymentMode: 'end_of_month',
    totalAmount: 350.0,
    paidAmount: 0,
    dueDateFormatted: '30 Oct 2026',
    daysRemaining: 20,
    currency: '$',
  },
  {
    id: 'tp-2',
    personName: 'Andrea R.',
    cardName: 'Tarjeta Mastercard Black',
    paymentMode: 'installments',
    totalAmount: 250.0,
    paidAmount: 120.0,
    dueDateFormatted: '25 Oct 2026',
    daysRemaining: 15,
    currency: '$',
  },
];

const formatAmount = (val: number): string => {
  return val.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const getUrgencyBadge = (days: number): { text: string; color: string; bg: string; border: string } => {
  if (days <= 0) {
    return {
      text: '¡Vence hoy!',
      color: colors.error,
      bg: 'rgba(255, 69, 58, 0.12)',
      border: 'rgba(255, 69, 58, 0.35)',
    };
  }
  if (days <= 5) {
    return {
      text: `${days} días rest.`,
      color: '#FF9F0A',
      bg: 'rgba(255, 159, 10, 0.12)',
      border: 'rgba(255, 159, 10, 0.35)',
    };
  }
  return {
    text: `${days} días rest.`,
    color: colors.primary,
    bg: 'rgba(0, 255, 163, 0.12)',
    border: 'rgba(0, 255, 163, 0.35)',
  };
};

const ThirdPartyDebtsCard = ({
  items = defaultThirdPartyDebts,
  onRegisterPayment,
}: ThirdPartyDebtsCardProps): JSX.Element => {
  return (
    <View style={styles.container}>
      {/* Cabecera del Módulo */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.titleIconContainer}>
            <Ionicons name="people-outline" size={16} color={colors.primary} />
          </View>
          <Text style={styles.headerTitle}>A CARGO DE TERCEROS</Text>
        </View>

        <View style={styles.headerBadge}>
          <View style={styles.headerBadgeDot} />
          <Text style={styles.headerBadgeText}>CONSUMOS EN TUS TARJETAS</Text>
        </View>
      </View>

      {/* Listado de items a cargo de terceros */}
      {items.map((item) => {
        const cur = item.currency ?? '$';
        const urgency = getUrgencyBadge(item.daysRemaining);
        const remainingToPay = Math.max(0, item.totalAmount - item.paidAmount);
        const progressPct =
          item.totalAmount > 0
            ? Math.min(100, Math.max(0, Math.round((item.paidAmount / item.totalAmount) * 100)))
            : 0;

        return (
          <View key={item.id} style={styles.itemCard}>
            {/* Fila 1: Nombre de la persona y badge de modalidad */}
            <View style={styles.row1}>
              <Text style={styles.personName}>{item.personName}</Text>

              {item.paymentMode === 'end_of_month' ? (
                <View style={styles.modeBadgeEndOfMonth}>
                  <Ionicons name="calendar-outline" size={12} color="#00C7BE" />
                  <Text style={styles.modeBadgeTextEndOfMonth}>Pago Único al Corte</Text>
                </View>
              ) : (
                <View style={styles.modeBadgeInstallments}>
                  <Ionicons name="repeat-outline" size={12} color={colors.primary} />
                  <Text style={styles.modeBadgeTextInstallments}>Abonos en el Mes</Text>
                </View>
              )}
            </View>

            {/* Fila 2: Tarjeta asociada y semáforo de días restantes */}
            <View style={styles.row2}>
              <View style={styles.cardInfoContainer}>
                <Ionicons name="card-outline" size={13} color={colors.textSecondary} />
                <Text style={styles.cardInfoText}>En {item.cardName}</Text>
              </View>

              <View
                style={[
                  styles.urgencyBadge,
                  { backgroundColor: urgency.bg, borderColor: urgency.border },
                ]}
              >
                <Text style={[styles.urgencyBadgeText, { color: urgency.color }]}>
                  {urgency.text}
                </Text>
              </View>
            </View>

            {/* Modalidad: Installments (Abonos durante el mes) */}
            {item.paymentMode === 'installments' && (
              <View style={styles.installmentsContainer}>
                <View style={styles.progressTextRow}>
                  <Text style={styles.receivedText}>
                    Recibido:{' '}
                    <Text style={styles.receivedAmount}>
                      {cur}
                      {formatAmount(item.paidAmount)}
                    </Text>{' '}
                    / {cur}
                    {formatAmount(item.totalAmount)}
                  </Text>
                  <Text style={styles.progressPctText}>{progressPct}% cubierto</Text>
                </View>

                {/* Barra de progreso */}
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
                </View>

                <View style={styles.installmentsFooterRow}>
                  <Text style={styles.remainingSubtext}>
                    Faltan: {cur}
                    {formatAmount(remainingToPay)} por transferir
                  </Text>
                  <Text style={styles.dueDateText}>Corte: {item.dueDateFormatted}</Text>
                </View>
              </View>
            )}

            {/* Modalidad: End of month (Pago único al corte) */}
            {item.paymentMode === 'end_of_month' && (
              <View style={styles.endOfMonthContainer}>
                <View style={styles.commitmentRow}>
                  <Text style={styles.commitmentLabel}>Compromiso al corte:</Text>
                  <Text style={styles.commitmentValue}>
                    {cur}
                    {formatAmount(item.totalAmount)}
                  </Text>
                </View>

                <View style={styles.statusRow}>
                  <View style={styles.waitingBadge}>
                    <Ionicons name="time-outline" size={12} color="#00C7BE" />
                    <Text style={styles.waitingBadgeText}>
                      Esperando transferencia a fin de mes
                    </Text>
                  </View>
                  <Text style={styles.dueDateText}>Corte: {item.dueDateFormatted}</Text>
                </View>
              </View>
            )}

            {/* Botón opcional de registrar abono / pago */}
            {onRegisterPayment && (
              <TouchableOpacity
                style={styles.paymentButton}
                onPress={() => onRegisterPayment(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark-done-outline" size={14} color={colors.primary} />
                <Text style={styles.paymentButtonText}>Registrar Reembolso Recibido</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 255, 163, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
    borderColor: 'rgba(0, 255, 163, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  headerBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
  },
  headerBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  row1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  personName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  modeBadgeEndOfMonth: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 199, 190, 0.12)',
    borderColor: 'rgba(0, 199, 190, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modeBadgeTextEndOfMonth: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00C7BE',
  },
  modeBadgeInstallments: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    borderColor: 'rgba(0, 255, 163, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modeBadgeTextInstallments: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  row2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardInfoText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  urgencyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  installmentsContainer: {
    gap: 7,
    backgroundColor: '#161616',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receivedText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  receivedAmount: {
    color: colors.text,
    fontWeight: '700',
  },
  progressPctText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2C2C2E',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00FFA3',
  },
  installmentsFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  remainingSubtext: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF9F0A',
  },
  dueDateText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  endOfMonthContainer: {
    gap: 8,
    backgroundColor: '#161616',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  commitmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commitmentLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  commitmentValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  waitingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 199, 190, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  waitingBadgeText: {
    fontSize: 10,
    color: '#00C7BE',
    fontWeight: '500',
  },
  paymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
    borderColor: 'rgba(0, 255, 163, 0.25)',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 2,
  },
  paymentButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
});

export default ThirdPartyDebtsCard;
