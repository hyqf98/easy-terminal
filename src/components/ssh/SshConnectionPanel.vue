<script setup lang="ts">
/**
 * SshConnectionPanel - SSH connection management panel
 * Displays list of saved SSH connections and allows management
 */
import { ref, computed, onMounted } from 'vue';
import { useConnectionsStore } from '@/stores';
import { getSshConfigs, deleteSshConfig } from '@/services/ssh.service';
import type { SshConnectionConfig } from '@/types';

const emit = defineEmits<{
  (e: 'connect', config: SshConnectionConfig): void;
  (e: 'edit', config: SshConnectionConfig): void;
  (e: 'new'): void;
}>();

const connectionsStore = useConnectionsStore();

// State
const connections = ref<SshConnectionConfig[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const selectedId = ref<string | null>(null);
const showDeleteConfirm = ref<string | null>(null);

// Computed
const sortedConnections = computed(() => {
  return [...connections.value].sort((a, b) => {
    // Favorites first
    if (a.isFavorite !== b.isFavorite) {
      return a.isFavorite ? -1 : 1;
    }
    // Then by last connected
    const aTime = a.lastConnectedAt || 0;
    const bTime = b.lastConnectedAt || 0;
    return bTime - aTime;
  });
});

const favoriteConnections = computed(() => {
  return sortedConnections.value.filter(c => c.isFavorite);
});

const recentConnections = computed(() => {
  return sortedConnections.value.filter(c => !c.isFavorite);
});

// Methods
async function loadConnections() {
  loading.value = true;
  error.value = null;

  try {
    connections.value = await getSshConfigs();
    // Sync with connections store
    connectionsStore.clearConnections();
    connections.value.forEach(config => {
      connectionsStore.addConnection(config);
    });
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load connections';
    console.error('Failed to load SSH connections:', e);
  } finally {
    loading.value = false;
  }
}

function handleConnect(config: SshConnectionConfig) {
  emit('connect', config);
}

function handleEdit(config: SshConnectionConfig) {
  emit('edit', config);
}

function handleNew() {
  emit('new');
}

async function handleDelete(id: string) {
  try {
    await deleteSshConfig(id);
    connections.value = connections.value.filter(c => c.id !== id);
    connectionsStore.removeConnection(id);
    showDeleteConfirm.value = null;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete connection';
    console.error('Failed to delete SSH config:', e);
  }
}

function toggleFavorite(config: SshConnectionConfig) {
  // This would need to be implemented with saveSshConfig
  console.log('Toggle favorite:', config.id);
}

function formatDate(timestamp: number | undefined): string {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
}

// Lifecycle
onMounted(() => {
  loadConnections();
});

// Expose for parent
defineExpose({
  refresh: loadConnections,
});
</script>

<template>
  <div class="ssh-panel">
    <!-- Header -->
    <div class="panel-header">
      <h3>SSH Connections</h3>
      <button class="new-btn" type="button" @click="handleNew" title="New Connection">
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>Loading connections...</span>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="error-state">
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      <span>{{ error }}</span>
      <button type="button" @click="loadConnections">Retry</button>
    </div>

    <!-- Connection list -->
    <div v-else class="connection-list">
      <!-- Favorites section -->
      <div v-if="favoriteConnections.length > 0" class="section">
        <div class="section-header">
          <svg viewBox="0 0 24 24" width="14" height="14">
            <path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
          </svg>
          <span>Favorites</span>
        </div>
        <div
          v-for="config in favoriteConnections"
          :key="config.id"
          class="connection-item"
          :class="{ selected: selectedId === config.id }"
          @click="selectedId = config.id"
          @dblclick="handleConnect(config)"
        >
          <div class="connection-icon">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M20 19V7H4v12h16m0-16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16M7.5 13l2.5 3 2.5-3-2.5-3-2.5 3m5 0l2.5 3 2.5-3-2.5-3-2.5 3z"/>
            </svg>
          </div>
          <div class="connection-info">
            <span class="connection-name">{{ config.name }}</span>
            <span class="connection-host">{{ config.username }}@{{ config.host }}:{{ config.port }}</span>
          </div>
          <div class="connection-actions">
            <button class="action-btn" type="button" @click.stop="handleConnect(config)" title="Connect">
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path fill="currentColor" d="M8 5v14l11-7z"/>
              </svg>
            </button>
            <button class="action-btn" type="button" @click.stop="handleEdit(config)" title="Edit">
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </button>
            <button class="action-btn delete" type="button" @click.stop="showDeleteConfirm = config.id" title="Delete">
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Recent connections section -->
      <div v-if="recentConnections.length > 0" class="section">
        <div class="section-header">
          <svg viewBox="0 0 24 24" width="14" height="14">
            <path fill="currentColor" d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
          </svg>
          <span>Recent</span>
        </div>
        <div
          v-for="config in recentConnections"
          :key="config.id"
          class="connection-item"
          :class="{ selected: selectedId === config.id }"
          @click="selectedId = config.id"
          @dblclick="handleConnect(config)"
        >
          <div class="connection-icon">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M20 19V7H4v12h16m0-16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16M7.5 13l2.5 3 2.5-3-2.5-3-2.5 3m5 0l2.5 3 2.5-3-2.5-3-2.5 3z"/>
            </svg>
          </div>
          <div class="connection-info">
            <span class="connection-name">{{ config.name }}</span>
            <span class="connection-host">{{ config.username }}@{{ config.host }}:{{ config.port }}</span>
            <span class="connection-time">{{ formatDate(config.lastConnectedAt) }}</span>
          </div>
          <div class="connection-actions">
            <button class="action-btn" type="button" @click.stop="toggleFavorite(config)" title="Add to Favorites">
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
              </svg>
            </button>
            <button class="action-btn" type="button" @click.stop="handleConnect(config)" title="Connect">
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path fill="currentColor" d="M8 5v14l11-7z"/>
              </svg>
            </button>
            <button class="action-btn" type="button" @click.stop="handleEdit(config)" title="Edit">
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </button>
            <button class="action-btn delete" type="button" @click.stop="showDeleteConfirm = config.id" title="Delete">
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="connections.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" width="48" height="48">
          <path fill="currentColor" d="M20 19V7H4v12h16m0-16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16M7.5 13l2.5 3 2.5-3-2.5-3-2.5 3m5 0l2.5 3 2.5-3-2.5-3-2.5 3z"/>
        </svg>
        <h4>No SSH Connections</h4>
        <p>Click the + button to add a new connection</p>
      </div>
    </div>

    <!-- Delete confirmation modal -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click="showDeleteConfirm = null">
      <div class="modal-content" @click.stop>
        <h4>Delete Connection?</h4>
        <p>Are you sure you want to delete this SSH connection?</p>
        <div class="modal-actions">
          <button class="cancel-btn" type="button" @click="showDeleteConfirm = null">Cancel</button>
          <button class="delete-btn" type="button" @click="handleDelete(showDeleteConfirm)">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ssh-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background-color: var(--color-body, #1e1e1e);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border, #3c3c3c);
}

.panel-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-1, #ffffff);
}

