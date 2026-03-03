<script setup lang="ts">
/**
 * FileEditorModal - Modal wrapper for editing files with Monaco editor
 * Triggered when vim/nano commands are detected in terminal
 */
import { ref, computed, watch, onMounted } from 'vue';
import CodeEditor from './CodeEditor.vue';
import * as fileService from '@/services/file.service';

const props = defineProps<{
  visible: boolean;
  filePath: string;
  editor?: string; // vim, nano, etc.
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', path: string, content: string): void;
  (e: 'update:visible', value: boolean): void;
}>();

const editorRef = ref<InstanceType<typeof CodeEditor> | null>(null);
const content = ref('');
const isLoading = ref(false);
const isSaving = ref(false);
const error = ref<string | null>(null);
const hasChanges = ref(false);

// File name from path
const fileName = computed(() => {
  const parts = props.filePath.split(/[/\\]/);
  return parts[parts.length - 1] || props.filePath;
});

// Modal title
const modalTitle = computed(() => {
  const editorName = props.editor ? ` (${props.editor})` : '';
  return `${fileName.value}${editorName}`;
});

// Load file content
async function loadFile() {
  if (!props.filePath) return;

  isLoading.value = true;
  error.value = null;

  try {
    content.value = await fileService.readFile(props.filePath);
    hasChanges.value = false;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load file';
    console.error('Failed to load file:', e);
  } finally {
    isLoading.value = false;
  }
}

// Save file
async function handleSave() {
  if (!props.filePath || isSaving.value) return;

  isSaving.value = true;
  error.value = null;

  try {
    const result = await fileService.writeFile(props.filePath, content.value);
    if (result.success) {
      hasChanges.value = false;
      emit('save', props.filePath, content.value);
    } else {
      error.value = result.error || 'Failed to save file';
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save file';
    console.error('Failed to save file:', e);
  } finally {
    isSaving.value = false;
  }
}

// Handle content change
function handleChange(_value: string) {
  hasChanges.value = true;
}

// Handle keyboard shortcuts
function handleKeydown(event: KeyboardEvent) {
  // Escape to close
  if (event.key === 'Escape') {
    handleClose();
  }
}

// Close modal
function handleClose() {
  if (hasChanges.value) {
    const confirm = window.confirm('You have unsaved changes. Close anyway?');
    if (!confirm) return;
  }
  emit('close');
  emit('update:visible', false);
}

// Watch visibility
watch(() => props.visible, (visible) => {
  if (visible && props.filePath) {
    loadFile();
  }
});

// Handle save shortcut from editor
function handleEditorSave(value: string) {
  content.value = value;
  handleSave();
}

onMounted(() => {
  if (props.visible && props.filePath) {
    loadFile();
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="modal-overlay"
        @click.self="handleClose"
        @keydown="handleKeydown"
      >
        <div class="modal-container">
          <!-- Header -->
          <div class="modal-header">
            <h3 class="modal-title">{{ modalTitle }}</h3>
            <div class="header-info">
              <span v-if="hasChanges" class="unsaved-badge">Unsaved</span>
              <span class="file-path">{{ filePath }}</span>
            </div>
            <button class="close-btn" @click="handleClose" title="Close (Esc)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <!-- Toolbar -->
          <div class="modal-toolbar">
            <button
              class="toolbar-btn save-btn"
              :disabled="!hasChanges || isSaving"
              @click="handleSave"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              <span>{{ isSaving ? 'Saving...' : 'Save (Ctrl+S)' }}</span>
            </button>
          </div>

          <!-- Content -->
          <div class="modal-content">
            <div v-if="isLoading" class="loading-state">
              <svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" opacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              <span>Loading file...</span>
            </div>

            <div v-else-if="error" class="error-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{{ error }}</span>
              <button @click="loadFile">Retry</button>
            </div>

            <CodeEditor
              v-else
              ref="editorRef"
              v-model="content"
              :file-path="filePath"
              theme="vs-dark"
              @change="handleChange"
              @save="handleEditorSave"
            />
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <span class="hint">Press Esc to close</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-container {
  width: 90%;
  max-width: 1200px;
  height: 85vh;
  background-color: var(--color-card, #1e1e1e);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--color-header, #252526);
  border-bottom: 1px solid var(--color-border, #3c3c3c);
  gap: 12px;
}

.modal-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-1, #fff);
}

.header-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.file-path {
  font-size: 12px;
  color: var(--color-text-3, #999);
}

.unsaved-badge {
  font-size: 11px;
  padding: 2px 6px;
  background-color: var(--color-warning, #faad14);
  color: #000;
  border-radius: 3px;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-3, #999);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.close-btn:hover {
  background-color: var(--color-hover, rgba(255, 255, 255, 0.1));
  color: var(--color-text-1, #fff);
}

.close-btn svg {
  width: 16px;
  height: 16px;
}

.modal-toolbar {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background-color: var(--color-toolbar, #2d2d2d);
  border-bottom: 1px solid var(--color-border, #3c3c3c);
  gap: 8px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  background-color: var(--color-primary, #1890ff);
  color: #fff;
  font-size: 13px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.toolbar-btn:hover:not(:disabled) {
  background-color: var(--color-primary-hover, #40a9ff);
}

.toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar-btn svg {
  width: 14px;
  height: 14px;
}

.modal-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: var(--color-text-3, #999);
}

.error-state {
  color: var(--color-error, #ff4d4f);
}

.spinner {
  width: 32px;
  height: 32px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 8px 16px;
  background-color: var(--color-footer, #252526);
  border-top: 1px solid var(--color-border, #3c3c3c);
}

.hint {
  font-size: 12px;
  color: var(--color-text-3, #999);
}

/* Transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95);
}
</style>
