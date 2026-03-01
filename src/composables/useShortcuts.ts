/**
 * useShortcuts - Centralized keyboard shortcuts manager
 *
 * This composable provides a unified way to manage keyboard shortcuts:
 * - Register/unregister shortcuts dynamically
 * - Conflict detection
 * - Platform-specific key bindings (Ctrl vs Cmd)
 * - Scope-based shortcut activation
 */

import { ref, computed, onMounted, onUnmounted, readonly } from 'vue';
import {
  type ShortcutDefinition,
  type RegisteredShortcut,
  type ShortcutScope,
  type ShortcutConflict,
  type ParsedKeyCombo,
  getPlatform,
  isMacOS,
  parseKeyCombo,
  getEffectiveKey,
} from '@/types/shortcut';

// Global registry for all shortcuts
const globalShortcuts = ref<Map<string, RegisteredShortcut>>(new Map());
const activeScope = ref<ShortcutScope>('global');

// Platform detection
const platform = getPlatform();
const isMac = isMacOS();

/**
 * Normalize a key for comparison
 */
function normalizeKey(key: string): string {
  return key.toLowerCase();
}

/**
 * Check if a keyboard event matches a key combo
 */
function eventMatchesCombo(event: KeyboardEvent, combo: ParsedKeyCombo): boolean {
  // On Mac, Ctrl key is mapped to Meta (Cmd) for shortcuts
  const ctrlMatch = isMac
    ? combo.modifiers.ctrl === event.metaKey
    : combo.modifiers.ctrl === event.ctrlKey;

  // On Mac, Meta key is mapped to Ctrl for shortcuts
  const metaMatch = isMac
    ? combo.modifiers.meta === event.ctrlKey
    : combo.modifiers.meta === event.metaKey;

  const shiftMatch = combo.modifiers.shift === event.shiftKey;
  const altMatch = combo.modifiers.alt === event.altKey;
  const keyMatch = normalizeKey(event.key) === normalizeKey(combo.key);

  return ctrlMatch && shiftMatch && altMatch && metaMatch && keyMatch;
}

/**
 * Generate a unique key for a shortcut binding
 */
function getBindingKey(combo: ParsedKeyCombo): string {
  const parts: string[] = [];
  if (combo.modifiers.ctrl) parts.push('ctrl');
  if (combo.modifiers.shift) parts.push('shift');
  if (combo.modifiers.alt) parts.push('alt');
  if (combo.modifiers.meta) parts.push('meta');
  parts.push(normalizeKey(combo.key));
  return parts.join('+');
}

/**
 * Find shortcuts that conflict with a given binding
 */
function findConflicts(binding: string, excludeId?: string): RegisteredShortcut[] {
  const conflicts: RegisteredShortcut[] = [];

  globalShortcuts.value.forEach((shortcut) => {
    if (shortcut.id === excludeId) return;

    const shortcutBinding = getBindingKey(parseKeyCombo(shortcut.keyBinding));
    if (shortcutBinding === binding) {
      conflicts.push(shortcut);
    }
  });

  return conflicts;
}

/**
 * Main shortcuts manager composable
 */
