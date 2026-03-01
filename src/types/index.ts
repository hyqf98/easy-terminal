/**
 * Common type definitions
 */

/** API response wrapper */
export interface ApiResponse<T = unknown> {
  /** Whether the request was successful */
  success: boolean;
  /** Response data */
  data?: T;
  /** Error message */
  error?: string;
  /** Error code */
  errorCode?: string;
}

/** Async function result */
export type AsyncResult<T, E = Error> = {
  success: true;
  data: T;
} | {
  success: false;
  error: E;
};

/** Nullable type */
export type Nullable<T> = T | null;

/** Optional type */
export type Optional<T> = T | undefined;

/** ID type */
export type ID = string;

/** Timestamp type */
export type Timestamp = number;

/** Re-export all types */
export * from './terminal';
export * from './file';
export * from './connection';
export * from './settings';
export * from './suggestion';
export * from './shortcut';
