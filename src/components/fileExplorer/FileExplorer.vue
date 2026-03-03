<script setup lang="ts">
/**
 * FileExplorer - Main file explorer container component
 * Integrates all file explorer components
 */
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useFileExplorer, useModifierKeys } from '@/composables';
import { useFileExplorerStore } from '@/stores';
import { listDrives } from '@/services/file.service';
import type { FileItem, DriveInfo } from '@/types';
import SearchBar from './SearchBar.vue';
import FileTree from './FileTree.vue';
import FileContextMenu from './FileContextMenu.vue';
import FileIcon from './FileIcon.vue';
import DriveSelector from './DriveSelector.vue';

const { t } = useI18n();

const emit = defineEmits<{
  (e: 'file-open', item: FileItem): void;
  (e: 'directory-change', path: string): void;
  (e: 'terminal-cd', path: string): void;
  (e: 'open-in-new-terminal', path: string): void;
}>();

// Track modifier keys
const { ctrlKey } = useModifierKeys();

const store = useFileExplorerStore();
const {
  currentPath,
  isLoading,
  error,
  expandedPaths,
  selectedPath,
  loadDirectory,
  toggleExpand,
  selectFile,
  searchFiles,
  clearSearch,
  createDirectory,
  createFile,
  deleteItem,
  renameItem,
  movePath,
} = useFileExplorer({ autoLoad: false });

// Local state
const searchQuery = ref('');
const searchResults = ref<FileItem[]>([]);
const isSearching = ref(false);
const editingPath = ref('');
const draggedItem = ref<FileItem | null>(null);
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  item: null as FileItem | null,
});

// Drive state
const drives = ref<DriveInfo[]>([]);
const selectedDrivePath = ref<string>('');
const isLoadingDrives = ref(false);

// Computed
const displayFiles = computed(() => {
  console.log('[FileExplorer] displayFiles computed');
  console.log('[FileExplorer] searchQuery:', searchQuery.value);
  console.log('[FileExplorer] currentPath:', currentPath.value);

  if (searchQuery.value && searchResults.value.length > 0) {
    console.log('[FileExplorer] Returning search results:', searchResults.value.length);
    return searchResults.value;
  }
  if (searchQuery.value && isSearching.value) {
    console.log('[FileExplorer] Searching, returning empty');
    return [];
  }
  const children = store.getChildren(currentPath.value);
  console.log('[FileExplorer] Returning store children:', children.length);
  return children;
});

const loadingPaths = computed(() => store.loadingPaths);

// Path parts for breadcrumb - fix Windows path handling
const pathParts = computed(() => {
  if (!currentPath.value) return [];

  // Normalize path separators
  let normalized = currentPath.value.replace(/\\/g, '/');

  // Handle Windows drive letter (e.g., "C:/" -> keep as "C:/")
  const driveMatch = normalized.match(/^([A-Za-z]:\/?)/);
  const drivePrefix = driveMatch ? driveMatch[1] : '';

  // Remove drive prefix for splitting
  if (drivePrefix) {
    normalized = normalized.slice(drivePrefix.length);
  }

  const parts = normalized.split('/').filter(Boolean);
  let accumulated = drivePrefix;

  return parts.map(part => {
    // Use backslash for Windows paths, forward slash for others
    const separator = drivePrefix ? '\\' : '/';
    accumulated = accumulated.replace(/\/$/, '') + separator + part;
    return { name: part, path: accumulated };
  });
});

// Search handler with debounce
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

async function handleSearch(query: string) {
  searchQuery.value = query;

  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  if (!query.trim()) {
    clearSearch();
    searchResults.value = [];
    return;
  }

  searchTimeout = setTimeout(async () => {
    isSearching.value = true;
    try {
      const results = await searchFiles(query);
      searchResults.value = results;
    } catch {
      searchResults.value = [];
    } finally {
      isSearching.value = false;
    }
  }, 300);
}

function handleClearSearch() {
  searchQuery.value = '';
  searchResults.value = [];
  clearSearch();
}

// File selection
function handleSelect(item: FileItem) {
  selectFile(item.path);
}

// File open (double-click)
function handleOpen(item: FileItem) {
  if (item.type === 'directory') {
    if (ctrlKey.value) {
      emit('open-in-new-terminal', item.path);
    } else {
      loadDirectory(item.path);
      emit('directory-change', item.path);
      emit('terminal-cd', item.path);
    }
  } else {
    emit('file-open', item);
  }
}

// Directory toggle
async function handleToggle(item: FileItem) {
  if (item.type === 'directory') {
    await toggleExpand(item.path);
  }
}

