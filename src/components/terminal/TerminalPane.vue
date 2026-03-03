<script setup lang="ts">
/**
 * TerminalPane - Terminal panel component with xterm.js integration
 * Handles terminal display, input/output, and lifecycle
 */
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { SearchAddon } from 'xterm-addon-search';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { Unicode11Addon } from 'xterm-addon-unicode11';
import { useTerminalStore, useSettingsStore } from '@/stores';
import { useAutoComplete } from '@/composables';
import { sendTerminalInput, resizeTerminal } from '@/services/terminal.service';
import { onTerminalOutput } from '@/services/events';
import { getTerminalTheme, defaultTerminalOptions } from '@/config/terminalThemes';
import TerminalSuggest from './TerminalSuggest.vue';
import type { UnlistenFn } from '@tauri-apps/api/event';
import type { EditorCommand } from '@/composables';
import type { SuggestionItem, CompletionResult } from '@/types/suggestion';
import 'xterm/css/xterm.css';

const props = defineProps<{
  /** Session ID */
  sessionId: string;
  /** Whether this pane is focused */
  focused?: boolean;
}>();

const emit = defineEmits<{
  (e: 'focus'): void;
  (e: 'exit', code: number): void;
  (e: 'title-change', title: string): void;
  (e: 'editor-command', command: EditorCommand): void;
}>();

// Refs
const terminalContainer = ref<HTMLDivElement | null>(null);
const terminalRef = ref<Terminal | null>(null);
const fitAddon = ref<FitAddon | null>(null);

// Store
const terminalStore = useTerminalStore();
const settingsStore = useSettingsStore();

// Auto-complete
const { complete, isLoading: completionLoading } = useAutoComplete();

// Computed theme
const currentTheme = computed(() => settingsStore.effectiveTheme);

// Suggestion panel state
const showSuggestions = ref(false);
const suggestionItems = ref<SuggestionItem[]>([]);
const selectedSuggestionIndex = ref(0);
const suggestionPosition = ref({ x: 0, y: 0 });
const lastCompletionResult = ref<CompletionResult | null>(null);

// Event unlisteners
let unlistenOutput: UnlistenFn | null = null;

// Command buffer for editor detection
const commandBuffer = ref('');
const enableCommandIntercept = ref(true);

// Editor command patterns
const EDITOR_PATTERNS = [
  /^(g?vim?)(?:\s+(-\w+|\+\w+|\s+\S+))*\s+(.+)$/i,
  /^(nano)(?:\s+(-\w+|\s+\S+))*\s+(.+)$/i,
  /^(micro)(?:\s+(-\w+|\s+\S+))*\s+(.+)$/i,
];

// Get current working directory for the session
function getCurrentCwd(): string {
  const session = terminalStore.getSession(props.sessionId);
  return session?.cwd || process.env.HOME || '/';
}

// Trigger auto-complete
async function triggerCompletion(): Promise<void> {
  const cwd = getCurrentCwd();
  const input = commandBuffer.value;

  try {
    const result = await complete({
      input,
      cursorPosition: input.length,
      cwd,
      sessionId: props.sessionId,
    });

    if (result.items.length > 0) {
      suggestionItems.value = result.items;
      selectedSuggestionIndex.value = 0;
      lastCompletionResult.value = result;
      showSuggestions.value = true;
      updateSuggestionPosition();
    } else {
      hideSuggestions();
    }
  } catch (e) {
    console.error('[TerminalPane] Completion failed:', e);
    hideSuggestions();
  }
}

// Hide suggestion panel
function hideSuggestions(): void {
  showSuggestions.value = false;
  suggestionItems.value = [];
  selectedSuggestionIndex.value = 0;
  lastCompletionResult.value = null;
}

// Update suggestion panel position
function updateSuggestionPosition(): void {
  if (!terminalRef.value || !terminalContainer.value) return;

  // Position suggestions at bottom of terminal
  const containerRect = terminalContainer.value.getBoundingClientRect();
  suggestionPosition.value = {
    x: containerRect.left + 10,
    y: containerRect.bottom - 10,
  };
}

