<script setup lang="ts">
/**
 * SplitPane - Resizable split panel component
 * Supports horizontal and vertical splitting
 */
import { ref, computed } from 'vue';

// Types
type SplitDirection = 'horizontal' | 'vertical';

const props = withDefaults(defineProps<{
  direction?: SplitDirection;
  initialSplit?: number; // Percentage (0-100)
  minSize?: number; // Minimum size in pixels
  maxSize?: number; // Maximum size in pixels
  splitterSize?: number;
  disabled?: boolean;
}>(), {
  direction: 'horizontal',
  initialSplit: 50,
  minSize: 100,
  maxSize: Infinity,
  splitterSize: 4,
  disabled: false,
});

const emit = defineEmits<{
  (e: 'resize', split: number): void;
  (e: 'drag-start'): void;
  (e: 'drag-end'): void;
}>();

// State
const isDragging = ref(false);
const split = ref(props.initialSplit);
const containerRef = ref<HTMLElement | null>(null);

// Computed
const containerSize = computed(() => {
  if (!containerRef.value) return 0;
  return props.direction === 'horizontal'
    ? containerRef.value.offsetWidth
    : containerRef.value.offsetHeight;
});

const firstPaneStyle = computed(() => {
  if (props.direction === 'horizontal') {
    return { width: `${split.value}%` };
  }
  return { height: `${split.value}%` };
});

const secondPaneStyle = computed(() => {
  if (props.direction === 'horizontal') {
    return { width: `${100 - split.value}%` };
  }
  return { height: `${100 - split.value}%` };
});

const splitterStyle = computed(() => {
  if (props.direction === 'horizontal') {
    return { width: `${props.splitterSize}px` };
  }
  return { height: `${props.splitterSize}px` };
});

// Methods
function startDrag(event: MouseEvent) {
  if (props.disabled) return;

  event.preventDefault();
  isDragging.value = true;
  emit('drag-start');

  const startSplit = split.value;
  const startPos = props.direction === 'horizontal' ? event.clientX : event.clientY;
  const containerStartSize = containerSize.value;

  function onMouseMove(e: MouseEvent) {
    const currentPos = props.direction === 'horizontal' ? e.clientX : e.clientY;
    const delta = currentPos - startPos;
    const deltaPercent = (delta / containerStartSize) * 100;
    let newSplit = startSplit + deltaPercent;

    // Clamp to min/max
    const minPercent = (props.minSize / containerStartSize) * 100;
    const maxPercent = props.maxSize === Infinity ? 100 : (props.maxSize / containerStartSize) * 100;
    newSplit = Math.max(minPercent, Math.min(maxPercent - minPercent, newSplit));
    newSplit = Math.max(0, Math.min(100, newSplit));

    split.value = newSplit;
    emit('resize', newSplit);
  }

  function onMouseUp() {
    isDragging.value = false;
    emit('drag-end');
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  document.body.style.cursor = props.direction === 'horizontal' ? 'ew-resize' : 'ns-resize';
  document.body.style.userSelect = 'none';
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

// Double click to reset
function resetSplit() {
  if (props.disabled) return;
  split.value = props.initialSplit;
  emit('resize', split.value);
}
</script>

<template>
  <div
    ref="containerRef"
    class="split-pane"
    :class="{
      'is-horizontal': direction === 'horizontal',
      'is-vertical': direction === 'vertical',
      'is-dragging': isDragging,
      'is-disabled': disabled,
    }"
  >
    <!-- First pane -->
    <div class="split-pane-first" :style="firstPaneStyle">
      <slot name="first" />
    </div>

    <!-- Splitter -->
    <div
      class="split-pane-splitter"
      :class="{ 'is-active': isDragging }"
      :style="splitterStyle"
      @mousedown="startDrag"
      @dblclick="resetSplit"
    >
      <div class="splitter-line" />
    </div>

    <!-- Second pane -->
    <div class="split-pane-second" :style="secondPaneStyle">
      <slot name="second" />
    </div>
  </div>
</template>

<style scoped>
.split-pane {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.split-pane.is-horizontal {
  flex-direction: row;
}

.split-pane.is-vertical {
  flex-direction: column;
}

.split-pane.is-dragging {
  user-select: none;
}

.split-pane-first,
.split-pane-second {
  display: flex;
  overflow: hidden;
  flex-shrink: 0;
}

.split-pane.is-horizontal .split-pane-first,
.split-pane.is-horizontal .split-pane-second {
  height: 100%;
}

.split-pane.is-vertical .split-pane-first,
.split-pane.is-vertical .split-pane-second {
  width: 100%;
}

/* Splitter */
.split-pane-splitter {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  cursor: col-resize;
  transition: background-color var(--transition-duration-fast) ease;
  z-index: 10;
}

.split-pane.is-vertical .split-pane-splitter {
  cursor: row-resize;
}

.split-pane-splitter:hover {
  background-color: var(--color-hover);
}

.split-pane-splitter.is-active {
  background-color: var(--color-primary);
  opacity: 0.3;
}

.split-pane.is-disabled .split-pane-splitter {
  cursor: default;
}

.splitter-line {
  width: 1px;
  height: 100%;
  background-color: var(--color-border);
}

.split-pane.is-horizontal .splitter-line {
  width: 1px;
  height: 20px;
}

.split-pane.is-vertical .splitter-line {
  width: 20px;
  height: 1px;
}

.split-pane-splitter:hover .splitter-line {
  background-color: var(--color-primary);
}
</style>
