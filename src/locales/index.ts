/**
 * i18n configuration
 */
import { createI18n } from 'vue-i18n';
import zhCN from './zh-CN';
import enUS from './en-US';

// Get saved language or system language
function getDefaultLanguage(): string {
  // Try to get from localStorage
  const saved = localStorage.getItem('language');
  if (saved && ['zh-CN', 'en-US'].includes(saved)) {
    return saved;
  }

  // Detect system language
  const browserLang = navigator.language;
  if (browserLang.startsWith('zh')) {
    return 'zh-CN';
  }
  return 'en-US';
}

// Create i18n instance
const i18n = createI18n({
  legacy: false,
  locale: getDefaultLanguage(),
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
});

export default i18n;

// Export helper functions
export function setLanguage(lang: string): void {
  i18n.global.locale.value = lang as any;
  localStorage.setItem('language', lang);
  document.documentElement.setAttribute('lang', lang);
}

export function getCurrentLanguage(): string {
  return i18n.global.locale.value as string;
}

export function getAvailableLanguages(): { value: string; label: string }[] {
  return [
    { value: 'zh-CN', label: '中文' },
    { value: 'en-US', label: 'English' },
  ];
}
