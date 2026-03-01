/**
 * Custom xterm.js addon for command/output highlighting
 * Provides syntax highlighting for shell commands, paths, and errors
 */
import { Terminal, IDisposable } from 'xterm';

/** Highlight rule configuration */
export interface HighlightRule {
  /** Regex pattern to match */
  pattern: RegExp;
  /** ANSI color code or CSS class name */
  color: number | string;
  /** Whether this is a foreground or background color */
  type: 'foreground' | 'background';
}

/** Highlight theme configuration */
export interface HighlightTheme {
  /** Color for commands */
  command: number;
  /** Color for paths */
  path: number;
  /** Color for URLs */
  url: number;
  /** Color for errors */
  error: number;
  /** Color for success messages */
  success: number;
  /** Color for warnings */
  warning: number;
  /** Color for strings */
  string: number;
  /** Color for numbers */
  number: number;
}

/** Default dark theme colors (ANSI 256 colors) */
const DEFAULT_DARK_THEME: HighlightTheme = {
  command: 46,    // Green
  path: 81,       // Light blue
  url: 117,       // Cyan
  error: 196,     // Red
  success: 40,    // Green
  warning: 226,   // Yellow
  string: 186,    // Light yellow
  number: 215,    // Orange
};

/** Default light theme colors (ANSI 256 colors) */
const DEFAULT_LIGHT_THEME: HighlightTheme = {
  command: 28,    // Dark green
  path: 25,       // Blue
  url: 31,        // Cyan
  error: 124,     // Red
  success: 28,    // Green
  warning: 178,   // Yellow
  string: 100,    // Olive
  number: 166,    // Orange
};

/** Default highlight rules */
const DEFAULT_RULES: HighlightRule[] = [
  // URLs
  {
    pattern: /https?:\/\/[^\s<]+/gi,
    color: 117,
    type: 'foreground',
  },
  // File paths (Unix)
  {
    pattern: /(?:^|\s)(\/[\w./-]+)/g,
    color: 81,
    type: 'foreground',
  },
  // File paths (Windows)
  {
    pattern: /(?:^|\s)([A-Za-z]:\\[\w./\\-]+)/g,
    color: 81,
    type: 'foreground',
  },
  // Common commands
  {
    pattern: /^\s*(?:git|npm|yarn|pnpm|node|python|pip|cargo|rustc|go|docker|kubectl|ls|cd|mkdir|rm|cp|mv|cat|grep|find|echo|export|source)\b/gm,
    color: 46,
    type: 'foreground',
  },
  // Error patterns
  {
    pattern: /(?:error|Error|ERROR|failed|Failed|FAILED)[\s:]/g,
    color: 196,
    type: 'foreground',
  },
  // Success patterns
  {
    pattern: /(?:success|Success|SUCCESS|completed|Completed|done|Done)\s*$/gm,
    color: 40,
    type: 'foreground',
  },
  // Warning patterns
  {
    pattern: /(?:warning|Warning|WARNING|warn|Warn)[\s:]/g,
    color: 226,
    type: 'foreground',
  },
  // Numbers
  {
    pattern: /\b(\d+(?:\.\d+)?)\b/g,
    color: 215,
    type: 'foreground',
  },
  // Quoted strings
  {
    pattern: /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g,
    color: 186,
    type: 'foreground',
  },
];

/**
 * HighlightAddon - Provides syntax highlighting for terminal output
 *
 * Note: This is a basic implementation that uses ANSI escape codes
 * For more advanced highlighting, consider using a proper parser
 */
export class HighlightAddon implements IDisposable {
  private disposable: IDisposable | null = null;
  private rules: HighlightRule[];
  private theme: HighlightTheme;
  private enabled: boolean = true;

  constructor(options?: {
    rules?: HighlightRule[];
    theme?: Partial<HighlightTheme>;
    enabled?: boolean;
  }) {
    this.rules = options?.rules ?? DEFAULT_RULES;
    this.theme = { ...DEFAULT_DARK_THEME, ...options?.theme };
    this.enabled = options?.enabled ?? true;
  }

  /**
   * Activate the addon
   */
  activate(_terminal: Terminal): void {
    // Note: Full highlighting would require intercepting the data stream
    // and parsing ANSI sequences. This is a simplified implementation.
    // For production use, consider using xterm-addon-webgl with custom shaders
    // or implementing a proper ANSI parser.
  }

  /**
   * Dispose the addon
   */
  dispose(): void {
    if (this.disposable) {
      this.disposable.dispose();
      this.disposable = null;
    }
  }

  /**
   * Enable or disable highlighting
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if highlighting is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Update highlight rules
   */
  setRules(rules: HighlightRule[]): void {
    this.rules = rules;
  }

  /**
   * Get current highlight rules
   */
  getRules(): HighlightRule[] {
    return [...this.rules];
  }

  /**
   * Update highlight theme
   */
  setTheme(theme: Partial<HighlightTheme>): void {
    this.theme = { ...this.theme, ...theme };
  }

  /**
   * Set theme based on color scheme
   */
  setColorScheme(scheme: 'dark' | 'light'): void {
    this.theme = scheme === 'dark' ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME;
  }

  /**
   * Highlight text by injecting ANSI color codes
   * This is used for pre-processing text before writing to terminal
   */
  highlight(text: string): string {
    if (!this.enabled) return text;

    let result = text;

    // Sort rules by pattern length to avoid overlapping matches
    const sortedRules = [...this.rules].sort((a, b) => {
      return b.pattern.source.length - a.pattern.source.length;
    });

    // Apply each rule
    for (const rule of sortedRules) {
      result = result.replace(rule.pattern, (match) => {
        const colorCode = typeof rule.color === 'number'
          ? `\x1b[38;5;${rule.color}m`
          : `\x1b[38;2;${this.cssToRgb(rule.color)}m`;

        return `${colorCode}${match}\x1b[0m`;
      });
    }

    return result;
  }

  /**
   * Convert CSS color to RGB string for ANSI
   */
  private cssToRgb(cssColor: string): string {
    // Simple hex color parsing
    const hex = cssColor.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `${r};${g};${b}`;
    }
    return '255;255;255';
  }
}

/**
 * Create a highlight addon instance
 */
export function createHighlightAddon(options?: {
  rules?: HighlightRule[];
  theme?: Partial<HighlightTheme>;
  enabled?: boolean;
}): HighlightAddon {
  return new HighlightAddon(options);
}

export default HighlightAddon;
