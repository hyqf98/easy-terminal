/**
 * useTerminal - Terminal session management composable
 * Handles terminal lifecycle, input/output, and events
 */
import { ref, onMounted, onUnmounted, type Ref } from 'vue';
import { useTerminalStore } from '@/stores';
import {
  createTerminalSession,
  closeTerminalSession,
  sendTerminalInput,
  resizeTerminal,
  getAvailableShells,
  getDefaultShell,
} from '@/services/terminal.service';
import { onTerminalOutput, onTerminalExit } from '@/services/events';
import type { UnlistenFn } from '@tauri-apps/api/event';
import type { TerminalSession, TerminalCreateOptions } from '@/types';

export interface UseTerminalOptions {
  /** Auto-create a session on mount */
  autoCreate?: boolean;
  /** Initial working directory */
  cwd?: string;
  /** Shell to use */
  shell?: string;
  /** Callback when output is received */
  onOutput?: (sessionId: string, data: string) => void;
  /** Callback when session exits */
  onExit?: (sessionId: string, exitCode: number) => void;
}

export interface UseTerminalReturn {
  /** Loading state */
  isLoading: Ref<boolean>;
  /** Error state */
  error: Ref<string | null>;
  /** Available shells */
  availableShells: Ref<string[]>;
  /** Default shell */
  defaultShell: Ref<string>;
  /** Create a new terminal session */
  createSession: (options?: TerminalCreateOptions) => Promise<TerminalSession | null>;
  /** Close a terminal session */
  closeSession: (sessionId: string) => Promise<void>;
  /** Send input to terminal */
  sendInput: (sessionId: string, data: string) => Promise<void>;
  /** Resize terminal */
  resize: (sessionId: string, cols: number, rows: number, width?: number, height?: number) => Promise<void>;
  /** Get active session */
  activeSession: Ref<TerminalSession | null>;
  /** All sessions */
  sessions: Ref<TerminalSession[]>;
  /** Initialize available shells */
  initShells: () => Promise<void>;
}

/**
 * Terminal management composable
 */
export function useTerminal(options: UseTerminalOptions = {}): UseTerminalReturn {
  const { autoCreate = false, cwd, shell, onOutput, onExit } = options;

  const terminalStore = useTerminalStore();

  // State
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const availableShells = ref<string[]>([]);
  const defaultShell = ref<string>('');

  // Event unlisteners
  let unlistenOutput: UnlistenFn | null = null;
  let unlistenExit: UnlistenFn | null = null;

  // Computed from store
  const activeSession = ref<TerminalSession | null>(null);
  const sessions = ref<TerminalSession[]>([]);

  // Sync with store
  function syncFromStore() {
    activeSession.value = terminalStore.activeSession;
    sessions.value = terminalStore.sessionList;
  }

  // Initialize shells
  async function initShells(): Promise<void> {
    try {
      const [shells, defShell] = await Promise.all([
        getAvailableShells(),
        getDefaultShell(),
      ]);
      availableShells.value = shells;
      defaultShell.value = defShell;
    } catch (e) {
      console.error('Failed to get shells:', e);
    }
  }

  // Create a new session
  async function createSession(
    sessionOptions?: TerminalCreateOptions
  ): Promise<TerminalSession | null> {
    isLoading.value = true;
    error.value = null;

    try {
      const opts: TerminalCreateOptions = {
        cwd: sessionOptions?.cwd ?? cwd,
        shell: sessionOptions?.shell ?? shell,
        type: sessionOptions?.type ?? 'local',
        title: sessionOptions?.title,
        ...sessionOptions,
      };

      const session = await createTerminalSession(opts);

      // Add to store
      terminalStore.addSession(session);
      syncFromStore();

      return session;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      error.value = message;
      console.error('Failed to create terminal session:', e);
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  // Close a session
  async function closeSession(sessionId: string): Promise<void> {
    try {
      await closeTerminalSession(sessionId);
      terminalStore.closeSession(sessionId);
      syncFromStore();
    } catch (e) {
      console.error('Failed to close terminal session:', e);
      // Still remove from store even if backend fails
      terminalStore.closeSession(sessionId);
      syncFromStore();
    }
  }

  // Send input to terminal
  async function sendInput(sessionId: string, data: string): Promise<void> {
    try {
      await sendTerminalInput(sessionId, data);
      terminalStore.updateSession(sessionId, {
        lastActivityAt: Date.now(),
      });
    } catch (e) {
      console.error('Failed to send input:', e);
      throw e;
    }
  }

  // Resize terminal
  async function resize(
    sessionId: string,
    cols: number,
    rows: number,
    width = 0,
    height = 0
  ): Promise<void> {
    try {
      await resizeTerminal(sessionId, cols, rows, width, height);
      terminalStore.updateSession(sessionId, {
        cols,
        rows,
        lastActivityAt: Date.now(),
      });
    } catch (e) {
      console.error('Failed to resize terminal:', e);
      throw e;
    }
  }

  // Setup event listeners
  async function setupEventListeners(): Promise<void> {
    // Listen for terminal output
    unlistenOutput = await onTerminalOutput((event) => {
      const { session_id, data } = event;

      // Update last activity
      terminalStore.updateSession(session_id, {
        lastActivityAt: Date.now(),
      });

      // Call custom callback
      if (onOutput) {
        onOutput(session_id, data);
      }
    });

    // Listen for terminal exit
    unlistenExit = await onTerminalExit((event) => {
      const { session_id, exit_code } = event;

      // Update status
      terminalStore.updateSessionStatus(session_id, 'disconnected');

      // Call custom callback
      if (onExit) {
        onExit(session_id, exit_code);
      }
    });
  }

  // Cleanup event listeners
  function cleanupEventListeners(): void {
    if (unlistenOutput) {
      unlistenOutput();
      unlistenOutput = null;
    }
    if (unlistenExit) {
      unlistenExit();
      unlistenExit = null;
    }
  }

  // Lifecycle
  onMounted(async () => {
    await initShells();
    await setupEventListeners();
    syncFromStore();

    // Auto-create session if requested
    if (autoCreate && terminalStore.sessionCount === 0) {
      await createSession();
    }
  });

  onUnmounted(() => {
    cleanupEventListeners();
  });

  return {
    isLoading,
    error,
    availableShells,
    defaultShell,
    createSession,
    closeSession,
    sendInput,
    resize,
    activeSession,
    sessions,
    initShells,
  };
}

/**
 * Simplified composable for a single terminal instance
 */
export function useTerminalInstance(sessionId: Ref<string | null>) {
  const terminalStore = useTerminalStore();
  const isLoading = ref(false);

  // Get session from store
  const session = ref<TerminalSession | null>(null);

  // Update session ref when sessionId changes
  function updateSessionRef() {
    if (sessionId.value) {
      session.value = terminalStore.getSession(sessionId.value) ?? null;
    } else {
      session.value = null;
    }
  }

  // Send input
  async function sendInput(data: string): Promise<void> {
    if (!sessionId.value) return;
    isLoading.value = true;
    try {
      await sendTerminalInput(sessionId.value, data);
    } finally {
      isLoading.value = false;
    }
  }

  // Resize
  async function resize(cols: number, rows: number, width = 0, height = 0): Promise<void> {
    if (!sessionId.value) return;
    await resizeTerminal(sessionId.value, cols, rows, width, height);
  }

  return {
    session,
    isLoading,
    sendInput,
    resize,
    updateSessionRef,
  };
}
