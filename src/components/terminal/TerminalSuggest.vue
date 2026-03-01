<script setup lang="ts">
/**
 * TerminalSuggest - Auto-complete suggestion dropdown for terminal
 */
import { ref, computed, watch, nextTick } from 'vue';
import type { SuggestionItem } from '@/types/suggestion';

const props = withDefaults(
  defineProps<{
    /** Suggestion items to display */
    items: SuggestionItem[];
    /** Whether the suggest panel is visible */
    visible?: boolean;
    /** Currently selected index */
    selectedIndex?: number;
    /** X position */
    x?: number;
    /** Y position */
    y?: number;
    /** Maximum visible items */
    maxVisibleItems?: number;
  }>(),
  {
    visible: false,
    selectedIndex: 0,
    x: 0,
    y: 0,
    maxVisibleItems: 8,
  }
);

const emit = defineEmits<{
  (e: 'select', item: SuggestionItem): void;
  (e: 'hover', index: number): void;
  (e: 'close'): void;
}>();

// Refs
const listRef = ref<HTMLDivElement | null>(null);

// Computed
const visibleItems = computed(() => {
  return props.items.slice(0, props.maxVisibleItems);
});

const listStyle = computed(() => ({
  left: `${props.x}px`,
  top: `${props.y}px`,
  maxHeight: `${props.maxVisibleItems * 28}px`,
}));

// Methods
function getTypeLabel(type: string): string {
  switch (type) {
    case 'command':
      return 'CMD';
    case 'file':
      return 'FILE';
    case 'directory':
      return 'DIR';
    case 'history':
      return 'HIST';
    case 'path':
      return 'PATH';
    case 'argument':
      return 'ARG';
    case 'option':
      return 'OPT';
    default:
      return '';
  }
}

function getTypeClass(type: string): string {
  return `type-${type}`;
}

function handleItemClick(item: SuggestionItem): void {
  emit('select', item);
}

function handleItemHover(index: number): void {
  emit('hover', index);
}

// Scroll selected item into view
watch(
  () => props.selectedIndex,
  async (index) => {
    await nextTick();
    if (listRef.value) {
      const selectedEl = listRef.value.children[index] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }
);
</script>

<template>
  <Transition name="suggest-fade">
    <div
      v-if="visible && items.length > 0"
      ref="listRef"
      class="terminal-suggest"
      :style="listStyle"
    >
      <div
        v-for="(item, index) in visibleItems"
        :key="item.id"
        class="suggest-item"
        :class="{ 'is-selected': index === selectedIndex }"
        @click="handleItemClick(item)"
        @mouseenter="handleItemHover(index)"
      >
        <div class="suggest-icon" :class="getTypeClass(item.type)">
          <svg
            v-if="item.type === 'command'"
            class="icon-svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M4 17l6-6-6-6M12 19h8" />
          </svg>
          <svg
            v-else-if="item.type === 'directory'"
            class="icon-svg"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path
              d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"
            />
          </svg>
          <svg
            v-else-if="item.type === 'file'"
            class="icon-svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14,2 14,8 20,8" />
          </svg>
          <svg
            v-else-if="item.type === 'history'"
            class="icon-svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
          <svg v-else class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <div class="suggest-content">
          <span class="suggest-label">{{ item.label }}</span>
          <span v-if="item.description" class="suggest-description">
            {{ item.description }}
          </span>
        </div>

        <span class="suggest-type" :class="getTypeClass(item.type)">
          {{ getTypeLabel(item.type) }}
        </span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.terminal-suggest {
  position: fixed;
  z-index: 10000;
  min-width: 280px;
  max-width: 500px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  overflow-y: auto;
  overflow-x: hidden;
}

.suggest-item {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  cursor: pointer;
  transition: background-color 0.1s ease;
}

.suggest-item:hover,
.suggest-item.is-selected {
  background-color: var(--color-primary-bg);
}

.suggest-item.is-selected {
  background-color: var(--color-primary-bg);
}

.suggest-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  margin-right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.suggest-icon.type-command {
  color: #569cd6;
}

.suggest-icon.type-directory {
  color: #dcb67a;
}

.suggest-icon.type-file {
  color: #9cdcfe;
}

.suggest-icon.type-history {
  color: #ce9178;
}

.icon-svg {
  width: 16px;
  height: 16px;
}

.suggest-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.suggest-label {
  font-size: 13px;
  font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suggest-description {
  font-size: 11px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suggest-type {
  flex-shrink: 0;
  margin-left: 8px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 500;
  border-radius: 3px;
  text-transform: uppercase;
}

.suggest-type.type-command {
  background: rgba(86, 156, 214, 0.2);
  color: #569cd6;
}

.suggest-type.type-directory {
  background: rgba(220, 182, 122, 0.2);
  color: #dcb67a;
}

.suggest-type.type-file {
  background: rgba(156, 220, 254, 0.2);
  color: #9cdcfe;
}

.suggest-type.type-history {
  background: rgba(206, 145, 120, 0.2);
  color: #ce9178;
}

/* Transition */
.suggest-fade-enter-active,
.suggest-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.suggest-fade-enter-from,
.suggest-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
