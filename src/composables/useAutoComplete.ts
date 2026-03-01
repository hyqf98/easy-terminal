/**
 * Auto-complete composable - Provides command/path completion functionality
 */
import { ref, computed, shallowRef } from 'vue';
import { useHistoryStore } from '@/stores';
import { listDirectory } from '@/services/file.service';
import type {
  SuggestionItem,
  CompletionContext,
  CompletionResult,
  CommandDefinition,
} from '@/types/suggestion';

/** Common shell commands with descriptions */
const BUILTIN_COMMANDS: CommandDefinition[] = [
  // File operations
  { name: 'ls', description: 'List directory contents', aliases: ['dir'] },
  { name: 'cd', description: 'Change directory' },
  { name: 'pwd', description: 'Print working directory' },
  { name: 'mkdir', description: 'Create directory' },
  { name: 'rmdir', description: 'Remove empty directory' },
  { name: 'rm', description: 'Remove files or directories' },
  { name: 'cp', description: 'Copy files' },
  { name: 'mv', description: 'Move/rename files' },
  { name: 'touch', description: 'Create empty file or update timestamp' },
  { name: 'cat', description: 'Concatenate and print files' },
  { name: 'head', description: 'Output first part of files' },
  { name: 'tail', description: 'Output last part of files' },
  { name: 'less', description: 'View file with pagination' },
  { name: 'more', description: 'View file with pagination' },
  { name: 'find', description: 'Search for files' },
  { name: 'grep', description: 'Search text patterns' },
  { name: 'sed', description: 'Stream editor' },
  { name: 'awk', description: 'Pattern scanning language' },

  // File permissions
  { name: 'chmod', description: 'Change file mode' },
  { name: 'chown', description: 'Change file owner' },
  { name: 'chgrp', description: 'Change group ownership' },

  // Process management
  { name: 'ps', description: 'List processes' },
  { name: 'kill', description: 'Send signal to process' },
  { name: 'killall', description: 'Kill processes by name' },
  { name: 'top', description: 'Display process information' },
  { name: 'htop', description: 'Interactive process viewer' },
  { name: 'bg', description: 'Put job in background' },
  { name: 'fg', description: 'Put job in foreground' },
  { name: 'jobs', description: 'List active jobs' },
  { name: 'nohup', description: 'Run command immune to hangups' },

  // System info
  { name: 'uname', description: 'Print system information' },
  { name: 'hostname', description: 'Show system hostname' },
  { name: 'uptime', description: 'Show system uptime' },
  { name: 'date', description: 'Print date and time' },
  { name: 'cal', description: 'Display calendar' },
  { name: 'whoami', description: 'Print current username' },
  { name: 'id', description: 'Print user identity' },
  { name: 'env', description: 'Print environment variables' },
  { name: 'export', description: 'Set environment variable' },
  { name: 'alias', description: 'Create command alias' },
  { name: 'history', description: 'Show command history' },

  // Network
  { name: 'ping', description: 'Send ICMP packets' },
  { name: 'curl', description: 'Transfer data from URLs' },
  { name: 'wget', description: 'Download files' },
  { name: 'ssh', description: 'Secure shell client' },
  { name: 'scp', description: 'Secure copy' },
  { name: 'rsync', description: 'Remote sync' },
  { name: 'netstat', description: 'Network statistics' },
  { name: 'ss', description: 'Socket statistics' },
  { name: 'ifconfig', description: 'Network interface config' },
  { name: 'ip', description: 'IP configuration' },
  { name: 'nslookup', description: 'DNS lookup' },
  { name: 'dig', description: 'DNS lookup utility' },

  // Disk usage
  { name: 'df', description: 'Disk free space' },
  { name: 'du', description: 'Disk usage' },

  // Archiving
  { name: 'tar', description: 'Archive files' },
  { name: 'zip', description: 'Create zip archive' },
  { name: 'unzip', description: 'Extract zip archive' },
  { name: 'gzip', description: 'Compress files' },
  { name: 'gunzip', description: 'Decompress files' },

  // Git
  { name: 'git', description: 'Version control' },
  { name: 'git clone', description: 'Clone repository' },
  { name: 'git pull', description: 'Pull changes' },
  { name: 'git push', description: 'Push changes' },
  { name: 'git commit', description: 'Commit changes' },
  { name: 'git add', description: 'Stage changes' },
  { name: 'git status', description: 'Show status' },
  { name: 'git log', description: 'Show log' },
  { name: 'git branch', description: 'Manage branches' },
  { name: 'git checkout', description: 'Switch branches' },
  { name: 'git merge', description: 'Merge branches' },
  { name: 'git diff', description: 'Show differences' },
  { name: 'git stash', description: 'Stash changes' },
  { name: 'git reset', description: 'Reset changes' },
  { name: 'git rebase', description: 'Rebase commits' },

  // Package managers
  { name: 'npm', description: 'Node package manager' },
  { name: 'yarn', description: 'Yarn package manager' },
  { name: 'pnpm', description: 'Fast package manager' },
  { name: 'bun', description: 'Bun runtime' },
  { name: 'pip', description: 'Python package manager' },
  { name: 'cargo', description: 'Rust package manager' },
  { name: 'go', description: 'Go language' },
  { name: 'apt', description: 'Debian package manager' },
  { name: 'yum', description: 'RPM package manager' },
  { name: 'brew', description: 'Homebrew package manager' },

  // Docker
  { name: 'docker', description: 'Docker container runtime' },
  { name: 'docker ps', description: 'List containers' },
  { name: 'docker images', description: 'List images' },
  { name: 'docker run', description: 'Run container' },
  { name: 'docker exec', description: 'Execute in container' },
  { name: 'docker build', description: 'Build image' },
  { name: 'docker-compose', description: 'Docker compose' },
  { name: 'docker stop', description: 'Stop container' },
  { name: 'docker rm', description: 'Remove container' },
  { name: 'docker rmi', description: 'Remove image' },
  { name: 'docker logs', description: 'View container logs' },

  // Development
  { name: 'node', description: 'Node.js runtime' },
  { name: 'python', description: 'Python interpreter' },
  { name: 'python3', description: 'Python 3 interpreter' },
  { name: 'ruby', description: 'Ruby interpreter' },
  { name: 'java', description: 'Java runtime' },
  { name: 'javac', description: 'Java compiler' },
  { name: 'rustc', description: 'Rust compiler' },
  { name: 'gcc', description: 'C compiler' },
  { name: 'make', description: 'Build automation' },
  { name: 'cmake', description: 'Build system' },

  // Text editors
  { name: 'vim', description: 'Vi IMproved editor' },
  { name: 'vi', description: 'Vi editor' },
  { name: 'nano', description: 'Nano editor' },
  { name: 'code', description: 'VS Code' },
  { name: 'emacs', description: 'Emacs editor' },

  // Misc
  { name: 'echo', description: 'Print text' },
  { name: 'printf', description: 'Format and print' },
  { name: 'sleep', description: 'Delay execution' },
  { name: 'time', description: 'Measure execution time' },
  { name: 'watch', description: 'Execute periodically' },
  { name: 'xargs', description: 'Build and execute commands' },
  { name: 'tee', description: 'Read stdin, write to file and stdout' },
  { name: 'sudo', description: 'Execute as superuser' },
  { name: 'su', description: 'Switch user' },
  { name: 'man', description: 'Display manual' },
  { name: 'which', description: 'Show command path' },
  { name: 'type', description: 'Show command type' },
  { name: 'exit', description: 'Exit shell' },
  { name: 'clear', description: 'Clear screen' },
  { name: 'source', description: 'Execute commands from file' },
  { name: '.', description: 'Execute script in current shell' },
];

