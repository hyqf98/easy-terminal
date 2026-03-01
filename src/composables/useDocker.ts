/**
 * useDocker - Docker management composable
 * Handles Docker connection, containers, images, and exec sessions
 */
import { ref, onMounted, onUnmounted, type Ref } from 'vue';
import {
  connectDocker,
  isDockerConnected,
  listDockerContainers,
  listDockerImages,
  startDockerContainer,
  stopDockerContainer,
  restartDockerContainer,
  createDockerExec,
  dockerExecInput,
  resizeDockerExec,
  disconnectDockerExec,
  disconnectDocker as disconnectDockerService,
} from '@/services/docker.service';
import { onDockerOutput } from '@/services/events';
import type { UnlistenFn } from '@tauri-apps/api/event';
import type { DockerContainer, DockerImage, DockerOperationResult } from '@/types';

export interface UseDockerOptions {
  /** Callback when output is received */
  onOutput?: (sessionId: string, data: string) => void;
  /** Callback when connected to Docker */
  onConnect?: () => void;
  /** Callback when disconnected from Docker */
  onDisconnect?: () => void;
  /** Callback on connection error */
  onError?: (error: string) => void;
}

export interface UseDockerReturn {
  /** Is Docker connected */
  isConnected: Ref<boolean>;
  /** Loading state */
  isLoading: Ref<boolean>;
  /** Error state */
  error: Ref<string | null>;
  /** Container list */
  containers: Ref<DockerContainer[]>;
  /** Image list */
  images: Ref<DockerImage[]>;
  /** Active exec sessions */
  activeSessions: Ref<Set<string>>;
  /** Connect to Docker */
  connect: () => Promise<boolean>;
  /** Disconnect from Docker */
  disconnect: () => Promise<void>;
  /** Refresh container list */
  refreshContainers: (all?: boolean) => Promise<void>;
  /** Refresh image list */
  refreshImages: () => Promise<void>;
  /** Start container */
  startContainer: (containerId: string) => Promise<DockerOperationResult>;
  /** Stop container */
  stopContainer: (containerId: string) => Promise<DockerOperationResult>;
  /** Restart container */
  restartContainer: (containerId: string) => Promise<DockerOperationResult>;
  /** Create exec session */
  createExec: (containerId: string, cols?: number, rows?: number) => Promise<string>;
  /** Send input to exec session */
  sendInput: (sessionId: string, data: string) => Promise<void>;
  /** Resize exec terminal */
  resize: (sessionId: string, cols: number, rows: number) => Promise<void>;
  /** Disconnect exec session */
  disconnectExec: (sessionId: string) => Promise<void>;
  /** Get container by ID */
  getContainer: (containerId: string) => DockerContainer | undefined;
}

/**
 * Docker management composable
 */
