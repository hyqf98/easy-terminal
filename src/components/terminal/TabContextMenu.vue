<script setup lang="ts">
/**
 * TabContextMenu - Right-click context menu for terminal tabs
 * Provides actions like close, close others, split, etc.
 */
import { computed, ref, onMounted, onUnmounted } from 'vue';
import type { TerminalSession } from '@/types';

const props = defineProps<{
  /** Whether the menu is visible */
  visible: boolean;
  /** X position of the menu */
  x: number;
  /** Y position of the menu */
  y: number;
  /** The session this menu is for */
  session: TerminalSession | null;
  /** Total number of sessions */
  totalSessions: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'close-others', sessionId: string): void;
  (e: 'close-to-right', sessionId: string): void;
  (e: 'duplicate', sessionId: string): void;
  (e: 'split-horizontal', sessionId: string): void;
  (e: 'split-vertical', sessionId: string): void;
  (e: 'rename', sessionId: string): void;
  (e: 'copy-cwd', sessionId: string): void;
  (e: 'hide'): void;
}>();

const menuRef = ref<HTMLDivElement | null>(null);

// Adjusted position to keep menu in viewport
const menuPosition = computed(() => {
  let x = props.x;
  let y = props.y;

  // Adjust if would go off-screen
  if (menuRef.value) {
    const rect = menuRef.value.getBoundingClientRect();
    const menuWidth = rect.width || 180;
    const menuHeight = rect.height || 250;

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 8;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 8;
    }
  }

  return { left: `${x}px`, top: `${y}px` };
});

// Menu items
const menuItems = computed(() => {
  if (!props.session) return [];

  return [
    {
      id: 'duplicate',
      label: 'Duplicate Terminal',
      icon: 'copy',
      action: () => emit('duplicate', props.session!.id),
    },
    {
      id: 'split-h',
      label: 'Split Horizontal',
      icon: 'split-horizontal',
      shortcut: 'Ctrl+Shift+\\',
      action: () => emit('split-horizontal', props.session!.id),
    },
    {
      id: 'split-v',
      label: 'Split Vertical',
      icon: 'split-vertical',
      shortcut: 'Ctrl+Shift+-',
      action: () => emit('split-vertical', props.session!.id),
    },
    { type: 'separator' },
    {
      id: 'rename',
      label: 'Rename Tab',
      icon: 'edit',
      action: () => emit('rename', props.session!.id),
    },
    {
      id: 'copy-cwd',
      label: 'Copy Current Path',
      icon: 'folder',
      action: () => emit('copy-cwd', props.session!.id),
    },
    { type: 'separator' },
    {
      id: 'close',
      label: 'Close Tab',
      icon: 'close',
      shortcut: 'Ctrl+W',
      action: () => emit('close'),
    },
    {
      id: 'close-others',
      label: 'Close Other Tabs',
      icon: 'close-others',
      disabled: props.totalSessions <= 1,
      action: () => emit('close-others', props.session!.id),
    },
    {
      id: 'close-to-right',
      label: 'Close Tabs to Right',
      icon: 'close-right',
      disabled: props.totalSessions <= 1,
      action: () => emit('close-to-right', props.session!.id),
    },
  ];
});

// Handle click outside
function handleClickOutside(event: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    emit('hide');
  }
}

// Handle keyboard escape
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('hide');
  }
}

// Handle menu item click
function handleItemClick(item: typeof menuItems.value[number]) {
  if ('action' in item && item.action && !item.disabled) {
    item.action();
    emit('hide');
  }
}

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="context-menu">
      <div
        v-if="visible"
        ref="menuRef"
        class="tab-context-menu"
        :style="menuPosition"
      >
        <template v-for="(item, index) in menuItems" :key="item.id || `separator-${index}`">
          <div v-if="'type' in item && item.type === 'separator'" class="menu-separator"></div>
          <button
            v-else
            class="menu-item"
            :class="{ 'is-disabled': item.disabled }"
            type="button"
            @click="handleItemClick(item)"
          >
            <span class="menu-icon">
              <svg v-if="item.icon === 'copy'" viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M19 21H8V7h11m0-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2m-3-4H4a2 2 0 0 0-2 2v14h2V3h12V1z"/>
              </svg>
              <svg v-else-if="item.icon === 'split-horizontal'" viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M3 5v14h18V5H3zm8 12H5V7h6v10zm2 0V7h6v10h-6z"/>
              </svg>
              <svg v-else-if="item.icon === 'split-vertical'" viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M3 3h18v18H3V3zm8 16V5H5v14h6zm2 0h6V5h-6v14z"/>
              </svg>
              <svg v-else-if="item.icon === 'edit'" viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M20.71 7.04c.39-.39.39-1.04 0-1.41l-2.34-2.34c-.37-.39-1.02-.39-1.41 0l-1.84 1.83 3.75 3.75M3 17.25V21h3.75L17.81 9.93l-3.75-3.75L3 17.25z"/>
              </svg>
              <svg v-else-if="item.icon === 'folder'" viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
              </svg>
              <svg v-else-if="item.icon === 'close'" viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
              </svg>
              <svg v-else-if="item.icon === 'close-others'" viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" width="16" height="16">
                <path fill="none" d="M0 0h24v24H0z"/>
              </svg>
            </span>
            <span class="menu-label">{{ item.label }}</span>
            <span v-if="item.shortcut" class="menu-shortcut">{{ item.shortcut }}</span>
          </button>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.tab-context-menu {
  position: fixed;
  z-index: 9999;
  min-width: 180px;
  background-color: var(--color-menu-bg, #252526);
  border: 1px solid var(--color-border, #3d3d3d);
  border-radius: 6px;
  padding: 4px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: var(--color-text-2, #d4d4d4);
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.1s ease;
}

.menu-item:hover:not(.is-disabled) {
  background-color: var(--color-menu-hover, #094771);
}

.menu-item.is-disabled {
  color: var(--color-text-4, #5a5a5a);
  cursor: not-allowed;
}

.menu-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.menu-label {
  flex: 1;
}

.menu-shortcut {
  font-size: 11px;
  color: var(--color-text-3, #8c8c8c);
}

.menu-separator {
  height: 1px;
  margin: 4px 8px;
  background-color: var(--color-border, #3d3d3d);
}

/* Transition */
.context-menu-enter-active,
.context-menu-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}

.context-menu-enter-from,
.context-menu-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
