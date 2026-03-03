/**
 * Settings store - Manages application settings
 */
import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type { AppSettings, Theme } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { getSettings, saveSettings as saveSettingsService, resetSettings as resetSettingsService } from '@/services/config.service';

export const useSettingsStore = defineStore('settings', () => {
  // State
  const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS });
  const isLoaded = ref(false);

  // Getters
  const theme = computed(() => settings.value.theme);
  const terminalFontFamily = computed(() => settings.value.terminalFontFamily);
  const terminalFontSize = computed(() => settings.value.terminalFontSize);
  const showSidebar = computed(() => settings.value.showSidebar);
  const sidebarWidth = computed(() => settings.value.sidebarWidth);
  const encoding = computed(() => settings.value.encoding);
  const localShell = computed(() => settings.value.localShell);

  // Computed effective theme (resolves 'system')
  const effectiveTheme = computed((): 'light' | 'dark' => {
    if (settings.value.theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return settings.value.theme;
  });

  // Actions
  function updateSettings(updates: Partial<AppSettings>): void {
    Object.assign(settings.value, updates);
  }

  function setTheme(newTheme: Theme): void {
    settings.value.theme = newTheme;
    applyTheme();
  }

  function toggleSidebar(): void {
    settings.value.showSidebar = !settings.value.showSidebar;
  }

  function setShowSidebar(value: boolean): void {
    settings.value.showSidebar = value;
  }

  function setSidebarWidth(width: number): void {
    settings.value.sidebarWidth = Math.max(240, Math.min(600, width));
  }

  async function resetSettings(): Promise<void> {
    try {
      const defaultSettings = await resetSettingsService();
      settings.value = defaultSettings;
      applyTheme();
    } catch {
      Object.assign(settings.value, DEFAULT_SETTINGS);
      applyTheme();
    }
  }

  function applyTheme(): void {
    const themeValue = effectiveTheme.value;
    document.documentElement.setAttribute('data-theme', themeValue);
  }

  // Watch for system theme changes when using 'system' setting
  function setupSystemThemeListener(): void {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      if (settings.value.theme === 'system') {
        applyTheme();
      }
    });
  }

  // Load settings from backend
  async function loadSettings(): Promise<void> {
    try {
      const saved = await getSettings();
      if (saved) {
        settings.value = { ...DEFAULT_SETTINGS, ...saved };
      }
      isLoaded.value = true;
      applyTheme();
      setupSystemThemeListener();
    } catch {
      isLoaded.value = true;
      applyTheme();
      setupSystemThemeListener();
    }
  }

  // Save settings to backend
  async function saveSettings(): Promise<void> {
    try {
      await saveSettingsService(settings.value);
    } catch {
      // Ignore save errors
    }
  }

  // Auto-save on settings change (debounced)
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  watch(settings, () => {
    if (isLoaded.value) {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      saveTimeout = setTimeout(() => {
        saveSettings();
      }, 500);
    }
  }, { deep: true });

  return {
    // State
    settings,
    isLoaded,
    // Getters
    theme,
    effectiveTheme,
    terminalFontFamily,
    terminalFontSize,
    showSidebar,
    sidebarWidth,
    encoding,
    localShell,
    // Actions
    updateSettings,
    setTheme,
    toggleSidebar,
    setShowSidebar,
    setSidebarWidth,
    resetSettings,
    applyTheme,
    loadSettings,
    saveSettings,
  };
});
