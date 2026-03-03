<script setup lang="ts">
/**
 * DriveSelector - Drive selection component for multi-root support
 * Displays available drives on Windows or root path on Unix
 */
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { listDrives } from '@/services/file.service';
import type { DriveInfo } from '@/types';

const { t } = useI18n();

const props = defineProps<{
  /** Currently selected drive path */
  modelValue?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', path: string): void;
  (e: 'drive-select', drive: DriveInfo): void;
}>();

// State
const drives = ref<DriveInfo[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const isOpen = ref(false);

// Computed
const selectedDrive = computed(() => {
  return drives.value.find(d => d.path === props.modelValue);
});

// Format bytes to human readable
function formatBytes(bytes: number): string {
  if (bytes === 0) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

// Load drives
async function loadDrives() {
  isLoading.value = true;
  error.value = null;
  try {
    drives.value = await listDrives();
    // Auto-select first drive if none selected
    if (!props.modelValue && drives.value.length > 0) {
      emit('update:modelValue', drives.value[0].path);
    }
  } catch {
    error.value = t('fileExplorer.noDrives');
  } finally {
    isLoading.value = false;
  }
}

// Select drive
function selectDrive(drive: DriveInfo) {
  emit('update:modelValue', drive.path);
  emit('drive-select', drive);
  isOpen.value = false;
}

// Toggle dropdown
function toggleDropdown() {
  isOpen.value = !isOpen.value;
}

// Close dropdown when clicking outside
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.drive-selector')) {
    isOpen.value = false;
  }
}

// Lifecycle
onMounted(() => {
  loadDrives();
  document.addEventListener('click', handleClickOutside);
});
</script>

<template>
  <div class="drive-selector" :class="{ 'is-open': isOpen }">
    <!-- Trigger button -->
    <button
      class="drive-trigger"
      :disabled="isLoading"
      @click="toggleDropdown"
    >
      <svg class="drive-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
      <span class="drive-name">
        {{ isLoading ? t('fileExplorer.loading') : (selectedDrive?.name || t('fileExplorer.selectDrive')) }}
      </span>
      <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>

    <!-- Dropdown -->
    <div v-if="isOpen" class="drive-dropdown">
      <div v-if="error" class="drive-error">
        {{ error }}
        <button @click="loadDrives">{{ t('common.retry') }}</button>
      </div>

      <div v-else-if="drives.length === 0 && !isLoading" class="drive-empty">
        {{ t('fileExplorer.noDrives') }}
      </div>

      <div v-else class="drive-list">
        <button
          v-for="drive in drives"
          :key="drive.path"
          class="drive-item"
          :class="{ 'is-selected': drive.path === modelValue }"
          @click="selectDrive(drive)"
        >
          <div class="drive-item-icon">
            <svg v-if="drive.isRemovable" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <svg v-else-if="drive.driveType === 'network'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" />
              <line x1="6" y1="18" x2="6.01" y2="18" />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" />
              <line x1="6" y1="18" x2="6.01" y2="18" />
            </svg>
          </div>
          <div class="drive-item-info">
            <span class="drive-item-name">{{ drive.name }}</span>
            <span v-if="drive.totalSpace > 0" class="drive-item-space">
              {{ formatBytes(drive.availableSpace) }} / {{ formatBytes(drive.totalSpace) }}
            </span>
          </div>
          <div v-if="drive.totalSpace > 0" class="drive-item-bar">
            <div
              class="drive-item-bar-fill"
              :style="{ width: `${((drive.totalSpace - drive.availableSpace) / drive.totalSpace) * 100}%` }"
            ></div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.drive-selector {
  position: relative;
  min-width: 120px;
}

.drive-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--color-border, #e0e0e0);
  border-radius: var(--border-radius, 4px);
  background-color: var(--color-input, #fff);
  color: var(--color-text-1, #333);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.drive-trigger:hover {
  border-color: var(--color-primary, #18a058);
}

.drive-trigger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.drive-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: var(--color-text-2, #666);
}

.drive-name {
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron-icon {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  color: var(--color-text-3, #999);
  transition: transform 0.2s ease;
}

.drive-selector.is-open .chevron-icon {
  transform: rotate(180deg);
}

.drive-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  border: 1px solid var(--color-border, #e0e0e0);
  border-radius: var(--border-radius, 4px);
  background-color: var(--color-card, #fff);
  box-shadow: var(--box-shadow-popover, 0 3px 6px -4px rgba(0, 0, 0, 0.12));
  z-index: 100;
  max-height: 300px;
  overflow-y: auto;
}

.drive-error,
.drive-empty {
  padding: 12px;
  text-align: center;
  color: var(--color-text-3, #999);
  font-size: 12px;
}

.drive-error button {
  display: block;
  margin: 8px auto 0;
  padding: 4px 12px;
  border: 1px solid var(--color-border, #e0e0e0);
  border-radius: var(--border-radius, 4px);
  background: transparent;
  color: var(--color-text-2, #666);
  font-size: 11px;
  cursor: pointer;
}

.drive-error button:hover {
  background-color: var(--color-hover, rgba(0, 0, 0, 0.05));
}

.drive-list {
  padding: 4px 0;
}

.drive-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  background: transparent;
  color: var(--color-text-1, #333);
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s ease;
}

.drive-item:hover {
  background-color: var(--color-hover, rgba(0, 0, 0, 0.05));
}

.drive-item.is-selected {
  background-color: var(--color-primary-suppl, rgba(24, 160, 88, 0.1));
}

.drive-item-icon {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  color: var(--color-text-2, #666);
}

.drive-item-icon svg {
  width: 100%;
  height: 100%;
}

.drive-item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.drive-item-name {
  font-size: 12px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drive-item-space {
  font-size: 10px;
  color: var(--color-text-3, #999);
}

.drive-item-bar {
  width: 40px;
  height: 4px;
  background-color: var(--color-pressed, #e0e0e0);
  border-radius: 2px;
  overflow: hidden;
}

.drive-item-bar-fill {
  height: 100%;
  background-color: var(--color-primary, #18a058);
  transition: width 0.3s ease;
}
</style>
