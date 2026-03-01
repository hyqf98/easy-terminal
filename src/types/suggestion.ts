/**
 * Suggestion types for auto-completion
 */

/** Suggestion type */
export type SuggestionType = 'command' | 'path' | 'file' | 'directory' | 'argument' | 'option' | 'history';

/** Source of suggestion */
export type SuggestionSource = 'history' | 'builtin' | 'path' | 'ai';

/** Single suggestion item */
export interface SuggestionItem {
  /** Unique ID */
  id: string;
  /** Display text */
  label: string;
  /** Text to insert */
  insertText: string;
  /** Type of suggestion */
  type: SuggestionType;
  /** Optional description */
  description?: string;
  /** Optional detail (e.g., file path) */
  detail?: string;
  /** Optional icon name */
  icon?: string;
  /** Priority (higher = better match) */
  priority?: number;
  /** Source of the suggestion */
  source?: SuggestionSource;
}

/** Completion context */
export interface CompletionContext {
  /** Current input text */
  input: string;
  /** Cursor position in input */
  cursorPosition: number;
  /** Current working directory */
  cwd?: string;
  /** Session ID */
  sessionId?: string;
  /** Shell type */
  shell?: string;
}

/** Completion result */
export interface CompletionResult {
  /** Suggestion items */
  items: SuggestionItem[];
  /** Start position of replacement */
  replaceStart: number;
  /** End position of replacement */
  replaceEnd: number;
  /** Whether completions are from cache */
  fromCache?: boolean;
}

/** Command definition for built-in completions */
export interface CommandDefinition {
  /** Command name */
  name: string;
  /** Command description */
  description?: string;
  /** Available arguments/options */
  arguments?: CommandArgument[];
  /** Aliases */
  aliases?: string[];
}

/** Command argument definition */
export interface CommandArgument {
  /** Argument name */
  name: string;
  /** Whether required */
  required?: boolean;
  /** Description */
  description?: string;
  /** Type of argument */
  type?: 'string' | 'number' | 'path' | 'file' | 'directory' | 'boolean';
  /** Possible values */
  values?: string[];
  /** Whether it supports multiple values */
  multiple?: boolean;
}

/** Smart suggestion context */
export interface SuggestionContext {
  /** Current working directory */
  cwd: string;
  /** Recent commands */
  recentCommands: string[];
  /** Current git branch (if in git repo) */
  gitBranch?: string;
  /** Package.json scripts (if in Node project) */
  npmScripts?: string[];
  /** Docker containers */
  dockerContainers?: string[];
}
