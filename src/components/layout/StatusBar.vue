<script setup lang="ts">
/**
 * StatusBar - Application status bar
 * Shows connection status, encoding, terminal size, etc.
 */
import { computed } from 'vue';
import { useSettingsStore, useTerminalStore } from '@/stores';

withDefaults(defineProps<{
  version?: string;
  showConnectionStatus?: boolean;
  showTerminalSize?: boolean;
}>(), {
  version: '0.1.0',
  showConnectionStatus: true,
  showTerminalSize: true,
});

const settingsStore = useSettingsStore();
const terminalStore = useTerminalStore();

// Computed values
const encoding = computed(() => settingsStore.encoding.toUpperCase());
const shell = computed(() => {
  const shellPath = settingsStore.localShell;
  if (!shellPath) {
    // Unified default shell display across platforms
    return 'Terminal';
  }
  // Extract shell name from path
  const parts = shellPath.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1].replace('.exe', '');
});

const activeSession = computed(() => {
  const activeId = terminalStore.activeSessionId;
  if (!activeId) return null;
  return terminalStore.sessions.get(activeId);
});

const connectionStatus = computed(() => {
  if (!activeSession.value) return 'disconnected';
  return activeSession.value.connectionType === 'local' ? 'local' : 'connected';
});

const terminalSize = computed(() => {
  if (!activeSession.value) return null;
  const { cols, rows } = activeSession.value;
  if (cols && rows) {
    return `${cols}×${rows}`;
  }
  return null;
});

const connectionText = computed(() => {
  switch (connectionStatus.value) {
    case 'local':
      return 'Local';
    case 'connected':
      return 'Connected';
    case 'disconnected':
    default:
      return 'Disconnected';
  }
});

const connectionColor = computed(() => {
  switch (connectionStatus.value) {
    case 'local':
      return 'var(--color-success)';
    case 'connected':
      return 'var(--color-primary)';
    case 'disconnected':
    default:
      return 'var(--color-text-3)';
  }
});
</script>

<template>
  <footer class="status-bar">
    <!-- Left section -->
    <div class="status-left">
      <span class="status-item version">
        Easy Terminal v{{ version }}
      </span>
    </div>

    <!-- Center section -->
    <div class="status-center">
      <!-- Shell type -->
      <span class="status-item shell">
        {{ shell }}
      </span>

      <!-- Terminal size -->
      <span
        v-if="showTerminalSize && terminalSize"
        class="status-item size"
      >
        {{ terminalSize }}
      </span>
    </div>

    <!-- Right section -->
    <div class="status-right">
      <!-- Encoding -->
      <span class="status-item encoding">
        {{ encoding }}
      </span>

      <!-- Connection status -->
      <span
        v-if="showConnectionStatus"
        class="status-item connection"
        :style="{ color: connectionColor }"
      >
        <span class="connection-dot" :style="{ backgroundColor: connectionColor }" />
        {{ connectionText }}
      </span>
    </div>
  </footer>
</template>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--status-bar-height);
  padding: 0 12px;
  background-color: var(--color-card);
  border-top: 1px solid var(--color-border);
  font-size: 12px;
  color: var(--color-text-3);
  user-select: none;
}

.status-left,
.status-center,
.status-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-center {
  flex: 1;
  justify-content: center;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-item.version {
  color: var(--color-text-3);
}

.status-item.shell {
  color: var(--color-text-2);
  font-family: var(--font-family-mono);
}

.status-item.size {
  color: var(--color-text-3);
  font-family: var(--font-family-mono);
}

.status-item.encoding {
  color: var(--color-text-3);
  font-family: var(--font-family-mono);
}

.status-item.connection {
  display: flex;
  align-items: center;
  gap: 6px;
}

.connection-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
</style>
