import React from 'react';
import type { JSX } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth-store';

export type UserProfileCardProps = {
  name?: string;
  email?: string;
  syncStatus?: string;
  avatarUrl?: string;
};

const UserProfileCard = ({
  name = 'David',
  email = 'david@controlfynz.app',
  syncStatus = 'Sincronizado Local',
  avatarUrl,
}: UserProfileCardProps): JSX.Element => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const currentAvatar = avatarUrl || user?.avatarUrl;

  return (
    <View style={styles.card}>
      <View style={styles.profileRow}>
        <View style={styles.avatarContainer}>
          {currentAvatar ? (
            <Image
              source={{ uri: currentAvatar }}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="person" size={28} color="#00FFA3" />
          )}
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.nameText}>{name}</Text>
          <Text style={styles.emailText}>{email}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.neonDot} />
            <Text style={styles.badgeText}>
              {isAuthenticated ? 'OFFLINE-FIRST ACTIVO' : 'MODO OFFLINE'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.separator} />

      <View style={styles.syncRow}>
        <Ionicons name="cloud-done-outline" size={16} color="#00FFA3" />
        <Text style={styles.syncText}>{syncStatus}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderTopWidth: 2.5,
    borderTopColor: colors.primary,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,255,163,0.12)',
    borderWidth: 1.5,
    borderColor: '#00FFA3',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  infoContainer: {
    flex: 1,
    gap: 3,
  },
  nameText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
  },
  emailText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  neonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00FFA3',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00FFA3',
    letterSpacing: 0.8,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

export default UserProfileCard;
