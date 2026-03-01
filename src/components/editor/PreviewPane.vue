<script setup lang="ts">
/**
 * PreviewPane - File preview component
 * Shows preview for images, text files, and other content
 */
import { computed } from 'vue';
import type { FileItem } from '@/types';

const props = defineProps<{
  file: FileItem | null;
  content?: string;
  loading?: boolean;
  error?: string;
}>();

const emit = defineEmits<{
  (e: 'edit', file: FileItem): void;
  (e: 'close'): void;
}>();

// Preview type detection
const previewType = computed(() => {
  if (!props.file) return 'none';

  const ext = props.file.extension?.toLowerCase() || '';
  const name = props.file.name.toLowerCase();

  // Image types
  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp', 'avif'];
  if (imageExts.includes(ext)) return 'image';

  // Audio types
  const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'];
  if (audioExts.includes(ext)) return 'audio';

  // Video types
  const videoExts = ['mp4', 'webm', 'avi', 'mov', 'mkv'];
  if (videoExts.includes(ext)) return 'video';

  // PDF
  if (ext === 'pdf') return 'pdf';

  // Code/Text files
  const codeExts = [
    'js', 'ts', 'jsx', 'tsx', 'vue', 'html', 'css', 'scss', 'less', 'sass',
    'json', 'xml', 'yaml', 'yml', 'toml', 'md', 'mdx',
    'py', 'rb', 'go', 'rs', 'java', 'kt', 'scala', 'swift',
    'c', 'cpp', 'h', 'hpp', 'cs', 'php', 'sql',
    'sh', 'bash', 'zsh', 'ps1', 'dockerfile',
    'txt', 'log', 'env', 'gitignore', 'dockerignore',
  ];
  if (codeExts.includes(ext) || name.startsWith('.env') || name === 'dockerfile') {
    return 'code';
  }

  // Directory
  if (props.file.type === 'directory') return 'directory';

  // Binary/unknown
  if (props.file.size > 10 * 1024 * 1024) return 'large'; // > 10MB

  return 'unknown';
});

const isEditable = computed(() => {
  return previewType.value === 'code';
});

const formattedSize = computed(() => {
  if (!props.file) return '';
  const size = props.file.size;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
});

function handleEdit() {
  if (props.file) {
    emit('edit', props.file);
  }
}

function handleClose() {
  emit('close');
}
</script>

