<script setup lang="ts">
/**
 * SearchBar - File search input component
 */
import { ref, watch } from 'vue';

const props = withDefaults(defineProps<{
  modelValue?: string;
  placeholder?: string;
  isLoading?: boolean;
}>(), {
  modelValue: '',
  placeholder: 'Search files...',
  isLoading: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'search', query: string): void;
  (e: 'clear'): void;
}>();

const localValue = ref(props.modelValue);
const inputRef = ref<HTMLInputElement | null>(null);

watch(() => props.modelValue, (val) => {
  localValue.value = val;
});

function handleInput(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  localValue.value = value;
  emit('update:modelValue', value);
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    emit('search', localValue.value);
  } else if (event.key === 'Escape') {
    clearSearch();
  }
}

function clearSearch() {
  localValue.value = '';
  emit('update:modelValue', '');
  emit('clear');
  inputRef.value?.focus();
}

function focus() {
  inputRef.value?.focus();
}

defineExpose({ focus });
</script>

<template>
  <div class="search-bar">
    <span class="search-icon">
      <svg v-if="!isLoading" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <svg v-else class="is-spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" opacity="0.3" />
        <path d="M12 2a10 10 0 0 1 10 10" />
      </svg>
    </span>
    <input
      ref="inputRef"
      :value="localValue"
      type="text"
      class="search-input"
      :placeholder="placeholder"
      @input="handleInput"
      @keydown="handleKeydown"
    />
    <button
      v-if="localValue"
      class="clear-btn"
      title="Clear search"
      @click="clearSearch"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.search-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  height: 28px;
  background-color: var(--color-input-bg, #f5f5f5);
  border: 1px solid var(--color-border, #e0e0e0);
  border-radius: var(--border-radius, 4px);
  transition: border-color 0.2s ease;
}

.search-bar:focus-within {
  border-color: var(--color-primary, #1890ff);
}

.search-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: var(--color-text-3, #999);
  flex-shrink: 0;
}

.search-icon svg {
  width: 100%;
  height: 100%;
}

.search-icon .is-spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: none;
  background: transparent;
  font-size: 13px;
  color: var(--color-text-1, #333);
  outline: none;
}

.search-input::placeholder {
  color: var(--color-text-3, #999);
}

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-3, #999);
  cursor: pointer;
  border-radius: 2px;
  flex-shrink: 0;
}

.clear-btn:hover {
  color: var(--color-text-1, #333);
  background-color: var(--color-hover, rgba(0, 0, 0, 0.05));
}

.clear-btn svg {
  width: 12px;
  height: 12px;
}
</style>
