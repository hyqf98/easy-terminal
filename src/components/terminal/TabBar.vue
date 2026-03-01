<script setup lang="ts">
/**
 * TabBar - Tab strip component for managing terminal tabs
 * Supports drag-to-reorder, context menu, and new tab button
 */
import { ref, computed } from 'vue';
import type { TerminalSession } from '@/types';
import TerminalTab from './TerminalTab.vue';

const props = defineProps<{
  /** List of sessions to display as tabs */
  sessions: TerminalSession[];
  /** ID of the currently active session */
  activeSessionId: string | null;
  /** Whether to show the new tab button */
  showNewTab?: boolean;
}>();

const emit = defineEmits<{
  (e: 'tab-click', sessionId: string): void;
  (e: 'tab-close', sessionId: string): void;
  (e: 'new-tab'): void;
  (e: 'reorder', fromIndex: number, toIndex: number): void;
  (e: 'contextmenu', sessionId: string, event: MouseEvent): void;
}>();

// Drag state
const draggedIndex = ref<number | null>(null);
const dropTargetIndex = ref<number | null>(null);
const tabBarRef = ref<HTMLDivElement | null>(null);

// Sorted sessions based on current order
const sortedSessions = computed(() => props.sessions);

// Show drop indicator
const showDropIndicator = computed(() => {
  return dropTargetIndex.value !== null && draggedIndex.value !== null;
});

// Calculate drop indicator position
const dropIndicatorLeft = computed(() => {
  if (!tabBarRef.value || dropTargetIndex.value === null) return 0;

  const tabs = tabBarRef.value.querySelectorAll('.terminal-tab');
  if (tabs.length === 0) return 8;

  if (dropTargetIndex.value >= tabs.length) {
    const lastTab = tabs[tabs.length - 1] as HTMLElement;
    return lastTab.offsetLeft + lastTab.offsetWidth + 2;
  }

  const targetTab = tabs[dropTargetIndex.value] as HTMLElement;
  return targetTab.offsetLeft - 2;
});

// Handle tab click
function handleTabClick(sessionId: string) {
  emit('tab-click', sessionId);
}

// Handle tab close
function handleTabClose(sessionId: string) {
  emit('tab-close', sessionId);
}

// Handle new tab
function handleNewTab() {
  emit('new-tab');
}

// Handle drag start
function handleDragStart(index: number, event: DragEvent) {
  draggedIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', index.toString());
  }
}

// Handle drag end
function handleDragEnd() {
  draggedIndex.value = null;
  dropTargetIndex.value = null;
}

// Handle drag over
function handleDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }

  // Calculate drop target
  if (tabBarRef.value) {
    const tabs = tabBarRef.value.querySelectorAll('.terminal-tab');
    let newDropTarget = props.sessions.length;

    for (let i = 0; i < tabs.length; i++) {
      const rect = tabs[i].getBoundingClientRect();
      const midX = rect.left + rect.width / 2;

      if (event.clientX < midX) {
        newDropTarget = i;
        break;
      }
    }

    dropTargetIndex.value = newDropTarget;
  }
}

// Handle drop
function handleDrop(event: DragEvent) {
  event.preventDefault();

  if (draggedIndex.value !== null && dropTargetIndex.value !== null) {
    if (draggedIndex.value !== dropTargetIndex.value) {
      emit('reorder', draggedIndex.value, dropTargetIndex.value);
    }
  }

  draggedIndex.value = null;
  dropTargetIndex.value = null;
}

// Handle context menu
function handleContextMenu(sessionId: string, event: MouseEvent) {
  emit('contextmenu', sessionId, event);
}

// Expose for parent component
defineExpose({
  tabBarRef,
});
</script>

<template>
  <div
    ref="tabBarRef"
    class="tab-bar"
    @dragover="handleDragOver"
    @drop="handleDrop"
  >
    <div class="tabs-wrapper">
      <TransitionGroup name="tab-list" tag="div" class="tabs-list">
        <TerminalTab
          v-for="(session, index) in sortedSessions"
          :key="session.id"
          :session="session"
          :active="session.id === activeSessionId"
          :dragging="draggedIndex === index"
          @click="handleTabClick(session.id)"
          @close="handleTabClose(session.id)"
          @dragstart="handleDragStart(index, $event)"
          @dragend="handleDragEnd"
          @contextmenu="handleContextMenu(session.id, $event)"
        />
      </TransitionGroup>
    </div>

    <!-- Drop indicator -->
    <div
      v-if="showDropIndicator"
      class="drop-indicator"
      :style="{ left: dropIndicatorLeft + 'px' }"
    ></div>

    <!-- New tab button -->
    <button
      v-if="showNewTab !== false"
      class="new-tab-button"
      type="button"
      title="New terminal (Ctrl+Shift+T)"
      @click="handleNewTab"
    >
      <svg viewBox="0 0 24 24" width="16" height="16">
        <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.tab-bar {
  display: flex;
  align-items: center;
  height: 36px;
  background-color: var(--color-tab-bar-bg, #252526);
  padding: 0 8px;
  position: relative;
  overflow: hidden;
}

.tabs-wrapper {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.tabs-wrapper::-webkit-scrollbar {
  display: none;
}

.tabs-list {
  display: flex;
  gap: 2px;
  white-space: nowrap;
}

/* Tab transition animations */
.tab-list-move,
.tab-list-enter-active,
.tab-list-leave-active {
  transition: all 0.2s ease;
}

.tab-list-enter-from,
.tab-list-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.tab-list-leave-active {
  position: absolute;
}

.drop-indicator {
  position: absolute;
  top: 4px;
  bottom: 4px;
  width: 2px;
  background-color: var(--color-primary, #007acc);
  border-radius: 1px;
  pointer-events: none;
  z-index: 10;
}

.new-tab-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  margin-left: 4px;
  border: none;
  background: transparent;
  color: var(--color-text-3, #8c8c8c);
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
  flex-shrink: 0;
}

.new-tab-button:hover {
  background-color: var(--color-hover, #3d3d3d);
  color: var(--color-text-1, #ffffff);
}
</style>
