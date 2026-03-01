<script setup lang="ts">
/**
 * FileContextMenu - Right-click context menu for file items
 */
import { computed, ref, onMounted, onUnmounted } from 'vue';
import type { FileItem } from '@/types';

const props = defineProps<{
  visible: boolean;
  x: number;
  y: number;
  item: FileItem | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'action', action: string, item: FileItem): void;
}>();

const menuRef = ref<HTMLDivElement | null>(null);

const menuItems = computed(() => {
  if (!props.item) return [];

  const items: Array<{ action: string; label: string; icon: string; divider?: boolean; disabled?: boolean }> = [];
  const isDir = props.item.type === 'directory';

  // Open actions
  if (isDir) {
    items.push({ action: 'open', label: 'Open', icon: 'folder' });
    items.push({ action: 'open-in-terminal', label: 'Open in Terminal', icon: 'terminal' });
  } else {
    items.push({ action: 'open', label: 'Open', icon: 'file' });
    items.push({ action: 'open-with-editor', label: 'Open with Editor', icon: 'edit' });
  }

  items.push({ action: 'copy-path', label: 'Copy Path', icon: 'copy' });
  items.push({ action: '', label: '', icon: '', divider: true });

  // Edit actions
  items.push({ action: 'rename', label: 'Rename', icon: 'edit' });
  items.push({ action: 'duplicate', label: 'Duplicate', icon: 'copy' });

  if (isDir) {
    items.push({ action: 'new-file', label: 'New File', icon: 'file-plus' });
    items.push({ action: 'new-folder', label: 'New Folder', icon: 'folder-plus' });
  }

  items.push({ action: '', label: '', icon: '', divider: true });

  // Delete actions
  items.push({ action: 'delete', label: 'Delete', icon: 'trash' });

  return items;
});

const adjustedPosition = computed(() => {
  let x = props.x;
  let y = props.y;

  if (menuRef.value) {
    const menuWidth = 180; // Approximate width
    const menuHeight = menuItems.value.length * 28; // Approximate height per item

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }
  }

  return { x, y };
});

function handleAction(action: string) {
  if (!action || !props.item) return;
  emit('action', action, props.item);
  emit('close');
}

function handleClickOutside(event: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    emit('close');
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close');
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="context-menu">
      <div
        v-if="visible && item"
        ref="menuRef"
        class="context-menu"
        :style="{ left: `${adjustedPosition.x}px`, top: `${adjustedPosition.y}px` }"
      >
        <template v-for="(menuItem, index) in menuItems" :key="index">
          <div v-if="menuItem.divider" class="menu-divider" />
          <button
            v-else
            class="menu-item"
            :class="{ 'is-danger': menuItem.action === 'delete' }"
            :disabled="menuItem.disabled"
            @click="handleAction(menuItem.action)"
          >
            <span class="menu-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <!-- Folder -->
                <template v-if="menuItem.icon === 'folder'">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z" />
                </template>
                <!-- Terminal -->
                <template v-else-if="menuItem.icon === 'terminal'">
                  <polyline points="4 17 10 11 4 5" />
                  <line x1="12" y1="19" x2="20" y2="19" />
                </template>
                <!-- File -->
                <template v-else-if="menuItem.icon === 'file'">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                  <path d="M14 2v6h6" fill="var(--color-card, #fff)" />
                </template>
                <!-- Edit -->
                <template v-else-if="menuItem.icon === 'edit'">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </template>
                <!-- Copy -->
                <template v-else-if="menuItem.icon === 'copy'">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </template>
                <!-- File plus -->
                <template v-else-if="menuItem.icon === 'file-plus'">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                  <line x1="12" y1="14" x2="12" y2="18" />
                  <line x1="10" y1="16" x2="14" y2="16" />
                </template>
                <!-- Folder plus -->
                <template v-else-if="menuItem.icon === 'folder-plus'">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z" />
                  <line x1="12" y1="13" x2="12" y2="17" />
                  <line x1="10" y1="15" x2="14" y2="15" />
                </template>
                <!-- Trash -->
                <template v-else-if="menuItem.icon === 'trash'">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </template>
              </svg>
            </span>
            <span class="menu-label">{{ menuItem.label }}</span>
          </button>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 1000;
  min-width: 160px;
  max-width: 220px;
  padding: 4px 0;
  background-color: var(--color-card, #fff);
  border: 1px solid var(--color-border, #e0e0e0);
  border-radius: var(--border-radius, 4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 12px;
  border: none;
  background: transparent;
  font-size: 13px;
  color: var(--color-text-1, #333);
  cursor: pointer;
  text-align: left;
  transition: background-color 0.1s ease;
}

.menu-item:hover {
  background-color: var(--color-hover, rgba(0, 0, 0, 0.05));
}

.menu-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.menu-item.is-danger {
  color: var(--color-error, #ff4d4f);
}

.menu-item.is-danger:hover {
  background-color: rgba(255, 77, 79, 0.1);
}

.menu-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.menu-icon svg {
  width: 100%;
  height: 100%;
}

.menu-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-divider {
  height: 1px;
  margin: 4px 8px;
  background-color: var(--color-border, #e0e0e0);
}

/* Transition */
.context-menu-enter-active,
.context-menu-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.context-menu-enter-from,
.context-menu-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
