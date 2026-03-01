<script setup lang="ts">
/**
 * FileTree - Virtual scrolling file tree component
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { FileItem } from '@/types';
import FileItemComponent from './FileItem.vue';

const props = withDefaults(defineProps<{
  files: FileItem[];
  expandedPaths: Set<string>;
  selectedPath: string | null;
  loadingPaths?: Set<string>;
  editingPath?: string;
}>(), {
  loadingPaths: () => new Set(),
  editingPath: '',
});

const emit = defineEmits<{
  (e: 'select', item: FileItem): void;
  (e: 'open', item: FileItem): void;
  (e: 'toggle', item: FileItem): void;
  (e: 'contextmenu', item: FileItem, event: MouseEvent): void;
  (e: 'rename', item: FileItem, newName: string): void;
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const itemHeight = 24; // Height of each file item
const bufferSize = 5; // Extra items to render outside viewport

const scrollTop = ref(0);
const containerHeight = ref(0);

// Flatten tree structure for virtual scrolling
interface FlatFileItem {
  item: FileItem;
  depth: number;
}

const flatFiles = computed(() => {
  const result: FlatFileItem[] = [];

  function flatten(items: FileItem[], depth: number) {
    for (const item of items) {
      result.push({ item, depth });

      // If directory is expanded, include its children
      if (item.type === 'directory' && props.expandedPaths.has(item.path)) {
        const childItems = getChildItems(item.path);
        // Sort children: directories first, then alphabetically
        const sorted = [...childItems].sort((a, b) => {
          if (a.type === 'directory' && b.type !== 'directory') return -1;
          if (a.type !== 'directory' && b.type === 'directory') return 1;
          return a.name.localeCompare(b.name);
        });
        flatten(sorted, depth + 1);
      }
    }
  }

  // Sort root items: directories first, then alphabetically
  const sortedFiles = [...props.files].sort((a, b) => {
    if (a.type === 'directory' && b.type !== 'directory') return -1;
    if (a.type !== 'directory' && b.type === 'directory') return 1;
    return a.name.localeCompare(b.name);
  });

  flatten(sortedFiles, 0);
  return result;
});

// Get child items for a path
function getChildItems(_parentPath: string): FileItem[] {
  // This will be provided by the parent component
  // For now, return empty array - the actual data comes from props.files
  return [];
}

// Virtual scrolling calculations
const totalHeight = computed(() => flatFiles.value.length * itemHeight);

const visibleRange = computed(() => {
  const start = Math.floor(scrollTop.value / itemHeight);
  const visibleCount = Math.ceil(containerHeight.value / itemHeight);

  return {
    start: Math.max(0, start - bufferSize),
    end: Math.min(flatFiles.value.length, start + visibleCount + bufferSize),
  };
});

const visibleFiles = computed(() => {
  const { start, end } = visibleRange.value;
  return flatFiles.value.slice(start, end).map((flat, index) => ({
    ...flat,
    index: start + index,
  }));
});

const offsetY = computed(() => visibleRange.value.start * itemHeight);

// Scroll handling
function handleScroll(event: Event) {
  const target = event.target as HTMLDivElement;
  scrollTop.value = target.scrollTop;
}

// Resize observer
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (containerRef.value) {
    containerHeight.value = containerRef.value.clientHeight;

    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerHeight.value = entry.contentRect.height;
      }
    });
    resizeObserver.observe(containerRef.value);
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
});

// Event handlers
function handleItemClick(item: FileItem, _event: MouseEvent) {
  emit('select', item);
}

function handleItemDblClick(item: FileItem, _event: MouseEvent) {
  emit('open', item);
}

function handleItemToggle(item: FileItem) {
  emit('toggle', item);
}

function handleItemContextMenu(item: FileItem, event: MouseEvent) {
  emit('contextmenu', item, event);
}

function handleItemRename(item: FileItem, newName: string) {
  emit('rename', item, newName);
}

function isExpanded(path: string): boolean {
  return props.expandedPaths.has(path);
}

function isLoading(path: string): boolean {
  return props.loadingPaths.has(path);
}

function isSelected(path: string): boolean {
  return props.selectedPath === path;
}

function isEditing(path: string): boolean {
  return props.editingPath === path;
}

// Scroll to a specific path
function scrollToPath(path: string) {
  const index = flatFiles.value.findIndex(f => f.item.path === path);
  if (index !== -1 && containerRef.value) {
    const targetScrollTop = index * itemHeight;
    containerRef.value.scrollTop = targetScrollTop;
  }
}

// Keyboard navigation
let focusedIndex = -1;

function handleKeydown(event: KeyboardEvent) {
  if (flatFiles.value.length === 0) return;

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      focusedIndex = Math.min(focusedIndex + 1, flatFiles.value.length - 1);
      emit('select', flatFiles.value[focusedIndex].item);
      scrollToPath(flatFiles.value[focusedIndex].item.path);
      break;
    case 'ArrowUp':
      event.preventDefault();
      focusedIndex = Math.max(focusedIndex - 1, 0);
      emit('select', flatFiles.value[focusedIndex].item);
      scrollToPath(flatFiles.value[focusedIndex].item.path);
      break;
    case 'Enter':
      if (focusedIndex >= 0 && focusedIndex < flatFiles.value.length) {
        const item = flatFiles.value[focusedIndex].item;
        if (item.type === 'directory') {
          emit('toggle', item);
        } else {
          emit('open', item);
        }
      }
      break;
    case 'ArrowRight':
      if (focusedIndex >= 0) {
        const item = flatFiles.value[focusedIndex].item;
        if (item.type === 'directory' && !isExpanded(item.path)) {
          emit('toggle', item);
        }
      }
      break;
    case 'ArrowLeft':
      if (focusedIndex >= 0) {
        const item = flatFiles.value[focusedIndex].item;
        if (item.type === 'directory' && isExpanded(item.path)) {
          emit('toggle', item);
        }
      }
      break;
    case 'Delete':
      if (focusedIndex >= 0) {
        // Emit delete action through contextmenu event
        // This could be a separate event if needed
      }
      break;
  }
}

// Update focused index when selection changes externally
watch(() => props.selectedPath, (newPath) => {
  if (newPath) {
    const index = flatFiles.value.findIndex(f => f.item.path === newPath);
    if (index !== -1) {
      focusedIndex = index;
    }
  }
});

defineExpose({ scrollToPath });
</script>

<template>
  <div
    ref="containerRef"
    class="file-tree"
    tabindex="0"
    @scroll="handleScroll"
    @keydown="handleKeydown"
  >
    <div class="file-tree-content" :style="{ height: `${totalHeight}px` }">
      <div class="file-tree-viewport" :style="{ transform: `translateY(${offsetY}px)` }">
        <FileItemComponent
          v-for="{ item, depth } in visibleFiles"
          :key="item.path"
          :item="item"
          :depth="depth"
          :is-expanded="isExpanded(item.path)"
          :is-loading="isLoading(item.path)"
          :is-selected="isSelected(item.path)"
          :is-editing="isEditing(item.path)"
          @click="handleItemClick"
          @dblclick="handleItemDblClick"
          @toggle="handleItemToggle"
          @contextmenu="handleItemContextMenu"
          @rename="handleItemRename"
        />
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="flatFiles.length === 0" class="empty-state">
      <span>No files found</span>
    </div>
  </div>
</template>

<style scoped>
.file-tree {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  outline: none;
}

.file-tree:focus {
  /* Subtle focus indicator */
}

.file-tree-content {
  position: relative;
}

.file-tree-viewport {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 100px;
  color: var(--color-text-3, #999);
  font-size: 13px;
}
</style>
