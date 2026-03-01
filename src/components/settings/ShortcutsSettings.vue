<template>
  <div class="shortcuts-settings">
    <n-alert type="info" :bordered="false" style="margin-bottom: 16px;">
      以下是可用的键盘快捷键。快捷键按类别分组显示。
    </n-alert>

    <n-collapse>
      <n-collapse-item title="终端操作" name="terminal">
        <div class="shortcut-list">
          <div v-for="shortcut in terminalShortcuts" :key="shortcut.id" class="shortcut-item">
            <div class="shortcut-info">
              <span class="shortcut-name">{{ shortcut.name }}</span>
              <span v-if="shortcut.description" class="shortcut-desc">{{ shortcut.description }}</span>
            </div>
            <n-tag :bordered="false" type="primary">{{ formatKey(shortcut) }}</n-tag>
          </div>
        </div>
      </n-collapse-item>

      <n-collapse-item title="标签页管理" name="tabs">
        <div class="shortcut-list">
          <div v-for="shortcut in tabShortcuts" :key="shortcut.id" class="shortcut-item">
            <div class="shortcut-info">
              <span class="shortcut-name">{{ shortcut.name }}</span>
              <span v-if="shortcut.description" class="shortcut-desc">{{ shortcut.description }}</span>
            </div>
            <n-tag :bordered="false" type="primary">{{ formatKey(shortcut) }}</n-tag>
          </div>
        </div>
      </n-collapse-item>

      <n-collapse-item title="分屏操作" name="splits">
        <div class="shortcut-list">
          <div v-for="shortcut in splitShortcuts" :key="shortcut.id" class="shortcut-item">
            <div class="shortcut-info">
              <span class="shortcut-name">{{ shortcut.name }}</span>
              <span v-if="shortcut.description" class="shortcut-desc">{{ shortcut.description }}</span>
            </div>
            <n-tag :bordered="false" type="primary">{{ formatKey(shortcut) }}</n-tag>
          </div>
        </div>
      </n-collapse-item>

      <n-collapse-item title="其他" name="other">
        <div class="shortcut-list">
          <div v-for="shortcut in otherShortcuts" :key="shortcut.id" class="shortcut-item">
            <div class="shortcut-info">
              <span class="shortcut-name">{{ shortcut.name }}</span>
              <span v-if="shortcut.description" class="shortcut-desc">{{ shortcut.description }}</span>
            </div>
            <n-tag :bordered="false" type="primary">{{ formatKey(shortcut) }}</n-tag>
          </div>
        </div>
      </n-collapse-item>
    </n-collapse>

    <n-divider />

    <n-space vertical>
      <n-text depth="3" style="font-size: 12px;">
        提示: 在 macOS 上，使用 ⌘ (Cmd) 代替 Ctrl
      </n-text>
    </n-space>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NCollapse, NCollapseItem, NTag, NAlert, NDivider, NSpace, NText } from 'naive-ui';
import { DEFAULT_SHORTCUTS, getEffectiveKey, formatKeyCombo, isMacOS } from '@/types/shortcut';

const isMac = isMacOS();

// Group shortcuts by category
const terminalShortcuts = computed(() =>
  DEFAULT_SHORTCUTS.filter(s => s.category === 'terminal')
);

const tabShortcuts = computed(() =>
  DEFAULT_SHORTCUTS.filter(s => s.category === 'tabs')
);

const splitShortcuts = computed(() =>
  DEFAULT_SHORTCUTS.filter(s => s.category === 'splits')
);

const otherShortcuts = computed(() =>
  DEFAULT_SHORTCUTS.filter(s => s.category === 'other')
);

// Format key for display
function formatKey(shortcut: typeof DEFAULT_SHORTCUTS[0]): string {
  const keyBinding = getEffectiveKey(shortcut);
  return formatKeyCombo(keyBinding, isMac);
}
</script>

<style scoped>
.shortcuts-settings {
  padding: 0 8px;
}

.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: 6px;
}

.shortcut-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.shortcut-name {
  color: var(--text-primary);
  font-size: 14px;
}

.shortcut-desc {
  color: var(--text-tertiary);
  font-size: 12px;
}

:deep(.n-collapse-item__header-main) {
  font-weight: 500;
}

:deep(.n-tag) {
  font-family: monospace;
}
</style>
