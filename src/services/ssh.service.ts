/**
 * SSH service - Handles SSH connection IPC calls
 */
import { invokeCommand } from './base';
import type { SshConnectionConfig, SshTestResult } from '@/types';

/** SSH connection options for testing (without id) */
export interface SshConnectionOptions {
  name: string;
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'key' | 'agent';
  password?: string;
  privateKeyPath?: string;
  passphrase?: string;
  cwd?: string;
}

/** Test SSH connection */
export async function testSshConnection(
  options: SshConnectionOptions
): Promise<SshTestResult> {
  return invokeCommand<SshTestResult>('test_ssh_connection', { options });
}

/** Connect via SSH and return session ID */
export async function connectSsh(
  connectionId: string
): Promise<string> {
  return invokeCommand<string>('connect_ssh', { connectionId });
}

/** Disconnect SSH session */
export async function disconnectSsh(sessionId: string): Promise<void> {
  return invokeCommand<void>('disconnect_ssh', { sessionId });
}

/** Send input to SSH session */
export async function sshInput(sessionId: string, data: string): Promise<void> {
  return invokeCommand<void>('ssh_input', { sessionId, data });
}

/** Resize SSH terminal */
export async function resizeSsh(
  sessionId: string,
  cols: number,
  rows: number
): Promise<void> {
  return invokeCommand<void>('resize_ssh', { sessionId, cols, rows });
}

/** Save SSH connection config */
export async function saveSshConfig(
  config: SshConnectionConfig
): Promise<SshConnectionConfig> {
  return invokeCommand<SshConnectionConfig>('save_ssh_config', { config });
}

/** Delete SSH connection config */
export async function deleteSshConfig(connectionId: string): Promise<void> {
  return invokeCommand<void>('delete_ssh_config', { connectionId });
}

/** Get all SSH connection configs */
export async function getSshConfigs(): Promise<SshConnectionConfig[]> {
  return invokeCommand<SshConnectionConfig[]>('get_ssh_configs');
}

/** Get SSH connection config by ID */
export async function getSshConfig(
  connectionId: string
): Promise<SshConnectionConfig | null> {
  return invokeCommand<SshConnectionConfig | null>('get_ssh_config', {
    connectionId,
  });
}

/** Get SSH session status */
export async function getSshSessionStatus(sessionId: string): Promise<string> {
  return invokeCommand<string>('get_ssh_session_status', { sessionId });
}

/** Get all active SSH sessions */
export async function getSshSessions(): Promise<string[]> {
  return invokeCommand<string[]>('get_ssh_sessions');
}
