<script setup lang="ts">
/**
 * TerminalContainer - Main terminal container with tabs and split panes
 * Manages the terminal layout, tabs, and session lifecycle
 */
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useTerminalStore } from '@/stores';
import { useTerminal, type EditorCommand } from '@/composables';
import { useShortcuts, DEFAULT_SHORTCUTS } from '@/composables';
import TabBar from './TabBar.vue';
import TabContextMenu from './TabContextMenu.vue';
import SplitContainer from './SplitContainer.vue';
import TerminalPane from './TerminalPane.vue';
import SshTerminalPane from './SshTerminalPane.vue';
import DockerTerminalPane from './DockerTerminalPane.vue';
import { FileEditorModal } from '@/components/editor';
import type { SplitDirection, TerminalSession } from '@/types';

withDefaults(defineProps<{
  /** Whether to show the tab bar */
  showTabs?: boolean;
}>(), {
  showTabs: true,
});

const emit = defineEmits<{
  (e: 'session-created', sessionId: string): void;
  (e: 'session-closed', sessionId: string): void;
  (e: 'session-focus', sessionId: string): void;
}>();

// Store and composables
const terminalStore = useTerminalStore();
const { createSession, closeSession, isLoading, defaultShell } = useTerminal();

// Context menu state
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  sessionId: null as string | null,
});

// Editor modal state
const editorModal = ref({
  visible: false,
  filePath: '',
  editor: '',
});

// Terminal pane refs for focusing (both local and SSH)
const terminalRefs = ref<Map<string, { focus: () => void }>>(new Map());

// Computed
const sessions = computed(() => terminalStore.sessionList);
const activeSessionId = computed(() => terminalStore.activeSessionId);
const layoutRoot = computed(() => terminalStore.layoutRoot);

// Create new terminal
async function handleNewTab() {
  const session = await createSession({
    shell: defaultShell.value || undefined,
    type: 'local',
  });
  if (session) {
    emit('session-created', session.id);
  }
}

// Handle tab click
function handleTabClick(sessionId: string) {
  terminalStore.setActiveSession(sessionId);
  emit('session-focus', sessionId);

  // Focus the terminal
  const terminalRef = terminalRefs.value.get(sessionId);
  if (terminalRef) {
    terminalRef.focus();
  }
}

// Handle tab close
async function handleTabClose(sessionId: string) {
  const session = terminalStore.getSession(sessionId);

  // For SSH sessions, disconnect the SSH connection first
  if (session?.type === 'ssh' && session.sshSessionId) {
    try {
      const { disconnectSsh } = await import('@/services/ssh.service');
      await disconnectSsh(session.sshSessionId);
    } catch (e) {
      console.error('Failed to disconnect SSH session:', e);
    }
  }

  // For Docker sessions, disconnect the Docker exec session first
  if (session?.type === 'docker' && session.dockerSessionId) {
    try {
      const { disconnectDockerExec } = await import('@/services/docker.service');
      await disconnectDockerExec(session.dockerSessionId);
    } catch (e) {
      console.error('Failed to disconnect Docker exec session:', e);
    }
  }

  await closeSession(sessionId);
  emit('session-closed', sessionId);
}

// Handle tab reorder
function handleTabReorder(fromIndex: number, toIndex: number) {
  terminalStore.reorderSessions(fromIndex, toIndex);
}

// Handle tab context menu
function handleTabContextMenu(sessionId: string, event: MouseEvent) {
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    sessionId,
  };
}

// Hide context menu
function hideContextMenu() {
  contextMenu.value.visible = false;
}

// Context menu actions
function handleContextMenuClose() {
  if (contextMenu.value.sessionId) {
    handleTabClose(contextMenu.value.sessionId);
  }
}

function handleContextMenuCloseOthers(sessionId: string) {
  const otherSessions = sessions.value.filter(s => s.id !== sessionId);
  for (const session of otherSessions) {
    closeSession(session.id);
  }
}

