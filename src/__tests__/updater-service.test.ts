import {
  checkForAppUpdates,
  downloadAndInstallUpdate,
  formatUpdaterErrorMessage,
  UpdateCheckResult,
  UpdateProgress,
} from '../services/updater-service';
import { isTauri } from '../utils/tauri-helpers';
import { check, Update, DownloadEvent } from '@tauri-apps/plugin-updater';

jest.mock('../utils/tauri-helpers', () => ({
  isTauri: jest.fn(),
}));

jest.mock('@tauri-apps/plugin-updater', () => {
  const actual = jest.requireActual('@tauri-apps/plugin-updater');
  return {
    ...actual,
    check: jest.fn(),
  };
});

const mockIsTauri = isTauri as jest.MockedFunction<typeof isTauri>;
const mockCheck = check as jest.MockedFunction<typeof check>;

const createMockUpdate = (
  version = '1.2.0',
  body = 'Release notes for 1.2.0',
  date = '2026-11-05'
): Update => {
  return new Update({
    rid: 1,
    currentVersion: '1.0.0',
    version,
    body,
    date,
    rawJson: {},
  });
};

describe('updater-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatUpdaterErrorMessage', () => {
    it('traduce errores de release inexistente o 404 a mensaje localizado', () => {
      const error1 = 'Could not fetch a valid release JSON from the remote';
      const error2 = 'Release not found on endpoint';
      const error3 = 'Server responded with 404 Not Found';
      const error4 = new Error('HTTP 404 status code');

      expect(formatUpdaterErrorMessage(error1)).toBe(
        'No hay versiones publicadas en el servidor de actualizaciones.'
      );
      expect(formatUpdaterErrorMessage(error2)).toBe(
        'No hay versiones publicadas en el servidor de actualizaciones.'
      );
      expect(formatUpdaterErrorMessage(error3)).toBe(
        'No hay versiones publicadas en el servidor de actualizaciones.'
      );
      expect(formatUpdaterErrorMessage(error4)).toBe(
        'No hay versiones publicadas en el servidor de actualizaciones.'
      );
    });

    it('traduce errores de red y conectividad a mensaje localizado', () => {
      const networkErrors = [
        'Network request failed',
        'Failed to send request',
        'fetch failed',
        'connection refused by server',
        'request timeout',
        'dns lookup failure',
        'client is offline',
        new Error('Network disconnected'),
      ];

      networkErrors.forEach((err) => {
        expect(formatUpdaterErrorMessage(err)).toBe(
          'Sin conexión con el servidor de actualizaciones.'
        );
      });
    });

    it('traduce errores de firma y llaves públicas a mensaje localizado', () => {
      const signatureErrors = [
        'Invalid signature',
        'pubkey mismatch during update',
        'failed to verify package',
        'minisign verify error',
        new Error('Signature verification failed'),
      ];

      signatureErrors.forEach((err) => {
        expect(formatUpdaterErrorMessage(err)).toBe(
          'Error de validación de firma en la actualización.'
        );
      });
    });

    it('retorna mensaje amigable por defecto ante errores inesperados o genéricos', () => {
      const unknownErrors = [
        'Unexpected syntax at position 0',
        'Failed to read buffer',
        new Error('Something unexpected happened'),
      ];

      unknownErrors.forEach((err) => {
        expect(formatUpdaterErrorMessage(err)).toBe(
          'No se pudo verificar la actualización en este momento.'
        );
      });
    });
  });

  describe('checkForAppUpdates', () => {
    it('1. Retorna UNSUPPORTED cuando isTauri() es false (Web / Móvil)', async () => {
      mockIsTauri.mockReturnValue(false);

      const result: UpdateCheckResult = await checkForAppUpdates();

      expect(result).toEqual({ status: 'UNSUPPORTED' });
      expect(mockCheck).not.toHaveBeenCalled();
    });

    it('2. Retorna UP_TO_DATE cuando check() devuelve null', async () => {
      mockIsTauri.mockReturnValue(true);
      mockCheck.mockResolvedValue(null);

      const result: UpdateCheckResult = await checkForAppUpdates();

      expect(result).toEqual({ status: 'UP_TO_DATE' });
      expect(mockCheck).toHaveBeenCalledTimes(1);
    });

    it('3. Retorna AVAILABLE con metadata de versión cuando check() devuelve una actualización', async () => {
      mockIsTauri.mockReturnValue(true);
      const fakeUpdate = createMockUpdate('2.0.0', 'Nueva versión disponible', '2026-11-05');
      mockCheck.mockResolvedValue(fakeUpdate);

      const result: UpdateCheckResult = await checkForAppUpdates();

      expect(result).toEqual({
        status: 'AVAILABLE',
        version: '2.0.0',
        notes: 'Nueva versión disponible',
        date: '2026-11-05',
        updateRef: fakeUpdate,
      });
      expect(mockCheck).toHaveBeenCalledTimes(1);
    });

    it('4. Retorna ERROR con mensaje localizado cuando check() arroja una excepción de release no publicado', async () => {
      mockIsTauri.mockReturnValue(true);
      mockCheck.mockRejectedValue(
        new Error('Could not fetch a valid release JSON from the remote')
      );

      const result: UpdateCheckResult = await checkForAppUpdates();

      expect(result).toEqual({
        status: 'ERROR',
        error: 'No hay versiones publicadas en el servidor de actualizaciones.',
      });
    });

    it('5. Retorna ERROR con mensaje localizado cuando check() arroja una excepción de red', async () => {
      mockIsTauri.mockReturnValue(true);
      mockCheck.mockRejectedValue(new Error('Network request failed'));

      const result: UpdateCheckResult = await checkForAppUpdates();

      expect(result).toEqual({
        status: 'ERROR',
        error: 'Sin conexión con el servidor de actualizaciones.',
      });
    });

    it('6. Retorna ERROR con mensaje localizado cuando check() arroja una excepción de firma', async () => {
      mockIsTauri.mockReturnValue(true);
      mockCheck.mockRejectedValue(new Error('Signature verification failed'));

      const result: UpdateCheckResult = await checkForAppUpdates();

      expect(result).toEqual({
        status: 'ERROR',
        error: 'Error de validación de firma en la actualización.',
      });
    });

    it('7. Retorna ERROR con mensaje amigable por defecto cuando check() arroja un error no-Error genérico', async () => {
      mockIsTauri.mockReturnValue(true);
      mockCheck.mockRejectedValue('Error desconocido e inesperado');

      const result: UpdateCheckResult = await checkForAppUpdates();

      expect(result).toEqual({
        status: 'ERROR',
        error: 'No se pudo verificar la actualización en este momento.',
      });
    });
  });

  describe('downloadAndInstallUpdate', () => {
    it('8. Llama a downloadAndInstall y despacha eventos de progreso correctamente', async () => {
      const fakeUpdate = createMockUpdate();
      const progressEvents: UpdateProgress[] = [];

      jest
        .spyOn(fakeUpdate, 'downloadAndInstall')
        .mockImplementation(async (onEvent?: (progress: DownloadEvent) => void) => {
          if (onEvent) {
            onEvent({ event: 'Started', data: { contentLength: 1000 } });
            onEvent({ event: 'Progress', data: { chunkLength: 250 } });
            onEvent({ event: 'Progress', data: { chunkLength: 500 } });
            onEvent({ event: 'Finished' });
          }
        });

      const success = await downloadAndInstallUpdate(fakeUpdate, (p) => {
        progressEvents.push(p);
      });

      expect(success).toBe(true);
      expect(fakeUpdate.downloadAndInstall).toHaveBeenCalledTimes(1);
      expect(progressEvents).toEqual([
        { downloaded: 0, total: 1000, percent: 0 },
        { downloaded: 250, total: 1000, percent: 25 },
        { downloaded: 750, total: 1000, percent: 75 },
        { downloaded: 1000, total: 1000, percent: 100 },
      ]);
    });

    it('Calcula progreso correctamente cuando contentLength es indefinido', async () => {
      const fakeUpdate = createMockUpdate();
      const progressEvents: UpdateProgress[] = [];

      jest
        .spyOn(fakeUpdate, 'downloadAndInstall')
        .mockImplementation(async (onEvent?: (progress: DownloadEvent) => void) => {
          if (onEvent) {
            onEvent({ event: 'Started', data: {} });
            onEvent({ event: 'Progress', data: { chunkLength: 500 } });
            onEvent({ event: 'Finished' });
          }
        });

      const success = await downloadAndInstallUpdate(fakeUpdate, (p) => {
        progressEvents.push(p);
      });

      expect(success).toBe(true);
      expect(progressEvents).toEqual([
        { downloaded: 0, total: undefined, percent: 0 },
        { downloaded: 500, total: undefined, percent: 0 },
        { downloaded: 500, total: undefined, percent: 100 },
      ]);
    });

    it('Funciona correctamente cuando no se proporciona onProgress', async () => {
      const fakeUpdate = createMockUpdate();

      jest
        .spyOn(fakeUpdate, 'downloadAndInstall')
        .mockImplementation(async (onEvent?: (progress: DownloadEvent) => void) => {
          if (onEvent) {
            onEvent({ event: 'Started', data: { contentLength: 500 } });
            onEvent({ event: 'Progress', data: { chunkLength: 500 } });
            onEvent({ event: 'Finished' });
          }
        });

      const success = await downloadAndInstallUpdate(fakeUpdate);

      expect(success).toBe(true);
      expect(fakeUpdate.downloadAndInstall).toHaveBeenCalledTimes(1);
    });

    it('9. Retorna error o false cuando downloadAndInstall falla', async () => {
      const fakeUpdate = createMockUpdate();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      jest
        .spyOn(fakeUpdate, 'downloadAndInstall')
        .mockRejectedValue(new Error('Fallo al escribir archivo binario'));

      const success = await downloadAndInstallUpdate(fakeUpdate);

      expect(success).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