// Context menu
function handleContextMenu(item: FileItem, event: MouseEvent) {
  event.preventDefault();
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    item,
  };
}

function closeContextMenu() {
  contextMenu.value.visible = false;
}

async function handleContextMenuAction(action: string, item: FileItem) {
  closeContextMenu();

  switch (action) {
    case 'open':
      handleOpen(item);
      break;
    case 'open-in-terminal':
      emit('terminal-cd', item.path);
      break;
    case 'open-with-editor':
      emit('file-open', item);
      break;
    case 'copy-path':
      await navigator.clipboard.writeText(item.path);
      break;
    case 'rename':
      editingPath.value = item.path;
      break;
    case 'new-file': {
      const fileName = prompt(t('fileExplorer.newFilePrompt'));
      if (fileName) {
        await createFile(fileName);
      }
      break;
    }
    case 'new-folder': {
      const folderName = prompt(t('fileExplorer.newFolderPrompt'));
      if (folderName) {
        await createDirectory(folderName);
      }
      break;
    }
    case 'delete':
      if (confirm(t('fileExplorer.deleteConfirm', { name: item.name }))) {
        await deleteItem(item.path);
      }
      break;
  }
}

// Rename
function handleRename(item: FileItem, newName: string) {
  renameItem(item.path, newName);
  editingPath.value = '';
}

// Navigation
function navigateToPath(path: string) {
  // Handle root path for Windows
  if (path === '/' && selectedDrivePath.value) {
    loadDirectory(selectedDrivePath.value);
    emit('directory-change', selectedDrivePath.value);
  } else {
    loadDirectory(path);
    emit('directory-change', path);
  }
}

async function handleRefresh() {
  if (currentPath.value) {
    await loadDirectory(currentPath.value);
  }
}

// Drag and drop handlers
function handleDragStart(item: FileItem, _event: DragEvent) {
  draggedItem.value = item;
}

function handleDragOver(item: FileItem, event: DragEvent) {
  if (item.type !== 'directory') return;
  event.preventDefault();
}

async function handleDrop(targetItem: FileItem, event: DragEvent) {
  event.preventDefault();
  if (!draggedItem.value || draggedItem.value.path === targetItem.path) {
    draggedItem.value = null;
    return;
  }

  if (draggedItem.value.path.startsWith(targetItem.path)) {
    draggedItem.value = null;
    return;
  }

  const sourcePath = draggedItem.value.path;
  const destPath = targetItem.path.endsWith('\\') || targetItem.path.endsWith('/')
    ? targetItem.path + draggedItem.value.name
    : targetItem.path + '\\' + draggedItem.value.name;

  try {
    const success = await movePath(sourcePath, destPath);
    if (success && expandedPaths.value.has(targetItem.path)) {
      await toggleExpand(targetItem.path);
      await toggleExpand(targetItem.path);
    }
  } catch {
    // Ignore errors
  }

  draggedItem.value = null;
}

function handleDragEnd(_item: FileItem, _event: DragEvent) {
  draggedItem.value = null;
}

// Drive handling
async function loadDrives() {
  console.log('[FileExplorer] loadDrives started');
  isLoadingDrives.value = true;
  try {
    drives.value = await listDrives();
    console.log('[FileExplorer] Drives loaded:', drives.value);
    if (!selectedDrivePath.value && drives.value.length > 0) {
      handleDriveSelect(drives.value[0]);
    }
  } catch (e) {
    console.error('[FileExplorer] Failed to load drives:', e);
  } finally {
    isLoadingDrives.value = false;
  }
}

function handleDriveSelect(drive: DriveInfo) {
  console.log('[FileExplorer] handleDriveSelect:', drive.path);
  selectedDrivePath.value = drive.path;
  loadDirectory(drive.path);
  emit('directory-change', drive.path);
}

// Watch drive path changes
watch(selectedDrivePath, (newPath) => {
  if (newPath) {
    loadDirectory(newPath);
  }
});

// Initialize drives on mount
onMounted(() => {
  loadDrives();
});
</script>

