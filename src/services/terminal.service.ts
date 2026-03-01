/**
 * Terminal service - Handles terminal IPC calls
 */
import { invokeCommand } from './base';
import type { TerminalSession, TerminalCreateOptions } from '@/types';

/** Create a new terminal session */
export async function createTerminalSession(
  options: TerminalCreateOptions
): Promise<TerminalSession> {
  return invokeCommand<TerminalSession>('create_terminal', {
    options,
  });
}

/** Close a terminal session */
export async function closeTerminalSession(sessionId: string): Promise<void> {
  return invokeCommand<void>('close_terminal', { sessionId });
}

/** Send input to terminal */
export async function sendTerminalInput(
  sessionId: string,
  data: string
): Promise<void> {
  return invokeCommand<void>('terminal_input', { sessionId, data });
}

/** Resize terminal */
export async function resizeTerminal(
  sessionId: string,
  cols: number,
  rows: number,
  width: number,
  height: number
): Promise<void> {
  return invokeCommand<void>('resize_terminal', {
    sessionId,
    cols,
    rows,
    width,
    height,
  });
}

/** Get available shells */
export async function getAvailableShells(): Promise<string[]> {
  return invokeCommand<string[]>('get_available_shells');
}

/** Get default shell */
export async function getDefaultShell(): Promise<string> {
  return invokeCommand<string>('get_default_shell');
}

/** Get current directory of terminal */
export async function getTerminalCwd(sessionId: string): Promise<string> {
  return invokeCommand<string>('get_terminal_cwd', { sessionId });
}
