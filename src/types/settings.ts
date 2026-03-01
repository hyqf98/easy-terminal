/**
 * Settings related type definitions
 */

/** Theme type */
export type Theme = 'light' | 'dark' | 'system';

/** Application settings */
export interface AppSettings {
  /** Theme setting */
  theme: Theme;
  /** Font family for terminal */
  terminalFontFamily: string;
  /** Font size for terminal */
  terminalFontSize: number;
  /** Line height for terminal */
  terminalLineHeight: number;
  /** Cursor style */
  cursorStyle: 'block' | 'underline' | 'bar';
  /** Cursor blink */
  cursorBlink: boolean;
  /** Scrollback limit */
  scrollbackLimit: number;
  /** Shell for local terminal */
  localShell: string;
  /** Default encoding */
  encoding: string;
  /** Show sidebar */
  showSidebar: boolean;
  /** Sidebar width */
  sidebarWidth: number;
  /** Confirm on close */
  confirmOnClose: boolean;
  /** Copy on select */
  copyOnSelect: boolean;
  /** Right click behavior */
  rightClickBehavior: 'paste' | 'menu' | 'copy';
  /** Bell sound */
  bellSound: boolean;
  /** Bell style */
  bellStyle: 'none' | 'sound' | 'visual' | 'both';
}

/** Keyboard shortcut */
export interface KeyboardShortcut {
  /** Shortcut ID */
  id: string;
  /** Shortcut name */
  name: string;
  /** Description */
  description?: string;
  /** Key combination (e.g., 'Ctrl+Shift+T') */
  key: string;
  /** Whether it's a global shortcut */
  isGlobal: boolean;
}

/** Window state for persistence */
export interface WindowState {
  /** X position */
  x?: number;
  /** Y position */
  y?: number;
  /** Width */
  width: number;
  /** Height */
  height: number;
  /** Maximized */
  isMaximized: boolean;
}

/** Default settings values */
export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  terminalFontFamily: 'Cascadia Code, SF Mono, Monaco, Consolas, monospace',
  terminalFontSize: 14,
  terminalLineHeight: 1.2,
  cursorStyle: 'block',
  cursorBlink: true,
  scrollbackLimit: 10000,
  localShell: '',
  encoding: 'utf-8',
  showSidebar: true,
  sidebarWidth: 260,
  confirmOnClose: true,
  copyOnSelect: false,
  rightClickBehavior: 'menu',
  bellSound: false,
  bellStyle: 'none',
};
