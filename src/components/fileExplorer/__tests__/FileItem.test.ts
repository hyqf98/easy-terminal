/**
 * FileItem Component Tests
 * Tests individual file/directory item rendering, events, and states
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import FileItem from '../FileItem.vue';
import FileIcon from '../FileIcon.vue';
import type { FileItem as IFileItem } from '@/types';

// ============================================
// Mock Types and Helpers
// ============================================

function createMockFileItem(overrides: Partial<IFileItem> = {}): IFileItem {
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

// ============================================
// Tests
// ============================================

describe('FileItem', () => {
  let wrapper: VueWrapper<InstanceType<typeof FileItem>>;

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
    it('should render file item with name', () => {
      const item = createMockFileItem({ name: 'test.txt' });

      wrapper = mount(FileItem, {
        props: { item },
        global: {
          stubs: { FileIcon: true },
        },
      });

      expect(wrapper.find('.file-item').exists()).toBe(true);
      expect(wrapper.find('.name-text').text()).toBe('test.txt');
    });

    it('should render directory item', () => {
      const item = createMockFileItem({
        path: '/test/Documents',
        name: 'Documents',
        type: 'directory',
      });

      wrapper = mount(FileItem, {
        props: { item },
        global: {
          stubs: { FileIcon: true },
        },
      });

      expect(wrapper.find('.file-item').classes()).toContain('is-directory');
    });

    it('should apply selected class when isSelected is true', () => {
      const item = createMockFileItem();

      wrapper = mount(FileItem, {
        props: { item, isSelected: true },
        global: {
          stubs: { FileIcon: true },
        },
      });

      expect(wrapper.find('.file-item').classes()).toContain('is-selected');
    });

    it('should apply hidden class when item is hidden', () => {
      const item = createMockFileItem({ isHidden: true });

      wrapper = mount(FileItem, {
        props: { item },
        global: {
          stubs: { FileIcon: true },
        },
      });

      expect(wrapper.find('.file-item').classes()).toContain('is-hidden');
    });

    it('should apply loading class when isLoading is true', () => {
      const item = createMockFileItem({
        path: '/test/Documents',
        name: 'Documents',
        type: 'directory',
      });

      wrapper = mount(FileItem, {
        props: { item, isLoading: true },
        global: {
          stubs: { FileIcon: true },
        },
      });

      expect(wrapper.find('.file-item').classes()).toContain('is-loading');
    });
  });

  // ============================================
  // Indentation Tests
  // ============================================

  describe('Indentation', () => {
    it('should apply correct padding for depth 0', () => {
      const item = createMockFileItem();

      wrapper = mount(FileItem, {
        props: { item, depth: 0 },
        global: {
          stubs: { FileIcon: true },
        },
      });

      const style = (wrapper.find('.file-item').element as HTMLElement).style.paddingLeft;
      expect(style).toBe('8px'); // 0 * 16 + 8
    });

    it('should apply correct padding for depth 1', () => {
      const item = createMockFileItem();

      wrapper = mount(FileItem, {
        props: { item, depth: 1 },
        global: {
          stubs: { FileIcon: true },
        },
      });

      const style = (wrapper.find('.file-item').element as HTMLElement).style.paddingLeft;
      expect(style).toBe('24px'); // 1 * 16 + 8
    });

    it('should apply correct padding for depth 5', () => {
      const item = createMockFileItem();

      wrapper = mount(FileItem, {
        props: { item, depth: 5 },
        global: {
          stubs: { FileIcon: true },
        },
      });

      const style = (wrapper.find('.file-item').element as HTMLElement).style.paddingLeft;
      expect(style).toBe('88px'); // 5 * 16 + 8
    });
  });

  // ============================================
  // File Size Tests
  // ============================================

  describe('File Size Display', () => {
    it('should display size in bytes for small files', () => {
      const item = createMockFileItem({ size: 512 });

      wrapper = mount(FileItem, {
        props: { item },
        global: {
          stubs: { FileIcon: true },
        },
      });

      expect(wrapper.find('.file-size').text()).toBe('512 B');
    });

    it('should display size in KB for medium files', () => {
      const item = createMockFileItem({ size: 2048 });

      wrapper = mount(FileItem, {
        props: { item },
        global: {
          stubs: { FileIcon: true },
        },
      });

      expect(wrapper.find('.file-size').text()).toBe('2.0 KB');
    });

    it('should display size in MB for large files', () => {
      const item = createMockFileItem({ size: 5 * 1024 * 1024 });

      wrapper = mount(FileItem, {
        props: { item },
        global: {
          stubs: { FileIcon: true },
        },
      });

      expect(wrapper.find('.file-size').text()).toBe('5.0 MB');
    });

    it('should display size in GB for very large files', () => {
      const item = createMockFileItem({ size: 2 * 1024 * 1024 * 1024 });

      wrapper = mount(FileItem, {
        props: { item },
        global: {
          stubs: { FileIcon: true },
        },
      });

      expect(wrapper.find('.file-size').text()).toBe('2.0 GB');
    });

    it('should not display size for directories', () => {
      const item = createMockFileItem({
        path: '/test/Documents',
        name: 'Documents',
        type: 'directory',
        size: 0,
      });

      wrapper = mount(FileItem, {
        props: { item },
        global: {
          stubs: { FileIcon: true },
        },
      });

      expect(wrapper.find('.file-size').exists()).toBe(false);
    });
  });

  // ============================================
  // Directory Expand/Collapse Tests
  // ============================================

  describe('Directory Expand/Collapse', () => {
    it('should show expand arrow for directories', () => {
      const item = createMockFileItem({
        path: '/test/Documents',
        name: 'Documents',
        type: 'directory',
      });

      wrapper = mount(FileItem, {
        props: { item },
        global: {
          stubs: { FileIcon: true },
        },
      });

      expect(wrapper.find('.expand-arrow').exists()).toBe(true);
    });

    it('should not show expand arrow for files', () => {
      const item = createMockFileItem();

      wrapper = mount(FileItem, {
        props: { item },
        global: {
          stubs: { FileIcon: true },
        },
      });

      expect(wrapper.find('.expand-arrow').exists()).toBe(false);
      expect(wrapper.find('.expand-placeholder').exists()).toBe(true);
    });

    it('should apply is-expanded class when expanded', () => {
      const item = createMockFileItem({
        path: '/test/Documents',
        name: 'Documents',
        type: 'directory',
      });

      wrapper = mount(FileItem, {
        props: { item, isExpanded: true },
        global: {
          stubs: { FileIcon: true },
        },
      });

      expect(wrapper.find('.expand-arrow').classes()).toContain('is-expanded');
    });

    it('should emit toggle event when arrow is clicked', async () => {
      const item = createMockFileItem({
        path: '/test/Documents',
        name: 'Documents',
        type: 'directory',
      });

      wrapper = mount(FileItem, {
        props: { item },
        global: {
          stubs: { FileIcon: true },
        },
      });

      await wrapper.find('.expand-arrow').trigger('click');

      expect(wrapper.emitted('toggle')).toBeTruthy();
      expect(wrapper.emitted('toggle')![0][0]).toEqual(item);
    });

    it('should not emit toggle when loading', async () => {
      const item = createMockFileItem({
        path: '/test/Documents',
        name: 'Documents',
        type: 'directory',
      });

      wrapper = mount(FileItem, {
        props: { item, isLoading: true },
        global: {
          stubs: { FileIcon: true },
        },
      });

      await wrapper.find('.expand-arrow').trigger('click');

      expect(wrapper.emitted('toggle')).toBeFalsy();
    });

    it('should show loading spinner when loading', () => {
      const item = createMockFileItem({
        path: '/test/Documents',
        name: 'Documents',
        type: 'directory',
      });

      wrapper = mount(FileItem, {
        props: { item, isLoading: true },
        global: {
          stubs: { FileIcon: true },
        },
      });

      const spinningSvg = wrapper.find('.expand-arrow .is-spinning');
      expect(spinningSvg.exists()).toBe(true);
    });
  });

  // ============================================
  // File Type Icon Tests
  // ============================================

  describe('File Type Icons', () => {
    it('should pass iconType to FileIcon component', () => {
      const item = createMockFileItem({
        name: 'app.ts',
        iconType: 'typescript',
      });

      wrapper = mount(FileItem, {
        props: { item },
        global: {
          stubs: { FileIcon: true },
        },
      });

      const fileIcon = wrapper.findComponent(FileIcon);
      expect(fileIcon.props('type')).toBe('typescript');
    });

    it('should pass isDirectory to FileIcon', () => {
      const item = createMockFileItem({
        path: '/test/Documents',
        name: 'Documents',
        type: 'directory',
      });

      wrapper = mount(FileItem, {
        props: { item },
        global: {
          stubs: { FileIcon: true },
        },
      });

      const fileIcon = wrapper.findComponent(FileIcon);
      expect(fileIcon.props('isDirectory')).toBe(true);
    });

    it('should pass isExpanded to FileIcon', () => {
      const item = createMockFileItem({
        path: '/test/Documents',
        name: 'Documents',
        type: 'directory',
      });

      wrapper = mount(FileItem, {
        props: { item, isExpanded: true },
        global: {
          stubs: { FileIcon: true },
        },
      });

      const fileIcon = wrapper.findComponent(FileIcon);
      expect(fileIcon.props('isExpanded')).toBe(true);
    });

    it('should pass size to FileIcon', () => {
      const item = createMockFileItem();

      wrapper = mount(FileItem, {
        props: { item },
        global: {
          stubs: { FileIcon: true },
        },
      });

      const fileIcon = wrapper.findComponent(FileIcon);
      expect(fileIcon.props('size')).toBe(16);
    });

    it('should use default iconType when not specified', () => {
      const item = createMockFileItem();

      wrapper = mount(FileItem, {
        props: { item },
        global: {
          stubs: { FileIcon: true },
        },
      });

      const fileIcon = wrapper.findComponent(FileIcon);
      expect(fileIcon.props('type')).toBe('file');
    });
  });

  // ============================================
  // Event Handling Tests
  // ============================================

  describe('Event Handling', () => {
    it('should emit click event with item and event', async () => {
      const item = createMockFileItem();

      wrapper = mount(FileItem, {
        props: { item },
        global: {
          stubs: { FileIcon: true },
        },
      });

      await wrapper.find('.file-item').trigger('click');

      expect(wrapper.emitted('click')).toBeTruthy();
      expect(wrapper.emitted('click')![0][0]).toEqual(item);
    });

    it('should emit dblclick event with item and event', async () => {
      const item = createMockFileItem();

      wrapper = mount(FileItem, {
        props: { item },
        global: {
          stubs: { FileIcon: true },
        },
      });

      await wrapper.find('.file-item').trigger('dblclick');

      expect(wrapper.emitted('dblclick')).toBeTruthy();
      expect(wrapper.emitted('dblclick')![0][0]).toEqual(item);
    });

    it('should emit contextmenu event with item and event', async () => {
      const item = createMockFileItem();

      wrapper = mount(FileItem, {
        props: { item },
        global: {
          stubs: { FileIcon: true },
        },
      });

      await wrapper.find('.file-item').trigger('contextmenu');

      expect(wrapper.emitted('contextmenu')).toBeTruthy();
      expect(wrapper.emitted('contextmenu')![0][0]).toEqual(item);
    });
  });

  // ============================================
  // Rename/Editing Tests
  // ============================================

  describe('Rename/Editing', () => {
    it('should show edit input when isEditing is true', () => {
      const item = createMockFileItem({ name: 'test.txt' });

      wrapper = mount(FileItem, {
        props: { item, isEditing: true },
        global: {
          stubs: { FileIcon: true },
        },
      });

      expect(wrapper.find('.edit-input').exists()).toBe(true);
      expect(wrapper.find('.name-text').exists()).toBe(false);
    });

    it('should show name text when not editing', () => {
      const item = createMockFileItem({ name: 'test.txt' });

      wrapper = mount(FileItem, {
        props: { item, isEditing: false },
        global: {
          stubs: { FileIcon: true },
        },
      });

      expect(wrapper.find('.name-text').exists()).toBe(true);
      expect(wrapper.find('.edit-input').exists()).toBe(false);
    });

    it('should initialize edit input with current name', () => {
      const item = createMockFileItem({ name: 'original.txt' });

      wrapper = mount(FileItem, {
        props: { item, isEditing: true },
        global: {
          stubs: { FileIcon: true },
        },
      });

      const input = wrapper.find('.edit-input').element as HTMLInputElement;
      expect(input.value).toBe('original.txt');
    });

    it('should emit rename event on Enter key', async () => {
      const item = createMockFileItem({ name: 'original.txt' });

      wrapper = mount(FileItem, {
        props: { item, isEditing: true },
        global: {
          stubs: { FileIcon: true },
        },
      });

      const input = wrapper.find('.edit-input');
      await input.setValue('new-name.txt');
      await input.trigger('keydown', { key: 'Enter' });

      expect(wrapper.emitted('rename')).toBeTruthy();
      expect(wrapper.emitted('rename')![0][0]).toEqual(item);
      expect(wrapper.emitted('rename')![0][1]).toBe('new-name.txt');
    });

    it('should not emit rename event if name unchanged', async () => {
      const item = createMockFileItem({ name: 'original.txt' });

      wrapper = mount(FileItem, {
        props: { item, isEditing: true },
        global: {
          stubs: { FileIcon: true },
        },
      });

      const input = wrapper.find('.edit-input');
      await input.trigger('keydown', { key: 'Enter' });

      expect(wrapper.emitted('rename')).toBeFalsy();
    });

    it('should not emit rename event if name is empty', async () => {
      const item = createMockFileItem({ name: 'original.txt' });

      wrapper = mount(FileItem, {
        props: { item, isEditing: true },
        global: {
          stubs: { FileIcon: true },
        },
      });

      const input = wrapper.find('.edit-input');
      await input.setValue('   ');
      await input.trigger('keydown', { key: 'Enter' });

      expect(wrapper.emitted('rename')).toBeFalsy();
    });

    it('should cancel edit on Escape key', async () => {
      const item = createMockFileItem({ name: 'original.txt' });

      wrapper = mount(FileItem, {
        props: { item, isEditing: true },
        global: {
          stubs: { FileIcon: true },
        },
      });

      const input = wrapper.find('.edit-input');
      await input.setValue('changed.txt');
      await input.trigger('keydown', { key: 'Escape' });

      // Should not emit rename
      expect(wrapper.emitted('rename')).toBeFalsy();

      // Value should be reset
      const inputElement = wrapper.find('.edit-input').element as HTMLInputElement;
      expect(inputElement.value).toBe('original.txt');
    });

    it('should emit rename on blur', async () => {
      const item = createMockFileItem({ name: 'original.txt' });

      wrapper = mount(FileItem, {
        props: { item, isEditing: true },
        global: {
          stubs: { FileIcon: true },
        },
      });

      const input = wrapper.find('.edit-input');
      await input.setValue('new-name.txt');
      await input.trigger('blur');

      expect(wrapper.emitted('rename')).toBeTruthy();
    });

    it('should stop propagation on edit input click', async () => {
      const item = createMockFileItem({ name: 'test.txt' });

      wrapper = mount(FileItem, {
        props: { item, isEditing: true },
        global: {
          stubs: { FileIcon: true },
        },
      });

      // Click on input should not propagate to file-item
      const input = wrapper.find('.edit-input');
      await input.trigger('click');

      // Should not emit click on file-item
      expect(wrapper.emitted('click')).toBeFalsy();
    });
  });

  // ============================================
  // UI Styles Tests
  // ============================================

  describe('UI Styles', () => {
    it('should have file-item class', () => {
      const item = createMockFileItem();

      wrapper = mount(FileItem, {
        props: { item },
        global: {
          stubs: { FileIcon: true },
        },
      });

      expect(wrapper.find('.file-item').classes()).toContain('file-item');
    });

    it('should have title attribute with path', () => {
      const item = createMockFileItem({ path: '/home/user/file.txt' });

      wrapper = mount(FileItem, {
        props: { item },
        global: {
          stubs: { FileIcon: true },
        },
      });

      expect(wrapper.find('.name-text').attributes('title')).toBe('/home/user/file.txt');
    });
  });

  // ============================================
  // Edge Cases Tests
  // ============================================

  describe('Edge Cases', () => {
    it('should handle file with no extension', () => {
      const item = createMockFileItem({ name: 'Makefile' });

      wrapper = mount(FileItem, {
        props: { item },
        global: {
          stubs: { FileIcon: true },
        },
      });

      expect(wrapper.find('.name-text').text()).toBe('Makefile');
    });

    it('should handle file with multiple extensions', () => {
      const item = createMockFileItem({ name: 'file.test.ts' });

      wrapper = mount(FileItem, {
        props: { item },
        global: {
          stubs: { FileIcon: true },
        },
      });

      expect(wrapper.find('.name-text').text()).toBe('file.test.ts');
    });

    it('should handle file with special characters in name', () => {
      const item = createMockFileItem({ name: 'file with spaces.txt' });

      wrapper = mount(FileItem, {
        props: { item },
        global: {
          stubs: { FileIcon: true },
        },
      });

      expect(wrapper.find('.name-text').text()).toBe('file with spaces.txt');
    });

    it('should handle Unicode file names', () => {
      const item = createMockFileItem({ name: '文件.txt' });

      wrapper = mount(FileItem, {
        props: { item },
        global: {
          stubs: { FileIcon: true },
        },
      });

      expect(wrapper.find('.name-text').text()).toBe('文件.txt');
    });

    it('should handle very long file names', () => {
      const longName = 'a'.repeat(200) + '.txt';
      const item = createMockFileItem({ name: longName });

      wrapper = mount(FileItem, {
        props: { item },
        global: {
          stubs: { FileIcon: true },
        },
      });

      expect(wrapper.find('.name-text').text()).toBe(longName);
    });

    it('should handle zero byte files', () => {
      const item = createMockFileItem({ size: 0 });

      wrapper = mount(FileItem, {
        props: { item },
        global: {
          stubs: { FileIcon: true },
        },
      });

      expect(wrapper.find('.file-size').text()).toBe('0 B');
    });

    it('should handle files at size boundaries', () => {
      // 1023 bytes
      let item = createMockFileItem({ size: 1023 });
      wrapper = mount(FileItem, {
        props: { item },
        global: { stubs: { FileIcon: true } },
      });
      expect(wrapper.find('.file-size').text()).toBe('1023 B');
      wrapper.unmount();

      // 1024 bytes = 1 KB
      item = createMockFileItem({ size: 1024 });
      wrapper = mount(FileItem, {
        props: { item },
        global: { stubs: { FileIcon: true } },
      });
      expect(wrapper.find('.file-size').text()).toBe('1.0 KB');
    });
  });
});
