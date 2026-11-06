import React, { useState } from 'react';
import type { JSX } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { isTauri } from '../../utils/tauri-helpers';
import {
  checkForAppUpdates,
  downloadAndInstallUpdate,
  formatUpdaterErrorMessage,
  UpdateCheckResult,
  UpdateProgress,
} from '../../services/updater-service';

export const UpdateCheckerCard = (): JSX.Element | null => {
  if (!isTauri()) {
    return null;
  }

  const [checking, setChecking] = useState<boolean>(false);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleCheckUpdates = async (): Promise<void> => {
    if (checking || downloading) {
      return;
    }
    setChecking(true);
    setStatusMessage(null);

    try {
      const result: UpdateCheckResult = await checkForAppUpdates();
      setUpdateResult(result);

      if (result.status === 'AVAILABLE') {
        setModalVisible(true);
      } else if (result.status === 'UP_TO_DATE') {
        setStatusMessage('Sistema al día');
        setTimeout(() => {
          setStatusMessage(null);
        }, 3500);
      } else if (result.status === 'ERROR') {
        setStatusMessage(result.error || 'No se pudo verificar la actualización en este momento.');
        setTimeout(() => {
          setStatusMessage(null);
        }, 5000);
      }
    } catch (err) {
      const rawMsg: string = err instanceof Error ? err.message : String(err);
      setStatusMessage(formatUpdaterErrorMessage(rawMsg));
      setTimeout(() => {
        setStatusMessage(null);
      }, 5000);
    } finally {
      setChecking(false);
    }
  };

  const handleInstall = async (): Promise<void> => {
    if (!updateResult?.updateRef || downloading) {
      return;
    }

    setDownloading(true);
    setProgress({ downloaded: 0, percent: 0 });

    try {
      const success: boolean = await downloadAndInstallUpdate(
        updateResult.updateRef,
        (p: UpdateProgress) => {
          setProgress(p);
        }
      );

      if (success) {
        setStatusMessage('Actualización descargada e instalada.');
      } else {
        setStatusMessage('Error al descargar o instalar la actualización.');
        setDownloading(false);
      }
    } catch (err) {
      const rawMsg: string = err instanceof Error ? err.message : String(err);
      setStatusMessage(formatUpdaterErrorMessage(rawMsg));
      setDownloading(false);
    }
  };

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>SISTEMA & ACTUALIZACIONES</Text>

        <View style={styles.row}>
          <View style={styles.itemLeftFlex}>
            <View style={styles.iconBadge}>
              <Ionicons name="refresh-circle-outline" size={20} color="#00FFA3" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.rowTitle}>Actualizaciones de Escritorio</Text>
              <Text style={styles.rowSubtitle}>
                {statusMessage ?? 'Verificar parches y nuevas versiones del sistema'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.badgeButton, (checking || downloading) && styles.badgeButtonDisabled]}
            onPress={handleCheckUpdates}
            disabled={checking || downloading}
            activeOpacity={0.7}
          >
            {checking ? (
              <ActivityIndicator size="small" color="#00FFA3" />
            ) : updateResult?.status === 'AVAILABLE' ? (
              <Text style={styles.badgeButtonText}>[ NUEVA v{updateResult.version} ]</Text>
            ) : (
              <Text style={styles.badgeButtonText}>
                {statusMessage === 'Sistema al día' ? '[ AL DÍA ]' : '[ BUSCAR ]'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!downloading) {
            setModalVisible(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalBadge}>
              <Text style={styles.modalBadgeText}>
                CONTROLFYNZ OS // ACTUALIZACIÓN
              </Text>
            </View>

            <Text style={styles.modalTitle}>NUEVA VERSIÓN DETECTADA</Text>

            <View style={styles.versionRow}>
              <Text style={styles.versionLabel}>Versión entrante:</Text>
              <View style={styles.versionTag}>
                <Text style={styles.versionTagText}>v{updateResult?.version || '1.0.0'}</Text>
              </View>
            </View>

            {updateResult?.notes ? (
              <View style={styles.notesContainer}>
                <Text style={styles.notesTitle}>NOTAS DE LA VERSIÓN:</Text>
                <ScrollView style={styles.notesScroll} nestedScrollEnabled>
                  <Text style={styles.notesText}>{updateResult.notes}</Text>
                </ScrollView>
              </View>
            ) : null}

            {downloading && (
              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Descargando paquete...</Text>
                  <Text style={styles.progressPercent}>{progress?.percent ?? 0}%</Text>
                </View>

                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${progress?.percent ?? 0}%` },
                    ]}
                  />
                </View>

                <Text style={styles.progressBytes}>
                  {progress?.downloaded
                    ? `${(progress.downloaded / (1024 * 1024)).toFixed(1)} MB`
                    : '0.0 MB'}
                  {progress?.total
                    ? ` / ${(progress.total / (1024 * 1024)).toFixed(1)} MB`
                    : ''}
                </Text>
              </View>
            )}

            <View style={styles.modalActions}>
              {!downloading ? (
                <>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setModalVisible(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalCancelText}>Más tarde</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalInstallButton}
                    onPress={handleInstall}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="download-outline" size={16} color="#121212" style={styles.installIcon} />
                    <Text style={styles.modalInstallText}>Actualizar ahora</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.downloadingIndicator}>
                  <ActivityIndicator size="small" color="#00FFA3" />
                  <Text style={styles.downloadingText}>Instalando actualización...</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderColor: '#2C2C2E',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00FFA3',
    letterSpacing: 1.2,
    marginBottom: 14,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: 8,
  },
  itemLeftFlex: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 163, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#8E8E93',
    marginTop: 2,
  },
  badgeButton: {
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 163, 0.45)',
    backgroundColor: 'rgba(0, 255, 163, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeButtonDisabled: {
    borderColor: 'rgba(142, 142, 147, 0.3)',
    backgroundColor: 'rgba(142, 142, 147, 0.05)',
  },
  badgeButtonText: {
    color: '#00FFA3',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#1E1E1E',
    borderColor: '#00FFA3',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 440,
  },
  modalBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#00FFA3',
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 12,
  },
  modalBadgeText: {
    color: '#00FFA3',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  versionLabel: {
    fontSize: 13,
    color: '#8E8E93',
  },
  versionTag: {
    backgroundColor: 'rgba(0, 255, 163, 0.15)',
    borderColor: '#00FFA3',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  versionTagText: {
    color: '#00FFA3',
    fontSize: 12,
    fontWeight: '700',
  },
  notesContainer: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    maxHeight: 120,
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  notesScroll: {
    maxHeight: 90,
  },
  notesText: {
    fontSize: 12,
    color: '#D1D1D6',
    lineHeight: 17,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00FFA3',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#2C2C2E',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00FFA3',
  },
  progressBytes: {
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'right',
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 4,
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
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  modalInstallButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#00FFA3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  installIcon: {
    marginRight: 6,
  },
  modalInstallText: {
    color: '#121212',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  downloadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 6,
    width: '100%',
  },
  downloadingText: {
    color: '#00FFA3',
    fontSize: 13,
    fontWeight: '600',
  },
});
