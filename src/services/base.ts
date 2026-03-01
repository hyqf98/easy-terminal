/**
 * Base IPC service - Provides typed invoke wrapper
 */
import { invoke } from '@tauri-apps/api/core';
import type { ServiceResponse, InvokeOptions } from './types';
import { ServiceError } from './types';

/**
 * Type-safe wrapper around Tauri invoke
 */
export async function invokeCommand<T>(
  cmd: string,
  args?: Record<string, unknown>,
  _options?: InvokeOptions
): Promise<T> {
  try {
    const result = await invoke<ServiceResponse<T>>(cmd, args);

    if (!result.success) {
      throw new ServiceError(
        result.error ?? 'Unknown error',
        result.error_code
      );
    }

    return result.data as T;
  } catch (error) {
    if (error instanceof ServiceError) {
      throw error;
    }
    // Handle Tauri errors
    const message = error instanceof Error ? error.message : String(error);
    throw new ServiceError(message);
  }
}

/**
 * Invoke with timeout
 */
export async function invokeWithTimeout<T>(
  cmd: string,
  args: Record<string, unknown> | undefined,
  timeout: number
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new ServiceError('Request timeout', 'TIMEOUT')), timeout);
  });

  return Promise.race([
    invokeCommand<T>(cmd, args),
    timeoutPromise,
  ]);
}
