/**
 * Test Environment Verification
 * Verifies that the test environment is correctly configured
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  sshMockService,
  dockerMockService,
  initTestEnvironment,
  cleanupTestEnvironment,
  createMockInvoke,
  mockSshConfigs,
  mockDockerContainers,
  mockDockerImages,
} from '../index';

describe('Test Environment', () => {
  beforeAll(() => {
    initTestEnvironment({
      verbose: false,
      mockTauri: true,
      mockSsh: true,
      mockDocker: true,
    });
  });

  afterAll(() => {
    cleanupTestEnvironment();
  });

  describe('SSH Mock Service', () => {
    it('should initialize with mock configs', () => {
      const configs = sshMockService.getConfigs();
      expect(configs).toHaveLength(mockSshConfigs.length);
      expect(configs[0].name).toBe('Test Server (Ubuntu)');
    });

    it('should get config by ID', () => {
      const config = sshMockService.getConfig('ssh-test-1');
      expect(config).toBeDefined();
      expect(config?.host).toBe('192.168.1.100');
    });

    it('should return null for unknown config', () => {
      const config = sshMockService.getConfig('unknown-id');
      expect(config).toBeNull();
    });

    it('should save new config', () => {
      const newConfig = {
        id: 'ssh-new',
        name: 'New Server',
        type: 'ssh' as const,
        host: '10.0.0.1',
        port: 22,
        username: 'admin',
        authType: 'password' as const,
        isFavorite: false,
        createdAt: Date.now(),
      };

      sshMockService.saveConfig(newConfig);
      const saved = sshMockService.getConfig('ssh-new');
      expect(saved).toBeDefined();
      expect(saved?.name).toBe('New Server');
    });

    it('should delete config', () => {
      sshMockService.deleteConfig('ssh-new');
      const deleted = sshMockService.getConfig('ssh-new');
      expect(deleted).toBeNull();
    });

    it('should test connection successfully', () => {
      const result = sshMockService.testConnection({});
      expect(result.success).toBe(true);
      expect(result.serverVersion).toBeDefined();
    });

    it('should create SSH session', () => {
      const sessionId = sshMockService.connect('ssh-test-1');
      expect(sessionId).toBeDefined();
      expect(sessionId.startsWith('session-')).toBe(true);

      const status = sshMockService.getSessionStatus(sessionId);
      expect(status).toBe('connected');
    });

    it('should disconnect session', () => {
      const sessionId = sshMockService.connect('ssh-test-2');
      sshMockService.disconnect(sessionId);
      const status = sshMockService.getSessionStatus(sessionId);
      expect(status).toBe('disconnected');
    });

    it('should handle input and generate output', () => {
      const sessionId = sshMockService.connect('ssh-test-1');
      sshMockService.sendInput(sessionId, 'ls\n');
      const output = sshMockService.getOutput(sessionId);
      expect(output.length).toBeGreaterThan(0);
      expect(output.some(line => line.includes('Documents'))).toBe(true);
    });

    it('should list active sessions', () => {
      sshMockService.connect('ssh-test-1');
      sshMockService.connect('ssh-test-2');
      const sessions = sshMockService.getActiveSessions();
      expect(sessions.length).toBeGreaterThan(0);
    });

    it('should reset service state', () => {
      sshMockService.connect('ssh-test-1');
      sshMockService.reset();
      const sessions = sshMockService.getActiveSessions();
      expect(sessions).toHaveLength(0);
    });
  });

  describe('Docker Mock Service', () => {
    beforeEach(() => {
      // Reset Docker mock service before each test for isolation
      dockerMockService.reset();
    });

    it('should be connected by default', () => {
      expect(dockerMockService.isConnected()).toBe(true);
    });

    it('should connect to Docker daemon', () => {
      const result = dockerMockService.connect();
      expect(result).toBe(true);
    });

    it('should disconnect from Docker daemon', () => {
      dockerMockService.disconnect();
      expect(dockerMockService.isConnected()).toBe(false);
      dockerMockService.connect(); // Reconnect for other tests
    });

    it('should list running containers', () => {
      const containers = dockerMockService.listContainers(false);
      expect(containers.length).toBeGreaterThan(0);
      expect(containers.every(c => c.is_running)).toBe(true);
    });

    it('should list all containers', () => {
      const containers = dockerMockService.listContainers(true);
      expect(containers).toHaveLength(mockDockerContainers.length);
    });

    it('should get container by ID', () => {
      const container = dockerMockService.getContainer('abc12345');
      expect(container).toBeDefined();
      expect(container?.names).toContain('/nginx-web');
    });

    it('should list images', () => {
      const images = dockerMockService.listImages();
      expect(images).toHaveLength(mockDockerImages.length);
    });

    it('should start container', () => {
      const result = dockerMockService.startContainer('ghi24680');
      expect(result.success).toBe(true);

      const container = dockerMockService.getContainer('ghi24680');
      expect(container?.is_running).toBe(true);
    });

    it('should stop container', () => {
      const result = dockerMockService.stopContainer('abc12345');
      expect(result.success).toBe(true);

      const container = dockerMockService.getContainer('abc12345');
      expect(container?.is_running).toBe(false);
    });

    it('should restart container', () => {
      const result = dockerMockService.restartContainer('def67890');
      expect(result.success).toBe(true);

      const container = dockerMockService.getContainer('def67890');
      expect(container?.is_running).toBe(true);
    });

    it('should return error for unknown container', () => {
      const result = dockerMockService.startContainer('unknown-id');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should create exec session', () => {
      // Ensure container is running before creating exec session
      dockerMockService.startContainer('abc12345');
      const sessionId = dockerMockService.createExec('abc12345', 80, 24);
      expect(sessionId).toBeDefined();
      expect(sessionId.startsWith('exec-session-')).toBe(true);

      const status = dockerMockService.getExecStatus(sessionId);
      expect(status).toBe('connected');
    });

    it('should throw error for non-running container exec', () => {
      dockerMockService.stopContainer('ghi24680');
      expect(() => dockerMockService.createExec('ghi24680')).toThrow('Container is not running');
    });

    it('should handle exec input', () => {
      dockerMockService.startContainer('abc12345');
      const sessionId = dockerMockService.createExec('abc12345');
      dockerMockService.execInput(sessionId, 'ls\n');
      const output = dockerMockService.getExecOutput(sessionId);
      expect(output.some(line => line.includes('bin'))).toBe(true);
    });

    it('should disconnect exec session', () => {
      dockerMockService.startContainer('abc12345');
      const sessionId = dockerMockService.createExec('abc12345');
      dockerMockService.disconnectExec(sessionId);
      const status = dockerMockService.getExecStatus(sessionId);
      expect(status).toBe('disconnected');
    });

    it('should list active exec sessions', () => {
      dockerMockService.startContainer('abc12345');
      dockerMockService.startContainer('def67890');
      dockerMockService.createExec('abc12345');
      dockerMockService.createExec('def67890');
      const sessions = dockerMockService.getExecSessions();
      expect(sessions.length).toBeGreaterThan(0);
    });

    it('should reset service state', () => {
      dockerMockService.reset();
      expect(dockerMockService.isConnected()).toBe(true);
    });

    it('should simulate Docker unavailable', () => {
      dockerMockService.setDockerUnavailable();
      expect(dockerMockService.isConnected()).toBe(false);
      dockerMockService.reset();
    });
  });

  describe('Mock Invoke Function', () => {
    const mockInvoke = createMockInvoke();

    it('should handle SSH commands', async () => {
      const result = await mockInvoke('get_ssh_configs');
      expect(result).toEqual({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ id: 'ssh-test-1' }),
        ]),
      });
    });

    it('should handle Docker commands', async () => {
      const result = await mockInvoke('list_docker_containers', { all: true });
      expect(result).toEqual({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ id: 'abc12345' }),
        ]),
      });
    });

    it('should return error for unknown command', async () => {
      const result = await mockInvoke('unknown_command');
      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('Unknown command'),
        error_code: 'UNKNOWN_COMMAND',
      });
    });
  });
});
