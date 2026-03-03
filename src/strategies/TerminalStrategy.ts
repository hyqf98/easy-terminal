/**
 * Terminal Strategy Pattern
 * Provides a unified interface for different terminal types (local, SSH, Docker)
 */

import type { TerminalSession } from '@/types';

/**
 * Terminal strategy interface
 */
export interface ITerminalStrategy {
  /** Strategy type identifier */
  readonly type: 'local' | 'ssh' | 'docker';

  /** Create a new terminal session */
  createSession(options: TerminalCreateOptions): Promise<TerminalSession>;

  /** Close a terminal session */
  closeSession(sessionId: string): Promise<void>;

  /** Send input to terminal */
  sendInput(sessionId: string, data: string): Promise<void>;

  /** Resize terminal */
  resize(sessionId: string, cols: number, rows: number): Promise<void>;

  /** Check if session is healthy */
  isHealthy(sessionId: string): Promise<boolean>;

  /** Get session info */
  getSessionInfo(sessionId: string): Promise<TerminalSession | null>;

  /** Cleanup resources */
  cleanup(): Promise<void>;
}

/**
 * Terminal creation options
 */
export interface TerminalCreateOptions {
  /** Working directory */
  cwd?: string;
  /** Shell to use */
  shell?: string;
  /** Session title */
  title?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** For SSH: connection ID */
  connectionId?: string;
  /** For Docker: container ID */
  containerId?: string;
  /** For Docker: user */
  dockerUser?: string;
}

/**
 * Local terminal strategy implementation
 */
export class LocalTerminalStrategy implements ITerminalStrategy {
  readonly type = 'local' = 'local';

  private sessions: Map<string, TerminalSession> = new Map();

  async createSession(options: TerminalCreateOptions): Promise<TerminalSession> {
    const { createTerminalSession } = await import('@/services/terminal.service');
    return createTerminalSession({
      cwd: options.cwd,
      shell: options.shell,
      type: 'local',
      title: options.title,
    });
  }

  async closeSession(sessionId: string): Promise<void> {
    const { closeTerminalSession } = await import('@/services/terminal.service');
    await closeTerminalSession(sessionId);
    this.sessions.delete(sessionId);
  }

  async sendInput(sessionId: string, data: string): Promise<void> {
    const { sendTerminalInput } = await import('@/services/terminal.service');
    return sendTerminalInput(sessionId, data);
  }

  async resize(sessionId: string, cols: number, rows: number): Promise<void> {
    const { resizeTerminal } = await import('@/services/terminal.service');
    return resizeTerminal(sessionId, cols, rows, 0, 0);
  }

  async isHealthy(sessionId: string): Promise<boolean> {
    return this.sessions.has(sessionId);
  }

  async getSessionInfo(sessionId: string): Promise<TerminalSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  async cleanup(): Promise<void> {
    // Close all sessions
    const closePromises = Array.from(this.sessions.keys()).map(id => this.closeSession(id));
    await Promise.all(closePromises);
    this.sessions.clear();
  }
}

/**
 * SSH terminal strategy implementation
 */
export class SshTerminalStrategy implements ITerminalStrategy {
  readonly type = 'ssh' = 'ssh';

  private sessions: Map<string, TerminalSession> = new Map();

  async createSession(options: TerminalCreateOptions): Promise<TerminalSession> {
    if (!options.connectionId) {
      throw new Error('SSH connection ID is required');
    }

    const { connectSsh } = await import('@/services/ssh.service');
    const result = await connectSsh({
      id: options.connectionId,
      cwd: options.cwd,
    });

    const session: TerminalSession = {
      id: result.sessionId,
      title: options.title || 'SSH Terminal',
      type: 'ssh',
      status: 'connected',
      cwd: options.cwd,
      shell: 'ssh',
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };

    this.sessions.set(result.sessionId, session);
    return session;
  }

  async closeSession(sessionId: string): Promise<void> {
    const { disconnectSsh } = await import('@/services/ssh.service');
    await disconnectSsh(sessionId);
    this.sessions.delete(sessionId);
  }

  async sendInput(sessionId: string, data: string): Promise<void> {
    const { sshInput } = await import('@/services/ssh.service');
    return sshInput(sessionId, data);
  }

  async resize(sessionId: string, cols: number, rows: number): Promise<void> {
    const { resizeSsh } = await import('@/services/ssh.service');
    return resizeSsh(sessionId, cols, rows);
  }

  async isHealthy(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    return session?.status === 'connected';
  }

  async getSessionInfo(sessionId: string): Promise<TerminalSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  async cleanup(): Promise<void> {
    const closePromises = Array.from(this.sessions.keys()).map(id => this.closeSession(id));
    await Promise.all(closePromises);
    this.sessions.clear();
  }
}

/**
 * Docker terminal strategy implementation
 */
export class DockerTerminalStrategy implements ITerminalStrategy {
  readonly type = 'docker' = 'docker';

