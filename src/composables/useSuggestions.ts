/**
 * useSuggestions - Composable for integrating suggestions with terminal
 */
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useHistoryStore } from '@/stores';
import { useAutoComplete } from './useAutoComplete';
import type { SuggestionItem, CompletionContext, CompletionResult } from '@/types/suggestion';

export interface UseSuggestionsOptions {
  /** Session ID */
  sessionId: string;
  /** Current working directory */
  cwd?: string;
  /** Enable auto-complete on typing */
  enableAutoComplete?: boolean;
  /** Delay before showing suggestions (ms) */
  debounceDelay?: number;
  /** Minimum characters before showing suggestions */
  minChars?: number;
  /** Callback when a suggestion is accepted */
  onAccept?: (text: string) => void;
}

export interface UseSuggestionsReturn {
  /** Current suggestions */
  suggestions: ReturnType<typeof ref<SuggestionItem[]>>;
  /** Whether suggestions are visible */
  isVisible: ReturnType<typeof ref<boolean>>;
  /** Currently selected index */
  selectedIndex: ReturnType<typeof ref<number>>;
  /** Position for the dropdown */
  position: ReturnType<typeof ref<{ x: number; y: number }>>;
  /** Whether suggestions are loading */
  isLoading: ReturnType<typeof ref<boolean>>;
  /** Show suggestions panel */
  showPanel: ReturnType<typeof ref<boolean>>;
  /** Update input and trigger completion */
  updateInput: (input: string, cursorPos: number) => void;
  /** Handle keyboard navigation */
  handleKeydown: (e: KeyboardEvent) => boolean;
  /** Accept current suggestion */
  acceptSuggestion: (item?: SuggestionItem) => void;
  /** Show/hide suggestions panel */
  togglePanel: () => void;
  /** Hide suggestions */
  hide: () => void;
  /** Get current input buffer */
  getCurrentInput: () => string;
  /** Set current input buffer */
  setCurrentInput: (input: string) => void;
  /** Add command to history */
  addToHistory: (command: string, exitCode?: number) => Promise<void>;
}

export function useSuggestions(options: UseSuggestionsOptions): UseSuggestionsReturn {
  const {
    sessionId,
    cwd,
    enableAutoComplete = true,
    debounceDelay = 150,
    minChars = 1,
    onAccept,
  } = options;

  // Stores
  const historyStore = useHistoryStore();

  // Auto-complete engine
  const autoComplete = useAutoComplete();

  // State
  const suggestions = ref<SuggestionItem[]>([]);
  const isVisible = ref(false);
  const selectedIndex = ref(0);
  const position = ref({ x: 0, y: 0 });
  const isLoading = ref(false);
  const showPanel = ref(false);

  // Internal state
  let currentInput = '';
  let cursorPosition = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let lastCompletionResult: CompletionResult | null = null;

  // Watch cwd changes
  watch(
    () => cwd,
    (newCwd) => {
      if (newCwd && isVisible.value) {
        triggerCompletion();
      }
    }
  );

  /**
   * Trigger completion with debouncing
   */
  function triggerCompletion(): void {
    if (!enableAutoComplete) return;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(async () => {
      if (currentInput.length < minChars && !currentInput.includes('/')) {
        suggestions.value = [];
        isVisible.value = false;
        return;
      }

      isLoading.value = true;

      try {
        const context: CompletionContext = {
          input: currentInput,
          cursorPosition,
          cwd,
          sessionId,
        };

        const result = await autoComplete.complete(context);
        lastCompletionResult = result;

        suggestions.value = result.items;
        selectedIndex.value = 0;

        if (result.items.length > 0) {
          isVisible.value = true;
        } else {
          isVisible.value = false;
        }
      } catch (e) {
        console.error('Completion failed:', e);
        suggestions.value = [];
        isVisible.value = false;
      } finally {
        isLoading.value = false;
      }
    }, debounceDelay);
  }

  /**
   * Update input and trigger completion
   */
  function updateInput(input: string, cursorPos: number): void {
    currentInput = input;
    cursorPosition = cursorPos;

    // Check if we should trigger completion
    if (input.length > 0) {
      triggerCompletion();
    } else {
      suggestions.value = [];
      isVisible.value = false;
    }
  }

  /**
   * Handle keyboard navigation
   * Returns true if the event was handled
   */
  function handleKeydown(e: KeyboardEvent): boolean {
    // Toggle suggestion panel with Ctrl+Space
    if (e.key === ' ' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      togglePanel();
      return true;
    }

    // Handle navigation when suggestions are visible
    if (isVisible.value && suggestions.value.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          selectedIndex.value = (selectedIndex.value + 1) % suggestions.value.length;
          return true;

        case 'ArrowUp':
          e.preventDefault();
          selectedIndex.value =
            (selectedIndex.value - 1 + suggestions.value.length) % suggestions.value.length;
          return true;

        case 'Tab':
        case 'Enter':
          if (suggestions.value[selectedIndex.value]) {
            e.preventDefault();
            acceptSuggestion(suggestions.value[selectedIndex.value]);
            return true;
          }
          break;

        case 'Escape':
          e.preventDefault();
          hide();
          return true;
      }
    }

    // Handle panel keyboard shortcuts
    if (showPanel.value) {
      if (e.key === 'Escape') {
        e.preventDefault();
        showPanel.value = false;
        return true;
      }
    }

    return false;
  }

  /**
   * Accept a suggestion
   */
  function acceptSuggestion(item?: SuggestionItem): void {
    const suggestion = item || suggestions.value[selectedIndex.value];

    if (!suggestion || !lastCompletionResult) return;

    // Calculate the replacement
    const before = currentInput.slice(0, lastCompletionResult.replaceStart);
    const after = currentInput.slice(lastCompletionResult.replaceEnd);
    const newText = before + suggestion.insertText + after;

    // Update current input
    currentInput = newText;
    cursorPosition = before.length + suggestion.insertText.length;

    // Call accept callback
    if (onAccept) {
      onAccept(suggestion.insertText);
    }

    // Add to history if it's a complete command (contains space or is a command)
    if (suggestion.type === 'history' || (suggestion.type === 'command' && !suggestion.insertText.includes(' '))) {
      // History will be added when command is executed
    }

    // Hide suggestions
    hide();
  }

  /**
   * Toggle suggestions panel
   */
  function togglePanel(): void {
    showPanel.value = !showPanel.value;
    if (showPanel.value) {
      isVisible.value = false;
    }
  }

  /**
   * Hide suggestions
   */
  function hide(): void {
    isVisible.value = false;
    suggestions.value = [];
    selectedIndex.value = 0;
  }

  /**
   * Get current input buffer
   */
  function getCurrentInput(): string {
    return currentInput;
  }

  /**
   * Set current input buffer
   */
  function setCurrentInput(input: string): void {
    currentInput = input;
    cursorPosition = input.length;
  }

  /**
   * Add command to history
   */
  async function addToHistory(command: string, exitCode?: number): Promise<void> {
    if (!command.trim()) return;

    await historyStore.addEntry({
      command: command.trim(),
      sessionId,
      cwd,
      exitCode,
    });
  }

  // Lifecycle
  onMounted(() => {
    // Load history on mount
    historyStore.loadHistory();
  });

  onUnmounted(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
  });

  return {
    suggestions,
    isVisible,
    selectedIndex,
    position,
    isLoading,
    showPanel,
    updateInput,
    handleKeydown,
    acceptSuggestion,
    togglePanel,
    hide,
    getCurrentInput,
    setCurrentInput,
    addToHistory,
  };
}
