/**
 * SplitContainer Component Tests
 * Tests horizontal/vertical splitting, resize, focus, and UI styles
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import SplitContainer, { type SplitPane, type SplitNode, type PaneNode } from '../SplitContainer.vue';

// Helper to create a pane node
function createPaneNode(id: string, sessionId?: string): PaneNode {
  return {
    id,
    type: 'pane',
    sessionId: sessionId || `session-${id}`,
  };
}

// Helper to create a split node
function createSplitNode(
  id: string,
  direction: 'horizontal' | 'vertical',
  children: [SplitPane, SplitPane],
  sizes: [number, number] = [50, 50]
): SplitNode {
  return {
    id,
    type: 'split',
    direction,
    children,
    sizes,
  };
}

// Helper to create a nested split structure
function createNestedSplit(): SplitNode {
  return createSplitNode('root', 'horizontal', [
    createPaneNode('pane-1', 'session-1'),
    createSplitNode('split-2', 'vertical', [
      createPaneNode('pane-2', 'session-2'),
      createPaneNode('pane-3', 'session-3'),
    ], [60, 40]),
  ], [70, 30]);
}

describe('SplitContainer', () => {
  // ===========================================
  // Basic Rendering Tests
  // ===========================================
  describe('Basic Rendering', () => {
    it('should render single pane correctly', () => {
      const pane = createPaneNode('pane-1', 'session-1');
      const wrapper = mount(SplitContainer, {
        props: { root: pane },
        slots: {
          default: '<div class="test-content">Content</div>',
        },
      });

      expect(wrapper.find('.split-container').exists()).toBe(true);
      expect(wrapper.find('.test-content').exists()).toBe(true);
      expect(wrapper.find('.split-bar').exists()).toBe(false);
    });

    it('should render split container with correct structure', () => {
      const split = createSplitNode('split-1', 'horizontal', [
        createPaneNode('pane-1'),
        createPaneNode('pane-2'),
      ]);

      const wrapper = mount(SplitContainer, {
        props: { root: split },
        slots: {
          default: '<div class="test-content"></div>',
        },
      });

      expect(wrapper.find('.split-container').exists()).toBe(true);
      expect(wrapper.findAll('.split-pane')).toHaveLength(2);
      expect(wrapper.find('.split-bar').exists()).toBe(true);
    });

    it('should render nested splits correctly', () => {
      const nested = createNestedSplit();
      const wrapper = mount(SplitContainer, {
        props: { root: nested },
        slots: {
          default: '<div class="test-content"></div>',
        },
      });

      // Root split + nested split = 2 split bars
      expect(wrapper.findAll('.split-bar')).toHaveLength(2);
      // Root container + 1 for each child of root split + 2 for nested split children = 5 containers
      // (each SplitContainer recursively renders, and leaf panes also have a container)
      expect(wrapper.findAll('.split-container').length).toBeGreaterThanOrEqual(2);
    });
  });

  // ===========================================
  // Horizontal Split Tests
  // ===========================================
  describe('Horizontal Split', () => {
    it('should apply horizontal flex direction', () => {
      const split = createSplitNode('split-1', 'horizontal', [
        createPaneNode('pane-1'),
        createPaneNode('pane-2'),
      ]);

      const wrapper = mount(SplitContainer, {
        props: { root: split },
      });

      const container = wrapper.find('.split-container');
      expect((container.element as HTMLElement).style.flexDirection).toBe('row');
    });

    it('should set width for horizontal split panes', () => {
      const split = createSplitNode('split-1', 'horizontal', [
        createPaneNode('pane-1'),
        createPaneNode('pane-2'),
      ], [70, 30]);

      const wrapper = mount(SplitContainer, {
        props: { root: split },
      });

      const panes = wrapper.findAll('.split-pane');
      expect((panes[0].element as HTMLElement).style.width).toBe('70%');
      expect((panes[1].element as HTMLElement).style.width).toBe('30%');
    });

    it('should apply horizontal class to split bar', () => {
      const split = createSplitNode('split-1', 'horizontal', [
        createPaneNode('pane-1'),
        createPaneNode('pane-2'),
      ]);

      const wrapper = mount(SplitContainer, {
        props: { root: split },
      });

      const splitBar = wrapper.find('.split-bar');
      expect(splitBar.classes()).toContain('is-horizontal');
      expect(splitBar.classes()).not.toContain('is-vertical');
    });
  });

  // ===========================================
  // Vertical Split Tests
  // ===========================================
  describe('Vertical Split', () => {
    it('should apply vertical flex direction', () => {
      const split = createSplitNode('split-1', 'vertical', [
        createPaneNode('pane-1'),
        createPaneNode('pane-2'),
      ]);

      const wrapper = mount(SplitContainer, {
        props: { root: split },
      });

      const container = wrapper.find('.split-container');
      expect((container.element as HTMLElement).style.flexDirection).toBe('column');
    });

    it('should set height for vertical split panes', () => {
      const split = createSplitNode('split-1', 'vertical', [
        createPaneNode('pane-1'),
        createPaneNode('pane-2'),
      ], [60, 40]);

      const wrapper = mount(SplitContainer, {
        props: { root: split },
      });

      const panes = wrapper.findAll('.split-pane');
      expect((panes[0].element as HTMLElement).style.height).toBe('60%');
      expect((panes[1].element as HTMLElement).style.height).toBe('40%');
    });

    it('should apply vertical class to split bar', () => {
      const split = createSplitNode('split-1', 'vertical', [
        createPaneNode('pane-1'),
        createPaneNode('pane-2'),
      ]);

      const wrapper = mount(SplitContainer, {
        props: { root: split },
      });

      const splitBar = wrapper.find('.split-bar');
      expect(splitBar.classes()).toContain('is-vertical');
      expect(splitBar.classes()).not.toContain('is-horizontal');
    });
  });

  // ===========================================
  // Split Ratio / Resize Tests
  // ===========================================
  describe('Split Ratio / Resize', () => {
    it('should render with custom split ratios', () => {
      const split = createSplitNode('split-1', 'horizontal', [
        createPaneNode('pane-1'),
        createPaneNode('pane-2'),
      ], [25, 75]);

      const wrapper = mount(SplitContainer, {
        props: { root: split },
      });

      const panes = wrapper.findAll('.split-pane');
      expect((panes[0].element as HTMLElement).style.width).toBe('25%');
      expect((panes[1].element as HTMLElement).style.width).toBe('75%');
    });

    it('should emit resize event on drag', async () => {
      const split = createSplitNode('split-1', 'horizontal', [
        createPaneNode('pane-1'),
        createPaneNode('pane-2'),
      ], [50, 50]);

      const wrapper = mount(SplitContainer, {
        props: { root: split },
        attachTo: document.body,
      });

      const splitBar = wrapper.find('.split-bar');

      // Mock getBoundingClientRect
      const mockContainer = {
        getBoundingClientRect: () => ({
          width: 1000,
          height: 500,
          left: 0,
          top: 0,
          right: 1000,
          bottom: 500,
          x: 0,
          y: 0,
          toJSON: () => {},
        }),
      };

      // Find the container element and mock its getBoundingClientRect
      const containerElement = wrapper.find('.split-container').element;
      vi.spyOn(containerElement, 'closest').mockReturnValue(mockContainer as unknown as Element);

      // Simulate mousedown
      await splitBar.trigger('mousedown', {
        clientX: 500,
        clientY: 250,
      });

      // Simulate mousemove
      document.dispatchEvent(new MouseEvent('mousemove', {
        clientX: 600,
        clientY: 250,
      }));

      await nextTick();

      // Should emit resize event
      expect(wrapper.emitted('resize')).toBeTruthy();

      // Cleanup: simulate mouseup
      document.dispatchEvent(new MouseEvent('mouseup'));

      wrapper.unmount();
    });

    it('should apply dragging class during resize', async () => {
      const split = createSplitNode('split-1', 'horizontal', [
        createPaneNode('pane-1'),
        createPaneNode('pane-2'),
      ]);

      const wrapper = mount(SplitContainer, {
        props: { root: split },
        attachTo: document.body,
      });

      const splitBar = wrapper.find('.split-bar');

      // Mock container
      const containerElement = wrapper.find('.split-container').element;
      vi.spyOn(containerElement, 'closest').mockReturnValue({
        getBoundingClientRect: () => ({
          width: 1000, height: 500, left: 0, top: 0, right: 1000, bottom: 500, x: 0, y: 0, toJSON: () => {},
        }),
      } as unknown as Element);

      // Initially not dragging
      expect(splitBar.classes()).not.toContain('is-dragging');

      // Start drag
      await splitBar.trigger('mousedown', { clientX: 500, clientY: 250 });

      // Should have dragging class
      expect(splitBar.classes()).toContain('is-dragging');

      // End drag
      document.dispatchEvent(new MouseEvent('mouseup'));
      await nextTick();

      // Should not have dragging class
      expect(splitBar.classes()).not.toContain('is-dragging');

      wrapper.unmount();
    });
  });

  // ===========================================
  // Focus Tests
  // ===========================================
  describe('Focus Switching', () => {
    it('should emit focus event from nested containers', async () => {
      const nested = createNestedSplit();
      const wrapper = mount(SplitContainer, {
        props: { root: nested },
      });

      // Find a nested SplitContainer and trigger focus
      const nestedContainers = wrapper.findAllComponents(SplitContainer);
      expect(nestedContainers.length).toBeGreaterThan(0);

      // The focus event should bubble up
      nestedContainers[0].vm.$emit('focus', 'pane-1');
      await nextTick();

      // Focus event should be emitted
      expect(wrapper.emitted('focus')).toBeTruthy();
    });
  });

  // ===========================================
  // Split Bar Style Tests
  // ===========================================
  describe('Split Bar Styles', () => {
    it('should have correct split-bar element', () => {
      const split = createSplitNode('split-1', 'horizontal', [
        createPaneNode('pane-1'),
        createPaneNode('pane-2'),
      ]);

      const wrapper = mount(SplitContainer, {
        props: { root: split },
      });

      const splitBar = wrapper.find('.split-bar');
      expect(splitBar.exists()).toBe(true);
      expect(splitBar.find('.split-bar-handle').exists()).toBe(true);
    });

    it('should have horizontal cursor for horizontal split', () => {
      const split = createSplitNode('split-1', 'horizontal', [
        createPaneNode('pane-1'),
        createPaneNode('pane-2'),
      ]);

      const wrapper = mount(SplitContainer, {
        props: { root: split },
      });

      const splitBar = wrapper.find('.split-bar');
      // CSS cursor: col-resize is applied via class
      expect(splitBar.classes()).toContain('is-horizontal');
    });

    it('should have vertical cursor for vertical split', () => {
      const split = createSplitNode('split-1', 'vertical', [
        createPaneNode('pane-1'),
        createPaneNode('pane-2'),
      ]);

      const wrapper = mount(SplitContainer, {
        props: { root: split },
      });

      const splitBar = wrapper.find('.split-bar');
      // CSS cursor: row-resize is applied via class
      expect(splitBar.classes()).toContain('is-vertical');
    });

    it('should not render split bar for single pane', () => {
      const pane = createPaneNode('pane-1');
      const wrapper = mount(SplitContainer, {
        props: { root: pane },
      });

      expect(wrapper.find('.split-bar').exists()).toBe(false);
    });
  });

  // ===========================================
  // Minimum Size Constraint Tests
  // ===========================================
  describe('Minimum Size Constraints', () => {
    it('should use default minSize of 10%', async () => {
      const split = createSplitNode('split-1', 'horizontal', [
        createPaneNode('pane-1'),
        createPaneNode('pane-2'),
      ], [50, 50]);

      const wrapper = mount(SplitContainer, {
        props: { root: split },
        attachTo: document.body,
      });

      const splitBar = wrapper.find('.split-bar');

      // Mock container
      const containerElement = wrapper.find('.split-container').element;
      vi.spyOn(containerElement, 'closest').mockReturnValue({
        getBoundingClientRect: () => ({
          width: 1000, height: 500, left: 0, top: 0, right: 1000, bottom: 500, x: 0, y: 0, toJSON: () => {},
        }),
      } as unknown as Element);

      // Start drag
      await splitBar.trigger('mousedown', { clientX: 500, clientY: 250 });

      // Try to drag beyond min size (drag 500px left, which would make first pane 0%)
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 0, clientY: 250 }));
      await nextTick();

      const resizeEvents = wrapper.emitted('resize');
      expect(resizeEvents).toBeTruthy();

      // The emitted size should be clamped to minSize (10%)
      const lastResize = resizeEvents![resizeEvents!.length - 1];
      expect(lastResize[1]).toBeGreaterThanOrEqual(10);

      // Cleanup
      document.dispatchEvent(new MouseEvent('mouseup'));
      wrapper.unmount();
    });

    it('should respect custom minSize prop', async () => {
      const split = createSplitNode('split-1', 'horizontal', [
        createPaneNode('pane-1'),
        createPaneNode('pane-2'),
      ], [50, 50]);

      const wrapper = mount(SplitContainer, {
        props: {
          root: split,
          minSize: 20, // 20% minimum
        },
        attachTo: document.body,
      });

      const splitBar = wrapper.find('.split-bar');

      // Mock container
      const containerElement = wrapper.find('.split-container').element;
      vi.spyOn(containerElement, 'closest').mockReturnValue({
        getBoundingClientRect: () => ({
          width: 1000, height: 500, left: 0, top: 0, right: 1000, bottom: 500, x: 0, y: 0, toJSON: () => {},
        }),
      } as unknown as Element);

      // Start drag
      await splitBar.trigger('mousedown', { clientX: 500, clientY: 250 });

      // Try to drag beyond min size
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 0, clientY: 250 }));
      await nextTick();

      const resizeEvents = wrapper.emitted('resize');
      expect(resizeEvents).toBeTruthy();

      // The emitted size should be clamped to custom minSize (20%)
      const lastResize = resizeEvents![resizeEvents!.length - 1];
      expect(lastResize[1]).toBeGreaterThanOrEqual(20);

      // Cleanup
      document.dispatchEvent(new MouseEvent('mouseup'));
      wrapper.unmount();
    });

    it('should limit max size based on minSize', async () => {
      const split = createSplitNode('split-1', 'horizontal', [
        createPaneNode('pane-1'),
        createPaneNode('pane-2'),
      ], [50, 50]);

      const wrapper = mount(SplitContainer, {
        props: {
          root: split,
          minSize: 20,
        },
        attachTo: document.body,
      });

      const splitBar = wrapper.find('.split-bar');

      // Mock container
      const containerElement = wrapper.find('.split-container').element;
      vi.spyOn(containerElement, 'closest').mockReturnValue({
        getBoundingClientRect: () => ({
          width: 1000, height: 500, left: 0, top: 0, right: 1000, bottom: 500, x: 0, y: 0, toJSON: () => {},
        }),
      } as unknown as Element);

      // Start drag
      await splitBar.trigger('mousedown', { clientX: 500, clientY: 250 });

      // Try to drag beyond max size (100 - minSize = 80%)
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 1000, clientY: 250 }));
      await nextTick();

      const resizeEvents = wrapper.emitted('resize');
      expect(resizeEvents).toBeTruthy();

      // The emitted size should be clamped to maxSize (100 - 20 = 80%)
      const lastResize = resizeEvents![resizeEvents!.length - 1];
      expect(lastResize[1]).toBeLessThanOrEqual(80);

      // Cleanup
      document.dispatchEvent(new MouseEvent('mouseup'));
      wrapper.unmount();
    });
  });

  // ===========================================
  // Slot Tests
  // ===========================================
  describe('Slot Functionality', () => {
    it('should pass pane data to slot', () => {
      const pane = createPaneNode('pane-1', 'session-123');
      const wrapper = mount(SplitContainer, {
        props: { root: pane },
        slots: {
          default: (props: { pane: SplitPane; sessionId: string | undefined }) =>
            `<div class="slot-content">${props.sessionId}</div>`,
        },
      });

      expect(wrapper.html()).toContain('session-123');
    });

    it('should render slot content in split panes', () => {
      const split = createSplitNode('split-1', 'horizontal', [
        createPaneNode('pane-1', 'session-a'),
        createPaneNode('pane-2', 'session-b'),
      ]);

      const wrapper = mount(SplitContainer, {
        props: { root: split },
        slots: {
          default: (props: { pane: SplitPane; sessionId: string | undefined }) =>
            `<div class="slot-content">${props.sessionId}</div>`,
        },
      });

      expect(wrapper.html()).toContain('session-a');
      expect(wrapper.html()).toContain('session-b');
    });
  });

  // ===========================================
  // Touch Event Tests
  // ===========================================
  describe('Touch Events', () => {
    it('should handle touchstart for mobile resize', async () => {
      const split = createSplitNode('split-1', 'horizontal', [
        createPaneNode('pane-1'),
        createPaneNode('pane-2'),
      ]);

      const wrapper = mount(SplitContainer, {
        props: { root: split },
        attachTo: document.body,
      });

      const splitBar = wrapper.find('.split-bar');

      // Mock container
      const containerElement = wrapper.find('.split-container').element;
      vi.spyOn(containerElement, 'closest').mockReturnValue({
        getBoundingClientRect: () => ({
          width: 1000, height: 500, left: 0, top: 0, right: 1000, bottom: 500, x: 0, y: 0, toJSON: () => {},
        }),
      } as unknown as Element);

      // Simulate touchstart
      await splitBar.trigger('touchstart', {
        touches: [{ clientX: 500, clientY: 250 }],
      });

      // Should have dragging class
      expect(splitBar.classes()).toContain('is-dragging');

      // Cleanup
      document.dispatchEvent(new TouchEvent('touchend'));
      wrapper.unmount();
    });
  });

  // ===========================================
  // Edge Cases
  // ===========================================
  describe('Edge Cases', () => {
    it('should handle equal split ratios', () => {
      const split = createSplitNode('split-1', 'horizontal', [
        createPaneNode('pane-1'),
        createPaneNode('pane-2'),
      ], [50, 50]);

      const wrapper = mount(SplitContainer, {
        props: { root: split },
      });

      const panes = wrapper.findAll('.split-pane');
      expect((panes[0].element as HTMLElement).style.width).toBe('50%');
      expect((panes[1].element as HTMLElement).style.width).toBe('50%');
    });

    it('should handle extreme split ratios', () => {
      const split = createSplitNode('split-1', 'horizontal', [
        createPaneNode('pane-1'),
        createPaneNode('pane-2'),
      ], [90, 10]);

      const wrapper = mount(SplitContainer, {
        props: { root: split },
      });

      const panes = wrapper.findAll('.split-pane');
      expect((panes[0].element as HTMLElement).style.width).toBe('90%');
      expect((panes[1].element as HTMLElement).style.width).toBe('10%');
    });

    it('should handle deeply nested splits', () => {
      // Create a deeply nested structure
      const deepSplit = createSplitNode('level-3', 'vertical', [
        createPaneNode('pane-a'),
        createPaneNode('pane-b'),
      ]);

      const midSplit = createSplitNode('level-2', 'horizontal', [
        createPaneNode('pane-c'),
        deepSplit,
      ]);

      const rootSplit = createSplitNode('level-1', 'vertical', [
        midSplit,
        createPaneNode('pane-d'),
      ]);

      const wrapper = mount(SplitContainer, {
        props: { root: rootSplit },
      });

      // Should have 3 split bars (one at each level)
      expect(wrapper.findAll('.split-bar')).toHaveLength(3);
      // Should have multiple containers due to recursive structure
      expect(wrapper.findAll('.split-container').length).toBeGreaterThanOrEqual(3);
    });
  });

  // ===========================================
  // Cleanup Tests
  // ===========================================
  describe('Cleanup', () => {
    beforeEach(() => {
      // Clear any lingering event listeners
      vi.restoreAllMocks();
    });

    afterEach(() => {
      // Ensure body styles are reset
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });

    it('should remove event listeners on drag end', async () => {
      const split = createSplitNode('split-1', 'horizontal', [
        createPaneNode('pane-1'),
        createPaneNode('pane-2'),
      ]);

      const wrapper = mount(SplitContainer, {
        props: { root: split },
        attachTo: document.body,
      });

      const splitBar = wrapper.find('.split-bar');

      // Mock container
      const containerElement = wrapper.find('.split-container').element;
      vi.spyOn(containerElement, 'closest').mockReturnValue({
        getBoundingClientRect: () => ({
          width: 1000, height: 500, left: 0, top: 0, right: 1000, bottom: 500, x: 0, y: 0, toJSON: () => {},
        }),
      } as unknown as Element);

      // Start drag
      await splitBar.trigger('mousedown', { clientX: 500, clientY: 250 });

      // Verify cursor is set
      expect(document.body.style.cursor).toBe('col-resize');

      // End drag
      document.dispatchEvent(new MouseEvent('mouseup'));
      await nextTick();

      // Verify cursor is reset
      expect(document.body.style.cursor).toBe('');

      wrapper.unmount();
    });
  });
});
