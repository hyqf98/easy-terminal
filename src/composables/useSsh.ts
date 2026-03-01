/**
 * useSsh - SSH connection management composable
 * Handles SSH session lifecycle, input/output, and events
 */
import { ref, onMounted, onUnmounted, type Ref } from 'vue';
import { useConnectionsStore } from '@/stores';
import {
  connectSsh,
  disconnectSsh,
  sshInput,
  resizeSsh,
  getSshConfigs,
  saveSshConfig,
  deleteSshConfig,
  testSshConnection,
} from '@/services/ssh.service';
import { onSshOutput } from '@/services/events';
import type { UnlistenFn } from '@tauri-apps/api/event';
import type { SshConnectionConfig, SshTestResult } from '@/types';

export interface UseSshOptions {
  /** Callback when output is received */
  onOutput?: (sessionId: string, data: string) => void;
  /** Callback when connection is established */
  onConnect?: (sessionId: string, config: SshConnectionConfig) => void;
  /** Callback when connection is closed */
  onDisconnect?: (sessionId: string) => void;
  /** Callback on connection error */
  onError?: (sessionId: string, error: string) => void;
}

export interface UseSshReturn {
  /** Loading state */
  isLoading: Ref<boolean>;
  /** Error state */
  error: Ref<string | null>;
  /** All SSH configs */
  configs: Ref<SshConnectionConfig[]>;
  /** Active SSH sessions (sessionId -> configId mapping) */
  activeSessions: Ref<Map<string, string>>;
  /** Connect to SSH server */
  connect: (configId: string, cols?: number, rows?: number) => Promise<string>;
  /** Disconnect SSH session */
  disconnect: (sessionId: string) => Promise<void>;
  /** Send input to SSH session */
  sendInput: (sessionId: string, data: string) => Promise<void>;
  /** Resize SSH terminal */
  resize: (sessionId: string, cols: number, rows: number) => Promise<void>;
  /** Load all SSH configs */
  loadConfigs: () => Promise<void>;
  /** Save SSH config */
  saveConfig: (config: SshConnectionConfig) => Promise<SshConnectionConfig>;
  /** Delete SSH config */
  deleteConfig: (configId: string) => Promise<void>;
  /** Test SSH connection */
  testConnection: (config: Omit<SshConnectionConfig, 'id' | 'type' | 'createdAt'>) => Promise<SshTestResult>;
  /** Get config by ID */
  getConfig: (configId: string) => SshConnectionConfig | undefined;
}

/**
 * SSH management composable
 */
