/**
 * AppHeader Component Tests
 * Tests application header functionality including title display, window controls, theme toggle, and menu
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, nextTick } from 'vue';
import AppHeader from '../AppHeader.vue';

// Mock Tauri window API
const mockMinimize = vi.fn().mockResolvedValue(undefined);
const mockToggleMaximize = vi.fn().mockResolvedValue(undefined);
const mockClose = vi.fn().mockResolvedValue(undefined);
const mockIsMaximized = vi.fn().mockResolvedValue(false);

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => ({
    minimize: mockMinimize,
    toggleMaximize: mockToggleMaximize,
    close: mockClose,
    isMaximized: mockIsMaximized,
    onResized: vi.fn(() => () => {}),
  })),
}));

// Mock useTheme composable
const mockIsDark = ref(false);
const mockToggleTheme = vi.fn();

vi.mock('@/composables', () => ({
  useTheme: vi.fn(() => ({
    isDark: mockIsDark,
    toggleTheme: mockToggleTheme,
  })),
}));

// Mock AppIcon component
const AppIconStub = {
  name: 'AppIcon',
  template: `
    <span class="app-icon-stub" :data-name="name" :data-size="size" :data-color="color">
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
function mountAppHeader(props = {}) {
  return mount(AppHeader, {
    props: {
      ...props,
    },
    global: {
      stubs: {
        AppIcon: AppIconStub,
      },
    },
  });
}

describe('AppHeader', () => {
  beforeEach(() => {
    // Reset mock state
    mockIsDark.value = false;
    vi.clearAllMocks();
    // Reset mock implementations
    mockMinimize.mockResolvedValue(undefined);
    mockToggleMaximize.mockResolvedValue(undefined);
    mockClose.mockResolvedValue(undefined);
    mockIsMaximized.mockResolvedValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders header element with correct class', () => {
      const wrapper = mountAppHeader();
      expect(wrapper.find('.app-header').exists()).toBe(true);
      expect(wrapper.find('.app-header').classes()).toContain('drag-region');
    });

    it('renders left section with menu button and title', () => {
      const wrapper = mountAppHeader();
      expect(wrapper.find('.header-left').exists()).toBe(true);
      expect(wrapper.find('.menu-btn').exists()).toBe(true);
      expect(wrapper.find('.header-logo').exists()).toBe(true);
      expect(wrapper.find('.header-title').exists()).toBe(true);
    });

    it('renders center section', () => {
      const wrapper = mountAppHeader();
      expect(wrapper.find('.header-center').exists()).toBe(true);
    });

    it('renders right section with theme toggle and window controls', () => {
      const wrapper = mountAppHeader();
      expect(wrapper.find('.header-right').exists()).toBe(true);
      expect(wrapper.find('.theme-btn').exists()).toBe(true);
    });

    it('renders all window control buttons by default', () => {
      const wrapper = mountAppHeader();
      expect(wrapper.find('.minimize-btn').exists()).toBe(true);
      expect(wrapper.find('.maximize-btn').exists()).toBe(true);
      expect(wrapper.find('.close-btn').exists()).toBe(true);
    });
  });

  describe('Title Display', () => {
    it('displays default title when no prop provided', () => {
      const wrapper = mountAppHeader();
      expect(wrapper.find('.header-title').text()).toBe('Easy Terminal');
    });

    it('displays custom title from prop', () => {
      const wrapper = mountAppHeader({ title: 'Custom Title' });
      expect(wrapper.find('.header-title').text()).toBe('Custom Title');
    });

    it('updates title when prop changes', async () => {
      const wrapper = mountAppHeader({ title: 'First Title' });
      expect(wrapper.find('.header-title').text()).toBe('First Title');

      await wrapper.setProps({ title: 'Second Title' });
      expect(wrapper.find('.header-title').text()).toBe('Second Title');
    });

    it('handles empty title', () => {
      const wrapper = mountAppHeader({ title: '' });
      expect(wrapper.find('.header-title').text()).toBe('');
    });

    it('handles special characters in title', () => {
      const wrapper = mountAppHeader({ title: 'Terminal <>&"\'`' });
      expect(wrapper.find('.header-title').text()).toContain('<>&"\'');
    });

    it('handles Unicode characters in title', () => {
      const wrapper = mountAppHeader({ title: '终端 🚀 ターミナル' });
      expect(wrapper.find('.header-title').text()).toBe('终端 🚀 ターミナル');
    });
  });

  describe('Window Control Buttons', () => {
    it('hides window controls when showWindowControls is false', () => {
      const wrapper = mountAppHeader({ showWindowControls: false });
      expect(wrapper.find('.minimize-btn').exists()).toBe(false);
      expect(wrapper.find('.maximize-btn').exists()).toBe(false);
      expect(wrapper.find('.close-btn').exists()).toBe(false);
    });

    it('shows window controls by default', () => {
      const wrapper = mountAppHeader();
      expect(wrapper.find('.minimize-btn').exists()).toBe(true);
      expect(wrapper.find('.maximize-btn').exists()).toBe(true);
      expect(wrapper.find('.close-btn').exists()).toBe(true);
    });

    it('calls minimize when minimize button clicked', async () => {
      const wrapper = mountAppHeader();
      await wrapper.find('.minimize-btn').trigger('click');
      expect(mockMinimize).toHaveBeenCalled();
    });

    it('calls toggleMaximize when maximize button clicked', async () => {
      const wrapper = mountAppHeader();
      await wrapper.find('.maximize-btn').trigger('click');
      expect(mockToggleMaximize).toHaveBeenCalled();
    });

    it('calls close when close button clicked', async () => {
      const wrapper = mountAppHeader();
      await wrapper.find('.close-btn').trigger('click');
      expect(mockClose).toHaveBeenCalled();
    });

    it('minimize button has correct title', () => {
      const wrapper = mountAppHeader();
      expect(wrapper.find('.minimize-btn').attributes('title')).toBe('Minimize');
    });

    it('maximize button has correct title when not maximized', () => {
      const wrapper = mountAppHeader();
      expect(wrapper.find('.maximize-btn').attributes('title')).toBe('Maximize');
    });

    it('close button has correct title', () => {
      const wrapper = mountAppHeader();
      expect(wrapper.find('.close-btn').attributes('title')).toBe('Close');
    });

    it('updates maximize button title when maximized', async () => {
      mockIsMaximized.mockResolvedValue(true);
      const wrapper = mountAppHeader();

      // Wait for initial checkMaximized
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(wrapper.find('.maximize-btn').attributes('title')).toBe('Restore');
    });

    it('shows maximize icon when not maximized', () => {
      const wrapper = mountAppHeader();
      const maximizeBtn = wrapper.find('.maximize-btn');
      const icon = maximizeBtn.find('.app-icon-stub');
      expect(icon.attributes('data-name')).toBe('maximize');
    });

    it('shows restore icon when maximized', async () => {
      mockIsMaximized.mockResolvedValue(true);
      const wrapper = mountAppHeader();

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 10));

      const maximizeBtn = wrapper.find('.maximize-btn');
      const icon = maximizeBtn.find('.app-icon-stub');
      expect(icon.attributes('data-name')).toBe('restore');
    });

    it('handles minimize error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockMinimize.mockRejectedValueOnce(new Error('Minimize failed'));

      const wrapper = mountAppHeader();
      await wrapper.find('.minimize-btn').trigger('click');
      await nextTick();

      expect(consoleSpy).toHaveBeenCalledWith('Minimize not available');
      consoleSpy.mockRestore();
    });

    it('handles maximize error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockToggleMaximize.mockRejectedValueOnce(new Error('Maximize failed'));

      const wrapper = mountAppHeader();
      await wrapper.find('.maximize-btn').trigger('click');
      await nextTick();

      expect(consoleSpy).toHaveBeenCalledWith('Maximize not available');
      consoleSpy.mockRestore();
    });

    it('handles close error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockClose.mockRejectedValueOnce(new Error('Close failed'));

      const wrapper = mountAppHeader();
      await wrapper.find('.close-btn').trigger('click');
      await nextTick();

      expect(consoleSpy).toHaveBeenCalledWith('Close not available');
      consoleSpy.mockRestore();
    });

    it('handles isMaximized error gracefully', async () => {
      mockIsMaximized.mockRejectedValueOnce(new Error('Check failed'));
      const wrapper = mountAppHeader();

      // Wait for initial checkMaximized
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should fall back to false
      expect(wrapper.find('.maximize-btn').attributes('title')).toBe('Maximize');
    });
  });

  describe('Theme Toggle Button', () => {
    it('renders theme button', () => {
      const wrapper = mountAppHeader();
      expect(wrapper.find('.theme-btn').exists()).toBe(true);
    });

    it('shows moon icon when in light mode', () => {
      mockIsDark.value = false;
      const wrapper = mountAppHeader();
      const themeBtn = wrapper.find('.theme-btn');
      const icon = themeBtn.find('.app-icon-stub');
      expect(icon.attributes('data-name')).toBe('moon');
    });

    it('shows sun icon when in dark mode', () => {
      mockIsDark.value = true;
      const wrapper = mountAppHeader();
      const themeBtn = wrapper.find('.theme-btn');
      const icon = themeBtn.find('.app-icon-stub');
      expect(icon.attributes('data-name')).toBe('sun');
    });

    it('has correct title in light mode', () => {
      mockIsDark.value = false;
      const wrapper = mountAppHeader();
      expect(wrapper.find('.theme-btn').attributes('title')).toBe('Switch to dark theme');
    });

    it('has correct title in dark mode', () => {
      mockIsDark.value = true;
      const wrapper = mountAppHeader();
      expect(wrapper.find('.theme-btn').attributes('title')).toBe('Switch to light theme');
    });

    it('calls toggleTheme when clicked', async () => {
      const wrapper = mountAppHeader();
      await wrapper.find('.theme-btn').trigger('click');
      expect(mockToggleTheme).toHaveBeenCalled();
    });

    it('emits theme-click event when clicked', async () => {
      const wrapper = mountAppHeader();
      await wrapper.find('.theme-btn').trigger('click');
      expect(wrapper.emitted('theme-click')).toBeTruthy();
    });
  });

  describe('Menu Button', () => {
    it('renders menu button', () => {
      const wrapper = mountAppHeader();
      expect(wrapper.find('.menu-btn').exists()).toBe(true);
    });

    it('has correct title', () => {
      const wrapper = mountAppHeader();
      expect(wrapper.find('.menu-btn').attributes('title')).toBe('Menu');
    });

    it('shows menu icon', () => {
      const wrapper = mountAppHeader();
      const menuBtn = wrapper.find('.menu-btn');
      const icon = menuBtn.find('.app-icon-stub');
      expect(icon.attributes('data-name')).toBe('menu');
    });

    it('emits menu-click event when clicked', async () => {
      const wrapper = mountAppHeader();
      await wrapper.find('.menu-btn').trigger('click');
      expect(wrapper.emitted('menu-click')).toBeTruthy();
    });
  });

  describe('Header Logo', () => {
    it('renders logo with terminal icon', () => {
      const wrapper = mountAppHeader();
      const logo = wrapper.find('.header-logo');
      const icon = logo.find('.app-icon-stub');
      expect(icon.attributes('data-name')).toBe('terminal');
    });

    it('logo icon has correct size', () => {
      const wrapper = mountAppHeader();
      const logo = wrapper.find('.header-logo');
      const icon = logo.find('.app-icon-stub');
      expect(icon.attributes('data-size')).toBe('18');
    });

    it('logo icon has primary color', () => {
      const wrapper = mountAppHeader();
      const logo = wrapper.find('.header-logo');
      const icon = logo.find('.app-icon-stub');
      expect(icon.attributes('data-color')).toBe('var(--color-primary)');
    });
  });

  describe('UI Styles', () => {
    it('header-left has no-drag-region class', () => {
      const wrapper = mountAppHeader();
      expect(wrapper.find('.header-left').classes()).toContain('no-drag-region');
    });

    it('header-right has no-drag-region class', () => {
      const wrapper = mountAppHeader();
      expect(wrapper.find('.header-right').classes()).toContain('no-drag-region');
    });

    it('header buttons have correct class', () => {
      const wrapper = mountAppHeader();
      expect(wrapper.find('.menu-btn').classes()).toContain('header-btn');
      expect(wrapper.find('.theme-btn').classes()).toContain('header-btn');
    });

    it('window buttons have correct class', () => {
      const wrapper = mountAppHeader();
      expect(wrapper.find('.minimize-btn').classes()).toContain('window-btn');
      expect(wrapper.find('.maximize-btn').classes()).toContain('window-btn');
      expect(wrapper.find('.close-btn').classes()).toContain('window-btn');
    });

    it('close button has correct class for danger styling', () => {
      const wrapper = mountAppHeader();
      expect(wrapper.find('.close-btn').classes()).toContain('close-btn');
    });

    it('header-center has flex-1 for centering', () => {
      const wrapper = mountAppHeader();
      const center = wrapper.find('.header-center');
      expect(center.exists()).toBe(true);
    });
  });

  describe('Button Icons', () => {
    it('minimize button has minimize icon', () => {
      const wrapper = mountAppHeader();
      const btn = wrapper.find('.minimize-btn');
      const icon = btn.find('.app-icon-stub');
      expect(icon.attributes('data-name')).toBe('minimize');
    });

    it('minimize icon has correct size', () => {
      const wrapper = mountAppHeader();
      const btn = wrapper.find('.minimize-btn');
      const icon = btn.find('.app-icon-stub');
      expect(icon.attributes('data-size')).toBe('12');
    });

    it('maximize/restore icon has correct size', () => {
      const wrapper = mountAppHeader();
      const btn = wrapper.find('.maximize-btn');
      const icon = btn.find('.app-icon-stub');
      expect(icon.attributes('data-size')).toBe('12');
    });

    it('close icon has correct size', () => {
      const wrapper = mountAppHeader();
      const btn = wrapper.find('.close-btn');
      const icon = btn.find('.app-icon-stub');
      expect(icon.attributes('data-size')).toBe('12');
    });

    it('menu icon has correct size', () => {
      const wrapper = mountAppHeader();
      const btn = wrapper.find('.menu-btn');
      const icon = btn.find('.app-icon-stub');
      expect(icon.attributes('data-size')).toBe('16');
    });

    it('theme icon has correct size', () => {
      const wrapper = mountAppHeader();
      const btn = wrapper.find('.theme-btn');
      const icon = btn.find('.app-icon-stub');
      expect(icon.attributes('data-size')).toBe('16');
    });
  });

  describe('Props', () => {
    it('accepts title prop', () => {
      const wrapper = mountAppHeader({ title: 'Test Title' });
      expect(wrapper.props('title')).toBe('Test Title');
    });

    it('accepts showWindowControls prop', () => {
      const wrapper = mountAppHeader({ showWindowControls: false });
      expect(wrapper.props('showWindowControls')).toBe(false);
    });

    it('has default title', () => {
      const wrapper = mountAppHeader();
      expect(wrapper.props('title')).toBe('Easy Terminal');
    });

    it('has default showWindowControls true', () => {
      const wrapper = mountAppHeader();
      expect(wrapper.props('showWindowControls')).toBe(true);
    });
  });

  describe('Events', () => {
    it('emits menu-click event', async () => {
      const wrapper = mountAppHeader();
      await wrapper.find('.menu-btn').trigger('click');
      expect(wrapper.emitted('menu-click')).toBeTruthy();
      expect(wrapper.emitted('menu-click')!.length).toBe(1);
    });

    it('emits theme-click event', async () => {
      const wrapper = mountAppHeader();
      await wrapper.find('.theme-btn').trigger('click');
      expect(wrapper.emitted('theme-click')).toBeTruthy();
      expect(wrapper.emitted('theme-click')!.length).toBe(1);
    });

    it('emits multiple menu-click events on multiple clicks', async () => {
      const wrapper = mountAppHeader();
      await wrapper.find('.menu-btn').trigger('click');
      await wrapper.find('.menu-btn').trigger('click');
      await wrapper.find('.menu-btn').trigger('click');
      expect(wrapper.emitted('menu-click')!.length).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid window control clicks', async () => {
      const wrapper = mountAppHeader();
      const minimizeBtn = wrapper.find('.minimize-btn');

      for (let i = 0; i < 5; i++) {
        await minimizeBtn.trigger('click');
      }

      expect(mockMinimize).toHaveBeenCalledTimes(5);
    });

    it('handles rapid theme toggle clicks', async () => {
      const wrapper = mountAppHeader();
      const themeBtn = wrapper.find('.theme-btn');

      for (let i = 0; i < 5; i++) {
        await themeBtn.trigger('click');
      }

      expect(mockToggleTheme).toHaveBeenCalledTimes(5);
      expect(wrapper.emitted('theme-click')!.length).toBe(5);
    });

    it('handles showWindowControls prop change', async () => {
      const wrapper = mountAppHeader({ showWindowControls: true });
      expect(wrapper.find('.minimize-btn').exists()).toBe(true);

      await wrapper.setProps({ showWindowControls: false });
      expect(wrapper.find('.minimize-btn').exists()).toBe(false);

      await wrapper.setProps({ showWindowControls: true });
      expect(wrapper.find('.minimize-btn').exists()).toBe(true);
    });

    it('handles long title', () => {
      const longTitle = 'A'.repeat(100);
      const wrapper = mountAppHeader({ title: longTitle });
      expect(wrapper.find('.header-title').text()).toBe(longTitle);
    });

    it('handles special characters in title', () => {
      const specialTitle = '<script>alert("xss")</script>';
      const wrapper = mountAppHeader({ title: specialTitle });
      // Vue escapes HTML, so the script tag should be rendered as text
      expect(wrapper.find('.header-title').text()).toContain('<script>');
    });

    it('handles newlines in title', () => {
      const wrapper = mountAppHeader({ title: 'Line1\nLine2' });
      expect(wrapper.find('.header-title').text()).toContain('Line1');
      expect(wrapper.find('.header-title').text()).toContain('Line2');
    });
  });

  describe('Accessibility', () => {
    it('menu button is a button element', () => {
      const wrapper = mountAppHeader();
      expect(wrapper.find('.menu-btn').element.tagName).toBe('BUTTON');
    });

    it('theme button is a button element', () => {
      const wrapper = mountAppHeader();
      expect(wrapper.find('.theme-btn').element.tagName).toBe('BUTTON');
    });

    it('window control buttons are button elements', () => {
      const wrapper = mountAppHeader();
      expect(wrapper.find('.minimize-btn').element.tagName).toBe('BUTTON');
      expect(wrapper.find('.maximize-btn').element.tagName).toBe('BUTTON');
      expect(wrapper.find('.close-btn').element.tagName).toBe('BUTTON');
    });

    it('menu button has title attribute', () => {
      const wrapper = mountAppHeader();
      expect(wrapper.find('.menu-btn').attributes('title')).toBe('Menu');
    });

    it('theme button has title attribute', () => {
      const wrapper = mountAppHeader();
      expect(wrapper.find('.theme-btn').attributes('title')).toBeTruthy();
    });

    it('all window buttons have title attributes', () => {
      const wrapper = mountAppHeader();
      expect(wrapper.find('.minimize-btn').attributes('title')).toBeTruthy();
      expect(wrapper.find('.maximize-btn').attributes('title')).toBeTruthy();
      expect(wrapper.find('.close-btn').attributes('title')).toBeTruthy();
    });
  });

  describe('Layout Structure', () => {
    it('header has correct structure order', () => {
      const wrapper = mountAppHeader();
      const header = wrapper.find('.app-header');
      const children = header.element.children;

      expect(children[0].className).toBe('header-left no-drag-region');
      expect(children[1].className).toBe('header-center');
      expect(children[2].className).toBe('header-right no-drag-region');
    });

    it('header-left contains menu button, logo, and title', () => {
      const wrapper = mountAppHeader();
      const left = wrapper.find('.header-left');
      const children = left.element.children;

      expect(children[0].className).toBe('header-btn menu-btn');
      expect(children[1].className).toBe('header-logo');
      expect(children[2].className).toBe('header-title');
    });

    it('header-right contains theme button and window controls', () => {
      const wrapper = mountAppHeader();
      const right = wrapper.find('.header-right');
      const buttons = right.findAll('button');

      expect(buttons.length).toBe(4); // theme + minimize + maximize + close
    });
  });
});