export function useShortcuts() {
  /**
   * Register a shortcut
   */
  function registerShortcut(
    definition: ShortcutDefinition,
    handler: (event: KeyboardEvent) => void,
    options?: { preventDefault?: boolean }
  ): ShortcutConflict | null {
    const keyBinding = getEffectiveKey(definition);
    const parsedCombo = parseKeyCombo(keyBinding);
    const bindingKey = getBindingKey(parsedCombo);

    // Check for conflicts
    const conflicts = findConflicts(bindingKey, definition.id);
    if (conflicts.length > 0) {
      return {
        newShortcut: {
          ...definition,
          keyBinding,
          handler,
          preventDefault: options?.preventDefault ?? true,
        },
        existingShortcuts: conflicts,
      };
    }

    // Register the shortcut
    const registered: RegisteredShortcut = {
      ...definition,
      keyBinding,
      handler,
      preventDefault: options?.preventDefault ?? true,
    };

    globalShortcuts.value.set(definition.id, registered);
    return null;
  }

  /**
   * Unregister a shortcut by ID
   */
  function unregisterShortcut(id: string): boolean {
    return globalShortcuts.value.delete(id);
  }

  /**
   * Update a shortcut's key binding
   */
  function updateShortcutKey(id: string, newKey: string): ShortcutConflict | null {
    const existing = globalShortcuts.value.get(id);
    if (!existing) return null;

    const parsedCombo = parseKeyCombo(newKey);
    const bindingKey = getBindingKey(parsedCombo);

    // Check for conflicts
    const conflicts = findConflicts(bindingKey, id);
    if (conflicts.length > 0) {
      return {
        newShortcut: {
          ...existing,
          keyBinding: newKey,
        },
        existingShortcuts: conflicts,
      };
    }

    // Update the shortcut
    globalShortcuts.value.set(id, {
      ...existing,
      keyBinding: newKey,
    });

    return null;
  }

  /**
   * Get all registered shortcuts
   */
  const shortcuts = computed(() => Array.from(globalShortcuts.value.values()));

  /**
   * Get shortcuts by category
   */
  function getShortcutsByCategory(category: string): RegisteredShortcut[] {
    return shortcuts.value.filter((s) => s.category === category);
  }

  /**
   * Get shortcuts by scope
   */
  function getShortcutsByScope(scope: ShortcutScope): RegisteredShortcut[] {
    return shortcuts.value.filter((s) => s.scope === scope || s.scope === 'global');
  }

  /**
   * Set the active scope
   */
  function setActiveScope(scope: ShortcutScope): void {
    activeScope.value = scope;
  }

  /**
   * Get a shortcut by ID
   */
  function getShortcut(id: string): RegisteredShortcut | undefined {
    return globalShortcuts.value.get(id);
  }

  /**
   * Check if a shortcut is registered
   */
  function isRegistered(id: string): boolean {
    return globalShortcuts.value.has(id);
  }

  /**
   * Clear all shortcuts
   */
  function clearAllShortcuts(): void {
    globalShortcuts.value.clear();
  }

  return {
    shortcuts: readonly(shortcuts),
    activeScope: readonly(activeScope),
    registerShortcut,
    unregisterShortcut,
    updateShortcutKey,
    getShortcutsByCategory,
    getShortcutsByScope,
    setActiveScope,
    getShortcut,
    isRegistered,
    clearAllShortcuts,
    platform,
    isMac,
  };
}

/**
 * Keyboard event handler composable
 * Use this to set up global keyboard listening
 */
export function useKeyboardHandler() {
  const { shortcuts, activeScope } = useShortcuts();

  function handleKeyDown(event: KeyboardEvent): void {
    // Don't handle if we're in an input field (unless it's a global shortcut)
    const target = event.target as HTMLElement;
    const isInputElement = ['INPUT', 'TEXTAREA'].includes(target.tagName) ||
      target.isContentEditable;

    // Process shortcuts
    for (const shortcut of shortcuts.value) {
      // Skip disabled shortcuts
      if (shortcut.enabled === false) continue;

      // Check scope
      if (shortcut.scope !== 'global' && shortcut.scope !== activeScope.value) {
        continue;
      }

      // Skip non-global shortcuts when in input element
      if (isInputElement && shortcut.scope !== 'global') {
        continue;
      }

      const combo = parseKeyCombo(shortcut.keyBinding);
      if (eventMatchesCombo(event, combo)) {
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
    handleKeyDown,
  };
}

/**
 * Simplified composable for registering shortcuts in components
 */
export function useComponentShortcuts(
  shortcutsConfig: Array<{
    id: string;
    definition: ShortcutDefinition;
    handler: (event: KeyboardEvent) => void;
    preventDefault?: boolean;
  }>
) {
  const { registerShortcut, unregisterShortcut } = useShortcuts();

  onMounted(() => {
    for (const config of shortcutsConfig) {
      registerShortcut(config.definition, config.handler, {
        preventDefault: config.preventDefault,
      });
    }
  });

  onUnmounted(() => {
    for (const config of shortcutsConfig) {
      unregisterShortcut(config.id);
    }
  });
}

// Re-export utilities
export { parseKeyCombo, getEffectiveKey, isMacOS, getPlatform };
export { DEFAULT_SHORTCUTS } from '@/types/shortcut';
