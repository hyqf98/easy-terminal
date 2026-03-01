/**
 * Theme composable - Handles theme switching logic
 * Integrates with Naive UI theme system
 */
import { computed, onMounted, onUnmounted } from 'vue';
import {
  darkTheme,
  type GlobalTheme,
  type GlobalThemeOverrides,
} from 'naive-ui';
import { useSettingsStore } from '@/stores';

// Naive UI theme colors matching our CSS variables
const lightThemeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#18a058',
    primaryColorHover: '#36ad6a',
    primaryColorPressed: '#0c7a43',
    primaryColorSuppl: '#36ad6a',
    infoColor: '#2080f0',
    infoColorHover: '#4098fc',
    infoColorPressed: '#1060c9',
    successColor: '#18a058',
    successColorHover: '#36ad6a',
    successColorPressed: '#0c7a43',
    warningColor: '#f0a020',
    warningColorHover: '#fcb040',
    warningColorPressed: '#c97c10',
    errorColor: '#d03050',
    errorColorHover: '#de576d',
    errorColorPressed: '#ab1f3f',
    borderRadius: '3px',
    borderRadiusSmall: '2px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontFamilyMono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
  },
  Card: {
    color: '#fff',
    borderColor: '#e0e0e6',
    titleTextColor: '#1f2225',
    textColor: '#333639',
  },
  Button: {
    textColor: '#1f2225',
  },
  Input: {
    color: '#fff',
    borderColor: '#e0e0e6',
    textColor: '#1f2225',
  },
};

const darkThemeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#63e2b7',
    primaryColorHover: '#7ce7c2',
    primaryColorPressed: '#5acea8',
    primaryColorSuppl: '#5acea8',
    infoColor: '#70c0e8',
    infoColorHover: '#8acbec',
    infoColorPressed: '#66afd3',
    successColor: '#63e2b7',
    successColorHover: '#7ce7c2',
    successColorPressed: '#5acea8',
    warningColor: '#f2c97d',
    warningColorHover: '#f5d599',
    warningColorPressed: '#e6c260',
    errorColor: '#e88080',
    errorColorHover: '#e98b8b',
    errorColorPressed: '#e57373',
    borderRadius: '3px',
    borderRadiusSmall: '2px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontFamilyMono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
    bodyColor: '#101014',
    cardColor: '#18181c',
    modalColor: '#1e1e22',
    popoverColor: '#1e1e22',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    inputColor: 'rgba(0, 0, 0, 0.2)',
    textColorBase: '#fff',
    textColor1: '#e5e5e7',
    textColor2: '#c2c4c7',
    textColor3: '#898c91',
    textColorDisabled: 'rgba(255, 255, 255, 0.38)',
    placeholderColor: 'rgba(255, 255, 255, 0.38)',
    hoverColor: 'rgba(255, 255, 255, 0.09)',
    pressedColor: 'rgba(255, 255, 255, 0.13)',
  },
  Card: {
    color: '#18181c',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    titleTextColor: '#e5e5e7',
    textColor: '#c2c4c7',
  },
  Button: {
    textColor: '#e5e5e7',
  },
  Input: {
    color: 'rgba(0, 0, 0, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    textColor: '#e5e5e7',
  },
  Menu: {
    color: '#18181c',
    itemTextColor: '#c2c4c7',
    itemTextColorHover: '#e5e5e7',
    itemTextColorActive: '#63e2b7',
    itemColorActive: 'rgba(255, 255, 255, 0.09)',
  },
  Tree: {
    nodeTextColor: '#c2c4c7',
    nodeTextColorHover: '#e5e5e7',
  },
};

export function useTheme() {
  const settingsStore = useSettingsStore();

  const theme = computed(() => settingsStore.theme);
  const effectiveTheme = computed(() => settingsStore.effectiveTheme);
  const isDark = computed(() => effectiveTheme.value === 'dark');

  // Naive UI theme object
  const naiveTheme = computed<GlobalTheme | null>(() => {
    return isDark.value ? darkTheme : null;
  });

  // Naive UI theme overrides
  const naiveThemeOverrides = computed<GlobalThemeOverrides>(() => {
    return isDark.value ? darkThemeOverrides : lightThemeOverrides;
  });

  function setTheme(newTheme: 'light' | 'dark' | 'system'): void {
    settingsStore.setTheme(newTheme);
  }

  function toggleTheme(): void {
    if (settingsStore.theme === 'system') {
      // If system, toggle to opposite of current effective theme
      setTheme(isDark.value ? 'light' : 'dark');
    } else if (settingsStore.theme === 'light') {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  }

  // Listen for system theme changes
  let mediaQuery: MediaQueryList | null = null;

  function handleSystemThemeChange(): void {
    settingsStore.applyTheme();
  }

  onMounted(() => {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleSystemThemeChange);
  });

  onUnmounted(() => {
    if (mediaQuery) {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }
  });

  return {
    theme,
    effectiveTheme,
    isDark,
    naiveTheme,
    naiveThemeOverrides,
    setTheme,
    toggleTheme,
  };
}
