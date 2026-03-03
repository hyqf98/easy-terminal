<script setup lang="ts">
/**
 * Easy Terminal - Main Application Component
 */
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSettingsStore, useTerminalStore, useConnectionsStore } from '@/stores';
import { useShortcuts, useKeyboardHandler, DEFAULT_SHORTCUTS } from '@/composables';
import { AppHeader, AppSidebar, MainContent, StatusBar, AppMenu } from '@/components/layout';
import { NDialogProvider, NNotificationProvider, NMessageProvider } from 'naive-ui';
import { FileExplorer } from '@/components/fileExplorer';
import { SshManager } from '@/components/ssh';
import { SettingsPanel } from '@/components/settings';
import type { FileItem, SshConnectionConfig } from '@/types';

const { t } = useI18n();
const settingsStore = useSettingsStore();
const terminalStore = useTerminalStore();
const connectionsStore = useConnectionsStore();

// File editor state
const editorFile = ref<FileItem | null>(null);

// SSH manager state
const showSshManager = ref(false);

// Settings panel state
const showSettings = ref(false);

// App menu state
const showAppMenu = ref(false);
const appMenuPosition = ref({ x: 0, y: 0 });

// Command palette state
const showCommandPalette = ref(false);

// Sidebar visibility (synced with store)
const sidebarVisible = computed({
  get: () => settingsStore.showSidebar,
  set: (value) => settingsStore.setShowSidebar(value),
});

// Initialize shortcuts manager
const { registerShortcut, unregisterShortcut } = useShortcuts();

// Set up global keyboard handler
useKeyboardHandler();

// Register global shortcuts
onMounted(async () => {
  await settingsStore.loadSettings();

  // Toggle sidebar shortcut
  const toggleSidebarDef = DEFAULT_SHORTCUTS.find(s => s.id === 'other.toggleSidebar')!;
  registerShortcut(toggleSidebarDef, () => {
    sidebarVisible.value = !sidebarVisible.value;
  });

  // Command palette shortcut
  const commandPaletteDef = DEFAULT_SHORTCUTS.find(s => s.id === 'other.commandPalette')!;
  registerShortcut(commandPaletteDef, () => {
    showCommandPalette.value = !showCommandPalette.value;
  });

  // Settings shortcut
  const settingsDef = DEFAULT_SHORTCUTS.find(s => s.id === 'other.settings')!;
  registerShortcut(settingsDef, () => {
    showSettings.value = true;
  });
});

// Unregister shortcuts on unmount
onUnmounted(() => {
  unregisterShortcut('other.toggleSidebar');
  unregisterShortcut('other.commandPalette');
  unregisterShortcut('other.settings');
});

// Methods
function handleMenuClick(event: MouseEvent) {
  event.stopPropagation();
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  appMenuPosition.value = { x: rect.left, y: rect.bottom + 4 };
  showAppMenu.value = true;
}

function handleAppMenuHide() {
  showAppMenu.value = false;
}

function handleAppMenuNewTerminal() {
  terminalStore.createSession();
}

function handleAppMenuToggleSidebar() {
  sidebarVisible.value = !sidebarVisible.value;
}

function handleThemeClick() {
  // Theme toggle handled inside AppHeader
}

function handleNewTab() {
  // Handled by TerminalContainer
}

function handleTabClick(id: string) {
  terminalStore.setActiveSession(id);
}

function handleTabClose(id: string) {
  terminalStore.closeSession(id);
}

// File explorer events
function handleFileOpen(file: FileItem) {
  editorFile.value = file;
}

function handleTerminalCd(path: string) {
  // Change directory in active terminal
  const activeSession = terminalStore.activeSession;
  if (activeSession) {
    // Send cd command to terminal
  }
}

// Quick actions
function handleQuickAction(action: string) {
  switch (action) {
    case 'ssh':
      showSshManager.value = true;
      break;
    case 'settings':
      showSettings.value = true;
      break;
  }
}

// SSH events
function handleSshConnect(sshSessionId: string, config: SshConnectionConfig) {
  connectionsStore.setConnectionStatus(config.id, 'connected');

  // Create a terminal session for this SSH connection
  terminalStore.addSshSession(
    sshSessionId,
    config.id,
    config.name || `${config.username}@${config.host}`,
    config.cwd
  );
}

function handleSshManagerClose() {
  showSshManager.value = false;
}
</script>

<template>
  <n-dialog-provider>
    <n-notification-provider>
      <n-message-provider>
        <div class="app" :data-theme="settingsStore.effectiveTheme">
    <!-- Header -->
    <AppHeader
      :title="t('app.title')"
      :show-window-controls="true"
      @menu-click="handleMenuClick"
      @theme-click="handleThemeClick"
    />

    <!-- Main content area -->
    <main class="app-main">
      <!-- Sidebar (collapsible) -->
      <AppSidebar
        v-if="settingsStore.showSidebar"
        :collapsible="true"
        :show-quick-actions="true"
        @resize="settingsStore.setSidebarWidth"
        @quick-action="handleQuickAction"
      >
        <!-- File Explorer -->
        <FileExplorer
          @file-open="handleFileOpen"
          @terminal-cd="handleTerminalCd"
        />
      </AppSidebar>

      <!-- Main content (tabs + terminal) -->
      <MainContent
        :show-tabs="true"
        @new-tab="handleNewTab"
        @tab-click="handleTabClick"
        @tab-close="handleTabClose"
      />
    </main>

    <!-- Status bar -->
    <StatusBar
      :version="'0.1.0'"
      :show-connection-status="true"
      :show-terminal-size="true"
    />

    <!-- SSH Manager Modal -->
    <SshManager
      v-if="showSshManager"
      @connect="handleSshConnect"
      @close="handleSshManagerClose"
    />

    <!-- Settings Panel -->
    <SettingsPanel v-model:show="showSettings" />

    <!-- App Menu -->
    <AppMenu
      :visible="showAppMenu"
      :x="appMenuPosition.x"
      :y="appMenuPosition.y"
      @hide="handleAppMenuHide"
      @new-terminal="handleAppMenuNewTerminal"
      @open-settings="showSettings = true"
      @open-ssh="showSshManager = true"
      @toggle-sidebar="handleAppMenuToggleSidebar"
    />
        </div>
      </n-message-provider>
    </n-notification-provider>
  </n-dialog-provider>
</template>

<style>
/* Theme transition */
.app {
  transition: background-color var(--transition-duration) ease,
              color var(--transition-duration) ease;
}

/* App layout styles */
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: var(--color-body);
  color: var(--color-text-1);
}

.app-main {
  display: flex;
  flex: 1;
  overflow: hidden;
}
</style>
