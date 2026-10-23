import React from 'react';
import type { JSX } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export type QuickActionsGridProps = {
  onAddIncome?: () => void;
  onAddExpense?: () => void;
  onCardsPress?: () => void;
  onViewAnalytics?: () => void;
};

const QuickActionsGrid = (props: QuickActionsGridProps): JSX.Element => {
  const { onAddIncome, onAddExpense, onCardsPress, onViewAnalytics } = props;

  return (
    <View style={styles.container}>
      {/* Cabecera de sección */}
      <View style={styles.header}>
        <Ionicons name="flash-outline" size={15} color={colors.primary} />
        <Text style={styles.sectionTitle}>ACCIONES RÁPIDAS</Text>
      </View>

      {/* Fila única horizontal de 4 botones */}
      <View style={styles.actionsContainer}>
        {/* Ingreso */}
        <TouchableOpacity
          style={styles.actionCard}
          activeOpacity={0.7}
          onPress={onAddIncome}
          accessibilityRole="button"
          accessibilityLabel="Registrar ingreso"
        >
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: 'rgba(0, 255, 163, 0.12)',
                borderColor: 'rgba(0, 255, 163, 0.25)',
              },
            ]}
          >
            <Ionicons name="arrow-down-circle" size={20} color="#00FFA3" />
          </View>
          <Text style={styles.actionTitle}>Ingreso</Text>
        </TouchableOpacity>

        {/* Gasto */}
        <TouchableOpacity
          style={styles.actionCard}
          activeOpacity={0.7}
          onPress={onAddExpense}
          accessibilityRole="button"
          accessibilityLabel="Registrar gasto"
        >
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: 'rgba(255, 69, 58, 0.12)',
                borderColor: 'rgba(255, 69, 58, 0.25)',
              },
            ]}
          >
            <Ionicons name="arrow-up-circle" size={20} color="#FF453A" />
          </View>
          <Text style={styles.actionTitle}>Gasto</Text>
        </TouchableOpacity>

        {/* Tarjetas */}
        <TouchableOpacity
          style={styles.actionCard}
          activeOpacity={0.7}
          onPress={onCardsPress}
          accessibilityRole="button"
          accessibilityLabel="Ver tarjetas y pasivos globales"
        >
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: 'rgba(10, 132, 255, 0.12)',
                borderColor: 'rgba(10, 132, 255, 0.25)',
              },
            ]}
          >
            <Ionicons name="card-outline" size={20} color="#0A84FF" />
          </View>
          <Text style={styles.actionTitle}>Tarjetas</Text>
        </TouchableOpacity>

        {/* Analítica */}
        <TouchableOpacity
          style={styles.actionCard}
          activeOpacity={0.7}
          onPress={onViewAnalytics}
          accessibilityRole="button"
          accessibilityLabel="Ver analítica"
        >
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: 'rgba(191, 90, 242, 0.12)',
                borderColor: 'rgba(191, 90, 242, 0.25)',
              },
            ]}
          >
            <Ionicons name="analytics" size={20} color="#BF5AF2" />
          </View>
          <Text style={styles.actionTitle}>Analítica</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
});

export default QuickActionsGrid;
