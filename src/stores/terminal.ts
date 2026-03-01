/**
 * Terminal store - Manages terminal sessions and split pane layout
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  TerminalSession,
  TerminalStatus,
  LayoutNode,
  SplitPaneNode,
  TerminalPaneNode,
  SplitDirection,
} from '@/types';

/** Generate unique ID */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Create a terminal pane node */
function createPaneNode(sessionId: string): TerminalPaneNode {
  return {
    id: generateId(),
    type: 'pane',
    sessionId,
  };
}

/** Create a split pane node */
function createSplitNode(
  direction: SplitDirection,
  first: LayoutNode,
  second: LayoutNode,
  firstSize: number = 50
): SplitPaneNode {
  return {
    id: generateId(),
    type: 'split',
    direction,
    children: [first, second],
    sizes: [firstSize, 100 - firstSize],
  };
}

/** Find parent of a node in the tree */
function findParent(
  root: LayoutNode,
  nodeId: string
): { parent: SplitPaneNode; index: 0 | 1 } | null {
  if (root.type === 'pane') return null;

  for (let i = 0; i < 2; i++) {
    const child = root.children[i];
    if (child.id === nodeId) {
      return { parent: root, index: i as 0 | 1 };
    }
    if (child.type === 'split') {
      const result = findParent(child, nodeId);
      if (result) return result;
    }
  }
  return null;
}

/** Find a node by ID in the tree */
function findNode(root: LayoutNode, nodeId: string): LayoutNode | null {
  if (root.id === nodeId) return root;
  if (root.type === 'pane') return null;

  for (const child of root.children) {
    const found = findNode(child, nodeId);
    if (found) return found;
  }
  return null;
}

/** Find a pane node by session ID */
function findPaneBySessionId(root: LayoutNode, sessionId: string): TerminalPaneNode | null {
  if (root.type === 'pane') {
    return root.sessionId === sessionId ? root : null;
  }
  for (const child of root.children) {
    const found = findPaneBySessionId(child, sessionId);
    if (found) return found;
  }
  return null;
}

/** Get all pane nodes from a tree */
function getAllPanes(root: LayoutNode): TerminalPaneNode[] {
  if (root.type === 'pane') return [root];
  return [...getAllPanes(root.children[0]), ...getAllPanes(root.children[1])];
}

