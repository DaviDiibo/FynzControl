import { check, Update } from '@tauri-apps/plugin-updater';
import { isTauri } from '../utils/tauri-helpers';

export type UpdateCheckResult = {
  status: 'AVAILABLE' | 'UP_TO_DATE' | 'UNSUPPORTED' | 'ERROR';
  version?: string;
  notes?: string;
  date?: string;
  updateRef?: Update;
  error?: string;
};

export type UpdateProgress = {
  downloaded: number;
  total?: number;
  percent: number;
};

export const checkForAppUpdates = async (): Promise<UpdateCheckResult> => {
  if (!isTauri()) {
    return { status: 'UNSUPPORTED' };
  }

  try {
    const update = await check();

    if (update) {
      return {
        status: 'AVAILABLE',
        version: update.version,
        notes: update.body,
        date: update.date,
        updateRef: update,
      };
    }

    return { status: 'UP_TO_DATE' };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      status: 'ERROR',
      error: errorMessage,
    };
  }
};

export const downloadAndInstallUpdate = async (
  update: Update,
  onProgress?: (progress: UpdateProgress) => void
): Promise<boolean> => {
  try {
    let downloaded = 0;
    let total: number | undefined;

    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case 'Started': {
          total = event.data.contentLength;
          if (onProgress) {
            onProgress({
              downloaded,
              total,
              percent: total && total > 0 ? Math.min(100, Math.round((downloaded / total) * 100)) : 0,
            });
          }
          break;
        }
        case 'Progress': {
          downloaded += event.data.chunkLength;
          const percent = total && total > 0 ? Math.min(100, Math.round((downloaded / total) * 100)) : 0;
          if (onProgress) {
            onProgress({
              downloaded,
              total,
              percent,
            });
          }
          break;
        }
        case 'Finished': {
          if (onProgress) {
            onProgress({
              downloaded: total ?? downloaded,
              total,
              percent: 100,
            });
          }
          break;
        }
      }
    });

    return true;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Failed to download and install update:', errorMessage);
    return false;
  }
};
