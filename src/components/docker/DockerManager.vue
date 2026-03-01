<script setup lang="ts">
/**
 * DockerManager - Docker container management component
 * Lists containers and provides actions (start, stop, exec, etc.)
 */
import { ref, computed, onMounted } from 'vue';
import { NButton, NInput, NSpin, NEmpty, NTag, NDropdown, useMessage } from 'naive-ui';
import { useDocker } from '@/composables';
import type { DockerContainer } from '@/types';

const emit = defineEmits<{
  (e: 'connect-terminal', containerId: string, containerName: string): void;
}>();

const message = useMessage();

// Docker composable
const {
  isConnected,
  isLoading,
  error,
  containers,
  connect,
  disconnect,
  refreshContainers,
  startContainer,
  stopContainer,
  restartContainer,
} = useDocker({
  onError: (err) => {
    message.error(`Docker error: ${err}`);
  },
});

// Search filter
const searchQuery = ref('');

// Filter containers by search query
const filteredContainers = computed(() => {
  if (!searchQuery.value) return containers.value;

  const query = searchQuery.value.toLowerCase();
  return containers.value.filter((c) => {
    return (
      c.id.toLowerCase().includes(query) ||
      c.names.some((n) => n.toLowerCase().includes(query)) ||
      c.image.toLowerCase().includes(query)
    );
  });
});

// Show all containers (including stopped)
const showAll = ref(true);

// Get container display name
function getContainerName(container: DockerContainer): string {
  if (container.names.length > 0) {
    // Remove leading slash from container name
    return container.names[0].replace(/^\//, '');
  }
  return container.id;
}

// Get status color for Naive UI tag
function getStatusColor(state: string): 'success' | 'default' | 'warning' | 'error' {
  switch (state.toLowerCase()) {
    case 'running':
      return 'success';
    case 'exited':
      return 'default';
    case 'paused':
      return 'warning';
    default:
      return 'error';
  }
}

// Container actions dropdown options
function getContainerActions(container: DockerContainer) {
  const actions: Array<{ label: string; key: string; disabled?: boolean } | { type: 'divider'; key: string }> = [
    {
      label: 'Open Terminal',
      key: 'terminal',
      disabled: !container.is_running,
    },
    { type: 'divider', key: 'd1' },
  ];

  if (container.is_running) {
    actions.push(
      { label: 'Stop', key: 'stop' },
      { label: 'Restart', key: 'restart' }
    );
  } else {
    actions.push({ label: 'Start', key: 'start' });
  }

  return actions;
}

// Handle container action
async function handleContainerAction(
  container: DockerContainer,
  action: string
): Promise<void> {
  switch (action) {
    case 'terminal':
      emit('connect-terminal', container.id, getContainerName(container));
      break;
    case 'start':
      await startContainer(container.id);
      message.success(`Started container ${getContainerName(container)}`);
      break;
    case 'stop':
      await stopContainer(container.id);
      message.success(`Stopped container ${getContainerName(container)}`);
      break;
    case 'restart':
      await restartContainer(container.id);
      message.success(`Restarted container ${getContainerName(container)}`);
      break;
  }
}

// Connect to Docker on mount
onMounted(async () => {
  if (!isConnected.value) {
    await connect();
  } else {
    await refreshContainers(showAll.value);
  }
});
</script>

<template>
  <div class="docker-manager">
    <!-- Header -->
    <div class="docker-header">
      <div class="header-left">
        <h3>Docker Containers</h3>
        <NTag :type="isConnected ? 'success' : 'default'" size="small">
          {{ isConnected ? 'Connected' : 'Disconnected' }}
        </NTag>
      </div>
      <div class="header-actions">
        <NButton
          quaternary
          size="small"
          :loading="isLoading"
          @click="isConnected ? disconnect() : connect()"
        >
          {{ isConnected ? 'Disconnect' : 'Connect' }}
        </NButton>
        <NButton
          quaternary
          size="small"
          :loading="isLoading"
          :disabled="!isConnected"
          @click="refreshContainers(showAll)"
        >
          Refresh
        </NButton>
      </div>
    </div>

    <!-- Search -->
    <div class="docker-search">
      <NInput
        v-model:value="searchQuery"
        placeholder="Search containers..."
        size="small"
        clearable
      />
    </div>

    <!-- Container list -->
    <div class="docker-content">
      <NSpin :show="isLoading">
        <div v-if="error" class="docker-error">
          {{ error }}
        </div>

        <NEmpty
          v-else-if="filteredContainers.length === 0"
          description="No containers found"
        />

        <div v-else class="container-list">
          <div
            v-for="container in filteredContainers"
            :key="container.id"
            class="container-item"
          >
            <div class="container-info">
              <div class="container-name">{{ getContainerName(container) }}</div>
              <div class="container-details">
                <span class="container-image">{{ container.image }}</span>
                <span class="container-id">{{ container.id }}</span>
              </div>
            </div>

            <div class="container-status">
              <NTag :type="getStatusColor(container.state)" size="small">
                {{ container.state }}
              </NTag>
            </div>

            <div class="container-actions">
              <NButton
                v-if="container.is_running"
                size="tiny"
                secondary
                @click="emit('connect-terminal', container.id, getContainerName(container))"
              >
                Terminal
              </NButton>
              <NDropdown
                trigger="click"
                :options="getContainerActions(container)"
                @select="(key: string) => handleContainerAction(container, key)"
              >
                <NButton size="tiny" quaternary>
                  •••
                </NButton>
              </NDropdown>
            </div>
          </div>
        </div>
      </NSpin>
    </div>
  </div>
</template>

<style scoped>
.docker-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-bg-1);
}

.docker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-left h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.docker-search {
  padding: 8px 16px;
  border-bottom: 1px solid var(--color-border);
}

.docker-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.docker-error {
  padding: 16px;
  color: var(--color-error);
  text-align: center;
}

.container-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.container-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background-color: var(--color-bg-2);
  transition: background-color 0.2s;
}

.container-item:hover {
  background-color: var(--color-bg-3);
}

.container-info {
  flex: 1;
  min-width: 0;
}

.container-name {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.container-details {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: var(--color-text-3);
}

.container-image {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

.container-id {
  font-family: monospace;
}

.container-status {
  flex-shrink: 0;
}

.container-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
</style>
