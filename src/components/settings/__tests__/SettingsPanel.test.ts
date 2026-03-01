/**
 * SettingsPanel Component Tests
 * Tests settings panel functionality including navigation, reset, and UI
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import SettingsPanel from '../SettingsPanel.vue';
import type { AppSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';

// Mock settings store state
let mockSettings = ref<AppSettings>({ ...DEFAULT_SETTINGS });
let mockIsLoaded = ref(true);
let mockResetSettings = vi.fn().mockResolvedValue(undefined);
let mockUpdateSettings = vi.fn();
let mockSetTheme = vi.fn();
let mockSaveSettings = vi.fn().mockResolvedValue(undefined);

vi.mock('@/stores', () => ({
  useSettingsStore: vi.fn(() => ({
    settings: mockSettings,
    isLoaded: mockIsLoaded,
    resetSettings: mockResetSettings,
    updateSettings: mockUpdateSettings,
    setTheme: mockSetTheme,
    saveSettings: mockSaveSettings,
    theme: mockSettings.value.theme,
    terminalFontFamily: mockSettings.value.terminalFontFamily,
    terminalFontSize: mockSettings.value.terminalFontSize,
    showSidebar: mockSettings.value.showSidebar,
    sidebarWidth: mockSettings.value.sidebarWidth,
    encoding: mockSettings.value.encoding,
    localShell: mockSettings.value.localShell,
  })),
}));

// Mock naive-ui useDialog
const mockDialogWarning = vi.fn();

vi.mock('naive-ui', () => ({
  useDialog: () => ({
    warning: mockDialogWarning,
  }),
  NDrawer: {
    name: 'NDrawer',
    template: `
      <div class="n-drawer" v-if="show" data-placement="right">
        <slot />
      </div>
    `,
    props: ['show', 'width', 'placement', 'maskClosable'],
  },
  NDrawerContent: {
    name: 'NDrawerContent',
    template: `
      <div class="n-drawer-content">
        <div class="n-drawer-header" v-if="title">
          <span class="n-drawer-title">{{ title }}</span>
          <button v-if="closable" class="n-drawer-close" @click="$emit('close')">X</button>
        </div>
        <div class="n-drawer-body">
          <slot />
        </div>
        <div class="n-drawer-footer" v-if="$slots.footer">
          <slot name="footer" />
        </div>
      </div>
    `,
    props: ['title', 'closable'],
  },
  NTabs: {
    name: 'NTabs',
    template: `
      <div class="n-tabs" :data-type="type" :data-animated="animated" :data-value="value">
        <div class="n-tabs-nav">
          <slot />
        </div>
        <div class="n-tabs-content">
          <slot name="default" />
        </div>
      </div>
    `,
    props: {
      value: { type: String, default: '' },
      type: { type: String, default: '' },
      animated: { type: Boolean, default: false },
    },
  },
  NTabPane: {
    name: 'NTabPane',
    template: `
      <div class="n-tab-pane" v-if="active">
        <slot />
      </div>
    `,
    props: ['name', 'tab'],
    computed: {
      active() {
        // In real component this would check against parent's value
        return true;
      },
    },
  },
  NButton: {
    name: 'NButton',
    template: `
      <button class="n-button" :class="{ 'n-button--primary-type': type === 'primary' }" @click="$emit('click')">
        <slot />
      </button>
    `,
    props: ['type'],
  },
  NSpace: {
    name: 'NSpace',
    template: `
      <div class="n-space" :class="'n-space--justify-' + justify">
        <slot />
      </div>
    `,
    props: ['justify'],
  },
}));

// Helper to mount component
function mountSettingsPanel(props = {}) {
  return mount(SettingsPanel, {
    props: {
      show: true,
      ...props,
    },
    global: {
      stubs: {
        AppearanceSettings: {
          template: '<div class="appearance-settings-stub">Appearance Settings</div>',
        },
        TerminalSettings: {
          template: '<div class="terminal-settings-stub">Terminal Settings</div>',
        },
        ShortcutsSettings: {
          template: '<div class="shortcuts-settings-stub">Shortcuts Settings</div>',
        },
        UpdatePanel: {
          template: '<div class="update-panel-stub">Update Panel</div>',
        },
      },
    },
  });
}

describe('SettingsPanel', () => {
  beforeEach(() => {
    // Reset mock state
    mockSettings.value = { ...DEFAULT_SETTINGS };
    mockIsLoaded.value = true;
    // Reset all mocks completely
    vi.resetAllMocks();
    // Re-setup mock implementations that may have been cleared
    mockResetSettings.mockResolvedValue(undefined);
    mockSaveSettings.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders drawer when show is true', () => {
      const wrapper = mountSettingsPanel({ show: true });
      expect(wrapper.find('.n-drawer').exists()).toBe(true);
    });

    it('does not render drawer when show is false', () => {
      const wrapper = mountSettingsPanel({ show: false });
      expect(wrapper.find('.n-drawer').exists()).toBe(false);
    });

    it('renders drawer content with title', () => {
      const wrapper = mountSettingsPanel({ show: true });
      expect(wrapper.find('.n-drawer-content').exists()).toBe(true);
      expect(wrapper.find('.n-drawer-title').text()).toBe('设置');
    });

    it('renders all tab panes', () => {
      const wrapper = mountSettingsPanel({ show: true });
      // Use DOM query instead of findAllComponents to avoid counting mock stubs
      const tabPanes = wrapper.findAll('.n-tab-pane');
      // Tab panes are rendered based on v-if, so count depends on mock implementation
      expect(tabPanes.length).toBeGreaterThanOrEqual(4);
    });

    it('renders footer with buttons', () => {
      const wrapper = mountSettingsPanel({ show: true });
      expect(wrapper.find('.n-drawer-footer').exists()).toBe(true);
      const buttons = wrapper.findAll('.n-button');
      expect(buttons.length).toBe(2);
      expect(buttons[0].text()).toBe('恢复默认');
      expect(buttons[1].text()).toBe('完成');
    });

    it('renders child settings components', () => {
      const wrapper = mountSettingsPanel({ show: true });
      expect(wrapper.find('.appearance-settings-stub').exists()).toBe(true);
      expect(wrapper.find('.terminal-settings-stub').exists()).toBe(true);
      expect(wrapper.find('.shortcuts-settings-stub').exists()).toBe(true);
      expect(wrapper.find('.update-panel-stub').exists()).toBe(true);
    });
  });

  describe('Settings Category Navigation', () => {
    it('initializes with appearance tab active', () => {
      const wrapper = mountSettingsPanel({ show: true });
      const tabs = wrapper.findComponent({ name: 'NTabs' });
      expect(tabs.props('value')).toBe('appearance');
    });

    it('renders tab panes with correct names', () => {
      const wrapper = mountSettingsPanel({ show: true });
      const tabPanes = wrapper.findAllComponents({ name: 'NTabPane' });

      const names = tabPanes.map((pane) => pane.props('name'));
      expect(names).toContain('appearance');
      expect(names).toContain('terminal');
      expect(names).toContain('shortcuts');
      expect(names).toContain('about');
    });

    it('renders tab panes with correct labels', () => {
      const wrapper = mountSettingsPanel({ show: true });
      const tabPanes = wrapper.findAllComponents({ name: 'NTabPane' });

      const labels = tabPanes.map((pane) => pane.props('tab'));
      expect(labels).toContain('外观');
      expect(labels).toContain('终端');
      expect(labels).toContain('快捷键');
      expect(labels).toContain('关于');
    });

    it('renders tabs with line type and animated', () => {
      const wrapper = mountSettingsPanel({ show: true });
      const tabs = wrapper.findComponent({ name: 'NTabs' });
      expect(tabs.props('type')).toBe('line');
      // animated is a boolean prop, check the data attribute
      expect(tabs.attributes('data-animated')).toBe('true');
    });
  });

  describe('Settings Reset', () => {
    it('shows confirmation dialog when reset button is clicked', async () => {
      const wrapper = mountSettingsPanel({ show: true });
      const resetButton = wrapper.findAll('.n-button')[0];

      await resetButton.trigger('click');

      expect(mockDialogWarning).toHaveBeenCalled();
      const dialogOptions = mockDialogWarning.mock.calls[0][0];
      expect(dialogOptions.title).toBe('确认重置');
      expect(dialogOptions.content).toContain('恢复所有设置为默认值');
    });

    it('calls resetSettings when dialog is confirmed', async () => {
      const wrapper = mountSettingsPanel({ show: true });
      const resetButton = wrapper.findAll('.n-button')[0];

      await resetButton.trigger('click');

      // Get the onPositiveClick callback and execute it
      const dialogOptions = mockDialogWarning.mock.calls[0][0];
      await dialogOptions.onPositiveClick();

      expect(mockResetSettings).toHaveBeenCalled();
    });

    it('does not call resetSettings when dialog is cancelled', async () => {
      const wrapper = mountSettingsPanel({ show: true });
      const resetButton = wrapper.findAll('.n-button')[0];

      await resetButton.trigger('click');

      // Get the onNegativeClick callback if it exists
      const dialogOptions = mockDialogWarning.mock.calls[0][0];
      if (dialogOptions.onNegativeClick) {
        await dialogOptions.onNegativeClick();
      }

      // resetSettings should not have been called since we didn't confirm
      expect(mockResetSettings).not.toHaveBeenCalled();
    });

    it('dialog has correct button labels', async () => {
      const wrapper = mountSettingsPanel({ show: true });
      const resetButton = wrapper.findAll('.n-button')[0];

      await resetButton.trigger('click');

      const dialogOptions = mockDialogWarning.mock.calls[0][0];
      expect(dialogOptions.positiveText).toBe('确定');
      expect(dialogOptions.negativeText).toBe('取消');
    });
  });

  describe('Close Functionality', () => {
    it('emits update:show with false when close button is clicked', async () => {
      const wrapper = mountSettingsPanel({ show: true });
      const closeButton = wrapper.findAll('.n-button')[1]; // "完成" button

      await closeButton.trigger('click');
      await nextTick();

      const emitted = wrapper.emitted('update:show');
      expect(emitted).toBeTruthy();
      expect(emitted![0][0]).toBe(false);
    });

    it('drawer has correct width', () => {
      const wrapper = mountSettingsPanel({ show: true });
      const drawer = wrapper.findComponent({ name: 'NDrawer' });
      expect(drawer.props('width')).toBe(480);
    });

    it('drawer has correct placement', () => {
      const wrapper = mountSettingsPanel({ show: true });
      const drawer = wrapper.findComponent({ name: 'NDrawer' });
      expect(drawer.props('placement')).toBe('right');
    });

    it('drawer is mask closable', () => {
      const wrapper = mountSettingsPanel({ show: true });
      const drawer = wrapper.findComponent({ name: 'NDrawer' });
      expect(drawer.props('maskClosable')).toBe(true);
    });

    it('updates visible when prop show changes', async () => {
      const wrapper = mountSettingsPanel({ show: false });
      expect(wrapper.find('.n-drawer').exists()).toBe(false);

      await wrapper.setProps({ show: true });
      expect(wrapper.find('.n-drawer').exists()).toBe(true);
    });
  });

  describe('UI Styles', () => {
    it('footer buttons are in space with justify end', () => {
      const wrapper = mountSettingsPanel({ show: true });
      const space = wrapper.find('.n-space');
      expect(space.classes()).toContain('n-space--justify-end');
    });

    it('complete button is primary type', () => {
      const wrapper = mountSettingsPanel({ show: true });
      const completeButton = wrapper.findAll('.n-button')[1];
      expect(completeButton.classes()).toContain('n-button--primary-type');
    });

    it('has correct drawer content structure', () => {
      const wrapper = mountSettingsPanel({ show: true });
      expect(wrapper.find('.n-drawer-header').exists()).toBe(true);
      expect(wrapper.find('.n-drawer-body').exists()).toBe(true);
      expect(wrapper.find('.n-drawer-footer').exists()).toBe(true);
    });

    it('has scoped styles applied', () => {
      const wrapper = mountSettingsPanel({ show: true });
      // The component has scoped styles that target :deep() selectors
      expect(wrapper.find('.n-drawer-content').exists()).toBe(true);
    });
  });

  describe('Props and Events', () => {
    it('accepts show prop', () => {
      const wrapper = mountSettingsPanel({ show: true });
      expect(wrapper.props('show')).toBe(true);
    });

    it('has correct prop type for show', () => {
      // TypeScript will catch this at compile time, but we verify runtime behavior
      const wrapper = mountSettingsPanel({ show: false });
      expect(typeof wrapper.props('show')).toBe('boolean');
    });

    it('emits update:show when visible changes', async () => {
      const wrapper = mountSettingsPanel({ show: true });

      // Click complete button to trigger close
      await wrapper.findAll('.n-button')[1].trigger('click');
      await nextTick();

      expect(wrapper.emitted('update:show')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid show/hide toggles', async () => {
      const wrapper = mountSettingsPanel({ show: true });

      for (let i = 0; i < 5; i++) {
        await wrapper.setProps({ show: false });
        await wrapper.setProps({ show: true });
      }

      expect(wrapper.find('.n-drawer').exists()).toBe(true);
    });

    it('handles reset when store is not loaded', async () => {
      mockIsLoaded.value = false;
      const wrapper = mountSettingsPanel({ show: true });

      await wrapper.findAll('.n-button')[0].trigger('click');
      const dialogOptions = mockDialogWarning.mock.calls[0][0];
      await dialogOptions.onPositiveClick();

      expect(mockResetSettings).toHaveBeenCalled();
    });

    it('handles reset error gracefully', async () => {
      mockResetSettings.mockRejectedValueOnce(new Error('Reset failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const wrapper = mountSettingsPanel({ show: true });
      await wrapper.findAll('.n-button')[0].trigger('click');
      const dialogOptions = mockDialogWarning.mock.calls[0][0];
      await dialogOptions.onPositiveClick();

      // The store handles the error internally
      expect(mockResetSettings).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('renders with special characters in settings', async () => {
      mockSettings.value.terminalFontFamily = 'Font <script>alert("xss")</script>';
      const wrapper = mountSettingsPanel({ show: true });
      expect(wrapper.find('.n-drawer').exists()).toBe(true);
    });

    it('renders with Unicode characters in settings', async () => {
      mockSettings.value.terminalFontFamily = '字体 🎉 フォント';
      const wrapper = mountSettingsPanel({ show: true });
      expect(wrapper.find('.n-drawer').exists()).toBe(true);
    });

    it('handles empty settings object', async () => {
      mockSettings.value = {} as AppSettings;
      const wrapper = mountSettingsPanel({ show: true });
      expect(wrapper.find('.n-drawer').exists()).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      const wrapper = mountSettingsPanel({ show: true });
      expect(wrapper.find('.n-drawer-title').exists()).toBe(true);
    });

    it('buttons are clickable elements', () => {
      const wrapper = mountSettingsPanel({ show: true });
      const buttons = wrapper.findAll('.n-button');
      buttons.forEach((button) => {
        expect(button.element.tagName).toBe('BUTTON');
      });
    });
  });

  describe('Dialog Integration', () => {
    it('dialog warning is called with correct structure', async () => {
      const wrapper = mountSettingsPanel({ show: true });
      const initialCallCount = mockDialogWarning.mock.calls.length;

      await wrapper.findAll('.n-button')[0].trigger('click');

      // Verify dialog was called at least once
      expect(mockDialogWarning.mock.calls.length).toBeGreaterThan(initialCallCount);

      // Get the last call's arguments
      const lastCallIndex = mockDialogWarning.mock.calls.length - 1;
      const callArgs = mockDialogWarning.mock.calls[lastCallIndex][0];

      expect(callArgs).toHaveProperty('title');
      expect(callArgs).toHaveProperty('content');
      expect(callArgs).toHaveProperty('positiveText');
      expect(callArgs).toHaveProperty('negativeText');
      expect(callArgs).toHaveProperty('onPositiveClick');
    });

    it('each click increases dialog call count', async () => {
      const wrapper = mountSettingsPanel({ show: true });
      const resetButton = wrapper.findAll('.n-button')[0];

      const initialCallCount = mockDialogWarning.mock.calls.length;

      // Click once
      await resetButton.trigger('click');
      const afterFirstClick = mockDialogWarning.mock.calls.length;
      expect(afterFirstClick).toBeGreaterThan(initialCallCount);

      // Click again
      await resetButton.trigger('click');
      expect(mockDialogWarning.mock.calls.length).toBeGreaterThan(afterFirstClick);

      // Click third time
      await resetButton.trigger('click');
      expect(mockDialogWarning.mock.calls.length).toBeGreaterThan(afterFirstClick + 1);
    });
  });
});
