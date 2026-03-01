<script setup lang="ts">
/**
 * CodeEditor - Monaco editor wrapper component
 */
import { ref, computed, watch, onMounted, onUnmounted, shallowRef, nextTick } from 'vue';

const props = withDefaults(defineProps<{
  modelValue?: string;
  filePath?: string;
  language?: string;
  readOnly?: boolean;
  theme?: 'vs' | 'vs-dark' | 'hc-black';
  minimap?: boolean;
  lineNumbers?: 'on' | 'off' | 'relative' | 'interval';
  fontSize?: number;
  wordWrap?: 'on' | 'off' | 'bounded' | 'wordWrapColumn';
}>(), {
  modelValue: '',
  filePath: '',
  language: 'plaintext',
  readOnly: false,
  theme: 'vs',
  minimap: false,
  lineNumbers: 'on',
  fontSize: 13,
  wordWrap: 'on',
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'change', value: string): void;
  (e: 'save', value: string): void;
  (e: 'ready'): void;
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const editor = shallowRef<any>(null);
const monaco = shallowRef<any>(null);
const isReady = ref(false);
const isDirty = ref(false);

// Detect language from file extension
const detectedLanguage = computed(() => {
  if (props.language !== 'plaintext') return props.language;

  const ext = props.filePath.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    'js': 'javascript',
    'mjs': 'javascript',
    'cjs': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescriptreact',
    'jsx': 'javascriptreact',
    'vue': 'vue',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'scss',
    'less': 'less',
    'json': 'json',
    'md': 'markdown',
    'mdx': 'markdown',
    'py': 'python',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'java': 'java',
    'kt': 'kotlin',
    'scala': 'scala',
    'swift': 'swift',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'cs': 'csharp',
    'php': 'php',
    'sql': 'sql',
    'yaml': 'yaml',
    'yml': 'yaml',
    'xml': 'xml',
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'ps1': 'powershell',
    'dockerfile': 'dockerfile',
    'toml': 'toml',
    'r': 'r',
    'lua': 'lua',
    'dart': 'dart',
  };

  return langMap[ext || ''] || 'plaintext';
});

// Initialize Monaco editor
async function initEditor() {
  if (!containerRef.value) return;

  try {
    // Dynamic import of Monaco
    const monacoEditor = await import('monaco-editor');
    monaco.value = monacoEditor;

    // Create editor
    editor.value = monacoEditor.editor.create(containerRef.value, {
      value: props.modelValue,
      language: detectedLanguage.value,
      theme: props.theme,
      readOnly: props.readOnly,
      minimap: { enabled: props.minimap },
      lineNumbers: props.lineNumbers,
      fontSize: props.fontSize,
      wordWrap: props.wordWrap,
      automaticLayout: true,
      scrollBeyondLastLine: false,
      renderWhitespace: 'selection',
      tabSize: 2,
      insertSpaces: true,
      folding: true,
      foldingStrategy: 'auto',
      showFoldingControls: 'mouseover',
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        indentation: true,
      },
      padding: { top: 8, bottom: 8 },
    });

    // Listen for content changes
    editor.value.onDidChangeModelContent(() => {
      const value = editor.value.getValue();
      isDirty.value = true;
      emit('update:modelValue', value);
      emit('change', value);
    });

    // Keyboard shortcuts
    editor.value.addCommand(monacoEditor.KeyMod.CtrlCmd | monacoEditor.KeyCode.KeyS, () => {
      emit('save', editor.value.getValue());
      isDirty.value = false;
    });

    isReady.value = true;
    emit('ready');
  } catch (error) {
    console.error('Failed to initialize Monaco editor:', error);
  }
}

// Update editor content
watch(() => props.modelValue, (newValue) => {
  if (editor.value && isReady.value) {
    const currentValue = editor.value.getValue();
    if (newValue !== currentValue) {
      editor.value.setValue(newValue);
    }
  }
});

// Update language
watch(detectedLanguage, (newLang) => {
  if (editor.value && monaco.value && isReady.value) {
    const model = editor.value.getModel();
    if (model) {
      monaco.value.editor.setModelLanguage(model, newLang);
    }
  }
});

// Update theme
watch(() => props.theme, (newTheme) => {
  if (editor.value && monaco.value && isReady.value) {
    monaco.value.editor.setTheme(newTheme);
  }
});

// Update read-only
watch(() => props.readOnly, (newReadOnly) => {
  if (editor.value && isReady.value) {
    editor.value.updateOptions({ readOnly: newReadOnly });
  }
});

onMounted(() => {
  nextTick(() => {
    initEditor();
  });
});

onUnmounted(() => {
  if (editor.value) {
    editor.value.dispose();
  }
});

// Public methods
function getValue(): string {
  return editor.value?.getValue() || '';
}

function setValue(value: string): void {
  if (editor.value) {
    editor.value.setValue(value);
  }
}

function focus(): void {
  editor.value?.focus();
}

function blur(): void {
  if (editor.value) {
    const dom = editor.value.getDomNode();
    if (dom) {
      dom.blur();
    }
  }
}

function format(): void {
  if (editor.value) {
    editor.value.getAction('editor.action.formatDocument')?.run();
  }
}

function undo(): void {
  editor.value?.trigger('keyboard', 'undo', null);
}

function redo(): void {
  editor.value?.trigger('keyboard', 'redo', null);
}

defineExpose({
  getValue,
  setValue,
  focus,
  blur,
  format,
  undo,
  redo,
  isReady,
  isDirty,
});
</script>

<template>
  <div ref="containerRef" class="code-editor"></div>
</template>

<style scoped>
.code-editor {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