function handleContextMenuCloseToRight(sessionId: string) {
  const index = sessions.value.findIndex(s => s.id === sessionId);
  if (index >= 0) {
    const sessionsToClose = sessions.value.slice(index + 1);
    for (const session of sessionsToClose) {
      closeSession(session.id);
    }
  }
}

function handleContextMenuDuplicate(sessionId: string) {
  const session = terminalStore.getSession(sessionId);
  if (session) {
    createSession({
      cwd: session.cwd,
      shell: session.shell,
      type: session.type,
    });
  }
}

function handleContextMenuSplit(sessionId: string, direction: SplitDirection) {
  terminalStore.splitPane(sessionId, direction);
}

function handleContextMenuRename(sessionId: string) {
  // TODO: Implement rename modal
  console.log('Rename session:', sessionId);
}

async function handleContextMenuCopyCwd(sessionId: string) {
  const session = terminalStore.getSession(sessionId);
  if (session?.cwd) {
    try {
      await navigator.clipboard.writeText(session.cwd);
    } catch (e) {
      console.error('Failed to copy path:', e);
    }
  }
}

// Handle pane focus
function handlePaneFocus(paneId: string) {
  terminalStore.setFocusedPane(paneId);
}

// Handle split resize
function handleSplitResize(paneId: string, size: number) {
  terminalStore.updateSplitSize(paneId, size);
}

// Register terminal ref
function setTerminalRef(sessionId: string, el: { focus: () => void } | null) {
  if (el) {
    terminalRefs.value.set(sessionId, el);
  } else {
    terminalRefs.value.delete(sessionId);
  }
}

// Get session by ID
function getSession(sessionId: string): TerminalSession | undefined {
  return terminalStore.getSession(sessionId);
}

// Handle local terminal title change - filter out shell paths
function handleLocalTitleChange(sessionId: string, title: string): void {
  // Don't update title if it looks like a file path (shell sets this on startup)
  // Windows paths: C:\, D:\, etc. Unix paths: /usr/bin, /home, etc.
  if (/^[A-Za-z]:\\/.test(title) || title.startsWith('/')) {
    return;
  }
  // Don't update if title is too long (likely a command or path)
  if (title.length > 50) {
    return;
  }
  terminalStore.updateSession(sessionId, { title });
}

// Handle editor command detection (vim, nano, etc.)
function handleEditorCommand(command: EditorCommand): void {
  editorModal.value = {
    visible: true,
    filePath: command.filePath,
    editor: command.editor,
  };
}

// Close editor modal
function closeEditorModal(): void {
  editorModal.value.visible = false;
}

// Initialize shortcuts manager
const { registerShortcut, unregisterShortcut } = useShortcuts();

// Focus navigation helpers
function navigateFocus(direction: 'up' | 'down' | 'left' | 'right'): void {
  const focusedPaneId = terminalStore.focusedPaneId;
  if (!focusedPaneId) return;

  // Get all pane IDs from the layout
  const allPanes = terminalStore.getAllPaneIds();
  if (allPanes.length <= 1) return;

  const currentIndex = allPanes.indexOf(focusedPaneId);
  if (currentIndex === -1) return;

  let nextIndex: number;
  if (direction === 'up' || direction === 'left') {
    nextIndex = currentIndex > 0 ? currentIndex - 1 : allPanes.length - 1;
  } else {
    nextIndex = currentIndex < allPanes.length - 1 ? currentIndex + 1 : 0;
  }

  const nextPaneId = allPanes[nextIndex];
  if (nextPaneId) {
    terminalStore.setFocusedPane(nextPaneId);

    // Find the session for this pane and activate it
    const session = sessions.value.find(s => s.id === nextPaneId);
    if (session) {
      terminalStore.setActiveSession(session.id);
      const terminalRef = terminalRefs.value.get(session.id);
      if (terminalRef) {
        terminalRef.focus();
      }
    }
  }
}