// Handle suggestion selection
async function handleSuggestionSelect(item: SuggestionItem): Promise<void> {
  if (!terminalRef.value || !lastCompletionResult.value) return;

  const completion = lastCompletionResult.value;
  const input = commandBuffer.value;

  // Calculate what needs to be replaced
  const toReplace = input.slice(completion.replaceStart, completion.replaceEnd);
  const insertText = item.insertText;

  // Send backspaces to delete the part we're replacing
  const backspaces = '\x7f'.repeat(toReplace.length);

  // Send the completion
  await sendTerminalInput(props.sessionId, backspaces + insertText);

  // Update local buffer
  commandBuffer.value = input.slice(0, completion.replaceStart) + insertText;

  hideSuggestions();
}

// Handle suggestion navigation
function handleSuggestionHover(index: number): void {
  selectedSuggestionIndex.value = index;
}

// Navigate suggestions with keyboard
function navigateSuggestions(direction: 'up' | 'down'): boolean {
  if (!showSuggestions.value || suggestionItems.value.length === 0) return false;

  if (direction === 'up') {
    selectedSuggestionIndex.value = Math.max(0, selectedSuggestionIndex.value - 1);
  } else {
    selectedSuggestionIndex.value = Math.min(
      suggestionItems.value.length - 1,
      selectedSuggestionIndex.value + 1
    );
  }
  return true;
}

// Accept current suggestion
async function acceptSuggestion(): Promise<boolean> {
  if (!showSuggestions.value || suggestionItems.value.length === 0) return false;

  const item = suggestionItems.value[selectedSuggestionIndex.value];
  if (item) {
    await handleSuggestionSelect(item);
  }
  return true;
}

// Detect editor command
function detectEditorCommand(command: string): EditorCommand | null {
  if (!enableCommandIntercept.value) return null;
  const trimmed = command.trim();
  if (!trimmed) return null;

  for (const pattern of EDITOR_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      return {
        editor: match[1].toLowerCase(),
        filePath: match[match.length - 1].trim(),
        args: [],
        rawCommand: trimmed,
      };
    }
  }
  return null;
}

// Terminal options with dynamic theme
function getTerminalOptions() {
  return {
    ...defaultTerminalOptions,
    theme: getTerminalTheme(currentTheme.value),
  };
}

// Initialize terminal
async function initTerminal(): Promise<void> {
  if (!terminalContainer.value) {
    console.warn('[TerminalPane] Container not ready');
    return;
  }

  console.log('[TerminalPane] Initializing terminal, sessionId:', props.sessionId);

  // Create terminal instance with current theme
  const terminal = new Terminal(getTerminalOptions());
  terminalRef.value = terminal;

  // Create addons
  const fit = new FitAddon();
  const search = new SearchAddon();
  const webLinks = new WebLinksAddon();
  const unicode11 = new Unicode11Addon();

  fitAddon.value = fit;

  // Load addons
  terminal.loadAddon(fit);
  terminal.loadAddon(search);
  terminal.loadAddon(webLinks);
  terminal.loadAddon(unicode11);

  // Enable Unicode 11
  terminal.unicode.activeVersion = '11';

  // Open terminal in container
  terminal.open(terminalContainer.value);

  // Initial fit
  await nextTick();
  fit.fit();

  // Handle input
  terminal.onData((data) => {
    console.log('[TerminalPane] onData triggered, data length:', data.length, 'sessionId:', props.sessionId);
    handleInput(data);
  });

  // Handle resize
  terminal.onResize(({ cols, rows }) => {
    handleResize(cols, rows);
  });

  // Handle title change
  terminal.onTitleChange((title) => {
    emit('title-change', title);
  });

  // Focus terminal
  terminal.focus();

  // Setup output listener
  unlistenOutput = await onTerminalOutput((event) => {
    if (event.session_id === props.sessionId && terminalRef.value) {
      terminalRef.value.write(event.data);
    }
  });

  console.log('[TerminalPane] Terminal initialized successfully');
}

