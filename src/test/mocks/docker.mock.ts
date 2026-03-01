/**
 * Docker Mock Data for E2E Testing
 * Provides mock Docker containers, images, and operations
 */

import type { DockerContainer, DockerImage, DockerOperationResult } from '@/types';

/** Mock Docker Containers */
export const mockDockerContainers: DockerContainer[] = [
  {
    id: 'abc12345',
    full_id: 'abc12345def6789012345678901234567890abcdef1234567890abcdef123456',
    names: ['/nginx-web'],
    image: 'nginx:latest',
    image_id: 'sha256:abc123',
    status: 'Up 2 hours',
    state: 'running',
    created: Date.now() / 1000 - 7200,
    ports: [
      { private_port: 80, public_port: 8080, ip: '0.0.0.0', protocol: 'tcp' },
    ],
    is_running: true,
  },
  {
    id: 'def67890',
    full_id: 'def67890abc123456789012345678901234567890abcdef1234567890abcdef',
    names: ['/redis-cache'],
    image: 'redis:7-alpine',
    image_id: 'sha256:def456',
    status: 'Up 1 day',
    state: 'running',
    created: Date.now() / 1000 - 86400,
    ports: [
      { private_port: 6379, public_port: 6379, ip: '0.0.0.0', protocol: 'tcp' },
    ],
    is_running: true,
  },
  {
    id: 'ghi24680',
    full_id: 'ghi24680def123456789012345678901234567890abcdef1234567890abcdef',
    names: ['/postgres-db'],
    image: 'postgres:15',
    image_id: 'sha256:ghi789',
    status: 'Exited (0) 3 hours ago',
    state: 'exited',
    created: Date.now() / 1000 - 86400 * 2,
    ports: [
      { private_port: 5432, protocol: 'tcp' },
    ],
    is_running: false,
  },
  {
    id: 'jkl13579',
    full_id: 'jkl13579ghi2468012345678901234567890abcdef1234567890abcdef123456',
    names: ['/node-app'],
    image: 'node:18-alpine',
    image_id: 'sha256:jkl012',
    status: 'Up 30 minutes',
    state: 'running',
    created: Date.now() / 1000 - 1800,
    ports: [
      { private_port: 3000, public_port: 3000, ip: '127.0.0.1', protocol: 'tcp' },
    ],
    is_running: true,
  },
  {
    id: 'mbo97531',
    full_id: 'mbo97531jkl135792468012345678901234567890abcdef1234567890abcdef',
    names: ['/python-api'],
    image: 'python:3.11-slim',
    image_id: 'sha256:mno345',
    status: 'Created',
    state: 'created',
    created: Date.now() / 1000 - 60,
    ports: [],
    is_running: false,
  },
];

/** Mock Docker Images */
export const mockDockerImages: DockerImage[] = [
  {
    id: 'sha256:abc123def456',
    repo_tags: ['nginx:latest', 'nginx:1.25'],
    size: 142000000,
    created: Date.now() / 1000 - 86400 * 7,
  },
  {
    id: 'sha256:def456ghi789',
    repo_tags: ['redis:7-alpine', 'redis:latest'],
    size: 32000000,
    created: Date.now() / 1000 - 86400 * 3,
  },
  {
    id: 'sha256:ghi789jkl012',
    repo_tags: ['postgres:15', 'postgres:latest'],
    size: 379000000,
    created: Date.now() / 1000 - 86400 * 5,
  },
  {
    id: 'sha256:jkl012mno345',
    repo_tags: ['node:18-alpine'],
    size: 180000000,
    created: Date.now() / 1000 - 86400 * 2,
  },
  {
    id: 'sha256:mno345pqr678',
    repo_tags: ['python:3.11-slim'],
    size: 150000000,
    created: Date.now() / 1000 - 86400 * 1,
  },
  {
    id: 'sha256:pqr678stu901',
    repo_tags: ['ubuntu:22.04'],
    size: 77000000,
    created: Date.now() / 1000 - 86400 * 10,
  },
];

/** Mock Docker Exec Sessions */
export const mockDockerExecSessions: Map<string, {
  containerId: string;
  status: string;
  output: string[];
}> = new Map([
  ['exec-session-1', {
    containerId: 'abc12345',
    status: 'connected',
    output: ['root@nginx-web:/# '],
  }],
  ['exec-session-2', {
    containerId: 'def67890',
    status: 'connected',
    output: ['data@redis-cache:/data$ '],
  }],
]);

/**
 * Docker Mock Service Class
 * Simulates Docker service behavior for testing
 */
