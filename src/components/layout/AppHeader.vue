<script setup lang="ts">
/**
 * AppHeader - Application header with window controls
 * Supports custom title bar mode with minimize, maximize, close buttons
 */
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { getCurrentWindow } from '@tauri-apps/api/window';
import AppIcon from '@/components/common/AppIcon.vue';
import { useTheme } from '@/composables';

const { t } = useI18n();

withDefaults(defineProps<{
  title?: string;
  showWindowControls?: boolean;
}>(), {
  title: 'Easy Terminal',
  showWindowControls: true,
});

const emit = defineEmits<{
  (e: 'menu-click', event: MouseEvent): void;
  (e: 'theme-click'): void;
}>();

const { isDark, toggleTheme } = useTheme();

// Window state
const isMaximized = ref(false);

// Get current window
const appWindow = getCurrentWindow();

// Check initial maximized state
async function checkMaximized() {
  try {
    isMaximized.value = await appWindow.isMaximized();
  } catch {
    isMaximized.value = false;
  }
}

// Initialize
checkMaximized();

// Listen for window resize to update maximize state
appWindow.onResized(async () => {
  await checkMaximized();
});

// Window control handlers
async function handleMinimize() {
  try {
    await appWindow.minimize();
  } catch {
    // Ignore
  }
}

async function handleMaximize() {
  try {
    await appWindow.toggleMaximize();
    isMaximized.value = await appWindow.isMaximized();
  } catch {
    // Ignore
  }
}

async function handleClose() {
  try {
    await appWindow.close();
  } catch {
    // Ignore
  }
}

function handleThemeClick() {
  toggleTheme();
  emit('theme-click');
}

function handleMenuClick(event: MouseEvent) {
  event.stopPropagation();
  emit('menu-click', event);
}
</script>

<template>
  <header class="app-header drag-region">
    <!-- Left section: Menu + Title -->
    <div class="header-left no-drag-region">
      <button
        class="header-btn menu-btn"
        @click="handleMenuClick"
        :title="t('app.menu')"
      >
        <AppIcon name="menu" :size="16" />
      </button>
      <div class="header-logo">
        <AppIcon name="terminal" :size="18" color="var(--color-primary)" />
      </div>
      <span class="header-title">{{ title }}</span>
    </div>

    <!-- Center section (optional) -->
    <div class="header-center">
      <!-- Can be used for tabs or search in future -->
    </div>

    <!-- Right section: Theme toggle + Window controls -->
    <div class="header-right no-drag-region">
      <!-- Theme toggle -->
      <button
        class="header-btn theme-btn"
        @click="handleThemeClick"
        :title="isDark ? t('header.switchToLight') : t('header.switchToDark')"
      >
        <AppIcon :name="isDark ? 'sun' : 'moon'" :size="16" />
      </button>

      <!-- Window controls -->
      <template v-if="showWindowControls">
        <button
          class="window-btn minimize-btn"
          @click="handleMinimize"
          :title="t('header.minimize')"
        >
          <AppIcon name="minimize" :size="12" />
        </button>
        <button
          class="window-btn maximize-btn"
          @click="handleMaximize"
          :title="isMaximized ? t('header.restore') : t('header.maximize')"
        >
          <AppIcon :name="isMaximized ? 'restore' : 'maximize'" :size="12" />
        </button>
        <button
          class="window-btn close-btn"
          @click="handleClose"
          :title="t('header.close')"
        >
          <AppIcon name="close" :size="12" />
        </button>
      </template>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--header-height);
  padding: 0 4px;
  background-color: var(--color-card);
  border-bottom: 1px solid var(--color-border);
  user-select: none;
  -webkit-app-region: drag;
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 4px;
  -webkit-app-region: no-drag;
}

.header-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
}

.header-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-1);
  margin-left: 2px;
}

.header-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-2);
  cursor: pointer;
  border-radius: var(--border-radius);
  transition: background-color var(--transition-duration-fast) ease;
}

.header-btn:hover {
  background-color: var(--color-hover);
  color: var(--color-text-1);
}

.header-btn:active {
  background-color: var(--color-pressed);
}

/* Window control buttons */
.window-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: var(--header-height);
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-2);
  cursor: pointer;
  transition: background-color var(--transition-duration-fast) ease;
}

.window-btn:hover {
  background-color: var(--color-hover);
  color: var(--color-text-1);
}

.window-btn:active {
  background-color: var(--color-pressed);
}

.close-btn:hover {
  background-color: var(--color-close);
  color: #fff;
}

.close-btn:active {
  background-color: var(--color-close-pressed);
  color: #fff;
}

/* Drag region utilities */
.drag-region {
  -webkit-app-region: drag;
}

.no-drag-region {
  -webkit-app-region: no-drag;
}
</style>
