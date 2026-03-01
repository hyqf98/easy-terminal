/**
 * History service - Command history IPC operations
 */
import { invokeCommand } from './base';

/** History entry type */
export interface HistoryEntry {
  id: string;
  command: string;
  session_id?: string;
  cwd?: string;
  timestamp: number;
  exit_code?: number;
}

/** History statistics */
export interface HistoryStats {
  total_entries: number;
  unique_commands: number;
  max_entries: number;
}

/**
 * Add command to history
 */
export async function addCommandHistory(
  command: string,
  sessionId?: string,
  cwd?: string,
  exitCode?: number
): Promise<HistoryEntry> {
  return invokeCommand<HistoryEntry>('add_command_history', {
    command,
    sessionId,
    cwd,
    exitCode,
  });
}

/**
 * Search command history
 */
export async function searchCommandHistory(
  query: string,
  limit?: number
): Promise<HistoryEntry[]> {
  return invokeCommand<HistoryEntry[]>('search_command_history', {
    query,
    limit,
  });
}

/**
 * Get recent commands
 */
export async function getRecentCommands(limit?: number): Promise<HistoryEntry[]> {
  return invokeCommand<HistoryEntry[]>('get_recent_commands', { limit });
}

/**
 * Get unique commands (for autocomplete)
 */
export async function getUniqueCommands(limit?: number): Promise<string[]> {
  return invokeCommand<string[]>('get_unique_commands', { limit });
}

/**
 * Get commands by session
 */
export async function getCommandsBySession(sessionId: string): Promise<HistoryEntry[]> {
  return invokeCommand<HistoryEntry[]>('get_commands_by_session', { sessionId });
}

/**
 * Get commands by working directory
 */
export async function getCommandsByCwd(cwd: string): Promise<HistoryEntry[]> {
  return invokeCommand<HistoryEntry[]>('get_commands_by_cwd', { cwd });
}

/**
 * Clear all command history
 */
export async function clearCommandHistory(): Promise<void> {
  return invokeCommand<void>('clear_command_history');
}

/**
 * Set max history entries
 */
export async function setMaxHistoryEntries(max: number): Promise<void> {
  return invokeCommand<void>('set_max_history_entries', { max });
}

/**
 * Get history statistics
 */
export async function getHistoryStats(): Promise<HistoryStats> {
  return invokeCommand<HistoryStats>('get_history_stats');
}
