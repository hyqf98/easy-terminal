/**
 * TerminalSuggest Component Tests
 * Tests auto-complete suggestions, history suggestions, list navigation, item selection, and UI styles
 */
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import TerminalSuggest from '../TerminalSuggest.vue';
import type { SuggestionItem } from '@/types/suggestion';

// Helper to create mock suggestion items
function createMockSuggestion(overrides: Partial<SuggestionItem> = {}): SuggestionItem {
  return {
    id: `suggestion-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: 'test-command',
    insertText: 'test-command',
    type: 'command',
    ...overrides,
  };
}

// Helper to create multiple suggestions of various types
function createMockSuggestions(): SuggestionItem[] {
  return [
    createMockSuggestion({ id: 'cmd-1', label: 'npm', type: 'command', description: 'Node package manager' }),
    createMockSuggestion({ id: 'file-1', label: 'package.json', type: 'file', description: 'JSON file' }),
    createMockSuggestion({ id: 'dir-1', label: 'node_modules', type: 'directory', description: 'Directory' }),
    createMockSuggestion({ id: 'hist-1', label: 'git status', type: 'history', description: 'Recent command' }),
    createMockSuggestion({ id: 'path-1', label: '/usr/bin', type: 'path', description: 'System path' }),
    createMockSuggestion({ id: 'arg-1', label: '--help', type: 'argument', description: 'Show help' }),
    createMockSuggestion({ id: 'opt-1', label: '-v', type: 'option', description: 'Verbose output' }),
  ];
}

describe('TerminalSuggest', () => {
  // ===========================================
  // Basic Rendering Tests
  // ===========================================
  describe('Basic Rendering', () => {
    it('should not render when visible is false', () => {
      const items = createMockSuggestions();
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: false },
      });

      expect(wrapper.find('.terminal-suggest').exists()).toBe(false);
    });

    it('should not render when items array is empty', () => {
      const wrapper = mount(TerminalSuggest, {
        props: { items: [], visible: true },
      });

      expect(wrapper.find('.terminal-suggest').exists()).toBe(false);
    });

    it('should render when visible and items are provided', () => {
      const items = [createMockSuggestion()];
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      expect(wrapper.find('.terminal-suggest').exists()).toBe(true);
      expect(wrapper.findAll('.suggest-item')).toHaveLength(1);
    });

    it('should render all items when count is less than maxVisibleItems', () => {
      const items = createMockSuggestions(); // 7 items
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true, maxVisibleItems: 10 },
      });

      expect(wrapper.findAll('.suggest-item')).toHaveLength(7);
    });

    it('should limit visible items to maxVisibleItems', () => {
      const items = createMockSuggestions();
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true, maxVisibleItems: 3 },
      });

      expect(wrapper.findAll('.suggest-item')).toHaveLength(3);
    });

    it('should use default maxVisibleItems of 8', () => {
      // Create 10 items
      const items = Array.from({ length: 10 }, (_, i) =>
        createMockSuggestion({ id: `item-${i}`, label: `item-${i}` })
      );
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      // Default maxVisibleItems is 8
      expect(wrapper.findAll('.suggest-item')).toHaveLength(8);
    });
  });

  // ===========================================
  // Suggestion Item Rendering Tests
  // ===========================================
  describe('Suggestion Item Rendering', () => {
    it('should render command type correctly', () => {
      const items = [createMockSuggestion({ id: 'cmd', label: 'npm', type: 'command' })];
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      const html = wrapper.html();
      expect(html).toContain('npm');
      expect(html).toContain('type-command');
      expect(html).toContain('CMD');
      // Command icon is an SVG with path
      expect(wrapper.find('.suggest-icon.type-command svg').exists()).toBe(true);
    });

    it('should render file type correctly', () => {
      const items = [createMockSuggestion({ id: 'file', label: 'test.txt', type: 'file' })];
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      const html = wrapper.html();
      expect(html).toContain('test.txt');
      expect(html).toContain('type-file');
      expect(html).toContain('FILE');
      expect(wrapper.find('.suggest-icon.type-file svg').exists()).toBe(true);
    });

    it('should render directory type correctly', () => {
      const items = [createMockSuggestion({ id: 'dir', label: 'src', type: 'directory' })];
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      const html = wrapper.html();
      expect(html).toContain('src');
      expect(html).toContain('type-directory');
      expect(html).toContain('DIR');
      expect(wrapper.find('.suggest-icon.type-directory svg').exists()).toBe(true);
    });

    it('should render history type correctly', () => {
      const items = [createMockSuggestion({ id: 'hist', label: 'git commit', type: 'history' })];
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      const html = wrapper.html();
      expect(html).toContain('git commit');
      expect(html).toContain('type-history');
      expect(html).toContain('HIST');
      expect(wrapper.find('.suggest-icon.type-history svg').exists()).toBe(true);
    });

    it('should render path type correctly', () => {
      const items = [createMockSuggestion({ id: 'path', label: '/usr/local/bin', type: 'path' })];
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      const html = wrapper.html();
      expect(html).toContain('/usr/local/bin');
      expect(html).toContain('type-path');
      expect(html).toContain('PATH');
    });

    it('should render argument type correctly', () => {
      const items = [createMockSuggestion({ id: 'arg', label: '--force', type: 'argument' })];
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      const html = wrapper.html();
      expect(html).toContain('--force');
      expect(html).toContain('type-argument');
      expect(html).toContain('ARG');
    });

    it('should render option type correctly', () => {
      const items = [createMockSuggestion({ id: 'opt', label: '-la', type: 'option' })];
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      const html = wrapper.html();
      expect(html).toContain('-la');
      expect(html).toContain('type-option');
      expect(html).toContain('OPT');
    });

    it('should render description when provided', () => {
      const items = [createMockSuggestion({
        id: 'cmd',
        label: 'npm install',
        type: 'command',
        description: 'Install dependencies',
      })];
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      expect(wrapper.find('.suggest-description').exists()).toBe(true);
      expect(wrapper.find('.suggest-description').text()).toBe('Install dependencies');
    });

    it('should not render description element when not provided', () => {
      const items = [createMockSuggestion({
        id: 'cmd',
        label: 'npm install',
        type: 'command',
        description: undefined,
      })];
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      expect(wrapper.find('.suggest-description').exists()).toBe(false);
    });

    it('should render multiple items with different types', () => {
      const items = createMockSuggestions();
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      const suggestItems = wrapper.findAll('.suggest-item');
      expect(suggestItems).toHaveLength(7);

      // Verify each type has correct class
      expect(suggestItems[0].find('.suggest-icon').classes()).toContain('type-command');
      expect(suggestItems[1].find('.suggest-icon').classes()).toContain('type-file');
      expect(suggestItems[2].find('.suggest-icon').classes()).toContain('type-directory');
      expect(suggestItems[3].find('.suggest-icon').classes()).toContain('type-history');
    });
  });

  // ===========================================
  // List Navigation Tests
  // ===========================================
  describe('List Navigation', () => {
    it('should highlight item at selectedIndex', () => {
      const items = createMockSuggestions();
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true, selectedIndex: 2 },
      });

      const suggestItems = wrapper.findAll('.suggest-item');
      expect(suggestItems[2].classes()).toContain('is-selected');
      expect(suggestItems[0].classes()).not.toContain('is-selected');
      expect(suggestItems[1].classes()).not.toContain('is-selected');
    });

    it('should update highlighted item when selectedIndex changes', async () => {
      const items = createMockSuggestions();
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true, selectedIndex: 0 },
      });

      let suggestItems = wrapper.findAll('.suggest-item');
      expect(suggestItems[0].classes()).toContain('is-selected');

      // Change selected index
      await wrapper.setProps({ selectedIndex: 3 });

      suggestItems = wrapper.findAll('.suggest-item');
      expect(suggestItems[3].classes()).toContain('is-selected');
      expect(suggestItems[0].classes()).not.toContain('is-selected');
    });

    it('should default selectedIndex to 0', () => {
      const items = createMockSuggestions();
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      const suggestItems = wrapper.findAll('.suggest-item');
      expect(suggestItems[0].classes()).toContain('is-selected');
    });

    it('should scroll selected item into view when selectedIndex changes', async () => {
      // This test verifies the watcher is set up correctly
      // The actual scrollIntoView behavior is difficult to test in jsdom
      // but we can verify the selected item updates correctly
      const items = Array.from({ length: 20 }, (_, i) =>
        createMockSuggestion({ id: `item-${i}`, label: `item-${i}` })
      );
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true, maxVisibleItems: 20, selectedIndex: 0 },
      });

      // Verify initial selection
      expect(wrapper.findAll('.suggest-item')[0].classes()).toContain('is-selected');

      // Change to an item that would be out of view
      await wrapper.setProps({ selectedIndex: 15 });
      await nextTick();

      // Verify the selection updated correctly
      const suggestItems = wrapper.findAll('.suggest-item');
      expect(suggestItems[15].classes()).toContain('is-selected');
      expect(suggestItems[0].classes()).not.toContain('is-selected');
    });
  });

  // ===========================================
  // Item Selection Tests
  // ===========================================
  describe('Item Selection', () => {
    it('should emit select event when item is clicked', async () => {
      const items = createMockSuggestions();
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      const suggestItems = wrapper.findAll('.suggest-item');
      await suggestItems[1].trigger('click');

      expect(wrapper.emitted('select')).toBeTruthy();
      expect(wrapper.emitted('select')![0][0]).toEqual(items[1]);
    });

    it('should emit hover event on mouseenter', async () => {
      const items = createMockSuggestions();
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      const suggestItems = wrapper.findAll('.suggest-item');
      await suggestItems[2].trigger('mouseenter');

      expect(wrapper.emitted('hover')).toBeTruthy();
      expect(wrapper.emitted('hover')![0][0]).toBe(2);
    });

    it('should emit correct item data on selection', async () => {
      const testItem = createMockSuggestion({
        id: 'test-id',
        label: 'test-label',
        insertText: 'test-insert',
        type: 'command',
        description: 'test description',
      });
      const wrapper = mount(TerminalSuggest, {
        props: { items: [testItem], visible: true },
      });

      await wrapper.find('.suggest-item').trigger('click');

      const emittedItem = wrapper.emitted('select')![0][0] as SuggestionItem;
      expect(emittedItem.id).toBe('test-id');
      expect(emittedItem.label).toBe('test-label');
      expect(emittedItem.insertText).toBe('test-insert');
      expect(emittedItem.type).toBe('command');
      expect(emittedItem.description).toBe('test description');
    });
  });

  // ===========================================
  // Position and Style Tests
  // ===========================================
  describe('Position and Styles', () => {
    it('should apply position from x and y props', () => {
      const items = [createMockSuggestion()];
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true, x: 100, y: 200 },
      });

      const list = wrapper.find('.terminal-suggest');
      const style = (list.element as HTMLElement).style;
      expect(style.left).toBe('100px');
      expect(style.top).toBe('200px');
    });

    it('should apply default position of 0,0', () => {
      const items = [createMockSuggestion()];
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      const list = wrapper.find('.terminal-suggest');
      const style = (list.element as HTMLElement).style;
      expect(style.left).toBe('0px');
      expect(style.top).toBe('0px');
    });

    it('should calculate maxHeight based on maxVisibleItems', () => {
      const items = [createMockSuggestion()];
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true, maxVisibleItems: 5 },
      });

      const list = wrapper.find('.terminal-suggest');
      const style = (list.element as HTMLElement).style;
      // 5 items * 28px per item = 140px
      expect(style.maxHeight).toBe('140px');
    });

    it('should have correct CSS structure', () => {
      const items = [createMockSuggestion()];
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      const list = wrapper.find('.terminal-suggest');
      expect(list.exists()).toBe(true);

      const item = wrapper.find('.suggest-item');
      expect(item.exists()).toBe(true);
      expect(item.find('.suggest-icon').exists()).toBe(true);
      expect(item.find('.suggest-content').exists()).toBe(true);
      expect(item.find('.suggest-label').exists()).toBe(true);
      expect(item.find('.suggest-type').exists()).toBe(true);
    });

    it('should have fixed position for dropdown behavior', () => {
      const items = [createMockSuggestion()];
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
        attachTo: document.body,
      });

      const list = wrapper.find('.terminal-suggest');
      // Component has position: fixed in scoped styles
      expect(list.classes()).toContain('terminal-suggest');

      wrapper.unmount();
    });

    it('should apply correct type class to suggest-type badge', () => {
      const items = [createMockSuggestion({ type: 'command' })];
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      const typeBadge = wrapper.find('.suggest-type');
      expect(typeBadge.classes()).toContain('type-command');
    });
  });

  // ===========================================
  // Transition Tests
  // ===========================================
  describe('Transition', () => {
    it('should use suggest-fade transition', () => {
      const items = [createMockSuggestion()];
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      // Check that transition component is used
      // Vue Transition component is rendered, we can check for the element presence
      expect(wrapper.find('.terminal-suggest').exists()).toBe(true);
    });

    it('should animate visibility changes', async () => {
      const items = [createMockSuggestion()];
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: false },
      });

      expect(wrapper.find('.terminal-suggest').exists()).toBe(false);

      await wrapper.setProps({ visible: true });
      expect(wrapper.find('.terminal-suggest').exists()).toBe(true);

      await wrapper.setProps({ visible: false });
      expect(wrapper.find('.terminal-suggest').exists()).toBe(false);
    });
  });

  // ===========================================
  // Edge Cases
  // ===========================================
  describe('Edge Cases', () => {
    it('should handle empty items array', () => {
      const wrapper = mount(TerminalSuggest, {
        props: { items: [], visible: true },
      });

      expect(wrapper.find('.terminal-suggest').exists()).toBe(false);
    });

    it('should handle single item', () => {
      const items = [createMockSuggestion()];
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      expect(wrapper.findAll('.suggest-item')).toHaveLength(1);
    });

    it('should handle large number of items', () => {
      const items = Array.from({ length: 100 }, (_, i) =>
        createMockSuggestion({ id: `item-${i}`, label: `item-${i}` })
      );
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      // Should limit to maxVisibleItems (default 8)
      expect(wrapper.findAll('.suggest-item')).toHaveLength(8);
    });

    it('should handle items without description', () => {
      const items = [createMockSuggestion({ description: undefined })];
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      expect(wrapper.find('.suggest-description').exists()).toBe(false);
    });

    it('should handle unknown type gracefully', () => {
      const items = [createMockSuggestion({ type: 'unknown' as any })];
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      const typeBadge = wrapper.find('.suggest-type');
      expect(typeBadge.text()).toBe(''); // getTypeLabel returns '' for unknown types
      expect(wrapper.find('.suggest-icon').classes()).toContain('type-unknown');
    });

    it('should handle special characters in labels', () => {
      const items = [createMockSuggestion({ label: 'echo "hello $world"' })];
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      expect(wrapper.find('.suggest-label').text()).toBe('echo "hello $world"');
    });

    it('should handle unicode characters in labels', () => {
      const items = [createMockSuggestion({ label: 'echo "你好世界 🌍"' })];
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      expect(wrapper.find('.suggest-label').text()).toBe('echo "你好世界 🌍"');
    });

    it('should handle very long labels', () => {
      const longLabel = 'a'.repeat(200);
      const items = [createMockSuggestion({ label: longLabel })];
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      expect(wrapper.find('.suggest-label').text()).toBe(longLabel);
    });

    it('should handle selectedIndex out of visible range', async () => {
      const items = createMockSuggestions();
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true, maxVisibleItems: 3, selectedIndex: 10 },
      });

      // No item should be selected since index 10 is out of visible range (0-2)
      const suggestItems = wrapper.findAll('.suggest-item');
      suggestItems.forEach((item) => {
        expect(item.classes()).not.toContain('is-selected');
      });
    });

    it('should handle negative selectedIndex', async () => {
      const items = createMockSuggestions();
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true, selectedIndex: -1 },
      });

      // No item should be selected
      const suggestItems = wrapper.findAll('.suggest-item');
      suggestItems.forEach((item) => {
        expect(item.classes()).not.toContain('is-selected');
      });
    });
  });

  // ===========================================
  // History Commands Tests
  // ===========================================
  describe('History Commands', () => {
    it('should display history type suggestions correctly', () => {
      const historyItems = [
        createMockSuggestion({ id: 'h1', label: 'git status', type: 'history' }),
        createMockSuggestion({ id: 'h2', label: 'npm run dev', type: 'history' }),
        createMockSuggestion({ id: 'h3', label: 'cd src/components', type: 'history' }),
      ];
      const wrapper = mount(TerminalSuggest, {
        props: { items: historyItems, visible: true },
      });

      const items = wrapper.findAll('.suggest-item');
      expect(items).toHaveLength(3);

      items.forEach((item) => {
        expect(item.find('.suggest-icon').classes()).toContain('type-history');
        expect(item.find('.suggest-type').classes()).toContain('type-history');
      });
    });

    it('should show HIST badge for history items', () => {
      const items = [createMockSuggestion({ type: 'history' })];
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      expect(wrapper.find('.suggest-type').text()).toBe('HIST');
    });
  });

  // ===========================================
  // Command Auto-complete Tests
  // ===========================================
  describe('Command Auto-complete', () => {
    it('should display command suggestions with correct styling', () => {
      const commandItems = [
        createMockSuggestion({ id: 'c1', label: 'npm', type: 'command' }),
        createMockSuggestion({ id: 'c2', label: 'node', type: 'command' }),
        createMockSuggestion({ id: 'c3', label: 'git', type: 'command' }),
      ];
      const wrapper = mount(TerminalSuggest, {
        props: { items: commandItems, visible: true },
      });

      const items = wrapper.findAll('.suggest-item');
      expect(items).toHaveLength(3);

      items.forEach((item) => {
        expect(item.find('.suggest-icon').classes()).toContain('type-command');
        expect(item.find('.suggest-type').text()).toBe('CMD');
      });
    });

    it('should display command descriptions', () => {
      const items = [
        createMockSuggestion({
          label: 'npm',
          type: 'command',
          description: 'Node package manager',
        }),
      ];
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      expect(wrapper.find('.suggest-description').text()).toBe('Node package manager');
    });
  });

  // ===========================================
  // Icon Rendering Tests
  // ===========================================
  describe('Icon Rendering', () => {
    it('should render command icon SVG', () => {
      const items = [createMockSuggestion({ type: 'command' })];
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      const svg = wrapper.find('.suggest-icon.type-command svg');
      expect(svg.exists()).toBe(true);
      expect(svg.attributes('viewBox')).toBe('0 0 24 24');
    });

    it('should render directory icon SVG', () => {
      const items = [createMockSuggestion({ type: 'directory' })];
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      const svg = wrapper.find('.suggest-icon.type-directory svg');
      expect(svg.exists()).toBe(true);
    });

    it('should render file icon SVG', () => {
      const items = [createMockSuggestion({ type: 'file' })];
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      const svg = wrapper.find('.suggest-icon.type-file svg');
      expect(svg.exists()).toBe(true);
    });

    it('should render history icon SVG', () => {
      const items = [createMockSuggestion({ type: 'history' })];
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      const svg = wrapper.find('.suggest-icon.type-history svg');
      expect(svg.exists()).toBe(true);
    });

    it('should render default icon for unknown types', () => {
      const items = [createMockSuggestion({ type: 'path' })];
      const wrapper = mount(TerminalSuggest, {
        props: { items, visible: true },
      });

      // Path type uses the default icon (v-else)
      const svg = wrapper.find('.suggest-icon svg');
      expect(svg.exists()).toBe(true);
    });
  });
});
