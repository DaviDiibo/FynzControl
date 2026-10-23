import * as LocalAuthentication from 'expo-local-authentication';

export const checkBiometricSupport = async (): Promise<{
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
}> => {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
  return { hasHardware, isEnrolled, supportedTypes };
};

export const authenticateWithBiometrics = async (
  promptMessage = 'Autenticación biométrica de ControlFynz'
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { hasHardware, isEnrolled } = await checkBiometricSupport();
    if (!hasHardware) {
      return { success: false, error: 'hardware_unavailable' };
    }
    if (!isEnrolled) {
      return { success: false, error: 'not_enrolled' };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancelar',
      fallbackLabel: 'Usar código',
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true };
    }
    return { success: false, error: result.error };
  } catch (err) {
    return { success: false, error: 'exception' };
  }
};
