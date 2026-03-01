declare module 'monaco-editor' {
  // Import types from editor API
  import type * as MonacoAPI from 'monaco-editor/esm/vs/editor/editor.api';

  // Export everything from the editor API
  export * from 'monaco-editor/esm/vs/editor/editor.api';

  // Re-export as named exports for dynamic import compatibility
  export const editor: typeof MonacoAPI.editor;
  export const KeyMod: typeof MonacoAPI.KeyMod;
  export const KeyCode: typeof MonacoAPI.KeyCode;
  export const languages: typeof MonacoAPI.languages;
  export const Uri: typeof MonacoAPI.Uri;
  export const Position: typeof MonacoAPI.Position;
  export const Range: typeof MonacoAPI.Range;
  export const Selection: typeof MonacoAPI.Selection;

  export { Environment } from 'monaco-editor/esm/vs/base/common/worker/simpleWorker';
}
