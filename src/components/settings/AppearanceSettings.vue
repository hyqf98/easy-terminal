<template>
  <div class="appearance-settings">
    <n-form label-placement="left" label-width="100">
      <!-- Theme -->
      <n-form-item label="主题">
        <n-radio-group v-model:value="settings.theme" @update:value="handleThemeChange">
          <n-radio-button value="light">浅色</n-radio-button>
          <n-radio-button value="dark">深色</n-radio-button>
          <n-radio-button value="system">跟随系统</n-radio-button>
        </n-radio-group>
      </n-form-item>

      <!-- Font Family -->
      <n-form-item label="字体">
        <n-input
          v-model:value="settings.terminalFontFamily"
          placeholder="终端字体"
          @blur="handleFontChange"
        />
      </n-form-item>

      <!-- Font Size -->
      <n-form-item label="字号">
        <n-slider
          v-model:value="settings.terminalFontSize"
          :min="10"
          :max="24"
          :step="1"
          :tooltip="true"
          @update:value="handleFontSizeChange"
        />
        <span class="font-size-label">{{ settings.terminalFontSize }}px</span>
      </n-form-item>

      <!-- Line Height -->
      <n-form-item label="行高">
        <n-slider
          v-model:value="lineHeightPercent"
          :min="100"
          :max="200"
          :step="5"
          :tooltip="true"
          @update:value="handleLineHeightChange"
        />
        <span class="line-height-label">{{ lineHeightPercent }}%</span>
      </n-form-item>

      <n-divider />

      <!-- Cursor Style -->
      <n-form-item label="光标样式">
        <n-radio-group v-model:value="settings.cursorStyle" @update:value="handleSettingsUpdate">
          <n-radio-button value="block">方块</n-radio-button>
          <n-radio-button value="underline">下划线</n-radio-button>
          <n-radio-button value="bar">竖线</n-radio-button>
        </n-radio-group>
      </n-form-item>

      <!-- Cursor Blink -->
      <n-form-item label="光标闪烁">
        <n-switch v-model:value="settings.cursorBlink" @update:value="handleSettingsUpdate" />
      </n-form-item>
    </n-form>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NForm, NFormItem, NRadioGroup, NRadioButton, NInput, NSlider, NSwitch, NDivider } from 'naive-ui';
import { useSettingsStore } from '@/stores';
import type { Theme } from '@/types';

const settingsStore = useSettingsStore();

const settings = computed(() => settingsStore.settings);

// Line height as percentage for the slider (1.2 = 120%)
const lineHeightPercent = computed({
  get: () => Math.round(settings.value.terminalLineHeight * 100),
  set: () => {}, // Handled by handleLineHeightChange
});

function handleThemeChange(value: string): void {
  settingsStore.setTheme(value as Theme);
}

function handleFontChange(): void {
  settingsStore.updateSettings({ terminalFontFamily: settings.value.terminalFontFamily });
}

function handleFontSizeChange(value: number): void {
  settingsStore.updateSettings({ terminalFontSize: value });
}

function handleLineHeightChange(value: number): void {
  settingsStore.updateSettings({ terminalLineHeight: value / 100 });
}

function handleSettingsUpdate(): void {
  settingsStore.updateSettings({
    cursorStyle: settings.value.cursorStyle,
    cursorBlink: settings.value.cursorBlink,
  });
}
</script>

<style scoped>
.appearance-settings {
  padding: 0 8px;
}

.font-size-label,
.line-height-label {
  min-width: 50px;
  margin-left: 12px;
  color: var(--text-secondary);
  font-size: 13px;
}

:deep(.n-form-item) {
  margin-bottom: 20px;
}

:deep(.n-form-item-blank) {
  display: flex;
  align-items: center;
}

:deep(.n-slider) {
  flex: 1;
  max-width: 200px;
}
</style>
