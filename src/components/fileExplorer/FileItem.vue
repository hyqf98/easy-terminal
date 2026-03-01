<script setup lang="ts">
/**
 * FileItem - Individual file/directory item in the file tree
 */
import { computed, ref } from 'vue';
import type { FileItem as IFileItem } from '@/types';
import FileIcon from './FileIcon.vue';

const props = withDefaults(defineProps<{
  item: IFileItem;
  depth?: number;
  isExpanded?: boolean;
  isLoading?: boolean;
  isSelected?: boolean;
  isEditing?: boolean;
}>(), {
  depth: 0,
  isExpanded: false,
  isLoading: false,
  isSelected: false,
  isEditing: false,
});

const emit = defineEmits<{
  (e: 'click', item: IFileItem, event: MouseEvent): void;
  (e: 'dblclick', item: IFileItem, event: MouseEvent): void;
  (e: 'contextmenu', item: IFileItem, event: MouseEvent): void;
  (e: 'toggle', item: IFileItem): void;
  (e: 'rename', item: IFileItem, newName: string): void;
}>();

const editValue = ref(props.item.name);
const editInput = ref<HTMLInputElement | null>(null);

const indentStyle = computed(() => ({
  paddingLeft: `${props.depth * 16 + 8}px`,
}));

const displayName = computed(() => {
  if (props.item.isHidden) {
    return props.item.name;
  }
  return props.item.name;
});

const formattedSize = computed(() => {
  if (props.item.type === 'directory') return '';
  const size = props.item.size;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
});

function handleClick(event: MouseEvent) {
  emit('click', props.item, event);
}

function handleDblClick(event: MouseEvent) {
  emit('dblclick', props.item, event);
}

function handleContextMenu(event: MouseEvent) {
  event.preventDefault();
  emit('contextmenu', props.item, event);
}

function handleToggle(event: MouseEvent) {
  event.stopPropagation();
  if (props.item.type === 'directory' && !props.isLoading) {
    emit('toggle', props.item);
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    finishEdit();
  } else if (event.key === 'Escape') {
    cancelEdit();
  }
}

function finishEdit() {
  if (editValue.value.trim() && editValue.value !== props.item.name) {
    emit('rename', props.item, editValue.value.trim());
  }
}

function cancelEdit() {
  editValue.value = props.item.name;
}
</script>

<template>
  <div
    class="file-item"
    :class="{
      'is-selected': isSelected,
      'is-directory': item.type === 'directory',
      'is-hidden': item.isHidden,
      'is-loading': isLoading,
    }"
    :style="indentStyle"
    @click="handleClick"
    @dblclick="handleDblClick"
    @contextmenu="handleContextMenu"
  >
    <!-- Expand/collapse arrow for directories -->
    <span
      v-if="item.type === 'directory'"
      class="expand-arrow"
      :class="{ 'is-expanded': isExpanded }"
      @click="handleToggle"
    >
      <svg v-if="!isLoading" viewBox="0 0 16 16" fill="currentColor">
        <path d="M6 4l4 4-4 4V4z" />
      </svg>
      <svg v-else class="is-spinning" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 2a6 6 0 100 12A6 6 0 008 2zm0 1a5 5 0 110 10 5 5 0 010-10z" opacity="0.3"/>
        <path d="M8 2v1a5 5 0 015 5h1A6 6 0 008 2z"/>
      </svg>
    </span>
    <span v-else class="expand-placeholder" />

    <!-- File icon -->
    <FileIcon
      :type="item.iconType || 'file'"
      :is-directory="item.type === 'directory'"
      :is-expanded="isExpanded"
      :size="16"
    />

    <!-- File name -->
    <div class="file-name">
      <input
        v-if="isEditing"
        ref="editInput"
        v-model="editValue"
        type="text"
        class="edit-input"
        @keydown="handleKeydown"
        @blur="finishEdit"
        @click.stop
      />
      <span v-else class="name-text" :title="item.path">
        {{ displayName }}
      </span>
    </div>

    <!-- Size (for files) -->
    <span v-if="item.type !== 'directory' && formattedSize" class="file-size">
      {{ formattedSize }}
    </span>
  </div>
</template>

<style scoped>
.file-item {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 8px;
  cursor: default;
  user-select: none;
  border-radius: var(--border-radius, 4px);
  transition: background-color 0.1s ease;
}

.file-item:hover {
  background-color: var(--color-hover, rgba(0, 0, 0, 0.05));
}

.file-item.is-selected {
  background-color: var(--color-primary-light, rgba(24, 144, 255, 0.1));
}

.file-item.is-selected:hover {
  background-color: var(--color-primary-light, rgba(24, 144, 255, 0.15));
}

.file-item.is-hidden {
  opacity: 0.6;
}

.expand-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--color-text-3, #999);
  cursor: pointer;
  transition: transform 0.15s ease;
}

.expand-arrow:hover {
  color: var(--color-text-1, #333);
}

.expand-arrow.is-expanded {
  transform: rotate(90deg);
}

.expand-arrow svg {
  width: 12px;
  height: 12px;
}

.expand-arrow .is-spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.expand-placeholder {
  width: 16px;
  flex-shrink: 0;
}

.file-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.name-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: var(--color-text-1, #333);
}

.edit-input {
  width: 100%;
  height: 20px;
  padding: 0 4px;
  font-size: 13px;
  border: 1px solid var(--color-primary, #1890ff);
  border-radius: 2px;
  background-color: var(--color-body, #fff);
  color: var(--color-text-1, #333);
  outline: none;
}

.file-size {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--color-text-3, #999);
  margin-left: auto;
}
</style>
