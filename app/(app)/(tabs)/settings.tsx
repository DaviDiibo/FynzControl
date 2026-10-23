import React from 'react';
import type { JSX } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../src/theme/colors';
import { useAuthStore } from '../../../src/store/auth-store';
import UserProfileCard from '../../../src/components/settings/user-profile-card';
import SettingsSectionList from '../../../src/components/settings/settings-section-list';

const SettingsScreen = (): JSX.Element => {
  const user = useAuthStore((state) => state.user);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera */}
        <View style={styles.header}>
          <View style={styles.badgeRow}>
            <Ionicons name="hardware-chip-outline" size={13} color={colors.primary} />
            <Text style={styles.badgeText}>CONFIGURACIÓN GLOBAL</Text>
          </View>
          <Text style={styles.headerTitle}>AJUSTES DEL SISTEMA</Text>
        </View>

        {/* Tarjeta de Perfil de Usuario */}
        <UserProfileCard
          name={user?.name?.trim() || user?.email?.split('@')[0] || 'Usuario'}
          email={user?.email || 'Sin correo asociado'}
        />

        {/* Lista de Secciones de Ajustes */}
        <SettingsSectionList />

        {/* Versión de la app */}
        <View style={styles.footer}>
          <Text style={styles.versionText}>
            ControlFynz v1.0.0 (Build 2026) - Offline-First Engine
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
  },
  header: {
    marginBottom: 16,
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  versionText: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
});

export default SettingsScreen;
