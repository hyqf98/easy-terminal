<template>
  <div class="terminal-settings">
    <n-form label-placement="left" label-width="100">
      <!-- Local Shell -->
      <n-form-item label="Shell">
        <n-select
          v-model:value="settings.localShell"
          :options="shellOptions"
          placeholder="选择默认 Shell"
          clearable
          @update:value="handleShellChange"
        />
      </n-form-item>

      <!-- Encoding -->
      <n-form-item label="编码">
        <n-select
          v-model:value="settings.encoding"
          :options="encodingOptions"
          @update:value="handleSettingsUpdate"
        />
      </n-form-item>

      <!-- Scrollback Limit -->
      <n-form-item label="滚动缓冲">
        <n-input-number
          v-model:value="settings.scrollbackLimit"
          :min="1000"
          :max="100000"
          :step="1000"
          @update:value="handleSettingsUpdate"
        >
          <template #suffix>行</template>
        </n-input-number>
      </n-form-item>

      <n-divider />

      <!-- Confirm on Close -->
      <n-form-item label="关闭确认">
        <n-switch v-model:value="settings.confirmOnClose" @update:value="handleSettingsUpdate" />
      </n-form-item>

      <!-- Copy on Select -->
      <n-form-item label="选中复制">
        <n-switch v-model:value="settings.copyOnSelect" @update:value="handleSettingsUpdate" />
      </n-form-item>

      <!-- Right Click Behavior -->
      <n-form-item label="右键行为">
        <n-radio-group v-model:value="settings.rightClickBehavior" @update:value="handleSettingsUpdate">
          <n-radio-button value="paste">粘贴</n-radio-button>
          <n-radio-button value="menu">菜单</n-radio-button>
          <n-radio-button value="copy">复制</n-radio-button>
        </n-radio-group>
      </n-form-item>

      <n-divider />

      <!-- Bell Sound -->
      <n-form-item label="终端响铃">
        <n-switch v-model:value="settings.bellSound" @update:value="handleSettingsUpdate" />
      </n-form-item>

      <!-- Bell Style -->
      <n-form-item label="响铃样式">
        <n-radio-group
          v-model:value="settings.bellStyle"
          :disabled="!settings.bellSound"
          @update:value="handleSettingsUpdate"
        >
          <n-radio-button value="none">无</n-radio-button>
          <n-radio-button value="sound">声音</n-radio-button>
          <n-radio-button value="visual">视觉</n-radio-button>
          <n-radio-button value="both">两者</n-radio-button>
        </n-radio-group>
      </n-form-item>
    </n-form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { NForm, NFormItem, NSelect, NInputNumber, NSwitch, NRadioGroup, NRadioButton, NDivider, type SelectOption } from 'naive-ui';
import { useSettingsStore } from '@/stores';
import { getAvailableShells } from '@/services/terminal.service';

const settingsStore = useSettingsStore();

const settings = computed(() => settingsStore.settings);

const shellOptions = ref<SelectOption[]>([]);

const encodingOptions: SelectOption[] = [
  { label: 'UTF-8', value: 'utf-8' },
  { label: 'GBK', value: 'gbk' },
  { label: 'GB2312', value: 'gb2312' },
  { label: 'Big5', value: 'big5' },
  { label: 'Shift-JIS', value: 'shift-jis' },
  { label: 'EUC-KR', value: 'euc-kr' },
  { label: 'ISO-8859-1', value: 'iso-8859-1' },
];

onMounted(async () => {
  try {
    const shells = await getAvailableShells();
    shellOptions.value = shells.map((shell) => ({
      label: shell,
      value: shell,
    }));

    // Add "Auto" option at the beginning
    shellOptions.value.unshift({
      label: '自动检测',
      value: '',
    });
  } catch (error) {
    console.error('Failed to load available shells:', error);
    // Provide fallback options
    shellOptions.value = [
      { label: '自动检测', value: '' },
      { label: 'PowerShell', value: 'powershell' },
      { label: 'Command Prompt', value: 'cmd' },
    ];
  }
});

function handleShellChange(value: string): void {
  settingsStore.updateSettings({ localShell: value });
}

function handleSettingsUpdate(): void {
  settingsStore.updateSettings({
    encoding: settings.value.encoding,
    scrollbackLimit: settings.value.scrollbackLimit,
    confirmOnClose: settings.value.confirmOnClose,
    copyOnSelect: settings.value.copyOnSelect,
    rightClickBehavior: settings.value.rightClickBehavior,
    bellSound: settings.value.bellSound,
    bellStyle: settings.value.bellStyle,
  });
}
</script>

<style scoped>
.terminal-settings {
  padding: 0 8px;
}

:deep(.n-form-item) {
  margin-bottom: 20px;
}

:deep(.n-select) {
  width: 200px;
}

:deep(.n-input-number) {
  width: 150px;
}
</style>
