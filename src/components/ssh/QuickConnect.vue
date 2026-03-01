<script setup lang="ts">
/**
 * QuickConnect - Quick SSH connection bar
 * Allows quick connection to recent/favorite servers
 */
import { ref, computed, onMounted } from 'vue';
import { getSshConfigs, connectSsh } from '@/services/ssh.service';
import type { SshConnectionConfig } from '@/types';

const emit = defineEmits<{
  (e: 'connect', sessionId: string, config: SshConnectionConfig): void;
  (e: 'error', error: string): void;
  (e: 'open-manager'): void;
}>();

// State
const connections = ref<SshConnectionConfig[]>([]);
const searchQuery = ref('');
const showDropdown = ref(false);
const connecting = ref<string | null>(null);

// Computed
const recentConnections = computed(() => {
  return [...connections.value]
    .filter(c => !c.isFavorite)
    .sort((a, b) => (b.lastConnectedAt || 0) - (a.lastConnectedAt || 0))
    .slice(0, 5);
});

const favoriteConnections = computed(() => {
  return connections.value.filter(c => c.isFavorite);
});

const filteredConnections = computed(() => {
  if (!searchQuery.value) {
    return [...favoriteConnections.value, ...recentConnections.value];
  }
  const query = searchQuery.value.toLowerCase();
  return connections.value.filter(c =>
    c.name.toLowerCase().includes(query) ||
    c.host.toLowerCase().includes(query) ||
    c.username.toLowerCase().includes(query)
  );
});

// Methods
async function loadConnections() {
  try {
    connections.value = await getSshConfigs();
  } catch (e) {
    console.error('Failed to load SSH connections:', e);
  }
}

async function handleConnect(config: SshConnectionConfig) {
  connecting.value = config.id;
  showDropdown.value = false;
  searchQuery.value = '';

  try {
    const sessionId = await connectSsh(config.id);
    emit('connect', sessionId, config);
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Connection failed';
    emit('error', error);
  } finally {
    connecting.value = null;
  }
}

function handleOpenManager() {
  showDropdown.value = false;
  emit('open-manager');
}

function handleFocus() {
  showDropdown.value = true;
  if (connections.value.length === 0) {
    loadConnections();
  }
}

function handleBlur(event: FocusEvent) {
  // Delay to allow click events on dropdown items
  setTimeout(() => {
    const target = event.relatedTarget as HTMLElement;
    if (!target?.closest('.quick-connect')) {
      showDropdown.value = false;
    }
  }, 150);
}

// Lifecycle
onMounted(() => {
  loadConnections();
});

// Expose
defineExpose({
  refresh: loadConnections,
});
</script>

<template>
  <div class="quick-connect" @keydown.escape="showDropdown = false">
    <div class="input-wrapper">
      <svg viewBox="0 0 24 24" width="16" height="16" class="search-icon">
        <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Quick connect..."
        @focus="handleFocus"
        @blur="handleBlur"
      />
    </div>

    <!-- Dropdown -->
    <div v-if="showDropdown && filteredConnections.length > 0" class="dropdown">
      <div class="dropdown-header">
        <span>Quick Connect</span>
        <button type="button" class="manager-btn" @click="handleOpenManager">
          Manage
        </button>
      </div>

      <div class="dropdown-list">
        <button
          v-for="config in filteredConnections"
          :key="config.id"
          type="button"
          class="dropdown-item"
          :class="{ connecting: connecting === config.id }"
          :disabled="connecting !== null"
          @click="handleConnect(config)"
        >
          <div class="item-icon">
            <svg v-if="config.isFavorite" viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M20 19V7H4v12h16m0-16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16M7.5 13l2.5 3 2.5-3-2.5-3-2.5 3m5 0l2.5 3 2.5-3-2.5-3-2.5 3z"/>
            </svg>
          </div>
          <div class="item-info">
            <span class="item-name">{{ config.name }}</span>
            <span class="item-host">{{ config.username }}@{{ config.host }}:{{ config.port }}</span>
          </div>
          <svg v-if="connecting === config.id" class="spinner" viewBox="0 0 24 24" width="14" height="14">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="31.4" stroke-dashoffset="10"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Empty dropdown -->
    <div v-else-if="showDropdown" class="dropdown empty">
      <div class="empty-content">
        <p>No connections found</p>
        <button type="button" class="add-btn" @click="handleOpenManager">
          Add Connection
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quick-connect {
  position: relative;
}

.input-wrapper {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  background-color: var(--color-input-bg, #2d2d2d);
  border: 1px solid var(--color-border, #3c3c3c);
  border-radius: 4px;
  transition: border-color 0.15s ease;
}

.input-wrapper:focus-within {
  border-color: var(--color-primary, #007acc);
}

.search-icon {
  flex-shrink: 0;
  margin-right: 8px;
  color: var(--color-text-4, #666666);
}

.input-wrapper input {
  flex: 1;
  min-width: 0;
  padding: 0;
  font-size: 13px;
  color: var(--color-text-1, #ffffff);
  background: transparent;
  border: none;
  outline: none;
}

.input-wrapper input::placeholder {
  color: var(--color-text-4, #666666);
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background-color: var(--color-surface, #2d2d2d);
  border: 1px solid var(--color-border, #3c3c3c);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  z-index: 100;
  overflow: hidden;
}

.dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border, #3c3c3c);
}

.dropdown-header span {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-3, #8c8c8c);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.manager-btn {
  padding: 4px 8px;
  font-size: 11px;
  color: var(--color-primary, #007acc);
  background: transparent;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.manager-btn:hover {
  background-color: rgba(0, 122, 204, 0.1);
}

.dropdown-list {
  max-height: 300px;
  overflow-y: auto;
}

.dropdown-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 8px 12px;
  text-align: left;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.dropdown-item:hover:not(:disabled) {
  background-color: var(--color-hover, #2a2a2a);
}

.dropdown-item:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.dropdown-item.connecting {
  cursor: wait;
}

.item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-right: 10px;
  color: var(--color-text-3, #8c8c8c);
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  display: block;
  font-size: 13px;
  color: var(--color-text-1, #ffffff);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-host {
  display: block;
  font-size: 11px;
  color: var(--color-text-4, #666666);
}

.spinner {
  animation: spin 1s linear infinite;
  color: var(--color-primary, #007acc);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.dropdown.empty {
  padding: 20px;
}

.empty-content {
  text-align: center;
}

.empty-content p {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--color-text-3, #8c8c8c);
}

.add-btn {
  padding: 8px 16px;
  font-size: 13px;
  color: #ffffff;
  background-color: var(--color-primary, #007acc);
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.add-btn:hover {
  background-color: var(--color-primary-hover, #0098ff);
}
</style>
