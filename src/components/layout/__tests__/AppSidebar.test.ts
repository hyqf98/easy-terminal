/**
 * AppSidebar Component Tests
 * Tests sidebar functionality including collapse/expand, resize, quick actions, and UI styles
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, nextTick } from 'vue';
import AppSidebar from '../AppSidebar.vue';

// Mock settings store - use refs that can be modified
const mockShowSidebar = ref(true);
const mockSidebarWidth = ref(250);
const mockToggleSidebar = vi.fn();
const mockSetSidebarWidth = vi.fn();

vi.mock('@/stores', () => {
  // Return a factory function that reads from the refs
  return {
    useSettingsStore: vi.fn(() => ({
      get showSidebar() { return mockShowSidebar.value; },
      get sidebarWidth() { return mockSidebarWidth.value; },
      toggleSidebar: mockToggleSidebar,
      setSidebarWidth: mockSetSidebarWidth,
    })),
  };
});

// Mock AppIcon component
const AppIconStub = {
  name: 'AppIcon',
  template: `
    <span class="app-icon-stub" :data-name="name" :data-size="size" :data-color="color" :class="$attrs.class">
      <svg viewBox="0 0 24 24"></svg>
    </span>
  `,
  props: {
    name: { type: String, default: '' },
    size: { type: Number, default: 16 },
    color: { type: String, default: 'currentColor' },
  },
};

// Helper to mount component
function mountAppSidebar(props = {}, slots = {}) {
  return mount(AppSidebar, {
    props: {
      ...props,
    },
    slots: {
      ...slots,
    },
    global: {
      stubs: {
        AppIcon: AppIconStub,
      },
    },
  });
}

describe('AppSidebar', () => {
  beforeEach(() => {
    // Reset mock state
    mockShowSidebar.value = true;
    mockSidebarWidth.value = 250;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders aside element with correct class', () => {
      const wrapper = mountAppSidebar();
      expect(wrapper.find('.app-sidebar').exists()).toBe(true);
    });

    it('renders sidebar-content when not collapsed', () => {
      const wrapper = mountAppSidebar();
      expect(wrapper.find('.sidebar-content').exists()).toBe(true);
    });

    it('renders quick-actions bar by default', () => {
      const wrapper = mountAppSidebar();
      expect(wrapper.find('.quick-actions').exists()).toBe(true);
    });

    it('renders sidebar-main slot container', () => {
      const wrapper = mountAppSidebar();
      expect(wrapper.find('.sidebar-main').exists()).toBe(true);
    });

    it('renders collapse button by default', () => {
      const wrapper = mountAppSidebar();
      expect(wrapper.find('.collapse-btn').exists()).toBe(true);
    });

    it('renders resize handle by default', () => {
      const wrapper = mountAppSidebar();
      expect(wrapper.find('.resize-handle').exists()).toBe(true);
    });

    it('renders placeholder content by default', () => {
      const wrapper = mountAppSidebar();
      expect(wrapper.find('.placeholder').exists()).toBe(true);
      expect(wrapper.find('.placeholder').text()).toContain('File Explorer');
    });

    it('does not render sidebar-content when collapsed', () => {
      mockShowSidebar.value = false;
      const wrapper = mountAppSidebar();
      expect(wrapper.find('.sidebar-content').exists()).toBe(false);
    });

    it('does not render resize handle when collapsed', () => {
      mockShowSidebar.value = false;
      const wrapper = mountAppSidebar();
      expect(wrapper.find('.resize-handle').exists()).toBe(false);
    });

    it('shows is-collapsed class when collapsed', () => {
      mockShowSidebar.value = false;
      const wrapper = mountAppSidebar();
      expect(wrapper.find('.app-sidebar').classes()).toContain('is-collapsed');
    });
  });

  describe('Collapse/Expand', () => {
    it('does not show is-collapsed class when expanded', () => {
      const wrapper = mountAppSidebar();
      expect(wrapper.find('.app-sidebar').classes()).not.toContain('is-collapsed');
    });

    it('calls toggleSidebar when collapse button clicked', async () => {
      const wrapper = mountAppSidebar();
      await wrapper.find('.collapse-btn').trigger('click');
      expect(mockToggleSidebar).toHaveBeenCalled();
    });

    it('collapse button has correct title when expanded', () => {
      const wrapper = mountAppSidebar();
      expect(wrapper.find('.collapse-btn').attributes('title')).toBe('Collapse sidebar');
    });

    it('collapse button has correct title when collapsed', () => {
      mockShowSidebar.value = false;
      const wrapper = mountAppSidebar();
      expect(wrapper.find('.collapse-btn').attributes('title')).toBe('Expand sidebar');
    });

    it('collapse button icon rotates when expanded', () => {
      const wrapper = mountAppSidebar();
      const icon = wrapper.find('.collapse-btn .app-icon-stub');
      expect(icon.classes()).toContain('is-rotated');
    });

    it('collapse button icon does not rotate when collapsed', () => {
      mockShowSidebar.value = false;
      const wrapper = mountAppSidebar();
      const icon = wrapper.find('.collapse-btn .app-icon-stub');
      expect(icon.classes()).not.toContain('is-rotated');
    });

    it('hides collapse button when collapsible is false', () => {
      const wrapper = mountAppSidebar({ collapsible: false });
      expect(wrapper.find('.collapse-btn').exists()).toBe(false);
    });

    it('hides resize handle when collapsible is false', () => {
      const wrapper = mountAppSidebar({ collapsible: false });
      expect(wrapper.find('.resize-handle').exists()).toBe(false);
    });

    it('emits collapse event when toggleSidebar results in collapsed state', async () => {
      // Start expanded
      mockShowSidebar.value = true;
      const wrapper = mountAppSidebar();

      // Simulate the toggle behavior
      mockToggleSidebar.mockImplementationOnce(() => {
        mockShowSidebar.value = false;
      });

      await wrapper.find('.collapse-btn').trigger('click');

      // Manually trigger toggle
      mockToggleSidebar();
      mockShowSidebar.value = false;
      await nextTick();

      // Now collapse should be emitted since isCollapsed becomes true
      expect(wrapper.emitted('collapse')).toBeTruthy();
    });

    it('emits expand event when toggleSidebar results in expanded state', async () => {
      // Start collapsed
      mockShowSidebar.value = false;
      const wrapper = mountAppSidebar();

      // Simulate the toggle behavior
      mockToggleSidebar.mockImplementationOnce(() => {
        mockShowSidebar.value = true;
      });

      await wrapper.find('.collapse-btn').trigger('click');

      // Manually trigger toggle
      mockToggleSidebar();
      mockShowSidebar.value = true;
      await nextTick();

      expect(wrapper.emitted('expand')).toBeTruthy();
    });
  });

  describe('Quick Actions', () => {
    it('renders quick actions by default', () => {
      const wrapper = mountAppSidebar();
      expect(wrapper.find('.quick-actions').exists()).toBe(true);
    });

    it('hides quick actions when showQuickActions is false', () => {
      const wrapper = mountAppSidebar({ showQuickActions: false });
      expect(wrapper.find('.quick-actions').exists()).toBe(false);
    });

    it('renders all quick action buttons', () => {
      const wrapper = mountAppSidebar();
      const buttons = wrapper.findAll('.quick-action-btn');
      expect(buttons.length).toBe(4);
    });

    it('renders new terminal button', () => {
      const wrapper = mountAppSidebar();
      const buttons = wrapper.findAll('.quick-action-btn');
      const newTerminalBtn = buttons.find(btn => btn.attributes('title') === 'New Terminal');
      expect(newTerminalBtn).toBeDefined();
    });

    it('renders SSH connections button', () => {
      const wrapper = mountAppSidebar();
      const buttons = wrapper.findAll('.quick-action-btn');
      const sshBtn = buttons.find(btn => btn.attributes('title') === 'SSH Connections');
      expect(sshBtn).toBeDefined();
    });

    it('renders open folder button', () => {
      const wrapper = mountAppSidebar();
      const buttons = wrapper.findAll('.quick-action-btn');
      const folderBtn = buttons.find(btn => btn.attributes('title') === 'Open Folder');
      expect(folderBtn).toBeDefined();
    });

    it('renders settings button', () => {
      const wrapper = mountAppSidebar();
      const buttons = wrapper.findAll('.quick-action-btn');
      const settingsBtn = buttons.find(btn => btn.attributes('title') === 'Settings');
      expect(settingsBtn).toBeDefined();
    });

    it('emits quick-action event with new-terminal when new terminal clicked', async () => {
      const wrapper = mountAppSidebar();
      const buttons = wrapper.findAll('.quick-action-btn');
      const newTerminalBtn = buttons.find(btn => btn.attributes('title') === 'New Terminal');
      await newTerminalBtn!.trigger('click');

      expect(wrapper.emitted('quick-action')).toBeTruthy();
      expect(wrapper.emitted('quick-action')![0][0]).toBe('new-terminal');
    });

    it('emits quick-action event with ssh when SSH clicked', async () => {
      const wrapper = mountAppSidebar();
      const buttons = wrapper.findAll('.quick-action-btn');
      const sshBtn = buttons.find(btn => btn.attributes('title') === 'SSH Connections');
      await sshBtn!.trigger('click');

      expect(wrapper.emitted('quick-action')).toBeTruthy();
      expect(wrapper.emitted('quick-action')![0][0]).toBe('ssh');
    });

    it('emits quick-action event with open-folder when folder clicked', async () => {
      const wrapper = mountAppSidebar();
      const buttons = wrapper.findAll('.quick-action-btn');
      const folderBtn = buttons.find(btn => btn.attributes('title') === 'Open Folder');
      await folderBtn!.trigger('click');

      expect(wrapper.emitted('quick-action')).toBeTruthy();
      expect(wrapper.emitted('quick-action')![0][0]).toBe('open-folder');
    });

    it('emits quick-action event with settings when settings clicked', async () => {
      const wrapper = mountAppSidebar();
      const buttons = wrapper.findAll('.quick-action-btn');
      const settingsBtn = buttons.find(btn => btn.attributes('title') === 'Settings');
      await settingsBtn!.trigger('click');

      expect(wrapper.emitted('quick-action')).toBeTruthy();
      expect(wrapper.emitted('quick-action')![0][0]).toBe('settings');
    });

    it('quick action buttons have correct icons', () => {
      const wrapper = mountAppSidebar();
      const buttons = wrapper.findAll('.quick-action-btn');

      const expectedIcons = ['plus', 'terminal', 'folder', 'settings'];
      buttons.forEach((btn, index) => {
        const icon = btn.find('.app-icon-stub');
        expect(icon.attributes('data-name')).toBe(expectedIcons[index]);
      });
    });

    it('quick action icons have correct size', () => {
      const wrapper = mountAppSidebar();
      const buttons = wrapper.findAll('.quick-action-btn');

      buttons.forEach(btn => {
        const icon = btn.find('.app-icon-stub');
        expect(icon.attributes('data-size')).toBe('16');
      });
    });
  });

  describe('Sidebar Width', () => {
    it('sets width from store sidebarWidth', () => {
      mockSidebarWidth.value = 300;
      const wrapper = mountAppSidebar();

      const aside = wrapper.find('.app-sidebar');
      expect((aside.element as HTMLElement).style.width).toBe('300px');
    });

    it('sets width to 0 when collapsed', () => {
      mockShowSidebar.value = false;
      const wrapper = mountAppSidebar();

      const aside = wrapper.find('.app-sidebar');
      expect((aside.element as HTMLElement).style.width).toBe('0px');
    });

    it('emits resize event when width changes', async () => {
      const wrapper = mountAppSidebar();

      // Simulate resize
      const resizeHandle = wrapper.find('.resize-handle');
      await resizeHandle.trigger('mousedown', { clientX: 100 });

      // Simulate mouse move
      const mouseMoveEvent = new MouseEvent('mousemove', { clientX: 150 });
      document.dispatchEvent(mouseMoveEvent);

      // Wait for next tick
      await nextTick();

      // Simulate mouse up
      const mouseUpEvent = new MouseEvent('mouseup');
      document.dispatchEvent(mouseUpEvent);

      await nextTick();

      expect(wrapper.emitted('resize')).toBeTruthy();
    });

    it('calls setSidebarWidth during resize', async () => {
      mockSidebarWidth.value = 200;
      const wrapper = mountAppSidebar();

      // Simulate resize
      const resizeHandle = wrapper.find('.resize-handle');
      await resizeHandle.trigger('mousedown', { clientX: 100 });

      // Simulate mouse move
      const mouseMoveEvent = new MouseEvent('mousemove', { clientX: 150 });
      document.dispatchEvent(mouseMoveEvent);

      await nextTick();

      expect(mockSetSidebarWidth).toHaveBeenCalled();
    });

    it('does not have resize handle when collapsed', () => {
      mockShowSidebar.value = false;
      const wrapper = mountAppSidebar();
      expect((wrapper.find('.app-sidebar').element as HTMLElement).style.width).toBe('0px');
      expect(wrapper.find('.resize-handle').exists()).toBe(false);
    });

    it('adds is-resizing class during resize', async () => {
      const wrapper = mountAppSidebar();

      const resizeHandle = wrapper.find('.resize-handle');
      await resizeHandle.trigger('mousedown', { clientX: 100 });

      expect(wrapper.find('.app-sidebar').classes()).toContain('is-resizing');
    });

    it('removes is-resizing class after resize ends', async () => {
      const wrapper = mountAppSidebar();

      const resizeHandle = wrapper.find('.resize-handle');
      await resizeHandle.trigger('mousedown', { clientX: 100 });

      expect(wrapper.find('.app-sidebar').classes()).toContain('is-resizing');

      // Simulate mouse up
      const mouseUpEvent = new MouseEvent('mouseup');
      document.dispatchEvent(mouseUpEvent);

      await nextTick();

      expect(wrapper.find('.app-sidebar').classes()).not.toContain('is-resizing');
    });

    it('sets cursor to ew-resize during resize', async () => {
      const wrapper = mountAppSidebar();

      const resizeHandle = wrapper.find('.resize-handle');
      await resizeHandle.trigger('mousedown', { clientX: 100 });

      expect(document.body.style.cursor).toBe('ew-resize');
    });

    it('clears cursor after resize ends', async () => {
      const wrapper = mountAppSidebar();

      const resizeHandle = wrapper.find('.resize-handle');
      await resizeHandle.trigger('mousedown', { clientX: 100 });

      expect(document.body.style.cursor).toBe('ew-resize');

      // Simulate mouse up
      const mouseUpEvent = new MouseEvent('mouseup');
      document.dispatchEvent(mouseUpEvent);

      await nextTick();

      expect(document.body.style.cursor).toBe('');
    });

    it('sets userSelect to none during resize', async () => {
      const wrapper = mountAppSidebar();

      const resizeHandle = wrapper.find('.resize-handle');
      await resizeHandle.trigger('mousedown', { clientX: 100 });

      expect(document.body.style.userSelect).toBe('none');
    });

    it('clears userSelect after resize ends', async () => {
      const wrapper = mountAppSidebar();

      const resizeHandle = wrapper.find('.resize-handle');
      await resizeHandle.trigger('mousedown', { clientX: 100 });

      expect(document.body.style.userSelect).toBe('none');

      // Simulate mouse up
      const mouseUpEvent = new MouseEvent('mouseup');
      document.dispatchEvent(mouseUpEvent);

      await nextTick();

      expect(document.body.style.userSelect).toBe('');
    });

    it('limits width to minimum 100px', async () => {
      mockSidebarWidth.value = 200;
      const wrapper = mountAppSidebar();

      const resizeHandle = wrapper.find('.resize-handle');
      await resizeHandle.trigger('mousedown', { clientX: 200 });

      // Simulate mouse move to reduce width significantly
      const mouseMoveEvent = new MouseEvent('mousemove', { clientX: 0 });
      document.dispatchEvent(mouseMoveEvent);

      await nextTick();

      // Check that setSidebarWidth was called with minimum value
      expect(mockSetSidebarWidth).toHaveBeenCalledWith(expect.any(Number));
      const lastCall = mockSetSidebarWidth.mock.calls[mockSetSidebarWidth.mock.calls.length - 1];
      expect(lastCall[0]).toBeGreaterThanOrEqual(100);
    });

    it('limits width to maximum 600px', async () => {
      mockSidebarWidth.value = 200;
      const wrapper = mountAppSidebar();

      const resizeHandle = wrapper.find('.resize-handle');
      await resizeHandle.trigger('mousedown', { clientX: 200 });

      // Simulate mouse move to increase width significantly
      const mouseMoveEvent = new MouseEvent('mousemove', { clientX: 1000 });
      document.dispatchEvent(mouseMoveEvent);

      await nextTick();

      // Check that setSidebarWidth was called with maximum value
      const lastCall = mockSetSidebarWidth.mock.calls[mockSetSidebarWidth.mock.calls.length - 1];
      expect(lastCall[0]).toBeLessThanOrEqual(600);
    });
  });

  describe('Slot', () => {
    it('renders slot content', () => {
      const wrapper = mountAppSidebar({}, {
        default: '<div class="custom-content">Custom Content</div>',
      });

      expect(wrapper.find('.custom-content').exists()).toBe(true);
      expect(wrapper.find('.custom-content').text()).toBe('Custom Content');
    });

    it('hides placeholder when slot content provided', () => {
      const wrapper = mountAppSidebar({}, {
        default: '<div class="custom-content">Custom Content</div>',
      });

      expect(wrapper.find('.placeholder').exists()).toBe(false);
    });

    it('shows placeholder when no slot content provided', () => {
      const wrapper = mountAppSidebar();
      expect(wrapper.find('.placeholder').exists()).toBe(true);
    });
  });

  describe('UI Styles', () => {
    it('has correct structure', () => {
      const wrapper = mountAppSidebar();
      const sidebar = wrapper.find('.app-sidebar');
      const content = wrapper.find('.sidebar-content');
      const quickActions = wrapper.find('.quick-actions');
      const main = wrapper.find('.sidebar-main');

      expect(sidebar.exists()).toBe(true);
      expect(content.exists()).toBe(true);
      expect(quickActions.exists()).toBe(true);
      expect(main.exists()).toBe(true);
    });

    it('quick actions buttons have correct class', () => {
      const wrapper = mountAppSidebar();
      const buttons = wrapper.findAll('.quick-action-btn');

      buttons.forEach(btn => {
        expect(btn.classes()).toContain('quick-action-btn');
      });
    });

    it('resize handle has correct class', () => {
      const wrapper = mountAppSidebar();
      expect(wrapper.find('.resize-handle').classes()).toContain('resize-handle');
    });

    it('collapse button has correct class', () => {
      const wrapper = mountAppSidebar();
      expect(wrapper.find('.collapse-btn').classes()).toContain('collapse-btn');
    });

    it('placeholder has correct class', () => {
      const wrapper = mountAppSidebar();
      expect(wrapper.find('.placeholder').classes()).toContain('placeholder');
    });

    it('placeholder icon has correct attributes', () => {
      const wrapper = mountAppSidebar();
      const icon = wrapper.find('.placeholder .app-icon-stub');
      expect(icon.attributes('data-name')).toBe('folder');
      expect(icon.attributes('data-size')).toBe('24');
      expect(icon.attributes('data-color')).toBe('var(--color-text-3)');
    });
  });

  describe('Props', () => {
    it('accepts collapsible prop', () => {
      const wrapper = mountAppSidebar({ collapsible: false });
      expect(wrapper.props('collapsible')).toBe(false);
    });

    it('accepts showQuickActions prop', () => {
      const wrapper = mountAppSidebar({ showQuickActions: false });
      expect(wrapper.props('showQuickActions')).toBe(false);
    });

    it('has default collapsible true', () => {
      const wrapper = mountAppSidebar();
      expect(wrapper.props('collapsible')).toBe(true);
    });

    it('has default showQuickActions true', () => {
      const wrapper = mountAppSidebar();
      expect(wrapper.props('showQuickActions')).toBe(true);
    });
  });

  describe('Events', () => {
    it('emits resize event', async () => {
      const wrapper = mountAppSidebar();

      const resizeHandle = wrapper.find('.resize-handle');
      await resizeHandle.trigger('mousedown', { clientX: 100 });

      const mouseMoveEvent = new MouseEvent('mousemove', { clientX: 150 });
      document.dispatchEvent(mouseMoveEvent);

      await nextTick();

      const mouseUpEvent = new MouseEvent('mouseup');
      document.dispatchEvent(mouseUpEvent);

      await nextTick();

      expect(wrapper.emitted('resize')).toBeTruthy();
    });

    it('emits quick-action event', async () => {
      const wrapper = mountAppSidebar();
      const buttons = wrapper.findAll('.quick-action-btn');

      await buttons[0].trigger('click');
      expect(wrapper.emitted('quick-action')).toBeTruthy();
    });

    it('emits collapse event when sidebar collapses', async () => {
      // This test verifies that collapse event is emitted
      // The actual toggle is handled by the Collapse/Expand section tests
      mockShowSidebar.value = true;
      const wrapper = mountAppSidebar();

      // Simulate the toggle behavior by calling toggleSidebar implementation
      mockToggleSidebar.mockImplementationOnce(() => {
        mockShowSidebar.value = false;
      });

      await wrapper.find('.collapse-btn').trigger('click');
      mockToggleSidebar();
      mockShowSidebar.value = false;
      await nextTick();

      expect(wrapper.emitted('collapse')).toBeTruthy();
    });

    it('emits expand event when sidebar expands', async () => {
      // This test verifies that expand event is emitted
      // The actual toggle is handled by the Collapse/Expand section tests
      mockShowSidebar.value = false;
      const wrapper = mountAppSidebar();

      // Simulate the toggle behavior by calling toggleSidebar implementation
      mockToggleSidebar.mockImplementationOnce(() => {
        mockShowSidebar.value = true;
      });

      await wrapper.find('.collapse-btn').trigger('click');
      mockToggleSidebar();
      mockShowSidebar.value = true;
      await nextTick();

      expect(wrapper.emitted('expand')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid collapse/expand clicks', async () => {
      const wrapper = mountAppSidebar();

      for (let i = 0; i < 5; i++) {
        await wrapper.find('.collapse-btn').trigger('click');
      }

      expect(mockToggleSidebar).toHaveBeenCalledTimes(5);
    });

    it('handles rapid quick action clicks', async () => {
      const wrapper = mountAppSidebar();
      const btn = wrapper.findAll('.quick-action-btn')[0];

      for (let i = 0; i < 5; i++) {
        await btn.trigger('click');
      }

      expect(wrapper.emitted('quick-action')!.length).toBe(5);
    });

    it('handles prop changes', async () => {
      const wrapper = mountAppSidebar({ showQuickActions: true });
      expect(wrapper.find('.quick-actions').exists()).toBe(true);

      await wrapper.setProps({ showQuickActions: false });
      expect(wrapper.find('.quick-actions').exists()).toBe(false);

      await wrapper.setProps({ showQuickActions: true });
      expect(wrapper.find('.quick-actions').exists()).toBe(true);
    });

    it('handles store width changes', () => {
      mockSidebarWidth.value = 200;
      const wrapper = mountAppSidebar();
      expect((wrapper.find('.app-sidebar').element as HTMLElement).style.width).toBe('200px');
    });

    it('handles zero width', () => {
      mockSidebarWidth.value = 0;
      const wrapper = mountAppSidebar();
      expect((wrapper.find('.app-sidebar').element as HTMLElement).style.width).toBe('0px');
    });

    it('handles very large width', () => {
      mockSidebarWidth.value = 1000;
      const wrapper = mountAppSidebar();
      expect((wrapper.find('.app-sidebar').element as HTMLElement).style.width).toBe('1000px');
    });

    it('handles Unicode in slot content', () => {
      const wrapper = mountAppSidebar({}, {
        default: '<div class="unicode">终端 🚀 ターミナル</div>',
      });

      expect(wrapper.find('.unicode').text()).toBe('终端 🚀 ターミナル');
    });

    it('handles collapsed state with collapsible false', () => {
      // When collapsible is false, the sidebar shows regardless of store state
      mockShowSidebar.value = false;
      const wrapper = mountAppSidebar({ collapsible: false });

      // Resize handle and collapse button should not exist
      expect(wrapper.find('.collapse-btn').exists()).toBe(false);
      expect(wrapper.find('.resize-handle').exists()).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('collapse button is a button element', () => {
      const wrapper = mountAppSidebar();
      expect(wrapper.find('.collapse-btn').element.tagName).toBe('BUTTON');
    });

    it('quick action buttons are button elements', () => {
      const wrapper = mountAppSidebar();
      const buttons = wrapper.findAll('.quick-action-btn');

      buttons.forEach(btn => {
        expect(btn.element.tagName).toBe('BUTTON');
      });
    });

    it('collapse button has title attribute', () => {
      const wrapper = mountAppSidebar();
      expect(wrapper.find('.collapse-btn').attributes('title')).toBeTruthy();
    });

    it('all quick action buttons have title attributes', () => {
      const wrapper = mountAppSidebar();
      const buttons = wrapper.findAll('.quick-action-btn');

      buttons.forEach(btn => {
        expect(btn.attributes('title')).toBeTruthy();
      });
    });
  });

  describe('Resize Cleanup', () => {
    it('clears cursor and userSelect after mouseup', async () => {
      const wrapper = mountAppSidebar();

      const resizeHandle = wrapper.find('.resize-handle');
      await resizeHandle.trigger('mousedown', { clientX: 100 });

      expect(document.body.style.cursor).toBe('ew-resize');
      expect(document.body.style.userSelect).toBe('none');

      // Simulate mouse up
      const mouseUpEvent = new MouseEvent('mouseup');
      document.dispatchEvent(mouseUpEvent);

      await nextTick();

      expect(document.body.style.cursor).toBe('');
      expect(document.body.style.userSelect).toBe('');
    });

    it('removes mousemove and mouseup listeners after mouseup', async () => {
      const wrapper = mountAppSidebar();

      const addSpy = vi.spyOn(document, 'addEventListener');
      const removeSpy = vi.spyOn(document, 'removeEventListener');

      const resizeHandle = wrapper.find('.resize-handle');
      await resizeHandle.trigger('mousedown', { clientX: 100 });

      expect(addSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(addSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));

      // Simulate mouse up
      const mouseUpEvent = new MouseEvent('mouseup');
      document.dispatchEvent(mouseUpEvent);

      await nextTick();

      expect(removeSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });

    it('does not start resize when collapsed', async () => {
      mockShowSidebar.value = false;
      const wrapper = mountAppSidebar();

      // Resize handle should not exist
      expect(wrapper.find('.resize-handle').exists()).toBe(false);
    });
  });
});
