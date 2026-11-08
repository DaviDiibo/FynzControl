export const DESKTOP_DOWNLOAD_URL = 'https://github.com/DaviDiibo/FynzControl/releases/latest';
export const PLAY_STORE_TESTING_URL = 'https://play.google.com/apps/testing/com.controlfynz.app';
export const SUPPORT_EMAIL = 'fynzcontrol0627@gmail.com';

export const getTesterRequestMailtoUrl = (userEmail?: string): string => {
  const subject = encodeURIComponent('Solicitud de Acceso Beta Tester - ControlFynz Android');
  const bodyLines = [
    'Hola equipo de ControlFynz,',
    '',
    'Deseo participar como Beta Tester en el programa de pruebas cerrado de Google Play.',
    '',
    `• Correo de mi cuenta de Google Play: ${userEmail || ''}`,
    '• Modelo de dispositivo: ',
    '• Versión de Android: ',
    '',
    '¡Gracias!',
  ];
  const body = encodeURIComponent(bodyLines.join('\n'));
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
};

export const getFeedbackMailtoUrl = (userEmail?: string): string => {
  const subject = encodeURIComponent('[Beta Feedback] Reporte de Mejora o Error - ControlFynz');
  const bodyLines = [
    'Hola equipo de ControlFynz,',
    '',
    'Tengo el siguiente reporte / sugerencia sobre la aplicación:',
    '',
    '• Descripción del problema o sugerencia: ',
    '• Pantalla o sección donde ocurrió: ',
    `• Correo de mi cuenta: ${userEmail || ''}`,
    '',
    '¡Gracias!',
  ];
  const body = encodeURIComponent(bodyLines.join('\n'));
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
};

