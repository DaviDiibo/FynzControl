import React, { useState } from 'react';
import type { JSX } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/auth-store';
import { colors } from '../../src/theme/colors';

const GOOGLE_G_ICON_URI =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="%23EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="%234285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="%23FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="%2334A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';

const LoginScreen = (): JSX.Element => {
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const isLoading = useAuthStore((state) => state.isLoading);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState<string>('');
  const [emailOrUser, setEmailOrUser] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);

  const toggleMode = (): void => {
    setError(null);
    setInfoMessage(null);
    setMode((prev) => (prev === 'login' ? 'register' : 'login'));
  };

  const handleAuthAction = async (): Promise<void> => {
    setError(null);
    setInfoMessage(null);

    if (mode === 'login') {
      if (!emailOrUser.trim() || !password.trim()) {
        setError('Por favor, completa todos los campos para ingresar.');
        return;
      }
      const res = await login(emailOrUser.trim(), password);
      if (res.error) {
        setError(res.error);
      }
    } else {
      if (!name.trim()) {
        setError('Por favor, ingresa tu nombre completo.');
        return;
      }
      if (!emailOrUser.trim()) {
        setError('Por favor, ingresa tu correo electrónico.');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailOrUser.trim())) {
        setError('El formato del correo electrónico no es válido.');
        return;
      }
      if (!password || password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres.');
        return;
      }

      const res = await register(name.trim(), emailOrUser.trim(), password);
      if (res.error) {
        setError(res.error);
      } else if (res.message) {
        setInfoMessage(res.message);
      }
    }
  };

  const handleGoogleLogin = async (): Promise<void> => {
    setError(null);
    setInfoMessage(null);
    setIsGoogleLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result.error) {
        setError(result.error);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Futurista */}
          <View style={styles.headerContainer}>
            <View style={styles.badgeContainer}>
              <View style={styles.badgeDot} />
              <Text style={styles.badgeText}>SISTEMA EN LÍNEA</Text>
            </View>
            <Text style={styles.title}>ControlFynz</Text>
            <Text style={styles.subtitle}>
              {mode === 'login' ? 'Acceso Seguro al Sistema' : 'Registro de Nuevo Usuario'}
            </Text>
          </View>

          {/* Formulario */}
          <View style={styles.formContainer}>
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {infoMessage ? (
              <View style={styles.infoBanner}>
                <Text style={styles.infoText}>{infoMessage}</Text>
              </View>
            ) : null}

            {mode === 'register' ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>NOMBRE COMPLETO</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    if (error) setError(null);
                    if (infoMessage) setInfoMessage(null);
                  }}
                  placeholder="Tu nombre y apellido"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                {mode === 'register' ? 'CORREO ELECTRÓNICO' : 'USUARIO O CORREO'}
              </Text>
              <TextInput
                style={styles.input}
                value={emailOrUser}
                onChangeText={(text) => {
                  setEmailOrUser(text);
                  if (error) setError(null);
                  if (infoMessage) setInfoMessage(null);
                }}
                placeholder={
                  mode === 'register' ? 'tu@correo.com' : 'usuario@dominio.com o nombre'
                }
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                keyboardType={mode === 'register' ? 'email-address' : 'default'}
                autoCorrect={false}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>CONTRASEÑA</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (error) setError(null);
                    if (infoMessage) setInfoMessage(null);
                  }}
                  placeholder="••••••••••••"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.toggleButton}
                  onPress={() => setShowPassword((prev) => !prev)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <Text style={styles.toggleButtonText}>
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, (isLoading || isGoogleLoading) && styles.disabledButton]}
              disabled={isLoading || isGoogleLoading}
              onPress={handleAuthAction}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#121212" />
              ) : (
                <Text style={styles.loginButtonText}>
                  {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Enlace inferior conmutable */}
            <View style={styles.toggleModeContainer}>
              <Text style={styles.toggleModeText}>
                {mode === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
              </Text>
              <TouchableOpacity onPress={toggleMode} activeOpacity={0.7}>
                <Text style={styles.toggleModeLink}>
                  {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Divisor */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o continuar con</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Botones de Proveedores Sociales */}
          <View style={styles.socialButtonsContainer}>
            <TouchableOpacity
              style={styles.googleButton}
              disabled={isLoading || isGoogleLoading}
              onPress={handleGoogleLogin}
              activeOpacity={0.8}
            >
              {isGoogleLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Image
                    source={{ uri: GOOGLE_G_ICON_URI }}
                    style={styles.googleIcon}
                    contentFit="contain"
                  />
                  <Text style={styles.googleButtonText}>Continuar con Google</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.appleButton}
              disabled={true}
              activeOpacity={1}
            >
              <Text style={styles.appleButtonText}>
                Apple iCloud <Text style={styles.upcomingBadge}>(Próximamente)</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 16,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  badgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 6,
    letterSpacing: 0.3,
  },
  formContainer: {
    width: '100%',
    gap: 18,
  },
  errorBanner: {
    backgroundColor: '#2A1515',
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '500',
  },
  infoBanner: {
    backgroundColor: '#0F291E',
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  infoText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
  },
  passwordInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  toggleButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  toggleButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  loginButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  disabledButton: {
    opacity: 0.7,
  },
  toggleModeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  toggleModeText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  toggleModeLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 28,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'lowercase',
  },
  socialButtonsContainer: {
    gap: 12,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#242429',
    borderColor: '#3D3D44',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    opacity: 1,
  },
  googleIcon: {
    width: 22,
    height: 22,
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  appleButton: {
    backgroundColor: '#1E1E1E',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    opacity: 0.35,
  },
  appleButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  upcomingBadge: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '400',
  },
});

export default LoginScreen;
