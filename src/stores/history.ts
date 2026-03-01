/**
 * History store - Manages command history with backend persistence
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  addCommandHistory,
  searchCommandHistory,
  getRecentCommands,
  getUniqueCommands as fetchUniqueCommands,
  getCommandsBySession as fetchCommandsBySession,
  getCommandsByCwd as fetchCommandsByCwd,
  clearCommandHistory as clearBackendHistory,
  setMaxHistoryEntries as setBackendMaxEntries,
  getHistoryStats,
  type HistoryEntry,
  type HistoryStats,
} from '@/services/history.service';

export type { HistoryEntry, HistoryStats };

export const useHistoryStore = defineStore('history', () => {
  // State
  const entries = ref<HistoryEntry[]>([]);
  const uniqueCommandList = ref<string[]>([]);
  const stats = ref<HistoryStats | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const maxEntries = ref(1000);

  // Getters
  const recentCommands = computed(() => {
    return entries.value.slice(0, 50);
  });

  const uniqueCommands = computed(() => {
    const seen = new Set<string>();
    return entries.value
      .filter(entry => {
        if (seen.has(entry.command)) return false;
        seen.add(entry.command);
        return true;
      })
      .slice(0, 100);
  });

  // Actions

  /**
   * Load history from backend
   */
  async function loadHistory(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      const [historyEntries, unique, historyStats] = await Promise.all([
        getRecentCommands(1000),
        fetchUniqueCommands(100),
        getHistoryStats(),
      ]);

      entries.value = historyEntries;
      uniqueCommandList.value = unique;
      stats.value = historyStats;
      maxEntries.value = historyStats.max_entries;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load history';
      console.error('Failed to load history:', e);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Add entry to history
   */
  async function addEntry(entry: {
    command: string;
    sessionId?: string;
    cwd?: string;
    exitCode?: number;
  }): Promise<HistoryEntry | null> {
    try {
      const newEntry = await addCommandHistory(
        entry.command,
        entry.sessionId,
        entry.cwd,
        entry.exitCode
      );

      // Update local state
      entries.value.unshift(newEntry);

      // Update unique commands list if this is a new command
      if (!uniqueCommandList.value.includes(newEntry.command)) {
        uniqueCommandList.value.unshift(newEntry.command);
        if (uniqueCommandList.value.length > 100) {
          uniqueCommandList.value.pop();
        }
      }

      // Update stats
      if (stats.value) {
        stats.value.total_entries++;
      }

      return newEntry;
    } catch (e) {
      console.error('Failed to add history entry:', e);
      return null;
    }
  }

  /**
   * Search commands
   */
  async function searchCommands(query: string, limit = 20): Promise<HistoryEntry[]> {
    if (!query.trim()) {
      return recentCommands.value.slice(0, limit);
    }

    try {
      return await searchCommandHistory(query, limit);
    } catch (e) {
      console.error('Failed to search history:', e);
      // Fallback to local search
      const lowerQuery = query.toLowerCase();
      return entries.value
        .filter(entry => entry.command.toLowerCase().includes(lowerQuery))
        .slice(0, limit);
    }
  }

  /**
   * Get commands by session
   */
  async function getCommandsBySession(sessionId: string): Promise<HistoryEntry[]> {
    try {
      return await fetchCommandsBySession(sessionId);
    } catch (e) {
      console.error('Failed to get session commands:', e);
      return entries.value.filter(entry => entry.session_id === sessionId);
    }
  }

  /**
   * Get commands by working directory
   */
  async function getCommandsByCwd(cwd: string): Promise<HistoryEntry[]> {
    try {
      return await fetchCommandsByCwd(cwd);
    } catch (e) {
      console.error('Failed to get cwd commands:', e);
      return entries.value.filter(entry => entry.cwd === cwd);
    }
  }

  /**
   * Get unique commands list
   */
  async function refreshUniqueCommands(): Promise<string[]> {
    try {
      uniqueCommandList.value = await fetchUniqueCommands(100);
      return uniqueCommandList.value;
    } catch (e) {
      console.error('Failed to get unique commands:', e);
      return uniqueCommandList.value;
    }
  }

  /**
   * Clear history
   */
  async function clearHistory(): Promise<void> {
    try {
      await clearBackendHistory();
      entries.value = [];
      uniqueCommandList.value = [];
      if (stats.value) {
        stats.value.total_entries = 0;
        stats.value.unique_commands = 0;
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to clear history';
      console.error('Failed to clear history:', e);
    }
  }

  /**
   * Set max entries
   */
  async function setMaxEntries(max: number): Promise<void> {
    try {
      await setBackendMaxEntries(max);
      maxEntries.value = max;

      // Trim local entries if needed
      if (entries.value.length > max) {
        entries.value = entries.value.slice(0, max);
      }

      if (stats.value) {
        stats.value.max_entries = max;
      }
    } catch (e) {
      console.error('Failed to set max entries:', e);
    }
  }

  /**
   * Refresh stats
   */
  async function refreshStats(): Promise<void> {
    try {
      stats.value = await getHistoryStats();
    } catch (e) {
      console.error('Failed to refresh stats:', e);
    }
  }

  return {
    // State
    entries,
    uniqueCommandList,
    stats,
    isLoading,
    error,
    maxEntries,
    // Getters
    recentCommands,
    uniqueCommands,
    // Actions
    loadHistory,
    addEntry,
    searchCommands,
    getCommandsBySession,
    getCommandsByCwd,
    refreshUniqueCommands,
    clearHistory,
    setMaxEntries,
    refreshStats,
  };
});
