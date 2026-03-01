<script setup lang="ts">
/**
 * AppSidebar - Collapsible sidebar component
 * Contains file explorer and quick actions
 */
import { computed, ref, watch } from 'vue';
import AppIcon from '@/components/common/AppIcon.vue';
import { useSettingsStore } from '@/stores';

withDefaults(defineProps<{
  collapsible?: boolean;
  showQuickActions?: boolean;
}>(), {
  collapsible: true,
  showQuickActions: true,
});

const emit = defineEmits<{
  (e: 'resize', width: number): void;
  (e: 'collapse'): void;
  (e: 'expand'): void;
  (e: 'quick-action', action: string): void;
}>();

const settingsStore = useSettingsStore();

// Local state
const isResizing = ref(false);
const localWidth = ref(settingsStore.sidebarWidth);

// Computed
const isCollapsed = computed(() => !settingsStore.showSidebar);
const effectiveWidth = computed(() => {
  if (isCollapsed.value) {
    return 0;
  }
  return localWidth.value;
});

// Watch for external width changes
watch(() => settingsStore.sidebarWidth, (newWidth) => {
  localWidth.value = newWidth;
});

// Methods
function toggleSidebar() {
  settingsStore.toggleSidebar();
  if (isCollapsed.value) {
    emit('collapse');
  } else {
    emit('expand');
  }
}

function startResize(event: MouseEvent) {
  if (isCollapsed.value) return;

  isResizing.value = true;
  const startX = event.clientX;
  const startWidth = localWidth.value;

  function onMouseMove(e: MouseEvent) {
    const delta = e.clientX - startX;
    const newWidth = Math.max(100, Math.min(600, startWidth + delta));
    localWidth.value = newWidth;
    settingsStore.setSidebarWidth(newWidth);
    emit('resize', newWidth);
  }

  function onMouseUp() {
    isResizing.value = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  document.body.style.cursor = 'ew-resize';
  document.body.style.userSelect = 'none';
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function handleQuickAction(action: string) {
  emit('quick-action', action);
}
</script>

<template>
  <aside
    class="app-sidebar"
    :class="{
      'is-collapsed': isCollapsed,
      'is-resizing': isResizing,
    }"
    :style="{ width: `${effectiveWidth}px` }"
  >
    <!-- Sidebar content (visible when expanded) -->
    <div v-if="!isCollapsed" class="sidebar-content">
      <!-- Quick actions bar -->
      <div v-if="showQuickActions" class="quick-actions">
        <button
          class="quick-action-btn"
          title="New Terminal"
          @click="handleQuickAction('new-terminal')"
        >
          <AppIcon name="plus" :size="16" />
        </button>
        <button
          class="quick-action-btn"
          title="SSH Connections"
          @click="handleQuickAction('ssh')"
        >
          <AppIcon name="terminal" :size="16" />
        </button>
        <button
          class="quick-action-btn"
          title="Open Folder"
          @click="handleQuickAction('open-folder')"
        >
          <AppIcon name="folder" :size="16" />
        </button>
        <button
          class="quick-action-btn"
          title="Settings"
          @click="handleQuickAction('settings')"
        >
          <AppIcon name="settings" :size="16" />
        </button>
      </div>

      <!-- File explorer slot -->
      <div class="sidebar-main">
        <slot>
          <!-- Default placeholder -->
          <div class="placeholder">
            <AppIcon name="folder" :size="24" color="var(--color-text-3)" />
            <span>File Explorer</span>
          </div>
        </slot>
      </div>
    </div>

    <!-- Resize handle -->
    <div
      v-if="!isCollapsed && collapsible"
      class="resize-handle"
      @mousedown="startResize"
    />

    <!-- Collapse toggle button (visible on the edge) -->
    <button
      v-if="collapsible"
      class="collapse-btn"
      :title="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      @click="toggleSidebar"
    >
      <AppIcon
        name="chevron-right"
        :size="12"
        :class="{ 'is-rotated': !isCollapsed }"
      />
    </button>
  </aside>
</template>

<style scoped>
.app-sidebar {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-width: 600px;
  background-color: var(--color-card);
  border-right: 1px solid var(--color-border);
  transition: width var(--transition-duration) ease;
  overflow: hidden;
}

.app-sidebar.is-collapsed {
  width: 0 !important;
  min-width: 0;
  border-right: none;
}

.app-sidebar.is-resizing {
  transition: none;
}

.sidebar-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 100px;
  overflow: hidden;
}

.quick-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--color-border);
}

.quick-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-2);
  cursor: pointer;
  border-radius: var(--border-radius);
  transition: all var(--transition-duration-fast) ease;
}

.quick-action-btn:hover {
  background-color: var(--color-hover);
  color: var(--color-text-1);
}

.quick-action-btn:active {
  background-color: var(--color-pressed);
}

.sidebar-main {
  flex: 1;
  overflow: auto;
}

/* Resize handle */
.resize-handle {
  position: absolute;
  top: 0;
  right: -3px;
  width: 6px;
  height: 100%;
  cursor: ew-resize;
  z-index: 10;
}

.resize-handle:hover {
  background-color: var(--color-primary);
  opacity: 0.5;
}

/* Collapse button */
.collapse-btn {
  position: absolute;
  top: 50%;
  right: -10px;
  transform: translateY(-50%);
  width: 20px;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: 0 4px 4px 0;
  background-color: var(--color-card);
  color: var(--color-text-3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 11;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
  transition: all var(--transition-duration-fast) ease;
}

.collapse-btn:hover {
  background-color: var(--color-hover);
  color: var(--color-text-1);
}

.collapse-btn .is-rotated {
  transform: rotate(180deg);
}

/* Placeholder */
.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 100%;
  color: var(--color-text-3);
  font-size: 13px;
}
</style>
