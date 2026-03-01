/**
 * File system related type definitions
 */

/** File type */
export type FileType = 'file' | 'directory' | 'symlink' | 'unknown';

/** File item */
export interface FileItem {
  /** Full path */
  path: string;
  /** File name */
  name: string;
  /** File type */
  type: FileType;
  /** File size in bytes */
  size: number;
  /** Last modified timestamp */
  modifiedAt: number;
  /** Created timestamp */
  createdAt?: number;
  /** Whether it's a hidden file */
  isHidden: boolean;
  /** Whether it's read-only */
  isReadOnly: boolean;
  /** File extension (for files) */
  extension?: string;
  /** Icon type for rendering */
  iconType?: string;
  /** Whether the directory is expanded */
  isExpanded?: boolean;
  /** Whether the directory is loading */
  isLoading?: boolean;
  /** Child items (for directories) */
  children?: FileItem[];
}

/** Directory listing options */
export interface DirectoryListOptions {
  /** Show hidden files */
  showHidden?: boolean;
  /** Sort by field */
  sortBy?: 'name' | 'size' | 'modifiedAt' | 'type';
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
  /** Filter pattern */
  filter?: string;
}

/** File operation result */
export interface FileOperationResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

/** File copy/move options */
export interface FileCopyOptions {
  /** Source path */
  source: string;
  /** Destination path */
  destination: string;
  /** Overwrite if exists */
  overwrite?: boolean;
}

/** File search options */
export interface FileSearchOptions {
  /** Search pattern */
  pattern: string;
  /** Base directory */
  basePath?: string;
  /** Case sensitive */
  caseSensitive?: boolean;
  /** Include hidden files */
  includeHidden?: boolean;
  /** Max results */
  maxResults?: number;
}

/** File watch event type */
export type FileWatchEventType = 'created' | 'modified' | 'deleted' | 'renamed';

/** File watch event */
export interface FileWatchEvent {
  /** Event type */
  type: FileWatchEventType;
  /** Affected path */
  path: string;
  /** New path (for rename events) */
  newPath?: string;
}
