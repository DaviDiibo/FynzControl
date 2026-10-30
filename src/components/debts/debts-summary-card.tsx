import React from 'react';
import type { JSX } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export type DebtsSummaryProps = {
  totalDebt?: number;
  personalDebt?: number; // Mi deuda real neta
  thirdPartyDebt?: number; // Total a cargo de terceros
  friendLoansTotal?: number; // Préstamos a amigos por cobrar
  thirdPartyChargesTotal?: number; // Compras compartidas de terceros por cobrar
  monthCommitment?: number;
  totalOriginal?: number;
  currency?: string;
  onPressPersonal?: () => void;
  onPressThirdParty?: () => void;
};

const formatAmount = (val: number): string => {
  return val.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const DebtsSummaryCard = ({
  totalDebt = 8050.0,
  personalDebt = 7450.0,
  thirdPartyDebt = 600.0,
  friendLoansTotal = 0,
  thirdPartyChargesTotal = 0,
  monthCommitment = 1550.0,
  totalOriginal = 15500.0,
  currency = '$',
  onPressPersonal,
  onPressThirdParty,
}: DebtsSummaryProps): JSX.Element => {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const paidAmount = Math.max(0, totalOriginal - totalDebt);
  const progressPercentage =
    totalOriginal > 0 ? Math.round((paidAmount / totalOriginal) * 100) : 0;
  const clampedProgress = Math.min(100, Math.max(0, progressPercentage));

  // Diseño para pantallas anchas (Web y Tauri >= 768px): 3 columnas KPI
  if (isWide) {
    return (
      <View style={styles.wideRow}>
        {/* Bloque 1: Deuda Bancaria Total y progreso de amortización */}
        <TouchableOpacity
          style={styles.wideCard}
          onPress={onPressPersonal}
          disabled={!onPressPersonal}
          activeOpacity={onPressPersonal ? 0.8 : 1}
        >
          <View style={styles.topAccentBar} />

          <View style={styles.headerRow}>
            <View style={styles.cyberBadge}>
              <View style={styles.greenDot} />
              <Text style={styles.cyberBadgeText}>DEUDA BANCARIA TOTAL</Text>
            </View>
            <View style={styles.currencyBadge}>
              <Text style={styles.currencyBadgeText}>{currency} USD</Text>
            </View>
          </View>

          <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>{currency}</Text>
            <Text style={styles.totalDebtText}>{formatAmount(personalDebt ?? totalDebt)}</Text>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressTextRow}>
              <Text style={styles.progressLabel}>Amortización de Pasivos</Text>
              <Text style={styles.progressPercentageText}>{progressPercentage}% Pagado</Text>
            </View>

            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${clampedProgress}%` }]} />
            </View>

            <View style={styles.progressMetricsRow}>
              <Text style={styles.progressDetailText}>
                Liquidado: {currency} {formatAmount(paidAmount)}
              </Text>
              <Text style={styles.progressDetailText}>
                Inicial: {currency} {formatAmount(totalOriginal)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Bloque 2: Cuentas por Cobrar con desglose de Préstamos y Compras Compartidas */}
        <TouchableOpacity
          style={styles.wideCard}
          onPress={onPressThirdParty}
          disabled={!onPressThirdParty}
          activeOpacity={onPressThirdParty ? 0.8 : 1}
        >
          <View style={[styles.topAccentBar, { backgroundColor: '#0A84FF' }]} />

          <View style={styles.headerRow}>
            <View style={[styles.cyberBadge, styles.blueCyberBadge]}>
              <Ionicons name="arrow-undo-outline" size={11} color="#0A84FF" />
              <Text style={[styles.cyberBadgeText, { color: '#0A84FF' }]}>CUENTAS POR COBRAR</Text>
            </View>
            {onPressThirdParty && (
              <View style={styles.linkHintRow}>
                <Text style={styles.linkHintText}>Ver detalle</Text>
                <Ionicons name="chevron-forward" size={12} color="#0A84FF" />
              </View>
            )}
          </View>

          <View style={styles.amountContainer}>
            <Text style={[styles.currencySymbol, { color: '#0A84FF' }]}>{currency}</Text>
            <Text style={styles.totalDebtText}>{formatAmount(thirdPartyDebt)}</Text>
          </View>

          <View style={styles.wideBreakdownContainer}>
            <View style={styles.wideBreakdownItem}>
              <View style={styles.breakdownLabelRow}>
                <Text style={styles.breakdownEmoji}>👥</Text>
                <Text style={styles.breakdownLabel}>Préstamos Amigos</Text>
              </View>
              <Text style={styles.wideBreakdownAmount}>
                {currency} {formatAmount(friendLoansTotal)}
              </Text>
            </View>

            <View style={styles.wideBreakdownDivider} />

            <View style={styles.wideBreakdownItem}>
              <View style={styles.breakdownLabelRow}>
                <Text style={styles.breakdownEmoji}>🤝</Text>
                <Text style={styles.breakdownLabelHighlight}>Compras Compartidas</Text>
              </View>
              <Text style={styles.thirdPartyDebtText}>
                {currency} {formatAmount(thirdPartyChargesTotal)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Bloque 3: Compromiso Exigible de este mes */}
        <View style={styles.wideCard}>
          <View style={[styles.topAccentBar, { backgroundColor: '#FF9F0A' }]} />

          <View style={styles.headerRow}>
            <View style={[styles.cyberBadge, styles.amberCyberBadge]}>
              <Ionicons name="calendar-outline" size={11} color="#FF9F0A" />
              <Text style={[styles.cyberBadgeText, { color: '#FF9F0A' }]}>COMPROMISO DEL MES</Text>
            </View>
            <View style={styles.activeCycleBadge}>
              <Text style={styles.activeCycleBadgeText}>Ciclo actual</Text>
            </View>
          </View>

          <View style={styles.amountContainer}>
            <Text style={[styles.currencySymbol, { color: '#FF9F0A' }]}>{currency}</Text>
            <Text style={styles.totalDebtText}>{formatAmount(monthCommitment)}</Text>
          </View>

          <View style={styles.commitmentContextCard}>
            <View style={styles.calendarIconContainerAmber}>
              <Ionicons name="cash-outline" size={16} color="#FF9F0A" />
            </View>
            <View style={styles.commitmentContextTextCol}>
              <Text style={styles.commitmentContextTitle}>Cuotas y pagos pactados</Text>
              <Text style={styles.commitmentContextDesc}>
                Monto presupuestado exigible para el servicio de tus deudas este período
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Preservación 100% de la estructura y apariencia móvil preexistente (Visual Freeze)
  return (
    <View style={styles.card}>
      {/* Detalle visual superior de acento cibernético */}
      <View style={styles.topAccentBar} />

      {/* Fila superior: Badge cibernético con punto verde "DEUDA TOTAL VIGENTE" y texto de moneda */}
      <View style={styles.headerRow}>
        <View style={styles.cyberBadge}>
          <View style={styles.greenDot} />
          <Text style={styles.cyberBadgeText}>DEUDA TOTAL VIGENTE</Text>
        </View>
        <View style={styles.currencyBadge}>
          <Text style={styles.currencyBadgeText}>{currency} USD</Text>
        </View>
      </View>

      {/* Monto total grande en negrita */}
      <View style={styles.amountContainer}>
        <Text style={styles.currencySymbol}>{currency}</Text>
        <Text style={styles.totalDebtText}>{formatAmount(totalDebt)}</Text>
      </View>

      {/* Fila de desglose visual claro: Mi deuda real vs A cargo de terceros */}
      <View style={styles.breakdownRow}>
        <TouchableOpacity
          style={styles.breakdownCol}
          onPress={onPressPersonal}
          disabled={!onPressPersonal}
          activeOpacity={onPressPersonal ? 0.7 : 1}
        >
          <View style={styles.breakdownLabelRow}>
            <Text style={styles.breakdownEmoji}>👤</Text>
            <Text style={styles.breakdownLabel}>Mi Deuda Real</Text>
            {onPressPersonal && (
              <Ionicons name="chevron-forward" size={11} color={colors.textSecondary} />
            )}
          </View>
          <Text style={styles.personalDebtText}>
            {currency} {formatAmount(personalDebt)}
          </Text>
        </TouchableOpacity>

        <View style={styles.breakdownDivider} />

        <TouchableOpacity
          style={styles.breakdownCol}
          onPress={onPressThirdParty}
          disabled={!onPressThirdParty}
          activeOpacity={onPressThirdParty ? 0.7 : 1}
        >
          <View style={styles.breakdownLabelRow}>
            <Text style={styles.breakdownEmoji}>🤝</Text>
            <Text style={styles.breakdownLabelHighlight}>A Cargo de Terceros</Text>
            {onPressThirdParty && (
              <Ionicons name="chevron-forward" size={11} color={colors.primary} />
            )}
          </View>
          <Text style={styles.thirdPartyDebtText}>
            {currency} {formatAmount(thirdPartyDebt)}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Fila intermedia con métrica de "COMPROMISO DEL MES" destacada con icono calendar-outline y monto */}
      <View style={styles.commitmentRow}>
        <View style={styles.commitmentLeft}>
          <View style={styles.calendarIconContainer}>
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.commitmentLabel}>COMPROMISO DEL MES</Text>
            <Text style={styles.commitmentSub}>Cuotas y pagos pactados</Text>
          </View>
        </View>
        <Text style={styles.commitmentAmount}>
          {currency} {formatAmount(monthCommitment)}
        </Text>
      </View>

      {/* Barra de progreso de amortización global */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTextRow}>
          <Text style={styles.progressLabel}>Amortización de Pasivos</Text>
          <Text style={styles.progressPercentageText}>{progressPercentage}% Pagado</Text>
        </View>

        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${clampedProgress}%` }]} />
        </View>

        <View style={styles.progressMetricsRow}>
          <Text style={styles.progressDetailText}>
            Liquidado: {currency} {formatAmount(paidAmount)}
          </Text>
          <Text style={styles.progressDetailText}>
            Inicial: {currency} {formatAmount(totalOriginal)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    position: 'relative',
    overflow: 'hidden',
    gap: 14,
  },
  wideRow: {
    flexDirection: 'row',
    gap: 14,
    width: '100%',
    alignItems: 'stretch',
  },
  wideCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'space-between',
    gap: 14,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  topAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.primary,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  cyberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
    borderColor: 'rgba(0, 255, 163, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  blueCyberBadge: {
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
    borderColor: 'rgba(10, 132, 255, 0.25)',
  },
  amberCyberBadge: {
    backgroundColor: 'rgba(255, 159, 10, 0.08)',
    borderColor: 'rgba(255, 159, 10, 0.25)',
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  cyberBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  currencyBadge: {
    backgroundColor: '#161616',
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  currencyBadgeText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  linkHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkHintText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0A84FF',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 4,
  },
  totalDebtText: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  breakdownCol: {
    flex: 1,
    gap: 4,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  breakdownDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },
  breakdownLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breakdownEmoji: {
    fontSize: 12,
  },
  breakdownLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  breakdownLabelHighlight: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  personalDebtText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  thirdPartyDebtText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  wideBreakdownContainer: {
    backgroundColor: '#161616',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  wideBreakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wideBreakdownAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  wideBreakdownDivider: {
    height: 1,
    backgroundColor: colors.border,
    width: '100%',
  },
  commitmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  commitmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calendarIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 255, 163, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commitmentLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  commitmentSub: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.text,
    marginTop: 1,
  },
  commitmentAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  activeCycleBadge: {
    backgroundColor: '#161616',
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeCycleBadgeText: {
    color: '#FF9F0A',
    fontSize: 11,
    fontWeight: '600',
  },
  commitmentContextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  calendarIconContainerAmber: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 159, 10, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commitmentContextTextCol: {
    flex: 1,
    gap: 2,
  },
  commitmentContextTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
  },
  commitmentContextDesc: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 13,
  },
  progressContainer: {
    gap: 8,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  progressPercentageText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2C2C2E',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  progressMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressDetailText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});

export default DebtsSummaryCard;
