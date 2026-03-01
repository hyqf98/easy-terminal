/**
 * Connections store - Manages SSH/Docker connections
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { AnyConnectionConfig, ConnectionStatus, ConnectionType } from '@/types';

interface ConnectionEntry {
  config: AnyConnectionConfig;
  status: ConnectionStatus;
  error?: string;
}

export const useConnectionsStore = defineStore('connections', () => {
  // State
  const connections = ref<Map<string, ConnectionEntry>>(new Map());
  const connectionOrder = ref<string[]>([]);

  // Getters
  const connectionList = computed(() => {
    return connectionOrder.value
      .map(id => connections.value.get(id))
      .filter((c): c is ConnectionEntry => c !== undefined);
  });

  const sshConnections = computed(() => {
    return connectionList.value.filter(c => c.config.type === 'ssh');
  });

  const dockerConnections = computed(() => {
    return connectionList.value.filter(c => c.config.type === 'docker');
  });

  const favoriteConnections = computed(() => {
    return connectionList.value.filter(c => c.config.isFavorite);
  });

  const connectedConnections = computed(() => {
    return connectionList.value.filter(c => c.status === 'connected');
  });

  // Actions
  function addConnection(config: AnyConnectionConfig): void {
    connections.value.set(config.id, {
      config,
      status: 'disconnected',
    });
    connectionOrder.value.push(config.id);
  }

  function removeConnection(connectionId: string): void {
    connections.value.delete(connectionId);
    const index = connectionOrder.value.indexOf(connectionId);
    if (index !== -1) {
      connectionOrder.value.splice(index, 1);
    }
  }

  function updateConnection(connectionId: string, config: Partial<AnyConnectionConfig>): void {
    const entry = connections.value.get(connectionId);
    if (entry) {
      Object.assign(entry.config, config);
    }
  }

  function setConnectionStatus(connectionId: string, status: ConnectionStatus, error?: string): void {
    const entry = connections.value.get(connectionId);
    if (entry) {
      entry.status = status;
      entry.error = error;
    }
  }

  function toggleFavorite(connectionId: string): void {
    const entry = connections.value.get(connectionId);
    if (entry) {
      entry.config.isFavorite = !entry.config.isFavorite;
    }
  }

  function getConnection(connectionId: string): ConnectionEntry | undefined {
    return connections.value.get(connectionId);
  }

  function getConnectionByType(type: ConnectionType): ConnectionEntry[] {
    return connectionList.value.filter(c => c.config.type === type);
  }

  function clearConnections(): void {
    connections.value.clear();
    connectionOrder.value = [];
  }

  return {
    // State
    connections,
    connectionOrder,
    // Getters
    connectionList,
    sshConnections,
    dockerConnections,
    favoriteConnections,
    connectedConnections,
    // Actions
    addConnection,
    removeConnection,
    updateConnection,
    setConnectionStatus,
    toggleFavorite,
    getConnection,
    getConnectionByType,
    clearConnections,
  };
});