// Handle input
async function handleInput(data: string): Promise<void> {
  console.log('[TerminalPane] handleInput called, sessionId:', props.sessionId, 'data:', JSON.stringify(data));

  // Handle Tab key for auto-complete
  if (data === '\t') {
    if (showSuggestions.value) {
      // Accept current suggestion
      await acceptSuggestion();
      return;
    } else {
      // Trigger completion
      await triggerCompletion();
      return;
    }
  }

  // Handle Escape key to close suggestions
  if (data === '\x1b') {
    if (showSuggestions.value) {
      hideSuggestions();
      return;
    }
  }

  // Handle arrow keys for suggestion navigation
  if (data === '\x1b[A' && showSuggestions.value) {
    navigateSuggestions('up');
    return;
  }
  if (data === '\x1b[B' && showSuggestions.value) {
    navigateSuggestions('down');
    return;
  }

  // Track command buffer for editor detection
  if (enableCommandIntercept.value) {
    // Check for Enter key (carriage return or newline)
    if (data === '\r' || data === '\n') {
      // Check if current buffer contains an editor command
      const editorCommand = detectEditorCommand(commandBuffer.value);
      if (editorCommand) {
        // Emit editor command event but still send the command to terminal
        // This allows the terminal to show the command while we open the editor
        emit('editor-command', editorCommand);
      }
      commandBuffer.value = '';
      hideSuggestions();
    } else if (data === '\x7f' || data === '\b') {
      // Backspace - remove last character from buffer
      commandBuffer.value = commandBuffer.value.slice(0, -1);
      // Trigger completion if buffer is not empty
      if (commandBuffer.value.length > 0) {
        debounceTriggerCompletion();
      } else {
        hideSuggestions();
      }
    } else if (data.charCodeAt(0) >= 32 && data.charCodeAt(0) < 127) {
      // Printable ASCII - add to buffer
      commandBuffer.value += data;
      // Trigger completion after input
      debounceTriggerCompletion();
    } else if (data === '\x03') {
      // Ctrl+C - clear buffer
      commandBuffer.value = '';
      hideSuggestions();
    }
  }

  try {
    console.log('[TerminalPane] Calling sendTerminalInput...');
    await sendTerminalInput(props.sessionId, data);
    console.log('[TerminalPane] sendTerminalInput success');
    terminalStore.updateSession(props.sessionId, {
      lastActivityAt: Date.now(),
    });
  } catch (e) {
    console.error('[TerminalPane] Failed to send input:', e);
  }
}

// Debounce timer for completion
let completionTimer: ReturnType<typeof setTimeout> | null = null;

// Debounced completion trigger
function debounceTriggerCompletion(): void {
  if (completionTimer) {
    clearTimeout(completionTimer);
  }
  completionTimer = setTimeout(() => {
    triggerCompletion();
  }, 150);
}

// Handle resize
async function handleResize(cols: number, rows: number): Promise<void> {
  try {
    await resizeTerminal(props.sessionId, cols, rows, 0, 0);
    terminalStore.updateSession(props.sessionId, {
      cols,
      rows,
      lastActivityAt: Date.now(),
    });
  } catch (e) {
    console.error('Failed to resize terminal:', e);
  }
}

// Fit terminal to container
function fitTerminal(): void {
  if (fitAddon.value && terminalRef.value) {
    try {
      fitAddon.value.fit();
    } catch (e) {
      console.error('Failed to fit terminal:', e);
    }
  }
}

// Focus terminal
function focus(): void {
  if (terminalRef.value) {
    // Reset cursor state in case a TUI application left the terminal in a bad state
    resetCursorState();
    terminalRef.value.focus();
    emit('focus');
  }
}

