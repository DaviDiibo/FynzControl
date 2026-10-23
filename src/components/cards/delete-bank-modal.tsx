import React, { JSX } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { Bank } from '../../store/cards-store';

type DeleteBankModalProps = {
  bank: Bank | null;
  associatedCardsCount: number;
  activeDebtsCount: number;
  onClose: () => void;
  onConfirmDelete: (id: string) => void;
};

export const DeleteBankModal = ({
  bank,
  associatedCardsCount,
  activeDebtsCount,
  onClose,
  onConfirmDelete,
}: DeleteBankModalProps): JSX.Element | null => {
  if (!bank) {
    return null;
  }

  const isBlocked = associatedCardsCount > 0 || activeDebtsCount > 0;

  return (
    <Modal
      visible={Boolean(bank)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar modal tocando fuera"
        />
        <View style={styles.modalContainer}>
          {isBlocked ? (
            <>
              <View style={styles.blockedIconCircle}>
                <MaterialCommunityIcons name="shield-alert-outline" size={32} color="#FF9F0A" />
              </View>

              <Text style={styles.blockedTitle}>NO ES POSIBLE ELIMINAR</Text>
              <Text style={styles.bankSubtitle}>{bank.name}</Text>

              <View style={styles.dependenciesHud}>
                <Text style={styles.dependenciesHudTitle}>Productos vigentes vinculados:</Text>
                {associatedCardsCount > 0 && (
                  <Text style={styles.dependencyItem}>
                    • {associatedCardsCount} {associatedCardsCount === 1 ? 'tarjeta de crédito vinculada' : 'tarjetas de crédito vinculadas'}
                  </Text>
                )}
                {activeDebtsCount > 0 && (
                  <Text style={styles.dependencyItem}>
                    • {activeDebtsCount} {activeDebtsCount === 1 ? 'préstamo bancario activo' : 'préstamos bancarios activos'}
                  </Text>
                )}
              </View>

              <Text style={styles.blockedExplanation}>
                Para proteger la integridad de tus registros contables, no puedes dar de baja un banco con productos vigentes. Reasigna o liquida las tarjetas y préstamos para habilitar su eliminación.
              </Text>

              <TouchableOpacity
                style={styles.understoodButton}
                activeOpacity={0.7}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Entendido"
              >
                <Text style={styles.understoodButtonText}>ENTENDIDO</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.dangerIconCircle}>
                <Ionicons name="trash-outline" size={32} color="#FF453A" />
              </View>

              <Text style={styles.dangerTitle}>¿ELIMINAR BANCO?</Text>

              <View style={styles.safeBadge}>
                <Ionicons name="checkmark-circle-outline" size={14} color="#00FFA3" />
                <Text style={styles.safeBadgeText}>Sin productos asociados</Text>
              </View>

              <Text style={styles.dangerMessage}>
                ¿Estás seguro de que deseas eliminar permanentemente &apos;{bank.name}&apos; del catálogo del sistema? Esta acción no se puede deshacer.
              </Text>

              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  activeOpacity={0.7}
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Cancelar"
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmDeleteButton}
                  activeOpacity={0.7}
                  onPress={() => onConfirmDelete(bank.id)}
                  accessibilityRole="button"
                  accessibilityLabel="Eliminar Banco"
                >
                  <Ionicons name="trash-outline" size={16} color="#FFF" />
                  <Text style={styles.confirmDeleteButtonText}>Eliminar Banco</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backdropTouchable: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#1E1E1E',
    borderColor: '#333333',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    zIndex: 1,
  },
  blockedIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  blockedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  bankSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  dependenciesHud: {
    width: '100%',
    backgroundColor: '#121212',
    borderRadius: 8,
    padding: 12,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    gap: 6,
  },
  dependenciesHudTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF9F0A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  dependencyItem: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  blockedExplanation: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 18,
  },
  understoodButton: {
    width: '100%',
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  understoodButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  dangerIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  safeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 255, 163, 0.1)',
    borderColor: 'rgba(0, 255, 163, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
    marginBottom: 12,
  },
  safeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00FFA3',
  },
  dangerMessage: {
    fontSize: 13,
    lineHeight: 19,
    color: '#E5E5EA',
    textAlign: 'center',
    marginBottom: 16,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  confirmDeleteButton: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FF453A',
    borderRadius: 10,
    paddingVertical: 12,
  },
  confirmDeleteButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
