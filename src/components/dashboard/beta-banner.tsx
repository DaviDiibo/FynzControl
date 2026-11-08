import React, { useState, useEffect } from 'react';
import type { JSX } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { safeStorage } from '../../store/safe-storage';
import { useAuthStore } from '../../store/auth-store';
import { isTauri } from '../../utils/tauri-helpers';
import { getFeedbackMailtoUrl } from '../../constants/links';

const STORAGE_KEY = 'controlfynz_beta_banner_dismissed_v1';

export const BetaBanner = (): JSX.Element | null => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const userEmail = useAuthStore((state) => state.user?.email);

  useEffect(() => {
    let isMounted = true;

    const checkDismissedStatus = async (): Promise<void> => {
      try {
        const dismissed = await safeStorage.getItem(STORAGE_KEY);
        if (isMounted && dismissed !== 'true') {
          setIsVisible(true);
        }
      } catch {
        if (isMounted) {
          setIsVisible(true);
        }
      }
    };

    void checkDismissedStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDismiss = (): void => {
    setIsVisible(false);
    void safeStorage.setItem(STORAGE_KEY, 'true');
  };

  const handleOpenFeedback = async (): Promise<void> => {
    const url = getFeedbackMailtoUrl(userEmail);
    try {
      if (isTauri()) {
        try {
          const { openUrl } = await import('@tauri-apps/plugin-opener');
          await openUrl(url);
          return;
        } catch {
          // Fallback a Linking si falla el plugin nativo de Tauri
        }
      }
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error al abrir URL de feedback:', error);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <View style={styles.neonDot} />
          <Text style={styles.badgeText}>[ FASE BETA // MEJORAS ACTIVAS ]</Text>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Cerrar aviso de fase beta"
        >
          <Ionicons name="close-outline" size={20} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      <View style={styles.bodyRow}>
        <View style={styles.iconCircle}>
          <Ionicons name="construct-outline" size={18} color="#00FFA3" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Plataforma en Evolución & Mejoras</Text>
          <Text style={styles.description}>
            Estamos optimizando ControlFynz activamente. Si encuentras alguna anomalía o tienes sugerencias, tu reporte nos ayuda a perfeccionar la experiencia.
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={handleOpenFeedback}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Reportar error o sugerencia por correo"
      >
        <Ionicons name="mail-unread-outline" size={16} color="#00FFA3" />
        <Text style={styles.actionButtonText}>Reportar error o sugerencia</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E1E',
    borderColor: '#2C2C2E',
    borderWidth: 1,
    borderLeftColor: '#00FFA3',
    borderLeftWidth: 3,
    borderRadius: 12,
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  neonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00FFA3',
  },
  badgeText: {
    color: '#00FFA3',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  closeButton: {
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 255, 163, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  description: {
    color: '#8E8E93',
    fontSize: 12,
    lineHeight: 17,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(0, 255, 163, 0.1)',
    borderColor: 'rgba(0, 255, 163, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    color: '#00FFA3',
    fontSize: 12,
    fontWeight: '600',
  },
});
