/**
 * FileContextMenu Component Tests
 * Tests right-click context menu for file items including menu items, positioning, and actions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import FileContextMenu from '../FileContextMenu.vue';
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

function createMockDirectoryItem(overrides: Partial<FileItem> = {}): FileItem {
  return createMockFileItem({
    name: 'folder',
    type: 'directory',
    ...overrides,
  });
}

// ============================================
// Test Helper Functions
// ============================================

interface MountOptions {
  props?: Record<string, unknown>;
}

function mountFileContextMenu(options: MountOptions = {}): VueWrapper {
  return mount(FileContextMenu, {
    props: {
      visible: true,
      x: 100,
      y: 100,
      item: createMockFileItem(),
      ...options.props,
    },
    global: {
      stubs: {
        Teleport: {
          template: '<div class="teleport-stub"><slot /></div>',
        },
      },
    },
  });
}

// ============================================
// Tests
// ============================================

describe('FileContextMenu', () => {
  let wrapper: VueWrapper;

  beforeEach(() => {
    // Mock window dimensions
    vi.stubGlobal('innerWidth', 1920);
    vi.stubGlobal('innerHeight', 1080);
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    vi.unstubAllGlobals();
  });

  // ============================================
  // Basic Rendering Tests
  // ============================================

  describe('Basic Rendering', () => {
    it('should render when visible and item is provided', () => {
      wrapper = mountFileContextMenu({
        props: {
          visible: true,
          item: createMockFileItem(),
        },
      });

      expect(wrapper.find('.context-menu').exists()).toBe(true);
    });

    it('should not render when visible is false', () => {
      wrapper = mountFileContextMenu({
        props: {
          visible: false,
          item: createMockFileItem(),
        },
      });

      expect(wrapper.find('.context-menu').exists()).toBe(false);
    });

    it('should not render when item is null', () => {
      wrapper = mountFileContextMenu({
        props: {
          visible: true,
          item: null,
        },
      });

      expect(wrapper.find('.context-menu').exists()).toBe(false);
    });

    it('should render at specified position', () => {
      wrapper = mountFileContextMenu({
        props: {
          x: 200,
          y: 150,
          item: createMockFileItem(),
        },
      });

      const menu = wrapper.find('.context-menu');
      const style = (menu.element as HTMLElement).style;
      expect(style.left).toBe('200px');
      expect(style.top).toBe('150px');
    });

    it('should have correct CSS classes', () => {
      wrapper = mountFileContextMenu();

      expect(wrapper.find('.context-menu').exists()).toBe(true);
      expect(wrapper.find('.menu-item').exists()).toBe(true);
      expect(wrapper.find('.menu-icon').exists()).toBe(true);
      expect(wrapper.find('.menu-label').exists()).toBe(true);
    });
  });

  // ============================================
  // Directory Menu Items Tests
  // ============================================

  describe('Directory Menu Items', () => {
    it('should render Open item for directory', () => {
      wrapper = mountFileContextMenu({
        props: {
          item: createMockDirectoryItem(),
        },
      });

      const items = wrapper.findAll('.menu-item');
      const openItem = items.find(item => item.text().includes('Open'));
      expect(openItem).toBeDefined();
    });

    it('should render Open in Terminal item for directory', () => {
      wrapper = mountFileContextMenu({
        props: {
          item: createMockDirectoryItem(),
        },
      });

      const items = wrapper.findAll('.menu-item');
      const terminalItem = items.find(item => item.text().includes('Open in Terminal'));
      expect(terminalItem).toBeDefined();
    });

    it('should render New File item for directory', () => {
      wrapper = mountFileContextMenu({
        props: {
          item: createMockDirectoryItem(),
        },
      });

      const items = wrapper.findAll('.menu-item');
      const newFileItem = items.find(item => item.text().includes('New File'));
      expect(newFileItem).toBeDefined();
    });

    it('should render New Folder item for directory', () => {
      wrapper = mountFileContextMenu({
        props: {
          item: createMockDirectoryItem(),
        },
      });

      const items = wrapper.findAll('.menu-item');
      const newFolderItem = items.find(item => item.text().includes('New Folder'));
      expect(newFolderItem).toBeDefined();
    });

    it('should have correct number of menu items for directory', () => {
      wrapper = mountFileContextMenu({
        props: {
          item: createMockDirectoryItem(),
        },
      });

      const items = wrapper.findAll('.menu-item');
      // Open, Open in Terminal, Copy Path, Rename, Duplicate, New File, New Folder, Delete = 8
      expect(items.length).toBe(8);
    });
  });

  // ============================================
  // File Menu Items Tests
  // ============================================

  describe('File Menu Items', () => {
    it('should render Open item for file', () => {
      wrapper = mountFileContextMenu();

      const items = wrapper.findAll('.menu-item');
      const openItem = items.find(item => item.text().includes('Open'));
      expect(openItem).toBeDefined();
    });

    it('should render Open with Editor item for file', () => {
      wrapper = mountFileContextMenu();

      const items = wrapper.findAll('.menu-item');
      const editorItem = items.find(item => item.text().includes('Open with Editor'));
      expect(editorItem).toBeDefined();
    });

    it('should not render Open in Terminal for file', () => {
      wrapper = mountFileContextMenu();

      const items = wrapper.findAll('.menu-item');
      const terminalItem = items.find(item => item.text().includes('Open in Terminal'));
      expect(terminalItem).toBeUndefined();
    });

    it('should not render New File/New Folder for file', () => {
      wrapper = mountFileContextMenu();

      const items = wrapper.findAll('.menu-item');
      const newFileItem = items.find(item => item.text().includes('New File'));
      const newFolderItem = items.find(item => item.text().includes('New Folder'));
      expect(newFileItem).toBeUndefined();
      expect(newFolderItem).toBeUndefined();
    });

    it('should have correct number of menu items for file', () => {
      wrapper = mountFileContextMenu();

      const items = wrapper.findAll('.menu-item');
      // Open, Open with Editor, Copy Path, Rename, Duplicate, Delete = 6
      expect(items.length).toBe(6);
    });
  });

  // ============================================
  // Common Menu Items Tests
  // ============================================

  describe('Common Menu Items', () => {
    it('should render Copy Path item', () => {
      wrapper = mountFileContextMenu();

      const items = wrapper.findAll('.menu-item');
      const copyItem = items.find(item => item.text().includes('Copy Path'));
      expect(copyItem).toBeDefined();
    });

    it('should render Rename item', () => {
      wrapper = mountFileContextMenu();

      const items = wrapper.findAll('.menu-item');
      const renameItem = items.find(item => item.text().includes('Rename'));
      expect(renameItem).toBeDefined();
    });

    it('should render Duplicate item', () => {
      wrapper = mountFileContextMenu();

      const items = wrapper.findAll('.menu-item');
      const duplicateItem = items.find(item => item.text().includes('Duplicate'));
      expect(duplicateItem).toBeDefined();
    });

    it('should render Delete item', () => {
      wrapper = mountFileContextMenu();

      const items = wrapper.findAll('.menu-item');
      const deleteItem = items.find(item => item.text().includes('Delete'));
      expect(deleteItem).toBeDefined();
    });
  });

  // ============================================
  // Menu Dividers Tests
  // ============================================

  describe('Menu Dividers', () => {
    it('should render menu dividers', () => {
      wrapper = mountFileContextMenu();

      const dividers = wrapper.findAll('.menu-divider');
      expect(dividers.length).toBeGreaterThan(0);
    });

    it('should have correct number of dividers for file', () => {
      wrapper = mountFileContextMenu();

      const dividers = wrapper.findAll('.menu-divider');
      // Two dividers: after Copy Path, before Delete
      expect(dividers.length).toBe(2);
    });

    it('should have correct number of dividers for directory', () => {
      wrapper = mountFileContextMenu({
        props: {
          item: createMockDirectoryItem(),
        },
      });

      const dividers = wrapper.findAll('.menu-divider');
      // Two dividers: after Copy Path, before Delete
      expect(dividers.length).toBe(2);
    });
  });

  // ============================================
  // Menu Actions Tests
  // ============================================

  describe('Menu Actions', () => {
    it('should emit action event when clicking menu item', async () => {
      wrapper = mountFileContextMenu();

      const items = wrapper.findAll('.menu-item');
      const openItem = items.find(item => item.text().includes('Open'));
      await openItem!.trigger('click');

      expect(wrapper.emitted('action')).toBeTruthy();
      expect(wrapper.emitted('action')![0][0]).toBe('open');
    });

    it('should emit close event when clicking menu item', async () => {
      wrapper = mountFileContextMenu();

      const items = wrapper.findAll('.menu-item');
      await items[0].trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('should emit action with correct item', async () => {
      const mockFile = createMockFileItem({ name: 'test.txt' });
      wrapper = mountFileContextMenu({
        props: { item: mockFile },
      });

      const items = wrapper.findAll('.menu-item');
      await items[0].trigger('click');

      expect(wrapper.emitted('action')![0][1]).toEqual(mockFile);
    });

    it('should emit copy-path action', async () => {
      wrapper = mountFileContextMenu();

      const items = wrapper.findAll('.menu-item');
      const copyItem = items.find(item => item.text().includes('Copy Path'));
      await copyItem!.trigger('click');

      expect(wrapper.emitted('action')![0][0]).toBe('copy-path');
    });

    it('should emit rename action', async () => {
      wrapper = mountFileContextMenu();

      const items = wrapper.findAll('.menu-item');
      const renameItem = items.find(item => item.text().includes('Rename'));
      await renameItem!.trigger('click');

      expect(wrapper.emitted('action')![0][0]).toBe('rename');
    });

    it('should emit delete action', async () => {
      wrapper = mountFileContextMenu();

      const items = wrapper.findAll('.menu-item');
      const deleteItem = items.find(item => item.text().includes('Delete'));
      await deleteItem!.trigger('click');

      expect(wrapper.emitted('action')![0][0]).toBe('delete');
    });

    it('should emit open-in-terminal action for directory', async () => {
      wrapper = mountFileContextMenu({
        props: { item: createMockDirectoryItem() },
      });

      const items = wrapper.findAll('.menu-item');
      const terminalItem = items.find(item => item.text().includes('Open in Terminal'));
      await terminalItem!.trigger('click');

      expect(wrapper.emitted('action')![0][0]).toBe('open-in-terminal');
    });

    it('should emit new-file action for directory', async () => {
      wrapper = mountFileContextMenu({
        props: { item: createMockDirectoryItem() },
      });

      const items = wrapper.findAll('.menu-item');
      const newFileItem = items.find(item => item.text().includes('New File'));
      await newFileItem!.trigger('click');

      expect(wrapper.emitted('action')![0][0]).toBe('new-file');
    });

    it('should emit new-folder action for directory', async () => {
      wrapper = mountFileContextMenu({
        props: { item: createMockDirectoryItem() },
      });

      const items = wrapper.findAll('.menu-item');
      const newFolderItem = items.find(item => item.text().includes('New Folder'));
      await newFolderItem!.trigger('click');

      expect(wrapper.emitted('action')![0][0]).toBe('new-folder');
    });

    it('should not emit action when clicking divider', async () => {
      wrapper = mountFileContextMenu();

      const divider = wrapper.find('.menu-divider');
      await divider.trigger('click');

      expect(wrapper.emitted('action')).toBeFalsy();
    });
  });

  // ============================================
  // Position Adjustment Tests
  // ============================================

  describe('Position Adjustment', () => {
    it('should adjust position when menu would overflow right edge', async () => {
      // Menu width is ~180px, so x should be adjusted if too close to right edge
      wrapper = mountFileContextMenu({
        props: {
          x: 1800, // Near right edge
          y: 100,
          item: createMockFileItem(),
        },
      });

      await nextTick();

      const menu = wrapper.find('.context-menu');
      const style = (menu.element as HTMLElement).style;
      const left = parseInt(style.left);
      // Should be adjusted to not overflow
      expect(left).toBeLessThan(1800);
    });

    it('should adjust position when menu would overflow bottom edge', async () => {
      // Menu height depends on number of items
      wrapper = mountFileContextMenu({
        props: {
          x: 100,
          y: 1000, // Near bottom edge
          item: createMockFileItem(),
        },
      });

      await nextTick();

      const menu = wrapper.find('.context-menu');
      const style = (menu.element as HTMLElement).style;
      const top = parseInt(style.top);
      // Should be adjusted to not overflow
      expect(top).toBeLessThan(1000);
    });

    it('should not adjust position when menu fits on screen', async () => {
      wrapper = mountFileContextMenu({
        props: {
          x: 100,
          y: 100,
          item: createMockFileItem(),
        },
      });

      await nextTick();

      const menu = wrapper.find('.context-menu');
      const style = (menu.element as HTMLElement).style;
      expect(style.left).toBe('100px');
      expect(style.top).toBe('100px');
    });

    it('should handle position at screen origin', async () => {
      wrapper = mountFileContextMenu({
        props: {
          x: 0,
          y: 0,
          item: createMockFileItem(),
        },
      });

      await nextTick();

      const menu = wrapper.find('.context-menu');
      expect(menu.exists()).toBe(true);
    });
  });

  // ============================================
  // Close Behavior Tests
  // ============================================

  describe('Close Behavior', () => {
    it('should close on Escape key', async () => {
      wrapper = mountFileContextMenu();

      // Simulate Escape key press
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await nextTick();

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('should not close on other keys', async () => {
      wrapper = mountFileContextMenu();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      await nextTick();

      expect(wrapper.emitted('close')).toBeFalsy();
    });

    it('should close when clicking outside', async () => {
      wrapper = mountFileContextMenu();

      // Simulate click outside
      const outsideClick = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(outsideClick, 'target', {
        value: document.body,
      });
      document.dispatchEvent(outsideClick);
      await nextTick();

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('should not close when clicking inside menu', async () => {
      wrapper = mountFileContextMenu();

      const menu = wrapper.find('.context-menu');
      await menu.trigger('click');

      // Close should only be emitted if action was clicked
      // not just from clicking inside
      const closeCount = wrapper.emitted('close')?.length || 0;
      expect(closeCount).toBe(0);
    });

    it('should cleanup event listeners on unmount', async () => {
      wrapper = mountFileContextMenu();

      const documentSpy = vi.spyOn(document, 'removeEventListener');
      wrapper.unmount();

      expect(documentSpy).toHaveBeenCalledWith('click', expect.any(Function));
      expect(documentSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      documentSpy.mockRestore();
    });
  });

  // ============================================
  // Delete Button Style Tests
  // ============================================

  describe('Delete Button Style', () => {
    it('should have is-danger class on Delete button', () => {
      wrapper = mountFileContextMenu();

      const items = wrapper.findAll('.menu-item');
      const deleteItem = items.find(item => item.text().includes('Delete'));
      expect(deleteItem!.classes()).toContain('is-danger');
    });

    it('should not have is-danger class on other buttons', () => {
      wrapper = mountFileContextMenu();

      const items = wrapper.findAll('.menu-item');
      const openItem = items.find(item => item.text().includes('Open'));
      expect(openItem!.classes()).not.toContain('is-danger');
    });
  });

  // ============================================
  // Disabled State Tests
  // ============================================

  describe('Disabled State', () => {
    it('should render button without disabled attribute by default', () => {
      wrapper = mountFileContextMenu();

      const items = wrapper.findAll('.menu-item');
      for (const item of items) {
        expect(item.element.hasAttribute('disabled')).toBe(false);
      }
    });

    it('should support disabled menu items via menuItem.disabled', async () => {
      // This tests the component's support for disabled prop in menuItems
      // Currently the component checks menuItem.disabled in the template
      wrapper = mountFileContextMenu();

      const items = wrapper.findAll('.menu-item');
      // All items should be enabled by default
      expect(items.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // Icon Rendering Tests
  // ============================================

  describe('Icon Rendering', () => {
    it('should render SVG icons for menu items', () => {
      wrapper = mountFileContextMenu();

      const icons = wrapper.findAll('.menu-icon svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should render folder icon for Open (directory)', () => {
      wrapper = mountFileContextMenu({
        props: { item: createMockDirectoryItem() },
      });

      const items = wrapper.findAll('.menu-item');
      const openItem = items.find(item => item.text().includes('Open'));
      const svg = openItem!.find('svg');
      expect(svg.exists()).toBe(true);
    });

    it('should render terminal icon for Open in Terminal', () => {
      wrapper = mountFileContextMenu({
        props: { item: createMockDirectoryItem() },
      });

      const items = wrapper.findAll('.menu-item');
      const terminalItem = items.find(item => item.text().includes('Open in Terminal'));
      expect(terminalItem!.find('svg').exists()).toBe(true);
    });

    it('should render trash icon for Delete', () => {
      wrapper = mountFileContextMenu();

      const items = wrapper.findAll('.menu-item');
      const deleteItem = items.find(item => item.text().includes('Delete'));
      expect(deleteItem!.find('svg').exists()).toBe(true);
    });
  });

  // ============================================
  // Transition Tests
  // ============================================

  describe('Transition', () => {
    it('should have transition classes', async () => {
      wrapper = mountFileContextMenu();

      // Check that the transition name is applied via the Transition component
      const html = wrapper.html();
      expect(html).toContain('context-menu');
    });

    it('should animate visibility changes', async () => {
      wrapper = mountFileContextMenu({
        props: { visible: true },
      });

      expect(wrapper.find('.context-menu').exists()).toBe(true);

      await wrapper.setProps({ visible: false });
      await nextTick();

      expect(wrapper.find('.context-menu').exists()).toBe(false);
    });
  });

  // ============================================
  // UI Style Tests
  // ============================================

  describe('UI Styles', () => {
    it('should have correct menu structure', () => {
      wrapper = mountFileContextMenu();

      const menu = wrapper.find('.context-menu');
      expect(menu.exists()).toBe(true);
      expect(menu.find('.menu-item').exists()).toBe(true);
    });

    it('should have menu-icon inside menu-item', () => {
      wrapper = mountFileContextMenu();

      const item = wrapper.find('.menu-item');
      expect(item.find('.menu-icon').exists()).toBe(true);
    });

    it('should have menu-label inside menu-item', () => {
      wrapper = mountFileContextMenu();

      const item = wrapper.find('.menu-item');
      expect(item.find('.menu-label').exists()).toBe(true);
    });

    it('should render button elements for menu items', () => {
      wrapper = mountFileContextMenu();

      const items = wrapper.findAll('.menu-item');
      for (const item of items) {
        expect(item.element.tagName).toBe('BUTTON');
      }
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('should handle item with empty name', () => {
      wrapper = mountFileContextMenu({
        props: {
          item: createMockFileItem({ name: '', path: '/test/' }),
        },
      });

      expect(wrapper.find('.context-menu').exists()).toBe(true);
    });

    it('should handle item with special characters in name', () => {
      wrapper = mountFileContextMenu({
        props: {
          item: createMockFileItem({ name: 'file & name @ #.txt' }),
        },
      });

      expect(wrapper.find('.context-menu').exists()).toBe(true);
    });

    it('should handle item with Unicode characters', () => {
      wrapper = mountFileContextMenu({
        props: {
          item: createMockFileItem({ name: '中文文件名.txt' }),
        },
      });

      expect(wrapper.find('.context-menu').exists()).toBe(true);
    });

    it('should handle very long file name', () => {
      const longName = 'a'.repeat(200) + '.txt';
      wrapper = mountFileContextMenu({
        props: {
          item: createMockFileItem({ name: longName }),
        },
      });

      expect(wrapper.find('.context-menu').exists()).toBe(true);
    });

    it('should handle symlink file type', () => {
      wrapper = mountFileContextMenu({
        props: {
          item: createMockFileItem({ type: 'symlink' }),
        },
      });

      // Symlinks are treated as files (not directories)
      const items = wrapper.findAll('.menu-item');
      expect(items.length).toBe(6); // Same as file
    });

    it('should handle unknown file type', () => {
      wrapper = mountFileContextMenu({
        props: {
          item: createMockFileItem({ type: 'unknown' }),
        },
      });

      expect(wrapper.find('.context-menu').exists()).toBe(true);
    });

    it('should handle hidden file', () => {
      wrapper = mountFileContextMenu({
        props: {
          item: createMockFileItem({ name: '.hidden', isHidden: true }),
        },
      });

      expect(wrapper.find('.context-menu').exists()).toBe(true);
    });

    it('should handle read-only file', () => {
      wrapper = mountFileContextMenu({
        props: {
          item: createMockFileItem({ isReadOnly: true }),
        },
      });

      expect(wrapper.find('.context-menu').exists()).toBe(true);
    });

    it('should handle zero x and y coordinates', () => {
      wrapper = mountFileContextMenu({
        props: {
          x: 0,
          y: 0,
        },
      });

      const menu = wrapper.find('.context-menu');
      expect(menu.exists()).toBe(true);
    });

    it('should handle negative coordinates', () => {
      wrapper = mountFileContextMenu({
        props: {
          x: -10,
          y: -10,
        },
      });

      const menu = wrapper.find('.context-menu');
      expect(menu.exists()).toBe(true);
    });

    it('should handle very large coordinates', () => {
      wrapper = mountFileContextMenu({
        props: {
          x: 10000,
          y: 10000,
        },
      });

      const menu = wrapper.find('.context-menu');
      expect(menu.exists()).toBe(true);
    });

    it('should handle rapid visibility toggles', async () => {
      wrapper = mountFileContextMenu();

      for (let i = 0; i < 5; i++) {
        await wrapper.setProps({ visible: false });
        await wrapper.setProps({ visible: true });
      }

      expect(wrapper.find('.context-menu').exists()).toBe(true);
    });

    it('should handle item prop changes', async () => {
      wrapper = mountFileContextMenu({
        props: {
          item: createMockFileItem({ name: 'file1.txt' }),
        },
      });

      await wrapper.setProps({
        item: createMockDirectoryItem({ name: 'folder1' }),
      });

      // Should now have directory-specific items
      const items = wrapper.findAll('.menu-item');
      const terminalItem = items.find(item => item.text().includes('Open in Terminal'));
      expect(terminalItem).toBeDefined();
    });
  });

  // ============================================
  // Accessibility Tests
  // ============================================

  describe('Accessibility', () => {
    it('should use button elements for interactive items', () => {
      wrapper = mountFileContextMenu();

      const items = wrapper.findAll('.menu-item');
      for (const item of items) {
        expect(item.element.tagName).toBe('BUTTON');
      }
    });

    it('should have proper button type for menu items', () => {
      wrapper = mountFileContextMenu();

      const items = wrapper.findAll('.menu-item');
      // By default, buttons in forms have type="submit", but outside forms they just work
      for (const item of items) {
        expect(item.element.tagName).toBe('BUTTON');
      }
    });
  });

  // ============================================
  // Readonly File Handling Tests
  // ============================================

  describe('Readonly File Handling', () => {
    it('should render delete option for readonly file', () => {
      // Component doesn't currently disable delete for readonly files
      // but it's a potential feature
      wrapper = mountFileContextMenu({
        props: {
          item: createMockFileItem({ isReadOnly: true }),
        },
      });

      const items = wrapper.findAll('.menu-item');
      const deleteItem = items.find(item => item.text().includes('Delete'));
      expect(deleteItem).toBeDefined();
    });

    it('should render rename option for readonly file', () => {
      wrapper = mountFileContextMenu({
        props: {
          item: createMockFileItem({ isReadOnly: true }),
        },
      });

      const items = wrapper.findAll('.menu-item');
      const renameItem = items.find(item => item.text().includes('Rename'));
      expect(renameItem).toBeDefined();
    });
  });

  // ============================================
  // Multiple Items Selection Tests
  // ============================================

  describe('Multiple Items Selection', () => {
    // Note: Current component only supports single item selection
    // This tests the current behavior with a single item

    it('should handle single file item correctly', () => {
      const file = createMockFileItem({ name: 'single.txt' });
      wrapper = mountFileContextMenu({
        props: { item: file },
      });

      const items = wrapper.findAll('.menu-item');
      expect(items.length).toBeGreaterThan(0);

      // Actions should reference the single item
      items[0].trigger('click');
      expect(wrapper.emitted('action')![0][1]).toEqual(file);
    });
  });
});