// Register terminal shortcuts
onMounted(async () => {
  // Create initial terminal if no sessions exist
  if (terminalStore.sessionCount === 0) {
    await handleNewTab();
  }

  // Register terminal shortcuts
  const newTerminalDef = DEFAULT_SHORTCUTS.find(s => s.id === 'terminal.new')!;
  registerShortcut(newTerminalDef, handleNewTab);

  const closeTerminalDef = DEFAULT_SHORTCUTS.find(s => s.id === 'terminal.close')!;
  registerShortcut(closeTerminalDef, () => {
    if (activeSessionId.value) {
      handleTabClose(activeSessionId.value);
    }
  });

  const switchTabDef = DEFAULT_SHORTCUTS.find(s => s.id === 'tabs.switchNext')!;
  registerShortcut(switchTabDef, () => {
    const current = sessions.value.findIndex(s => s.id === activeSessionId.value);
    const next = (current + 1) % sessions.value.length;
    if (sessions.value[next]) {
      handleTabClick(sessions.value[next].id);
    }
  });

  const splitHorizontalDef = DEFAULT_SHORTCUTS.find(s => s.id === 'splits.horizontal')!;
  registerShortcut(splitHorizontalDef, () => {
    if (activeSessionId.value) {
      handleContextMenuSplit(activeSessionId.value, 'horizontal');
    }
  });

  const splitVerticalDef = DEFAULT_SHORTCUTS.find(s => s.id === 'splits.vertical')!;
  registerShortcut(splitVerticalDef, () => {
    if (activeSessionId.value) {
      handleContextMenuSplit(activeSessionId.value, 'vertical');
    }
  });

  // Focus navigation shortcuts
  const focusUpDef = DEFAULT_SHORTCUTS.find(s => s.id === 'splits.focusUp')!;
  registerShortcut(focusUpDef, () => navigateFocus('up'));

  const focusDownDef = DEFAULT_SHORTCUTS.find(s => s.id === 'splits.focusDown')!;
  registerShortcut(focusDownDef, () => navigateFocus('down'));

  const focusLeftDef = DEFAULT_SHORTCUTS.find(s => s.id === 'splits.focusLeft')!;
  registerShortcut(focusLeftDef, () => navigateFocus('left'));

  const focusRightDef = DEFAULT_SHORTCUTS.find(s => s.id === 'splits.focusRight')!;
  registerShortcut(focusRightDef, () => navigateFocus('right'));
});

// Unregister shortcuts on unmount
onUnmounted(() => {
  const shortcutIds = [
    'terminal.new',
    'terminal.close',
    'tabs.switchNext',
    'splits.horizontal',
    'splits.vertical',
    'splits.focusUp',
    'splits.focusDown',
    'splits.focusLeft',
    'splits.focusRight',
  ];
  shortcutIds.forEach(id => unregisterShortcut(id));
});

// Get session for context menu
const contextMenuSession = computed(() => {
  if (!contextMenu.value.sessionId) return null;
  return terminalStore.getSession(contextMenu.value.sessionId) || null;
});
</script>