<template>
  <div class="file-explorer">
    <!-- Drive selector -->
    <div class="drive-section">
      <DriveSelector
        v-model="selectedDrivePath"
        @drive-select="handleDriveSelect"
      />
    </div>

    <!-- Header with path and actions -->
    <div class="explorer-header">
      <!-- Search bar -->
      <SearchBar
        v-model="searchQuery"
        :is-loading="isSearching"
        :placeholder="t('fileExplorer.searchPlaceholder')"
        @search="handleSearch"
        @clear="handleClearSearch"
      />

      <!-- Action buttons -->
      <div class="header-actions">
        <button
          class="action-btn"
          :title="t('fileExplorer.newFile')"
          @click="handleContextMenuAction('new-file', { path: currentPath, name: '', type: 'directory' } as FileItem)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
            <line x1="12" y1="14" x2="12" y2="18" />
            <line x1="10" y1="16" x2="14" y2="16" />
          </svg>
        </button>
        <button
          class="action-btn"
          :title="t('fileExplorer.newFolder')"
          @click="handleContextMenuAction('new-folder', { path: currentPath, name: '', type: 'directory' } as FileItem)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z" />
            <line x1="12" y1="13" x2="12" y2="17" />
            <line x1="10" y1="15" x2="14" y2="15" />
          </svg>
        </button>
        <button class="action-btn" :title="t('fileExplorer.refresh')" @click="handleRefresh">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Breadcrumb path -->
    <div class="breadcrumb">
      <button class="breadcrumb-item" @click="navigateToPath('/')">
        <FileIcon type="folder" :is-directory="true" :size="14" />
      </button>
      <template v-for="(part, index) in pathParts" :key="part.path">
        <span class="breadcrumb-separator">/</span>
        <button
          class="breadcrumb-item"
          :class="{ 'is-last': index === pathParts.length - 1 }"
          @click="navigateToPath(part.path)"
        >
          {{ part.name }}
        </button>
      </template>
    </div>

    <!-- File tree -->
    <div class="explorer-content">
      <FileTree
        :files="displayFiles"
        :expanded-paths="expandedPaths"
        :selected-path="selectedPath"
        :loading-paths="loadingPaths"
        :editing-path="editingPath"
        @select="handleSelect"
        @open="handleOpen"
        @toggle="handleToggle"
        @contextmenu="handleContextMenu"
        @rename="handleRename"
        @dragstart="handleDragStart"
        @dragover="handleDragOver"
        @drop="handleDrop"
        @dragend="handleDragEnd"
      />

      <!-- Loading overlay -->
      <div v-if="isLoading && displayFiles.length === 0" class="loading-overlay">
        <svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" opacity="0.3" />
          <path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
        <span>{{ t('fileExplorer.loading') }}</span>
      </div>

      <!-- Error message -->
      <div v-if="error" class="error-overlay">
        <span>{{ error }}</span>
        <button @click="handleRefresh">{{ t('common.retry') }}</button>
      </div>
    </div>

    <!-- Context menu -->
    <FileContextMenu
      :visible="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :item="contextMenu.item"
      @close="closeContextMenu"
      @action="handleContextMenuAction"
    />
  </div>
</template>

<style scoped>
.file-explorer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-card, #fff);
}

.drive-section {
  padding: 8px;
  border-bottom: 1px solid var(--color-border, #e0e0e0);
}

.explorer-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-bottom: 1px solid var(--color-border, #e0e0e0);
}

.explorer-header .search-bar {
  flex: 1;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-2, #666);
  cursor: pointer;
  border-radius: var(--border-radius, 4px);
  transition: all 0.15s ease;
}

.action-btn:hover {
  background-color: var(--color-hover, rgba(0, 0, 0, 0.05));
  color: var(--color-text-1, #333);
}

.action-btn svg {
  width: 16px;
  height: 16px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  font-size: 12px;
  border-bottom: 1px solid var(--color-border, #e0e0e0);
  overflow-x: auto;
  white-space: nowrap;
}

.breadcrumb::-webkit-scrollbar {
  height: 4px;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px;
  border: none;
  background: transparent;
  color: var(--color-text-2, #666);
  font-size: 12px;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.15s ease;
}

.breadcrumb-item:hover {
  background-color: var(--color-hover, rgba(0, 0, 0, 0.05));
  color: var(--color-text-1, #333);
}

.breadcrumb-item.is-last {
  color: var(--color-text-1, #333);
  font-weight: 500;
}

.breadcrumb-separator {
  color: var(--color-text-3, #999);
}

.explorer-content {
  flex: 1;
  position: relative;
  overflow: auto;
}

/* Only show scrollbar when content overflows */
.explorer-content:not(:hover)::-webkit-scrollbar {
  width: 0;
}

.explorer-content:hover::-webkit-scrollbar {
  width: 8px;
}

.explorer-content::-webkit-scrollbar-track {
  background: transparent;
}

.explorer-content::-webkit-scrollbar-thumb {
  background-color: var(--color-scroll, #d5d5d5);
  border-radius: 4px;
}

.loading-overlay,
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: var(--color-card, #fff);
  color: var(--color-text-3, #999);
  font-size: 13px;
}

.error-overlay {
  color: var(--color-error, #ff4d4f);
}

.spinner {
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
