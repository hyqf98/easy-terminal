/**
 * SshManager Component Tests
 * Tests SSH connection management modal functionality
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import SshManager from '../SshManager.vue';
import type { SshConnectionConfig } from '@/types';

// Mock SSH service
let mockConnectSsh = vi.fn();
let mockGetSshConfigs = vi.fn();
let mockDeleteSshConfig = vi.fn();

vi.mock('@/services/ssh.service', () => ({
  connectSsh: (...args: unknown[]) => mockConnectSsh(...args),
  getSshConfigs: (...args: unknown[]) => mockGetSshConfigs(...args),
  deleteSshConfig: (...args: unknown[]) => mockDeleteSshConfig(...args),
}));

// Mock connections store
let mockStoreConnections = new Map();
let mockAddConnection = vi.fn();
let mockRemoveConnection = vi.fn();
let mockClearConnections = vi.fn();

vi.mock('@/stores', () => ({
  useConnectionsStore: () => ({
    connections: mockStoreConnections,
    addConnection: mockAddConnection,
    removeConnection: mockRemoveConnection,
    clearConnections: mockClearConnections,
  }),
}));

// Helper to create mock SSH config
function createMockConfig(overrides: Partial<SshConnectionConfig> = {}): SshConnectionConfig {
  return {
    id: 'test-ssh-1',
    type: 'ssh',
    name: 'Test Server',
    host: '192.168.1.100',
    port: 22,
    username: 'testuser',
    authType: 'password',
    password: 'testpass',
    isFavorite: false,
    createdAt: Date.now(),
    ...overrides,
  };
}

// Mock child components
const MockSshConnectionPanel = {
  name: 'SshConnectionPanel',
  template: `
    <div class="ssh-panel-mock" data-testid="ssh-panel">
      <slot />
    </div>
  `,
  methods: {
    refresh: vi.fn(),
  },
};

const MockSshConnectionForm = {
  name: 'SshConnectionForm',
  template: `
    <div class="ssh-form-mock" data-testid="ssh-form">
      <slot />
    </div>
  `,
  props: ['config'],
};

// Helper to mount component
function mountManager() {
  return mount(SshManager, {
    global: {
      stubs: {
        SshConnectionPanel: MockSshConnectionPanel,
        SshConnectionForm: MockSshConnectionForm,
      },
    },
  });
}

describe('SshManager', () => {
  beforeEach(() => {
    // Reset mocks
    mockConnectSsh = vi.fn().mockResolvedValue('session-123');
    mockGetSshConfigs = vi.fn().mockResolvedValue([]);
    mockDeleteSshConfig = vi.fn().mockResolvedValue(undefined);
    mockStoreConnections = new Map();
    mockAddConnection.mockClear();
    mockRemoveConnection.mockClear();
    mockClearConnections.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================
  // Basic Rendering Tests
  // ===========================================
  describe('Basic Rendering', () => {
    it('should render overlay and modal', () => {
      const wrapper = mountManager();

      expect(wrapper.find('.ssh-manager-overlay').exists()).toBe(true);
      expect(wrapper.find('.ssh-manager').exists()).toBe(true);
    });

    it('should render header with title', () => {
      const wrapper = mountManager();

      expect(wrapper.find('.manager-header').exists()).toBe(true);
      expect(wrapper.find('.manager-header h2').text()).toBe('SSH Connections');
    });

    it('should render close button in header', () => {
      const wrapper = mountManager();

      const closeBtn = wrapper.find('.close-btn');
      expect(closeBtn.exists()).toBe(true);
      expect(closeBtn.find('svg').exists()).toBe(true);
    });

    it('should render content area', () => {
      const wrapper = mountManager();

      expect(wrapper.find('.manager-content').exists()).toBe(true);
    });

    it('should show SshConnectionPanel by default', () => {
      const wrapper = mountManager();

      expect(wrapper.find('[data-testid="ssh-panel"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="ssh-form"]').exists()).toBe(false);
    });
  });

  // ===========================================
  // View Switching Tests
  // ===========================================
  describe('View Switching', () => {
    it('should show form when showForm is true', async () => {
      const wrapper = mountManager();

      // Trigger new event from panel
      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('new');
      await nextTick();

      expect(wrapper.find('[data-testid="ssh-form"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="ssh-panel"]').exists()).toBe(false);
    });

    it('should show form when edit event is triggered', async () => {
      const wrapper = mountManager();
      const config = createMockConfig();

      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('edit', config);
      await nextTick();

      expect(wrapper.find('[data-testid="ssh-form"]').exists()).toBe(true);
    });

    it('should pass config to form when editing', async () => {
      const wrapper = mountManager();
      const config = createMockConfig({ name: 'Production Server' });

      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('edit', config);
      await nextTick();

      const form = wrapper.findComponent({ name: 'SshConnectionForm' });
      expect(form.props('config')).toEqual(config);
    });

    it('should pass null config to form when creating new', async () => {
      const wrapper = mountManager();

      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('new');
      await nextTick();

      const form = wrapper.findComponent({ name: 'SshConnectionForm' });
      expect(form.props('config')).toBeNull();
    });

    it('should switch back to panel after save', async () => {
      const wrapper = mountManager();
      const config = createMockConfig();

      // Switch to form
      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('new');
      await nextTick();

      // Save form
      await wrapper.findComponent({ name: 'SshConnectionForm' }).vm.$emit('save', config);
      await nextTick();

      expect(wrapper.find('[data-testid="ssh-panel"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="ssh-form"]').exists()).toBe(false);
    });

    it('should switch back to panel after cancel', async () => {
      const wrapper = mountManager();

      // Switch to form
      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('new');
      await nextTick();

      // Cancel form
      await wrapper.findComponent({ name: 'SshConnectionForm' }).vm.$emit('cancel');
      await nextTick();

      expect(wrapper.find('[data-testid="ssh-panel"]').exists()).toBe(true);
    });
  });

  // ===========================================
  // Panel Event Handling Tests
  // ===========================================
  describe('Panel Event Handling', () => {
    it('should handle connect event from panel', async () => {
      const wrapper = mountManager();
      const config = createMockConfig();

      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('connect', config);
      await nextTick();

      expect(mockConnectSsh).toHaveBeenCalledWith(config.id);
    });

    it('should emit connect event when connection succeeds', async () => {
      const wrapper = mountManager();
      const config = createMockConfig();

      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('connect', config);
      await nextTick();
      await nextTick();

      expect(wrapper.emitted('connect')).toBeTruthy();
      const emittedArgs = wrapper.emitted('connect')![0];
      expect(emittedArgs[0]).toBe('session-123');
      expect(emittedArgs[1]).toEqual(config);
    });

    it('should emit close event when connection succeeds', async () => {
      const wrapper = mountManager();
      const config = createMockConfig();

      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('connect', config);
      await nextTick();
      await nextTick();

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('should handle connection failure gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockConnectSsh.mockRejectedValue(new Error('Connection failed'));

      const wrapper = mountManager();
      const config = createMockConfig();

      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('connect', config);
      await nextTick();
      await nextTick();

      expect(consoleSpy).toHaveBeenCalled();
      // Should not emit close on failure
      expect(wrapper.emitted('close')).toBeFalsy();

      consoleSpy.mockRestore();
    });

    it('should handle edit event from panel', async () => {
      const wrapper = mountManager();
      const config = createMockConfig();

      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('edit', config);
      await nextTick();

      expect(wrapper.find('[data-testid="ssh-form"]').exists()).toBe(true);
    });

    it('should handle new event from panel', async () => {
      const wrapper = mountManager();

      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('new');
      await nextTick();

      expect(wrapper.find('[data-testid="ssh-form"]').exists()).toBe(true);
    });
  });

  // ===========================================
  // Form Event Handling Tests
  // ===========================================
  describe('Form Event Handling', () => {
    it('should handle save event from form', async () => {
      const wrapper = mountManager();
      const config = createMockConfig();

      // Switch to form first
      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('new');
      await nextTick();

      // Save form
      await wrapper.findComponent({ name: 'SshConnectionForm' }).vm.$emit('save', config);
      await nextTick();

      expect(wrapper.find('[data-testid="ssh-panel"]').exists()).toBe(true);
    });

    it('should reset form state after save', async () => {
      const wrapper = mountManager();
      const config = createMockConfig();

      // Switch to form
      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('new');
      await nextTick();

      // Save form
      await wrapper.findComponent({ name: 'SshConnectionForm' }).vm.$emit('save', config);
      await nextTick();

      // Panel should be visible again (state reset)
      expect(wrapper.find('[data-testid="ssh-panel"]').exists()).toBe(true);
    });

    it('should handle cancel event from form', async () => {
      const wrapper = mountManager();

      // Switch to form first
      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('new');
      await nextTick();

      // Cancel form
      await wrapper.findComponent({ name: 'SshConnectionForm' }).vm.$emit('cancel');
      await nextTick();

      expect(wrapper.find('[data-testid="ssh-panel"]').exists()).toBe(true);
    });

    it('should clear editingConfig after save', async () => {
      const wrapper = mountManager();
      const config = createMockConfig();

      // Edit mode
      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('edit', config);
      await nextTick();

      // Save
      await wrapper.findComponent({ name: 'SshConnectionForm' }).vm.$emit('save', config);
      await nextTick();

      // Go back to form (new mode)
      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('new');
      await nextTick();

      const form = wrapper.findComponent({ name: 'SshConnectionForm' });
      expect(form.props('config')).toBeNull();
    });

    it('should clear editingConfig after cancel', async () => {
      const wrapper = mountManager();
      const config = createMockConfig();

      // Edit mode
      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('edit', config);
      await nextTick();

      // Cancel
      await wrapper.findComponent({ name: 'SshConnectionForm' }).vm.$emit('cancel');
      await nextTick();

      // Go back to form (new mode)
      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('new');
      await nextTick();

      const form = wrapper.findComponent({ name: 'SshConnectionForm' });
      expect(form.props('config')).toBeNull();
    });
  });

  // ===========================================
  // Connection Tests
  // ===========================================
  describe('Connection Functionality', () => {
    it('should call connectSsh service on quick connect', async () => {
      const wrapper = mountManager();
      const config = createMockConfig();

      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('connect', config);
      await nextTick();

      expect(mockConnectSsh).toHaveBeenCalledWith(config.id);
    });

    it('should emit connect with session ID and config', async () => {
      mockConnectSsh.mockResolvedValue('new-session-456');

      const wrapper = mountManager();
      const config = createMockConfig({ id: 'config-789' });

      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('connect', config);
      await nextTick();
      await nextTick();

      const emitted = wrapper.emitted('connect')![0];
      expect(emitted[0]).toBe('new-session-456');
      expect(emitted[1]).toEqual(config);
    });

    it('should close modal after successful connection', async () => {
      const wrapper = mountManager();
      const config = createMockConfig();

      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('connect', config);
      await nextTick();
      await nextTick();

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('should handle connection timeout', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockConnectSsh.mockRejectedValue(new Error('Connection timeout'));

      const wrapper = mountManager();
      const config = createMockConfig();

      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('connect', config);
      await nextTick();
      await nextTick();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to connect:', expect.any(Error));
      expect(wrapper.emitted('close')).toBeFalsy();

      consoleSpy.mockRestore();
    });

    it('should handle authentication failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockConnectSsh.mockRejectedValue(new Error('Authentication failed'));

      const wrapper = mountManager();
      const config = createMockConfig();

      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('connect', config);
      await nextTick();
      await nextTick();

      expect(consoleSpy).toHaveBeenCalled();
      expect(wrapper.emitted('close')).toBeFalsy();

      consoleSpy.mockRestore();
    });

    it('should handle network unreachable error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockConnectSsh.mockRejectedValue(new Error('Network unreachable'));

      const wrapper = mountManager();
      const config = createMockConfig();

      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('connect', config);
      await nextTick();
      await nextTick();

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  // ===========================================
  // Close Functionality Tests
  // ===========================================
  describe('Close Functionality', () => {
    it('should emit close when close button is clicked', async () => {
      const wrapper = mountManager();

      await wrapper.find('.close-btn').trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('should emit close when overlay is clicked', async () => {
      const wrapper = mountManager();

      await wrapper.find('.ssh-manager-overlay').trigger('click.self');

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('should not close when modal content is clicked', async () => {
      const wrapper = mountManager();

      await wrapper.find('.ssh-manager').trigger('click');

      expect(wrapper.emitted('close')).toBeFalsy();
    });
  });

  // ===========================================
  // UI Style Tests
  // ===========================================
  describe('UI Styles', () => {
    it('should have correct overlay styles', () => {
      const wrapper = mountManager();
      const overlay = wrapper.find('.ssh-manager-overlay');

      expect(overlay.classes()).toContain('ssh-manager-overlay');
    });

    it('should have correct modal styles', () => {
      const wrapper = mountManager();
      const modal = wrapper.find('.ssh-manager');

      expect(modal.classes()).toContain('ssh-manager');
    });

    it('should have correct header styles', () => {
      const wrapper = mountManager();

      expect(wrapper.find('.manager-header').exists()).toBe(true);
    });

    it('should have correct content styles', () => {
      const wrapper = mountManager();

      expect(wrapper.find('.manager-content').exists()).toBe(true);
    });

    it('should have correct close button styles', () => {
      const wrapper = mountManager();
      const closeBtn = wrapper.find('.close-btn');

      expect(closeBtn.classes()).toContain('close-btn');
    });

    it('should render close icon SVG correctly', () => {
      const wrapper = mountManager();
      const svg = wrapper.find('.close-btn svg');

      expect(svg.exists()).toBe(true);
      // SVG viewBox attribute is case-sensitive, use viewBox instead of viewbox
      expect(svg.attributes('viewBox')).toBe('0 0 24 24');
    });
  });

  // ===========================================
  // Edge Cases
  // ===========================================
  describe('Edge Cases', () => {
    it('should handle rapid view switching', async () => {
      const wrapper = mountManager();
      const config = createMockConfig();

      // Rapid switching
      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('new');
      await nextTick();
      await wrapper.findComponent({ name: 'SshConnectionForm' }).vm.$emit('cancel');
      await nextTick();
      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('edit', config);
      await nextTick();
      await wrapper.findComponent({ name: 'SshConnectionForm' }).vm.$emit('cancel');
      await nextTick();

      expect(wrapper.find('[data-testid="ssh-panel"]').exists()).toBe(true);
    });

    it('should handle config with special characters', async () => {
      const wrapper = mountManager();
      const config = createMockConfig({
        name: 'Test-Server_01 (Production)',
        host: 'server-01.example.com',
        username: 'user@domain',
      });

      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('edit', config);
      await nextTick();

      const form = wrapper.findComponent({ name: 'SshConnectionForm' });
      expect(form.props('config')).toEqual(config);
    });

    it('should handle config with Unicode characters', async () => {
      const wrapper = mountManager();
      const config = createMockConfig({
        name: '服务器连接',
        host: '服务器.示例.中国',
        username: '用户',
      });

      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('edit', config);
      await nextTick();

      const form = wrapper.findComponent({ name: 'SshConnectionForm' });
      expect(form.props('config')).toEqual(config);
    });

    it('should handle empty config ID', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockConnectSsh.mockRejectedValue(new Error('Invalid ID'));

      const wrapper = mountManager();
      const config = createMockConfig({ id: '' });

      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('connect', config);
      await nextTick();
      await nextTick();

      expect(mockConnectSsh).toHaveBeenCalledWith('');

      consoleSpy.mockRestore();
    });

    it('should handle multiple connection attempts', async () => {
      const wrapper = mountManager();
      const config1 = createMockConfig({ id: 'config-1' });
      const config2 = createMockConfig({ id: 'config-2' });

      // First connection
      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('connect', config1);
      await nextTick();
      await nextTick();

      // Second connection
      mockConnectSsh.mockClear();
      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('connect', config2);
      await nextTick();

      expect(mockConnectSsh).toHaveBeenCalledWith('config-2');
    });

    it('should handle config with long hostnames', async () => {
      const wrapper = mountManager();
      const longHost = 'a'.repeat(100) + '.example.com';
      const config = createMockConfig({ host: longHost });

      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('edit', config);
      await nextTick();

      const form = wrapper.findComponent({ name: 'SshConnectionForm' });
      expect(form.props('config').host).toBe(longHost);
    });

    it('should handle config with non-standard port', async () => {
      const wrapper = mountManager();
      const config = createMockConfig({ port: 22222 });

      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('edit', config);
      await nextTick();

      const form = wrapper.findComponent({ name: 'SshConnectionForm' });
      expect(form.props('config').port).toBe(22222);
    });

    it('should handle favorite config', async () => {
      const wrapper = mountManager();
      const config = createMockConfig({ isFavorite: true });

      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('edit', config);
      await nextTick();

      const form = wrapper.findComponent({ name: 'SshConnectionForm' });
      expect(form.props('config').isFavorite).toBe(true);
    });

    it('should handle key-based auth config', async () => {
      const wrapper = mountManager();
      const config = createMockConfig({
        authType: 'key',
        privateKeyPath: '/home/user/.ssh/id_rsa',
        passphrase: 'key-passphrase',
        password: undefined,
      });

      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('edit', config);
      await nextTick();

      const form = wrapper.findComponent({ name: 'SshConnectionForm' });
      expect(form.props('config').authType).toBe('key');
    });

    it('should handle agent-based auth config', async () => {
      const wrapper = mountManager();
      const config = createMockConfig({
        authType: 'agent',
        password: undefined,
        privateKeyPath: undefined,
      });

      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('edit', config);
      await nextTick();

      const form = wrapper.findComponent({ name: 'SshConnectionForm' });
      expect(form.props('config').authType).toBe('agent');
    });

    it('should handle save with new config from form', async () => {
      const wrapper = mountManager();
      const newConfig = createMockConfig({
        id: 'new-config-id',
        name: 'New Server',
      });

      // Switch to form
      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('new');
      await nextTick();

      // Save new config
      await wrapper.findComponent({ name: 'SshConnectionForm' }).vm.$emit('save', newConfig);
      await nextTick();

      expect(wrapper.find('[data-testid="ssh-panel"]').exists()).toBe(true);
    });

    it('should maintain state correctly after multiple operations', async () => {
      const wrapper = mountManager();
      const config = createMockConfig();

      // New -> Cancel -> Edit -> Save -> New -> Cancel
      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('new');
      await nextTick();
      await wrapper.findComponent({ name: 'SshConnectionForm' }).vm.$emit('cancel');
      await nextTick();
      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('edit', config);
      await nextTick();
      await wrapper.findComponent({ name: 'SshConnectionForm' }).vm.$emit('save', config);
      await nextTick();
      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('new');
      await nextTick();
      await wrapper.findComponent({ name: 'SshConnectionForm' }).vm.$emit('cancel');
      await nextTick();

      expect(wrapper.find('[data-testid="ssh-panel"]').exists()).toBe(true);
    });
  });

  // ===========================================
  // Connection Status Tests
  // ===========================================
  describe('Connection Status', () => {
    it('should emit connect event with correct session ID', async () => {
      mockConnectSsh.mockResolvedValue('session-abc-123');

      const wrapper = mountManager();
      const config = createMockConfig();

      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('connect', config);
      await nextTick();
      await nextTick();

      expect(wrapper.emitted('connect')![0][0]).toBe('session-abc-123');
    });

    it('should handle connection with session ID containing special characters', async () => {
      mockConnectSsh.mockResolvedValue('session-uuid-abc-123-xyz');

      const wrapper = mountManager();
      const config = createMockConfig();

      await wrapper.findComponent({ name: 'SshConnectionPanel' }).vm.$emit('connect', config);
      await nextTick();
      await nextTick();

      expect(wrapper.emitted('connect')![0][0]).toBe('session-uuid-abc-123-xyz');
    });
  });

  // ===========================================
  // Accessibility Tests
  // ===========================================
  describe('Accessibility', () => {
    it('should have title attribute on close button', () => {
      const wrapper = mountManager();
      const closeBtn = wrapper.find('.close-btn');

      expect(closeBtn.attributes('title')).toBe('Close');
    });

    it('should have proper heading structure', () => {
      const wrapper = mountManager();

      expect(wrapper.find('.manager-header h2').exists()).toBe(true);
    });

    it('should have type attribute on close button', () => {
      const wrapper = mountManager();
      const closeBtn = wrapper.find('.close-btn');

      expect(closeBtn.attributes('type')).toBe('button');
    });
  });
});