<template>
  <div class="terminal-container">
    <!-- Tab bar -->
    <TabBar
      v-if="showTabs"
      :sessions="sessions"
      :active-session-id="activeSessionId"
      :show-new-tab="true"
      @tab-click="handleTabClick"
      @tab-close="handleTabClose"
      @new-tab="handleNewTab"
      @reorder="handleTabReorder"
      @contextmenu="handleTabContextMenu"
    />

    <!-- Terminal content area -->
    <div class="terminal-content">
      <!-- Split pane layout -->
      <SplitContainer
        v-if="layoutRoot"
        :root="layoutRoot"
        :min-size="10"
        @resize="handleSplitResize"
        @focus="handlePaneFocus"
      >
        <template #default="{ pane, sessionId }">
          <!-- Local terminal pane -->
          <TerminalPane
            v-if="sessionId && pane.type === 'pane' && getSession(sessionId)?.type === 'local'"
            :ref="(el: any) => setTerminalRef(sessionId, el)"
            :session-id="sessionId"
            :focused="terminalStore.focusedPaneId === pane.id"
            @focus="handlePaneFocus(pane.id)"
            @exit="(code) => console.log('Terminal exited:', code)"
            @title-change="(title) => handleLocalTitleChange(sessionId, title)"
            @editor-command="handleEditorCommand"
          />
          <!-- SSH terminal pane -->
          <SshTerminalPane
            v-else-if="sessionId && pane.type === 'pane' && getSession(sessionId)?.type === 'ssh'"
            :ref="(el: any) => setTerminalRef(sessionId, el)"
            :session-id="getSession(sessionId)?.sshSessionId || ''"
            :config-id="getSession(sessionId)?.sshConfigId || ''"
            :focused="terminalStore.focusedPaneId === pane.id"
            @focus="handlePaneFocus(pane.id)"
            @disconnect="handleTabClose(sessionId)"
            @error="(err) => console.error('SSH error:', err)"
          />
          <!-- Docker terminal pane -->
          <DockerTerminalPane
            v-else-if="sessionId && pane.type === 'pane' && getSession(sessionId)?.type === 'docker'"
            :ref="(el: any) => setTerminalRef(sessionId, el)"
            :session-id="getSession(sessionId)?.dockerSessionId || ''"
            :container-id="getSession(sessionId)?.dockerContainerId || ''"
            :focused="terminalStore.focusedPaneId === pane.id"
            @focus="handlePaneFocus(pane.id)"
            @disconnect="handleTabClose(sessionId)"
            @error="(err) => console.error('Docker error:', err)"
          />
        </template>
      </SplitContainer>

      <!-- Empty state -->
      <div v-else class="empty-state">
        <div class="empty-content">
          <svg viewBox="0 0 24 24" width="64" height="64" class="empty-icon">
            <path fill="currentColor" d="M20 19V7H4v12h16m0-16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16M7.5 13l2.5 3 2.5-3-2.5-3-2.5 3m5 0l2.5 3 2.5-3-2.5-3-2.5 3z"/>
          </svg>
          <h3>No Terminal Sessions</h3>
          <p>Click the + button or press Ctrl+Shift+T to create a new terminal</p>
          <button class="create-button" type="button" @click="handleNewTab" :disabled="isLoading">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            New Terminal
          </button>
        </div>
      </div>
    </div>

    <!-- Tab context menu -->
    <TabContextMenu
      :visible="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :session="contextMenuSession"
      :total-sessions="sessions.length"
      @close="handleContextMenuClose"
      @close-others="handleContextMenuCloseOthers"
      @close-to-right="handleContextMenuCloseToRight"
      @duplicate="handleContextMenuDuplicate"
      @split-horizontal="(id) => handleContextMenuSplit(id, 'horizontal')"
      @split-vertical="(id) => handleContextMenuSplit(id, 'vertical')"
      @rename="handleContextMenuRename"
      @copy-cwd="handleContextMenuCopyCwd"
      @hide="hideContextMenu"
    />

    <!-- File Editor Modal (for vim/nano commands) -->
    <FileEditorModal
      :visible="editorModal.visible"
      :file-path="editorModal.filePath"
      :editor="editorModal.editor"
      @close="closeEditorModal"
      @update:visible="editorModal.visible = $event"
    />
  </div>
</template>

<style scoped>
.terminal-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: var(--color-body, #1e1e1e);
}

.terminal-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 40px;
}

.empty-content {
  text-align: center;
  max-width: 400px;
}

.empty-icon {
  color: var(--color-text-3, #8c8c8c);
  margin-bottom: 16px;
}

.empty-content h3 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 500;
  color: var(--color-text-1, #ffffff);
}

.empty-content p {
  margin: 0 0 24px;
  font-size: 14px;
  color: var(--color-text-3, #8c8c8c);
}

.create-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  background-color: var(--color-primary, #007acc);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.create-button:hover:not(:disabled) {
  background-color: var(--color-primary-hover, #0098ff);
}

.create-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
