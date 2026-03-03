/**
 * useCommandInterceptor - Detect and intercept terminal editor commands
 */
import { ref, computed } from 'vue';

// Common terminal editor commands
const EDITOR_PATTERNS = [
  // vim variants
  /^(g?vim?)(?:\s+(-\w+|\+\w+|\s+\S+))*\s+(.+)$/i,
  // nano
  /^(nano)(?:\s+(-\w+|\+\w+|\s+\S+))*\s+(.+)$/i,
  // emacs (terminal mode)
  /^(emacs)(?:\s+(-\w+|--\w+(?:=\S+)?|\s+\S+))*\s+(.+)$/i,
  // micro
  /^(micro)(?:\s+(-\w+|\s+\S+))*\s+(.+)$/i,
  // ed
  /^(ed)(?:\s+(-\w+|\s+\S+))*\s+(.+)$/i,
  // joe/jmacs
  /^(j(?:oe|macs))(?:\s+(-\w+|\s+\S+))*\s+(.+)$/i,
  // ne
  /^(ne)(?:\s+(-\w+|\s+\S+))*\s+(.+)$/i,
];

export interface EditorCommand {
  editor: string;
  filePath: string;
  args: string[];
  rawCommand: string;
}

export function useCommandInterceptor() {
  const interceptedCommand = ref<EditorCommand | null>(null);
  const isEnabled = ref(true);

  /**
   * Check if a command is an editor command
   */
  function detectEditorCommand(command: string): EditorCommand | null {
    if (!isEnabled.value) return null;

    const trimmedCommand = command.trim();
    if (!trimmedCommand) return null;

    for (const pattern of EDITOR_PATTERNS) {
      const match = trimmedCommand.match(pattern);
      if (match) {
        const editor = match[1].toLowerCase();
        const filePath = match[match.length - 1].trim();

        // Extract arguments (everything between editor and file path)
        const argsStr = trimmedCommand.substring(editor.length, trimmedCommand.lastIndexOf(filePath));
        const args = argsStr.trim().split(/\s+/).filter(Boolean);

        return {
          editor,
          filePath,
          args,
          rawCommand: trimmedCommand,
        };
      }
    }

    return null;
  }

  /**
   * Intercept a command - returns true if the command should be intercepted
   */
  function intercept(command: string): boolean {
    const detected = detectEditorCommand(command);
    if (detected) {
      interceptedCommand.value = detected;
      return true;
    }
    return false;
  }

  /**
   * Clear the intercepted command
   */
  function clearIntercepted() {
    interceptedCommand.value = null;
  }

  /**
   * Enable/disable interception
   */
  function setEnabled(enabled: boolean) {
    isEnabled.value = enabled;
  }

  return {
    interceptedCommand,
    isEnabled,
    detectEditorCommand,
    intercept,
    clearIntercepted,
    setEnabled,
  };
}