  private sessions: Map<string, TerminalSession> = new Map();

  async createSession(options: TerminalCreateOptions): Promise<TerminalSession> {
    if (!options.containerId) {
      throw new Error('Docker container ID is required');
    }

    const { createDockerExec } = await import('@/services/docker.service');
    const result = await createDockerExec({
      containerId: options.containerId,
      cmd: options.shell || '/bin/sh',
      user: options.dockerUser,
    });

    const session: TerminalSession = {
      id: result.sessionId,
      title: options.title || `Docker: ${options.containerId.slice(0, 12)}`,
      type: 'docker',
      status: 'connected',
      cwd: options.cwd,
      shell: options.shell || '/bin/sh',
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };

    this.sessions.set(result.sessionId, session);
    return session;
  }

  async closeSession(sessionId: string): Promise<void> {
    const { disconnectDockerExec } = await import('@/services/docker.service');
    await disconnectDockerExec(sessionId);
    this.sessions.delete(sessionId);
  }

  async sendInput(sessionId: string, data: string): Promise<void> {
    const { dockerExecInput } = await import('@/services/docker.service');
    return dockerExecInput(sessionId, data);
  }

  async resize(sessionId: string, cols: number, rows: number): Promise<void> {
    const { resizeDockerExec } = await import('@/services/docker.service');
    return resizeDockerExec(sessionId, cols, rows);
  }

  async isHealthy(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    return session?.status === 'connected';
  }

  async getSessionInfo(sessionId: string): Promise<TerminalSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  async cleanup(): Promise<void> {
    const closePromises = Array.from(this.sessions.keys()).map(id => this.closeSession(id));
    await Promise.all(closePromises);
    this.sessions.clear();
  }
}

/**
 * Terminal strategy manager
 * Manages multiple terminal strategies and routes commands to appropriate strategy
 */
export class TerminalStrategyManager {
  private strategies: Map<string, ITerminalStrategy> = new Map();
  private activeSessions: Map<string, ITerminalStrategy> = new Map();

  constructor() {
    this.strategies.set('local', new LocalTerminalStrategy());
    this.strategies.set('ssh', new SshTerminalStrategy());
    this.strategies.set('docker', new DockerTerminalStrategy());
  }

  /**
   * Get strategy by type
   */
  getStrategy(type: 'local' | 'ssh' | 'docker'): ITerminalStrategy | undefined {
    return this.strategies.get(type);
  }

  /**
   * Create a terminal session using appropriate strategy
   */
  async createSession(type: 'local' | 'ssh' | 'docker', options: TerminalCreateOptions): Promise<TerminalSession> {
    const strategy = this.getStrategy(type);
    if (!strategy) {
      throw new Error(`Unknown terminal type: ${type}`);
    }

    const session = await strategy.createSession(options);
    this.activeSessions.set(session.id, strategy);
    return session;
  }

  /**
   * Close a terminal session
   */
  async closeSession(sessionId: string): Promise<void> {
    const strategy = this.activeSessions.get(sessionId);
    if (!strategy) {
      return;
    }

    await strategy.closeSession(sessionId);
    this.activeSessions.delete(sessionId);
  }

  /**
   * Send input to a terminal session
   */
  async sendInput(sessionId: string, data: string): Promise<void> {
    const strategy = this.activeSessions.get(sessionId);
    if (!strategy) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return strategy.sendInput(sessionId, data);
  }

  /**
   * Resize a terminal session
   */
  async resize(sessionId: string, cols: number, rows: number): Promise<void> {
    const strategy = this.activeSessions.get(sessionId);
    if (!strategy) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return strategy.resize(sessionId, cols, rows);
  }

  /**
   * Check if a session is healthy
   */
  async isHealthy(sessionId: string): Promise<boolean> {
    const strategy = this.activeSessions.get(sessionId);
    if (!strategy) {
      return false;
    }
    return strategy.isHealthy(sessionId);
  }

  /**
   * Get session info
   */
  async getSessionInfo(sessionId: string): Promise<TerminalSession | null> {
    const strategy = this.activeSessions.get(sessionId);
    if (!strategy) {
      return null;
    }
    return strategy.getSessionInfo(sessionId);
  }

  /**
   * Cleanup all sessions
   */
  async cleanup(): Promise<void> {
    const cleanupPromises = Array.from(this.strategies.values()).map(s => s.cleanup());
    await Promise.all(cleanupPromises);
    this.activeSessions.clear();
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    return this.activeSessions.size;
  }

  /**
   * Get all active session IDs
   */
  getActiveSessionIds(): string[] {
    return Array.from(this.activeSessions.keys());
  }

  /**
   * Get session type
   */
  getSessionType(sessionId: string): 'local' | 'ssh' | 'docker' | null {
    const strategy = this.activeSessions.get(sessionId);
    return strategy?.type || null;
  }
}

