/**
 * Event service - Provides typed event handling for Tauri events
 */
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

/** Terminal output event */
export interface TerminalOutputEvent {
  session_id: string;
  data: string;
}

/** Terminal exit event */
export interface TerminalExitEvent {
  session_id: string;
  exit_code: number;
}

/** File change event */
export interface FileChangeEvent {
  path: string;
  event_type: 'created' | 'modified' | 'deleted' | 'renamed';
  new_path?: string;
}

/** Connection status event */
export interface ConnectionStatusEvent {
  connection_id: string;
  status: 'connected' | 'disconnected' | 'error';
  error?: string;
}

/** SSH output event */
export interface SshOutputEvent {
  session_id: string;
  data: string;
}

/** Docker output event */
export interface DockerOutputEvent {
  session_id: string;
  data: string;
}

/** Event listener types */
export type TauriEventType =
  | 'terminal-output'
  | 'terminal-exit'
  | 'terminal-cwd-change'
  | 'file-change'
  | 'connection-status'
  | 'ssh-output'
  | 'docker-output';

/** Event map for type safety */
export interface EventMap {
  'terminal-output': TerminalOutputEvent;
  'terminal-exit': TerminalExitEvent;
  'terminal-cwd-change': { session_id: string; cwd: string };
  'file-change': FileChangeEvent;
  'connection-status': ConnectionStatusEvent;
  'ssh-output': SshOutputEvent;
  'docker-output': DockerOutputEvent;
}

/**
 * Subscribe to a Tauri event
 */
export async function subscribe<K extends keyof EventMap>(
  event: K,
  handler: (payload: EventMap[K]) => void
): Promise<UnlistenFn> {
  return listen<EventMap[K]>(event, (e) => {
    handler(e.payload);
  });
}

/**
 * Subscribe to terminal output
 */
export async function onTerminalOutput(
  handler: (event: TerminalOutputEvent) => void
): Promise<UnlistenFn> {
  return subscribe('terminal-output', handler);
}

/**
 * Subscribe to terminal exit
 */
export async function onTerminalExit(
  handler: (event: TerminalExitEvent) => void
): Promise<UnlistenFn> {
  return subscribe('terminal-exit', handler);
}

/**
 * Subscribe to terminal cwd change
 */
export async function onTerminalCwdChange(
  handler: (event: { session_id: string; cwd: string }) => void
): Promise<UnlistenFn> {
  return subscribe('terminal-cwd-change', handler);
}

/**
 * Subscribe to file changes
 */
export async function onFileChange(
  handler: (event: FileChangeEvent) => void
): Promise<UnlistenFn> {
  return subscribe('file-change', handler);
}

/**
 * Subscribe to connection status changes
 */
export async function onConnectionStatus(
  handler: (event: ConnectionStatusEvent) => void
): Promise<UnlistenFn> {
  return subscribe('connection-status', handler);
}

/**
 * Subscribe to SSH output
 */
export async function onSshOutput(
  handler: (event: SshOutputEvent) => void
): Promise<UnlistenFn> {
  return subscribe('ssh-output', handler);
}

/**
 * Subscribe to Docker output
 */
export async function onDockerOutput(
  handler: (event: DockerOutputEvent) => void
): Promise<UnlistenFn> {
  return subscribe('docker-output', handler);
}
