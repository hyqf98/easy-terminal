<script setup lang="ts">
/**
 * FileIcon - File/folder icon component
 * Displays appropriate icons based on file type/extension
 */
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  /** Icon type from backend (e.g., 'folder', 'javascript', 'rust') */
  type?: string;
  /** Whether the item is a directory */
  isDirectory?: boolean;
  /** Whether the folder is expanded */
  isExpanded?: boolean;
  /** Icon size in pixels */
  size?: number;
}>(), {
  type: 'file',
  isDirectory: false,
  isExpanded: false,
  size: 16,
});

// Color mapping for file types
const typeColors: Record<string, string> = {
  // Folders
  'folder': '#dcb67a',
  'folder-src': '#dcb67a',
  'folder-dist': '#8b8b8b',
  'folder-test': '#e37933',
  'folder-node': '#8cc84b',
  'folder-config': '#6d8086',
  'folder-resource': '#6d8086',
  'folder-images': '#dcb67a',
  'folder-components': '#42b883',
  'folder-lib': '#8cc84b',
  'folder-scripts': '#f1e05a',
  'folder-styles': '#563d7c',
  'folder-type': '#3178c6',
  'folder-views': '#e34c26',
  'folder-utils': '#6d8086',
  'folder-hook': '#61dafb',
  'folder-database': '#f29111',
  'folder-model': '#6d8086',
  'folder-service': '#6d8086',
  'folder-layout': '#6d8086',
  'folder-routing': '#6d8086',
  'folder-git': '#f14e32',
  'folder-vscode': '#007acc',
  'folder-docs': '#6d8086',
  'folder-bin': '#6d8086',
  'folder-logs': '#6d8086',
  'folder-temp': '#6d8086',

  // JavaScript ecosystem
  'javascript': '#f1e05a',
  'typescript': '#3178c6',
  'react': '#61dafb',
  'vue': '#42b883',
  'svelte': '#ff3e00',
  'angular': '#dd0031',
  'nodejs': '#8cc84b',
  'npm': '#cb3837',
  'yarn': '#2c8ebb',
  'pnpm': '#f9ad00',
  'vite': '#646cff',
  'webpack': '#8dd6f9',
  'rollup': '#ff3333',
  'eslint': '#4b32c3',
  'prettier': '#56b3b4',

  // Styles
  'css': '#563d7c',
  'sass': '#c6538c',
  'less': '#1d365d',
  'stylus': '#ff6347',

  // Data formats
  'json': '#cbcb41',
  'xml': '#0060ac',
  'yaml': '#cb171e',
  'toml': '#9c4121',

  // Programming languages
  'python': '#3572a5',
  'ruby': '#701516',
  'go': '#00add8',
  'rust': '#dea584',
  'java': '#b07219',
  'kotlin': '#a97bff',
  'scala': '#c22d40',
  'swift': '#f05138',
  'c': '#555555',
  'cpp': '#f34b7d',
  'h': '#a54a4b',
  'csharp': '#178600',
  'php': '#4f5d95',
  'lua': '#000080',
  'r': '#198ce7',
  'dart': '#00b4ab',
  'elixir': '#6e4a7e',
  'erlang': '#b83998',
  'clojure': '#db5855',
  'haskell': '#5e5086',
  'sql': '#e38c00',

  // Shell
  'console': '#89e051',
  'powershell': '#012456',
  'fish': '#34dbe4',

  // Markup
  'html': '#e34c26',
  'markdown': '#083fa1',
  'text': '#6d8086',

  // Config
  'settings': '#6d8086',
  'git': '#f14e32',
  'docker': '#2496ed',
  'makefile': '#6d8086',
  'tune': '#6d8086',
  'gradle': '#02303a',

  // Images
  'image': '#a074c4',
  'svg': '#ffb13b',

  // Media
  'audio': '#f1182c',
  'video': '#f1182c',

  // Documents
  'pdf': '#b30b00',
  'word': '#2b579a',
  'excel': '#217346',
  'powerpoint': '#d24726',

  // Other
  'zip': '#6d8086',
  'font': '#34dbe4',
  'binary': '#6d8086',
  'executable': '#6d8086',
  'lock': '#6d8086',
  'log': '#6d8086',
  'map': '#6d8086',
  'readme': '#018389',
  'changelog': '#008000',
  'certificate': '#299d3a',

  // Default
  'file': '#6d8086',
};

const iconColor = computed(() => {
  if (props.isDirectory) {
    return props.isExpanded
      ? (typeColors[`folder-${props.type}`] || typeColors['folder'])
      : (typeColors[`folder-${props.type}`] || typeColors['folder']);
  }
  return typeColors[props.type] || typeColors['file'];
});
</script>

