/**
 * useUpdater Composable
 * Provides auto-update functionality for the application
 */

import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  checkForUpdates,
  downloadAndInstall,
  type UpdateInfo,
  type UpdateProgress,
  type UpdateStatus,
} from '@/services/updater.service';

export interface UseUpdaterOptions {
  /** Auto check for updates on mount */
  autoCheck?: boolean;
  /** Check interval in milliseconds (0 = disabled) */
  checkInterval?: number;
}

export function useUpdater(options: UseUpdaterOptions = {}) {
  const { autoCheck = false, checkInterval = 0 } = options;

  // State
  const status = ref<UpdateStatus>('idle');
  const updateInfo = ref<UpdateInfo | null>(null);
  const progress = ref<UpdateProgress | null>(null);
  const error = ref<string | null>(null);
  const lastChecked = ref<Date | null>(null);

  // Check interval timer
  let intervalId: ReturnType<typeof setInterval> | null = null;

  // Computed
  const isChecking = computed(() => status.value === 'checking');
  const isAvailable = computed(() => status.value === 'available');
  const isDownloading = computed(() => status.value === 'downloading');
  const isReady = computed(() => status.value === 'ready');
  const hasError = computed(() => status.value === 'error');
  const canCheck = computed(
    () => status.value === 'idle' || status.value === 'error'
  );
  const canDownload = computed(() => status.value === 'available');

  /**
   * Check for updates
   */
  async function check(): Promise<UpdateInfo | null> {
    if (status.value === 'checking') {
      return null;
    }

    status.value = 'checking';
    error.value = null;

    try {
      const info = await checkForUpdates();
      lastChecked.value = new Date();

      if (info) {
        updateInfo.value = info;
        status.value = 'available';
      } else {
        updateInfo.value = null;
        status.value = 'idle';
      }

      return info;
    } catch (err) {
      status.value = 'error';
      error.value = err instanceof Error ? err.message : 'Failed to check for updates';
      return null;
    }
  }

  /**
   * Download and install the update
   */
  async function download(): Promise<void> {
    if (status.value !== 'available') {
      throw new Error('No update available');
    }

    status.value = 'downloading';
    progress.value = { downloaded: 0, total: undefined, percentage: 0 };
    error.value = null;

    try {
      await downloadAndInstall((p) => {
        progress.value = p;
      });

      status.value = 'ready';
    } catch (err) {
      status.value = 'error';
      error.value = err instanceof Error ? err.message : 'Failed to download update';
      throw err;
    }
  }

  /**
   * Dismiss the current update notification
   */
  function dismiss(): void {
    if (status.value !== 'downloading') {
      status.value = 'idle';
      updateInfo.value = null;
      progress.value = null;
      error.value = null;
    }
  }

  /**
   * Reset the updater state
   */
  function reset(): void {
    status.value = 'idle';
    updateInfo.value = null;
    progress.value = null;
    error.value = null;
  }

  // Setup
  onMounted(() => {
    if (autoCheck) {
      check();
    }

    if (checkInterval > 0) {
      intervalId = setInterval(() => {
        if (canCheck.value) {
          check();
        }
      }, checkInterval);
    }
  });

  // Cleanup
  onUnmounted(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });

  return {
    // State
    status,
    updateInfo,
    progress,
    error,
    lastChecked,

    // Computed
    isChecking,
    isAvailable,
    isDownloading,
    isReady,
    hasError,
    canCheck,
    canDownload,

    // Actions
    check,
    download,
    dismiss,
    reset,
  };
}

export type Updater = ReturnType<typeof useUpdater>;