export class DockerMockService {
  private connected: boolean = true;
  private containers: DockerContainer[] = [...mockDockerContainers];
  private images: DockerImage[] = [...mockDockerImages];
  private execSessions: Map<string, {
    containerId: string;
    status: string;
    output: string[];
  }> = new Map(mockDockerExecSessions);

  /** Connect to Docker daemon */
  connect(): boolean {
    this.connected = true;
    return true;
  }

  /** Check if Docker is connected */
  isConnected(): boolean {
    return this.connected;
  }

  /** Disconnect from Docker daemon */
  disconnect(): void {
    this.connected = false;
  }

  /** List containers */
  listContainers(all: boolean = false): DockerContainer[] {
    if (all) {
      return this.containers;
    }
    return this.containers.filter(c => c.is_running);
  }

  /** Get container by ID */
  getContainer(id: string): DockerContainer | null {
    return this.containers.find(c => c.id === id || c.full_id === id) || null;
  }

  /** List images */
  listImages(): DockerImage[] {
    return this.images;
  }

  /** Start container */
  startContainer(containerId: string): DockerOperationResult {
    const container = this.getContainer(containerId);
    if (!container) {
      return {
        success: false,
        container_id: containerId,
        error: 'Container not found',
      };
    }

    container.is_running = true;
    container.state = 'running';
    container.status = 'Up just now';

    return {
      success: true,
      container_id: containerId,
    };
  }

  /** Stop container */
  stopContainer(containerId: string): DockerOperationResult {
    const container = this.getContainer(containerId);
    if (!container) {
      return {
        success: false,
        container_id: containerId,
        error: 'Container not found',
      };
    }

    container.is_running = false;
    container.state = 'exited';
    container.status = 'Exited (0) just now';

    return {
      success: true,
      container_id: containerId,
    };
  }

  /** Restart container */
  restartContainer(containerId: string): DockerOperationResult {
    const container = this.getContainer(containerId);
    if (!container) {
      return {
        success: false,
        container_id: containerId,
        error: 'Container not found',
      };
    }

    container.is_running = true;
    container.state = 'running';
    container.status = 'Up just now (restarted)';

    return {
      success: true,
      container_id: containerId,
    };
  }

  /** Create exec session */
  createExec(containerId: string, cols: number = 80, rows: number = 24): string {
    const container = this.getContainer(containerId);
    if (!container) {
      throw new Error('Container not found');
    }

    if (!container.is_running) {
      throw new Error('Container is not running');
    }

    const sessionId = `exec-session-${Date.now()}`;
    this.execSessions.set(sessionId, {
      containerId,
      status: 'connected',
      output: [`root@${container.names[0].slice(1)}:/# `],
    });

    return sessionId;
  }

  /** Send input to exec session */
  execInput(sessionId: string, data: string): void {
    const session = this.execSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const container = this.getContainer(session.containerId);
    const containerName = container?.names[0]?.slice(1) || 'container';

    // Simulate command output
    if (data.trim() === 'ls') {
      session.output.push('bin  boot  dev  etc  home  lib  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var');
    } else if (data.trim() === 'pwd') {
      session.output.push('/');
    } else if (data.trim() === 'whoami') {
      session.output.push('root');
    } else if (data.trim() === 'hostname') {
      session.output.push(containerName);
    } else if (data.trim() === 'env') {
      session.output.push('PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin');
      session.output.push('HOSTNAME=' + containerName);
      session.output.push('HOME=/root');
    }
    session.output.push(`root@${containerName}:/# `);
  }

  /** Resize exec terminal */
  resizeExec(_sessionId: string, _cols: number, _rows: number): void {
    // Simulate resize
  }

  /** Disconnect exec session */
  disconnectExec(sessionId: string): void {
    const session = this.execSessions.get(sessionId);
    if (session) {
      session.status = 'disconnected';
    }
  }

  /** Get exec session status */
  getExecStatus(sessionId: string): string {
    return this.execSessions.get(sessionId)?.status || 'unknown';
  }

  /** Get all active exec sessions */
  getExecSessions(): string[] {
    return Array.from(this.execSessions.entries())
      .filter(([_, session]) => session.status === 'connected')
      .map(([id]) => id);
  }

  /** Get exec output */
  getExecOutput(sessionId: string): string[] {
    return this.execSessions.get(sessionId)?.output || [];
  }

  /** Reset mock state */
  reset(): void {
    this.connected = true;
    this.containers = [...mockDockerContainers];
    this.images = [...mockDockerImages];
    this.execSessions = new Map(mockDockerExecSessions);
  }

  /** Simulate Docker not available */
  setDockerUnavailable(): void {
    this.connected = false;
  }
}

/** Default Docker mock service instance */
export const dockerMockService = new DockerMockService();