export function useDocker(options: UseDockerOptions = {}): UseDockerReturn {
  const { onOutput, onConnect, onDisconnect, onError } = options;

  // State
  const isConnected = ref(false);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const containers = ref<DockerContainer[]>([]);
  const images = ref<DockerImage[]>([]);
  const activeSessions = ref<Set<string>>(new Set());

  // Event unlisteners
  let unlistenOutput: UnlistenFn | null = null;

  // Setup event listeners
  async function setupEventListeners(): Promise<void> {
    unlistenOutput = await onDockerOutput((event) => {
      const { session_id, data } = event;

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

  // Connect to Docker
  async function connect(): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      await connectDocker();
      isConnected.value = true;

      // Refresh data
      await refreshContainers(true);
      await refreshImages();

      if (onConnect) {
        onConnect();
      }

      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      error.value = message;

      if (onError) {
        onError(message);
      }

      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // Disconnect from Docker
  async function disconnect(): Promise<void> {
    try {
      await disconnectDockerService();
      isConnected.value = false;
      containers.value = [];
      images.value = [];
      activeSessions.value.clear();

      if (onDisconnect) {
        onDisconnect();
      }
    } catch (e) {
      console.error('Failed to disconnect from Docker:', e);
    }
  }

  // Refresh container list
  async function refreshContainers(all: boolean = false): Promise<void> {
    try {
      containers.value = await listDockerContainers(all);
    } catch (e) {
      console.error('Failed to list containers:', e);
    }
  }

  // Refresh image list
  async function refreshImages(): Promise<void> {
    try {
      images.value = await listDockerImages();
    } catch (e) {
      console.error('Failed to list images:', e);
    }
  }

  // Start container
  async function startContainer(containerId: string): Promise<DockerOperationResult> {
    isLoading.value = true;
    try {
      const result = await startDockerContainer(containerId);
      if (result.success) {
        await refreshContainers(true);
      }
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { success: false, container_id: containerId, error: message };
    } finally {
      isLoading.value = false;
    }
  }

  // Stop container
  async function stopContainer(containerId: string): Promise<DockerOperationResult> {
    isLoading.value = true;
    try {
      const result = await stopDockerContainer(containerId);
      if (result.success) {
        await refreshContainers(true);
      }
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { success: false, container_id: containerId, error: message };
    } finally {
      isLoading.value = false;
    }
  }

  // Restart container
  async function restartContainer(containerId: string): Promise<DockerOperationResult> {
    isLoading.value = true;
    try {
      const result = await restartDockerContainer(containerId);
      if (result.success) {
        await refreshContainers(true);
      }
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { success: false, container_id: containerId, error: message };
    } finally {
      isLoading.value = false;
    }
  }

  // Create exec session
  async function createExec(
    containerId: string,
    cols: number = 80,
    rows: number = 24
  ): Promise<string> {
    isLoading.value = true;
    error.value = null;

    try {
      const sessionId = await createDockerExec(containerId, cols, rows);
      activeSessions.value.add(sessionId);
      return sessionId;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      error.value = message;
      throw e;
    } finally {
      isLoading.value = false;
    }
  }

  // Send input to exec session
  async function sendInput(sessionId: string, data: string): Promise<void> {
    try {
      await dockerExecInput(sessionId, data);
    } catch (e) {
      console.error('Failed to send Docker input:', e);
      throw e;
    }
  }

  // Resize exec terminal
  async function resize(
    sessionId: string,
    cols: number,
    rows: number
  ): Promise<void> {
    try {
      await resizeDockerExec(sessionId, cols, rows);
    } catch (e) {
      console.error('Failed to resize Docker exec:', e);
      throw e;
    }
  }

  // Disconnect exec session
  async function disconnectExec(sessionId: string): Promise<void> {
    try {
      await disconnectDockerExec(sessionId);
      activeSessions.value.delete(sessionId);
    } catch (e) {
      console.error('Failed to disconnect Docker exec:', e);
      throw e;
    }
  }

  // Get container by ID
  function getContainer(containerId: string): DockerContainer | undefined {
    return containers.value.find(
      (c) => c.id === containerId || c.full_id.startsWith(containerId)
    );
  }

  // Lifecycle
  onMounted(async () => {
    await setupEventListeners();

    // Check if already connected
    try {
      const connected = await isDockerConnected();
      if (connected) {
        isConnected.value = true;
        await refreshContainers(true);
        await refreshImages();
      }
    } catch {
      // Not connected, that's fine
    }
  });

  onUnmounted(() => {
    cleanupEventListeners();
  });

  return {
    isConnected,
    isLoading,
    error,
    containers,
    images,
    activeSessions,
    connect,
    disconnect,
    refreshContainers,
    refreshImages,
    startContainer,
    stopContainer,
    restartContainer,
    createExec,
    sendInput,
    resize,
    disconnectExec,
    getContainer,
  };
}

/**
 * Simplified composable for a single Docker exec session
 */
export function useDockerSession(sessionId: Ref<string | null>) {
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Send input
  async function sendInput(data: string): Promise<void> {
    if (!sessionId.value) return;
    isLoading.value = true;
    try {
      await dockerExecInput(sessionId.value, data);
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
      await resizeDockerExec(sessionId.value, cols, rows);
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      throw e;
    }
  }

  // Disconnect
  async function disconnect(): Promise<void> {
    if (!sessionId.value) return;
    try {
      await disconnectDockerExec(sessionId.value);
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
