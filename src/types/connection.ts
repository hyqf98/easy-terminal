/**
 * Connection related type definitions (SSH, Docker, etc.)
 */

/** Connection type */
export type ConnectionType = 'ssh' | 'docker';

/** Authentication type for SSH */
export type SshAuthType = 'password' | 'key' | 'agent';

/** Connection status */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/** Base connection configuration */
export interface ConnectionConfig {
  /** Connection ID */
  id: string;
  /** Connection name */
  name: string;
  /** Connection type */
  type: ConnectionType;
  /** Whether it's a favorite */
  isFavorite: boolean;
  /** Last connected timestamp */
  lastConnectedAt?: number;
  /** Created timestamp */
  createdAt: number;
}

/** SSH connection configuration */
export interface SshConnectionConfig extends ConnectionConfig {
  type: 'ssh';
  /** Host address */
  host: string;
  /** Port number */
  port: number;
  /** Username */
  username: string;
  /** Authentication type */
  authType: SshAuthType;
  /** Password (encrypted) */
  password?: string;
  /** Private key path */
  privateKeyPath?: string;
  /** Private key passphrase */
  passphrase?: string;
  /** Default working directory */
  cwd?: string;
}

/** Docker connection configuration */
export interface DockerConnectionConfig extends ConnectionConfig {
  type: 'docker';
  /** Container ID */
  containerId: string;
  /** Container name */
  containerName: string;
  /** Docker host (for remote) */
  dockerHost?: string;
  /** Default shell */
  shell?: string;
  /** Default working directory */
  cwd?: string;
}

/** Union type for all connection configs */
export type AnyConnectionConfig = SshConnectionConfig | DockerConnectionConfig;

/** Connection state */
export interface ConnectionState {
  /** Connection configuration */
  config: AnyConnectionConfig;
  /** Current status */
  status: ConnectionStatus;
  /** Error message */
  error?: string;
  /** Connected timestamp */
  connectedAt?: number;
}

/** SSH connection test result */
export interface SshTestResult {
  success: boolean;
  error?: string;
  serverVersion?: string;
  banner?: string;
}

// ==================== Docker Types ====================

/** Docker port mapping */
export interface DockerPortMapping {
  private_port: number;
  public_port?: number;
  ip?: string;
  protocol: string;
}

/** Docker container info */
export interface DockerContainer {
  /** Container ID (short) */
  id: string;
  /** Full container ID */
  full_id: string;
  /** Container names */
  names: string[];
  /** Container image */
  image: string;
  /** Image ID */
  image_id: string;
  /** Container status text */
  status: string;
  /** Container state (running, exited, etc.) */
  state: string;
  /** Created timestamp */
  created: number;
  /** Port mappings */
  ports: DockerPortMapping[];
  /** Whether container is running */
  is_running: boolean;
}

/** Docker image info */
export interface DockerImage {
  id: string;
  repo_tags: string[];
  size: number;
  created: number;
}

/** Docker container operation result */
export interface DockerOperationResult {
  success: boolean;
  container_id: string;
  error?: string;
}
