/**
 * StatusBar Component Tests
 * Tests status bar functionality including version display, connection status, encoding, terminal size, etc.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import StatusBar from '../StatusBar.vue';

// Mock settings store state - use reactive refs
const mockEncoding = ref('utf-8');
const mockLocalShell = ref('/bin/bash');

// Mock terminal store state
const mockActiveSessionId = ref<string | null>(null);
const mockSessionsMap = new Map<string, any>();

// Create mock stores with getter syntax for computed properties
vi.mock('@/stores', () => ({
  useSettingsStore: vi.fn(() => {
    // Return object with getters for reactivity
    return {
      get encoding() { return mockEncoding.value; },
      get localShell() { return mockLocalShell.value; },
    };
  }),
  useTerminalStore: vi.fn(() => {
    return {
      get activeSessionId() { return mockActiveSessionId.value; },
      sessions: mockSessionsMap,
    };
  }),
}));

// Helper to create mock session
function createMockSession(overrides: Partial<any> = {}) {
  return {
    id: 'session-1',
    title: 'Test Session',
    type: 'local',
    connectionType: 'local',
    status: 'connected',
    cols: 80,
    rows: 24,
    cwd: '/home/user',
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    ...overrides,
  };
}

// Helper to mount component
function mountStatusBar(props = {}) {
  return mount(StatusBar, {
    props,
    global: {
      stubs: {},
    },
  });
}

describe('StatusBar', () => {
  beforeEach(() => {
    // Reset mock state
    mockEncoding.value = 'utf-8';
    mockLocalShell.value = '/bin/bash';
    mockActiveSessionId.value = null;
    mockSessionsMap.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders footer element with correct class', () => {
      const wrapper = mountStatusBar();
      expect(wrapper.find('footer.status-bar').exists()).toBe(true);
    });

    it('renders left section with version', () => {
      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-left').exists()).toBe(true);
      expect(wrapper.find('.status-item.version').exists()).toBe(true);
    });

    it('renders center section with shell and size', () => {
      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-center').exists()).toBe(true);
      expect(wrapper.find('.status-item.shell').exists()).toBe(true);
    });

    it('renders right section with encoding and connection', () => {
      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-right').exists()).toBe(true);
      expect(wrapper.find('.status-item.encoding').exists()).toBe(true);
      expect(wrapper.find('.status-item.connection').exists()).toBe(true);
    });

    it('renders all three sections in correct order', () => {
      const wrapper = mountStatusBar();
      const footer = wrapper.find('footer.status-bar');
      const children = footer.element.children;

      expect(children[0].className).toBe('status-left');
      expect(children[1].className).toBe('status-center');
      expect(children[2].className).toBe('status-right');
    });
  });

  describe('Version Display', () => {
    it('displays default version', () => {
      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.version').text()).toBe('Easy Terminal v0.1.0');
    });

    it('displays custom version from prop', () => {
      const wrapper = mountStatusBar({ version: '1.0.0' });
      expect(wrapper.find('.status-item.version').text()).toBe('Easy Terminal v1.0.0');
    });

    it('updates version when prop changes', async () => {
      const wrapper = mountStatusBar({ version: '0.1.0' });
      expect(wrapper.find('.status-item.version').text()).toBe('Easy Terminal v0.1.0');

      await wrapper.setProps({ version: '2.0.0' });
      expect(wrapper.find('.status-item.version').text()).toBe('Easy Terminal v2.0.0');
    });

    it('handles empty version', () => {
      const wrapper = mountStatusBar({ version: '' });
      expect(wrapper.find('.status-item.version').text()).toBe('Easy Terminal v');
    });

    it('handles special characters in version', () => {
      const wrapper = mountStatusBar({ version: '1.0.0-beta.1+build.123' });
      expect(wrapper.find('.status-item.version').text()).toBe('Easy Terminal v1.0.0-beta.1+build.123');
    });

    it('handles Unicode in version', () => {
      const wrapper = mountStatusBar({ version: '1.0.0 🚀' });
      expect(wrapper.find('.status-item.version').text()).toBe('Easy Terminal v1.0.0 🚀');
    });
  });

  describe('Shell Display', () => {
    it('displays shell name from path', () => {
      mockLocalShell.value = '/bin/bash';
      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.shell').text()).toBe('bash');
    });

    it('extracts shell name from Windows path', () => {
      mockLocalShell.value = 'C:\\Program Files\\Git\\bin\\bash.exe';
      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.shell').text()).toBe('bash');
    });

    it('extracts shell name from PowerShell path', () => {
      mockLocalShell.value = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.shell').text()).toBe('powershell');
    });

    it('displays Terminal when shell is empty', () => {
      mockLocalShell.value = '';
      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.shell').text()).toBe('Terminal');
    });

    it('displays Terminal when shell is null', () => {
      mockLocalShell.value = null as any;
      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.shell').text()).toBe('Terminal');
    });

    it('handles shell name without path', () => {
      mockLocalShell.value = 'zsh';
      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.shell').text()).toBe('zsh');
    });

    it('handles fish shell path', () => {
      mockLocalShell.value = '/usr/local/bin/fish';
      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.shell').text()).toBe('fish');
    });

    it('handles zsh path', () => {
      mockLocalShell.value = '/bin/zsh';
      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.shell').text()).toBe('zsh');
    });

    it('handles cmd.exe path', () => {
      mockLocalShell.value = 'C:\\Windows\\System32\\cmd.exe';
      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.shell').text()).toBe('cmd');
    });
  });

  describe('Terminal Size Display', () => {
    it('does not display size when no active session', () => {
      mockActiveSessionId.value = null;
      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.size').exists()).toBe(false);
    });

    it('displays terminal size when session has cols and rows', () => {
      const session = createMockSession({ cols: 120, rows: 30 });
      mockSessionsMap.set('session-1', session);
      mockActiveSessionId.value = 'session-1';

      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.size').exists()).toBe(true);
      expect(wrapper.find('.status-item.size').text()).toBe('120×30');
    });

    it('does not display size when cols is missing', () => {
      const session = createMockSession({ cols: undefined, rows: 30 });
      mockSessionsMap.set('session-1', session);
      mockActiveSessionId.value = 'session-1';

      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.size').exists()).toBe(false);
    });

    it('does not display size when rows is missing', () => {
      const session = createMockSession({ cols: 80, rows: undefined });
      mockSessionsMap.set('session-1', session);
      mockActiveSessionId.value = 'session-1';

      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.size').exists()).toBe(false);
    });

    it('hides size when showTerminalSize is false', () => {
      const session = createMockSession({ cols: 80, rows: 24 });
      mockSessionsMap.set('session-1', session);
      mockActiveSessionId.value = 'session-1';

      const wrapper = mountStatusBar({ showTerminalSize: false });
      expect(wrapper.find('.status-item.size').exists()).toBe(false);
    });

    it('displays various terminal sizes correctly', () => {
      const sizes = [
        { cols: 80, rows: 24, expected: '80×24' },
        { cols: 120, rows: 40, expected: '120×40' },
        { cols: 200, rows: 50, expected: '200×50' },
        { cols: 1, rows: 1, expected: '1×1' },
      ];

      for (const size of sizes) {
        mockSessionsMap.clear();
        const session = createMockSession({ cols: size.cols, rows: size.rows });
        mockSessionsMap.set('session-1', session);
        mockActiveSessionId.value = 'session-1';

        const wrapper = mountStatusBar();
        expect(wrapper.find('.status-item.size').text()).toBe(size.expected);
      }
    });
  });

  describe('Encoding Display', () => {
    it('displays encoding in uppercase', () => {
      mockEncoding.value = 'utf-8';
      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.encoding').text()).toBe('UTF-8');
    });

    it('handles gbk encoding', () => {
      mockEncoding.value = 'gbk';
      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.encoding').text()).toBe('GBK');
    });

    it('handles utf-16 encoding', () => {
      mockEncoding.value = 'utf-16';
      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.encoding').text()).toBe('UTF-16');
    });

    it('handles iso-8859-1 encoding', () => {
      mockEncoding.value = 'iso-8859-1';
      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.encoding').text()).toBe('ISO-8859-1');
    });

    it('handles empty encoding', () => {
      mockEncoding.value = '';
      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.encoding').text()).toBe('');
    });
  });

  describe('Connection Status Display', () => {
    it('displays disconnected when no active session', () => {
      mockActiveSessionId.value = null;
      const wrapper = mountStatusBar();

      expect(wrapper.find('.status-item.connection').text()).toContain('Disconnected');
    });

    it('displays Local for local session', () => {
      const session = createMockSession({ connectionType: 'local' });
      mockSessionsMap.set('session-1', session);
      mockActiveSessionId.value = 'session-1';

      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.connection').text()).toContain('Local');
    });

    it('displays Connected for SSH session', () => {
      const session = createMockSession({ connectionType: 'ssh', type: 'ssh' });
      mockSessionsMap.set('session-1', session);
      mockActiveSessionId.value = 'session-1';

      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.connection').text()).toContain('Connected');
    });

    it('displays Connected for Docker session', () => {
      const session = createMockSession({ connectionType: 'docker', type: 'docker' });
      mockSessionsMap.set('session-1', session);
      mockActiveSessionId.value = 'session-1';

      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.connection').text()).toContain('Connected');
    });

    it('hides connection status when showConnectionStatus is false', () => {
      const wrapper = mountStatusBar({ showConnectionStatus: false });
      expect(wrapper.find('.status-item.connection').exists()).toBe(false);
    });

    it('shows connection status by default', () => {
      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.connection').exists()).toBe(true);
    });

    it('renders connection dot element', () => {
      const wrapper = mountStatusBar();
      expect(wrapper.find('.connection-dot').exists()).toBe(true);
    });

    it('applies success color for local connection', () => {
      const session = createMockSession({ connectionType: 'local' });
      mockSessionsMap.set('session-1', session);
      mockActiveSessionId.value = 'session-1';

      const wrapper = mountStatusBar();
      const connectionItem = wrapper.find('.status-item.connection');
      expect(connectionItem.attributes('style')).toContain('var(--color-success)');
    });

    it('applies primary color for SSH connection', () => {
      const session = createMockSession({ connectionType: 'ssh', type: 'ssh' });
      mockSessionsMap.set('session-1', session);
      mockActiveSessionId.value = 'session-1';

      const wrapper = mountStatusBar();
      const connectionItem = wrapper.find('.status-item.connection');
      expect(connectionItem.attributes('style')).toContain('var(--color-primary)');
    });

    it('applies muted color for disconnected state', () => {
      mockActiveSessionId.value = null;
      const wrapper = mountStatusBar();
      const connectionItem = wrapper.find('.status-item.connection');
      expect(connectionItem.attributes('style')).toContain('var(--color-text-3)');
    });

    it('applies correct background color to connection dot', () => {
      const session = createMockSession({ connectionType: 'local' });
      mockSessionsMap.set('session-1', session);
      mockActiveSessionId.value = 'session-1';

      const wrapper = mountStatusBar();
      const dot = wrapper.find('.connection-dot');
      expect(dot.attributes('style')).toContain('var(--color-success)');
    });
  });

  describe('Props', () => {
    it('accepts version prop', () => {
      const wrapper = mountStatusBar({ version: '1.0.0' });
      expect(wrapper.props('version')).toBe('1.0.0');
    });

    it('accepts showConnectionStatus prop', () => {
      const wrapper = mountStatusBar({ showConnectionStatus: false });
      expect(wrapper.props('showConnectionStatus')).toBe(false);
    });

    it('accepts showTerminalSize prop', () => {
      const wrapper = mountStatusBar({ showTerminalSize: false });
      expect(wrapper.props('showTerminalSize')).toBe(false);
    });

    it('has default version', () => {
      const wrapper = mountStatusBar();
      expect(wrapper.props('version')).toBe('0.1.0');
    });

    it('has default showConnectionStatus true', () => {
      const wrapper = mountStatusBar();
      expect(wrapper.props('showConnectionStatus')).toBe(true);
    });

    it('has default showTerminalSize true', () => {
      const wrapper = mountStatusBar();
      expect(wrapper.props('showTerminalSize')).toBe(true);
    });

    it('updates when props change', async () => {
      const wrapper = mountStatusBar({ showConnectionStatus: true });
      expect(wrapper.find('.status-item.connection').exists()).toBe(true);

      await wrapper.setProps({ showConnectionStatus: false });
      expect(wrapper.find('.status-item.connection').exists()).toBe(false);
    });
  });

  describe('UI Styles', () => {
    it('status-left has correct class', () => {
      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-left').classes()).toContain('status-left');
    });

    it('status-center has correct class', () => {
      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-center').classes()).toContain('status-center');
    });

    it('status-right has correct class', () => {
      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-right').classes()).toContain('status-right');
    });

    it('status items have correct classes', () => {
      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.version').classes()).toContain('status-item');
      expect(wrapper.find('.status-item.shell').classes()).toContain('status-item');
      expect(wrapper.find('.status-item.encoding').classes()).toContain('status-item');
      expect(wrapper.find('.status-item.connection').classes()).toContain('status-item');
    });

    it('connection-dot has correct class', () => {
      const wrapper = mountStatusBar();
      expect(wrapper.find('.connection-dot').exists()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('handles session not in map', () => {
      mockActiveSessionId.value = 'non-existent';
      const wrapper = mountStatusBar();

      expect(wrapper.find('.status-item.connection').text()).toContain('Disconnected');
      expect(wrapper.find('.status-item.size').exists()).toBe(false);
    });

    it('handles rapid activeSessionId changes', async () => {
      const session1 = createMockSession({ id: 'session-1', cols: 80, rows: 24 });
      const session2 = createMockSession({ id: 'session-2', cols: 120, rows: 40 });
      mockSessionsMap.set('session-1', session1);
      mockSessionsMap.set('session-2', session2);

      const wrapper = mountStatusBar();

      for (let i = 0; i < 5; i++) {
        mockActiveSessionId.value = 'session-1';
        await wrapper.vm.$nextTick();
        expect(wrapper.find('.status-item.size').text()).toBe('80×24');

        mockActiveSessionId.value = 'session-2';
        await wrapper.vm.$nextTick();
        expect(wrapper.find('.status-item.size').text()).toBe('120×40');
      }
    });

    it('handles special characters in shell path', () => {
      mockLocalShell.value = '/path/with spaces/my shell';
      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.shell').text()).toBe('my shell');
    });

    it('handles Unicode in shell path', () => {
      mockLocalShell.value = '/路径/终端/shell';
      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.shell').text()).toBe('shell');
    });

    it('handles very long shell path', () => {
      mockLocalShell.value = '/very/long/path/that/goes/on/and/on/and/on/bash';
      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.shell').text()).toBe('bash');
    });

    it('handles zero terminal size - does not display when size is 0', () => {
      // When cols or rows is 0, the condition `cols && rows` is false, so size is not displayed
      const session = createMockSession({ cols: 0, rows: 0 });
      mockSessionsMap.set('session-1', session);
      mockActiveSessionId.value = 'session-1';

      const wrapper = mountStatusBar();
      // Size element should not exist because 0 is falsy
      expect(wrapper.find('.status-item.size').exists()).toBe(false);
    });

    it('handles large terminal size', () => {
      const session = createMockSession({ cols: 999, rows: 999 });
      mockSessionsMap.set('session-1', session);
      mockActiveSessionId.value = 'session-1';

      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.size').text()).toBe('999×999');
    });

    it('handles all props set to false', () => {
      const session = createMockSession({ cols: 80, rows: 24 });
      mockSessionsMap.set('session-1', session);
      mockActiveSessionId.value = 'session-1';

      const wrapper = mountStatusBar({
        showConnectionStatus: false,
        showTerminalSize: false,
      });

      expect(wrapper.find('.status-item.connection').exists()).toBe(false);
      expect(wrapper.find('.status-item.size').exists()).toBe(false);
    });

    it('handles activeSessionId set to empty string', () => {
      mockActiveSessionId.value = '';
      const wrapper = mountStatusBar();

      expect(wrapper.find('.status-item.connection').text()).toContain('Disconnected');
    });
  });

  describe('Accessibility', () => {
    it('footer element is semantic', () => {
      const wrapper = mountStatusBar();
      expect(wrapper.find('footer').exists()).toBe(true);
    });

    it('status items are spans', () => {
      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.version').element.tagName).toBe('SPAN');
      expect(wrapper.find('.status-item.shell').element.tagName).toBe('SPAN');
      expect(wrapper.find('.status-item.encoding').element.tagName).toBe('SPAN');
      expect(wrapper.find('.status-item.connection').element.tagName).toBe('SPAN');
    });
  });

  describe('Layout Structure', () => {
    it('has correct structure in status-left', () => {
      const wrapper = mountStatusBar();
      const left = wrapper.find('.status-left');
      expect(left.find('.status-item.version').exists()).toBe(true);
    });

    it('has correct structure in status-center', () => {
      const session = createMockSession({ cols: 80, rows: 24 });
      mockSessionsMap.set('session-1', session);
      mockActiveSessionId.value = 'session-1';

      const wrapper = mountStatusBar();
      const center = wrapper.find('.status-center');
      expect(center.find('.status-item.shell').exists()).toBe(true);
      expect(center.find('.status-item.size').exists()).toBe(true);
    });

    it('has correct structure in status-right', () => {
      const wrapper = mountStatusBar();
      const right = wrapper.find('.status-right');
      expect(right.find('.status-item.encoding').exists()).toBe(true);
      expect(right.find('.status-item.connection').exists()).toBe(true);
    });
  });

  describe('Reactivity', () => {
    it('updates shell when localShell changes', async () => {
      mockLocalShell.value = '/bin/bash';
      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.shell').text()).toBe('bash');

      mockLocalShell.value = '/bin/zsh';
      await wrapper.vm.$nextTick();
      expect(wrapper.find('.status-item.shell').text()).toBe('zsh');
    });

    it('updates encoding when encoding changes', async () => {
      mockEncoding.value = 'utf-8';
      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.encoding').text()).toBe('UTF-8');

      mockEncoding.value = 'gbk';
      await wrapper.vm.$nextTick();
      expect(wrapper.find('.status-item.encoding').text()).toBe('GBK');
    });

    it('updates connection status when session changes', async () => {
      const session = createMockSession({ connectionType: 'local' });
      mockSessionsMap.set('session-1', session);
      mockActiveSessionId.value = 'session-1';

      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.connection').text()).toContain('Local');

      // Change to SSH session
      const sshSession = createMockSession({ id: 'session-2', connectionType: 'ssh', type: 'ssh' });
      mockSessionsMap.set('session-2', sshSession);
      mockActiveSessionId.value = 'session-2';
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.status-item.connection').text()).toContain('Connected');
    });

    it('updates terminal size when session changes', async () => {
      const session1 = createMockSession({ cols: 80, rows: 24 });
      mockSessionsMap.set('session-1', session1);
      mockActiveSessionId.value = 'session-1';

      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.size').text()).toBe('80×24');

      const session2 = createMockSession({ id: 'session-2', cols: 120, rows: 40 });
      mockSessionsMap.set('session-2', session2);
      mockActiveSessionId.value = 'session-2';
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.status-item.size').text()).toBe('120×40');
    });
  });

  describe('Multiple Sessions', () => {
    it('shows correct info for first session', () => {
      const session1 = createMockSession({ id: 'session-1', cols: 80, rows: 24, connectionType: 'local' });
      const session2 = createMockSession({ id: 'session-2', cols: 120, rows: 40, connectionType: 'ssh', type: 'ssh' });
      mockSessionsMap.set('session-1', session1);
      mockSessionsMap.set('session-2', session2);
      mockActiveSessionId.value = 'session-1';

      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.size').text()).toBe('80×24');
      expect(wrapper.find('.status-item.connection').text()).toContain('Local');
    });

    it('shows correct info for second session', () => {
      const session1 = createMockSession({ id: 'session-1', cols: 80, rows: 24, connectionType: 'local' });
      const session2 = createMockSession({ id: 'session-2', cols: 120, rows: 40, connectionType: 'ssh', type: 'ssh' });
      mockSessionsMap.set('session-1', session1);
      mockSessionsMap.set('session-2', session2);
      mockActiveSessionId.value = 'session-2';

      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.size').text()).toBe('120×40');
      expect(wrapper.find('.status-item.connection').text()).toContain('Connected');
    });
  });

  describe('Docker Session', () => {
    it('displays Connected for Docker session', () => {
      const session = createMockSession({ connectionType: 'docker', type: 'docker' });
      mockSessionsMap.set('session-1', session);
      mockActiveSessionId.value = 'session-1';

      const wrapper = mountStatusBar();
      expect(wrapper.find('.status-item.connection').text()).toContain('Connected');
    });

    it('applies primary color for Docker connection', () => {
      const session = createMockSession({ connectionType: 'docker', type: 'docker' });
      mockSessionsMap.set('session-1', session);
      mockActiveSessionId.value = 'session-1';

      const wrapper = mountStatusBar();
      const connectionItem = wrapper.find('.status-item.connection');
      expect(connectionItem.attributes('style')).toContain('var(--color-primary)');
    });
  });
});
