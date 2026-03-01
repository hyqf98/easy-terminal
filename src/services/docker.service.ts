/**
 * Docker service - Handles Docker IPC calls
 */
import { invokeCommand } from './base';
import type { DockerContainer, DockerImage, DockerOperationResult } from '@/types';

/** Connect to Docker daemon */
export async function connectDocker(): Promise<boolean> {
  return invokeCommand<boolean>('connect_docker');
}

/** Check if Docker is connected */
export async function isDockerConnected(): Promise<boolean> {
  return invokeCommand<boolean>('is_docker_connected');
}

/** List Docker containers */
export async function listDockerContainers(all: boolean = false): Promise<DockerContainer[]> {
  return invokeCommand<DockerContainer[]>('list_docker_containers', { all });
}

/** List Docker images */
export async function listDockerImages(): Promise<DockerImage[]> {
  return invokeCommand<DockerImage[]>('list_docker_images');
}

/** Start a Docker container */
export async function startDockerContainer(
  containerId: string
): Promise<DockerOperationResult> {
  return invokeCommand<DockerOperationResult>('start_docker_container', { containerId });
}

/** Stop a Docker container */
export async function stopDockerContainer(
  containerId: string
): Promise<DockerOperationResult> {
  return invokeCommand<DockerOperationResult>('stop_docker_container', { containerId });
}

/** Restart a Docker container */
export async function restartDockerContainer(
  containerId: string
): Promise<DockerOperationResult> {
  return invokeCommand<DockerOperationResult>('restart_docker_container', { containerId });
}

/** Get container info by ID */
export async function getDockerContainer(
  containerId: string
): Promise<DockerContainer | null> {
  return invokeCommand<DockerContainer | null>('get_docker_container', { containerId });
}

/** Create exec session in a container */
export async function createDockerExec(
  containerId: string,
  cols: number = 80,
  rows: number = 24
): Promise<string> {
  return invokeCommand<string>('create_docker_exec', { containerId, cols, rows });
}

/** Send input to Docker exec session */
export async function dockerExecInput(
  sessionId: string,
  data: string
): Promise<void> {
  return invokeCommand<void>('docker_exec_input', { sessionId, data });
}

/** Resize Docker exec terminal */
export async function resizeDockerExec(
  sessionId: string,
  cols: number,
  rows: number
): Promise<void> {
  return invokeCommand<void>('resize_docker_exec', { sessionId, cols, rows });
}

/** Disconnect Docker exec session */
export async function disconnectDockerExec(sessionId: string): Promise<void> {
  return invokeCommand<void>('disconnect_docker_exec', { sessionId });
}

/** Get Docker exec session status */
export async function getDockerExecStatus(sessionId: string): Promise<string> {
  return invokeCommand<string>('get_docker_exec_status', { sessionId });
}

/** Get all active Docker exec sessions */
export async function getDockerExecSessions(): Promise<string[]> {
  return invokeCommand<string[]>('get_docker_exec_sessions');
}

/** Disconnect from Docker daemon */
export async function disconnectDocker(): Promise<void> {
  return invokeCommand<void>('disconnect_docker');
}
