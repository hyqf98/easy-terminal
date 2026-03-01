/**
 * Settings composable
 */
import { computed } from 'vue';
import { useSettingsStore } from '@/stores';
import type { AppSettings, Theme } from '@/types';

export function useSettings() {
  const store = useSettingsStore();

  return {
    // State
    settings: computed(() => store.settings),
    isLoaded: computed(() => store.isLoaded),

    // Theme
    theme: computed(() => store.theme),
    effectiveTheme: computed(() => store.effectiveTheme),
    setTheme: (theme: Theme) => store.setTheme(theme),

    // Terminal settings
    terminalFontFamily: computed(() => store.terminalFontFamily),
    terminalFontSize: computed(() => store.terminalFontSize),

    // Sidebar
    showSidebar: computed(() => store.showSidebar),
    sidebarWidth: computed(() => store.sidebarWidth),
    toggleSidebar: () => store.toggleSidebar(),
    setSidebarWidth: (width: number) => store.setSidebarWidth(width),

    // Actions
    updateSettings: (updates: Partial<AppSettings>) => store.updateSettings(updates),
    resetSettings: () => store.resetSettings(),
    loadSettings: () => store.loadSettings(),
    saveSettings: () => store.saveSettings(),
  };
}
