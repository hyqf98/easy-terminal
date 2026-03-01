/**
 * Keyboard shortcuts composable
 */
import { onMounted, onUnmounted } from 'vue';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: (event: KeyboardEvent) => void;
  preventDefault?: boolean;
}

const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

export function useKeyboard(shortcuts: KeyboardShortcut[]) {
  function handleKeyDown(event: KeyboardEvent): void {
    for (const shortcut of shortcuts) {
      const ctrlMatch = isMac
        ? (shortcut.ctrl === true) === event.metaKey
        : (shortcut.ctrl ?? false) === event.ctrlKey;
      const shiftMatch = (shortcut.shift ?? false) === event.shiftKey;
      const altMatch = (shortcut.alt ?? false) === event.altKey;
      const metaMatch = isMac
        ? (shortcut.meta ?? false) === event.ctrlKey
        : (shortcut.meta ?? false) === event.metaKey;
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

      if (ctrlMatch && shiftMatch && altMatch && metaMatch && keyMatch) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }
        shortcut.handler(event);
        return;
      }
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });

  return {
    isMac,
  };
}

/**
 * Check if Ctrl key should be treated as Cmd on Mac
 */
export function isCtrlOrCmd(event: KeyboardEvent): boolean {
  return isMac ? event.metaKey : event.ctrlKey;
}
