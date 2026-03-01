/**
 * Keyboard shortcut related type definitions
 */

/** Platform type */
export type Platform = 'windows' | 'macos' | 'linux';

/** Modifier keys */
export interface Modifiers {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}

/** Shortcut scope - where the shortcut is active */
export type ShortcutScope = 'global' | 'terminal' | 'editor' | 'file-explorer';

/** Shortcut category for grouping in settings */
export type ShortcutCategory = 'terminal' | 'tabs' | 'splits' | 'other';

/** Keyboard shortcut definition */
export interface ShortcutDefinition {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description?: string;
  /** Category for grouping */
  category: ShortcutCategory;
  /** Default key binding for Windows/Linux */
  defaultKey: string;
  /** Default key binding for macOS */
  defaultKeyMac?: string;
  /** Current key binding (if customized) */
  customKey?: string;
  /** Whether this is a global shortcut */
  scope?: ShortcutScope;
  /** Whether the shortcut is enabled */
  enabled?: boolean;
}

/** Parsed key combination */
export interface ParsedKeyCombo {
  /** The main key */
  key: string;
  /** Modifier keys */
  modifiers: Modifiers;
  /** Original string representation */
  original: string;
}

/** Registered shortcut with handler */
export interface RegisteredShortcut extends ShortcutDefinition {
  /** Current key binding (custom or default) */
  keyBinding: string;
  /** The handler function */
  handler: (event: KeyboardEvent) => void;
  /** Whether to prevent default browser behavior */
  preventDefault?: boolean;
}

/** Shortcut conflict info */
export interface ShortcutConflict {
  /** The new shortcut being registered */
  newShortcut: RegisteredShortcut;
  /** Existing shortcuts with the same binding */
  existingShortcuts: RegisteredShortcut[];
}

/** All default shortcuts configuration */
export interface ShortcutsConfig {
  [key: string]: ShortcutDefinition;
}

/** Get the current platform */
export function getPlatform(): Platform {
  const platform = navigator.platform.toUpperCase();
  if (platform.indexOf('MAC') >= 0) {
    return 'macos';
  } else if (platform.indexOf('WIN') >= 0) {
    return 'windows';
  }
  return 'linux';
}

/** Check if we're on macOS */
export function isMacOS(): boolean {
  return getPlatform() === 'macos';
}

/** Parse a key combination string (e.g., 'Ctrl+Shift+T') */
export function parseKeyCombo(combo: string): ParsedKeyCombo {
  const parts = combo.split('+').map(p => p.trim().toLowerCase());
  const modifiers: Modifiers = {};
  let key = '';

  for (const part of parts) {
    switch (part) {
      case 'ctrl':
      case 'control':
        modifiers.ctrl = true;
        break;
      case 'shift':
        modifiers.shift = true;
        break;
      case 'alt':
      case 'option':
        modifiers.alt = true;
        break;
      case 'meta':
      case 'cmd':
      case 'command':
        modifiers.meta = true;
        break;
      default:
        key = part;
    }
  }

  return {
    key,
    modifiers,
    original: combo,
  };
}

/** Format a key combo for display */
export function formatKeyCombo(combo: string, useSymbols = true): string {
  if (!useSymbols) {
    return combo;
  }

  return combo
    .replace(/Cmd|Command/gi, '⌘')
    .replace(/Shift/gi, '⇧')
    .replace(/Alt|Option/gi, '⌥')
    .replace(/Ctrl|Control/gi, '⌃')
    .replace(/\+/g, '');
}

/** Get the effective key binding for the current platform */
export function getEffectiveKey(shortcut: ShortcutDefinition): string {
  const platform = getPlatform();
  if (platform === 'macos' && shortcut.defaultKeyMac) {
    return shortcut.customKey || shortcut.defaultKeyMac;
  }
  return shortcut.customKey || shortcut.defaultKey;
}