<template>
  <div class="preview-pane">
    <!-- Header -->
    <div v-if="file" class="preview-header">
      <div class="file-info">
        <span class="file-name" :title="file.path">{{ file.name }}</span>
        <span v-if="formattedSize" class="file-size">{{ formattedSize }}</span>
      </div>
      <div class="header-actions">
        <button
          v-if="isEditable"
          class="action-btn"
          title="Edit file"
          @click="handleEdit"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button class="action-btn" title="Close preview" @click="handleClose">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="preview-content">
      <!-- Loading state -->
      <div v-if="loading" class="preview-loading">
        <svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" opacity="0.3" />
          <path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
        <span>Loading...</span>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="preview-error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{{ error }}</span>
      </div>

      <!-- No file selected -->
      <div v-else-if="!file" class="preview-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
          <path d="M14 2v6h6" fill="var(--color-card, #fff)" />
        </svg>
        <span>Select a file to preview</span>
      </div>

      <!-- Directory -->
      <div v-else-if="previewType === 'directory'" class="preview-directory">
        <svg viewBox="0 0 48 48" fill="currentColor">
          <path d="M20 8H8c-2.21 0-4 1.79-4 4v24c0 2.21 1.79 4 4 4h32c2.21 0 4-1.79 4-4V16c0-2.21-1.79-4-4-4H24l-4-8z" />
        </svg>
        <span class="dir-name">{{ file.name }}</span>
        <span class="dir-path">{{ file.path }}</span>
      </div>

      <!-- Image preview -->
      <div v-else-if="previewType === 'image'" class="preview-image">
        <img :src="`file://${file.path}`" :alt="file.name" />
      </div>

      <!-- Audio preview -->
      <div v-else-if="previewType === 'audio'" class="preview-audio">
        <svg viewBox="0 0 48 48" fill="currentColor">
          <path d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4zm-4 28V16l12 8-12 8z" />
        </svg>
        <audio controls :src="`file://${file.path}`" />
      </div>

      <!-- Video preview -->
      <div v-else-if="previewType === 'video'" class="preview-video">
        <video controls :src="`file://${file.path}`" />
      </div>

      <!-- PDF preview -->
      <div v-else-if="previewType === 'pdf'" class="preview-pdf">
        <embed :src="`file://${file.path}`" type="application/pdf" />
      </div>

      <!-- Code/Text preview -->
      <div v-else-if="previewType === 'code'" class="preview-code">
        <pre><code>{{ content || 'Loading...' }}</code></pre>
      </div>

      <!-- Large file -->
      <div v-else-if="previewType === 'large'" class="preview-large">
        <svg viewBox="0 0 48 48" fill="currentColor">
          <path d="M28 4H12c-2.21 0-4 1.79-4 4v32c0 2.21 1.79 4 4 4h24c2.21 0 4-1.79 4-4V16L28 4zm4 28H16v-4h16v4zm0-8H16v-4h16v4zm-4-8V8l12 12H28z" />
        </svg>
        <span>File is too large to preview</span>
        <span class="file-size-info">{{ formattedSize }}</span>
      </div>

      <!-- Unknown type -->
      <div v-else class="preview-unknown">
        <svg viewBox="0 0 48 48" fill="currentColor">
          <path d="M28 4H12c-2.21 0-4 1.79-4 4v32c0 2.21 1.79 4 4 4h24c2.21 0 4-1.79 4-4V16L28 4zm4 28H16v-4h16v4zm0-8H16v-4h16v4zm-4-8V8l12 12H28z" />
        </svg>
        <span>Cannot preview this file type</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-card, #fff);
  border-left: 1px solid var(--color-border, #e0e0e0);
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border, #e0e0e0);
  background-color: var(--color-body, #f5f5f5);
}

.file-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.file-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-1, #333);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 11px;
  color: var(--color-text-3, #999);
}

.header-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-2, #666);
  cursor: pointer;
  border-radius: var(--border-radius, 4px);
}

.action-btn:hover {
  background-color: var(--color-hover, rgba(0, 0, 0, 0.05));
  color: var(--color-text-1, #333);
}

.action-btn svg {
  width: 16px;
  height: 16px;
}

.preview-content {
  flex: 1;
  overflow: auto;
}

/* Loading/Error/Empty states */
.preview-loading,
.preview-error,
.preview-empty,
.preview-directory,
.preview-large,
.preview-unknown {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 100%;
  color: var(--color-text-3, #999);
  font-size: 13px;
}

.preview-loading svg,
.preview-error svg,
.preview-empty svg,
.preview-directory svg,
.preview-large svg,
.preview-unknown svg {
  width: 48px;
  height: 48px;
  opacity: 0.5;
}

.preview-error {
  color: var(--color-error, #ff4d4f);
}

.spinner {
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Directory preview */
.preview-directory {
  text-align: center;
}

.dir-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-1, #333);
}

.dir-path {
  font-size: 12px;
  max-width: 200px;
  word-break: break-all;
}

/* Image preview */
.preview-image {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 16px;
}

.preview-image img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

/* Audio preview */
.preview-audio {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  height: 100%;
  padding: 16px;
}

.preview-audio svg {
  width: 64px;
  height: 64px;
  color: var(--color-text-3, #999);
}

/* Video preview */
.preview-video {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 16px;
}

.preview-video video {
  max-width: 100%;
  max-height: 100%;
}

/* PDF preview */
.preview-pdf {
  height: 100%;
}

.preview-pdf embed {
  width: 100%;
  height: 100%;
}

/* Code preview */
.preview-code {
  height: 100%;
  overflow: auto;
}

.preview-code pre {
  margin: 0;
  padding: 12px;
  font-family: var(--font-mono, 'Consolas', 'Monaco', monospace);
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.preview-code code {
  color: var(--color-text-1, #333);
}

/* Large file info */
.file-size-info {
  font-size: 12px;
  color: var(--color-text-3, #999);
}
</style>
