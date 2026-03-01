/**
 * Updater Service
 * Handles application auto-update functionality via tauri-plugin-updater
 */

import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export interface UpdateInfo {
  version: string;
  currentVersion: string;
  date?: string;
  body?: string;
}

export interface UpdateProgress {
  downloaded: number;
  total?: number;
  percentage: number;
}

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'error';

export interface UpdateState {
  status: UpdateStatus;
  info: UpdateInfo | null;
  progress: UpdateProgress | null;
  error: string | null;
}

/**
 * Check for application updates
 */
export async function checkForUpdates(): Promise<UpdateInfo | null> {
  try {
    const update = await check();

    if (update) {
      return {
        version: update.version,
        currentVersion: update.currentVersion,
        date: update.date,
        body: update.body,
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to check for updates:', error);
    throw error;
  }
}

/**
 * Download and install update
 */
export async function downloadAndInstall(
  onProgress?: (progress: UpdateProgress) => void
): Promise<void> {
  const update = await check();

  if (!update) {
    throw new Error('No update available');
  }

  let downloaded = 0;
  let total = 0;

  await update.downloadAndInstall((event) => {
    switch (event.event) {
      case 'Started':
        total = event.data.contentLength || 0;
        break;
      case 'Progress':
        downloaded += event.data.chunkLength;
        if (onProgress) {
          onProgress({
            downloaded,
            total: total || undefined,
            percentage: total > 0 ? Math.round((downloaded / total) * 100) : 0,
          });
        }
        break;
      case 'Finished':
        if (onProgress) {
          onProgress({
            downloaded: total,
            total,
            percentage: 100,
          });
        }
        break;
    }
  });

  // Relaunch the application after update
  await relaunch();
}

/**
 * Get current app version
 */
export function getCurrentVersion(): string {
  return __APP_VERSION__ || '0.1.0';
}
