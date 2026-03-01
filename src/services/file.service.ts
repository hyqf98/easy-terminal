/**
 * File service - Handles file system IPC calls
 */
import { invokeCommand } from './base';
import type { FileItem, DirectoryListOptions, FileOperationResult } from '@/types';

/** List directory contents */
export async function listDirectory(
  path: string,
  options?: DirectoryListOptions
): Promise<FileItem[]> {
  return invokeCommand<FileItem[]>('list_directory', { path, options });
}

/** Get file info */
export async function getFileInfo(path: string): Promise<FileItem> {
  return invokeCommand<FileItem>('get_file_info', { path });
}

/** Create directory */
export async function createDirectory(path: string): Promise<FileOperationResult> {
  return invokeCommand<FileOperationResult>('create_directory', { path });
}

/** Create file */
export async function createFile(path: string): Promise<FileOperationResult> {
  return invokeCommand<FileOperationResult>('create_file', { path });
}

/** Delete file or directory */
export async function deletePath(
  path: string,
  useTrash = true
): Promise<FileOperationResult> {
  return invokeCommand<FileOperationResult>('delete_path', { path, useTrash });
}

/** Rename file or directory */
export async function renamePath(
  oldPath: string,
  newPath: string
): Promise<FileOperationResult> {
  return invokeCommand<FileOperationResult>('rename_path', { oldPath, newPath });
}

/** Copy file or directory */
export async function copyPath(
  source: string,
  destination: string,
  overwrite = false
): Promise<FileOperationResult> {
  return invokeCommand<FileOperationResult>('copy_path', {
    source,
    destination,
    overwrite,
  });
}

/** Move file or directory */
export async function movePath(
  source: string,
  destination: string,
  overwrite = false
): Promise<FileOperationResult> {
  return invokeCommand<FileOperationResult>('move_path', {
    source,
    destination,
    overwrite,
  });
}

/** Search for files */
export async function searchFiles(
  basePath: string,
  pattern: string,
  options?: DirectoryListOptions
): Promise<FileItem[]> {
  return invokeCommand<FileItem[]>('search_files', { basePath, pattern, options });
}

/** Get file icon type */
export async function getFileIcon(path: string, isDir: boolean): Promise<string> {
  return invokeCommand<string>('get_file_icon', { path, isDir });
}

/** Read file content */
export async function readFile(path: string): Promise<string> {
  return invokeCommand<string>('read_file', { path });
}

/** Write file content */
export async function writeFile(
  path: string,
  content: string
): Promise<FileOperationResult> {
  return invokeCommand<FileOperationResult>('write_file', { path, content });
}

/** Check if path exists */
export async function pathExists(path: string): Promise<boolean> {
  return invokeCommand<boolean>('path_exists', { path });
}

/** Get home directory */
export async function getHomeDirectory(): Promise<string> {
  return invokeCommand<string>('get_home_directory');
}

/** Get default terminal directory */
export async function getDefaultDirectory(): Promise<string> {
  return invokeCommand<string>('get_default_directory');
}

/** Start watching a directory for changes */
export async function watchDirectory(path: string): Promise<void> {
  return invokeCommand<void>('watch_directory', { path });
}

/** Stop watching a directory */
export async function unwatchDirectory(path: string): Promise<void> {
  return invokeCommand<void>('unwatch_directory', { path });
}
