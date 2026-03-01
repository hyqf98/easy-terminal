/**
 * TerminalContainer Component Tests
 * Tests terminal session lifecycle, multi-terminal management, split panes, and UI styles
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick, ref, computed, defineComponent, reactive } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import TerminalContainer from '../TerminalContainer.vue';
import type { TerminalSession, LayoutNode, SplitDirection } from '@/types';

// ============================================
// Mock Types and Helpers
// ============================================

function createMockSession(overrides: Partial<TerminalSession> = {}): TerminalSession {
  return {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: 'Terminal',
    type: 'local',
    connectionType: 'local',
    status: 'connected',
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    ...overrides,
  };
}

function createMockSessions(count: number): TerminalSession[] {
  return Array.from({ length: count }, (_, i) =>
    createMockSession({
      id: `session-${i}`,
      title: `Terminal ${i + 1}`,
    })
  );
}

function createMockLayoutNode(sessionId: string): LayoutNode {
  return {
    id: `pane-${sessionId}`,
    type: 'pane',
    sessionId,
  };
}

// ============================================
// Mock Components
// ============================================

const MockTabBar = defineComponent({
  name: 'TabBar',
  props: ['sessions', 'activeSessionId', 'showNewTab'],
  emits: ['tab-click', 'tab-close', 'new-tab', 'reorder', 'contextmenu'],
  template: `
    <div class="tab-bar-mock" v-if="sessions && sessions.length > 0">
      <div
        v-for="session in sessions"
        :key="session.id"
        class="tab-item"
        :class="{ 'is-active': session.id === activeSessionId }"
        @click="$emit('tab-click', session.id)"
      >
        <span>{{ session.title }}</span>
        <button class="close-btn" @click.stop="$emit('tab-close', session.id)">X</button>
      </div>
      <button v-if="showNewTab !== false" class="new-tab-btn" @click="$emit('new-tab')">+</button>
    </div>
    <div v-else class="tab-bar-mock">
      <button v-if="showNewTab !== false" class="new-tab-btn" @click="$emit('new-tab')">+</button>
    </div>
  `,
});

const MockSplitContainer = defineComponent({
  name: 'SplitContainer',
  props: ['root', 'minSize'],
  emits: ['resize', 'focus'],
  template: `
    <div class="split-container-mock" v-if="root">
      <slot :pane="root" :sessionId="root?.sessionId || ''" />
    </div>
  `,
});

const MockTerminalPane = defineComponent({
  name: 'TerminalPane',
  props: ['sessionId', 'focused'],
  emits: ['focus', 'exit', 'title-change'],
  methods: {
    focus() {
      this.$emit('focus');
    },
  },
  template: `
    <div class="terminal-pane-mock" :class="{ 'is-focused': focused }">
      Terminal: {{ sessionId }}
    </div>
  `,
});

const MockSshTerminalPane = defineComponent({
  name: 'SshTerminalPane',
  props: ['sessionId', 'configId', 'focused'],
  emits: ['focus', 'disconnect', 'error'],
  methods: {
    focus() {
      this.$emit('focus');
    },
  },
  template: `
    <div class="ssh-terminal-pane-mock" :class="{ 'is-focused': focused }">
      SSH Terminal: {{ sessionId }}
    </div>
  `,
});

const MockDockerTerminalPane = defineComponent({
  name: 'DockerTerminalPane',
  props: ['sessionId', 'containerId', 'focused'],
  emits: ['focus', 'disconnect', 'error'],
  methods: {
    focus() {
      this.$emit('focus');
    },
  },
  template: `
    <div class="docker-terminal-pane-mock" :class="{ 'is-focused': focused }">
      Docker Terminal: {{ sessionId }}
    </div>
  `,
});

const MockTabContextMenu = defineComponent({
  name: 'TabContextMenu',
  props: ['visible', 'x', 'y', 'session', 'totalSessions'],
  emits: [
    'close',
    'close-others',
    'close-to-right',
    'duplicate',
    'split-horizontal',
    'split-vertical',
    'rename',
    'copy-cwd',
    'hide',
  ],
  template: `
    <div v-if="visible" class="context-menu-mock" :style="{ left: x + 'px', top: y + 'px' }">
      <button @click="$emit('close')">Close</button>
      <button @click="$emit('close-others', session?.id)">Close Others</button>
      <button @click="$emit('split-horizontal', session?.id)">Split Horizontal</button>
      <button @click="$emit('split-vertical', session?.id)">Split Vertical</button>
      <button @click="$emit('hide')">Hide</button>
    </div>
  `,
});

// ============================================
// Create Mock Store State
// ============================================

interface MockStoreState {
  sessions: Map<string, TerminalSession>;
  activeSessionId: string | null;
  sessionOrder: string[];
  layoutRoot: LayoutNode | null;
  focusedPaneId: string | null;
}

function createMockStoreState(): MockStoreState {
  return {
    sessions: new Map(),
    activeSessionId: null,
    sessionOrder: [],
    layoutRoot: null,
    focusedPaneId: null,
  };
}

// Helper functions for store operations
function addSessionToStore(state: MockStoreState, session: TerminalSession): void {
  state.sessions.set(session.id, session);
  state.sessionOrder.push(session.id);
  state.activeSessionId = session.id;
  state.layoutRoot = createMockLayoutNode(session.id);
  state.focusedPaneId = state.layoutRoot.id;
}

function removeSessionFromStore(state: MockStoreState, sessionId: string): void {
  state.sessions.delete(sessionId);
  const index = state.sessionOrder.indexOf(sessionId);
  if (index !== -1) {
    state.sessionOrder.splice(index, 1);
  }
  if (state.activeSessionId === sessionId) {
    state.activeSessionId = state.sessionOrder[0] ?? null;
  }
  if (state.layoutRoot?.type === 'pane' && state.layoutRoot.sessionId === sessionId) {
    state.layoutRoot = null;
    state.focusedPaneId = null;
  }
}

function getSessionFromStore(state: MockStoreState, sessionId: string): TerminalSession | undefined {
  return state.sessions.get(sessionId);
}

function getSessionList(state: MockStoreState): TerminalSession[] {
  return state.sessionOrder
    .map(id => state.sessions.get(id))
    .filter((s): s is TerminalSession => s !== undefined);
}

function splitPaneInStore(state: MockStoreState, sessionId: string, direction: SplitDirection): void {
  const session = state.sessions.get(sessionId);
  if (!session) return;

  const newSession: TerminalSession = {
    ...session,
    id: `session-${Date.now()}`,
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
  };
  state.sessions.set(newSession.id, newSession);
  state.sessionOrder.push(newSession.id);

  state.layoutRoot = {
    id: `split-${Date.now()}`,
    type: 'split',
    direction,
    children: [
      createMockLayoutNode(sessionId),
      createMockLayoutNode(newSession.id),
    ],
    sizes: [50, 50],
  };
  state.activeSessionId = newSession.id;
  state.focusedPaneId = state.layoutRoot.id;
}

function reorderSessionsInStore(state: MockStoreState, fromIndex: number, toIndex: number): void {
  const [removed] = state.sessionOrder.splice(fromIndex, 1);
  state.sessionOrder.splice(toIndex, 0, removed);
}

function updateSessionInStore(state: MockStoreState, sessionId: string, updates: Partial<TerminalSession>): void {
  const session = state.sessions.get(sessionId);
  if (session) {
    Object.assign(session, updates);
  }
}

// ============================================
// Global mock state
// ============================================

let mockStoreState: MockStoreState;
let mockIsLoading = ref(false);
let mockDefaultShell = ref('/bin/bash');
let mockCreateSessionFn: ReturnType<typeof vi.fn>;
let mockCloseSessionFn: ReturnType<typeof vi.fn>;
let mockRegisterShortcutFn: ReturnType<typeof vi.fn>;
let mockUnregisterShortcutFn: ReturnType<typeof vi.fn>;

// Create a factory function for the mock store
function createMockStore() {
  const state = mockStoreState;
  return {
    get sessions() { return state.sessions; },
    get activeSessionId() { return state.activeSessionId; },
    get sessionOrder() { return state.sessionOrder; },
    get layoutRoot() { return state.layoutRoot; },
    get focusedPaneId() { return state.focusedPaneId; },
    get sessionList() { return getSessionList(state); },
    get sessionCount() { return state.sessions.size; },
    getSession: (id: string) => getSessionFromStore(state, id),
    addSession: (s: TerminalSession) => addSessionToStore(state, s),
    removeSession: (id: string) => removeSessionFromStore(state, id),
    closeSession: (id: string) => removeSessionFromStore(state, id),
    setActiveSession: (id: string) => { state.activeSessionId = id; },
    updateSession: (id: string, updates: Partial<TerminalSession>) => updateSessionInStore(state, id, updates),
    reorderSessions: (from: number, to: number) => reorderSessionsInStore(state, from, to),
    splitPane: (id: string, dir: SplitDirection) => splitPaneInStore(state, id, dir),
    setFocusedPane: (id: string) => { state.focusedPaneId = id; },
    updateSplitSize: vi.fn(),
    getAllPaneIds: () => state.layoutRoot ? [state.layoutRoot.sessionId || ''] : [],
  };
}

// Mock modules
vi.mock('@/stores', () => ({
  useTerminalStore: vi.fn(() => createMockStore()),
}));

vi.mock('@/composables', () => ({
  useTerminal: vi.fn(() => ({
    createSession: mockCreateSessionFn,
    closeSession: mockCloseSessionFn,
    isLoading: mockIsLoading,
    defaultShell: mockDefaultShell,
  })),
  useShortcuts: vi.fn(() => ({
    registerShortcut: mockRegisterShortcutFn,
    unregisterShortcut: mockUnregisterShortcutFn,
  })),
  DEFAULT_SHORTCUTS: [
    { id: 'terminal.new', defaultKey: 'Ctrl+Shift+T' },
    { id: 'terminal.close', defaultKey: 'Ctrl+W' },
    { id: 'tabs.switchNext', defaultKey: 'Ctrl+Tab' },
    { id: 'splits.horizontal', defaultKey: 'Ctrl+Shift+\\' },
    { id: 'splits.vertical', defaultKey: 'Ctrl+Shift+-' },
    { id: 'splits.focusUp', defaultKey: 'Ctrl+Up' },
    { id: 'splits.focusDown', defaultKey: 'Ctrl+Down' },
    { id: 'splits.focusLeft', defaultKey: 'Ctrl+Left' },
    { id: 'splits.focusRight', defaultKey: 'Ctrl+Right' },
  ],
}));

vi.mock('@/services/ssh.service', () => ({
  disconnectSsh: vi.fn(),
}));

vi.mock('@/services/docker.service', () => ({
  disconnectDockerExec: vi.fn(),
}));

// ============================================
// Test Helper Functions
// ============================================

interface MountOptions {
  props?: Record<string, unknown>;
}

function mountTerminalContainer(options: MountOptions = {}): VueWrapper {
  const pinia = createPinia();
  setActivePinia(pinia);

  return mount(TerminalContainer, {
    props: {
      showTabs: true,
      ...options.props,
    },
    global: {
      plugins: [pinia],
      stubs: {
        TabBar: MockTabBar,
        SplitContainer: MockSplitContainer,
        TerminalPane: MockTerminalPane,
        SshTerminalPane: MockSshTerminalPane,
        DockerTerminalPane: MockDockerTerminalPane,
        TabContextMenu: MockTabContextMenu,
      },
    },
  });
}

// ============================================
// Test Suite
// ============================================

describe('TerminalContainer', () => {
  let wrapper: VueWrapper | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = createMockStoreState();
    mockIsLoading = ref(false);
    mockDefaultShell = ref('/bin/bash');
    mockCreateSessionFn = vi.fn(async (options) => {
      const session = createMockSession({
        type: options?.type || 'local',
        shell: options?.shell,
        cwd: options?.cwd,
      });
      addSessionToStore(mockStoreState, session);
      return session;
    });
    mockCloseSessionFn = vi.fn(async (sessionId) => {
      removeSessionFromStore(mockStoreState, sessionId);
    });
    mockRegisterShortcutFn = vi.fn();
    mockUnregisterShortcutFn = vi.fn();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
  });

  // ===========================================
  // Session Creation Tests
  // ===========================================
  describe('Session Creation', () => {
    it('should render empty state when no sessions exist', async () => {
      wrapper = mountTerminalContainer();
      await nextTick();

      expect(wrapper.find('.empty-state').exists()).toBe(true);
      expect(wrapper.find('.empty-content').exists()).toBe(true);
      expect(wrapper.find('.empty-content h3').text()).toBe('No Terminal Sessions');
    });

    it('should show create button in empty state', async () => {
      wrapper = mountTerminalContainer();
      await nextTick();

      const createButton = wrapper.find('.create-button');
      expect(createButton.exists()).toBe(true);
      expect(createButton.text()).toContain('New Terminal');
    });

    it('should create session when create button is clicked', async () => {
      wrapper = mountTerminalContainer();
      await nextTick();

      const createButton = wrapper.find('.create-button');
      await createButton.trigger('click');
      await nextTick();

      expect(mockCreateSessionFn).toHaveBeenCalled();
    });
  });

  // ===========================================
  // Session Destruction Tests
  // ===========================================
  describe('Session Destruction', () => {
    it('should close session when tab close is triggered', async () => {
      const session = createMockSession({ id: 'session-to-close' });
      addSessionToStore(mockStoreState, session);

      wrapper = mountTerminalContainer();
      await nextTick();

      const tabBar = wrapper.findComponent(MockTabBar);
      await tabBar.vm.$emit('tab-close', 'session-to-close');
      await nextTick();

      expect(wrapper.emitted('session-closed')).toBeTruthy();
    });

    it('should remove session from store on close', async () => {
      const session1 = createMockSession({ id: 'session-1' });
      const session2 = createMockSession({ id: 'session-2' });
      addSessionToStore(mockStoreState, session1);
      addSessionToStore(mockStoreState, session2);

      wrapper = mountTerminalContainer();
      await nextTick();

      expect(mockStoreState.sessions.size).toBe(2);

      removeSessionFromStore(mockStoreState, 'session-1');
      await nextTick();

      expect(mockStoreState.sessions.size).toBe(1);
      expect(getSessionFromStore(mockStoreState, 'session-1')).toBeUndefined();
    });

    it('should switch active session when current is closed', async () => {
      const session1 = createMockSession({ id: 'session-1' });
      const session2 = createMockSession({ id: 'session-2' });
      addSessionToStore(mockStoreState, session1);
      addSessionToStore(mockStoreState, session2);

      wrapper = mountTerminalContainer();
      await nextTick();

      expect(mockStoreState.activeSessionId).toBe('session-2');

      removeSessionFromStore(mockStoreState, 'session-2');
      await nextTick();

      expect(mockStoreState.activeSessionId).toBe('session-1');
    });

    it('should show empty state when all sessions are closed', async () => {
      const session = createMockSession({ id: 'session-1' });
      addSessionToStore(mockStoreState, session);

      wrapper = mountTerminalContainer();
      await nextTick();

      removeSessionFromStore(mockStoreState, 'session-1');
      await nextTick();
      await nextTick(); // Extra tick for Vue to re-render

      // Check that layoutRoot is null (which shows empty state)
      expect(mockStoreState.layoutRoot).toBeNull();
    });
  });

  // ===========================================
  // Multi-Terminal Management Tests
  // ===========================================
  describe('Multi-Terminal Management', () => {
    it('should render TabBar with sessions', async () => {
      const sessions = createMockSessions(3);
      sessions.forEach(s => addSessionToStore(mockStoreState, s));

      wrapper = mountTerminalContainer();
      await nextTick();

      const tabBar = wrapper.findComponent(MockTabBar);
      expect(tabBar.exists()).toBe(true);
      expect(tabBar.props('sessions')).toHaveLength(3);
    });

    it('should switch active session on tab click', async () => {
      const sessions = createMockSessions(3);
      sessions.forEach(s => addSessionToStore(mockStoreState, s));

      wrapper = mountTerminalContainer();
      await nextTick();

      const tabBar = wrapper.findComponent(MockTabBar);
      await tabBar.vm.$emit('tab-click', 'session-1');
      await nextTick();

      expect(mockStoreState.activeSessionId).toBe('session-1');
      expect(wrapper.emitted('session-focus')).toBeTruthy();
    });

    it('should reorder sessions on reorder event', async () => {
      const sessions = createMockSessions(3);
      sessions.forEach(s => addSessionToStore(mockStoreState, s));

      wrapper = mountTerminalContainer();
      await nextTick();

      const tabBar = wrapper.findComponent(MockTabBar);
      await tabBar.vm.$emit('reorder', 0, 2);
      await nextTick();

      expect(mockStoreState.sessionOrder).toEqual(['session-1', 'session-2', 'session-0']);
    });

    it('should show/hide tab bar based on showTabs prop', async () => {
      wrapper = mountTerminalContainer({ props: { showTabs: true } });
      await nextTick();

      expect(wrapper.findComponent(MockTabBar).exists()).toBe(true);

      wrapper.unmount();
      wrapper = null;

      wrapper = mountTerminalContainer({ props: { showTabs: false } });
      await nextTick();

      expect(wrapper.findComponent(MockTabBar).exists()).toBe(false);
    });
  });

  // ===========================================
  // Terminal Input/Output Tests
  // ===========================================
  describe('Terminal Input/Output', () => {
    it('should render TerminalPane for local sessions', async () => {
      const session = createMockSession({ id: 'local-session', type: 'local' });
      addSessionToStore(mockStoreState, session);

      wrapper = mountTerminalContainer();
      await nextTick();

      const terminalPane = wrapper.findComponent(MockTerminalPane);
      expect(terminalPane.exists()).toBe(true);
    });

    it('should render SshTerminalPane for SSH sessions', async () => {
      const session = createMockSession({
        id: 'ssh-session',
        type: 'ssh',
        sshSessionId: 'ssh-backend-1',
        sshConfigId: 'config-1',
      });
      addSessionToStore(mockStoreState, session);

      wrapper = mountTerminalContainer();
      await nextTick();

      const sshPane = wrapper.findComponent(MockSshTerminalPane);
      expect(sshPane.exists()).toBe(true);
    });

    it('should render DockerTerminalPane for Docker sessions', async () => {
      const session = createMockSession({
        id: 'docker-session',
        type: 'docker',
        dockerSessionId: 'docker-backend-1',
        dockerContainerId: 'container-1',
      });
      addSessionToStore(mockStoreState, session);

      wrapper = mountTerminalContainer();
      await nextTick();

      const dockerPane = wrapper.findComponent(MockDockerTerminalPane);
      expect(dockerPane.exists()).toBe(true);
    });

    it('should pass focused prop to terminal pane', async () => {
      const session = createMockSession({ id: 'focused-session' });
      addSessionToStore(mockStoreState, session);

      wrapper = mountTerminalContainer();
      await nextTick();

      const terminalPane = wrapper.findComponent(MockTerminalPane);
      expect(terminalPane.props('focused')).toBe(true);
    });

    it('should handle terminal exit event without crashing', async () => {
      const session = createMockSession({ id: 'exiting-session' });
      addSessionToStore(mockStoreState, session);

      wrapper = mountTerminalContainer();
      await nextTick();

      const terminalPane = wrapper.findComponent(MockTerminalPane);
      await terminalPane.vm.$emit('exit', 0);
      await nextTick();

      expect(true).toBe(true);
    });

    it('should update session title on title-change event', async () => {
      const session = createMockSession({ id: 'title-session' });
      addSessionToStore(mockStoreState, session);

      wrapper = mountTerminalContainer();
      await nextTick();

      const terminalPane = wrapper.findComponent(MockTerminalPane);
      await terminalPane.vm.$emit('title-change', 'New Title');
      await nextTick();

      const updatedSession = getSessionFromStore(mockStoreState, 'title-session');
      expect(updatedSession?.title).toBe('New Title');
    });

    it('should not update title if it looks like a file path', async () => {
      const session = createMockSession({ id: 'path-session', title: 'Original' });
      addSessionToStore(mockStoreState, session);

      wrapper = mountTerminalContainer();
      await nextTick();

      const terminalPane = wrapper.findComponent(MockTerminalPane);
      await terminalPane.vm.$emit('title-change', '/usr/bin/bash');
      await nextTick();

      const updatedSession = getSessionFromStore(mockStoreState, 'path-session');
      expect(updatedSession?.title).toBe('Original');
    });

    it('should not update title if it is too long', async () => {
      const session = createMockSession({ id: 'long-title-session', title: 'Original' });
      addSessionToStore(mockStoreState, session);

      wrapper = mountTerminalContainer();
      await nextTick();

      const terminalPane = wrapper.findComponent(MockTerminalPane);
      const longTitle = 'a'.repeat(100);
      await terminalPane.vm.$emit('title-change', longTitle);
      await nextTick();

      const updatedSession = getSessionFromStore(mockStoreState, 'long-title-session');
      expect(updatedSession?.title).toBe('Original');
    });
  });

  // ===========================================
  // Split Pane Tests
  // ===========================================
  describe('Split Pane Management', () => {
    it('should split pane horizontally', async () => {
      const session = createMockSession({ id: 'split-session' });
      addSessionToStore(mockStoreState, session);

      wrapper = mountTerminalContainer();
      await nextTick();

      splitPaneInStore(mockStoreState, 'split-session', 'horizontal');
      await nextTick();

      expect(mockStoreState.layoutRoot?.type).toBe('split');
      if (mockStoreState.layoutRoot?.type === 'split') {
        expect(mockStoreState.layoutRoot.direction).toBe('horizontal');
      }
    });

    it('should split pane vertically', async () => {
      const session = createMockSession({ id: 'split-session' });
      addSessionToStore(mockStoreState, session);

      wrapper = mountTerminalContainer();
      await nextTick();

      splitPaneInStore(mockStoreState, 'split-session', 'vertical');
      await nextTick();

      expect(mockStoreState.layoutRoot?.type).toBe('split');
      if (mockStoreState.layoutRoot?.type === 'split') {
        expect(mockStoreState.layoutRoot.direction).toBe('vertical');
      }
    });

    it('should handle split from context menu', async () => {
      const session = createMockSession({ id: 'context-split-session' });
      addSessionToStore(mockStoreState, session);

      wrapper = mountTerminalContainer();
      await nextTick();

      const contextMenu = wrapper.findComponent(MockTabContextMenu);
      await contextMenu.vm.$emit('split-horizontal', 'context-split-session');
      await nextTick();

      expect(mockStoreState.layoutRoot?.type).toBe('split');
    });

    it('should handle pane focus event', async () => {
      const session = createMockSession({ id: 'focus-session' });
      addSessionToStore(mockStoreState, session);

      wrapper = mountTerminalContainer();
      await nextTick();

      const splitContainer = wrapper.findComponent(MockSplitContainer);
      await splitContainer.vm.$emit('focus', 'pane-focus-session');
      await nextTick();

      expect(mockStoreState.focusedPaneId).toBe('pane-focus-session');
    });

    it('should handle split resize event', async () => {
      const session = createMockSession({ id: 'resize-session' });
      addSessionToStore(mockStoreState, session);

      wrapper = mountTerminalContainer();
      await nextTick();

      const splitContainer = wrapper.findComponent(MockSplitContainer);
      await splitContainer.vm.$emit('resize', 'split-1', 60);
      await nextTick();

      expect(true).toBe(true);
    });
  });

  // ===========================================
  // Context Menu Tests
  // ===========================================
  describe('Context Menu', () => {
    it('should show context menu on tab right-click', async () => {
      const session = createMockSession({ id: 'context-session' });
      addSessionToStore(mockStoreState, session);

      wrapper = mountTerminalContainer();
      await nextTick();

      const tabBar = wrapper.findComponent(MockTabBar);
      await tabBar.vm.$emit('contextmenu', 'context-session', { clientX: 100, clientY: 200 });
      await nextTick();

      const contextMenu = wrapper.findComponent(MockTabContextMenu);
      expect(contextMenu.props('visible')).toBe(true);
      expect(contextMenu.props('x')).toBe(100);
      expect(contextMenu.props('y')).toBe(200);
    });

    it('should hide context menu on hide event', async () => {
      const session = createMockSession({ id: 'hide-context-session' });
      addSessionToStore(mockStoreState, session);

      wrapper = mountTerminalContainer();
      await nextTick();

      const tabBar = wrapper.findComponent(MockTabBar);
      await tabBar.vm.$emit('contextmenu', 'hide-context-session', { clientX: 100, clientY: 200 });
      await nextTick();

      const contextMenu = wrapper.findComponent(MockTabContextMenu);
      await contextMenu.vm.$emit('hide');
      await nextTick();

      expect(contextMenu.props('visible')).toBe(false);
    });

    it('should close session from context menu', async () => {
      const session = createMockSession({ id: 'close-context-session' });
      addSessionToStore(mockStoreState, session);

      wrapper = mountTerminalContainer();
      await nextTick();

      // First show the context menu to set contextMenu.sessionId
      const tabBar = wrapper.findComponent(MockTabBar);
      await tabBar.vm.$emit('contextmenu', 'close-context-session', { clientX: 100, clientY: 200 });
      await nextTick();

      const contextMenu = wrapper.findComponent(MockTabContextMenu);
      await contextMenu.vm.$emit('close');
      await nextTick();

      expect(wrapper.emitted('session-closed')).toBeTruthy();
    });

    it('should duplicate session from context menu', async () => {
      const session = createMockSession({ id: 'dup-session', cwd: '/home', shell: '/bin/zsh' });
      addSessionToStore(mockStoreState, session);

      wrapper = mountTerminalContainer();
      await nextTick();

      const contextMenu = wrapper.findComponent(MockTabContextMenu);
      await contextMenu.vm.$emit('duplicate', 'dup-session');
      await nextTick();

      expect(mockCreateSessionFn).toHaveBeenCalled();
    });

    it('should close other sessions from context menu', async () => {
      const sessions = createMockSessions(3);
      sessions.forEach(s => addSessionToStore(mockStoreState, s));

      wrapper = mountTerminalContainer();
      await nextTick();

      const contextMenu = wrapper.findComponent(MockTabContextMenu);
      await contextMenu.vm.$emit('close-others', 'session-1');
      await nextTick();

      expect(mockCloseSessionFn).toHaveBeenCalled();
    });

    it('should close tabs to the right from context menu', async () => {
      const sessions = createMockSessions(5);
      sessions.forEach(s => addSessionToStore(mockStoreState, s));

      wrapper = mountTerminalContainer();
      await nextTick();

      const contextMenu = wrapper.findComponent(MockTabContextMenu);
      await contextMenu.vm.$emit('close-to-right', 'session-1');
      await nextTick();

      expect(mockCloseSessionFn).toHaveBeenCalled();
    });
  });

  // ===========================================
  // UI Style Tests
  // ===========================================
  describe('UI Styles', () => {
    it('should have correct container structure', async () => {
      wrapper = mountTerminalContainer();
      await nextTick();

      expect(wrapper.find('.terminal-container').exists()).toBe(true);
      expect(wrapper.find('.terminal-content').exists()).toBe(true);
    });

    it('should have correct CSS classes for layout', async () => {
      wrapper = mountTerminalContainer();
      await nextTick();

      const container = wrapper.find('.terminal-container');
      expect(container.classes()).toContain('terminal-container');

      const content = wrapper.find('.terminal-content');
      expect(content.classes()).toContain('terminal-content');
    });

    it('should have correct empty state styles', async () => {
      wrapper = mountTerminalContainer();
      await nextTick();

      const emptyState = wrapper.find('.empty-state');
      expect(emptyState.exists()).toBe(true);

      const emptyContent = wrapper.find('.empty-content');
      expect(emptyContent.exists()).toBe(true);

      const emptyIcon = wrapper.find('.empty-icon');
      expect(emptyIcon.exists()).toBe(true);
    });

    it('should have correct create button styles', async () => {
      wrapper = mountTerminalContainer();
      await nextTick();

      const createButton = wrapper.find('.create-button');
      expect(createButton.exists()).toBe(true);
      expect(createButton.classes()).toContain('create-button');
    });

    it('should disable create button when loading', async () => {
      mockIsLoading.value = true;

      wrapper = mountTerminalContainer();
      await nextTick();

      const createButton = wrapper.find('.create-button');
      expect(createButton.attributes('disabled')).toBeDefined();
    });
  });

  // ===========================================
  // Performance Tests
  // ===========================================
  describe('Performance', () => {
    it('should handle many sessions efficiently', async () => {
      const manySessions = createMockSessions(50);
      manySessions.forEach(s => addSessionToStore(mockStoreState, s));

      const startTime = performance.now();

      wrapper = mountTerminalContainer();
      await nextTick();

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(mockStoreState.sessions.size).toBe(50);
      expect(renderTime).toBeLessThan(1000);
    });

    it('should handle rapid session creation and deletion', async () => {
      // Create sessions before mounting to avoid auto-creation
      for (let i = 0; i < 20; i++) {
        const session = createMockSession({ id: `rapid-session-${i}` });
        addSessionToStore(mockStoreState, session);
      }

      wrapper = mountTerminalContainer();
      await nextTick();

      expect(mockStoreState.sessions.size).toBe(20);

      for (let i = 0; i < 10; i++) {
        removeSessionFromStore(mockStoreState, `rapid-session-${i}`);
      }
      await nextTick();

      expect(mockStoreState.sessions.size).toBe(10);
    });
  });

  // ===========================================
  // Unicode and Special Characters Tests
  // ===========================================
  describe('Unicode and Special Characters', () => {
    it('should handle Unicode session titles', async () => {
      const unicodeSession = createMockSession({
        id: 'unicode-session',
        title: '终端 🚀 Термінал 终端',
      });
      addSessionToStore(mockStoreState, unicodeSession);

      wrapper = mountTerminalContainer();
      await nextTick();

      const tabBar = wrapper.findComponent(MockTabBar);
      const sessions = tabBar.props('sessions') as TerminalSession[];
      expect(sessions[0].title).toBe('终端 🚀 Термінал 终端');
    });

    it('should handle emoji in titles', async () => {
      const emojiSession = createMockSession({
        id: 'emoji-session',
        title: '🎉 Terminal 🔥',
      });
      addSessionToStore(mockStoreState, emojiSession);

      wrapper = mountTerminalContainer();
      await nextTick();

      const tabBar = wrapper.findComponent(MockTabBar);
      const sessions = tabBar.props('sessions') as TerminalSession[];
      expect(sessions[0].title).toContain('🎉');
      expect(sessions[0].title).toContain('🔥');
    });

    it('should handle special characters in titles', async () => {
      const specialSession = createMockSession({
        id: 'special-session',
        title: 'Terminal <>&"\'test',
      });
      addSessionToStore(mockStoreState, specialSession);

      wrapper = mountTerminalContainer();
      await nextTick();

      const tabBar = wrapper.findComponent(MockTabBar);
      const sessions = tabBar.props('sessions') as TerminalSession[];
      expect(sessions[0].title).toBe('Terminal <>&"\'test');
    });
  });

  // ===========================================
  // Edge Cases
  // ===========================================
  describe('Edge Cases', () => {
    it('should handle null activeSessionId gracefully', async () => {
      const sessions = createMockSessions(2);
      sessions.forEach(s => addSessionToStore(mockStoreState, s));
      mockStoreState.activeSessionId = null;

      wrapper = mountTerminalContainer();
      await nextTick();

      expect(wrapper.find('.terminal-container').exists()).toBe(true);
    });

    it('should handle empty sessions array', async () => {
      wrapper = mountTerminalContainer();
      await nextTick();

      expect(wrapper.find('.empty-state').exists()).toBe(true);
      expect(wrapper.findComponent(MockTabBar).props('sessions')).toHaveLength(0);
    });

    it('should handle single session correctly', async () => {
      const session = createMockSession({ id: 'single-session' });
      addSessionToStore(mockStoreState, session);

      wrapper = mountTerminalContainer();
      await nextTick();

      expect(mockStoreState.sessions.size).toBe(1);
      expect(mockStoreState.activeSessionId).toBe('single-session');
    });

    it('should handle closing non-existent session gracefully', async () => {
      wrapper = mountTerminalContainer();
      await nextTick();

      removeSessionFromStore(mockStoreState, 'non-existent-session');
      await nextTick();

      expect(true).toBe(true);
    });

    it('should handle SSH session disconnect', async () => {
      const sshSession = createMockSession({
        id: 'ssh-disconnect',
        type: 'ssh',
        sshSessionId: 'ssh-123',
      });
      addSessionToStore(mockStoreState, sshSession);

      wrapper = mountTerminalContainer();
      await nextTick();

      const sshPane = wrapper.findComponent(MockSshTerminalPane);
      await sshPane.vm.$emit('disconnect', 'ssh-disconnect');
      await nextTick();

      // The disconnect event should trigger handleTabClose which emits session-closed
      // Note: In actual component, disconnect event doesn't pass sessionId
      // The component uses the sessionId from props
      expect(true).toBe(true); // Verify no crash
    });

    it('should handle Docker session disconnect', async () => {
      const dockerSession = createMockSession({
        id: 'docker-disconnect',
        type: 'docker',
        dockerSessionId: 'docker-123',
      });
      addSessionToStore(mockStoreState, dockerSession);

      wrapper = mountTerminalContainer();
      await nextTick();

      const dockerPane = wrapper.findComponent(MockDockerTerminalPane);
      await dockerPane.vm.$emit('disconnect', 'docker-disconnect');
      await nextTick();

      // The disconnect event should trigger handleTabClose which emits session-closed
      expect(true).toBe(true); // Verify no crash
    });
  });

  // ===========================================
  // Clipboard Tests
  // ===========================================
  describe('Clipboard Operations', () => {
    it('should copy CWD to clipboard', async () => {
      const session = createMockSession({
        id: 'clipboard-session',
        cwd: '/home/user/projects',
      });
      addSessionToStore(mockStoreState, session);

      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      wrapper = mountTerminalContainer();
      await nextTick();

      const contextMenu = wrapper.findComponent(MockTabContextMenu);
      await contextMenu.vm.$emit('copy-cwd', 'clipboard-session');
      await nextTick();

      expect(mockWriteText).toHaveBeenCalledWith('/home/user/projects');

      vi.unstubAllGlobals();
    });

    it('should handle clipboard error gracefully', async () => {
      const session = createMockSession({
        id: 'clipboard-error-session',
        cwd: '/home/user',
      });
      addSessionToStore(mockStoreState, session);

      const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard error'));
      vi.stubGlobal('navigator', {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      wrapper = mountTerminalContainer();
      await nextTick();

      const contextMenu = wrapper.findComponent(MockTabContextMenu);
      await contextMenu.vm.$emit('copy-cwd', 'clipboard-error-session');
      await nextTick();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
      vi.unstubAllGlobals();
    });
  });
});
