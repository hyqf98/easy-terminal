/**
 * File Explorer store - Manages file explorer state
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { FileItem, DirectoryListOptions } from '@/types';

export const useFileExplorerStore = defineStore('fileExplorer', () => {
  // State
  const currentPath = ref<string>('');
  const files = ref<Map<string, FileItem>>(new Map());
  const expandedPaths = ref<Set<string>>(new Set());
  const selectedPaths = ref<Set<string>>(new Set());
  const loadingPaths = ref<Set<string>>(new Set());
  const searchQuery = ref<string>('');
  const listOptions = ref<DirectoryListOptions>({
    showHidden: false,
    sortBy: 'name',
    sortOrder: 'asc',
  });

  // Getters
  const rootFiles = computed(() => {
    const result: FileItem[] = [];
    // Get all files that are direct children of current path
    for (const file of files.value.values()) {
      if (file.path === currentPath.value) continue;
      const parentPath = file.path.substring(0, file.path.lastIndexOf('/'));
      if (parentPath === currentPath.value || (currentPath.value === '' && !file.path.includes('/'))) {
        result.push(file);
      }
    }
    return sortFiles(result);
  });

  const selectedFiles = computed(() => {
    return Array.from(selectedPaths.value)
      .map(path => files.value.get(path))
      .filter((f): f is FileItem => f !== undefined);
  });

  const isLoading = computed(() => loadingPaths.value.size > 0);

  // Helper: Sort files
  function sortFiles(fileList: FileItem[]): FileItem[] {
    const { sortBy, sortOrder } = listOptions.value;
    return [...fileList].sort((a, b) => {
      // Directories first
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;

      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'modifiedAt':
          comparison = a.modifiedAt - b.modifiedAt;
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  // Actions
  function setCurrentPath(path: string): void {
    currentPath.value = path;
    // Clear selection when changing path
    selectedPaths.value.clear();
  }

  function setFiles(path: string, fileList: FileItem[]): void {
    // Clear existing files for this path's children
    for (const file of files.value.values()) {
      if (file.path.startsWith(path + '/')) {
        files.value.delete(file.path);
      }
    }
    // Add new files
    for (const file of fileList) {
      files.value.set(file.path, file);
    }
    loadingPaths.value.delete(path);
  }

  function addFile(file: FileItem): void {
    files.value.set(file.path, file);
  }

  function updateFile(path: string, updates: Partial<FileItem>): void {
    const file = files.value.get(path);
    if (file) {
      Object.assign(file, updates);
    }
  }

  function removeFile(path: string): void {
    files.value.delete(path);
    expandedPaths.value.delete(path);
    selectedPaths.value.delete(path);
    // Remove all children
    for (const file of files.value.values()) {
      if (file.path.startsWith(path + '/')) {
        files.value.delete(file.path);
      }
    }
  }

  function toggleExpanded(path: string): void {
    if (expandedPaths.value.has(path)) {
      expandedPaths.value.delete(path);
    } else {
      expandedPaths.value.add(path);
    }
  }

  function setExpanded(path: string, expanded: boolean): void {
    if (expanded) {
      expandedPaths.value.add(path);
    } else {
      expandedPaths.value.delete(path);
    }
  }

  function selectFile(path: string, addToSelection = false): void {
    if (addToSelection) {
      if (selectedPaths.value.has(path)) {
        selectedPaths.value.delete(path);
      } else {
        selectedPaths.value.add(path);
      }
    } else {
      selectedPaths.value.clear();
      selectedPaths.value.add(path);
    }
  }

  function selectRange(startPath: string, endPath: string): void {
    // Find all paths between start and end
    const allPaths = Array.from(files.value.keys()).sort();
    const startIndex = allPaths.indexOf(startPath);
    const endIndex = allPaths.indexOf(endPath);
    if (startIndex === -1 || endIndex === -1) return;

    const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
    selectedPaths.value.clear();
    for (let i = from; i <= to; i++) {
      selectedPaths.value.add(allPaths[i]);
    }
  }

  function clearSelection(): void {
    selectedPaths.value.clear();
  }

  function setLoading(path: string, loading: boolean): void {
    if (loading) {
      loadingPaths.value.add(path);
    } else {
      loadingPaths.value.delete(path);
    }
  }

  function setSearchQuery(query: string): void {
    searchQuery.value = query;
  }

  function setListOptions(options: Partial<DirectoryListOptions>): void {
    Object.assign(listOptions.value, options);
  }

  function getFile(path: string): FileItem | undefined {
    return files.value.get(path);
  }

  function getChildren(path: string): FileItem[] {
    const children: FileItem[] = [];
    for (const file of files.value.values()) {
      const parentPath = file.path.substring(0, file.path.lastIndexOf('/'));
      if (parentPath === path) {
        children.push(file);
      }
    }
    return sortFiles(children);
  }

  return {
    // State
    currentPath,
    files,
    expandedPaths,
    selectedPaths,
    loadingPaths,
    searchQuery,
    listOptions,
    // Getters
    rootFiles,
    selectedFiles,
    isLoading,
    // Actions
    setCurrentPath,
    setFiles,
    addFile,
    updateFile,
    removeFile,
    toggleExpanded,
    setExpanded,
    selectFile,
    selectRange,
    clearSelection,
    setLoading,
    setSearchQuery,
    setListOptions,
    getFile,
    getChildren,
  };
});
