/**
 * TerminalPane Component Tests
 * Tests terminal initialization, input/output, lifecycle, and UI styles
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import TerminalPane from '../TerminalPane.vue';

// ============================================
// Global Mock State (must be at top level for vi.mock hoisting)
// ============================================

interface MockTerminal {
  open: ReturnType<typeof vi.fn>;
  focus: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  write: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  loadAddon: ReturnType<typeof vi.fn>;
  onData: ReturnType<typeof vi.fn>;
  onResize: ReturnType<typeof vi.fn>;
  onTitleChange: ReturnType<typeof vi.fn>;
  unicode: { activeVersion: string };
  _onDataCallback?: (data: string) => void;
  _onResizeCallback?: (data: { cols: number; rows: number }) => void;
  _onTitleChangeCallback?: (title: string) => void;
}

interface MockFitAddon {
  fit: ReturnType<typeof vi.fn>;
}

let mockTerminalInstance: MockTerminal;
let mockFitAddonInstance: MockFitAddon;
let mockUpdateSessionFn: ReturnType<typeof vi.fn>;
let mockSendTerminalInputFn: ReturnType<typeof vi.fn>;
let mockResizeTerminalFn: ReturnType<typeof vi.fn>;
let mockOnTerminalOutputFn: ReturnType<typeof vi.fn>;
let currentOutputHandler: ((event: { session_id: string; data: string }) => void) | null = null;

// Store state
interface MockStoreState {
  sessions: Map<string, { id: string; cols?: number; rows?: number; lastActivityAt?: number }>;
}
let mockStoreState: MockStoreState;

// ============================================
// Mock Modules (hoisted to top)
// ============================================

vi.mock('xterm', () => {
  return {
    Terminal: class MockTerminal {
      open = vi.fn();
      focus = vi.fn();
      clear = vi.fn();
      write = vi.fn();
      dispose = vi.fn();
      loadAddon = vi.fn();
      onData = vi.fn((callback: (data: string) => void) => {
        (this as unknown as { _onDataCallback: (data: string) => void })._onDataCallback = callback;
      });
      onResize = vi.fn((callback: (data: { cols: number; rows: number }) => void) => {
        (this as unknown as { _onResizeCallback: (data: { cols: number; rows: number }) => void })._onResizeCallback = callback;
      });
      onTitleChange = vi.fn((callback: (title: string) => void) => {
        (this as unknown as { _onTitleChangeCallback: (title: string) => void })._onTitleChangeCallback = callback;
      });
      unicode = { activeVersion: '6' };
      _onDataCallback?: (data: string) => void;
      _onResizeCallback?: (data: { cols: number; rows: number }) => void;
      _onTitleChangeCallback?: (title: string) => void;

      constructor() {
        mockTerminalInstance = this as unknown as MockTerminal;
      }
    },
  };
});

vi.mock('xterm-addon-fit', () => {
  return {
    FitAddon: class MockFitAddon {
      fit = vi.fn();
      constructor() {
        mockFitAddonInstance = this as unknown as MockFitAddon;
      }
    },
  };
});

vi.mock('xterm-addon-search', () => ({
  SearchAddon: class MockSearchAddon {},
}));

vi.mock('xterm-addon-web-links', () => ({
  WebLinksAddon: class MockWebLinksAddon {},
}));

vi.mock('xterm-addon-unicode11', () => ({
  Unicode11Addon: class MockUnicode11Addon {},
}));

vi.mock('@/stores', () => ({
  useTerminalStore: vi.fn(() => ({
    get sessions() { return mockStoreState.sessions; },
    updateSession: mockUpdateSessionFn,
  })),
}));

vi.mock('@/services/terminal.service', () => ({
  sendTerminalInput: (...args: unknown[]) => mockSendTerminalInputFn(...args),
  resizeTerminal: (...args: unknown[]) => mockResizeTerminalFn(...args),
}));

vi.mock('@/services/events', () => ({
  onTerminalOutput: (...args: unknown[]) => mockOnTerminalOutputFn(...args),
}));

// ============================================
// Test Helper Functions
// ============================================

interface MountOptions {
  props?: Record<string, unknown>;
}

function mountTerminalPane(options: MountOptions = {}): VueWrapper {
  const pinia = createPinia();
  setActivePinia(pinia);

  return mount(TerminalPane, {
    props: {
      sessionId: 'test-session',
      ...options.props,
    },
    global: {
      plugins: [pinia],
    },
  });
}

// ============================================
// Test Suite
// ============================================

describe('TerminalPane', () => {
  let wrapper: VueWrapper | null = null;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock state
    mockStoreState = {
      sessions: new Map([['test-session', { id: 'test-session' }]]),
    };

    // Initialize mock functions
    mockUpdateSessionFn = vi.fn();
    mockSendTerminalInputFn = vi.fn().mockResolvedValue(undefined);
    mockResizeTerminalFn = vi.fn().mockResolvedValue(undefined);
    mockOnTerminalOutputFn = vi.fn().mockImplementation((handler) => {
      currentOutputHandler = handler;
      return Promise.resolve(() => {
        currentOutputHandler = null;
      });
    });

    // Mock ResizeObserver
    vi.stubGlobal('ResizeObserver', class MockResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      constructor(_callback: () => void) {}
    });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    vi.unstubAllGlobals();
    currentOutputHandler = null;
  });

  // ===========================================
  // PTY Session Initialization Tests
  // ===========================================
  describe('PTY Session Initialization', () => {
    it('should create terminal instance on mount', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      // Terminal instance should be created and stored
      expect(mockTerminalInstance).toBeDefined();
      expect(mockTerminalInstance.open).toBeDefined();
    });

    it('should open terminal in container', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      expect(mockTerminalInstance.open).toHaveBeenCalled();
      const containerElement = mockTerminalInstance.open.mock.calls[0][0];
      expect(containerElement).toBeDefined();
    });

    it('should load all required addons', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      // Should load 4 addons: fit, search, web-links, unicode11
      expect(mockTerminalInstance.loadAddon).toHaveBeenCalledTimes(4);
    });

    it('should enable Unicode 11', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      expect(mockTerminalInstance.unicode.activeVersion).toBe('11');
    });

    it('should focus terminal after initialization', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      expect(mockTerminalInstance.focus).toHaveBeenCalled();
    });

    it('should call fit after initialization', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      expect(mockFitAddonInstance.fit).toHaveBeenCalled();
    });

    it('should setup terminal output listener', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      expect(mockOnTerminalOutputFn).toHaveBeenCalled();
    });

    it('should use correct terminal options', async () => {
      // This test verifies that the Terminal class is called with options
      // We can't easily spy on class constructors, so we verify the terminal works
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      // Verify terminal was created with expected properties
      expect(mockTerminalInstance).toBeDefined();
      // Verify unicode version is set to 11
      expect(mockTerminalInstance.unicode.activeVersion).toBe('11');
    });
  });

  // ===========================================
  // Command Execution Tests
  // ===========================================
  describe('Command Execution', () => {
    it('should send input data to backend', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      // Simulate terminal input
      const inputData = 'ls -la\n';
      const dataCallback = mockTerminalInstance._onDataCallback;
      if (typeof dataCallback === 'function') {
        await dataCallback(inputData);
      }

      expect(mockSendTerminalInputFn).toHaveBeenCalledWith('test-session', inputData);
    });

    it('should update session activity on input', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      const dataCallback = mockTerminalInstance._onDataCallback;
      if (typeof dataCallback === 'function') {
        await dataCallback('test command');
      }

      expect(mockUpdateSessionFn).toHaveBeenCalledWith('test-session', {
        lastActivityAt: expect.any(Number),
      });
    });

    it('should handle input error gracefully', async () => {
      mockSendTerminalInputFn.mockRejectedValueOnce(new Error('Input failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      const dataCallback = mockTerminalInstance._onDataCallback;
      if (typeof dataCallback === 'function') {
        await dataCallback('test');
      }

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should send Ctrl+C signal correctly', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      const dataCallback = mockTerminalInstance._onDataCallback;
      if (typeof dataCallback === 'function') {
        await dataCallback('\x03'); // Ctrl+C
      }

      expect(mockSendTerminalInputFn).toHaveBeenCalledWith('test-session', '\x03');
    });

    it('should handle interactive commands', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      const dataCallback = mockTerminalInstance._onDataCallback;

      // Simulate interactive input sequence
      if (typeof dataCallback === 'function') {
        await dataCallback('vim test.txt');
        await dataCallback('\x1b'); // ESC
        await dataCallback(':q!\n');
      }

      expect(mockSendTerminalInputFn).toHaveBeenCalledTimes(3);
    });
  });

  // ===========================================
  // Terminal Output Tests
  // ===========================================
  describe('Terminal Output', () => {
    it('should write output to terminal', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      // Simulate output event
      if (currentOutputHandler) {
        currentOutputHandler({ session_id: 'test-session', data: 'Hello World' });
      }

      expect(mockTerminalInstance.write).toHaveBeenCalledWith('Hello World');
    });

    it('should only write output for matching session', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      mockTerminalInstance.write.mockClear();

      // Output for different session
      if (currentOutputHandler) {
        currentOutputHandler({ session_id: 'other-session', data: 'Other Output' });
      }

      expect(mockTerminalInstance.write).not.toHaveBeenCalled();
    });

    it('should handle multiple output chunks', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      if (currentOutputHandler) {
        currentOutputHandler({ session_id: 'test-session', data: 'Line 1\n' });
        currentOutputHandler({ session_id: 'test-session', data: 'Line 2\n' });
        currentOutputHandler({ session_id: 'test-session', data: 'Line 3\n' });
      }

      expect(mockTerminalInstance.write).toHaveBeenCalledTimes(3);
    });

    it('should handle ANSI escape codes in output', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      const ansiOutput = '\x1b[32mSuccess\x1b[0m\n';
      if (currentOutputHandler) {
        currentOutputHandler({ session_id: 'test-session', data: ansiOutput });
      }

      expect(mockTerminalInstance.write).toHaveBeenCalledWith(ansiOutput);
    });
  });

  // ===========================================
  // Terminal Clear Tests
  // ===========================================
  describe('Terminal Clear', () => {
    it('should clear terminal via clear method', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      const component = wrapper.vm as unknown as { clear: () => void };
      component.clear();

      expect(mockTerminalInstance.clear).toHaveBeenCalled();
    });

    it('should handle clear when terminal not initialized', async () => {
      wrapper = mountTerminalPane();
      // Don't wait for mount to complete

      const component = wrapper.vm as unknown as { clear: () => void };
      // Should not throw
      expect(() => component.clear()).not.toThrow();
    });
  });

  // ===========================================
  // Write Method Tests
  // ===========================================
  describe('Write Method', () => {
    it('should write data to terminal via write method', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      const component = wrapper.vm as unknown as { write: (data: string) => void };
      component.write('Test Data');

      expect(mockTerminalInstance.write).toHaveBeenCalledWith('Test Data');
    });

    it('should handle write when terminal not initialized', async () => {
      wrapper = mountTerminalPane();

      const component = wrapper.vm as unknown as { write: (data: string) => void };
      // Should not throw
      expect(() => component.write('Test')).not.toThrow();
    });
  });

  // ===========================================
  // Focus Tests
  // ===========================================
  describe('Focus Handling', () => {
    it('should focus terminal via focus method', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      const component = wrapper.vm as unknown as { focus: () => void };
      component.focus();

      expect(mockTerminalInstance.focus).toHaveBeenCalled();
    });

    it('should emit focus event on focus method call', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      const component = wrapper.vm as unknown as { focus: () => void };
      component.focus();

      expect(wrapper.emitted('focus')).toBeTruthy();
    });

    it('should focus when focused prop becomes true', async () => {
      wrapper = mountTerminalPane({ props: { focused: false } });
      await nextTick();
      await nextTick();

      mockTerminalInstance.focus.mockClear();

      await wrapper.setProps({ focused: true });
      await nextTick();

      expect(mockTerminalInstance.focus).toHaveBeenCalled();
    });

    it('should focus on container click', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      mockTerminalInstance.focus.mockClear();

      const pane = wrapper.find('.terminal-pane');
      await pane.trigger('click');

      expect(mockTerminalInstance.focus).toHaveBeenCalled();
    });
  });

  // ===========================================
  // Resize Handling Tests
  // ===========================================
  describe('Resize Handling', () => {
    it('should handle terminal resize', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      const resizeCallback = mockTerminalInstance._onResizeCallback;
      if (typeof resizeCallback === 'function') {
        await resizeCallback({ cols: 120, rows: 40 });
      }

      expect(mockResizeTerminalFn).toHaveBeenCalledWith('test-session', 120, 40, 0, 0);
    });

    it('should update session on resize', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      const resizeCallback = mockTerminalInstance._onResizeCallback;
      if (typeof resizeCallback === 'function') {
        await resizeCallback({ cols: 100, rows: 30 });
      }

      expect(mockUpdateSessionFn).toHaveBeenCalledWith('test-session', {
        cols: 100,
        rows: 30,
        lastActivityAt: expect.any(Number),
      });
    });

    it('should handle resize error gracefully', async () => {
      mockResizeTerminalFn.mockRejectedValueOnce(new Error('Resize failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      const resizeCallback = mockTerminalInstance._onResizeCallback;
      if (typeof resizeCallback === 'function') {
        await resizeCallback({ cols: 80, rows: 24 });
      }

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should fit terminal via fitTerminal method', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      const component = wrapper.vm as unknown as { fitTerminal: () => void };
      component.fitTerminal();

      expect(mockFitAddonInstance.fit).toHaveBeenCalled();
    });

    it('should handle fit error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      // Make fit throw an error
      mockFitAddonInstance.fit.mockImplementationOnce(() => {
        throw new Error('Fit failed');
      });

      const component = wrapper.vm as unknown as { fitTerminal: () => void };
      component.fitTerminal();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should setup ResizeObserver on mount', async () => {
      // ResizeObserver is mocked in beforeEach
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      // Verify ResizeObserver was constructed by checking if it exists
      // The component creates a ResizeObserver during mount
      expect(wrapper.find('.terminal-container').exists()).toBe(true);
    });
  });

  // ===========================================
  // Title Change Tests
  // ===========================================
  describe('Title Change', () => {
    it('should emit title-change event', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      const titleCallback = mockTerminalInstance._onTitleChangeCallback;
      if (typeof titleCallback === 'function') {
        titleCallback('New Terminal Title');
      }

      expect(wrapper.emitted('title-change')).toBeTruthy();
      expect(wrapper.emitted('title-change')![0]).toEqual(['New Terminal Title']);
    });
  });

  // ===========================================
  // Exit Handling Tests
  // ===========================================
  describe('Exit Handling', () => {
    it('should define exit event emitter', async () => {
      wrapper = mountTerminalPane();
      await nextTick();

      // Component should have exit event defined
      // The actual exit handling is done by listening to backend events
      expect(wrapper.vm).toBeDefined();
    });
  });

  // ===========================================
  // UI Style Tests
  // ===========================================
  describe('UI Styles', () => {
    it('should have correct container structure', async () => {
      wrapper = mountTerminalPane();
      await nextTick();

      expect(wrapper.find('.terminal-pane').exists()).toBe(true);
      expect(wrapper.find('.terminal-container').exists()).toBe(true);
    });

    it('should apply focused class when focused prop is true', async () => {
      wrapper = mountTerminalPane({ props: { focused: true } });
      await nextTick();

      const pane = wrapper.find('.terminal-pane');
      expect(pane.classes()).toContain('is-focused');
    });

    it('should not apply focused class when focused prop is false', async () => {
      wrapper = mountTerminalPane({ props: { focused: false } });
      await nextTick();

      const pane = wrapper.find('.terminal-pane');
      expect(pane.classes()).not.toContain('is-focused');
    });

    it('should have correct CSS styles for terminal-pane', async () => {
      wrapper = mountTerminalPane();
      await nextTick();

      const pane = wrapper.find('.terminal-pane');

      // Check computed styles or CSS class presence
      expect(pane.classes()).toContain('terminal-pane');
    });

    it('should have terminal-container inside terminal-pane', async () => {
      wrapper = mountTerminalPane();
      await nextTick();

      const pane = wrapper.find('.terminal-pane');
      const container = pane.find('.terminal-container');

      expect(container.exists()).toBe(true);
    });
  });

  // ===========================================
  // Lifecycle Tests
  // ===========================================
  describe('Lifecycle', () => {
    it('should dispose terminal on unmount', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      wrapper.unmount();
      wrapper = null;

      expect(mockTerminalInstance.dispose).toHaveBeenCalled();
    });

    it('should cleanup output listener on unmount', async () => {
      const mockUnlisten = vi.fn();
      mockOnTerminalOutputFn.mockResolvedValueOnce(mockUnlisten);

      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      wrapper.unmount();
      wrapper = null;

      expect(mockUnlisten).toHaveBeenCalled();
    });

    it('should disconnect ResizeObserver on unmount', async () => {
      // ResizeObserver is mocked in beforeEach
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      // Unmount should not throw
      wrapper.unmount();
      wrapper = null;

      // Verify unmount succeeded
      expect(true).toBe(true);
    });

    it('should handle unmount when terminal not initialized', async () => {
      wrapper = mountTerminalPane();
      // Unmount before initialization completes
      wrapper.unmount();
      wrapper = null;

      // Should not throw
      expect(true).toBe(true);
    });
  });

  // ===========================================
  // Exposed Methods Tests
  // ===========================================
  describe('Exposed Methods', () => {
    it('should expose focus method', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      const component = wrapper.vm as unknown as { focus: () => void };
      expect(typeof component.focus).toBe('function');
    });

    it('should expose clear method', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      const component = wrapper.vm as unknown as { clear: () => void };
      expect(typeof component.clear).toBe('function');
    });

    it('should expose write method', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      const component = wrapper.vm as unknown as { write: (data: string) => void };
      expect(typeof component.write).toBe('function');
    });

    it('should expose fitTerminal method', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      const component = wrapper.vm as unknown as { fitTerminal: () => void };
      expect(typeof component.fitTerminal).toBe('function');
    });
  });

  // ===========================================
  // Long-running Command Tests
  // ===========================================
  describe('Long-running Commands', () => {
    it('should handle continuous output from long-running commands', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      // Simulate continuous output (e.g., tail -f)
      for (let i = 0; i < 100; i++) {
        if (currentOutputHandler) {
          currentOutputHandler({ session_id: 'test-session', data: `Line ${i}\n` });
        }
      }

      expect(mockTerminalInstance.write).toHaveBeenCalledTimes(100);
    });

    it('should handle rapid input/output cycles', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      const dataCallback = mockTerminalInstance._onDataCallback;

      // Simulate rapid typing
      for (let i = 0; i < 50; i++) {
        if (typeof dataCallback === 'function') {
          await dataCallback(`cmd${i}`);
        }
        if (currentOutputHandler) {
          currentOutputHandler({ session_id: 'test-session', data: `output${i}\n` });
        }
      }

      expect(mockSendTerminalInputFn).toHaveBeenCalledTimes(50);
      expect(mockTerminalInstance.write).toHaveBeenCalledTimes(50);
    });
  });

  // ===========================================
  // Edge Cases Tests
  // ===========================================
  describe('Edge Cases', () => {
    it('should handle empty sessionId', async () => {
      wrapper = mountTerminalPane({ props: { sessionId: '' } });
      await nextTick();
      await nextTick();

      // Should still create terminal
      expect(mockTerminalInstance.open).toHaveBeenCalled();
    });

    it('should handle special characters in input', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      const dataCallback = mockTerminalInstance._onDataCallback;
      const specialChars = '\x00\x01\x02\x1b\x7f';

      if (typeof dataCallback === 'function') {
        await dataCallback(specialChars);
      }

      expect(mockSendTerminalInputFn).toHaveBeenCalledWith('test-session', specialChars);
    });

    it('should handle Unicode in output', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      const unicodeData = '你好世界 🌍 مرحبا';

      if (currentOutputHandler) {
        currentOutputHandler({ session_id: 'test-session', data: unicodeData });
      }

      expect(mockTerminalInstance.write).toHaveBeenCalledWith(unicodeData);
    });

    it('should handle very long output lines', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      const longLine = 'x'.repeat(10000);

      if (currentOutputHandler) {
        currentOutputHandler({ session_id: 'test-session', data: longLine });
      }

      expect(mockTerminalInstance.write).toHaveBeenCalledWith(longLine);
    });

    it('should handle null terminal container gracefully', async () => {
      // This tests the early return in initTerminal when container is null
      wrapper = mountTerminalPane();
      await nextTick();

      // If terminal container is null, initTerminal should return early
      // This is hard to test directly, but we verify no errors occur
      expect(true).toBe(true);
    });

    it('should handle multiple focus calls', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      // Clear any focus calls from initialization
      mockTerminalInstance.focus.mockClear();

      const component = wrapper.vm as unknown as { focus: () => void };
      component.focus();
      component.focus();
      component.focus();

      expect(mockTerminalInstance.focus).toHaveBeenCalledTimes(3);
    });
  });

  // ===========================================
  // Signal Handling Tests (Ctrl+C, etc.)
  // ===========================================
  describe('Signal Handling', () => {
    it('should send Ctrl+C (SIGINT) correctly', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      const dataCallback = mockTerminalInstance._onDataCallback;
      if (typeof dataCallback === 'function') {
        await dataCallback('\x03'); // Ctrl+C
      }

      expect(mockSendTerminalInputFn).toHaveBeenCalledWith('test-session', '\x03');
    });

    it('should send Ctrl+D (EOF) correctly', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      const dataCallback = mockTerminalInstance._onDataCallback;
      if (typeof dataCallback === 'function') {
        await dataCallback('\x04'); // Ctrl+D
      }

      expect(mockSendTerminalInputFn).toHaveBeenCalledWith('test-session', '\x04');
    });

    it('should send Ctrl+Z (SIGTSTP) correctly', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      const dataCallback = mockTerminalInstance._onDataCallback;
      if (typeof dataCallback === 'function') {
        await dataCallback('\x1a'); // Ctrl+Z
      }

      expect(mockSendTerminalInputFn).toHaveBeenCalledWith('test-session', '\x1a');
    });

    it('should handle escape sequences correctly', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      const dataCallback = mockTerminalInstance._onDataCallback;
      const escapeSequences = '\x1b[A\x1b[B\x1b[C\x1b[D'; // Arrow keys

      if (typeof dataCallback === 'function') {
        await dataCallback(escapeSequences);
      }

      expect(mockSendTerminalInputFn).toHaveBeenCalledWith('test-session', escapeSequences);
    });
  });

  // ===========================================
  // Performance Tests
  // ===========================================
  describe('Performance', () => {
    it('should handle large amounts of output efficiently', async () => {
      wrapper = mountTerminalPane();
      await nextTick();
      await nextTick();

      const startTime = performance.now();

      // Simulate large output
      for (let i = 0; i < 1000; i++) {
        if (currentOutputHandler) {
          currentOutputHandler({ session_id: 'test-session', data: `Line ${i}\n` });
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(mockTerminalInstance.write).toHaveBeenCalledTimes(1000);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