// Clear terminal
function clear(): void {
  if (terminalRef.value) {
    terminalRef.value.clear();
  }
}

// Write to terminal
function write(data: string): void {
  if (terminalRef.value) {
    terminalRef.value.write(data);
  }
}

// Reset terminal cursor state (for TUI applications)
function resetCursorState(): void {
  if (terminalRef.value) {
    // Disable alternate screen buffer
    terminalRef.value.write('\x1b[?1049l');
    // Show cursor
    terminalRef.value.write('\x1b[?25h');
    // Reset scrolling region
    terminalRef.value.write('\x1b[r');
    // Reset cursor key mode (application vs normal)
    terminalRef.value.write('\x1b[?1l');
    // Reset keypad mode
    terminalRef.value.write('\x1b>');
    // Reset bracketed paste mode
    terminalRef.value.write('\x1b[?2004l');
    // Reset focus event mode
    terminalRef.value.write('\x1b[?1004l');
  }
}

// Resize observer
let resizeObserver: ResizeObserver | null = null;

// Watch focused prop
watch(() => props.focused, (newFocused) => {
  if (newFocused) {
    focus();
  }
});

// Watch theme changes
watch(currentTheme, (newTheme) => {
  if (terminalRef.value) {
    console.log('[TerminalPane] Theme changed to:', newTheme);
    terminalRef.value.options.theme = getTerminalTheme(newTheme);
  }
});

// Lifecycle
onMounted(async () => {
  await initTerminal();

  // Setup resize observer
  if (terminalContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      fitTerminal();
    });
    resizeObserver.observe(terminalContainer.value);
  }
});

onUnmounted(() => {
  // Cleanup completion timer
  if (completionTimer) {
    clearTimeout(completionTimer);
    completionTimer = null;
  }

  // Cleanup resize observer
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }

  // Cleanup event listener
  if (unlistenOutput) {
    unlistenOutput();
    unlistenOutput = null;
  }

  // Dispose terminal
  if (terminalRef.value) {
    terminalRef.value.dispose();
    terminalRef.value = null;
  }
});

// Expose methods
defineExpose({
  focus,
  clear,
  write,
  fitTerminal,
  resetCursorState,
});
</script>

<template>
  <div
    class="terminal-pane"
    :class="{ 'is-focused': focused }"
    @click="focus"
  >
    <div ref="terminalContainer" class="terminal-container"></div>

    <!-- Auto-complete suggestions -->
    <TerminalSuggest
      :items="suggestionItems"
      :visible="showSuggestions"
      :selected-index="selectedSuggestionIndex"
      :x="suggestionPosition.x"
      :y="suggestionPosition.y"
      @select="handleSuggestionSelect"
      @hover="handleSuggestionHover"
      @close="hideSuggestions"
    />
  </div>
</template>

<style scoped>
.terminal-pane {
  width: 100%;
  height: 100%;
  background-color: var(--color-body);
  overflow: hidden;
  transition: background-color 0.3s ease;
}

.terminal-pane.is-focused {
  /* Glow effect for focused terminal */
  box-shadow: inset 0 0 0 1px var(--color-primary);
}

.terminal-container {
  width: 100%;
  height: 100%;
  padding: 4px;
}

/* Ensure xterm fills container */
.terminal-container :deep(.xterm) {
  height: 100%;
}

.terminal-container :deep(.xterm-viewport) {
  overflow-y: auto;
}

/* Custom scrollbar for terminal */
.terminal-container :deep(.xterm-viewport::-webkit-scrollbar) {
  width: 8px;
}

.terminal-container :deep(.xterm-viewport::-webkit-scrollbar-track) {
  background: transparent;
}

.terminal-container :deep(.xterm-viewport::-webkit-scrollbar-thumb) {
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.terminal-container :deep(.xterm-viewport::-webkit-scrollbar-thumb:hover) {
  background-color: rgba(255, 255, 255, 0.3);
}
</style>
