/**
 * SshConnectionForm Component Tests
 * Tests form validation, connection parameter saving, authentication type switching, and UI styles
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import SshConnectionForm from '../SshConnectionForm.vue';
import type { SshConnectionConfig, SshTestResult } from '@/types';

// Mock SSH service
let mockTestResult: SshTestResult = { success: true };
let testSshConnectionMock = vi.fn();
let saveSshConfigMock = vi.fn();

vi.mock('@/services/ssh.service', () => ({
  testSshConnection: (...args: unknown[]) => testSshConnectionMock(...args),
  saveSshConfig: (...args: unknown[]) => saveSshConfigMock(...args),
}));

// Helper to create mock config
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

// Helper to mount component
function mountForm(props: { config?: SshConnectionConfig | null } = {}) {
  return mount(SshConnectionForm, {
    props,
    global: {
      stubs: {},
    },
  });
}

describe('SshConnectionForm', () => {
  beforeEach(() => {
    // Reset mocks
    mockTestResult = { success: true, serverVersion: 'SSH-2.0-OpenSSH_8.9' };

    testSshConnectionMock = vi.fn().mockImplementation(async () => mockTestResult);
    saveSshConfigMock = vi.fn().mockImplementation(async (config: SshConnectionConfig) => {
      return config;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================
  // Basic Rendering Tests
  // ===========================================
  describe('Basic Rendering', () => {
    it('should render form with all required fields', () => {
      const wrapper = mountForm();

      expect(wrapper.find('.ssh-form').exists()).toBe(true);
      expect(wrapper.find('.form-header').exists()).toBe(true);
      expect(wrapper.find('.form-body').exists()).toBe(true);
      expect(wrapper.find('.form-footer').exists()).toBe(true);
    });

    it('should show "New SSH Connection" title for new connection', () => {
      const wrapper = mountForm();

      expect(wrapper.find('h3').text()).toBe('New SSH Connection');
    });

    it('should show "Edit SSH Connection" title when editing', () => {
      const config = createMockConfig();
      const wrapper = mountForm({ config });

      expect(wrapper.find('h3').text()).toBe('Edit SSH Connection');
    });

    it('should render all form input fields', () => {
      const wrapper = mountForm();
      const html = wrapper.html();

      // Name field
      expect(html).toContain('id="name"');
      // Host field
      expect(html).toContain('id="host"');
      // Port field
      expect(html).toContain('id="port"');
      // Username field
      expect(html).toContain('id="username"');
      // Auth type select
      expect(html).toContain('id="authType"');
      // Working directory
      expect(html).toContain('id="cwd"');
    });

    it('should render footer buttons', () => {
      const wrapper = mountForm();

      expect(wrapper.find('.test-btn').exists()).toBe(true);
      expect(wrapper.find('.cancel-btn').exists()).toBe(true);
      expect(wrapper.find('.save-btn').exists()).toBe(true);
    });
  });

  // ===========================================
  // Form Layout Tests
  // ===========================================
  describe('Form Layout', () => {
    it('should have correct form structure', () => {
      const wrapper = mountForm();

      // Check main sections
      expect(wrapper.find('.form-header').exists()).toBe(true);
      expect(wrapper.find('.form-body').exists()).toBe(true);
      expect(wrapper.find('.form-footer').exists()).toBe(true);
    });

    it('should have host and port in same row', () => {
      const wrapper = mountForm();

      const formRow = wrapper.find('.form-row');
      expect(formRow.exists()).toBe(true);
      expect(formRow.find('.form-group.flex-1').exists()).toBe(true);
      expect(formRow.find('.form-group.port').exists()).toBe(true);
    });

    it('should have checkbox for favorite toggle', () => {
      const wrapper = mountForm();

      const checkbox = wrapper.find('.form-group.checkbox');
      expect(checkbox.exists()).toBe(true);
      expect(checkbox.find('input[type="checkbox"]').exists()).toBe(true);
    });

    it('should have hint texts for optional fields', () => {
      const wrapper = mountForm();
      const html = wrapper.html();

      expect(html).toContain('Optional display name');
      expect(html).toContain('Password will be stored locally');
      expect(html).toContain('Initial directory after connection');
    });
  });

  // ===========================================
  // Authentication Type Tests
  // ===========================================
  describe('Authentication Type Switching', () => {
    it('should render password field by default', () => {
      const wrapper = mountForm();
      const html = wrapper.html();

      expect(html).toContain('id="password"');
    });

    it('should show password field when authType is password', async () => {
      const wrapper = mountForm();

      // Password field should be visible by default
      expect(wrapper.find('#password').exists()).toBe(true);
    });

    it('should show private key fields when authType is key', async () => {
      const wrapper = mountForm();

      // Change auth type to key
      const authSelect = wrapper.find('#authType');
      await authSelect.setValue('key');
      await nextTick();

      const html = wrapper.html();
      expect(html).toContain('id="privateKey"');
      expect(html).toContain('id="passphrase"');
      expect(wrapper.find('#password').exists()).toBe(false);
    });

    it('should show no auth fields when authType is agent', async () => {
      const wrapper = mountForm();

      // Change auth type to agent
      const authSelect = wrapper.find('#authType');
      await authSelect.setValue('agent');
      await nextTick();

      const html = wrapper.html();
      expect(wrapper.find('#password').exists()).toBe(false);
      expect(html).not.toContain('id="privateKey"');
    });

    it('should render auth type select with correct options', () => {
      const wrapper = mountForm();
      const select = wrapper.find('#authType');
      const options = select.findAll('option');

      expect(options).toHaveLength(3);
      expect(options[0].text()).toBe('Password');
      expect(options[1].text()).toBe('Private Key');
      expect(options[2].text()).toBe('SSH Agent');
    });

    it('should have password input type for password field', () => {
      const wrapper = mountForm();
      const passwordInput = wrapper.find('#password');

      expect(passwordInput.attributes('type')).toBe('password');
    });

    it('should have password input type for passphrase field', async () => {
      const wrapper = mountForm();

      // Switch to key auth
      await wrapper.find('#authType').setValue('key');
      await nextTick();

      const passphraseInput = wrapper.find('#passphrase');
      expect(passphraseInput.attributes('type')).toBe('password');
    });
  });

  // ===========================================
  // Form Field Validation Tests
  // ===========================================
  describe('Form Field Validation', () => {
    it('should disable test button when required fields are empty', () => {
      const wrapper = mountForm();
      const testBtn = wrapper.find('.test-btn');

      expect(testBtn.attributes('disabled')).toBeDefined();
    });

    it('should enable test button when required fields are filled for password auth', async () => {
      const wrapper = mountForm();

      // Fill required fields
      await wrapper.find('#host').setValue('192.168.1.100');
      await wrapper.find('#port').setValue(22);
      await wrapper.find('#username').setValue('testuser');
      await wrapper.find('#password').setValue('testpass');
      await nextTick();

      const testBtn = wrapper.find('.test-btn');
      expect(testBtn.attributes('disabled')).toBeUndefined();
    });

    it('should enable test button when required fields are filled for key auth', async () => {
      const wrapper = mountForm();

      // Switch to key auth
      await wrapper.find('#authType').setValue('key');
      await nextTick();

      // Fill required fields
      await wrapper.find('#host').setValue('192.168.1.100');
      await wrapper.find('#port').setValue(22);
      await wrapper.find('#username').setValue('testuser');
      await wrapper.find('#privateKey').setValue('/home/user/.ssh/id_rsa');
      await nextTick();

      const testBtn = wrapper.find('.test-btn');
      expect(testBtn.attributes('disabled')).toBeUndefined();
    });

    it('should enable test button when required fields are filled for agent auth', async () => {
      const wrapper = mountForm();

      // Switch to agent auth
      await wrapper.find('#authType').setValue('agent');
      await nextTick();

      // Fill required fields (no password/key needed for agent)
      await wrapper.find('#host').setValue('192.168.1.100');
      await wrapper.find('#port').setValue(22);
      await wrapper.find('#username').setValue('testuser');
      await nextTick();

      const testBtn = wrapper.find('.test-btn');
      expect(testBtn.attributes('disabled')).toBeUndefined();
    });

    it('should show error when saving without host', async () => {
      const wrapper = mountForm();

      // Only set username, no host
      await wrapper.find('#username').setValue('testuser');
      await nextTick();

      await wrapper.find('.save-btn').trigger('click');
      await nextTick();

      expect(wrapper.find('.error-message').exists()).toBe(true);
      expect(wrapper.find('.error-message').text()).toContain('Host and username are required');
    });

    it('should show error when saving without username', async () => {
      const wrapper = mountForm();

      // Only set host, no username
      await wrapper.find('#host').setValue('192.168.1.100');
      await nextTick();

      await wrapper.find('.save-btn').trigger('click');
      await nextTick();

      expect(wrapper.find('.error-message').exists()).toBe(true);
      expect(wrapper.find('.error-message').text()).toContain('Host and username are required');
    });

    it('should accept valid hostname (IP address)', async () => {
      const wrapper = mountForm();

      await wrapper.find('#host').setValue('192.168.1.100');
      await nextTick();

      // No validation error for valid IP
      expect(wrapper.find('.error-message').exists()).toBe(false);
    });

    it('should accept valid hostname (domain)', async () => {
      const wrapper = mountForm();

      await wrapper.find('#host').setValue('server.example.com');
      await nextTick();

      // No validation error for valid domain
      expect(wrapper.find('.error-message').exists()).toBe(false);
    });

    it('should accept valid port number', async () => {
      const wrapper = mountForm();

      const portInput = wrapper.find('#port');
      await portInput.setValue(2222);
      await nextTick();

      expect((portInput.element as HTMLInputElement).value).toBe('2222');
    });

    it('should have port input with min/max attributes', () => {
      const wrapper = mountForm();
      const portInput = wrapper.find('#port');

      expect(portInput.attributes('min')).toBe('1');
      expect(portInput.attributes('max')).toBe('65535');
    });
  });

  // ===========================================
  // Connection Parameter Save Tests
  // ===========================================
  describe('Connection Parameter Save', () => {
    it('should emit save event with correct config', async () => {
      const wrapper = mountForm();

      // Fill form
      await wrapper.find('#name').setValue('My Server');
      await wrapper.find('#host').setValue('192.168.1.100');
      await wrapper.find('#port').setValue(22);
      await wrapper.find('#username').setValue('testuser');
      await wrapper.find('#password').setValue('testpass');
      await nextTick();

      // Save
      await wrapper.find('.save-btn').trigger('click');
      await nextTick();

      expect(wrapper.emitted('save')).toBeTruthy();
      const savedConfig = wrapper.emitted('save')![0][0] as SshConnectionConfig;
      expect(savedConfig.name).toBe('My Server');
      expect(savedConfig.host).toBe('192.168.1.100');
      expect(savedConfig.port).toBe(22);
      expect(savedConfig.username).toBe('testuser');
      expect(savedConfig.authType).toBe('password');
    });

    it('should generate default name from username and host', async () => {
      const wrapper = mountForm();

      // Fill form without name
      await wrapper.find('#host').setValue('192.168.1.100');
      await wrapper.find('#username').setValue('admin');
      await nextTick();

      await wrapper.find('.save-btn').trigger('click');
      await nextTick();

      const savedConfig = wrapper.emitted('save')![0][0] as SshConnectionConfig;
      expect(savedConfig.name).toBe('admin@192.168.1.100');
    });

    it('should save favorite status', async () => {
      const wrapper = mountForm();

      await wrapper.find('#host').setValue('192.168.1.100');
      await wrapper.find('#username').setValue('testuser');
      await wrapper.find('input[type="checkbox"]').setValue(true);
      await nextTick();

      await wrapper.find('.save-btn').trigger('click');
      await nextTick();

      const savedConfig = wrapper.emitted('save')![0][0] as SshConnectionConfig;
      expect(savedConfig.isFavorite).toBe(true);
    });

    it('should save working directory', async () => {
      const wrapper = mountForm();

      await wrapper.find('#host').setValue('192.168.1.100');
      await wrapper.find('#username').setValue('testuser');
      await wrapper.find('#cwd').setValue('/home/user');
      await nextTick();

      await wrapper.find('.save-btn').trigger('click');
      await nextTick();

      const savedConfig = wrapper.emitted('save')![0][0] as SshConnectionConfig;
      expect(savedConfig.cwd).toBe('/home/user');
    });

    it('should call saveSshConfig service', async () => {
      const wrapper = mountForm();

      await wrapper.find('#host').setValue('192.168.1.100');
      await wrapper.find('#username').setValue('testuser');
      await nextTick();

      await wrapper.find('.save-btn').trigger('click');
      await nextTick();

      expect(saveSshConfigMock).toHaveBeenCalled();
    });

    it('should reset form after save', async () => {
      const wrapper = mountForm();

      await wrapper.find('#host').setValue('192.168.1.100');
      await wrapper.find('#username').setValue('testuser');
      await nextTick();

      await wrapper.find('.save-btn').trigger('click');
      await nextTick();

      // Form should be reset
      expect((wrapper.find('#host').element as HTMLInputElement).value).toBe('');
      expect((wrapper.find('#username').element as HTMLInputElement).value).toBe('');
    });
  });

  // ===========================================
  // Edit Mode Tests
  // ===========================================
  describe('Edit Mode', () => {
    it('should populate form with existing config', async () => {
      const config = createMockConfig({
        name: 'Production Server',
        host: 'prod.example.com',
        port: 2222,
        username: 'admin',
        authType: 'key',
        privateKeyPath: '/home/admin/.ssh/id_rsa',
      });

      const wrapper = mountForm({ config });
      await nextTick();

      expect((wrapper.find('#name').element as HTMLInputElement).value).toBe('Production Server');
      expect((wrapper.find('#host').element as HTMLInputElement).value).toBe('prod.example.com');
      expect((wrapper.find('#port').element as HTMLInputElement).value).toBe('2222');
      expect((wrapper.find('#username').element as HTMLInputElement).value).toBe('admin');
    });

    it('should preserve config id when saving', async () => {
      const config = createMockConfig({ id: 'existing-id-123' });
      const wrapper = mountForm({ config });
      await nextTick();

      await wrapper.find('.save-btn').trigger('click');
      await nextTick();

      const savedConfig = wrapper.emitted('save')![0][0] as SshConnectionConfig;
      expect(savedConfig.id).toBe('existing-id-123');
    });

    it('should show "Save" button text in edit mode', () => {
      const config = createMockConfig();
      const wrapper = mountForm({ config });

      expect(wrapper.find('.save-btn').text()).toBe('Save');
    });

    it('should show "Create" button text in new mode', () => {
      const wrapper = mountForm();

      expect(wrapper.find('.save-btn').text()).toBe('Create');
    });

    it('should load favorite status from config', async () => {
      const config = createMockConfig({ isFavorite: true });
      const wrapper = mountForm({ config });
      await nextTick();

      const checkbox = wrapper.find('input[type="checkbox"]');
      expect((checkbox.element as HTMLInputElement).checked).toBe(true);
    });
  });

  // ===========================================
  // Test Connection Tests
  // ===========================================
  describe('Test Connection', () => {
    it('should call testSshConnection service', async () => {
      const wrapper = mountForm();

      await wrapper.find('#host').setValue('192.168.1.100');
      await wrapper.find('#port').setValue(22);
      await wrapper.find('#username').setValue('testuser');
      await wrapper.find('#password').setValue('testpass');
      await nextTick();

      await wrapper.find('.test-btn').trigger('click');
      await nextTick();

      expect(testSshConnectionMock).toHaveBeenCalled();
    });

    it('should show loading state during test', async () => {
      // Make test connection slow
      testSshConnectionMock.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return mockTestResult;
      });

      const wrapper = mountForm();

      await wrapper.find('#host').setValue('192.168.1.100');
      await wrapper.find('#port').setValue(22);
      await wrapper.find('#username').setValue('testuser');
      await wrapper.find('#password').setValue('testpass');
      await nextTick();

      const testBtn = wrapper.find('.test-btn');
      const clickPromise = testBtn.trigger('click');
      await nextTick();

      // Should show spinner during test
      expect(wrapper.find('.spinner').exists()).toBe(true);

      await clickPromise;
    });

    it('should show success result after test', async () => {
      mockTestResult = {
        success: true,
        serverVersion: 'SSH-2.0-OpenSSH_8.9',
      };

      const wrapper = mountForm();

      await wrapper.find('#host').setValue('192.168.1.100');
      await wrapper.find('#port').setValue(22);
      await wrapper.find('#username').setValue('testuser');
      await wrapper.find('#password').setValue('testpass');
      await nextTick();

      await wrapper.find('.test-btn').trigger('click');
      await nextTick();
      await nextTick();

      const testResult = wrapper.find('.test-result');
      expect(testResult.exists()).toBe(true);
      expect(testResult.classes()).toContain('success');
    });

    it('should show error result after failed test', async () => {
      mockTestResult = {
        success: false,
        error: 'Connection refused',
      };

      const wrapper = mountForm();

      await wrapper.find('#host').setValue('192.168.1.100');
      await wrapper.find('#port').setValue(22);
      await wrapper.find('#username').setValue('testuser');
      await wrapper.find('#password').setValue('testpass');
      await nextTick();

      await wrapper.find('.test-btn').trigger('click');
      await nextTick();
      await nextTick();

      const testResult = wrapper.find('.test-result');
      expect(testResult.exists()).toBe(true);
      expect(testResult.classes()).toContain('error');
      expect(testResult.text()).toContain('Connection refused');
    });

    it('should handle test connection exception', async () => {
      testSshConnectionMock.mockRejectedValue(new Error('Network error'));

      const wrapper = mountForm();

      await wrapper.find('#host').setValue('192.168.1.100');
      await wrapper.find('#port').setValue(22);
      await wrapper.find('#username').setValue('testuser');
      await wrapper.find('#password').setValue('testpass');
      await nextTick();

      await wrapper.find('.test-btn').trigger('click');
      await nextTick();
      await nextTick();

      const testResult = wrapper.find('.test-result');
      expect(testResult.exists()).toBe(true);
      expect(testResult.classes()).toContain('error');
      expect(testResult.text()).toContain('Network error');
    });

    it('should disable test button when cannot test', () => {
      const wrapper = mountForm();

      // Empty form - should be disabled
      const testBtn = wrapper.find('.test-btn');
      expect(testBtn.attributes('disabled')).toBeDefined();
    });
  });

  // ===========================================
  // Cancel Tests
  // ===========================================
  describe('Cancel Action', () => {
    it('should emit cancel event', async () => {
      const wrapper = mountForm();

      await wrapper.find('.cancel-btn').trigger('click');

      expect(wrapper.emitted('cancel')).toBeTruthy();
    });

    it('should reset form on cancel', async () => {
      const wrapper = mountForm();

      // Fill form
      await wrapper.find('#host').setValue('192.168.1.100');
      await wrapper.find('#username').setValue('testuser');
      await nextTick();

      // Cancel
      await wrapper.find('.cancel-btn').trigger('click');
      await nextTick();

      // Form should be reset
      expect((wrapper.find('#host').element as HTMLInputElement).value).toBe('');
      expect((wrapper.find('#username').element as HTMLInputElement).value).toBe('');
    });
  });

  // ===========================================
  // UI Style Tests
  // ===========================================
  describe('UI Styles', () => {
    it('should have correct CSS classes for form structure', () => {
      const wrapper = mountForm();

      expect(wrapper.find('.ssh-form').exists()).toBe(true);
      expect(wrapper.find('.form-header').exists()).toBe(true);
      expect(wrapper.find('.form-body').exists()).toBe(true);
      expect(wrapper.find('.form-footer').exists()).toBe(true);
    });

    it('should have correct button classes', () => {
      const wrapper = mountForm();

      expect(wrapper.find('.test-btn').exists()).toBe(true);
      expect(wrapper.find('.cancel-btn').exists()).toBe(true);
      expect(wrapper.find('.save-btn').exists()).toBe(true);
    });

    it('should have test result styling classes', async () => {
      mockTestResult = { success: true };
      const wrapper = mountForm();

      await wrapper.find('#host').setValue('192.168.1.100');
      await wrapper.find('#port').setValue(22);
      await wrapper.find('#username').setValue('testuser');
      await wrapper.find('#password').setValue('testpass');
      await nextTick();

      await wrapper.find('.test-btn').trigger('click');
      await nextTick();
      await nextTick();

      const testResult = wrapper.find('.test-result');
      expect(testResult.classes()).toContain('success');
    });

    it('should have error message styling', async () => {
      const wrapper = mountForm();

      await wrapper.find('.save-btn').trigger('click');
      await nextTick();

      const errorMsg = wrapper.find('.error-message');
      expect(errorMsg.exists()).toBe(true);
    });

    it('should show success icon on successful test', async () => {
      mockTestResult = { success: true };
      const wrapper = mountForm();

      await wrapper.find('#host').setValue('192.168.1.100');
      await wrapper.find('#port').setValue(22);
      await wrapper.find('#username').setValue('testuser');
      await wrapper.find('#password').setValue('testpass');
      await nextTick();

      await wrapper.find('.test-btn').trigger('click');
      await nextTick();
      await nextTick();

      // Check for success icon (checkmark SVG path)
      const html = wrapper.html();
      expect(html).toContain('M9 16.17');
    });

    it('should show error icon on failed test', async () => {
      mockTestResult = { success: false, error: 'Failed' };
      const wrapper = mountForm();

      await wrapper.find('#host').setValue('192.168.1.100');
      await wrapper.find('#port').setValue(22);
      await wrapper.find('#username').setValue('testuser');
      await wrapper.find('#password').setValue('testpass');
      await nextTick();

      await wrapper.find('.test-btn').trigger('click');
      await nextTick();
      await nextTick();

      // Check for error icon SVG path
      const html = wrapper.html();
      expect(html).toContain('M12 2C6.48');
    });
  });

  // ===========================================
  // Edge Cases
  // ===========================================
  describe('Edge Cases', () => {
    it('should handle empty config prop', () => {
      const wrapper = mountForm({ config: null });

      expect(wrapper.find('h3').text()).toBe('New SSH Connection');
    });

    it('should handle config prop with undefined', () => {
      const wrapper = mountForm({ config: undefined });

      expect(wrapper.find('h3').text()).toBe('New SSH Connection');
    });

    it('should handle special characters in host', async () => {
      const wrapper = mountForm();

      await wrapper.find('#host').setValue('server-name_01.example.com');
      await nextTick();

      expect((wrapper.find('#host').element as HTMLInputElement).value).toBe('server-name_01.example.com');
    });

    it('should handle port at boundary values', async () => {
      const wrapper = mountForm();

      // Min port
      await wrapper.find('#port').setValue(1);
      expect((wrapper.find('#port').element as HTMLInputElement).value).toBe('1');

      // Max port
      await wrapper.find('#port').setValue(65535);
      expect((wrapper.find('#port').element as HTMLInputElement).value).toBe('65535');
    });

    it('should handle very long hostnames', async () => {
      const wrapper = mountForm();

      const longHost = 'a'.repeat(100) + '.example.com';
      await wrapper.find('#host').setValue(longHost);
      await nextTick();

      expect((wrapper.find('#host').element as HTMLInputElement).value).toBe(longHost);
    });

    it('should handle Unicode in name field', async () => {
      const wrapper = mountForm();

      await wrapper.find('#name').setValue('服务器连接');
      await nextTick();

      expect((wrapper.find('#name').element as HTMLInputElement).value).toBe('服务器连接');
    });

    it('should handle paths with spaces in privateKeyPath', async () => {
      const wrapper = mountForm();

      await wrapper.find('#authType').setValue('key');
      await nextTick();

      await wrapper.find('#privateKey').setValue('C:\\Users\\Test User\\.ssh\\id_rsa');
      await nextTick();

      expect((wrapper.find('#privateKey').element as HTMLInputElement).value).toBe(
        'C:\\Users\\Test User\\.ssh\\id_rsa'
      );
    });

    it('should handle save error gracefully', async () => {
      saveSshConfigMock.mockRejectedValue(new Error('Save failed'));

      const wrapper = mountForm();

      await wrapper.find('#host').setValue('192.168.1.100');
      await wrapper.find('#username').setValue('testuser');
      await nextTick();

      await wrapper.find('.save-btn').trigger('click');
      await nextTick();
      await nextTick();

      const errorMsg = wrapper.find('.error-message');
      expect(errorMsg.exists()).toBe(true);
      // Error message is the error.message since it's an Error instance
      expect(errorMsg.text()).toContain('Save failed');
    });

    it('should update form when config prop changes', async () => {
      const wrapper = mountForm({ config: null });

      // Initially empty
      expect((wrapper.find('#host').element as HTMLInputElement).value).toBe('');

      // Update with config
      const config = createMockConfig({
        host: 'new.host.com',
        username: 'newuser',
      });

      await wrapper.setProps({ config });
      await nextTick();

      expect((wrapper.find('#host').element as HTMLInputElement).value).toBe('new.host.com');
      expect((wrapper.find('#username').element as HTMLInputElement).value).toBe('newuser');
    });

    it('should clear error when re-submitting', async () => {
      const wrapper = mountForm();

      // First submit without data - shows error
      await wrapper.find('.save-btn').trigger('click');
      await nextTick();
      expect(wrapper.find('.error-message').exists()).toBe(true);

      // Fill and submit again
      await wrapper.find('#host').setValue('192.168.1.100');
      await wrapper.find('#username').setValue('testuser');
      await nextTick();

      await wrapper.find('.save-btn').trigger('click');
      await nextTick();

      // Error should be cleared
      expect(wrapper.find('.error-message').exists()).toBe(false);
    });

    it('should handle password with special characters', async () => {
      const wrapper = mountForm();

      await wrapper.find('#password').setValue('p@$$w0rd!#$%');
      await nextTick();

      expect((wrapper.find('#password').element as HTMLInputElement).value).toBe('p@$$w0rd!#$%');
    });
  });
});
