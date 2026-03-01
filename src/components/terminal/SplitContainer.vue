<script setup lang="ts">
/**
 * SplitContainer - Recursive split pane container
 * Supports horizontal and vertical splitting with drag-to-resize
 */
import { ref, computed } from 'vue';

export type SplitDirection = 'horizontal' | 'vertical';

export interface SplitNode {
  id: string;
  type: 'split';
  direction: SplitDirection;
  children: [SplitPane, SplitPane];
  sizes: [number, number]; // Percentages that sum to 100
}

export interface PaneNode {
  id: string;
  type: 'pane';
  sessionId?: string;
}

export type SplitPane = SplitNode | PaneNode;

// Props
const props = defineProps<{
  /** Root node of the split tree */
  root: SplitPane;
  /** Direction for this container */
  direction?: SplitDirection;
  /** Minimum pane size in percent */
  minSize?: number;
}>();

const emit = defineEmits<{
  (e: 'resize', paneId: string, size: number): void;
  (e: 'focus', paneId: string): void;
}>();

// State
const activeSplitId = ref<string | null>(null);
const isDragging = ref(false);

// Computed
const isSplit = computed(() => props.root.type === 'split');
const splitNode = computed(() => isSplit.value ? props.root as SplitNode : null);

// Get split direction CSS
const containerStyle = computed((): Record<string, string> => {
  if (!isSplit.value || !splitNode.value) return {};
  return {
    flexDirection: splitNode.value.direction === 'horizontal' ? 'row' : 'column',
  };
});

// Calculate sizes
const firstSize = computed(() => {
  if (!splitNode.value) return 100;
  return splitNode.value.sizes[0];
});

const secondSize = computed(() => {
  if (!splitNode.value) return 0;
  return splitNode.value.sizes[1];
});

// Split bar position style
const firstPaneStyle = computed(() => {
  const size = firstSize.value;
  if (splitNode.value?.direction === 'horizontal') {
    return { width: `${size}%` };
  }
  return { height: `${size}%` };
});

const secondPaneStyle = computed(() => {
  const size = secondSize.value;
  if (splitNode.value?.direction === 'horizontal') {
    return { width: `${size}%` };
  }
  return { height: `${size}%` };
});

// Handle split bar drag
function handleDragStart(event: MouseEvent | TouchEvent) {
  if (!splitNode.value) return;

  isDragging.value = true;
  activeSplitId.value = splitNode.value.id;

  const startX = 'touches' in event ? event.touches[0].clientX : event.clientX;
  const startY = 'touches' in event ? event.touches[0].clientY : event.clientY;
  const startSizes = [...splitNode.value.sizes];

  function handleMove(moveEvent: MouseEvent | TouchEvent) {
    if (!splitNode.value) return;

    const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
    const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;

    const container = (event.target as HTMLElement).closest('.split-container');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const totalSize = splitNode.value.direction === 'horizontal' ? rect.width : rect.height;

    const delta = splitNode.value.direction === 'horizontal'
      ? currentX - startX
      : currentY - startY;

    const minSize = props.minSize || 10; // 10% minimum
    const maxSize = 100 - minSize;

    let newFirstSize = startSizes[0] + (delta / totalSize) * 100;
    newFirstSize = Math.max(minSize, Math.min(maxSize, newFirstSize));

    // Emit resize event
    emit('resize', splitNode.value.children[0].id, newFirstSize);
  }

  function handleEnd() {
    isDragging.value = false;
    activeSplitId.value = null;
    document.removeEventListener('mousemove', handleMove);
    document.removeEventListener('mouseup', handleEnd);
    document.removeEventListener('touchmove', handleMove);
    document.removeEventListener('touchend', handleEnd);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  document.addEventListener('mousemove', handleMove);
  document.addEventListener('mouseup', handleEnd);
  document.addEventListener('touchmove', handleMove);
  document.addEventListener('touchend', handleEnd);
  document.body.style.cursor = splitNode.value.direction === 'horizontal' ? 'col-resize' : 'row-resize';
  document.body.style.userSelect = 'none';
}

// Handle pane focus
function handlePaneFocus(paneId: string) {
  emit('focus', paneId);
}
</script>

<template>
  <div class="split-container" :style="containerStyle">
    <!-- If this is a split node -->
    <template v-if="isSplit && splitNode">
      <!-- First child -->
      <div class="split-pane" :style="firstPaneStyle">
        <SplitContainer
          :root="splitNode.children[0]"
          :min-size="minSize"
          @resize="(id: string, size: number) => emit('resize', id, size)"
          @focus="handlePaneFocus"
        >
          <template #default="slotProps: { pane: SplitPane; sessionId: string | undefined }">
            <slot :pane="slotProps.pane" :session-id="slotProps.sessionId"></slot>
          </template>
        </SplitContainer>
      </div>

      <!-- Split bar -->
      <div
        class="split-bar"
        :class="{
          'is-horizontal': splitNode.direction === 'horizontal',
          'is-vertical': splitNode.direction === 'vertical',
          'is-dragging': isDragging,
        }"
        @mousedown="handleDragStart"
        @touchstart="handleDragStart"
      >
        <div class="split-bar-handle"></div>
      </div>

      <!-- Second child -->
      <div class="split-pane" :style="secondPaneStyle">
        <SplitContainer
          :root="splitNode.children[1]"
          :min-size="minSize"
          @resize="(id: string, size: number) => emit('resize', id, size)"
          @focus="handlePaneFocus"
        >
          <template #default="slotProps: { pane: SplitPane; sessionId: string | undefined }">
            <slot :pane="slotProps.pane" :session-id="slotProps.sessionId"></slot>
          </template>
        </SplitContainer>
      </div>
    </template>

    <!-- If this is a leaf pane -->
    <template v-else>
      <slot :pane="root" :session-id="(root as PaneNode).sessionId"></slot>
    </template>
  </div>
</template>

<style scoped>
.split-container {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.split-pane {
  overflow: hidden;
  flex-shrink: 0;
}

.split-bar {
  flex-shrink: 0;
  background-color: var(--color-split-bar, #3d3d3d);
  transition: background-color 0.15s ease;
  position: relative;
  z-index: 10;
}

.split-bar.is-horizontal {
  width: 4px;
  cursor: col-resize;
}

.split-bar.is-vertical {
  height: 4px;
  cursor: row-resize;
}

.split-bar:hover,
.split-bar.is-dragging {
  background-color: var(--color-primary, #007acc);
}

.split-bar-handle {
  position: absolute;
  background-color: transparent;
}

.split-bar.is-horizontal .split-bar-handle {
  left: -4px;
  right: -4px;
  top: 0;
  bottom: 0;
}

.split-bar.is-vertical .split-bar-handle {
  top: -4px;
  bottom: -4px;
  left: 0;
  right: 0;
}
</style>
