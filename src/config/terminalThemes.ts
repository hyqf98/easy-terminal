/**
 * Terminal themes configuration
 * Provides light and dark themes that sync with the application theme
 */
import type { ITheme } from 'xterm';

export interface TerminalThemeConfig {
  name: string;
  theme: ITheme;
}

// Light theme for terminal
export const lightTerminalTheme: ITheme = {
  background: '#ffffff',
  foreground: '#1f2225',
  cursor: '#1f2225',
  cursorAccent: '#ffffff',
  selectionBackground: 'rgba(0, 0, 0, 0.2)',
  black: '#000000',
  red: '#cd3131',
  green: '#00bc00',
  yellow: '#949800',
  blue: '#0451a5',
  magenta: '#bc05bc',
  cyan: '#0598bc',
  white: '#555555',
  brightBlack: '#666666',
  brightRed: '#cd3131',
  brightGreen: '#14ce14',
  brightYellow: '#b5ba00',
  brightBlue: '#0451a5',
  brightMagenta: '#bc05bc',
  brightCyan: '#0598bc',
  brightWhite: '#a5a5a5',
};

// Dark theme for terminal
export const darkTerminalTheme: ITheme = {
  background: '#101014',
  foreground: '#e5e5e7',
  cursor: '#e5e5e7',
  cursorAccent: '#101014',
  selectionBackground: 'rgba(255, 255, 255, 0.2)',
  black: '#000000',
  red: '#cd3131',
  green: '#0dbc79',
  yellow: '#e5e510',
  blue: '#2472c8',
  magenta: '#bc3fbc',
  cyan: '#11a8cd',
  white: '#e5e5e5',
  brightBlack: '#666666',
  brightRed: '#f14c4c',
  brightGreen: '#23d18b',
  brightYellow: '#f5f543',
  brightBlue: '#3b8eea',
  brightMagenta: '#d670d6',
  brightCyan: '#29b8db',
  brightWhite: '#e5e5e5',
};

// Theme map for easy access
export const terminalThemes: Record<'light' | 'dark', TerminalThemeConfig> = {
  light: {
    name: 'light',
    theme: lightTerminalTheme,
  },
  dark: {
    name: 'dark',
    theme: darkTerminalTheme,
  },
};

/**
 * Get terminal theme based on app theme
 */
export function getTerminalTheme(appTheme: 'light' | 'dark'): ITheme {
  return terminalThemes[appTheme].theme;
}

/**
 * Default terminal options (shared across themes)
 */
export const defaultTerminalOptions = {
  fontSize: 14,
  fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace",
  cursorBlink: true,
  cursorStyle: 'block' as const,
  scrollback: 10000,
  allowProposedApi: true,
  allowTransparency: true,
  convertEol: true,
};
