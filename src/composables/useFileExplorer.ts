/**
 * useFileExplorer - File explorer state and logic composable
 */
import { ref, computed, onMounted } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import { useFileExplorerStore } from '@/stores';
import * as fileService from '@/services/file.service';
import type { FileItem, DirectoryListOptions } from '@/types';

export interface UseFileExplorerOptions {
  /** Initial path to load */
  initialPath?: string;
  /** Auto-load on mount */
  autoLoad?: boolean;
  /** Show hidden files */
  showHidden?: boolean;
}

export interface UseFileExplorerReturn {
  // State
  currentPath: Ref<string>;
  files: ComputedRef<FileItem[]>;
  isLoading: Ref<boolean>;
  error: Ref<string | null>;
  searchQuery: Ref<string>;
  searchResults: Ref<FileItem[]>;
  isSearching: Ref<boolean>;
  expandedPaths: Ref<Set<string>>;
  selectedPath: Ref<string | null>;

  // Actions
  loadDirectory: (path: string) => Promise<void>;
  refresh: () => Promise<void>;
  navigateUp: () => Promise<void>;
  navigateTo: (path: string) => Promise<void>;
  toggleExpand: (path: string) => Promise<void>;
  selectFile: (path: string) => void;
  searchFiles: (query: string) => Promise<FileItem[]>;
  clearSearch: () => void;
  createDirectory: (name: string) => Promise<boolean>;
  createFile: (name: string) => Promise<boolean>;
  deleteItem: (path: string) => Promise<boolean>;
  renameItem: (oldPath: string, newName: string) => Promise<boolean>;
  copyPath: (source: string, destination: string) => Promise<boolean>;
  movePath: (source: string, destination: string) => Promise<boolean>;
  getFileContent: (path: string) => Promise<string>;
  saveFileContent: (path: string, content: string) => Promise<boolean>;

  // Helpers
  getChildren: (path: string) => FileItem[];
  isExpanded: (path: string) => boolean;
  isSelected: (path: string) => boolean;
  getParentPath: (path: string) => string;
}