/** Default shortcuts definitions */
export const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
  // Terminal operations
  {
    id: 'terminal.new',
    name: '新建终端',
    description: '创建一个新的终端标签页',
    category: 'terminal',
    defaultKey: 'Ctrl+Shift+T',
    defaultKeyMac: 'Cmd+Shift+T',
    scope: 'global',
  },
  {
    id: 'terminal.close',
    name: '关闭终端',
    description: '关闭当前终端标签页',
    category: 'terminal',
    defaultKey: 'Ctrl+W',
    defaultKeyMac: 'Cmd+W',
    scope: 'global',
  },
  {
    id: 'terminal.clear',
    name: '清空终端',
    description: '清空当前终端内容',
    category: 'terminal',
    defaultKey: 'Ctrl+K',
    defaultKeyMac: 'Cmd+K',
    scope: 'terminal',
  },
  {
    id: 'terminal.searchHistory',
    name: '搜索历史',
    description: '搜索命令历史',
    category: 'terminal',
    defaultKey: 'Ctrl+R',
    defaultKeyMac: 'Cmd+R',
    scope: 'terminal',
  },

  // Tab management
  {
    id: 'tabs.switchNext',
    name: '切换到下一个标签页',
    description: '切换到下一个标签页',
    category: 'tabs',
    defaultKey: 'Ctrl+Tab',
    defaultKeyMac: 'Cmd+Tab',
    scope: 'global',
  },
  {
    id: 'tabs.switchPrev',
    name: '切换到上一个标签页',
    description: '切换到上一个标签页',
    category: 'tabs',
    defaultKey: 'Ctrl+Shift+Tab',
    defaultKeyMac: 'Cmd+Shift+Tab',
    scope: 'global',
  },

  // Split operations
  {
    id: 'splits.horizontal',
    name: '水平分屏',
    description: '将当前终端水平分割',
    category: 'splits',
    defaultKey: 'Ctrl+Shift+\\',
    defaultKeyMac: 'Cmd+Shift+\\',
    scope: 'global',
  },
  {
    id: 'splits.vertical',
    name: '垂直分屏',
    description: '将当前终端垂直分割',
    category: 'splits',
    defaultKey: 'Ctrl+Shift+-',
    defaultKeyMac: 'Cmd+Shift+-',
    scope: 'global',
  },
  {
    id: 'splits.focusUp',
    name: '焦点上移',
    description: '将焦点移到上方的分屏',
    category: 'splits',
    defaultKey: 'Ctrl+Up',
    defaultKeyMac: 'Cmd+Up',
    scope: 'global',
  },
  {
    id: 'splits.focusDown',
    name: '焦点下移',
    description: '将焦点移到下方的分屏',
    category: 'splits',
    defaultKey: 'Ctrl+Down',
    defaultKeyMac: 'Cmd+Down',
    scope: 'global',
  },
  {
    id: 'splits.focusLeft',
    name: '焦点左移',
    description: '将焦点移到左侧的分屏',
    category: 'splits',
    defaultKey: 'Ctrl+Left',
    defaultKeyMac: 'Cmd+Left',
    scope: 'global',
  },
  {
    id: 'splits.focusRight',
    name: '焦点右移',
    description: '将焦点移到右侧的分屏',
    category: 'splits',
    defaultKey: 'Ctrl+Right',
    defaultKeyMac: 'Cmd+Right',
    scope: 'global',
  },

  // Other
  {
    id: 'other.toggleSidebar',
    name: '切换侧边栏',
    description: '显示或隐藏侧边栏',
    category: 'other',
    defaultKey: 'Ctrl+B',
    defaultKeyMac: 'Cmd+B',
    scope: 'global',
  },
  {
    id: 'other.commandPalette',
    name: '命令面板',
    description: '打开命令面板',
    category: 'other',
    defaultKey: 'Ctrl+Shift+P',
    defaultKeyMac: 'Cmd+Shift+P',
    scope: 'global',
  },
  {
    id: 'other.settings',
    name: '打开设置',
    description: '打开设置面板',
    category: 'other',
    defaultKey: 'Ctrl+,',
    defaultKeyMac: 'Cmd+,',
    scope: 'global',
  },
];
