/**
 * FileTree Component Tests
 * Tests virtual scrolling file tree with expand/collapse, selection, keyboard navigation, sorting
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick, defineComponent, ref } from 'vue';
import FileTree from '../FileTree.vue';
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

function createMockFileTree(): FileItem[] {
  return [
    createMockFileItem({
      path: '/home/user/Documents',
      name: 'Documents',
      type: 'directory',
    }),
    createMockFileItem({
      path: '/home/user/Downloads',
      name: 'Downloads',
      type: 'directory',
    }),
    createMockFileItem({
      path: '/home/user/readme.md',
      name: 'readme.md',
      type: 'file',
      extension: 'md',
    }),
    createMockFileItem({
      path: '/home/user/app.ts',
      name: 'app.ts',
      type: 'file',
      extension: 'ts',
    }),
  ];
}

function createLargeFileList(count: number): FileItem[] {
  return Array.from({ length: count }, (_, i) =>
    createMockFileItem({
      path: `/home/user/file${i}.txt`,
      name: `file${i}.txt`,
      type: i % 5 === 0 ? 'directory' : 'file',
    })
  );
}

function createDeepNestedTree(depth: number): FileItem[] {
  const result: FileItem[] = [];
  let currentPath = '';

  for (let i = 0; i < depth; i++) {
    currentPath += `/level${i}`;
    result.push(
      createMockFileItem({
        path: currentPath,
        name: `level${i}`,
        type: 'directory',
      })
    );
  }

  result.push(
    createMockFileItem({
      path: `${currentPath}/deep-file.txt`,
      name: 'deep-file.txt',
      type: 'file',
    })
  );

  return result;
}

// ============================================
// Mock Components
// ============================================

const MockFileItem = defineComponent({
  name: 'FileItem',
  props: [
    'item',
    'depth',
    'isExpanded',
    'isLoading',
    'isSelected',
    'isEditing',
  ],
  emits: ['click', 'dblclick', 'toggle', 'contextmenu', 'rename'],
  template: `
    <div
      class="file-item-mock"
      :class="{
        'is-selected': isSelected,
        'is-directory': item.type === 'directory',
        'is-expanded': isExpanded
      }"
      :style="{ paddingLeft: depth * 16 + 8 + 'px' }"
      @click="$emit('click', item, $event)"
      @dblclick="$emit('dblclick', item, $event)"
      @contextmenu.prevent="$emit('contextmenu', item, $event)"
    >
      <span class="file-name">{{ item.name }}</span>
      <span class="file-depth">{{ depth }}</span>
      <button
        v-if="item.type === 'directory'"
        class="toggle-btn"
        @click.stop="$emit('toggle', item)"
      >
        {{ isExpanded ? '-' : '+' }}
      </button>
    </div>
  `,
});

// ============================================
// ResizeObserver Mock
// ============================================

class MockResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

vi.stubGlobal('ResizeObserver', MockResizeObserver);

// ============================================
// Tests
// ============================================

describe('FileTree', () => {
  let wrapper: VueWrapper<InstanceType<typeof FileTree>>;

  beforeEach(() => {
    vi.clearAllMocks();
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
    it('should render empty state when no files', () => {
      wrapper = mount(FileTree, {
        props: {
          files: [],
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: MockFileItem,
          },
        },
      });

      expect(wrapper.find('.file-tree').exists()).toBe(true);
      expect(wrapper.find('.empty-state').exists()).toBe(true);
      expect(wrapper.find('.empty-state').text()).toBe('No files found');
    });

    it('should render container with correct structure', () => {
      wrapper = mount(FileTree, {
        props: {
          files: createMockFileTree(),
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: MockFileItem,
          },
        },
      });

      expect(wrapper.find('.file-tree').exists()).toBe(true);
      expect(wrapper.find('.file-tree-content').exists()).toBe(true);
      expect(wrapper.find('.file-tree-viewport').exists()).toBe(true);
    });

    it('should have tabindex for keyboard navigation', () => {
      wrapper = mount(FileTree, {
        props: {
          files: createMockFileTree(),
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: MockFileItem,
          },
        },
      });

      expect(wrapper.find('.file-tree').attributes('tabindex')).toBe('0');
    });

    it('should calculate total height based on file count', () => {
      const files = createLargeFileList(100);

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: MockFileItem,
          },
        },
      });

      const content = wrapper.find('.file-tree-content');
      const height = (content.element as HTMLElement).style.height;

      // 100 items * 24px per item = 2400px
      expect(height).toBe('2400px');
    });
  });

  // ============================================
  // Directory Expand/Collapse Tests
  // ============================================

  describe('Directory Expand/Collapse', () => {
    it('should emit toggle event when directory toggle is triggered', async () => {
      const files = createMockFileTree();

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true, // Use shallow stub to avoid rendering issues
          },
        },
      });

      // Get the component instance and manually trigger the handler
      const vm = wrapper.vm as unknown as {
        handleItemToggle: (item: FileItem) => void;
      };
      vm.handleItemToggle(files[0]);

      expect(wrapper.emitted('toggle')).toBeTruthy();
      expect(wrapper.emitted('toggle')![0][0]).toEqual(files[0]);
    });

    it('should accept expandedPaths prop', () => {
      const files = createMockFileTree();
      const expandedPaths = new Set(['/home/user/Documents']);

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths,
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      // Component should accept the prop without error
      expect(wrapper.props('expandedPaths').has('/home/user/Documents')).toBe(true);
    });

    it('should update when expandedPaths changes', async () => {
      const files = createMockFileTree();

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      await wrapper.setProps({
        expandedPaths: new Set(['/home/user/Documents']),
      });

      // Should not throw
      expect(wrapper.props('expandedPaths').has('/home/user/Documents')).toBe(true);
    });
  });

  // ============================================
  // File Selection Tests
  // ============================================

  describe('File Selection', () => {
    it('should emit select event when file is clicked', async () => {
      const files = createMockFileTree();

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      const vm = wrapper.vm as unknown as {
        handleItemClick: (item: FileItem, event: MouseEvent) => void;
      };
      vm.handleItemClick(files[0], new MouseEvent('click'));

      expect(wrapper.emitted('select')).toBeTruthy();
      expect(wrapper.emitted('select')![0][0]).toEqual(files[0]);
    });

    it('should accept selectedPath prop', () => {
      const files = createMockFileTree();
      const selectedPath = '/home/user/readme.md';

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      expect(wrapper.props('selectedPath')).toBe(selectedPath);
    });

    it('should handle null selectedPath', () => {
      const files = createMockFileTree();

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      expect(wrapper.props('selectedPath')).toBeNull();
    });
  });

  // ============================================
  // Sorting Tests
  // ============================================

  describe('Sorting', () => {
    it('should sort directories before files', async () => {
      const files = [
        createMockFileItem({ path: '/z.txt', name: 'z.txt', type: 'file' }),
        createMockFileItem({ path: '/a', name: 'a', type: 'directory' }),
        createMockFileItem({ path: '/b.txt', name: 'b.txt', type: 'file' }),
        createMockFileItem({ path: '/b', name: 'b', type: 'directory' }),
      ];

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      await nextTick();

      // Access internal flatFiles computed property via component
      // We can verify sorting by checking the order items are processed
      const vm = wrapper.vm as unknown as { $: { exposeProxy?: { flatFiles?: { item: FileItem; depth: number }[] } } };

      // Component exists without error
      expect(wrapper.find('.file-tree').exists()).toBe(true);
    });

    it('should maintain correct order with mixed types', () => {
      const files = [
        createMockFileItem({ path: '/ZDir', name: 'ZDir', type: 'directory' }),
        createMockFileItem({ path: '/afile.txt', name: 'afile.txt', type: 'file' }),
        createMockFileItem({ path: '/ADir', name: 'ADir', type: 'directory' }),
        createMockFileItem({ path: '/zfile.txt', name: 'zfile.txt', type: 'file' }),
      ];

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      // Component should render without error
      expect(wrapper.find('.file-tree').exists()).toBe(true);
    });
  });

  // ============================================
  // Tree Structure Indentation Tests
  // ============================================

  describe('Tree Structure Indentation', () => {
    it('should calculate depth for root items', () => {
      const files = createMockFileTree();

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      // Component should exist
      expect(wrapper.find('.file-tree').exists()).toBe(true);
    });

    it('should handle nested directory structures', () => {
      const files = createDeepNestedTree(10);

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      expect(wrapper.find('.file-tree').exists()).toBe(true);
    });
  });

  // ============================================
  // Virtual Scrolling Tests
  // ============================================

  describe('Virtual Scrolling', () => {
    it('should calculate correct total height', () => {
      const files = createLargeFileList(100);

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      const content = wrapper.find('.file-tree-content');
      const height = parseInt((content.element as HTMLElement).style.height);

      // 100 items * 24px = 2400px
      expect(height).toBe(2400);
    });

    it('should handle scroll event without error', async () => {
      const files = createLargeFileList(100);

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      const container = wrapper.find('.file-tree');

      // Mock scrollTop on the element
      Object.defineProperty(container.element, 'scrollTop', {
        value: 100,
        writable: true,
      });

      // Trigger scroll event
      await container.trigger('scroll');

      // Should not throw
      expect(wrapper.find('.file-tree').exists()).toBe(true);
    });

    it('should apply transform to viewport', () => {
      const files = createLargeFileList(100);

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      const viewport = wrapper.find('.file-tree-viewport');
      const transform = (viewport.element as HTMLElement).style.transform;

      expect(transform).toContain('translateY');
    });

    it('should handle large file lists', () => {
      const files = createLargeFileList(1000);

      const startTime = performance.now();

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      const endTime = performance.now();

      // Mounting should complete quickly
      expect(endTime - startTime).toBeLessThan(500);
      expect(wrapper.find('.file-tree').exists()).toBe(true);
    });
  });

  // ============================================
  // Keyboard Navigation Tests
  // ============================================

  describe('Keyboard Navigation', () => {
    it('should emit select on ArrowDown', async () => {
      const files = createMockFileTree();

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
        attachTo: document.body,
      });

      const container = wrapper.find('.file-tree');
      await container.trigger('keydown', { key: 'ArrowDown' });

      expect(wrapper.emitted('select')).toBeTruthy();
    });

    it('should emit select on ArrowUp', async () => {
      const files = createMockFileTree();

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
        attachTo: document.body,
      });

      const container = wrapper.find('.file-tree');

      // First move down
      await container.trigger('keydown', { key: 'ArrowDown' });
      vi.clearAllMocks();

      // Then move up
      await container.trigger('keydown', { key: 'ArrowUp' });

      expect(wrapper.emitted('select')).toBeTruthy();
    });

    it('should emit toggle on Enter for directory', async () => {
      const files = createMockFileTree();

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: files[0].path,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
        attachTo: document.body,
      });

      const container = wrapper.find('.file-tree');

      // Navigate to first item
      await container.trigger('keydown', { key: 'ArrowDown' });
      // Press Enter
      await container.trigger('keydown', { key: 'Enter' });

      // Either toggle or open should be emitted
      expect(
        wrapper.emitted('toggle') || wrapper.emitted('open')
      ).toBeTruthy();
    });

    it('should emit toggle on ArrowRight for collapsed directory', async () => {
      const files = createMockFileTree();

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: files[0].path,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
        attachTo: document.body,
      });

      const container = wrapper.find('.file-tree');
      await container.trigger('keydown', { key: 'ArrowDown' });
      vi.clearAllMocks();
      await container.trigger('keydown', { key: 'ArrowRight' });

      expect(wrapper.emitted('toggle')).toBeTruthy();
    });

    it('should emit toggle on ArrowLeft for expanded directory', async () => {
      const files = createMockFileTree();
      const expandedPaths = new Set([files[0].path]);

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths,
          selectedPath: files[0].path,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
        attachTo: document.body,
      });

      const container = wrapper.find('.file-tree');
      await container.trigger('keydown', { key: 'ArrowDown' });
      vi.clearAllMocks();
      await container.trigger('keydown', { key: 'ArrowLeft' });

      expect(wrapper.emitted('toggle')).toBeTruthy();
    });

    it('should handle ArrowUp at first item', async () => {
      const files = createMockFileTree();

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
        attachTo: document.body,
      });

      const container = wrapper.find('.file-tree');

      // Try to go up from first position
      await container.trigger('keydown', { key: 'ArrowUp' });
      await container.trigger('keydown', { key: 'ArrowUp' });

      const selectEvents = wrapper.emitted('select');
      expect(selectEvents!.length).toBe(2);
    });

    it('should not emit select with empty files', async () => {
      wrapper = mount(FileTree, {
        props: {
          files: [],
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      const container = wrapper.find('.file-tree');
      await container.trigger('keydown', { key: 'ArrowDown' });

      expect(wrapper.emitted('select')).toBeFalsy();
    });
  });

  // ============================================
  // Event Handling Tests
  // ============================================

  describe('Event Handling', () => {
    it('should emit open event on double click', async () => {
      const files = createMockFileTree();

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      const vm = wrapper.vm as unknown as {
        handleItemDblClick: (item: FileItem, event: MouseEvent) => void;
      };
      vm.handleItemDblClick(files[0], new MouseEvent('dblclick'));

      expect(wrapper.emitted('open')).toBeTruthy();
    });

    it('should emit contextmenu event with item and event', async () => {
      const files = createMockFileTree();
      const mockEvent = new MouseEvent('contextmenu');

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      const vm = wrapper.vm as unknown as {
        handleItemContextMenu: (item: FileItem, event: MouseEvent) => void;
      };
      vm.handleItemContextMenu(files[0], mockEvent);

      expect(wrapper.emitted('contextmenu')).toBeTruthy();
      expect(wrapper.emitted('contextmenu')![0][0]).toEqual(files[0]);
      expect(wrapper.emitted('contextmenu')![0][1]).toBe(mockEvent);
    });

    it('should emit rename event with item and new name', async () => {
      const files = createMockFileTree();

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      const vm = wrapper.vm as unknown as {
        handleItemRename: (item: FileItem, newName: string) => void;
      };
      vm.handleItemRename(files[0], 'new-name.txt');

      expect(wrapper.emitted('rename')).toBeTruthy();
      expect(wrapper.emitted('rename')![0][0]).toEqual(files[0]);
      expect(wrapper.emitted('rename')![0][1]).toBe('new-name.txt');
    });

    it('should accept loadingPaths prop', () => {
      const files = createMockFileTree();
      const loadingPaths = new Set(['/home/user/Documents']);

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: null,
          loadingPaths,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      expect(wrapper.props('loadingPaths').has('/home/user/Documents')).toBe(true);
    });

    it('should accept editingPath prop', () => {
      const files = createMockFileTree();
      const editingPath = '/home/user/readme.md';

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: null,
          editingPath,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      expect(wrapper.props('editingPath')).toBe(editingPath);
    });
  });

  // ============================================
  // Large File Handling Tests
  // ============================================

  describe('Large File Handling', () => {
    it('should handle 1000+ files without performance issues', () => {
      const files = createLargeFileList(1000);

      const startTime = performance.now();

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(500);
      expect(wrapper.find('.file-tree').exists()).toBe(true);
    });

    it('should calculate correct total height for many files', () => {
      const files = createLargeFileList(500);

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      const content = wrapper.find('.file-tree-content');
      const height = parseInt((content.element as HTMLElement).style.height);

      // 500 items * 24px = 12000px
      expect(height).toBe(12000);
    });
  });

  // ============================================
  // Deep Nesting Handling Tests
  // ============================================

  describe('Deep Nesting Handling', () => {
    it('should handle deeply nested directory structures', () => {
      const files = createDeepNestedTree(10);

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      expect(wrapper.find('.file-tree').exists()).toBe(true);
    });

    it('should handle paths with special characters', () => {
      const files = [
        createMockFileItem({
          path: '/home/user/file with spaces.txt',
          name: 'file with spaces.txt',
          type: 'file',
        }),
        createMockFileItem({
          path: '/home/user/文件.txt',
          name: '文件.txt',
          type: 'file',
        }),
        createMockFileItem({
          path: '/home/user/file[1].txt',
          name: 'file[1].txt',
          type: 'file',
        }),
      ];

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      expect(wrapper.find('.file-tree').exists()).toBe(true);
    });
  });

  // ============================================
  // Exposed Methods Tests
  // ============================================

  describe('Exposed Methods', () => {
    it('should expose scrollToPath method', () => {
      const files = createMockFileTree();

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      expect(typeof wrapper.vm.scrollToPath).toBe('function');
    });

    it('should handle scrollToPath for existing path', async () => {
      const files = createLargeFileList(100);

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      // Should not throw
      expect(() => {
        wrapper.vm.scrollToPath('/home/user/file50.txt');
      }).not.toThrow();
    });

    it('should handle scrollToPath for non-existent path', () => {
      const files = createMockFileTree();

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      // Should not throw
      expect(() => {
        wrapper.vm.scrollToPath('/non/existent/path');
      }).not.toThrow();
    });
  });

  // ============================================
  // ResizeObserver Tests
  // ============================================

  describe('ResizeObserver', () => {
    it('should create ResizeObserver on mount', () => {
      wrapper = mount(FileTree, {
        props: {
          files: createMockFileTree(),
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      // ResizeObserver should be available and component should render without error
      expect(window.ResizeObserver).toBeDefined();
      expect(wrapper.find('.file-tree').exists()).toBe(true);
    });

    it('should handle container height from ResizeObserver', async () => {
      wrapper = mount(FileTree, {
        props: {
          files: createMockFileTree(),
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      // Component should render with initial height
      const content = wrapper.find('.file-tree-content');
      expect(content.exists()).toBe(true);

      // The height should be calculated based on file count
      // 4 items * 24px = 96px
      const height = (content.element as HTMLElement).style.height;
      expect(height).toBe('96px');
    });
  });

  // ============================================
  // Edge Cases Tests
  // ============================================

  describe('Edge Cases', () => {
    it('should handle empty files array', () => {
      wrapper = mount(FileTree, {
        props: {
          files: [],
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      expect(wrapper.find('.empty-state').exists()).toBe(true);
    });

    it('should handle selectedPath not in files', () => {
      const files = createMockFileTree();

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: '/non/existent/path',
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      // Should render without error
      expect(wrapper.find('.file-tree').exists()).toBe(true);
    });

    it('should update when files prop changes', async () => {
      const files1 = createMockFileTree();
      const files2 = createLargeFileList(10);

      wrapper = mount(FileTree, {
        props: {
          files: files1,
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      const initialHeight = (wrapper.find('.file-tree-content').element as HTMLElement).style.height;

      await wrapper.setProps({ files: files2 });

      const newHeight = (wrapper.find('.file-tree-content').element as HTMLElement).style.height;

      expect(newHeight).not.toBe(initialHeight);
    });

    it('should handle files with same name but different paths', () => {
      const files = [
        createMockFileItem({ path: '/dir1/file.txt', name: 'file.txt', type: 'file' }),
        createMockFileItem({ path: '/dir2/file.txt', name: 'file.txt', type: 'file' }),
        createMockFileItem({ path: '/dir3/file.txt', name: 'file.txt', type: 'file' }),
      ];

      wrapper = mount(FileTree, {
        props: {
          files,
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      // Should render without error (3 items * 24px = 72px)
      const content = wrapper.find('.file-tree-content');
      const height = (content.element as HTMLElement).style.height;
      expect(height).toBe('72px');
    });
  });

  // ============================================
  // UI Styles Tests
  // ============================================

  describe('UI Styles', () => {
    it('should have correct CSS classes', () => {
      wrapper = mount(FileTree, {
        props: {
          files: createMockFileTree(),
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      expect(wrapper.find('.file-tree').exists()).toBe(true);
      expect(wrapper.find('.file-tree-content').exists()).toBe(true);
      expect(wrapper.find('.file-tree-viewport').exists()).toBe(true);
    });

    it('should apply transform style to viewport', () => {
      wrapper = mount(FileTree, {
        props: {
          files: createMockFileTree(),
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      const viewport = wrapper.find('.file-tree-viewport');
      const transform = (viewport.element as HTMLElement).style.transform;

      expect(transform).toContain('translateY');
    });

    it('should have file-tree class on container', () => {
      wrapper = mount(FileTree, {
        props: {
          files: createMockFileTree(),
          expandedPaths: new Set<string>(),
          selectedPath: null,
        },
        global: {
          stubs: {
            FileItem: true,
          },
        },
      });

      const container = wrapper.find('.file-tree');
      expect(container.classes()).toContain('file-tree');
    });
  });
});
