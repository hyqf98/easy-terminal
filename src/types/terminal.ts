/**
 * Terminal related type definitions
 */

/** Terminal session status */
export type TerminalStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/** Terminal type */
export type TerminalType = 'local' | 'ssh' | 'docker';

/** Terminal session */
export interface TerminalSession {
  /** Session ID */
  id: string;
  /** Tab title */
  title: string;
  /** Terminal type */
  type: TerminalType;
  /** Connection type (same as type for compatibility) */
  connectionType: TerminalType;
  /** Current status */
  status: TerminalStatus;
  /** Current working directory */
  cwd?: string;
  /** Shell type */
  shell?: string;
  /** Connection info (for SSH/Docker) */
  connectionId?: string;
  /** Created timestamp */
  createdAt: number;
  /** Last activity timestamp */
  lastActivityAt: number;
  /** Terminal columns */
  cols?: number;
  /** Terminal rows */
  rows?: number;
  /** Session name (alias for title) */
  name?: string;
  /** SSH session ID (returned from backend connect_ssh) */
  sshSessionId?: string;
  /** SSH config ID for reference */
  sshConfigId?: string;
  /** Docker exec session ID (returned from backend create_docker_exec) */
  dockerSessionId?: string;
  /** Docker container ID */
  dockerContainerId?: string;
}

/** Terminal creation options */
export interface TerminalCreateOptions {
  /** Initial working directory */
  cwd?: string;
  /** Shell to use */
  shell?: string;
  /** Terminal type */
  type?: TerminalType;
  /** Connection ID for SSH/Docker */
  connectionId?: string;
  /** Custom title */
  title?: string;
}

/** Terminal resize event */
export interface TerminalResizeEvent {
  sessionId: string;
  cols: number;
  rows: number;
  width: number;
  height: number;
}

/** Terminal data event (from backend to frontend) */
export interface TerminalDataEvent {
  sessionId: string;
  data: string;
}

/** Terminal input event (from frontend to backend) */
export interface TerminalInputEvent {
  sessionId: string;
  data: string;
}

/** PTY configuration */
export interface PtyConfig {
  /** Shell executable path */
  shell: string;
  /** Initial working directory */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Initial columns */
  cols?: number;
  /** Initial rows */
  rows?: number;
}

/** Split direction for terminal panes */
export type SplitDirection = 'horizontal' | 'vertical';

/** Split pane node in the layout tree */
export interface SplitPaneNode {
  id: string;
  type: 'split';
  direction: SplitDirection;
  children: [LayoutNode, LayoutNode];
  sizes: [number, number]; // Percentages that sum to 100
}

/** Terminal pane node in the layout tree */
export interface TerminalPaneNode {
  id: string;
  type: 'pane';
  sessionId: string;
}

/** Layout tree node (either split or terminal pane) */
export type LayoutNode = SplitPaneNode | TerminalPaneNode;

/** Terminal layout state */
export interface TerminalLayout {
  /** Root node of the layout tree */
  root: LayoutNode | null;
  /** ID of the currently focused pane */
  focusedPaneId: string | null;
}

/** Split pane info for store */
export interface SplitPane {
  id: string;
  sessionId: string;
  isActive: boolean;
}
