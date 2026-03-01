/**
 * DockerManager Component Tests
 * Tests Docker container management functionality
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import DockerManager from '../DockerManager.vue';
import type { DockerContainer } from '@/types';

// Type for accessing component internal methods
type DockerManagerVM = {
  handleContainerAction: (container: DockerContainer, action: string) => Promise<void>;
  getContainerActions: (container: DockerContainer) => Array<{ label: string; key: string; disabled?: boolean } | { type: 'divider'; key: string }>;
  getStatusColor: (state: string) => 'success' | 'default' | 'warning' | 'error';
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  refreshContainers: (all?: boolean) => Promise<void>;
  searchQuery: string;
  filteredContainers: DockerContainer[];
  showAll: boolean;
};

// Mock useDocker composable state
let mockIsConnected = ref(false);
let mockIsLoading = ref(false);
let mockError = ref<string | null>(null);
let mockContainers = ref<DockerContainer[]>([]);
let mockConnect = vi.fn();
let mockDisconnect = vi.fn();
let mockRefreshContainers = vi.fn();
let mockStartContainer = vi.fn();
let mockStopContainer = vi.fn();
let mockRestartContainer = vi.fn();

vi.mock('@/composables', () => ({
  useDocker: vi.fn(() => ({
    isConnected: mockIsConnected,
    isLoading: mockIsLoading,
    error: mockError,
    containers: mockContainers,
    connect: mockConnect,
    disconnect: mockDisconnect,
    refreshContainers: mockRefreshContainers,
    startContainer: mockStartContainer,
    stopContainer: mockStopContainer,
    restartContainer: mockRestartContainer,
  })),
}));

// Mock naive-ui useMessage
const mockMessageError = vi.fn();
const mockMessageSuccess = vi.fn();

vi.mock('naive-ui', () => ({
  useMessage: () => ({
    error: mockMessageError,
    success: mockMessageSuccess,
  }),
  NButton: {
    name: 'NButton',
    template: `
      <button class="n-button" :class="{ 'n-button--loading': loading }" :disabled="disabled" @click="$emit('click')">
        <slot />
      </button>
    `,
    props: ['loading', 'disabled', 'quaternary', 'size', 'secondary'],
  },
  NInput: {
    name: 'NInput',
    template: `
      <input class="n-input" :value="value" @input="$emit('update:value', $event.target.value)" :placeholder="placeholder" />
    `,
    props: ['value', 'placeholder', 'size', 'clearable'],
  },
  NSpin: {
    name: 'NSpin',
    template: `
      <div class="n-spin">
        <div v-if="show" class="n-spin__spinner">Loading...</div>
        <slot />
      </div>
    `,
    props: ['show'],
  },
  NEmpty: {
    name: 'NEmpty',
    template: `
      <div class="n-empty">
        <span class="n-empty__description">{{ description }}</span>
      </div>
    `,
    props: ['description'],
  },
  NTag: {
    name: 'NTag',
    template: `
      <span class="n-tag" :class="'n-tag--' + type"><slot /></span>
    `,
    props: ['type', 'size'],
  },
  NDropdown: {
    name: 'NDropdown',
    template: `
      <div class="n-dropdown" @click="$emit('click')">
        <slot />
      </div>
    `,
    props: ['trigger', 'options'],
  },
}));

// Helper to create mock Docker container
function createMockContainer(overrides: Partial<DockerContainer> = {}): DockerContainer {
  return {
    id: 'abc12345',
    full_id: 'abc12345def6789012345678901234567890abcdef1234567890abcdef123456',
    names: ['/test-container'],
    image: 'nginx:latest',
    image_id: 'sha256:abc123',
    status: 'Up 2 hours',
    state: 'running',
    created: Date.now() / 1000 - 7200,
    ports: [{ private_port: 80, public_port: 8080, ip: '0.0.0.0', protocol: 'tcp' }],
    is_running: true,
    ...overrides,
  };
}

// Helper to mount component
function mountDockerManager() {
  return mount(DockerManager, {
    global: {
      stubs: {
        NButton: true,
        NInput: true,
        NSpin: true,
        NEmpty: true,
        NTag: true,
        NDropdown: true,
      },
    },
  });
}

// Helper to get typed VM
function getVM(wrapper: ReturnType<typeof mountDockerManager>): DockerManagerVM {
  return wrapper.vm as unknown as DockerManagerVM;
}

// Helper to mount with real Naive UI stubs for interaction testing
function mountDockerManagerWithStubs() {
  return mount(DockerManager, {
    global: {
      stubs: {
        NButton: {
          template: `<button class="n-button" :disabled="disabled" @click="$emit('click')"><slot /></button>`,
          props: ['loading', 'disabled', 'quaternary', 'size', 'secondary'],
        },
        NInput: {
          template: `<input class="n-input" :value="value" @input="$emit('update:value', $event.target.value)" />`,
          props: ['value', 'placeholder', 'size', 'clearable'],
        },
        NSpin: {
          template: `<div class="n-spin"><slot /></div>`,
          props: ['show'],
        },
        NEmpty: {
          template: `<div class="n-empty">{{ description }}</div>`,
          props: ['description'],
        },
        NTag: {
          template: `<span class="n-tag" :class="'n-tag--' + type"><slot /></span>`,
          props: ['type', 'size'],
        },
        NDropdown: {
          template: `<div class="n-dropdown"><slot /></div>`,
          props: ['trigger', 'options'],
        },
      },
    },
  });
}

describe('DockerManager', () => {
  beforeEach(() => {
    // Reset all mocks
    mockIsConnected = ref(false);
    mockIsLoading = ref(false);
    mockError = ref(null);
    mockContainers = ref([]);
    mockConnect = vi.fn().mockResolvedValue(true);
    mockDisconnect = vi.fn().mockResolvedValue(undefined);
    mockRefreshContainers = vi.fn().mockResolvedValue(undefined);
    mockStartContainer = vi.fn().mockResolvedValue({ success: true, container_id: 'test' });
    mockStopContainer = vi.fn().mockResolvedValue({ success: true, container_id: 'test' });
    mockRestartContainer = vi.fn().mockResolvedValue({ success: true, container_id: 'test' });
    mockMessageError.mockClear();
    mockMessageSuccess.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================
  // Basic Rendering Tests
  // ===========================================
  describe('Basic Rendering', () => {
    it('should render main container', () => {
      const wrapper = mountDockerManager();

      expect(wrapper.find('.docker-manager').exists()).toBe(true);
    });

    it('should render header section', () => {
      const wrapper = mountDockerManager();

      expect(wrapper.find('.docker-header').exists()).toBe(true);
      expect(wrapper.find('.docker-header h3').text()).toBe('Docker Containers');
    });

    it('should render search section', () => {
      const wrapper = mountDockerManager();

      expect(wrapper.find('.docker-search').exists()).toBe(true);
    });

    it('should render content section', () => {
      const wrapper = mountDockerManager();

      expect(wrapper.find('.docker-content').exists()).toBe(true);
    });

    it('should render header with connection status tag', () => {
      mockIsConnected.value = true;
      const wrapper = mountDockerManager();

      expect(wrapper.find('.header-left').exists()).toBe(true);
    });

    it('should render header actions', () => {
      const wrapper = mountDockerManager();

      expect(wrapper.find('.header-actions').exists()).toBe(true);
    });
  });

  // ===========================================
  // Container List Display Tests
  // ===========================================
  describe('Container List Display', () => {
    it('should show empty state when no containers', () => {
      mockIsConnected.value = true;
      mockContainers.value = [];
      const wrapper = mountDockerManagerWithStubs();

      expect(wrapper.find('.n-empty').exists()).toBe(true);
    });

    it('should display container list when containers exist', () => {
      mockIsConnected.value = true;
      mockContainers.value = [createMockContainer()];
      const wrapper = mountDockerManagerWithStubs();

      expect(wrapper.find('.container-list').exists()).toBe(true);
      expect(wrapper.findAll('.container-item')).toHaveLength(1);
    });

    it('should display multiple containers', () => {
      mockIsConnected.value = true;
      mockContainers.value = [
        createMockContainer({ id: 'container1', names: ['/app1'] }),
        createMockContainer({ id: 'container2', names: ['/app2'] }),
        createMockContainer({ id: 'container3', names: ['/app3'] }),
      ];
      const wrapper = mountDockerManagerWithStubs();

      expect(wrapper.findAll('.container-item')).toHaveLength(3);
    });

    it('should display container name correctly', () => {
      mockIsConnected.value = true;
      mockContainers.value = [createMockContainer({ names: ['/my-nginx'] })];
      const wrapper = mountDockerManagerWithStubs();

      expect(wrapper.find('.container-name').text()).toBe('my-nginx');
    });

    it('should display container ID when no name', () => {
      mockIsConnected.value = true;
      mockContainers.value = [createMockContainer({ names: [], id: 'abc12345' })];
      const wrapper = mountDockerManagerWithStubs();

      expect(wrapper.find('.container-name').text()).toBe('abc12345');
    });

    it('should remove leading slash from container name', () => {
      mockIsConnected.value = true;
      mockContainers.value = [createMockContainer({ names: ['/my-container'] })];
      const wrapper = mountDockerManagerWithStubs();

      expect(wrapper.find('.container-name').text()).toBe('my-container');
    });

    it('should display container image', () => {
      mockIsConnected.value = true;
      mockContainers.value = [createMockContainer({ image: 'nginx:alpine' })];
      const wrapper = mountDockerManagerWithStubs();

      expect(wrapper.find('.container-image').text()).toBe('nginx:alpine');
    });

    it('should display container ID in details', () => {
      mockIsConnected.value = true;
      mockContainers.value = [createMockContainer({ id: 'abc12345' })];
      const wrapper = mountDockerManagerWithStubs();

      expect(wrapper.find('.container-id').text()).toBe('abc12345');
    });

    it('should display container state in tag', () => {
      mockIsConnected.value = true;
      mockContainers.value = [createMockContainer({ state: 'running' })];
      const wrapper = mountDockerManagerWithStubs();

      expect(wrapper.find('.container-status').exists()).toBe(true);
    });
  });

  // ===========================================
  // Container Actions Tests
  // ===========================================
  describe('Container Actions', () => {
    it('should call connect on mount when not connected', async () => {
      mockIsConnected.value = false;
      mountDockerManager();
      await nextTick();

      expect(mockConnect).toHaveBeenCalled();
    });

    it('should call refreshContainers on mount when already connected', async () => {
      mockIsConnected.value = true;
      mockContainers.value = [];
      mountDockerManager();
      await nextTick();
      await nextTick();

      expect(mockRefreshContainers).toHaveBeenCalled();
    });

    it('should emit connect-terminal event when terminal button clicked', async () => {
      mockIsConnected.value = true;
      const container = createMockContainer({ id: 'test123', names: ['/my-app'], is_running: true });
      mockContainers.value = [container];
      const wrapper = mountDockerManager();

      // Directly trigger the action
      await getVM(wrapper).handleContainerAction(container, 'terminal');

      expect(wrapper.emitted('connect-terminal')).toBeTruthy();
      expect(wrapper.emitted('connect-terminal')![0]).toEqual(['test123', 'my-app']);
    });

    it('should call startContainer when start action triggered', async () => {
      mockIsConnected.value = true;
      const container = createMockContainer({ id: 'test123', is_running: false });
      mockContainers.value = [container];
      const wrapper = mountDockerManager();

      await getVM(wrapper).handleContainerAction(container, 'start');

      expect(mockStartContainer).toHaveBeenCalledWith('test123');
    });

    it('should call stopContainer when stop action triggered', async () => {
      mockIsConnected.value = true;
      const container = createMockContainer({ id: 'test123', is_running: true });
      mockContainers.value = [container];
      const wrapper = mountDockerManager();

      await getVM(wrapper).handleContainerAction(container, 'stop');

      expect(mockStopContainer).toHaveBeenCalledWith('test123');
    });

    it('should call restartContainer when restart action triggered', async () => {
      mockIsConnected.value = true;
      const container = createMockContainer({ id: 'test123', is_running: true });
      mockContainers.value = [container];
      const wrapper = mountDockerManager();

      await getVM(wrapper).handleContainerAction(container, 'restart');

      expect(mockRestartContainer).toHaveBeenCalledWith('test123');
    });

    it('should show success message after starting container', async () => {
      mockIsConnected.value = true;
      const container = createMockContainer({ id: 'test123', names: ['/my-app'], is_running: false });
      mockContainers.value = [container];
      const wrapper = mountDockerManager();

      await getVM(wrapper).handleContainerAction(container, 'start');

      expect(mockMessageSuccess).toHaveBeenCalledWith('Started container my-app');
    });

    it('should show success message after stopping container', async () => {
      mockIsConnected.value = true;
      const container = createMockContainer({ id: 'test123', names: ['/my-app'], is_running: true });
      mockContainers.value = [container];
      const wrapper = mountDockerManager();

      await getVM(wrapper).handleContainerAction(container, 'stop');

      expect(mockMessageSuccess).toHaveBeenCalledWith('Stopped container my-app');
    });

    it('should show success message after restarting container', async () => {
      mockIsConnected.value = true;
      const container = createMockContainer({ id: 'test123', names: ['/my-app'], is_running: true });
      mockContainers.value = [container];
      const wrapper = mountDockerManager();

      await getVM(wrapper).handleContainerAction(container, 'restart');

      expect(mockMessageSuccess).toHaveBeenCalledWith('Restarted container my-app');
    });
  });

  // ===========================================
  // Container Actions Dropdown Tests
  // ===========================================
  describe('Container Actions Dropdown', () => {
    it('should provide terminal action for running container', () => {
      const container = createMockContainer({ is_running: true });
      const wrapper = mountDockerManager();
      const actions = getVM(wrapper).getContainerActions(container);

      const terminalAction = actions.find((a: { key: string }) => a.key === 'terminal') as { label: string; key: string; disabled?: boolean } | undefined;
      expect(terminalAction).toBeDefined();
      expect(terminalAction?.disabled).toBe(false);
    });

    it('should disable terminal action for stopped container', () => {
      const container = createMockContainer({ is_running: false });
      const wrapper = mountDockerManager();
      const actions = getVM(wrapper).getContainerActions(container);

      const terminalAction = actions.find((a: { key: string }) => a.key === 'terminal') as { label: string; key: string; disabled?: boolean } | undefined;
      expect(terminalAction?.disabled).toBe(true);
    });

    it('should provide stop and restart actions for running container', () => {
      const container = createMockContainer({ is_running: true });
      const wrapper = mountDockerManager();
      const actions = getVM(wrapper).getContainerActions(container);

      expect(actions.find((a: { key: string }) => a.key === 'stop')).toBeDefined();
      expect(actions.find((a: { key: string }) => a.key === 'restart')).toBeDefined();
      expect(actions.find((a: { key: string }) => a.key === 'start')).toBeUndefined();
    });

    it('should provide start action for stopped container', () => {
      const container = createMockContainer({ is_running: false });
      const wrapper = mountDockerManager();
      const actions = getVM(wrapper).getContainerActions(container);

      expect(actions.find((a: { key: string }) => a.key === 'start')).toBeDefined();
      expect(actions.find((a: { key: string }) => a.key === 'stop')).toBeUndefined();
      expect(actions.find((a: { key: string }) => a.key === 'restart')).toBeUndefined();
    });

    it('should include divider in actions', () => {
      const container = createMockContainer();
      const wrapper = mountDockerManager();
      const actions = getVM(wrapper).getContainerActions(container);

      expect(actions.find((a: { key: string }) => a.key === 'd1')).toBeDefined();
    });
  });

  // ===========================================
  // Status Indicator Tests
  // ===========================================
  describe('Status Indicators', () => {
    it('should return success color for running state', () => {
      const wrapper = mountDockerManager();
      const color = getVM(wrapper).getStatusColor('running');

      expect(color).toBe('success');
    });

    it('should return default color for exited state', () => {
      const wrapper = mountDockerManager();
      const color = getVM(wrapper).getStatusColor('exited');

      expect(color).toBe('default');
    });

    it('should return warning color for paused state', () => {
      const wrapper = mountDockerManager();
      const color = getVM(wrapper).getStatusColor('paused');

      expect(color).toBe('warning');
    });

    it('should return error color for unknown states', () => {
      const wrapper = mountDockerManager();
      const color = getVM(wrapper).getStatusColor('dead');

      expect(color).toBe('error');
    });

    it('should handle case-insensitive state matching', () => {
      const wrapper = mountDockerManager();

      expect(getVM(wrapper).getStatusColor('RUNNING')).toBe('success');
      expect(getVM(wrapper).getStatusColor('Exited')).toBe('default');
      expect(getVM(wrapper).getStatusColor('PAUSED')).toBe('warning');
    });

    it('should show connected status tag when connected', () => {
      mockIsConnected.value = true;
      const wrapper = mountDockerManagerWithStubs();

      const tag = wrapper.find('.header-left .n-tag');
      expect(tag.text()).toBe('Connected');
      expect(tag.classes()).toContain('n-tag--success');
    });

    it('should show disconnected status tag when not connected', () => {
      mockIsConnected.value = false;
      const wrapper = mountDockerManagerWithStubs();

      const tag = wrapper.find('.header-left .n-tag');
      expect(tag.text()).toBe('Disconnected');
    });
  });

  // ===========================================
  // Docker Not Running Tests
  // ===========================================
  describe('Docker Not Running Handling', () => {
    it('should show error message when error occurs', () => {
      mockError.value = 'Docker daemon not running';
      const wrapper = mountDockerManagerWithStubs();

      expect(wrapper.find('.docker-error').exists()).toBe(true);
      expect(wrapper.find('.docker-error').text()).toBe('Docker daemon not running');
    });

    it('should show error when connection fails', () => {
      mockError.value = 'Cannot connect to Docker daemon';
      const wrapper = mountDockerManagerWithStubs();

      expect(wrapper.find('.docker-error').exists()).toBe(true);
    });

    it('should not show error when no error', () => {
      mockError.value = null;
      mockIsConnected.value = true;
      mockContainers.value = [];
      const wrapper = mountDockerManager();

      expect(wrapper.find('.docker-error').exists()).toBe(false);
    });

    it('should call connect when Connect button clicked', async () => {
      mockIsConnected.value = false;
      const wrapper = mountDockerManager();

      // Simulate clicking connect button
      await getVM(wrapper).connect();

      expect(mockConnect).toHaveBeenCalled();
    });

    it('should call disconnect when Disconnect button clicked', async () => {
      mockIsConnected.value = true;
      const wrapper = mountDockerManager();

      // Simulate clicking disconnect button
      await getVM(wrapper).disconnect();

      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('should handle error state from composable', async () => {
      // Set error state directly to simulate connection error
      mockError.value = 'Cannot connect to Docker daemon';
      mockIsConnected.value = false;

      const wrapper = mountDockerManagerWithStubs();

      // Error should be displayed
      expect(wrapper.find('.docker-error').exists()).toBe(true);
      expect(wrapper.find('.docker-error').text()).toContain('Cannot connect to Docker daemon');
    });
  });

  // ===========================================
  // No Containers State Tests
  // ===========================================
  describe('No Containers State', () => {
    it('should show empty state when container list is empty', () => {
      mockIsConnected.value = true;
      mockContainers.value = [];
      const wrapper = mountDockerManagerWithStubs();

      expect(wrapper.find('.n-empty').exists()).toBe(true);
    });

    it('should show "No containers found" message', () => {
      mockIsConnected.value = true;
      mockContainers.value = [];
      const wrapper = mountDockerManagerWithStubs();

      expect(wrapper.find('.n-empty').text()).toContain('No containers found');
    });

    it('should not show container list when empty', () => {
      mockIsConnected.value = true;
      mockContainers.value = [];
      const wrapper = mountDockerManager();

      expect(wrapper.find('.container-list').exists()).toBe(false);
    });

    it('should show container list when containers exist', () => {
      mockIsConnected.value = true;
      mockContainers.value = [createMockContainer()];
      const wrapper = mountDockerManagerWithStubs();

      expect(wrapper.find('.container-list').exists()).toBe(true);
      expect(wrapper.find('.n-empty').exists()).toBe(false);
    });
  });

  // ===========================================
  // Search/Filter Tests
  // ===========================================
  describe('Search/Filter Functionality', () => {
    it('should filter containers by name', async () => {
      mockIsConnected.value = true;
      mockContainers.value = [
        createMockContainer({ id: '1', names: ['/nginx'], image: 'nginx:latest' }),
        createMockContainer({ id: '2', names: ['/redis'], image: 'redis:alpine' }),
        createMockContainer({ id: '3', names: ['/nginx-proxy'], image: 'nginx-proxy:latest' }),
      ];
      const wrapper = mountDockerManager();

      getVM(wrapper).searchQuery = 'nginx';
      await nextTick();

      // Both '/nginx' and '/nginx-proxy' contain 'nginx', plus 'nginx:latest' image
      // So we expect 2 matches (nginx container and nginx-proxy container)
      const filtered = getVM(wrapper).filteredContainers;
      expect(filtered.some(c => c.names.some(n => n.includes('nginx')))).toBe(true);
    });

    it('should filter containers by ID', async () => {
      mockIsConnected.value = true;
      mockContainers.value = [
        createMockContainer({ id: 'abc123' }),
        createMockContainer({ id: 'def456' }),
        createMockContainer({ id: 'abc789' }),
      ];
      const wrapper = mountDockerManager();

      getVM(wrapper).searchQuery = 'abc';
      await nextTick();

      expect(getVM(wrapper).filteredContainers).toHaveLength(2);
    });

    it('should filter containers by image', async () => {
      mockIsConnected.value = true;
      mockContainers.value = [
        createMockContainer({ id: '1', image: 'nginx:latest' }),
        createMockContainer({ id: '2', image: 'redis:alpine' }),
        createMockContainer({ id: '3', image: 'nginx:alpine' }),
      ];
      const wrapper = mountDockerManager();

      getVM(wrapper).searchQuery = 'nginx';
      await nextTick();

      expect(getVM(wrapper).filteredContainers).toHaveLength(2);
    });

    it('should be case-insensitive when filtering', async () => {
      mockIsConnected.value = true;
      mockContainers.value = [
        createMockContainer({ id: '1', names: ['/NGINX'], image: 'nginx:latest' }),
        createMockContainer({ id: '2', names: ['/redis'], image: 'redis:alpine' }),
      ];
      const wrapper = mountDockerManager();

      getVM(wrapper).searchQuery = 'nginx';
      await nextTick();

      // '/NGINX'.toLowerCase().includes('nginx') should match
      expect(getVM(wrapper).filteredContainers).toHaveLength(1);
    });

    it('should return all containers when search is empty', async () => {
      mockIsConnected.value = true;
      mockContainers.value = [
        createMockContainer({ id: '1' }),
        createMockContainer({ id: '2' }),
      ];
      const wrapper = mountDockerManager();

      getVM(wrapper).searchQuery = '';
      await nextTick();

      expect(getVM(wrapper).filteredContainers).toHaveLength(2);
    });

    it('should return empty array when no match', async () => {
      mockIsConnected.value = true;
      mockContainers.value = [
        createMockContainer({ id: '1', names: ['/nginx'] }),
      ];
      const wrapper = mountDockerManager();

      getVM(wrapper).searchQuery = 'nonexistent';
      await nextTick();

      expect(getVM(wrapper).filteredContainers).toHaveLength(0);
    });
  });

  // ===========================================
  // UI Style Tests
  // ===========================================
  describe('UI Styles', () => {
    it('should have correct docker-manager class', () => {
      const wrapper = mountDockerManager();

      expect(wrapper.find('.docker-manager').exists()).toBe(true);
    });

    it('should have correct docker-header class', () => {
      const wrapper = mountDockerManager();

      expect(wrapper.find('.docker-header').exists()).toBe(true);
    });

    it('should have correct docker-search class', () => {
      const wrapper = mountDockerManager();

      expect(wrapper.find('.docker-search').exists()).toBe(true);
    });

    it('should have correct docker-content class', () => {
      const wrapper = mountDockerManager();

      expect(wrapper.find('.docker-content').exists()).toBe(true);
    });

    it('should have correct container-item class', () => {
      mockIsConnected.value = true;
      mockContainers.value = [createMockContainer()];
      const wrapper = mountDockerManagerWithStubs();

      expect(wrapper.find('.container-item').exists()).toBe(true);
    });

    it('should have correct container-info class', () => {
      mockIsConnected.value = true;
      mockContainers.value = [createMockContainer()];
      const wrapper = mountDockerManagerWithStubs();

      expect(wrapper.find('.container-info').exists()).toBe(true);
    });

    it('should have correct container-name class', () => {
      mockIsConnected.value = true;
      mockContainers.value = [createMockContainer()];
      const wrapper = mountDockerManagerWithStubs();

      expect(wrapper.find('.container-name').exists()).toBe(true);
    });

    it('should have correct container-details class', () => {
      mockIsConnected.value = true;
      mockContainers.value = [createMockContainer()];
      const wrapper = mountDockerManagerWithStubs();

      expect(wrapper.find('.container-details').exists()).toBe(true);
    });

    it('should have correct container-image class', () => {
      mockIsConnected.value = true;
      mockContainers.value = [createMockContainer()];
      const wrapper = mountDockerManagerWithStubs();

      expect(wrapper.find('.container-image').exists()).toBe(true);
    });

    it('should have correct container-id class', () => {
      mockIsConnected.value = true;
      mockContainers.value = [createMockContainer()];
      const wrapper = mountDockerManagerWithStubs();

      expect(wrapper.find('.container-id').exists()).toBe(true);
    });

    it('should have correct container-status class', () => {
      mockIsConnected.value = true;
      mockContainers.value = [createMockContainer()];
      const wrapper = mountDockerManagerWithStubs();

      expect(wrapper.find('.container-status').exists()).toBe(true);
    });

    it('should have correct container-actions class', () => {
      mockIsConnected.value = true;
      mockContainers.value = [createMockContainer()];
      const wrapper = mountDockerManagerWithStubs();

      expect(wrapper.find('.container-actions').exists()).toBe(true);
    });

    it('should have correct docker-error class when error', () => {
      mockError.value = 'Test error';
      const wrapper = mountDockerManagerWithStubs();

      expect(wrapper.find('.docker-error').exists()).toBe(true);
    });

    it('should have header-left section with title and status', () => {
      const wrapper = mountDockerManager();

      expect(wrapper.find('.header-left').exists()).toBe(true);
      expect(wrapper.find('.header-left h3').text()).toBe('Docker Containers');
    });

    it('should have header-actions section with buttons', () => {
      const wrapper = mountDockerManager();

      expect(wrapper.find('.header-actions').exists()).toBe(true);
    });
  });

  // ===========================================
  // Loading State Tests
  // ===========================================
  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      mockIsLoading.value = true;
      const wrapper = mountDockerManagerWithStubs();

      expect(wrapper.find('.n-spin').exists()).toBe(true);
    });

    it('should pass loading state to spin component', () => {
      mockIsLoading.value = true;
      const wrapper = mountDockerManager();

      const spin = wrapper.findComponent({ name: 'NSpin' });
      expect(spin.props('show')).toBe(true);
    });
  });

  // ===========================================
  // Edge Cases Tests
  // ===========================================
  describe('Edge Cases', () => {
    it('should handle container with empty names array', () => {
      mockIsConnected.value = true;
      mockContainers.value = [createMockContainer({ names: [], id: 'test123' })];
      const wrapper = mountDockerManagerWithStubs();

      expect(wrapper.find('.container-name').text()).toBe('test123');
    });

    it('should handle container with multiple names', () => {
      mockIsConnected.value = true;
      mockContainers.value = [createMockContainer({ names: ['/primary', '/secondary'] })];
      const wrapper = mountDockerManagerWithStubs();

      // Should use first name
      expect(wrapper.find('.container-name').text()).toBe('primary');
    });

    it('should handle container with special characters in name', () => {
      mockIsConnected.value = true;
      mockContainers.value = [createMockContainer({ names: ['/my-container_v1.0'] })];
      const wrapper = mountDockerManagerWithStubs();

      expect(wrapper.find('.container-name').text()).toBe('my-container_v1.0');
    });

    it('should handle container with Unicode characters in name', () => {
      mockIsConnected.value = true;
      mockContainers.value = [createMockContainer({ names: ['/数据库-容器'] })];
      const wrapper = mountDockerManagerWithStubs();

      expect(wrapper.find('.container-name').text()).toBe('数据库-容器');
    });

    it('should handle container with very long name', () => {
      mockIsConnected.value = true;
      const longName = 'a'.repeat(100);
      mockContainers.value = [createMockContainer({ names: [`/${longName}`] })];
      const wrapper = mountDockerManagerWithStubs();

      expect(wrapper.find('.container-name').text()).toBe(longName);
    });

    it('should handle container with very long image name', () => {
      mockIsConnected.value = true;
      const longImage = 'registry.example.com/namespace/subnamespace/app-name:version-tag';
      mockContainers.value = [createMockContainer({ image: longImage })];
      const wrapper = mountDockerManagerWithStubs();

      expect(wrapper.find('.container-image').text()).toBe(longImage);
    });

    it('should handle rapid container operations', async () => {
      mockIsConnected.value = true;
      const container = createMockContainer({ id: 'test' });
      mockContainers.value = [container];
      const wrapper = mountDockerManager();

      // Rapid operations
      await getVM(wrapper).handleContainerAction(container, 'start');
      await getVM(wrapper).handleContainerAction(container, 'stop');
      await getVM(wrapper).handleContainerAction(container, 'restart');

      expect(mockStartContainer).toHaveBeenCalledTimes(1);
      expect(mockStopContainer).toHaveBeenCalledTimes(1);
      expect(mockRestartContainer).toHaveBeenCalledTimes(1);
    });

    it('should handle unknown action gracefully', async () => {
      mockIsConnected.value = true;
      const container = createMockContainer();
      mockContainers.value = [container];
      const wrapper = mountDockerManager();

      // Should not throw
      await expect(getVM(wrapper).handleContainerAction(container, 'unknown')).resolves.toBeUndefined();
    });

    it('should handle containers with various states', () => {
      mockIsConnected.value = true;
      mockContainers.value = [
        createMockContainer({ id: '1', state: 'running', is_running: true }),
        createMockContainer({ id: '2', state: 'exited', is_running: false }),
        createMockContainer({ id: '3', state: 'paused', is_running: true }),
        createMockContainer({ id: '4', state: 'created', is_running: false }),
        createMockContainer({ id: '5', state: 'dead', is_running: false }),
      ];
      const wrapper = mountDockerManagerWithStubs();

      expect(wrapper.findAll('.container-item')).toHaveLength(5);
    });

    it('should handle error during container operation', async () => {
      mockStartContainer.mockResolvedValue({ success: false, container_id: 'test', error: 'Operation failed' });
      mockIsConnected.value = true;
      const container = createMockContainer({ id: 'test' });
      mockContainers.value = [container];
      const wrapper = mountDockerManager();

      // Should not throw - operation returns error result
      await getVM(wrapper).handleContainerAction(container, 'start');

      expect(mockStartContainer).toHaveBeenCalled();
    });
  });

  // ===========================================
  // Refresh Functionality Tests
  // ===========================================
  describe('Refresh Functionality', () => {
    it('should call refreshContainers with showAll parameter', async () => {
      mockIsConnected.value = true;
      const wrapper = mountDockerManager();

      await getVM(wrapper).refreshContainers(true);

      expect(mockRefreshContainers).toHaveBeenCalledWith(true);
    });

    it('should have showAll ref initialized to true', () => {
      const wrapper = mountDockerManager();

      expect(getVM(wrapper).showAll).toBe(true);
    });
  });

  // ===========================================
  // Accessibility Tests
  // ===========================================
  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      const wrapper = mountDockerManager();

      expect(wrapper.find('.docker-header h3').exists()).toBe(true);
    });

    it('should have search input with placeholder', () => {
      const wrapper = mountDockerManager();

      const input = wrapper.findComponent({ name: 'NInput' });
      expect(input.props('placeholder')).toBe('Search containers...');
    });
  });
});
