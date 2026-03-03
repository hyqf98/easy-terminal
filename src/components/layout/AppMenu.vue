<script setup lang="ts">
/**
 * AppMenu - Dropdown menu for the application header
 * Provides quick access to common actions
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppIcon from '@/components/common/AppIcon.vue';

const { t } = useI18n();

const props = defineProps<{
  visible: boolean;
  x: number;
  y: number;
}>();

const emit = defineEmits<{
  (e: 'hide'): void;
  (e: 'new-terminal'): void;
  (e: 'open-settings'): void;
  (e: 'open-ssh'): void;
  (e: 'toggle-sidebar'): void;
}>();

const menuRef = ref<HTMLDivElement | null>(null);

// Menu items
const menuItems = computed(() => [
  {
    id: 'new-terminal',
    icon: 'plus',
    label: t('header.newTerminal'),
    shortcut: 'Ctrl+Shift+T',
    action: () => emit('new-terminal'),
  },
  {
    id: 'ssh-manager',
    icon: 'ssh',
    label: t('header.sshManager'),
    shortcut: 'Ctrl+Shift+S',
    action: () => emit('open-ssh'),
  },
  { type: 'separator' },
  {
    id: 'toggle-sidebar',
    icon: 'sidebar',
    label: t('header.toggleSidebar'),
    shortcut: 'Ctrl+B',
    action: () => emit('toggle-sidebar'),
  },
  {
    id: 'settings',
    icon: 'settings',
    label: t('header.settings'),
    shortcut: 'Ctrl+,',
    action: () => emit('open-settings'),
  },
]);

// Menu position style
const menuPosition = computed(() => ({
  left: `${props.x}px`,
  top: `${props.y}px`,
}));

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
  if ('action' in item && item.action) {
    item.action();
    emit('hide');
  }
}

// Lifecycle
onMounted(() => {
  setTimeout(() => {
    document.addEventListener('click', handleClickOutside);
  }, 100);
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="app-menu">
      <div
        v-if="visible"
        ref="menuRef"
        class="app-menu"
        :style="menuPosition"
        @click.stop
      >
        <template v-for="(item, index) in menuItems" :key="item.id || `separator-${index}`">
          <div v-if="'type' in item && item.type === 'separator'" class="menu-separator"></div>
          <button
            v-else
            class="menu-item"
            type="button"
            @click="handleItemClick(item)"
          >
            <span class="menu-icon">
              <AppIcon :name="item.icon" :size="16" />
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
.app-menu {
  position: fixed;
  z-index: 9999;
  min-width: 180px;
  background-color: var(--color-menu-bg, var(--color-card));
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: 4px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--color-text-2);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.1s ease;
}

.menu-item:hover {
  background-color: var(--color-hover);
  color: var(--color-text-1);
}

.menu-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.menu-label {
  flex: 1;
}

.menu-shortcut {
  font-size: 11px;
  color: var(--color-text-3);
  opacity: 0.7;
}

.menu-separator {
  height: 1px;
  background-color: var(--color-border);
  margin: 4px 8px;
}

/* Transition */
.app-menu-enter-active,
.app-menu-leave-active {
  transition: all 0.15s ease;
}

.app-menu-enter-from,
.app-menu-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
