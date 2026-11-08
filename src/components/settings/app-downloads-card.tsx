import React from 'react';
import type { JSX } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isTauri } from '../../utils/tauri-helpers';
import { useAuthStore } from '../../store/auth-store';
import {
  DESKTOP_DOWNLOAD_URL,
  PLAY_STORE_TESTING_URL,
  getTesterRequestMailtoUrl,
} from '../../constants/links';

export const AppDownloadsCard = (): JSX.Element | null => {
  if (Platform.OS !== 'web' && !isTauri()) {
    return null;
  }

  const userEmail = useAuthStore((state) => state.user?.email);

  const handleOpenUrl = async (url: string): Promise<void> => {
    try {
      if (isTauri()) {
        try {
          const { openUrl } = await import('@tauri-apps/plugin-opener');
          await openUrl(url);
          return;
        } catch {
          // Si el plugin de Tauri falla, continuar con Linking
        }
      }

      await Linking.openURL(url);
    } catch (error) {
      console.error('Error al abrir URL externa:', error);
    }
  };

  const handleDownloadDesktop = (): void => {
    void handleOpenUrl(DESKTOP_DOWNLOAD_URL);
  };

  const handleRequestTesterAccess = (): void => {
    const mailtoUrl = getTesterRequestMailtoUrl(userEmail);
    void handleOpenUrl(mailtoUrl);
  };

  const handleOpenPlayStore = (): void => {
    void handleOpenUrl(PLAY_STORE_TESTING_URL);
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons name="cloud-download-outline" size={18} color="#00FFA3" />
        <Text style={styles.sectionHeader}>[ DESCARGAS & ACCESO ANTICIPADO ]</Text>
      </View>

      {/* Fila Escritorio */}
      <View style={styles.itemRow}>
        <View style={styles.itemLeftFlex}>
          <View style={styles.iconBadge}>
            <Ionicons name="desktop-outline" size={18} color="#00FFA3" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.rowTitle}>Versión de Escritorio (Windows / PC)</Text>
            <Text style={styles.rowSubtitle}>
              Instalador oficial descargable en GitHub Releases
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.badgeButton}
          onPress={handleDownloadDesktop}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Descargar versión de escritorio"
        >
          <Ionicons name="download-outline" size={14} color="#00FFA3" style={styles.buttonIcon} />
          <Text style={styles.badgeButtonText}>[ DESCARGAR ]</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.separator} />

      {/* Fila Android (Prueba Cerrada) */}
      <View style={styles.androidSection}>
        <View style={styles.itemLeftFlex}>
          <View style={styles.iconBadgeAmber}>
            <Ionicons name="logo-android" size={18} color="#FF9F0A" />
          </View>
          <View style={styles.textContainer}>
            <View style={styles.titleWithBadge}>
              <Text style={styles.rowTitle}>Versión Android (Google Play)</Text>
              <View style={styles.amberBadge}>
                <Text style={styles.amberBadgeText}>[ FASE DE TESTEO CERRADO ]</Text>
              </View>
            </View>
            <Text style={styles.rowSubtitle}>
              Actualmente disponible en prueba cerrada. Para instalarla, solicita acceso con tu correo de Google Play.
            </Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.neonActionButton}
            onPress={handleRequestTesterAccess}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Solicitar acceso beta tester por correo"
          >
            <Ionicons name="mail-outline" size={14} color="#121212" style={styles.buttonIcon} />
            <Text style={styles.neonActionButtonText}>[ SOLICITAR ACCESO ]</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionButton}
            onPress={handleOpenPlayStore}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Abrir enlace de prueba cerrada en Google Play"
          >
            <Ionicons name="open-outline" size={14} color="#00FFA3" style={styles.buttonIcon} />
            <Text style={styles.secondaryActionButtonText}>[ ABRIR EN PLAY STORE ]</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00FFA3',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  itemLeftFlex: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
    minWidth: 220,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 255, 163, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 163, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeAmber: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 10, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rowSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 17,
    marginTop: 2,
  },
  amberBadge: {
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
    borderColor: 'rgba(255, 159, 10, 0.35)',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  amberBadgeText: {
    color: '#FF9F0A',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  badgeButton: {
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 163, 0.45)',
    backgroundColor: 'rgba(0, 255, 163, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  badgeButtonText: {
    color: '#00FFA3',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  separator: {
    height: 1,
    backgroundColor: '#2C2C2E',
    marginVertical: 14,
  },
  androidSection: {
    gap: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  neonActionButton: {
    backgroundColor: '#00FFA3',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  neonActionButtonText: {
    color: '#121212',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryActionButton: {
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 163, 0.45)',
    backgroundColor: 'rgba(0, 255, 163, 0.08)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionButtonText: {
    color: '#00FFA3',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginRight: 6,
  },
});
