<template>
  <n-drawer v-model:show="visible" :width="480" placement="right" :mask-closable="true">
    <n-drawer-content title="设置" closable>
      <n-tabs v-model:value="activeTab" type="line" animated>
        <n-tab-pane name="appearance" tab="外观">
          <AppearanceSettings />
        </n-tab-pane>
        <n-tab-pane name="terminal" tab="终端">
          <TerminalSettings />
        </n-tab-pane>
        <n-tab-pane name="shortcuts" tab="快捷键">
          <ShortcutsSettings />
        </n-tab-pane>
        <n-tab-pane name="about" tab="关于">
          <UpdatePanel />
        </n-tab-pane>
      </n-tabs>

      <template #footer>
        <n-space justify="end">
          <n-button @click="handleReset">
            恢复默认
          </n-button>
          <n-button type="primary" @click="handleClose">
            完成
          </n-button>
        </n-space>
      </template>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { NDrawer, NDrawerContent, NTabs, NTabPane, NButton, NSpace, useDialog } from 'naive-ui';
import AppearanceSettings from './AppearanceSettings.vue';
import TerminalSettings from './TerminalSettings.vue';
import ShortcutsSettings from './ShortcutsSettings.vue';
import UpdatePanel from './UpdatePanel.vue';
import { useSettingsStore } from '@/stores';

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
}>();

const settingsStore = useSettingsStore();
const dialog = useDialog();

const visible = ref(props.show);
const activeTab = ref('appearance');

watch(() => props.show, (val) => {
  visible.value = val;
});

watch(visible, (val) => {
  emit('update:show', val);
});

function handleReset(): void {
  dialog.warning({
    title: '确认重置',
    content: '确定要恢复所有设置为默认值吗？此操作不可撤销。',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      settingsStore.resetSettings();
    },
  });
}

function handleClose(): void {
  visible.value = false;
}
</script>

<style scoped>
:deep(.n-drawer-body) {
  padding: 0;
}

:deep(.n-tabs-nav) {
  padding: 0 16px;
}

:deep(.n-tab-pane) {
  padding: 16px;
}
</style>
