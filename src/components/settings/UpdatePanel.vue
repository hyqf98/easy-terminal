<script setup lang="ts">
/**
 * UpdatePanel Component
 * Displays update status and allows checking/downloading updates
 */
import { ref, computed } from 'vue';
import { NButton, NProgress, NAlert, NCard, NSpace, NText } from 'naive-ui';
import { useUpdater } from '@/composables';

const {
  status,
  updateInfo,
  progress,
  error,
  lastChecked,
  isChecking,
  isAvailable,
  isDownloading,
  hasError,
  canCheck,
  canDownload,
  check,
  download,
  dismiss,
} = useUpdater();

const checking = ref(false);
const downloading = ref(false);

async function handleCheck() {
  checking.value = true;
  try {
    await check();
  } finally {
    checking.value = false;
  }
}

async function handleDownload() {
  downloading.value = true;
  try {
    await download();
  } finally {
    downloading.value = false;
  }
}

const statusText = computed(() => {
  switch (status.value) {
    case 'checking':
      return 'Checking for updates...';
    case 'available':
      return `Update available: v${updateInfo.value?.version}`;
    case 'downloading':
      return 'Downloading update...';
    case 'ready':
      return 'Update ready! Relaunching...';
    case 'error':
      return 'Update error';
    default:
      return 'Up to date';
  }
});

const statusType = computed<'success' | 'warning' | 'error' | 'info' | 'default'>(() => {
  switch (status.value) {
    case 'available':
      return 'warning';
    case 'downloading':
    case 'ready':
      return 'info';
    case 'error':
      return 'error';
    default:
      return 'success';
  }
});
</script>

<template>
  <NCard title="Software Update" size="small">
    <NSpace vertical>
      <!-- Status display -->
      <NAlert :type="statusType" v-if="status !== 'idle'">
        <template #header>
          {{ statusText }}
        </template>
        <template v-if="updateInfo">
          <NText depth="3">
            Current: v{{ updateInfo.currentVersion }} → New: v{{ updateInfo.version }}
          </NText>
          <div v-if="updateInfo.body" class="update-notes">
            <NText depth="3">{{ updateInfo.body }}</NText>
          </div>
        </template>
      </NAlert>

      <!-- Progress bar during download -->
      <NProgress
        v-if="isDownloading && progress"
        type="line"
        :percentage="progress.percentage"
        :show-indicator="true"
        :height="24"
        :border-radius="4"
      >
        {{ progress.downloaded }} / {{ progress.total || '?' }} bytes
      </NProgress>

      <!-- Error display -->
      <NAlert v-if="hasError" type="error">
        {{ error }}
      </NAlert>

      <!-- Last checked info -->
      <NText v-if="lastChecked" depth="3" style="font-size: 12px">
        Last checked: {{ lastChecked.toLocaleString() }}
      </NText>

      <!-- Action buttons -->
      <NSpace>
        <NButton
          :disabled="!canCheck || checking"
          :loading="checking || isChecking"
          @click="handleCheck"
        >
          Check for Updates
        </NButton>

        <NButton
          v-if="isAvailable"
          type="primary"
          :disabled="!canDownload || downloading"
          :loading="downloading || isDownloading"
          @click="handleDownload"
        >
          Download and Install
        </NButton>

        <NButton
          v-if="isAvailable || hasError"
          @click="dismiss"
        >
          Later
        </NButton>
      </NSpace>
    </NSpace>
  </NCard>
</template>

<style scoped>
.update-notes {
  margin-top: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  white-space: pre-wrap;
  font-size: 12px;
}
</style>
