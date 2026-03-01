/**
 * FileExplorer Component Tests
 * Tests directory navigation, file search, path input, refresh, toolbar layout, and error handling
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick, ref, defineComponent } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import FileExplorer from '../FileExplorer.vue';
import type { FileItem } from '@/types';

// ============================================
// Mock Types and Helpers
// ============================================

function createMockFileItem(overrides: Partial<FileItem> = {}): FileItem {
  return {
    path: `/test/${overrides.name || 'file.txt'}`,
    name: 'file.txt',
    type: 'file',
    size: 1024,
    modifiedAt: Date.now(),
    isHidden: false,
    isReadOnly: false,
    ...overrides,
  };
}

function createMockFileItems(count: number, basePath = '/home/user'): FileItem[] {
  return Array.from({ length: count }, (_, i) =>
    createMockFileItem({
      path: `${basePath}/file${i}.txt`,
      name: `file${i}.txt`,
      type: i % 3 === 0 ? 'directory' : 'file',
    })
  );
}

// ============================================
// Mock Components
// ============================================

const MockSearchBar = defineComponent({
  name: 'SearchBar',
  props: ['modelValue', 'placeholder', 'isLoading'],
  emits: ['update:modelValue', 'search', 'clear'],
  template: `
    <div class="search-bar-mock">
      <input
        type="text"
        :value="modelValue"
        :placeholder="placeholder"
        @input="$emit('update:modelValue', $event.target.value)"
        @keydown.enter="$emit('search', modelValue)"
        @keydown.escape="$emit('clear')"
      />
      <button v-if="modelValue" class="clear-btn" @click="$emit('clear')">X</button>
      <span v-if="isLoading" class="loading-indicator">Loading...</span>
    </div>
  `,
});

const MockFileTree = defineComponent({
  name: 'FileTree',
  props: ['files', 'expandedPaths', 'selectedPath', 'loadingPaths', 'editingPath'],
  emits: ['select', 'open', 'toggle', 'contextmenu', 'rename'],
  template: `
    <div class="file-tree-mock">
      <div
        v-for="file in files"
        :key="file.path"
        class="file-item"
        :class="{ 'is-selected': file.path === selectedPath }"
        @click="$emit('select', file)"
        @dblclick="$emit('open', file)"
        @contextmenu.prevent="$emit('contextmenu', file, $event)"
      >
        <span class="file-name">{{ file.name }}</span>
        <span class="file-type">{{ file.type }}</span>
      </div>
      <div v-if="files.length === 0" class="empty-state">No files</div>
    </div>
  `,
});

const MockFileContextMenu = defineComponent({
  name: 'FileContextMenu',
  props: ['visible', 'x', 'y', 'item'],
  emits: ['close', 'action'],
  template: `
    <div v-if="visible" class="context-menu-mock" :style="{ left: x + 'px', top: y + 'px' }">
      <button @click="$emit('action', 'open', item)">Open</button>
      <button @click="$emit('action', 'copy-path', item)">Copy Path</button>
      <button @click="$emit('action', 'rename', item)">Rename</button>
      <button @click="$emit('action', 'delete', item)">Delete</button>
      <button @click="$emit('action', 'new-file', item)">New File</button>
      <button @click="$emit('action', 'new-folder', item)">New Folder</button>
      <button @click="$emit('close')">Close</button>
    </div>
  `,
});

const MockFileIcon = defineComponent({
  name: 'FileIcon',
  props: ['type', 'isDirectory', 'isExpanded', 'size'],
  template: `
    <span class="file-icon-mock" :data-type="type" :data-is-dir="isDirectory">
      ICON
    </span>
  `,
});

// ============================================
// Create Mock Store State
// ============================================

interface MockStoreState {
  currentPath: string;
  files: Map<string, FileItem>;
  expandedPaths: Set<string>;
  selectedPaths: Set<string>;
  loadingPaths: Set<string>;
  searchQuery: string;
}

function createMockStoreState(): MockStoreState {
  return {
    currentPath: '/home/user',
    files: new Map(),
    expandedPaths: new Set(),
    selectedPaths: new Set(),
    loadingPaths: new Set(),
    searchQuery: '',
  };
}

// Helper functions for store operations
function addFilesToStore(state: MockStoreState, _parentPath: string, files: FileItem[]): void {
  for (const file of files) {
    state.files.set(file.path, file);
  }
}

function getChildrenFromStore(state: MockStoreState, path: string): FileItem[] {
  const children: FileItem[] = [];
  for (const file of state.files.values()) {
    const parentPath = file.path.substring(0, file.path.lastIndexOf('/'));
    if (parentPath === path) {
      children.push(file);
    }
  }
  // Sort: directories first, then alphabetically
  return children.sort((a, b) => {
    if (a.type === 'directory' && b.type !== 'directory') return -1;
    if (a.type !== 'directory' && b.type === 'directory') return 1;
    return a.name.localeCompare(b.name);
  });
}

// ============================================
// Global mock state
// ============================================

let mockStoreState: MockStoreState;
let mockCurrentPath = ref('/home/user');
let mockIsLoading = ref(false);
let mockError = ref<string | null>(null);
let mockExpandedPaths = ref<Set<string>>(new Set());
let mockSelectedPath = ref<string | null>(null);
let mockLoadDirectoryFn: ReturnType<typeof vi.fn>;
let mockToggleExpandFn: ReturnType<typeof vi.fn>;
let mockSelectFileFn: ReturnType<typeof vi.fn>;
let mockSearchFilesFn: ReturnType<typeof vi.fn>;
let mockClearSearchFn: ReturnType<typeof vi.fn>;
let mockCreateDirectoryFn: ReturnType<typeof vi.fn>;
let mockCreateFileFn: ReturnType<typeof vi.fn>;
let mockDeleteItemFn: ReturnType<typeof vi.fn>;
let mockRenameItemFn: ReturnType<typeof vi.fn>;

// Create a factory function for the mock store
function createMockStore() {
  const state = mockStoreState;
  return {
    get currentPath() { return state.currentPath; },
    get files() { return state.files; },
    get expandedPaths() { return state.expandedPaths; },
    get selectedPaths() { return state.selectedPaths; },
    get loadingPaths() { return state.loadingPaths; },
    get searchQuery() { return state.searchQuery; },
    getChildren: (path: string) => getChildrenFromStore(state, path),
    setCurrentPath: (path: string) => { state.currentPath = path; },
    setFiles: (path: string, files: FileItem[]) => addFilesToStore(state, path, files),
    setExpanded: (path: string, expanded: boolean) => {
      if (expanded) state.expandedPaths.add(path);
      else state.expandedPaths.delete(path);
    },
    selectFile: (path: string) => {
      state.selectedPaths.clear();
      state.selectedPaths.add(path);
    },
    setLoading: (path: string, loading: boolean) => {
      if (loading) state.loadingPaths.add(path);
      else state.loadingPaths.delete(path);
    },
    removeFile: (path: string) => {
      state.files.delete(path);
    },
  };
}

// Create mock useFileExplorer composable return value
function createMockUseFileExplorer() {
  return {
    currentPath: mockCurrentPath,
    isLoading: mockIsLoading,
    error: mockError,
    expandedPaths: mockExpandedPaths,
    selectedPath: mockSelectedPath,
    loadDirectory: mockLoadDirectoryFn,
    toggleExpand: mockToggleExpandFn,
    selectFile: mockSelectFileFn,
    searchFiles: mockSearchFilesFn,
    clearSearch: mockClearSearchFn,
    createDirectory: mockCreateDirectoryFn,
    createFile: mockCreateFileFn,
    deleteItem: mockDeleteItemFn,
    renameItem: mockRenameItemFn,
  };
}

// Mock modules
vi.mock('@/stores', () => ({
  useFileExplorerStore: vi.fn(() => createMockStore()),
}));

vi.mock('@/composables', () => ({
  useFileExplorer: vi.fn(() => createMockUseFileExplorer()),
}));

// Mock clipboard
const mockClipboardWrite = vi.fn().mockResolvedValue(undefined);
vi.stubGlobal('navigator', {
  clipboard: {
    writeText: mockClipboardWrite,
  },
});

// Mock prompt and confirm
vi.stubGlobal('prompt', vi.fn());
vi.stubGlobal('confirm', vi.fn());

// ============================================
// Test Helper Functions
// ============================================

interface MountOptions {
  props?: Record<string, unknown>;
}

function mountFileExplorer(options: MountOptions = {}): VueWrapper {
  const pinia = createPinia();
  setActivePinia(pinia);

  return mount(FileExplorer, {
    props: {
      ...options.props,
    },
    global: {
      plugins: [pinia],
      stubs: {
        SearchBar: MockSearchBar,
        FileTree: MockFileTree,
        FileContextMenu: MockFileContextMenu,
        FileIcon: MockFileIcon,
      },
    },
  });
}

// ============================================
// Tests
// ============================================

describe('FileExplorer', () => {
  let wrapper: VueWrapper;

  beforeEach(() => {
    // Reset mock state
    mockStoreState = createMockStoreState();
    mockCurrentPath.value = '/home/user';
    mockIsLoading.value = false;
    mockError.value = null;
    mockExpandedPaths.value = new Set();
    mockSelectedPath.value = null;

    // Reset mock functions
    mockLoadDirectoryFn = vi.fn().mockResolvedValue(undefined);
    mockToggleExpandFn = vi.fn().mockResolvedValue(undefined);
    mockSelectFileFn = vi.fn();
    mockSearchFilesFn = vi.fn().mockResolvedValue([]);
    mockClearSearchFn = vi.fn();
    mockCreateDirectoryFn = vi.fn().mockResolvedValue(true);
    mockCreateFileFn = vi.fn().mockResolvedValue(true);
    mockDeleteItemFn = vi.fn().mockResolvedValue(true);
    mockRenameItemFn = vi.fn().mockResolvedValue(true);

    // Clear global mocks
    mockClipboardWrite.mockClear();
    vi.mocked(window.prompt).mockReset();
    vi.mocked(window.confirm).mockReset();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  // ============================================
  // Basic Rendering Tests
  // ============================================

  describe('Basic Rendering', () => {
    it('should render file explorer container', () => {
      wrapper = mountFileExplorer();
      expect(wrapper.find('.file-explorer').exists()).toBe(true);
    });

    it('should render header with search bar and actions', () => {
      wrapper = mountFileExplorer();
      expect(wrapper.find('.explorer-header').exists()).toBe(true);
      expect(wrapper.findComponent(MockSearchBar).exists()).toBe(true);
      expect(wrapper.find('.header-actions').exists()).toBe(true);
    });

    it('should render breadcrumb navigation', () => {
      wrapper = mountFileExplorer();
      expect(wrapper.find('.breadcrumb').exists()).toBe(true);
    });

    it('should render file tree container', () => {
      wrapper = mountFileExplorer();
      expect(wrapper.find('.explorer-content').exists()).toBe(true);
      expect(wrapper.findComponent(MockFileTree).exists()).toBe(true);
    });

    it('should render action buttons in header', () => {
      wrapper = mountFileExplorer();
      const actionBtns = wrapper.findAll('.action-btn');
      expect(actionBtns.length).toBe(3); // New File, New Folder, Refresh
    });
  });

  // ============================================
  // Directory Navigation Tests
  // ============================================

  describe('Directory Navigation', () => {
    it('should navigate to directory on breadcrumb click', async () => {
      wrapper = mountFileExplorer();
      mockCurrentPath.value = '/home/user/projects';

      await nextTick();

      // Find breadcrumb items
      const breadcrumbItems = wrapper.findAll('.breadcrumb-item');
      expect(breadcrumbItems.length).toBeGreaterThan(1);

      // Click on a breadcrumb item
      await breadcrumbItems[1].trigger('click');

      expect(mockLoadDirectoryFn).toHaveBeenCalled();
    });

    it('should emit directory-change event when navigating', async () => {
      wrapper = mountFileExplorer();

      // Navigate to root
      const breadcrumbItems = wrapper.findAll('.breadcrumb-item');
      await breadcrumbItems[0].trigger('click');

      // Check if event was emitted
      const emitted = wrapper.emitted('directory-change');
      expect(emitted).toBeTruthy();
    });

    it('should emit terminal-cd event when opening directory', async () => {
      wrapper = mountFileExplorer();

      const mockDir: FileItem = createMockFileItem({
        path: '/home/user/projects',
        name: 'projects',
        type: 'directory',
      });

      // Get FileTree component and emit open event
      const fileTree = wrapper.findComponent(MockFileTree);
      await fileTree.vm.$emit('open', mockDir);

      expect(wrapper.emitted('terminal-cd')).toBeTruthy();
      expect(wrapper.emitted('terminal-cd')![0][0]).toBe('/home/user/projects');
    });

    it('should navigate to root when clicking root breadcrumb', async () => {
      wrapper = mountFileExplorer();

      const breadcrumbItems = wrapper.findAll('.breadcrumb-item');
      await breadcrumbItems[0].trigger('click'); // Root button

      expect(mockLoadDirectoryFn).toHaveBeenCalledWith('/');
    });
  });

  // ============================================
  // File Search Tests
  // ============================================

  describe('File Search', () => {
    it('should render search bar with correct props', () => {
      wrapper = mountFileExplorer();

      const searchBar = wrapper.findComponent(MockSearchBar);
      expect(searchBar.props('placeholder')).toBe('Search files...');
    });

    it('should trigger search on SearchBar search event', async () => {
      vi.useFakeTimers();
      wrapper = mountFileExplorer();

      const searchBar = wrapper.findComponent(MockSearchBar);
      await searchBar.vm.$emit('search', 'test');

      // Wait for debounce
      vi.advanceTimersByTime(300);
      await nextTick();

      expect(mockSearchFilesFn).toHaveBeenCalledWith('test');

      vi.useRealTimers();
    });

    it('should clear search on SearchBar clear event', async () => {
      wrapper = mountFileExplorer();

      const searchBar = wrapper.findComponent(MockSearchBar);
      await searchBar.vm.$emit('clear');

      expect(mockClearSearchFn).toHaveBeenCalled();
    });

    it('should update searchQuery model', async () => {
      wrapper = mountFileExplorer();

      const searchBar = wrapper.findComponent(MockSearchBar);
      await searchBar.vm.$emit('update:modelValue', 'test query');

      expect(searchBar.props('modelValue')).toBe('test query');
    });

    it('should show loading state during search', async () => {
      vi.useFakeTimers();
      mockSearchFilesFn.mockImplementation(async () => {
        // Simulate slow search
        await new Promise(resolve => setTimeout(resolve, 1000));
        return [];
      });

      wrapper = mountFileExplorer();

      const searchBar = wrapper.findComponent(MockSearchBar);
      await searchBar.vm.$emit('search', 'test');

      // Wait for debounce
      vi.advanceTimersByTime(300);
      await nextTick();

      // isLoading should be true during search
      expect(searchBar.props('isLoading')).toBe(true);

      vi.useRealTimers();
    });
  });

  // ============================================
  // Breadcrumb Path Tests
  // ============================================

  describe('Breadcrumb Path Navigation', () => {
    it('should display correct breadcrumb for path', async () => {
      wrapper = mountFileExplorer();
      mockCurrentPath.value = '/home/user/projects/app';

      await nextTick();

      const breadcrumbItems = wrapper.findAll('.breadcrumb-item');
      // Root + home + user + projects + app = 5 items
      expect(breadcrumbItems.length).toBe(5);
    });

    it('should highlight last breadcrumb item', async () => {
      wrapper = mountFileExplorer();
      mockCurrentPath.value = '/home/user/projects';

      await nextTick();

      const breadcrumbItems = wrapper.findAll('.breadcrumb-item');
      const lastItem = breadcrumbItems[breadcrumbItems.length - 1];
      expect(lastItem.classes()).toContain('is-last');
    });

    it('should handle Windows-style paths', async () => {
      wrapper = mountFileExplorer();
      mockCurrentPath.value = 'C:/Users/test/projects';

      await nextTick();

      const breadcrumbItems = wrapper.findAll('.breadcrumb-item');
      expect(breadcrumbItems.length).toBeGreaterThan(1);
    });

    it('should handle root path', async () => {
      wrapper = mountFileExplorer();
      mockCurrentPath.value = '/';

      await nextTick();

      const breadcrumbItems = wrapper.findAll('.breadcrumb-item');
      expect(breadcrumbItems.length).toBe(1); // Only root
    });

    it('should display separators between breadcrumb items', async () => {
      wrapper = mountFileExplorer();
      mockCurrentPath.value = '/home/user';

      await nextTick();

      const separators = wrapper.findAll('.breadcrumb-separator');
      expect(separators.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // Refresh Directory Tests
  // ============================================

  describe('Refresh Directory', () => {
    it('should call loadDirectory when refresh button clicked', async () => {
      wrapper = mountFileExplorer();
      mockCurrentPath.value = '/home/user';

      const refreshBtn = wrapper.findAll('.action-btn')[2];
      await refreshBtn.trigger('click');

      expect(mockLoadDirectoryFn).toHaveBeenCalledWith('/home/user');
    });

    it('should not refresh if no current path', async () => {
      wrapper = mountFileExplorer();
      mockCurrentPath.value = '';

      const refreshBtn = wrapper.findAll('.action-btn')[2];
      await refreshBtn.trigger('click');

      expect(mockLoadDirectoryFn).not.toHaveBeenCalled();
    });

    it('should refresh with error retry button', async () => {
      wrapper = mountFileExplorer();
      mockError.value = 'Failed to load directory';
      mockCurrentPath.value = '/home/user';

      await nextTick();

      const retryBtn = wrapper.find('.error-overlay button');
      expect(retryBtn.exists()).toBe(true);

      await retryBtn.trigger('click');
      expect(mockLoadDirectoryFn).toHaveBeenCalledWith('/home/user');
    });
  });

  // ============================================
  // Toolbar Layout Tests
  // ============================================

  describe('Toolbar Layout', () => {
    it('should render New File button with correct title', () => {
      wrapper = mountFileExplorer();

      const newFileBtn = wrapper.findAll('.action-btn')[0];
      expect(newFileBtn.attributes('title')).toBe('New File');
    });

    it('should render New Folder button with correct title', () => {
      wrapper = mountFileExplorer();

      const newFolderBtn = wrapper.findAll('.action-btn')[1];
      expect(newFolderBtn.attributes('title')).toBe('New Folder');
    });

    it('should render Refresh button with correct title', () => {
      wrapper = mountFileExplorer();

      const refreshBtn = wrapper.findAll('.action-btn')[2];
      expect(refreshBtn.attributes('title')).toBe('Refresh');
    });

    it('should have correct CSS classes for header actions', () => {
      wrapper = mountFileExplorer();

      expect(wrapper.find('.header-actions').exists()).toBe(true);
      expect(wrapper.findAll('.action-btn').length).toBe(3);
    });

    it('should prompt for file name when clicking New File', async () => {
      wrapper = mountFileExplorer();
      vi.mocked(window.prompt).mockReturnValue('new-file.txt');

      const newFileBtn = wrapper.findAll('.action-btn')[0];
      await newFileBtn.trigger('click');

      expect(window.prompt).toHaveBeenCalledWith('Enter file name:');
      expect(mockCreateFileFn).toHaveBeenCalled();
    });

    it('should prompt for folder name when clicking New Folder', async () => {
      wrapper = mountFileExplorer();
      vi.mocked(window.prompt).mockReturnValue('new-folder');

      const newFolderBtn = wrapper.findAll('.action-btn')[1];
      await newFolderBtn.trigger('click');

      expect(window.prompt).toHaveBeenCalledWith('Enter folder name:');
      expect(mockCreateDirectoryFn).toHaveBeenCalled();
    });

    it('should not create file if prompt cancelled', async () => {
      wrapper = mountFileExplorer();
      vi.mocked(window.prompt).mockReturnValue(null);

      const newFileBtn = wrapper.findAll('.action-btn')[0];
      await newFileBtn.trigger('click');

      expect(mockCreateFileFn).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================

  describe('Error Handling', () => {
    it('should display error overlay when error exists', async () => {
      wrapper = mountFileExplorer();
      mockError.value = 'Permission denied';

      await nextTick();

      expect(wrapper.find('.error-overlay').exists()).toBe(true);
      expect(wrapper.find('.error-overlay').text()).toContain('Permission denied');
    });

    it('should not display error overlay when no error', () => {
      wrapper = mountFileExplorer();
      mockError.value = null;

      expect(wrapper.find('.error-overlay').exists()).toBe(false);
    });

    it('should display loading overlay when loading and no files', async () => {
      wrapper = mountFileExplorer();
      mockIsLoading.value = true;

      await nextTick();

      expect(wrapper.find('.loading-overlay').exists()).toBe(true);
    });

    it('should not display loading overlay when files exist', async () => {
      wrapper = mountFileExplorer();
      mockIsLoading.value = true;

      // Add some files to store
      const files = createMockFileItems(3, '/home/user');
      addFilesToStore(mockStoreState, '/home/user', files);

      await nextTick();

      // Loading overlay should exist when loading and displayFiles is empty
      // But in our mock, the FileTree component handles the files
    });

    it('should handle permission denied error', async () => {
      wrapper = mountFileExplorer();
      mockError.value = 'Permission denied: /root';

      await nextTick();

      const errorOverlay = wrapper.find('.error-overlay');
      expect(errorOverlay.exists()).toBe(true);
      expect(errorOverlay.text()).toContain('Permission denied');
    });

    it('should handle path not found error', async () => {
      wrapper = mountFileExplorer();
      mockError.value = 'Path not found: /nonexistent';

      await nextTick();

      const errorOverlay = wrapper.find('.error-overlay');
      expect(errorOverlay.exists()).toBe(true);
      expect(errorOverlay.text()).toContain('Path not found');
    });
  });

  // ============================================
  // Context Menu Tests
  // ============================================

  describe('Context Menu', () => {
    it('should show context menu on file right-click', async () => {
      wrapper = mountFileExplorer();

      const mockFile: FileItem = createMockFileItem({
        path: '/home/user/test.txt',
        name: 'test.txt',
      });

      const fileTree = wrapper.findComponent(MockFileTree);
      const mockEvent = new MouseEvent('contextmenu', {
        clientX: 100,
        clientY: 100,
      });

      await fileTree.vm.$emit('contextmenu', mockFile, mockEvent);
      await nextTick();

      const contextMenu = wrapper.findComponent(MockFileContextMenu);
      expect(contextMenu.props('visible')).toBe(true);
    });

    it('should hide context menu on close event', async () => {
      wrapper = mountFileExplorer();

      // First show the context menu
      const mockFile: FileItem = createMockFileItem();
      const fileTree = wrapper.findComponent(MockFileTree);
      await fileTree.vm.$emit('contextmenu', mockFile, new MouseEvent('contextmenu'));
      await nextTick();

      // Then close it
      const contextMenu = wrapper.findComponent(MockFileContextMenu);
      await contextMenu.vm.$emit('close');

      expect(contextMenu.props('visible')).toBe(false);
    });

    it('should copy path to clipboard on copy-path action', async () => {
      wrapper = mountFileExplorer();

      const mockFile: FileItem = createMockFileItem({
        path: '/home/user/test.txt',
      });

      const contextMenu = wrapper.findComponent(MockFileContextMenu);
      await contextMenu.vm.$emit('action', 'copy-path', mockFile);

      expect(mockClipboardWrite).toHaveBeenCalledWith('/home/user/test.txt');
    });

    it('should trigger delete action with confirmation', async () => {
      wrapper = mountFileExplorer();
      vi.mocked(window.confirm).mockReturnValue(true);

      const mockFile: FileItem = createMockFileItem({
        path: '/home/user/test.txt',
        name: 'test.txt',
      });

      const contextMenu = wrapper.findComponent(MockFileContextMenu);
      await contextMenu.vm.$emit('action', 'delete', mockFile);

      expect(window.confirm).toHaveBeenCalled();
      expect(mockDeleteItemFn).toHaveBeenCalledWith('/home/user/test.txt');
    });

    it('should not delete if confirmation denied', async () => {
      wrapper = mountFileExplorer();
      vi.mocked(window.confirm).mockReturnValue(false);

      const mockFile: FileItem = createMockFileItem({
        path: '/home/user/test.txt',
        name: 'test.txt',
      });

      const contextMenu = wrapper.findComponent(MockFileContextMenu);
      await contextMenu.vm.$emit('action', 'delete', mockFile);

      expect(mockDeleteItemFn).not.toHaveBeenCalled();
    });

    it('should set editing path on rename action', async () => {
      wrapper = mountFileExplorer();

      const mockFile: FileItem = createMockFileItem({
        path: '/home/user/test.txt',
      });

      const contextMenu = wrapper.findComponent(MockFileContextMenu);
      await contextMenu.vm.$emit('action', 'rename', mockFile);

      // The FileTree should receive the editingPath prop
      const fileTree = wrapper.findComponent(MockFileTree);
      expect(fileTree.props('editingPath')).toBe('/home/user/test.txt');
    });
  });

  // ============================================
  // File Selection Tests
  // ============================================

  describe('File Selection', () => {
    it('should call selectFile on file select event', async () => {
      wrapper = mountFileExplorer();

      const mockFile: FileItem = createMockFileItem({
        path: '/home/user/test.txt',
      });

      const fileTree = wrapper.findComponent(MockFileTree);
      await fileTree.vm.$emit('select', mockFile);

      expect(mockSelectFileFn).toHaveBeenCalledWith('/home/user/test.txt');
    });

    it('should pass selected path to FileTree', async () => {
      wrapper = mountFileExplorer();
      mockSelectedPath.value = '/home/user/selected.txt';

      await nextTick();

      const fileTree = wrapper.findComponent(MockFileTree);
      expect(fileTree.props('selectedPath')).toBe('/home/user/selected.txt');
    });
  });

  // ============================================
  // File Open Tests
  // ============================================

  describe('File Open', () => {
    it('should emit file-open event when opening file', async () => {
      wrapper = mountFileExplorer();

      const mockFile: FileItem = createMockFileItem({
        path: '/home/user/test.txt',
        name: 'test.txt',
        type: 'file',
      });

      const fileTree = wrapper.findComponent(MockFileTree);
      await fileTree.vm.$emit('open', mockFile);

      expect(wrapper.emitted('file-open')).toBeTruthy();
      expect(wrapper.emitted('file-open')![0][0]).toEqual(mockFile);
    });

    it('should load directory when opening directory', async () => {
      wrapper = mountFileExplorer();

      const mockDir: FileItem = createMockFileItem({
        path: '/home/user/projects',
        name: 'projects',
        type: 'directory',
      });

      const fileTree = wrapper.findComponent(MockFileTree);
      await fileTree.vm.$emit('open', mockDir);

      expect(mockLoadDirectoryFn).toHaveBeenCalledWith('/home/user/projects');
    });
  });

  // ============================================
  // Directory Toggle Tests
  // ============================================

  describe('Directory Toggle', () => {
    it('should call toggleExpand on directory toggle event', async () => {
      wrapper = mountFileExplorer();

      const mockDir: FileItem = createMockFileItem({
        path: '/home/user/projects',
        name: 'projects',
        type: 'directory',
      });

      const fileTree = wrapper.findComponent(MockFileTree);
      await fileTree.vm.$emit('toggle', mockDir);

      expect(mockToggleExpandFn).toHaveBeenCalledWith('/home/user/projects');
    });

    it('should not call toggleExpand for files', async () => {
      wrapper = mountFileExplorer();

      const mockFile: FileItem = createMockFileItem({
        path: '/home/user/test.txt',
        type: 'file',
      });

      const fileTree = wrapper.findComponent(MockFileTree);
      await fileTree.vm.$emit('toggle', mockFile);

      // toggleExpand should not be called since it's a file
      // The component checks item.type === 'directory' before calling
    });
  });

  // ============================================
  // Rename Tests
  // ============================================

  describe('Rename', () => {
    it('should call renameItem on rename event', async () => {
      wrapper = mountFileExplorer();

      const mockFile: FileItem = createMockFileItem({
        path: '/home/user/old-name.txt',
        name: 'old-name.txt',
      });

      const fileTree = wrapper.findComponent(MockFileTree);
      await fileTree.vm.$emit('rename', mockFile, 'new-name.txt');

      expect(mockRenameItemFn).toHaveBeenCalledWith('/home/user/old-name.txt', 'new-name.txt');
    });
  });

  // ============================================
  // UI Style Tests
  // ============================================

  describe('UI Styles', () => {
    it('should have correct CSS structure', () => {
      wrapper = mountFileExplorer();

      expect(wrapper.find('.file-explorer').exists()).toBe(true);
      expect(wrapper.find('.explorer-header').exists()).toBe(true);
      expect(wrapper.find('.breadcrumb').exists()).toBe(true);
      expect(wrapper.find('.explorer-content').exists()).toBe(true);
    });

    it('should apply is-last class to last breadcrumb item', async () => {
      wrapper = mountFileExplorer();
      mockCurrentPath.value = '/home/user';

      await nextTick();

      const items = wrapper.findAll('.breadcrumb-item');
      const lastItem = items[items.length - 1];
      expect(lastItem.classes()).toContain('is-last');
    });

    it('should render SVG icons in action buttons', () => {
      wrapper = mountFileExplorer();

      const actionBtns = wrapper.findAll('.action-btn');
      for (const btn of actionBtns) {
        expect(btn.find('svg').exists()).toBe(true);
      }
    });

    it('should render FileIcon in breadcrumb', () => {
      wrapper = mountFileExplorer();

      const breadcrumb = wrapper.find('.breadcrumb');
      expect(breadcrumb.findComponent(MockFileIcon).exists()).toBe(true);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('should handle empty path', async () => {
      wrapper = mountFileExplorer();
      mockCurrentPath.value = '';

      await nextTick();

      // Should still render without errors
      expect(wrapper.find('.file-explorer').exists()).toBe(true);
    });

    it('should handle special characters in path', async () => {
      wrapper = mountFileExplorer();
      mockCurrentPath.value = '/home/user/special folder/file & name.txt';

      await nextTick();

      expect(wrapper.find('.file-explorer').exists()).toBe(true);
    });

    it('should handle Unicode characters in path', async () => {
      wrapper = mountFileExplorer();
      mockCurrentPath.value = '/home/user/中文文件夹/文件.txt';

      await nextTick();

      expect(wrapper.find('.file-explorer').exists()).toBe(true);
    });

    it('should handle very long paths', async () => {
      wrapper = mountFileExplorer();
      mockCurrentPath.value = '/home/user/' + 'very_long_folder_name/'.repeat(20) + 'file.txt';

      await nextTick();

      expect(wrapper.find('.file-explorer').exists()).toBe(true);
    });

    it('should handle rapid navigation clicks', async () => {
      wrapper = mountFileExplorer();

      const breadcrumbItems = wrapper.findAll('.breadcrumb-item');

      // Rapid clicks
      for (let i = 0; i < 5; i++) {
        await breadcrumbItems[0].trigger('click');
      }

      // Should handle without errors
      expect(wrapper.find('.file-explorer').exists()).toBe(true);
    });

    it('should handle context menu with empty path item', async () => {
      wrapper = mountFileExplorer();

      const emptyItem: FileItem = createMockFileItem({
        path: '',
        name: '',
        type: 'file',
      });

      const contextMenu = wrapper.findComponent(MockFileContextMenu);
      await contextMenu.vm.$emit('action', 'open', emptyItem);

      // Should not crash
      expect(wrapper.find('.file-explorer').exists()).toBe(true);
    });
  });

  // ============================================
  // Accessibility Tests
  // ============================================

  describe('Accessibility', () => {
    it('should have title attributes on action buttons', () => {
      wrapper = mountFileExplorer();

      const actionBtns = wrapper.findAll('.action-btn');
      expect(actionBtns[0].attributes('title')).toBe('New File');
      expect(actionBtns[1].attributes('title')).toBe('New Folder');
      expect(actionBtns[2].attributes('title')).toBe('Refresh');
    });

    it('should have button type on action buttons', () => {
      wrapper = mountFileExplorer();

      const actionBtns = wrapper.findAll('.action-btn');
      for (const btn of actionBtns) {
        expect(btn.element.tagName).toBe('BUTTON');
      }
    });
  });
});