export function useSsh(options: UseSshOptions = {}): UseSshReturn {
  const { onOutput, onConnect, onDisconnect, onError } = options;

  const connectionsStore = useConnectionsStore();

  // State
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const configs = ref<SshConnectionConfig[]>([]);
  const activeSessions = ref<Map<string, string>>(new Map());

  // Event unlisteners
  let unlistenOutput: UnlistenFn | null = null;

  // Setup event listeners
  async function setupEventListeners(): Promise<void> {
    unlistenOutput = await onSshOutput((event) => {
      const { session_id, data } = event;

      // Update connection status
      const configId = activeSessions.value.get(session_id);
      if (configId) {
        connectionsStore.setConnectionStatus(configId, 'connected');
      }

      // Call custom callback
      if (onOutput) {
        onOutput(session_id, data);
      }
    });
  }

  // Cleanup event listeners
  function cleanupEventListeners(): void {
    if (unlistenOutput) {
      unlistenOutput();
      unlistenOutput = null;
    }
  }

  // Connect to SSH server
  async function connect(
    configId: string,
    _cols = 80,
    _rows = 24
  ): Promise<string> {
    isLoading.value = true;
    error.value = null;

    const config = configs.value.find(c => c.id === configId);
    if (!config) {
      error.value = 'Configuration not found';
      throw new Error('Configuration not found');
    }

    connectionsStore.setConnectionStatus(configId, 'connecting');

    try {
      const sessionId = await connectSsh(configId);
      activeSessions.value.set(sessionId, configId);
      connectionsStore.setConnectionStatus(configId, 'connected');

      if (onConnect) {
        onConnect(sessionId, config);
      }

      return sessionId;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      error.value = message;
      connectionsStore.setConnectionStatus(configId, 'error', message);

      if (onError && configId) {
        onError(configId, message);
      }

      throw e;
    } finally {
      isLoading.value = false;
    }
  }

  // Disconnect SSH session
  async function disconnect(sessionId: string): Promise<void> {
    try {
      await disconnectSsh(sessionId);

      const configId = activeSessions.value.get(sessionId);
      activeSessions.value.delete(sessionId);

      if (configId) {
        connectionsStore.setConnectionStatus(configId, 'disconnected');
      }

      if (onDisconnect) {
        onDisconnect(sessionId);
      }
    } catch (e) {
      console.error('Failed to disconnect SSH session:', e);
      throw e;
    }
  }

  // Send input to SSH session
  async function sendInput(sessionId: string, data: string): Promise<void> {
    try {
      await sshInput(sessionId, data);
    } catch (e) {
      console.error('Failed to send SSH input:', e);
      throw e;
    }
  }

  // Resize SSH terminal
  async function resize(
    sessionId: string,
    cols: number,
    rows: number
  ): Promise<void> {
    try {
      await resizeSsh(sessionId, cols, rows);
    } catch (e) {
      console.error('Failed to resize SSH terminal:', e);
      throw e;
    }
  }

  // Load all SSH configs
  async function loadConfigs(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      configs.value = await getSshConfigs();

      // Sync with connections store
      configs.value.forEach(config => {
        if (!connectionsStore.getConnection(config.id)) {
          connectionsStore.addConnection(config);
        }
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      error.value = message;
      console.error('Failed to load SSH configs:', e);
    } finally {
      isLoading.value = false;
    }
  }

  // Save SSH config
  async function saveConfig(config: SshConnectionConfig): Promise<SshConnectionConfig> {
    isLoading.value = true;
    error.value = null;

    try {
      const saved = await saveSshConfig(config);

      // Update local state
      const index = configs.value.findIndex(c => c.id === saved.id);
      if (index >= 0) {
        configs.value[index] = saved;
      } else {
        configs.value.push(saved);
      }

      // Update connections store
      connectionsStore.addConnection(saved);

      return saved;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      error.value = message;
      console.error('Failed to save SSH config:', e);
      throw e;
    } finally {
      isLoading.value = false;
    }
  }

  // Delete SSH config
  async function deleteConfig(configId: string): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      await deleteSshConfig(configId);

      // Update local state
      configs.value = configs.value.filter(c => c.id !== configId);

      // Update connections store
      connectionsStore.removeConnection(configId);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      error.value = message;
      console.error('Failed to delete SSH config:', e);
      throw e;
    } finally {
      isLoading.value = false;
    }
  }

  // Test SSH connection
  async function testConnection(
    configOptions: Omit<SshConnectionConfig, 'id' | 'type' | 'createdAt'>
  ): Promise<SshTestResult> {
    isLoading.value = true;
    error.value = null;

    try {
      const result = await testSshConnection({
        name: configOptions.name,
        host: configOptions.host,
        port: configOptions.port,
        username: configOptions.username,
        authType: configOptions.authType,
        password: configOptions.password,
        privateKeyPath: configOptions.privateKeyPath,
        passphrase: configOptions.passphrase,
        cwd: configOptions.cwd,
      });

      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      error.value = message;
      return {
        success: false,
        error: message,
      };
    } finally {
      isLoading.value = false;
    }
  }

  // Get config by ID
  function getConfig(configId: string): SshConnectionConfig | undefined {
    return configs.value.find(c => c.id === configId);
  }

  // Lifecycle
  onMounted(async () => {
    await setupEventListeners();
    await loadConfigs();
  });

  onUnmounted(() => {
    cleanupEventListeners();
  });

  return {
    isLoading,
    error,
    configs,
    activeSessions,
    connect,
    disconnect,
    sendInput,
    resize,
    loadConfigs,
    saveConfig,
    deleteConfig,
    testConnection,
    getConfig,
  };
}

/**
 * Simplified composable for a single SSH session
 */
export function useSshSession(sessionId: Ref<string | null>) {
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Send input
  async function sendInput(data: string): Promise<void> {
    if (!sessionId.value) return;
    isLoading.value = true;
    try {
      await sshInput(sessionId.value, data);
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      isLoading.value = false;
    }
  }

  // Resize
  async function resize(cols: number, rows: number): Promise<void> {
    if (!sessionId.value) return;
    try {
      await resizeSsh(sessionId.value, cols, rows);
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      throw e;
    }
  }

  // Disconnect
  async function disconnect(): Promise<void> {
    if (!sessionId.value) return;
    try {
      await disconnectSsh(sessionId.value);
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      throw e;
    }
  }

  return {
    isLoading,
    error,
    sendInput,
    resize,
    disconnect,
  };
}
