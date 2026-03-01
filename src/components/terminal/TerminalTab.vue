<script setup lang="ts">
/**
 * TerminalTab - Individual tab component for terminal sessions
 * Displays session title, status icon, and close button
 */
import { computed } from 'vue';
import type { TerminalSession } from '@/types';

const props = defineProps<{
  /** Session data */
  session: TerminalSession;
  /** Whether this tab is active */
  active?: boolean;
  /** Whether this tab is being dragged */
  dragging?: boolean;
}>();

const emit = defineEmits<{
  (e: 'click'): void;
  (e: 'close'): void;
  (e: 'dragstart', event: DragEvent): void;
  (e: 'dragend'): void;
  (e: 'contextmenu', event: MouseEvent): void;
}>();

// Status color class
const statusClass = computed(() => {
  return `status-${props.session.status}`;
});

// Tab title (truncate if too long)
const displayTitle = computed(() => {
  const title = props.session.title || 'Terminal';
  return title.length > 20 ? title.slice(0, 18) + '...' : title;
});

function handleClick() {
  emit('click');
}

function handleClose(event: MouseEvent) {
  event.stopPropagation();
  emit('close');
}

function handleDragStart(event: DragEvent) {
  emit('dragstart', event);
}

function handleDragEnd() {
  emit('dragend');
}

function handleContextMenu(event: MouseEvent) {
  event.preventDefault();
  emit('contextmenu', event);
}
</script>

<template>
  <div
    class="terminal-tab"
    :class="{
      'is-active': active,
      'is-dragging': dragging,
      [statusClass]: true,
    }"
    draggable="true"
    @click="handleClick"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @contextmenu="handleContextMenu"
  >
    <!-- Type icon -->
    <span class="tab-icon" :class="`type-${session.type}`">
      <svg v-if="session.type === 'local'" viewBox="0 0 24 24" width="14" height="14">
        <path fill="currentColor" d="M20 19V7H4v12h16m0-16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16M7.5 13l2.5 3 2.5-3-2.5-3-2.5 3m5 0l2.5 3 2.5-3-2.5-3-2.5 3z"/>
      </svg>
      <svg v-else-if="session.type === 'ssh'" viewBox="0 0 24 24" width="14" height="14">
        <path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
      </svg>
      <svg v-else viewBox="0 0 24 24" width="14" height="14">
        <path fill="currentColor" d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM5 15h14v3H5z"/>
      </svg>
    </span>

    <!-- Title -->
    <span class="tab-title" :title="session.title">
      {{ displayTitle }}
    </span>

    <!-- Status indicator -->
    <span class="tab-status" :class="statusClass">
      <svg v-if="session.status === 'connecting'" class="spin" viewBox="0 0 24 24" width="12" height="12">
        <path fill="currentColor" d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"/>
      </svg>
      <svg v-else-if="session.status === 'error'" viewBox="0 0 24 24" width="12" height="12">
        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      <span v-else class="status-dot"></span>
    </span>

    <!-- Close button -->
    <button
      class="tab-close"
      type="button"
      title="Close tab"
      @click="handleClose"
    >
      <svg viewBox="0 0 24 24" width="14" height="14">
        <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.terminal-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  min-width: 100px;
  max-width: 180px;
  height: 32px;
  background-color: var(--color-tab-inactive, #2d2d2d);
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.15s ease;
  position: relative;
}

.terminal-tab:hover {
  background-color: var(--color-tab-hover, #3d3d3d);
}

.terminal-tab.is-active {
  background-color: var(--color-tab-active, #1e1e1e);
}

.terminal-tab.is-dragging {
  opacity: 0.5;
}

.tab-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-3, #8c8c8c);
  flex-shrink: 0;
}

.tab-icon.type-local {
  color: var(--color-success, #0dbc79);
}

.tab-icon.type-ssh {
  color: var(--color-info, #2472c8);
}

.tab-icon.type-docker {
  color: var(--color-warning, #0db7ed);
}

.tab-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--color-text-2, #d4d4d4);
}

.terminal-tab.is-active .tab-title {
  color: var(--color-text-1, #ffffff);
}

.tab-status {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--color-success, #0dbc79);
}

.tab-status.status-connecting .status-dot,
.tab-status.status-connecting svg {
  color: var(--color-warning, #e5e510);
}

.tab-status.status-disconnected .status-dot {
  background-color: var(--color-text-3, #8c8c8c);
}

.tab-status.status-error .status-dot,
.tab-status.status-error svg {
  color: var(--color-error, #cd3131);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.tab-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-3, #8c8c8c);
  border-radius: 3px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease, color 0.15s ease, background-color 0.15s ease;
}

.terminal-tab:hover .tab-close,
.terminal-tab.is-active .tab-close {
  opacity: 1;
}

.tab-close:hover {
  color: var(--color-text-1, #ffffff);
  background-color: var(--color-error, #cd3131);
}
</style>
