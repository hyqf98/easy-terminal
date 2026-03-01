/**
 * Config service - Handles application configuration IPC calls
 */
import { invokeCommand } from './base';
import type { AppSettings, WindowState } from '@/types';

/** Backend settings format (snake_case) */
interface BackendAppSettings {
  theme: string;
  terminal_font_family: string;
  terminal_font_size: number;
  terminal_line_height: number;
  cursor_style: string;
  cursor_blink: boolean;
  scrollback_limit: number;
  local_shell: string;
  encoding: string;
  show_sidebar: boolean;
  sidebar_width: number;
  confirm_on_close: boolean;
  copy_on_select: boolean;
  right_click_behavior: string;
  bell_sound: boolean;
  bell_style: string;
}

/** Backend window state format */
interface BackendWindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  is_maximized: boolean;
}

/** Convert backend settings to frontend format */
function toFrontendSettings(backend: BackendAppSettings): AppSettings {
  return {
    theme: backend.theme as AppSettings['theme'],
    terminalFontFamily: backend.terminal_font_family,
    terminalFontSize: backend.terminal_font_size,
    terminalLineHeight: backend.terminal_line_height,
    cursorStyle: backend.cursor_style as AppSettings['cursorStyle'],
    cursorBlink: backend.cursor_blink,
    scrollbackLimit: backend.scrollback_limit,
    localShell: backend.local_shell,
    encoding: backend.encoding,
    showSidebar: backend.show_sidebar,
    sidebarWidth: backend.sidebar_width,
    confirmOnClose: backend.confirm_on_close,
    copyOnSelect: backend.copy_on_select,
    rightClickBehavior: backend.right_click_behavior as AppSettings['rightClickBehavior'],
    bellSound: backend.bell_sound,
    bellStyle: backend.bell_style as AppSettings['bellStyle'],
  };
}

/** Convert frontend settings to backend format */
function toBackendSettings(frontend: AppSettings): BackendAppSettings {
  return {
    theme: frontend.theme,
    terminal_font_family: frontend.terminalFontFamily,
    terminal_font_size: frontend.terminalFontSize,
    terminal_line_height: frontend.terminalLineHeight,
    cursor_style: frontend.cursorStyle,
    cursor_blink: frontend.cursorBlink,
    scrollback_limit: frontend.scrollbackLimit,
    local_shell: frontend.localShell,
    encoding: frontend.encoding,
    show_sidebar: frontend.showSidebar,
    sidebar_width: frontend.sidebarWidth,
    confirm_on_close: frontend.confirmOnClose,
    copy_on_select: frontend.copyOnSelect,
    right_click_behavior: frontend.rightClickBehavior,
    bell_sound: frontend.bellSound,
    bell_style: frontend.bellStyle,
  };
}

/** Convert backend window state to frontend format */
function toFrontendWindowState(backend: BackendWindowState): WindowState {
  return {
    x: backend.x,
    y: backend.y,
    width: backend.width,
    height: backend.height,
    isMaximized: backend.is_maximized,
  };
}

/** Convert frontend window state to backend format */
function toBackendWindowState(frontend: WindowState): BackendWindowState {
  return {
    x: frontend.x,
    y: frontend.y,
    width: frontend.width,
    height: frontend.height,
    is_maximized: frontend.isMaximized,
  };
}

/** Get application settings */
export async function getSettings(): Promise<AppSettings> {
  const backend = await invokeCommand<BackendAppSettings>('get_settings');
  return toFrontendSettings(backend);
}

/** Save application settings */
export async function saveSettings(settings: AppSettings): Promise<void> {
  const backend = toBackendSettings(settings);
  return invokeCommand<void>('save_settings', { settings: backend });
}

/** Reset settings to defaults */
export async function resetSettings(): Promise<AppSettings> {
  const backend = await invokeCommand<BackendAppSettings>('reset_settings');
  return toFrontendSettings(backend);
}

/** Get window state */
export async function getWindowState(): Promise<WindowState> {
  const backend = await invokeCommand<BackendWindowState>('get_window_state');
  return toFrontendWindowState(backend);
}

/** Save window state */
export async function saveWindowState(state: WindowState): Promise<void> {
  const backend = toBackendWindowState(state);
  return invokeCommand<void>('save_window_state', { state: backend });
}

/** Get app version */
export async function getAppVersion(): Promise<string> {
  return invokeCommand<string>('get_app_version');
}

/** Get platform info */
export async function getPlatformInfo(): Promise<{
  platform: string;
  arch: string;
  osType: string;
  hostname: string;
}> {
  return invokeCommand('get_platform_info');
}