/** Generate unique ID for suggestions */
function generateId(): string {
  return `suggestion-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Check if input is a path completion context */
function isPathContext(input: string, cursorPos: number): { isPath: boolean; pathStart: number; pathPrefix: string } {
  // Look backward for path context
  let pathStart = cursorPos;
  let inQuote = false;
  let quoteChar = '';

  for (let i = cursorPos - 1; i >= 0; i--) {
    const char = input[i];

    if ((char === '"' || char === "'") && (i === 0 || input[i - 1] !== '\\')) {
      if (!inQuote) {
        inQuote = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuote = false;
      }
    }

    if (!inQuote && (char === ' ' || char === '\t')) {
      pathStart = i + 1;
      break;
    }

    if (i === 0) {
      pathStart = 0;
    }
  }

  const pathPrefix = input.slice(pathStart, cursorPos);

  // Check if it looks like a path (starts with ./, ~/, /, or contains /)
  const isPath = pathPrefix.startsWith('./') ||
    pathPrefix.startsWith('~') ||
    pathPrefix.startsWith('/') ||
    pathPrefix.includes('/') ||
    pathPrefix === '.' ||
    pathPrefix === '..';

  return { isPath, pathStart, pathPrefix };
}

/** Get command name from input */
function getCommandName(input: string): string | null {
  const trimmed = input.trim();
  const parts = trimmed.split(/\s+/);
  return parts[0] || null;
}

export function useAutoComplete() {
  const historyStore = useHistoryStore();

  // State
  const isLoading = ref(false);
  const cachedFiles = shallowRef<Map<string, SuggestionItem[]>>(new Map());
  const lastCompletion = shallowRef<CompletionResult | null>(null);

  // Computed
  const commandSuggestions = computed<SuggestionItem[]>(() => {
    return BUILTIN_COMMANDS.map(cmd => ({
      id: generateId(),
      label: cmd.name,
      insertText: cmd.name,
      type: 'command' as const,
      description: cmd.description,
      priority: 50,
      source: 'builtin' as const,
    }));
  });

  /**
   * Complete based on context
   */
  async function complete(context: CompletionContext): Promise<CompletionResult> {
    const { input, cursorPosition, cwd } = context;
    isLoading.value = true;

    try {
      const results: SuggestionItem[] = [];
      let replaceStart = 0;
      let replaceEnd = cursorPosition;

      // Determine what kind of completion we need
      const trimmedInput = input.trim();

      if (!trimmedInput) {
        // Empty input - show recent commands
        const historyItems = await getHistorySuggestions('', 10);
        results.push(...historyItems);
        replaceStart = 0;
      } else {
        // Check for path completion
        const pathContext = isPathContext(input, cursorPosition);

        if (pathContext.isPath && pathContext.pathPrefix) {
          // Path completion
          const pathItems = await getPathSuggestions(pathContext.pathPrefix, cwd);
          results.push(...pathItems);
          replaceStart = pathContext.pathStart;
        } else {
          // Command completion
          const commandName = getCommandName(trimmedInput);

          if (commandName && !trimmedInput.includes(' ')) {
            // Complete command name
            const cmdItems = getCommandSuggestions(commandName);
            const historyItems = await getHistorySuggestions(commandName, 5);
            results.push(...cmdItems, ...historyItems);
            replaceStart = input.indexOf(commandName);
          } else if (commandName && trimmedInput.includes(' ')) {
            // Complete argument or path after command
            const lastWord = getLastWord(input, cursorPosition);

            if (lastWord) {
              // Try path completion first
              if (lastWord.includes('/') || lastWord.startsWith('~') || lastWord.startsWith('.')) {
                const pathItems = await getPathSuggestions(lastWord, cwd);
                results.push(...pathItems);
                replaceStart = cursorPosition - lastWord.length;
              } else {
                // Show history for this command
                const historyItems = await getHistorySuggestions(lastWord, 10);
                results.push(...historyItems);
                replaceStart = cursorPosition - lastWord.length;
              }
            }
          }
        }
      }

      // Sort by priority
      results.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

      const result: CompletionResult = {
        items: results.slice(0, 20),
        replaceStart,
        replaceEnd,
      };

      lastCompletion.value = result;
      return result;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Get command suggestions matching prefix
   */
  function getCommandSuggestions(prefix: string): SuggestionItem[] {
    const lowerPrefix = prefix.toLowerCase();
    const matched: SuggestionItem[] = [];

    for (const cmd of BUILTIN_COMMANDS) {
      if (cmd.name.toLowerCase().startsWith(lowerPrefix)) {
        matched.push({
          id: generateId(),
          label: cmd.name,
          insertText: cmd.name,
          type: 'command',
          description: cmd.description,
          priority: 100,
          source: 'builtin',
        });
      } else if (cmd.aliases) {
        for (const alias of cmd.aliases) {
          if (alias.toLowerCase().startsWith(lowerPrefix)) {
            matched.push({
              id: generateId(),
              label: alias,
              insertText: alias,
              type: 'command',
              description: `Alias for ${cmd.name}`,
              detail: cmd.description,
              priority: 90,
              source: 'builtin',
            });
          }
        }
      }
    }

    return matched;
  }

  /**
   * Get path suggestions
   */
  async function getPathSuggestions(prefix: string, cwd?: string): Promise<SuggestionItem[]> {
    try {
      // Expand path
      let basePath = prefix;
      let filterPrefix = '';

      // Handle home directory
      if (prefix.startsWith('~/')) {
        basePath = '~/' + prefix.slice(2);
        const lastSlash = basePath.lastIndexOf('/');
        filterPrefix = basePath.slice(lastSlash + 1);
        basePath = basePath.slice(0, lastSlash + 1);
      } else if (prefix.includes('/')) {
        const lastSlash = prefix.lastIndexOf('/');
        filterPrefix = prefix.slice(lastSlash + 1);
        basePath = prefix.slice(0, lastSlash + 1);
      } else {
        filterPrefix = prefix;
        basePath = './';
      }

      // Resolve relative to cwd
      let dirPath = basePath;
      if (cwd && !basePath.startsWith('/') && !basePath.startsWith('~')) {
        if (basePath.startsWith('./')) {
          dirPath = cwd + '/' + basePath.slice(2);
        } else {
          dirPath = cwd + '/' + basePath;
        }
      }

      // Check cache
      const cacheKey = dirPath;
      if (cachedFiles.value.has(cacheKey)) {
        const cached = cachedFiles.value.get(cacheKey)!;
        const filtered = filterPrefix
          ? cached.filter(f => f.label.toLowerCase().startsWith(filterPrefix.toLowerCase()))
          : cached;
        return filtered.map(f => ({
          ...f,
          id: generateId(),
          priority: 100,
        }));
      }

      // List directory
      const files = await listDirectory(dirPath || cwd || '.');
      const isDir = (f: { type: string }) => f.type === 'directory';

      const items: SuggestionItem[] = files.map(file => ({
        id: generateId(),
        label: file.name,
        insertText: prefix.slice(0, prefix.lastIndexOf('/') + 1) + file.name + (isDir(file) ? '/' : ''),
        type: isDir(file) ? 'directory' : 'file',
        detail: file.path,
        icon: file.iconType,
        priority: isDir(file) ? 80 : 70,
        source: 'path' as const,
      }));

      // Cache results
      cachedFiles.value.set(cacheKey, items);

      // Filter by prefix
      const filtered = filterPrefix
        ? items.filter(f => f.label.toLowerCase().startsWith(filterPrefix.toLowerCase()))
        : items;

      return filtered;
    } catch (e) {
      console.error('Failed to get path suggestions:', e);
      return [];
    }
  }

  /**
   * Get history suggestions
   */
  async function getHistorySuggestions(prefix: string, limit: number): Promise<SuggestionItem[]> {
    try {
      const entries = await historyStore.searchCommands(prefix, limit);

      return entries.map((entry, index) => ({
        id: generateId(),
        label: entry.command,
        insertText: entry.command,
        type: 'history' as const,
        detail: entry.cwd,
        priority: 60 - index,
        source: 'history' as const,
      }));
    } catch (e) {
      console.error('Failed to get history suggestions:', e);
      return [];
    }
  }

  /**
   * Get last word from input at cursor position
   */
  function getLastWord(input: string, cursorPos: number): string {
    let end = cursorPos;
    let start = cursorPos;

    // Skip trailing spaces
    while (end > 0 && input[end - 1] === ' ') {
      end--;
    }

    // Find word start
    start = end;
    while (start > 0 && input[start - 1] !== ' ' && input[start - 1] !== '\t') {
      start--;
    }

    return input.slice(start, end);
  }

  /**
   * Clear cache
   */
  function clearCache(): void {
    cachedFiles.value.clear();
  }

  return {
    // State
    isLoading,
    lastCompletion,
    commandSuggestions,
    // Methods
    complete,
    getCommandSuggestions,
    getPathSuggestions,
    getHistorySuggestions,
    clearCache,
  };
}