export function useFileExplorer(options: UseFileExplorerOptions = {}): UseFileExplorerReturn {
  const {
    initialPath,
    autoLoad = true,
    showHidden = false,
  } = options;

  const store = useFileExplorerStore();

  // Local state
  const currentPath = ref<string>('');
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const searchQuery = ref('');
  const searchResults = ref<FileItem[]>([]);
  const isSearching = ref(false);
  const expandedPaths = ref<Set<string>>(new Set());
  const selectedPath = ref<string | null>(null);

  // List options
  const listOptions: DirectoryListOptions = {
    showHidden,
    sortBy: 'name',
    sortOrder: 'asc',
  };

  // Computed
  const files = computed(() => {
    return store.getChildren(currentPath.value);
  });

  // Load directory contents
  async function loadDirectory(path: string): Promise<void> {
    if (isLoading.value) return;

    isLoading.value = true;
    error.value = null;
    store.setLoading(path, true);

    try {
      const items = await fileService.listDirectory(path, listOptions);

      // Get icons for each item
      const itemsWithIcons = await Promise.all(
        items.map(async (item) => {
          if (!item.iconType) {
            try {
              item.iconType = await fileService.getFileIcon(item.path, item.type === 'directory');
            } catch {
              item.iconType = item.type === 'directory' ? 'folder' : 'file';
            }
          }
          return item;
        })
      );

      store.setCurrentPath(path);
      store.setFiles(path, itemsWithIcons);
      currentPath.value = path;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load directory';
      error.value = message;
      console.error('Failed to load directory:', e);
    } finally {
      isLoading.value = false;
      store.setLoading(path, false);
    }
  }

  // Refresh current directory
  async function refresh(): Promise<void> {
    if (currentPath.value) {
      await loadDirectory(currentPath.value);
    }
  }

  // Navigate up one level
  async function navigateUp(): Promise<void> {
    if (!currentPath.value) return;

    const parentPath = getParentPath(currentPath.value);
    if (parentPath && parentPath !== currentPath.value) {
      await loadDirectory(parentPath);
    }
  }

  // Navigate to path
  async function navigateTo(path: string): Promise<void> {
    await loadDirectory(path);
  }

  // Toggle directory expansion (for tree view)
  async function toggleExpand(path: string): Promise<void> {
    if (expandedPaths.value.has(path)) {
      expandedPaths.value.delete(path);
      store.setExpanded(path, false);
    } else {
      expandedPaths.value.add(path);
      store.setExpanded(path, true);

      // Load children if not already loaded
      const children = store.getChildren(path);
      if (children.length === 0) {
        store.setLoading(path, true);
        try {
          const items = await fileService.listDirectory(path, listOptions);
          const itemsWithIcons = await Promise.all(
            items.map(async (item) => {
              if (!item.iconType) {
                try {
                  item.iconType = await fileService.getFileIcon(item.path, item.type === 'directory');
                } catch {
                  item.iconType = item.type === 'directory' ? 'folder' : 'file';
                }
              }
              return item;
            })
          );
          store.setFiles(path, itemsWithIcons);
        } catch (e) {
          console.error('Failed to load children:', e);
        } finally {
          store.setLoading(path, false);
        }
      }
    }
  }

  // Select file
  function selectFile(path: string): void {
    selectedPath.value = path;
    store.selectFile(path);
  }

  // Search files
  async function searchFiles(query: string): Promise<FileItem[]> {
    if (!query.trim()) {
      clearSearch();
      return [];
    }

    searchQuery.value = query;
    isSearching.value = true;

    try {
      const basePath = currentPath.value || await fileService.getHomeDirectory();
      const results = await fileService.searchFiles(basePath, query, listOptions);

      // Get icons for search results
      const resultsWithIcons = await Promise.all(
        results.map(async (item) => {
          if (!item.iconType) {
            try {
              item.iconType = await fileService.getFileIcon(item.path, item.type === 'directory');
            } catch {
              item.iconType = item.type === 'directory' ? 'folder' : 'file';
            }
          }
          return item;
        })
      );

      searchResults.value = resultsWithIcons;
      return resultsWithIcons;
    } catch (e) {
      console.error('Search failed:', e);
      searchResults.value = [];
      return [];
    } finally {
      isSearching.value = false;
    }
  }

  // Clear search
  function clearSearch(): void {
    searchQuery.value = '';
    searchResults.value = [];
    store.setSearchQuery('');
  }

  // Create directory
  async function createDirectory(name: string): Promise<boolean> {
    if (!currentPath.value) return false;

    const newPath = `${currentPath.value}/${name}`.replace(/\\/g, '/');
    try {
      const result = await fileService.createDirectory(newPath);
      if (result.success) {
        await refresh();
        return true;
      }
      error.value = result.error || 'Failed to create directory';
      return false;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to create directory';
      return false;
    }
  }

  // Create file
  async function createFile(name: string): Promise<boolean> {
    if (!currentPath.value) return false;

    const newPath = `${currentPath.value}/${name}`.replace(/\\/g, '/');
    try {
      const result = await fileService.createFile(newPath);
      if (result.success) {
        await refresh();
        return true;
      }
      error.value = result.error || 'Failed to create file';
      return false;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to create file';
      return false;
    }
  }

  // Delete item
  async function deleteItem(path: string): Promise<boolean> {
    try {
      const result = await fileService.deletePath(path, true);
      if (result.success) {
        store.removeFile(path);
        await refresh();
        return true;
      }
      error.value = result.error || 'Failed to delete';
      return false;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to delete';
      return false;
    }
  }

  // Rename item
  async function renameItem(oldPath: string, newName: string): Promise<boolean> {
    const parentPath = getParentPath(oldPath);
    const newPath = `${parentPath}/${newName}`.replace(/\\/g, '/');

    try {
      const result = await fileService.renamePath(oldPath, newPath);
      if (result.success) {
        store.removeFile(oldPath);
        await refresh();
        return true;
      }
      error.value = result.error || 'Failed to rename';
      return false;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to rename';
      return false;
    }
  }

  // Copy path
  async function copyPath(source: string, destination: string): Promise<boolean> {
    try {
      const result = await fileService.copyPath(source, destination, false);
      if (result.success) {
        await refresh();
        return true;
      }
      error.value = result.error || 'Failed to copy';
      return false;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to copy';
      return false;
    }
  }

  // Move path
  async function movePath(source: string, destination: string): Promise<boolean> {
    try {
      const result = await fileService.movePath(source, destination, false);
      if (result.success) {
        store.removeFile(source);
        await refresh();
        return true;
      }
      error.value = result.error || 'Failed to move';
      return false;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to move';
      return false;
    }
  }

  // Get file content
  async function getFileContent(path: string): Promise<string> {
    return await fileService.readFile(path);
  }

  // Save file content
  async function saveFileContent(path: string, content: string): Promise<boolean> {
    try {
      const result = await fileService.writeFile(path, content);
      if (result.success) {
        return true;
      }
      error.value = result.error || 'Failed to save file';
      return false;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to save file';
      return false;
    }
  }

  // Helpers
  function getChildren(path: string): FileItem[] {
    return store.getChildren(path);
  }

  function isExpanded(path: string): boolean {
    return expandedPaths.value.has(path);
  }

  function isSelected(path: string): boolean {
    return selectedPath.value === path;
  }

  function getParentPath(path: string): string {
    const normalized = path.replace(/\\/g, '/');
    const lastSlash = normalized.lastIndexOf('/');
    if (lastSlash <= 0) {
      // On Windows, might be drive root like "C:/"
      const colonIndex = normalized.indexOf(':');
      if (colonIndex === 1 && lastSlash === 2) {
        return normalized.substring(0, 3);
      }
      return '/';
    }
    return normalized.substring(0, lastSlash) || '/';
  }

  // Initialize
  onMounted(async () => {
    if (autoLoad) {
      const path = initialPath || await fileService.getHomeDirectory();
      await loadDirectory(path);
    }
  });

  return {
    // State
    currentPath,
    files,
    isLoading,
    error,
    searchQuery,
    searchResults,
    isSearching,
    expandedPaths,
    selectedPath,

    // Actions
    loadDirectory,
    refresh,
    navigateUp,
    navigateTo,
    toggleExpand,
    selectFile,
    searchFiles,
    clearSearch,
    createDirectory,
    createFile,
    deleteItem,
    renameItem,
    copyPath,
    movePath,
    getFileContent,
    saveFileContent,

    // Helpers
    getChildren,
    isExpanded,
    isSelected,
    getParentPath,
  };
}
