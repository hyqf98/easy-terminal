<script setup lang="ts">
/**
 * SuggestionPanel - Smart command suggestion panel
 * Displays context-aware suggestions based on current directory, git status, etc.
 */
import { ref, watch, onMounted } from 'vue';
import { useHistoryStore } from '@/stores';
import type { SuggestionItem } from '@/types/suggestion';

const props = defineProps<{
  /** Current working directory */
  cwd?: string;
  /** Session ID */
  sessionId?: string;
  /** Whether panel is visible */
  visible?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', command: string): void;
  (e: 'close'): void;
}>();

// Stores
const historyStore = useHistoryStore();

// State
const suggestions = ref<SuggestionItem[]>([]);
const selectedIndex = ref(0);
const isLoading = ref(false);

// Common commands by context
const COMMON_COMMANDS: Record<string, string[]> = {
  git: ['git status', 'git add .', 'git commit -m ""', 'git pull', 'git push', 'git log --oneline', 'git branch'],
  node: ['npm install', 'npm run dev', 'npm run build', 'npm test', 'yarn install', 'yarn dev', 'pnpm install'],
  python: ['python main.py', 'pip install -r requirements.txt', 'python -m venv venv', 'pytest'],
  rust: ['cargo build', 'cargo run', 'cargo test', 'cargo clippy', 'cargo fmt'],
  docker: ['docker ps', 'docker-compose up', 'docker-compose down', 'docker build .'],
  general: ['ls -la', 'cd ..', 'clear', 'history', 'pwd'],
};

// Analyze context and generate suggestions
async function analyzeContext(): Promise<void> {
  isLoading.value = true;
  suggestions.value = [];
  selectedIndex.value = 0;

  try {
    // Get history-based suggestions
    const historyItems: SuggestionItem[] = [];
    if (props.cwd) {
      const cwdCommands = await historyStore.getCommandsByCwd(props.cwd);
      for (const entry of cwdCommands.slice(0, 5)) {
        historyItems.push({
          id: `hist-${entry.id}`,
          label: entry.command,
          insertText: entry.command,
          type: 'history',
          description: 'From history',
          priority: 80,
          source: 'history',
        });
      }
    }

    // Get recent commands as fallback
    if (historyItems.length < 3) {
      const recentCommands = historyStore.recentCommands.slice(0, 5);
      for (const entry of recentCommands) {
        if (!historyItems.some(h => h.label === entry.command)) {
          historyItems.push({
            id: `recent-${entry.id}`,
            label: entry.command,
            insertText: entry.command,
            type: 'history',
            description: 'Recent command',
            priority: 70,
            source: 'history',
          });
        }
      }
    }

    // Get context-based suggestions
    const contextItems: SuggestionItem[] = [];

    // Add general commands
    for (const cmd of COMMON_COMMANDS.general) {
      contextItems.push({
        id: `gen-${cmd}`,
        label: cmd,
        insertText: cmd,
        type: 'command',
        description: 'Common command',
        priority: 50,
        source: 'builtin',
      });
    }

    // Combine and sort
    const allItems = [...historyItems, ...contextItems];

    // Remove duplicates
    const seen = new Set<string>();
    suggestions.value = allItems.filter(item => {
      if (seen.has(item.label)) return false;
      seen.add(item.label);
      return true;
    }).slice(0, 10);

  } catch (e) {
    console.error('Failed to analyze context:', e);
  } finally {
    isLoading.value = false;
  }
}

// Watch for visibility changes
watch(() => props.visible, (visible) => {
  if (visible) {
    analyzeContext();
  }
});

// Watch for cwd changes
watch(() => props.cwd, () => {
  if (props.visible) {
    analyzeContext();
  }
});

// Methods
function handleSelect(item: SuggestionItem): void {
  emit('select', item.insertText);
}

function selectNext(): void {
  if (suggestions.value.length > 0) {
    selectedIndex.value = (selectedIndex.value + 1) % suggestions.value.length;
  }
}

function selectPrev(): void {
  if (suggestions.value.length > 0) {
    selectedIndex.value = (selectedIndex.value - 1 + suggestions.value.length) % suggestions.value.length;
  }
}

function selectCurrent(): void {
  if (suggestions.value[selectedIndex.value]) {
    handleSelect(suggestions.value[selectedIndex.value]);
  }
}

// Lifecycle
onMounted(() => {
  if (props.visible) {
    analyzeContext();
  }
});

// Expose
defineExpose({
  selectNext,
  selectPrev,
  selectCurrent,
  refresh: analyzeContext,
});
</script>

<template>
  <Transition name="panel-slide">
    <div v-if="visible" class="suggestion-panel">
      <div class="panel-header">
        <span class="panel-title">Smart Suggestions</span>
        <button class="close-btn" @click="emit('close')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div v-if="isLoading" class="panel-loading">
        <span>Analyzing context...</span>
      </div>

      <div v-else-if="suggestions.length === 0" class="panel-empty">
        <span>No suggestions available</span>
      </div>

      <div v-else class="suggestion-list">
        <div
          v-for="(item, index) in suggestions"
          :key="item.id"
          class="suggestion-item"
          :class="{ 'is-selected': index === selectedIndex }"
          @click="handleSelect(item)"
          @mouseenter="selectedIndex = index"
        >
          <div class="item-icon" :class="`type-${item.type}`">
            <svg
              v-if="item.type === 'history'"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 17l6-6-6-6M12 19h8" />
            </svg>
          </div>
          <div class="item-content">
            <span class="item-label">{{ item.label }}</span>
            <span v-if="item.description" class="item-description">{{ item.description }}</span>
          </div>
        </div>
      </div>

      <div class="panel-footer">
        <span class="hint">
          <kbd>Enter</kbd> to select
          <kbd>Esc</kbd> to close
        </span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.suggestion-panel {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 300px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  z-index: 100;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--color-surface-hover);
  border-bottom: 1px solid var(--color-border);
}

.panel-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: color 0.2s;
}

.close-btn:hover {
  color: var(--color-text);
}

.close-btn svg {
  width: 14px;
  height: 14px;
}

.panel-loading,
.panel-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.suggestion-list {
  max-height: 250px;
  overflow-y: auto;
}

.suggestion-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.suggestion-item:hover,
.suggestion-item.is-selected {
  background: var(--color-primary-bg);
}

.item-icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
}

.item-icon svg {
  width: 16px;
  height: 16px;
}

.item-icon.type-history {
  color: #ce9178;
}

.item-icon.type-command {
  color: #569cd6;
}

.item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.item-label {
  font-size: 12px;
  font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-description {
  font-size: 11px;
  color: var(--color-text-secondary);
}

.panel-footer {
  padding: 8px 12px;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-hover);
}

.hint {
  font-size: 11px;
  color: var(--color-text-secondary);
}

.hint kbd {
  display: inline-block;
  padding: 1px 4px;
  font-size: 10px;
  font-family: inherit;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 3px;
  margin: 0 2px;
}

/* Transitions */
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  opacity: 0;
  transform: translateY(-50%) translateX(10px);
}
</style>
