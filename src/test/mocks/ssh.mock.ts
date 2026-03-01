/**
 * SSH Mock Data for E2E Testing
 * Provides mock SSH connections, sessions, and responses
 */

import type { SshConnectionConfig, SshTestResult } from '@/types';

/** Mock SSH Connection Configurations */
export const mockSshConfigs: SshConnectionConfig[] = [
  {
    id: 'ssh-test-1',
    name: 'Test Server (Ubuntu)',
    type: 'ssh',
    host: '192.168.1.100',
    port: 22,
    username: 'testuser',
    authType: 'password',
    password: 'testpassword',
    isFavorite: true,
    createdAt: Date.now() - 86400000 * 7,
    lastConnectedAt: Date.now() - 3600000,
  },
  {
    id: 'ssh-test-2',
    name: 'Dev Server (CentOS)',
    type: 'ssh',
    host: '192.168.1.101',
    port: 22,
    username: 'developer',
    authType: 'key',
    privateKeyPath: '/home/testuser/.ssh/id_rsa',
    isFavorite: false,
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'ssh-test-3',
    name: 'Production Server',
    type: 'ssh',
    host: 'prod.example.com',
    port: 2222,
    username: 'admin',
    authType: 'agent',
    isFavorite: true,
    createdAt: Date.now() - 86400000 * 30,
    lastConnectedAt: Date.now() - 86400000,
  },
];

/** Mock SSH Test Results */
export const mockSshTestResults: Record<string, SshTestResult> = {
  success: {
    success: true,
    serverVersion: 'SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.1',
    banner: 'Welcome to Ubuntu 22.04 LTS',
  },
  failure: {
    success: false,
    error: 'Connection refused',
  },
  authFailure: {
    success: false,
    error: 'Authentication failed: Invalid password',
  },
  timeout: {
    success: false,
    error: 'Connection timeout',
  },
};

/** Mock SSH Session States */
export const mockSshSessionStates: Record<string, string> = {
  'session-1': 'connected',
  'session-2': 'connected',
  'session-3': 'disconnected',
};

/** Mock SSH Session IDs */
export const mockSshSessionIds: string[] = ['session-1', 'session-2'];

/** Mock terminal output for SSH sessions */
export const mockSshOutput: Record<string, string[]> = {
  'session-1': [
    'Welcome to Ubuntu 22.04 LTS (GNU/Linux 5.15.0-58-generic x86_64)',
    '',
    ' * Documentation:  https://help.ubuntu.com',
    ' * Management:     https://landscape.canonical.com',
    ' * Support:        https://ubuntu.com/advantage',
    '',
    'Last login: Sat Mar  1 10:00:00 2026 from 192.168.1.50',
    'testuser@ubuntu-server:~$ ',
  ],
  'session-2': [
    'Welcome to CentOS Stream 9',
    '',
    '[developer@centos-dev ~]$ ',
  ],
};

/**
 * SSH Mock Service Class
 * Simulates SSH service behavior for testing
 */
export class SshMockService {
  private configs: SshConnectionConfig[] = [...mockSshConfigs];
  private sessions: Map<string, { configId: string; status: string }> = new Map();
  private outputBuffers: Map<string, string[]> = new Map();

  constructor() {
    // Initialize with mock sessions
    mockSshSessionIds.forEach((id, index) => {
      this.sessions.set(id, {
        configId: mockSshConfigs[index]?.id || 'unknown',
        status: 'connected',
      });
    });

    // Initialize output buffers
    Object.entries(mockSshOutput).forEach(([sessionId, output]) => {
      this.outputBuffers.set(sessionId, output);
    });
  }

  /** Get all SSH configs */
  getConfigs(): SshConnectionConfig[] {
    return this.configs;
  }

  /** Get SSH config by ID */
  getConfig(id: string): SshConnectionConfig | null {
    return this.configs.find(c => c.id === id) || null;
  }

  /** Save SSH config */
  saveConfig(config: SshConnectionConfig): SshConnectionConfig {
    const index = this.configs.findIndex(c => c.id === config.id);
    if (index >= 0) {
      this.configs[index] = config;
    } else {
      this.configs.push(config);
    }
    return config;
  }

  /** Delete SSH config */
  deleteConfig(id: string): boolean {
    const index = this.configs.findIndex(c => c.id === id);
    if (index >= 0) {
      this.configs.splice(index, 1);
      return true;
    }
    return false;
  }

  /** Test SSH connection */
  testConnection(_options: Record<string, unknown>): SshTestResult {
    // Simulate successful connection test
    return mockSshTestResults.success;
  }

  /** Connect to SSH and return session ID */
  connect(connectionId: string): string {
    const config = this.getConfig(connectionId);
    if (!config) {
      throw new Error(`Config not found: ${connectionId}`);
    }

    const sessionId = `session-${Date.now()}`;
    this.sessions.set(sessionId, {
      configId: connectionId,
      status: 'connected',
    });
    this.outputBuffers.set(sessionId, [
      `Connected to ${config.host}`,
      `${config.username}@${config.host}:~$ `,
    ]);

    return sessionId;
  }

  /** Disconnect SSH session */
  disconnect(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'disconnected';
    }
  }

  /** Get session status */
  getSessionStatus(sessionId: string): string {
    return this.sessions.get(sessionId)?.status || 'unknown';
  }

  /** Get all active sessions */
  getActiveSessions(): string[] {
    return Array.from(this.sessions.entries())
      .filter(([_, session]) => session.status === 'connected')
      .map(([id]) => id);
  }

  /** Send input to session */
  sendInput(sessionId: string, data: string): void {
    const buffer = this.outputBuffers.get(sessionId) || [];
    // Simulate command output
    if (data.trim() === 'ls') {
      buffer.push('Documents  Downloads  Pictures  Videos');
    } else if (data.trim() === 'pwd') {
      buffer.push('/home/testuser');
    } else if (data.trim() === 'whoami') {
      buffer.push('testuser');
    }
    buffer.push(`testuser@server:~$ `);
    this.outputBuffers.set(sessionId, buffer);
  }

  /** Get output buffer */
  getOutput(sessionId: string): string[] {
    return this.outputBuffers.get(sessionId) || [];
  }

  /** Resize terminal */
  resize(_sessionId: string, _cols: number, _rows: number): void {
    // Simulate resize
  }

  /** Reset mock state */
  reset(): void {
    this.configs = [...mockSshConfigs];
    this.sessions.clear();
    this.outputBuffers.clear();
  }
}

/** Default SSH mock service instance */
export const sshMockService = new SshMockService();
