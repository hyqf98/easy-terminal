/**
 * Base service types for IPC communication
 */

/** Generic API response from backend */
export interface ServiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  error_code?: string;
}

/** Invoke options */
export interface InvokeOptions {
  /** Timeout in milliseconds */
  timeout?: number;
}

/** Error class for service errors */
export class ServiceError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
  }
}
