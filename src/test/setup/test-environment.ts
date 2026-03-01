/**
 * Test Environment Setup
 * Initializes mock services and test environment configuration
 */

import { sshMockService, dockerMockService } from '../mocks';

/** Test environment configuration */
export interface TestEnvironmentConfig {
  /** Enable verbose logging */
  verbose: boolean;
  /** Mock Tauri IPC */
  mockTauri: boolean;
  /** Mock SSH service */
  mockSsh: boolean;
  /** Mock Docker service */
  mockDocker: boolean;
  /** Test timeout in milliseconds */
  timeout: number;
}

/** Default test environment configuration */
export const defaultTestConfig: TestEnvironmentConfig = {
  verbose: true,
  mockTauri: true,
  mockSsh: true,
  mockDocker: true,
  timeout: 30000,
};

/** Current test environment configuration */
let currentConfig: TestEnvironmentConfig = { ...defaultTestConfig };

/**
 * Initialize test environment
 */
export function initTestEnvironment(config?: Partial<TestEnvironmentConfig>): void {
  currentConfig = { ...defaultTestConfig, ...config };

  if (currentConfig.verbose) {
    console.log('[Test Environment] Initializing...');
    console.log('[Test Environment] Config:', currentConfig);
  }

  // Reset mock services
  if (currentConfig.mockSsh) {
    sshMockService.reset();
    if (currentConfig.verbose) {
      console.log('[Test Environment] SSH Mock Service initialized');
    }
  }

  if (currentConfig.mockDocker) {
    dockerMockService.reset();
    if (currentConfig.verbose) {
      console.log('[Test Environment] Docker Mock Service initialized');
    }
  }

  if (currentConfig.verbose) {
    console.log('[Test Environment] Initialization complete');
  }
}

/**
 * Get current test environment configuration
 */
export function getTestConfig(): TestEnvironmentConfig {
  return { ...currentConfig };
}

/**
 * Reset test environment
 */
export function resetTestEnvironment(): void {
  sshMockService.reset();
  dockerMockService.reset();

  if (currentConfig.verbose) {
    console.log('[Test Environment] Reset complete');
  }
}

/**
 * Cleanup test environment
 */
export function cleanupTestEnvironment(): void {
  sshMockService.reset();
  dockerMockService.reset();

  if (currentConfig.verbose) {
    console.log('[Test Environment] Cleanup complete');
  }
}

/**
 * Create mock invoke function for Tauri IPC
 */
export function createMockInvoke(): (cmd: string, args?: Record<string, unknown>) => Promise<unknown> {
  return async (cmd: string, args?: Record<string, unknown>) => {
    const { success } = await import('../mocks');

    // SSH commands
    if (cmd === 'get_ssh_configs') {
      return { success: true, data: sshMockService.getConfigs() };
    }
    if (cmd === 'get_ssh_config') {
      return { success: true, data: sshMockService.getConfig(args?.connectionId as string) };
    }
    if (cmd === 'save_ssh_config') {
      return { success: true, data: sshMockService.saveConfig(args?.config as never) };
    }
    if (cmd === 'delete_ssh_config') {
      sshMockService.deleteConfig(args?.connectionId as string);
      return { success: true, data: null };
    }
    if (cmd === 'test_ssh_connection') {
      return { success: true, data: sshMockService.testConnection(args?.options as Record<string, unknown>) };
    }
    if (cmd === 'connect_ssh') {
      return { success: true, data: sshMockService.connect(args?.connectionId as string) };
    }
    if (cmd === 'disconnect_ssh') {
      sshMockService.disconnect(args?.sessionId as string);
      return { success: true, data: null };
    }
    if (cmd === 'ssh_input') {
      sshMockService.sendInput(args?.sessionId as string, args?.data as string);
      return { success: true, data: null };
    }
    if (cmd === 'resize_ssh') {
      sshMockService.resize(args?.sessionId as string, args?.cols as number, args?.rows as number);
      return { success: true, data: null };
    }
    if (cmd === 'get_ssh_session_status') {
      return { success: true, data: sshMockService.getSessionStatus(args?.sessionId as string) };
    }
    if (cmd === 'get_ssh_sessions') {
      return { success: true, data: sshMockService.getActiveSessions() };
    }

    // Docker commands
    if (cmd === 'connect_docker') {
      return { success: true, data: dockerMockService.connect() };
    }
    if (cmd === 'is_docker_connected') {
      return { success: true, data: dockerMockService.isConnected() };
    }
    if (cmd === 'disconnect_docker') {
      dockerMockService.disconnect();
      return { success: true, data: null };
    }
    if (cmd === 'list_docker_containers') {
      return { success: true, data: dockerMockService.listContainers(args?.all as boolean) };
    }
    if (cmd === 'get_docker_container') {
      return { success: true, data: dockerMockService.getContainer(args?.containerId as string) };
    }
    if (cmd === 'list_docker_images') {
      return { success: true, data: dockerMockService.listImages() };
    }
    if (cmd === 'start_docker_container') {
      return { success: true, data: dockerMockService.startContainer(args?.containerId as string) };
    }
    if (cmd === 'stop_docker_container') {
      return { success: true, data: dockerMockService.stopContainer(args?.containerId as string) };
    }
    if (cmd === 'restart_docker_container') {
      return { success: true, data: dockerMockService.restartContainer(args?.containerId as string) };
    }
    if (cmd === 'create_docker_exec') {
      return { success: true, data: dockerMockService.createExec(args?.containerId as string, args?.cols as number, args?.rows as number) };
    }
    if (cmd === 'docker_exec_input') {
      dockerMockService.execInput(args?.sessionId as string, args?.data as string);
      return { success: true, data: null };
    }
    if (cmd === 'resize_docker_exec') {
      dockerMockService.resizeExec(args?.sessionId as string, args?.cols as number, args?.rows as number);
      return { success: true, data: null };
    }
    if (cmd === 'disconnect_docker_exec') {
      dockerMockService.disconnectExec(args?.sessionId as string);
      return { success: true, data: null };
    }
    if (cmd === 'get_docker_exec_status') {
      return { success: true, data: dockerMockService.getExecStatus(args?.sessionId as string) };
    }
    if (cmd === 'get_docker_exec_sessions') {
      return { success: true, data: dockerMockService.getExecSessions() };
    }

    // Unknown command
    console.warn(`[Mock Invoke] Unknown command: ${cmd}`);
    return { success: false, error: `Unknown command: ${cmd}`, error_code: 'UNKNOWN_COMMAND' };
  };
}

// Re-export mock services
export { sshMockService, dockerMockService };
