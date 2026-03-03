<script setup lang="ts">
/**
 * AppIcon - Application icon component
 * Supports both custom SVG icons and lucide-vue-next icons
 */
import { computed } from 'vue';
import {
  Terminal, Minus, Square, Copy, X, Menu, Sun, Moon, Folder, Settings,
  ChevronRight, ChevronDown, ChevronUp, ChevronLeft, Plus, Search,
  RefreshCw, File, FilePlus, FolderPlus, Trash2, Edit, Copy as CopyIcon,
  Clipboard, Scissors, Undo, Redo, Save, Download, Upload, Play, Pause,
  Info, AlertTriangle, AlertCircle, CheckCircle, HelpCircle, User, Lock,
  Unlock, Key, Link, ExternalLink, Wifi, WifiOff, Database, Server,
  HardDrive, Monitor, Laptop, Smartphone, Tablet, Globe, Mail, Bell,
  Calendar, Clock, Star, Heart, Bookmark, Tag, Flag, Eye, EyeOff,
  Filter, ArrowUpDown, List, Grid, Columns, SidebarOpen, SidebarClose,
  Maximize2, Minimize2, Expand, Shrink, Move, ZoomIn, ZoomOut,
  RotateCw, RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  MoreHorizontal, MoreVertical, Home, Check, GitBranch, GitCommit,
  GitMerge, Github, Container, Split, PanelLeft, PanelRight, Layout,
  Code, TerminalSquare
} from 'lucide-vue-next';

const props = withDefaults(defineProps<{
  /** Icon name (lucide icon name or custom name) */
  name: string;
  /** Icon size in pixels */
  size?: number;
  /** Icon color */
  color?: string;
  /** Stroke width */
  strokeWidth?: number;
}>(), {
  size: 16,
  color: 'currentColor',
  strokeWidth: 2,
});

// Map icon names to imported lucide components
const iconMap: Record<string, any> = {
  'terminal': Terminal,
  'minimize': Minus,
  'maximize': Square,
  'restore': Copy,
  'close': X,
  'menu': Menu,
  'sun': Sun,
  'moon': Moon,
  'folder': Folder,
  'settings': Settings,
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  'chevron-left': ChevronLeft,
  'plus': Plus,
  'minus': Minus,
  'search': Search,
  'refresh': RefreshCw,
  'file': File,
  'file-plus': FilePlus,
  'folder-plus': FolderPlus,
  'trash': Trash2,
  'edit': Edit,
  'copy': CopyIcon,
  'paste': Clipboard,
  'cut': Scissors,
  'undo': Undo,
  'redo': Redo,
  'save': Save,
  'download': Download,
  'upload': Upload,
  'play': Play,
  'pause': Pause,
  'stop': Square,
  'info': Info,
  'warning': AlertTriangle,
  'error': AlertCircle,
  'success': CheckCircle,
  'question': HelpCircle,
  'user': User,
  'lock': Lock,
  'unlock': Unlock,
  'key': Key,
  'link': Link,
  'external-link': ExternalLink,
  'wifi': Wifi,
  'wifi-off': WifiOff,
  'database': Database,
  'server': Server,
  'hard-drive': HardDrive,
  'monitor': Monitor,
  'laptop': Laptop,
  'smartphone': Smartphone,
  'tablet': Tablet,
  'globe': Globe,
  'mail': Mail,
  'bell': Bell,
  'calendar': Calendar,
  'clock': Clock,
  'star': Star,
  'heart': Heart,
  'bookmark': Bookmark,
  'tag': Tag,
  'flag': Flag,
  'eye': Eye,
  'eye-off': EyeOff,
  'filter': Filter,
  'sort': ArrowUpDown,
  'list': List,
  'grid': Grid,
  'columns': Columns,
  'sidebar': SidebarOpen,
  'sidebar-close': SidebarClose,
  'maximize-2': Maximize2,
  'minimize-2': Minimize2,
  'expand': Expand,
  'shrink': Shrink,
  'move': Move,
  'zoom-in': ZoomIn,
  'zoom-out': ZoomOut,
  'rotate-cw': RotateCw,
  'rotate-ccw': RotateCcw,
  'arrow-up': ArrowUp,
  'arrow-down': ArrowDown,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'more-horizontal': MoreHorizontal,
  'more-vertical': MoreVertical,
  'home': Home,
  'check': Check,
  'x': X,
  'add': Plus,
  'remove': Minus,
  'git-branch': GitBranch,
  'git-commit': GitCommit,
  'git-merge': GitMerge,
  'github': Github,
  'docker': Container,
  'ssh': Terminal,
  'split': Split,
  'panel-left': PanelLeft,
  'panel-right': PanelRight,
  'layout': Layout,
  'code': Code,
  'terminal-square': TerminalSquare,
};

// Get the icon component
const iconComponent = computed(() => {
  return iconMap[props.name] || null;
});
</script>

<template>
  <span
    class="app-icon"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      color: color,
    }"
  >
    <!-- Lucide icon -->
    <component
      :is="iconComponent"
      v-if="iconComponent"
      :size="size"
      :stroke-width="strokeWidth"
    />

    <!-- Default fallback: question mark -->
    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="strokeWidth">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  </span>
</template>

<style scoped>
.app-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.app-icon svg {
  width: 100%;
  height: 100%;
}
</style>
