<script setup lang="ts">
/**
 * SshTerminalPane - SSH terminal panel component with xterm.js integration
 * Handles SSH terminal display, input/output, and lifecycle
 */
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { SearchAddon } from 'xterm-addon-search';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { Unicode11Addon } from 'xterm-addon-unicode11';
import { sshInput, resizeSsh, disconnectSsh } from '@/services/ssh.service';
import { onSshOutput } from '@/services/events';
import { useConnectionsStore } from '@/stores';
import type { UnlistenFn } from '@tauri-apps/api/event';
import 'xterm/css/xterm.css';

const props = defineProps<{
  /** SSH session ID (returned from connectSsh) */
  sessionId: string;
  /** Connection config ID */
  configId: string;
  /** Whether this pane is focused */
  focused?: boolean;
}>();

const emit = defineEmits<{
  (e: 'focus'): void;
  (e: 'disconnect'): void;
  (e: 'error', error: string): void;
}>();

// Refs
const terminalContainer = ref<HTMLDivElement | null>(null);
const terminalRef = ref<Terminal | null>(null);
const fitAddon = ref<FitAddon | null>(null);

// Store
const connectionsStore = useConnectionsStore();

// Event unlisteners
let unlistenOutput: UnlistenFn | null = null;

// Terminal options
const terminalOptions = {
  fontSize: 14,
  fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace",
  theme: {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#d4d4d4',
    cursorAccent: '#1e1e1e',
    selectionBackground: 'rgba(255, 255, 255, 0.3)',
    black: '#000000',
    red: '#cd3131',
    green: '#0dbc79',
    yellow: '#e5e510',
    blue: '#2472c8',
    magenta: '#bc3fbc',
    cyan: '#11a8cd',
    white: '#e5e5e5',
    brightBlack: '#666666',
    brightRed: '#f14c4c',
    brightGreen: '#23d18b',
    brightYellow: '#f5f543',
    brightBlue: '#3b8eea',
    brightMagenta: '#d670d6',
    brightCyan: '#29b8db',
    brightWhite: '#e5e5e5',
  },
  cursorBlink: true,
  cursorStyle: 'block' as const,
  scrollback: 10000,
  allowProposedApi: true,
  allowTransparency: true,
  convertEol: true,
};

// Initialize terminal
async function initTerminal(): Promise<void> {
  if (!terminalContainer.value) return;

  // Create terminal instance
  const terminal = new Terminal(terminalOptions);
  terminalRef.value = terminal;

  // Create addons
  const fit = new FitAddon();
  const search = new SearchAddon();
  const webLinks = new WebLinksAddon();
  const unicode11 = new Unicode11Addon();

  fitAddon.value = fit;

  // Load addons
  terminal.loadAddon(fit);
  terminal.loadAddon(search);
  terminal.loadAddon(webLinks);
  terminal.loadAddon(unicode11);

  // Enable Unicode 11
  terminal.unicode.activeVersion = '11';

  // Open terminal in container
  terminal.open(terminalContainer.value);

  // Initial fit
  await nextTick();
  fit.fit();

  // Handle input
  terminal.onData((data) => {
    handleInput(data);
  });

  // Handle resize
  terminal.onResize(({ cols, rows }) => {
    handleResize(cols, rows);
  });

  // Focus terminal
  terminal.focus();

  // Setup SSH output listener
  unlistenOutput = await onSshOutput((event) => {
    if (event.session_id === props.sessionId && terminalRef.value) {
      terminalRef.value.write(event.data);
    }
  });

  // Send initial resize to match terminal size
  handleResize(terminal.cols, terminal.rows);
}

// Handle input
async function handleInput(data: string): Promise<void> {
  try {
    await sshInput(props.sessionId, data);
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error('Failed to send SSH input:', e);
    emit('error', error);
  }
}

// Handle resize
async function handleResize(cols: number, rows: number): Promise<void> {
  try {
    await resizeSsh(props.sessionId, cols, rows);
  } catch (e) {
    console.error('Failed to resize SSH terminal:', e);
  }
}

// Fit terminal to container
function fitTerminal(): void {
  if (fitAddon.value && terminalRef.value) {
    try {
      fitAddon.value.fit();
    } catch (e) {
      console.error('Failed to fit terminal:', e);
    }
  }
}

// Focus terminal
function focus(): void {
  if (terminalRef.value) {
    terminalRef.value.focus();
    emit('focus');
  }
}

// Clear terminal
function clear(): void {
  if (terminalRef.value) {
    terminalRef.value.clear();
  }
}

// Write to terminal
function write(data: string): void {
  if (terminalRef.value) {
    terminalRef.value.write(data);
  }
}

// Disconnect SSH session
async function disconnect(): Promise<void> {
  try {
    await disconnectSsh(props.sessionId);
    connectionsStore.setConnectionStatus(props.configId, 'disconnected');
    emit('disconnect');
  } catch (e) {
    console.error('Failed to disconnect SSH session:', e);
  }
}

// Resize observer
let resizeObserver: ResizeObserver | null = null;

// Watch focused prop
watch(() => props.focused, (newFocused) => {
  if (newFocused) {
    focus();
  }
});

// Lifecycle
onMounted(async () => {
  await initTerminal();

  // Setup resize observer
  if (terminalContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      fitTerminal();
    });
    resizeObserver.observe(terminalContainer.value);
  }
});

onUnmounted(() => {
  // Cleanup resize observer
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }

  // Cleanup event listener
  if (unlistenOutput) {
    unlistenOutput();
    unlistenOutput = null;
  }

  // Dispose terminal
  if (terminalRef.value) {
    terminalRef.value.dispose();
    terminalRef.value = null;
  }
});

// Expose methods
defineExpose({
  focus,
  clear,
  write,
  fitTerminal,
  disconnect,
});
</script>

<template>
  <div
    class="ssh-terminal-pane"
    :class="{ 'is-focused': focused }"
    @click="focus"
  >
    <div ref="terminalContainer" class="terminal-container"></div>
  </div>
</template>

<style scoped>
.ssh-terminal-pane {
  width: 100%;
  height: 100%;
  background-color: #1e1e1e;
  overflow: hidden;
}

.ssh-terminal-pane.is-focused {
  /* Optional: Add visual indicator for focused pane */
}

.terminal-container {
  width: 100%;
  height: 100%;
  padding: 4px;
}

/* Ensure xterm fills container */
.terminal-container :deep(.xterm) {
  height: 100%;
}

.terminal-container :deep(.xterm-viewport) {
  overflow-y: auto;
}

/* Custom scrollbar for terminal */
.terminal-container :deep(.xterm-viewport::-webkit-scrollbar) {
  width: 8px;
}

.terminal-container :deep(.xterm-viewport::-webkit-scrollbar-track) {
  background: transparent;
}

.terminal-container :deep(.xterm-viewport::-webkit-scrollbar-thumb) {
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.terminal-container :deep(.xterm-viewport::-webkit-scrollbar-thumb:hover) {
  background-color: rgba(255, 255, 255, 0.3);
}
</style>
