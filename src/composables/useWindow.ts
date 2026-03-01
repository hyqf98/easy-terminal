/**
 * Window management composable
 * Handles window state persistence, minimize to tray, etc.
 */
import { ref, onMounted, onUnmounted } from 'vue';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { PhysicalSize, PhysicalPosition } from '@tauri-apps/api/dpi';
import type { WindowState } from '@/types';

const WINDOW_STATE_KEY = 'easy-terminal-window-state';

export function useWindow() {
  const appWindow = getCurrentWindow();

  // State
  const isMaximized = ref(false);
  const isMinimized = ref(false);
  const isFocused = ref(true);
  const windowState = ref<WindowState>({
    width: 1024,
    height: 768,
    isMaximized: false,
  });

  // Load saved window state
  async function loadWindowState(): Promise<void> {
    try {
      const saved = localStorage.getItem(WINDOW_STATE_KEY);
      if (saved) {
        const state = JSON.parse(saved) as WindowState;
        windowState.value = state;

        // Restore window position and size
        if (state.width && state.height) {
          await appWindow.setSize(new PhysicalSize(state.width, state.height));
        }
        if (state.x !== undefined && state.y !== undefined) {
          await appWindow.setPosition(new PhysicalPosition(state.x, state.y));
        }
        if (state.isMaximized) {
          await appWindow.maximize();
          isMaximized.value = true;
        }
      }

      // Check current maximized state
      isMaximized.value = await appWindow.isMaximized();
    } catch (error) {
      console.warn('Failed to load window state:', error);
    }
  }

  // Save window state
  async function saveWindowState(): Promise<void> {
    try {
      const size = await appWindow.innerSize();
      const position = await appWindow.outerPosition();
      isMaximized.value = await appWindow.isMaximized();

      windowState.value = {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
        isMaximized: isMaximized.value,
      };

      localStorage.setItem(WINDOW_STATE_KEY, JSON.stringify(windowState.value));
    } catch (error) {
      console.warn('Failed to save window state:', error);
    }
  }

  // Window controls
  async function minimize(): Promise<void> {
    try {
      await appWindow.minimize();
      isMinimized.value = true;
    } catch (error) {
      console.warn('Failed to minimize:', error);
    }
  }

  async function maximize(): Promise<void> {
    try {
      await appWindow.maximize();
      isMaximized.value = true;
    } catch (error) {
      console.warn('Failed to maximize:', error);
    }
  }

  async function unmaximize(): Promise<void> {
    try {
      await appWindow.unmaximize();
      isMaximized.value = false;
    } catch (error) {
      console.warn('Failed to unmaximize:', error);
    }
  }

  async function toggleMaximize(): Promise<void> {
    try {
      await appWindow.toggleMaximize();
      isMaximized.value = await appWindow.isMaximized();
    } catch (error) {
      console.warn('Failed to toggle maximize:', error);
    }
  }

  async function close(): Promise<void> {
    try {
      await saveWindowState();
      await appWindow.close();
    } catch (error) {
      console.warn('Failed to close:', error);
    }
  }

  // Event handlers
  const unlisten: (() => void)[] = [];

  onMounted(async () => {
    await loadWindowState();

    // Listen for window events
    unlisten.push(
      await appWindow.onResized(async () => {
        isMaximized.value = await appWindow.isMaximized();
      })
    );

    unlisten.push(
      await appWindow.onFocusChanged(({ payload }) => {
        isFocused.value = payload;
      })
    );

    // Save state on close
    unlisten.push(
      await appWindow.onCloseRequested(async () => {
        await saveWindowState();
      })
    );
  });

  onUnmounted(() => {
    unlisten.forEach((fn) => fn());
  });

  return {
    isMaximized,
    isMinimized,
    isFocused,
    windowState,
    loadWindowState,
    saveWindowState,
    minimize,
    maximize,
    unmaximize,
    toggleMaximize,
    close,
  };
}