.new-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  color: var(--color-text-2, #cccccc);
  background: transparent;
  border: 1px solid var(--color-border, #3c3c3c);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.new-btn:hover {
  color: var(--color-text-1, #ffffff);
  background-color: var(--color-primary, #007acc);
  border-color: var(--color-primary, #007acc);
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: var(--color-text-3, #8c8c8c);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-border, #3c3c3c);
  border-top-color: var(--color-primary, #007acc);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state svg {
  color: #f44336;
  margin-bottom: 8px;
}

.error-state button {
  margin-top: 12px;
  padding: 6px 16px;
  color: var(--color-text-1, #ffffff);
  background: var(--color-primary, #007acc);
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.connection-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.section {
  margin-bottom: 8px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-3, #8c8c8c);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.connection-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.connection-item:hover {
  background-color: var(--color-hover, #2a2a2a);
}

.connection-item.selected {
  background-color: var(--color-selected, #094771);
}

.connection-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-right: 12px;
  color: var(--color-text-2, #cccccc);
  background-color: var(--color-surface, #2d2d2d);
  border-radius: 6px;
}

.connection-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.connection-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-1, #ffffff);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.connection-host {
  font-size: 11px;
  color: var(--color-text-3, #8c8c8c);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.connection-time {
  font-size: 10px;
  color: var(--color-text-4, #666666);
}

.connection-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.connection-item:hover .connection-actions {
  opacity: 1;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  color: var(--color-text-3, #8c8c8c);
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.action-btn:hover {
  color: var(--color-text-1, #ffffff);
  background-color: var(--color-hover, #3c3c3c);
}

.action-btn.delete:hover {
  color: #f44336;
  background-color: rgba(244, 67, 54, 0.1);
}

.empty-state svg {
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state h4 {
  margin: 0 0 4px;
  font-size: 14px;
  color: var(--color-text-2, #cccccc);
}

.empty-state p {
  margin: 0;
  font-size: 12px;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

.modal-content {
  padding: 20px 24px;
  background-color: var(--color-surface, #2d2d2d);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  max-width: 360px;
}

.modal-content h4 {
  margin: 0 0 8px;
  font-size: 16px;
  color: var(--color-text-1, #ffffff);
}

.modal-content p {
  margin: 0 0 20px;
  font-size: 13px;
  color: var(--color-text-3, #8c8c8c);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.cancel-btn,
.delete-btn {
  padding: 8px 16px;
  font-size: 13px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-btn {
  color: var(--color-text-1, #ffffff);
  background-color: var(--color-surface-hover, #3c3c3c);
}

.cancel-btn:hover {
  background-color: var(--color-hover, #4c4c4c);
}

.delete-btn {
  color: #ffffff;
  background-color: #f44336;
}

.delete-btn:hover {
  background-color: #d32f2f;
}
</style>