<template>
  <span
    class="file-icon"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      color: iconColor,
    }"
  >
    <!-- Folder icons -->
    <template v-if="isDirectory">
      <!-- Expanded folder -->
      <svg v-if="isExpanded" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 19a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16z"/>
        <path d="M3.5 10h17a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-17a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5z" fill="var(--color-card, #fff)" opacity="0.3"/>
      </svg>
      <!-- Closed folder -->
      <svg v-else viewBox="0 0 24 24" fill="currentColor">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z"/>
      </svg>
    </template>

    <!-- File icons (simplified single-color versions) -->
    <template v-else>
      <!-- JavaScript -->
      <svg v-if="type === 'javascript'" viewBox="0 0 24 24" fill="currentColor">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <text x="12" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="#000">JS</text>
      </svg>
      <!-- TypeScript -->
      <svg v-else-if="type === 'typescript'" viewBox="0 0 24 24" fill="currentColor">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <text x="12" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="#fff">TS</text>
      </svg>
      <!-- React -->
      <svg v-else-if="type === 'react'" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="2.5"/>
        <ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="currentColor" stroke-width="1"/>
        <ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="currentColor" stroke-width="1" transform="rotate(60 12 12)"/>
        <ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="currentColor" stroke-width="1" transform="rotate(120 12 12)"/>
      </svg>
      <!-- Vue -->
      <svg v-else-if="type === 'vue'" viewBox="0 0 24 24" fill="currentColor">
        <path d="M2 3h4l6 10.5L18 3h4L12 21 2 3z"/>
      </svg>
      <!-- JSON -->
      <svg v-else-if="type === 'json'" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="12" y="15" text-anchor="middle" font-size="8" fill="currentColor">{}</text>
      </svg>
      <!-- HTML -->
      <svg v-else-if="type === 'html'" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 3l1.5 16L12 21l6.5-2L20 3H4z"/>
        <text x="12" y="14" text-anchor="middle" font-size="8" font-weight="bold" fill="#fff">H5</text>
      </svg>
      <!-- CSS -->
      <svg v-else-if="type === 'css'" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 3l1.5 16L12 21l6.5-2L20 3H4z"/>
        <text x="12" y="14" text-anchor="middle" font-size="8" font-weight="bold" fill="#fff">C3</text>
      </svg>
      <!-- Python -->
      <svg v-else-if="type === 'python'" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C8 2 6 3 6 5v3h6v1H4c-2 0-3 2-3 5s1 5 3 5h2v-3c0-2 1.5-3.5 3.5-3.5h5c1.5 0 2.5-1 2.5-2.5V5c0-2-2-3-5-3h-1zm-2 2a1 1 0 110 2 1 1 0 010-2z"/>
        <path d="M12 22c4 0 6-1 6-3v-3h-6v-1h8c2 0 3-2 3-5s-1-5-3-5h-2v3c0 2-1.5 3.5-3.5 3.5h-5c-1.5 0-2.5 1-2.5 2.5v4c0 2 2 3 5 3h1zm2-2a1 1 0 110-2 1 1 0 010 2z"/>
      </svg>
      <!-- Rust -->
      <svg v-else-if="type === 'rust'" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
        <circle cx="12" cy="12" r="3"/>
        <text x="12" y="9" text-anchor="middle" font-size="8" fill="currentColor">R</text>
      </svg>
      <!-- Go -->
      <svg v-else-if="type === 'go'" viewBox="0 0 24 24" fill="currentColor">
        <text x="12" y="16" text-anchor="middle" font-size="10" font-weight="bold">Go</text>
      </svg>
      <!-- Docker -->
      <svg v-else-if="type === 'docker'" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 13h2v2H3v-2zm3 0h2v2H6v-2zm3 0h2v2H9v-2zm3 0h2v2h-2v-2zm3 0h2v2h-2v-2zm3 0h2v2h-2v-2z"/>
        <path d="M21 14c-1 0-2 1-4 1s-3-1-4-1-2 1-4 1-3-1-4-1-2 1-2 1c0 2 2 4 6 5 3 0 6 0 8-2 2-1 4-3 4-4z"/>
      </svg>
      <!-- Git -->
      <svg v-else-if="type === 'git'" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="6" cy="6" r="3"/>
        <circle cx="18" cy="6" r="3"/>
        <circle cx="6" cy="18" r="3"/>
        <path d="M6 9v6m0 3l12-12" fill="none" stroke="currentColor" stroke-width="2"/>
      </svg>
      <!-- Image -->
      <svg v-else-if="type === 'image'" viewBox="0 0 24 24" fill="currentColor">
        <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
        <circle cx="8" cy="8" r="2"/>
        <path d="M21 15l-5-5-8 8h12a1 1 0 001-1v-2z"/>
      </svg>
      <!-- Lock file -->
      <svg v-else-if="type === 'lock'" viewBox="0 0 24 24" fill="currentColor">
        <rect x="5" y="11" width="14" height="10" rx="2"/>
        <path d="M8 11V7a4 4 0 018 0v4" fill="none" stroke="currentColor" stroke-width="2"/>
      </svg>
      <!-- Markdown -->
      <svg v-else-if="type === 'markdown'" viewBox="0 0 24 24" fill="currentColor">
        <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="12" y="15" text-anchor="middle" font-size="8" font-weight="bold">MD</text>
      </svg>
      <!-- Settings/Config -->
      <svg v-else-if="type === 'settings' || type === 'tune'" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
      <!-- Shell/Console -->
      <svg v-else-if="type === 'console'" viewBox="0 0 24 24" fill="currentColor">
        <rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
        <path d="M6 9l3 3-3 3m5 0h6" fill="none" stroke="currentColor" stroke-width="2"/>
      </svg>
      <!-- Database/SQL -->
      <svg v-else-if="type === 'database' || type === 'sql'" viewBox="0 0 24 24" fill="currentColor">
        <ellipse cx="12" cy="5" rx="9" ry="3"/>
        <path d="M21 5v14c0 1.66-4 3-9 3s-9-1.34-9-3V5" fill="none" stroke="currentColor" stroke-width="2"/>
        <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" fill="none" stroke="currentColor" stroke-width="2"/>
      </svg>
      <!-- Default file icon -->
      <svg v-else viewBox="0 0 24 24" fill="currentColor">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
        <path d="M14 2v6h6" fill="var(--color-card, #fff)"/>
      </svg>
    </template>
  </span>
</template>

<style scoped>
.file-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.file-icon svg {
  width: 100%;
  height: 100%;
}
</style>