export const useTerminalStore = defineStore('terminal', () => {
  // State
  const sessions = ref<Map<string, TerminalSession>>(new Map());
  const activeSessionId = ref<string | null>(null);
  const sessionOrder = ref<string[]>([]);

  // Split pane state
  const layoutRoot = ref<LayoutNode | null>(null);
  const focusedPaneId = ref<string | null>(null);

  // SSH session tracking (maps terminal sessionId to backend sshSessionId)
  const sshSessionMap = ref<Map<string, string>>(new Map());

  // Docker session tracking (maps terminal sessionId to backend dockerSessionId)
  const dockerSessionMap = ref<Map<string, string>>(new Map());

  // Getters
  const activeSession = computed(() => {
    if (!activeSessionId.value) return null;
    return sessions.value.get(activeSessionId.value) ?? null;
  });

  const sessionList = computed(() => {
    return sessionOrder.value
      .map(id => sessions.value.get(id))
      .filter((s): s is TerminalSession => s !== undefined);
  });

  const sessionCount = computed(() => sessions.value.size);

  // Get only local sessions
  const localSessions = computed(() => {
    return sessionList.value.filter(s => s.type === 'local');
  });

  // Get only SSH sessions
  const sshSessions = computed(() => {
    return sessionList.value.filter(s => s.type === 'ssh');
  });

  // Get only Docker sessions
  const dockerSessions = computed(() => {
    return sessionList.value.filter(s => s.type === 'docker');
  });

  // Get panes in current layout
  const panes = computed(() => {
    if (!layoutRoot.value) return [];
    return getAllPanes(layoutRoot.value);
  });

  // Get focused pane
  const focusedPane = computed(() => {
    if (!focusedPaneId.value || !layoutRoot.value) return null;
    const node = findNode(layoutRoot.value, focusedPaneId.value);
    return node?.type === 'pane' ? node : null;
  });

  // Actions - Session Management
  function addSession(session: TerminalSession): void {
    sessions.value.set(session.id, session);
    sessionOrder.value.push(session.id);
    activeSessionId.value = session.id;

    // Track SSH session mapping
    if (session.type === 'ssh' && session.sshSessionId) {
      sshSessionMap.value.set(session.id, session.sshSessionId);
    }

    // Track Docker session mapping
    if (session.type === 'docker' && session.dockerSessionId) {
      dockerSessionMap.value.set(session.id, session.dockerSessionId);
    }

    // Add to layout
    const paneNode = createPaneNode(session.id);
    if (!layoutRoot.value) {
      layoutRoot.value = paneNode;
    } else {
      // Find a pane to replace (currently focused or first pane)
      const targetPane = focusedPane.value || getAllPanes(layoutRoot.value)[0];
      if (targetPane) {
        // Replace the target pane with a split containing both
        const result = findParent(layoutRoot.value, targetPane.id);
        if (result) {
          const newSplit = createSplitNode('horizontal', targetPane, paneNode, 50);
          result.parent.children[result.index] = newSplit;
        } else {
          // Target is root
          layoutRoot.value = createSplitNode('horizontal', layoutRoot.value, paneNode, 50);
        }
      }
    }
    focusedPaneId.value = paneNode.id;
  }

  /** Add an SSH session with SSH-specific parameters */
  function addSshSession(
    sshSessionId: string,
    configId: string,
    title: string,
    cwd?: string
  ): TerminalSession {
    const sessionId = generateId();
    const session: TerminalSession = {
      id: sessionId,
      title,
      type: 'ssh',
      connectionType: 'ssh',
      status: 'connected',
      cwd,
      connectionId: configId,
      sshSessionId,
      sshConfigId: configId,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };

    addSession(session);
    return session;
  }

  function removeSession(sessionId: string): void {
    sessions.value.delete(sessionId);
    sshSessionMap.value.delete(sessionId);
    dockerSessionMap.value.delete(sessionId);
    const index = sessionOrder.value.indexOf(sessionId);
    if (index !== -1) {
      sessionOrder.value.splice(index, 1);
    }
    // If removing active session, switch to another
    if (activeSessionId.value === sessionId) {
      activeSessionId.value = sessionOrder.value[0] ?? null;
    }

    // Remove from layout
    if (layoutRoot.value) {
      const paneNode = findPaneBySessionId(layoutRoot.value, sessionId);
      if (paneNode) {
        removeFromLayout(paneNode.id);
      }
    }
  }

  /** Get SSH session ID for a terminal session */
  function getSshSessionId(sessionId: string): string | undefined {
    const session = sessions.value.get(sessionId);
    return session?.sshSessionId;
  }

  /** Get session by SSH session ID */
  function getSessionBySshId(sshSessionId: string): TerminalSession | undefined {
    for (const session of sessions.value.values()) {
      if (session.sshSessionId === sshSessionId) {
        return session;
      }
    }
    return undefined;
  }

  /** Add a Docker session with Docker-specific parameters */
  function addDockerSession(
    dockerSessionId: string,
    containerId: string,
    containerName: string
  ): TerminalSession {
    const sessionId = generateId();
    const session: TerminalSession = {
      id: sessionId,
      title: containerName,
      type: 'docker',
      connectionType: 'docker',
      status: 'connected',
      connectionId: containerId,
      dockerSessionId,
      dockerContainerId: containerId,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };

    addSession(session);
    return session;
  }

  /** Get Docker session ID for a terminal session */
  function getDockerSessionId(sessionId: string): string | undefined {
    const session = sessions.value.get(sessionId);
    return session?.dockerSessionId;
  }

  /** Get session by Docker session ID */
  function getSessionByDockerId(dockerSessionId: string): TerminalSession | undefined {
    for (const session of sessions.value.values()) {
      if (session.dockerSessionId === dockerSessionId) {
        return session;
      }
    }
    return undefined;
  }

  /** Remove a pane from layout, simplifying the tree */
  function removeFromLayout(paneId: string): void {
    if (!layoutRoot.value) return;

    // If layout has only one pane
    if (layoutRoot.value.type === 'pane') {
      if (layoutRoot.value.id === paneId) {
        layoutRoot.value = null;
        focusedPaneId.value = null;
      }
      return;
    }

    const result = findParent(layoutRoot.value, paneId);
    if (!result) return;

    const { parent, index } = result;
    const siblingIndex = index === 0 ? 1 : 0;
    const sibling = parent.children[siblingIndex];

    // Replace parent with sibling
    const grandParentResult = findParent(layoutRoot.value, parent.id);
    if (grandParentResult) {
      grandParentResult.parent.children[grandParentResult.index] = sibling;
    } else {
      // Parent is root
      layoutRoot.value = sibling;
    }

    // Update focused pane if necessary
    if (sibling.type === 'pane') {
      focusedPaneId.value = sibling.id;
      activeSessionId.value = sibling.sessionId;
    } else {
      // Focus first pane in sibling
      const panesInSibling = getAllPanes(sibling);
      if (panesInSibling.length > 0) {
        focusedPaneId.value = panesInSibling[0].id;
        activeSessionId.value = panesInSibling[0].sessionId;
      }
    }
  }

  function updateSession(sessionId: string, updates: Partial<TerminalSession>): void {
    const session = sessions.value.get(sessionId);
    if (session) {
      Object.assign(session, updates);
    }
  }

  function setActiveSession(sessionId: string): void {
    if (sessions.value.has(sessionId)) {
      activeSessionId.value = sessionId;

      // Update focused pane
      if (layoutRoot.value) {
        const pane = findPaneBySessionId(layoutRoot.value, sessionId);
        if (pane) {
          focusedPaneId.value = pane.id;
        }
      }
    }
  }

  function updateSessionStatus(sessionId: string, status: TerminalStatus): void {
    updateSession(sessionId, { status, lastActivityAt: Date.now() });
  }

  function updateSessionCwd(sessionId: string, cwd: string): void {
    updateSession(sessionId, { cwd, lastActivityAt: Date.now() });
  }

  function reorderSessions(fromIndex: number, toIndex: number): void {
    const [removed] = sessionOrder.value.splice(fromIndex, 1);
    sessionOrder.value.splice(toIndex, 0, removed);
  }

  function getSession(sessionId: string): TerminalSession | undefined {
    return sessions.value.get(sessionId);
  }

  function clearSessions(): void {
    sessions.value.clear();
    sessionOrder.value = [];
    activeSessionId.value = null;
    layoutRoot.value = null;
    focusedPaneId.value = null;
  }

  // Alias for removeSession (more semantic)
  function closeSession(sessionId: string): void {
    removeSession(sessionId);
  }

  // Actions - Split Pane Management
  function splitPane(sessionId: string, direction: SplitDirection): void {
    const session = sessions.value.get(sessionId);
    if (!session || !layoutRoot.value) return;

    // Create a new session with the same settings
    const newSession: TerminalSession = {
      ...session,
      id: generateId(),
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };
    sessions.value.set(newSession.id, newSession);
    sessionOrder.value.push(newSession.id);

    // Find the pane to split
    const paneToSplit = findPaneBySessionId(layoutRoot.value, sessionId);
    if (!paneToSplit) return;

    const newPane = createPaneNode(newSession.id);
    const newSplit = createSplitNode(direction, paneToSplit, newPane, 50);

    // Replace the pane with the split
    const result = findParent(layoutRoot.value, paneToSplit.id);
    if (result) {
      result.parent.children[result.index] = newSplit;
    } else {
      layoutRoot.value = newSplit;
    }

    focusedPaneId.value = newPane.id;
    activeSessionId.value = newSession.id;
  }

  function setFocusedPane(paneId: string): void {
    if (layoutRoot.value) {
      const node = findNode(layoutRoot.value, paneId);
      if (node?.type === 'pane') {
        focusedPaneId.value = paneId;
        activeSessionId.value = node.sessionId;
      }
    }
  }

  function updateSplitSize(splitId: string, firstSize: number): void {
    if (!layoutRoot.value) return;

    const node = findNode(layoutRoot.value, splitId);
    if (node?.type === 'split') {
      const split = node as SplitPaneNode;
      split.sizes = [firstSize, 100 - firstSize];
    }
  }

  /** Get all pane IDs (session IDs) in the current layout */
  function getAllPaneIds(): string[] {
    if (!layoutRoot.value) return [];
    return getAllPanes(layoutRoot.value).map(pane => pane.sessionId);
  }

  return {
    // State
    sessions,
    activeSessionId,
    sessionOrder,
    layoutRoot,
    focusedPaneId,
    sshSessionMap,
    dockerSessionMap,
    // Getters
    activeSession,
    sessionList,
    sessionCount,
    localSessions,
    sshSessions,
    dockerSessions,
    panes,
    focusedPane,
    // Actions
    addSession,
    addSshSession,
    addDockerSession,
    removeSession,
    closeSession,
    updateSession,
    setActiveSession,
    updateSessionStatus,
    updateSessionCwd,
    reorderSessions,
    getSession,
    getSessionBySshId,
    getSshSessionId,
    getSessionByDockerId,
    getDockerSessionId,
    clearSessions,
    // Split pane actions
    splitPane,
    setFocusedPane,
    updateSplitSize,
    getAllPaneIds,
  };
});
