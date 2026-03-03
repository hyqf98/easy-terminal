/**
 * useModifierKeys - Track keyboard modifier keys state
 */
import { ref, onMounted, onUnmounted } from 'vue';

const ctrlKey = ref(false);
const shiftKey = ref(false);
const altKey = ref(false);
const metaKey = ref(false);

// Global state - shared across all component instances
let listenerCount = 0;

function handleKeyDown(event: KeyboardEvent) {
  ctrlKey.value = event.ctrlKey;
  shiftKey.value = event.shiftKey;
  altKey.value = event.altKey;
  metaKey.value = event.metaKey;
}

function handleKeyUp(event: KeyboardEvent) {
  ctrlKey.value = event.ctrlKey;
  shiftKey.value = event.shiftKey;
  altKey.value = event.altKey;
  metaKey.value = event.metaKey;
}

// Handle window blur to reset state
function handleBlur() {
  ctrlKey.value = false;
  shiftKey.value = false;
  altKey.value = false;
  metaKey.value = false;
}

export function useModifierKeys() {
  onMounted(() => {
    if (listenerCount === 0) {
      window.addEventListener('keydown', handleKeyDown, true);
      window.addEventListener('keyup', handleKeyUp, true);
      window.addEventListener('blur', handleBlur);
    }
    listenerCount++;
  });

  onUnmounted(() => {
    listenerCount--;
    if (listenerCount === 0) {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('blur', handleBlur);
    }
  });

  return {
    ctrlKey,
    shiftKey,
    altKey,
    metaKey,
  };
}
