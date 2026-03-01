<script setup lang="ts">
/**
 * SshManager - Main SSH connection management component
 * Combines connection panel and form in a modal/drawer
 */
import { ref } from 'vue';
import { SshConnectionPanel, SshConnectionForm } from '@/components/ssh';
import { connectSsh } from '@/services/ssh.service';
import type { SshConnectionConfig } from '@/types';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'connect', sessionId: string, config: SshConnectionConfig): void;
}>();

// State
const showForm = ref(false);
const editingConfig = ref<SshConnectionConfig | null>(null);
const panelRef = ref<InstanceType<typeof SshConnectionPanel> | null>(null);

// Methods
function handleConnect(config: SshConnectionConfig) {
  connectSsh(config.id)
    .then(sessionId => {
      emit('connect', sessionId, config);
      emit('close');
    })
    .catch(err => {
      console.error('Failed to connect:', err);
    });
}

function handleEdit(config: SshConnectionConfig) {
  editingConfig.value = config;
  showForm.value = true;
}

function handleNew() {
  editingConfig.value = null;
  showForm.value = true;
}

function handleFormSave(_config: SshConnectionConfig) {
  showForm.value = false;
  editingConfig.value = null;
  // Refresh the panel
  panelRef.value?.refresh();
}

function handleFormCancel() {
  showForm.value = false;
  editingConfig.value = null;
}

function handleClose() {
  emit('close');
}
</script>

<template>
  <div class="ssh-manager-overlay" @click.self="handleClose">
    <div class="ssh-manager">
      <!-- Header -->
      <div class="manager-header">
        <h2>SSH Connections</h2>
        <button class="close-btn" type="button" @click="handleClose" title="Close">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="manager-content">
        <!-- Connection Panel (default view) -->
        <SshConnectionPanel
          v-if="!showForm"
          ref="panelRef"
          @connect="handleConnect"
          @edit="handleEdit"
          @new="handleNew"
        />

        <!-- Connection Form (edit/create view) -->
        <SshConnectionForm
          v-else
          :config="editingConfig"
          @save="handleFormSave"
          @cancel="handleFormCancel"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.ssh-manager-overlay {
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

.ssh-manager {
  display: flex;
  flex-direction: column;
  width: 90%;
  max-width: 600px;
  height: 80%;
  max-height: 700px;
  background-color: var(--color-surface, #2d2d2d);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.manager-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border, #3c3c3c);
}

.manager-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: var(--color-text-1, #ffffff);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: var(--color-text-3, #8c8c8c);
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.close-btn:hover {
  color: var(--color-text-1, #ffffff);
  background-color: var(--color-hover, #3c3c3c);
}

.manager-content {
  flex: 1;
  overflow: hidden;
}
</style>
