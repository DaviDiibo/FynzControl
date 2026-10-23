import React from 'react';
import type { JSX } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import type { TransactionType } from '../../store/transactions-store';

export interface DeletableTransaction {
  id: string;
  title: string;
  amount: number;
  type?: TransactionType;
  currency?: string;
}

export interface DeleteTransactionModalProps {
  visible: boolean;
  transaction: DeletableTransaction | null;
  currencySymbol?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const formatAmount = (val: number): string =>
  Math.abs(val).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const DeleteTransactionModal = ({
  visible,
  transaction,
  currencySymbol = '$',
  onCancel,
  onConfirm,
}: DeleteTransactionModalProps): JSX.Element => {
  const isPositive =
    transaction?.type === 'income' || transaction?.type === 'reimbursement';

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalIconCircle}>
            <Ionicons name="trash-outline" size={26} color="#FF453A" />
          </View>

          <Text style={styles.modalTitle}>ELIMINAR MOVIMIENTO</Text>

          <Text style={styles.modalConceptText} numberOfLines={2}>
            "{transaction?.title}"
          </Text>

          <Text
            style={[
              styles.modalAmountText,
              {
                color: isPositive ? '#00FFA3' : '#FF453A',
              },
            ]}
          >
            {isPositive ? '+' : '-'}
            {transaction?.currency || currencySymbol}
            {formatAmount(transaction?.amount || 0)}
          </Text>

          {transaction?.type === 'reimbursement' && (
            <View style={styles.reimbursementNoteBox}>
              <Ionicons
                name="information-circle-outline"
                size={15}
                color="#00FFA3"
              />
              <Text style={styles.reimbursementNoteText}>
                Al eliminar este reembolso, el saldo volverá a quedar pendiente en la cuenta de tarjeta del tercero.
              </Text>
            </View>
          )}

          {transaction?.type === 'card_payment' && (
            <View style={styles.cardPaymentNoteBox}>
              <Ionicons
                name="information-circle-outline"
                size={15}
                color="#0A84FF"
              />
              <Text style={styles.cardPaymentNoteText}>
                Se cancelará el registro de pago y los fondos se reintegrarán automáticamente a tu cuenta bancaria de origen.
              </Text>
            </View>
          )}

          <Text style={styles.modalExplanationText}>
            Tu saldo disponible se recalculará automáticamente y el saldo de la deuda o préstamo asociado será restaurado.
          </Text>

          <View style={styles.modalButtonsRow}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalDeleteButton}
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Text style={styles.modalDeleteButtonText}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderColor: '#2C2C2E',
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    maxWidth: 380,
    width: '100%',
    alignItems: 'center',
  },
  modalIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  modalConceptText: {
    fontSize: 15,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalAmountText: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  reimbursementNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
    borderColor: 'rgba(0, 255, 163, 0.22)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    width: '100%',
  },
  reimbursementNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#00FFA3',
    lineHeight: 16,
  },
  cardPaymentNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(10, 132, 255, 0.08)',
    borderColor: 'rgba(10, 132, 255, 0.22)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    width: '100%',
  },
  cardPaymentNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#0A84FF',
    lineHeight: 16,
  },
  modalExplanationText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    marginRight: 10,
  },
  modalCancelButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  modalDeleteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FF453A',
    alignItems: 'center',
  },
  modalDeleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default DeleteTransactionModal;
