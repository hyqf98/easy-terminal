import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { CanvasController, PtyOutputEvent, SuggestionItem, TerminalLaunchOptions } from './types';
import { CommandSuggest } from './command-suggest';
import { resolvePreviewPath } from './command-intercept';
import { openFilePreview } from './file-preview';
import type { ShortcutManager } from './shortcut-manager';

const DARK_THEME = {
  background: '#1e1e2e',
  foreground: '#cdd6f4',
  cursor: '#f5e0dc',
  selectionBackground: '#45475a',
  black: '#45475a',
  red: '#f38ba8',
  green: '#a6e3a1',
  yellow: '#f9e2af',
  blue: '#89b4fa',
  magenta: '#f5c2e7',
  cyan: '#94e2d5',
  white: '#bac2de',
  brightBlack: '#585b70',
  brightRed: '#f38ba8',
  brightGreen: '#a6e3a1',
  brightYellow: '#f9e2af',
  brightBlue: '#89b4fa',
  brightMagenta: '#f5c2e7',
  brightCyan: '#94e2d5',
  brightWhite: '#a6adc8',
};

const LIGHT_THEME = {
  background: '#eff1f5',
  foreground: '#4c4f69',
  cursor: '#dc8a78',
  selectionBackground: '#bcc0cc',
  black: '#bcc0cc',
  red: '#d20f39',
  green: '#40a02b',
  yellow: '#df8e1d',
  blue: '#1e66f5',
  magenta: '#ea76cb',
  cyan: '#179299',
  white: '#5c5f77',
  brightBlack: '#7c7f93',
  brightRed: '#d20f39',
  brightGreen: '#40a02b',
  brightYellow: '#df8e1d',
  brightBlue: '#1e66f5',
  brightMagenta: '#ea76cb',
  brightCyan: '#179299',
  brightWhite: '#4c4f69',
};

export class TerminalWindow {
  private id = '';
  private container: HTMLDivElement;
  private term: Terminal;
  private fitAddon: FitAddon;
  private unlisten: UnlistenFn | null = null;
  private canvasController: CanvasController;
  private commandSuggest: CommandSuggest;
  private currentLine = '';
  private cursorPos = 0;
  private selectionAnchor: number | null = null;
  private selectionOverlay: HTMLDivElement | null = null;
  private terminalContextMenu: HTMLDivElement | null = null;

  // Drag state
  private isDragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private boundDragMove: (e: MouseEvent) => void;
  private boundDragEnd: () => void;

  // Resize state
  private isResizing = false;
  private resizeDirection = '';
  private resizeStartX = 0;
  private resizeStartY = 0;
  private resizeStartW = 0;
  private resizeStartH = 0;
  private resizeStartLeft = 0;
  private resizeStartTop = 0;
  private boundResizeMove: (e: MouseEvent) => void;
  private boundResizeEnd: () => void;

  // Minimize/Maximize state
  private isMinimized = false;
  private isMaximized = false;
  private savedRect: { x: number; y: number; w: number; h: number } | null = null;

  // Focus & CWD state
  private cwdPath = '';
  private ghostOverlay: HTMLSpanElement | null = null;
  private ghostText = '';
  private launchOptions: TerminalLaunchOptions = { mode: 'local' };

  public onActivate: ((id: string) => void) | null = null;
  public onCommandExecuted: ((command: string, cwd: string) => void | Promise<void>) | null = null;
  public onCwdChange: ((cwd: string) => void) | null = null;
  public onAddMappingFromSelection: ((text: string) => void) | null = null;

  constructor(
    parentEl: HTMLElement,
    private x: number,
    private y: number,
    private width: number,
    private height: number,
    canvasController: CanvasController,
    commandSuggest: CommandSuggest,
    private shortcutManager?: ShortcutManager
  ) {
    this.canvasController = canvasController;
    this.commandSuggest = commandSuggest;
    this.container = this.buildDOM(parentEl);
    const baseFontSize = this.calcFontSize(this.width, this.height);
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    this.term = new Terminal({
      theme: isLight ? LIGHT_THEME : DARK_THEME,
      fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace',
      fontSize: baseFontSize,
      fontWeight: '400',
      fontWeightBold: '600',
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'bar',
      allowTransparency: true,
    });
    this.fitAddon = new FitAddon();
    this.term.loadAddon(this.fitAddon);
    this.term.loadAddon(new WebLinksAddon());

    const body = this.container.querySelector('.terminal-body') as HTMLDivElement;
    this.term.open(body);

    this.boundDragMove = this.onDragMove.bind(this);
    this.boundDragEnd = this.onDragEnd.bind(this);
    this.boundResizeMove = this.onResizeMove.bind(this);
    this.boundResizeEnd = this.onResizeEnd.bind(this);

    this.bindWindowControls();
    this.bindDrag();
    this.bindResize();
    this.bindTitleRename();
    this.bindActivation();
    this.bindSelectionContextMenu();
  }

  async initPty(options: TerminalLaunchOptions = {}) {
    this.launchOptions = { mode: 'local', ...options };
    this.fitAddon.fit();
    const cols = this.term.cols;
    const rows = this.term.rows;

    const nameEl = this.container.querySelector('.terminal-name') as HTMLSpanElement;

    let sessionId = '';
    this.unlisten = await listen<PtyOutputEvent>('pty-output', (event) => {
      if (event.payload.session_id === sessionId) {
        const data = event.payload.data;
        this.extractTitleFromOsc(data);
        this.term.write(data);
      }
    });

    sessionId = await invoke<string>('create_pty', { cols, rows, cwd: this.launchOptions.cwd || null });
    this.id = sessionId;

    // Save initial cwd if provided
    if (this.launchOptions.cwd) {
      this.cwdPath = this.launchOptions.cwd;
    }

    nameEl.textContent = this.launchOptions.profileName || '未命名';

    // Track current line for command suggestions
    this.currentLine = '';
    this.cursorPos = 0;
    this.clearLineSelection();

    this.term.onData(async (data) => {
      try {
        const handled = await this.handleTerminalInput(data);
        if (!handled) {
          await invoke('write_pty', { sessionId: this.id, data });
        }
      } catch (e) {
        console.error('write_pty error:', e);
      }
    });

    this.term.onTitleChange((title: string) => {
      // Only save cwd path — don't overwrite user's custom title
      this.cwdPath = title.trim();
      this.onCwdChange?.(this.cwdPath);
    });

    // Bind command suggestion to this terminal
    this.bindCommandSuggest();

    if (this.launchOptions.startupCommand) {
      this.cwdPath = this.launchOptions.profileName || this.cwdPath;
      setTimeout(() => {
        invoke('write_pty', {
          sessionId: this.id,
          data: `${this.launchOptions.startupCommand}\r`,
        }).catch(console.error);
      }, 80);
    }
  }

  /** Track what the user is typing to drive suggestions */
  private async handleTerminalInput(data: string): Promise<boolean> {
    if (data === '\r') {
      const rawLine = this.currentLine;
      const trimmed = rawLine.trim();
      this.currentLine = '';
      this.cursorPos = 0;
      this.clearLineSelection();
      this.commandSuggest.hide();
      this.hideGhostText();

      if (!trimmed) {
        return false;
      }

      const resolution = this.commandSuggest.resolveExecution(rawLine);
      await this.onCommandExecuted?.(resolution.command, this.cwdPath);

      if (await this.tryOpenPreview(resolution.command)) {
        return true;
      }

      if (resolution.source === 'mapping' && resolution.command !== trimmed) {
        const erase = '\b \b'.repeat(rawLine.length);
        await invoke('write_pty', {
          sessionId: this.id,
          data: `${erase}${resolution.command}\r`,
        });
        return true;
      }
      return false;
    }

    if (this.hasLineSelection() && (this.isPrintableInput(data) || data === '\x7f' || data === '\b')) {
      if (data === '\x7f' || data === '\b') {
        await this.replaceLineSelection('');
      } else {
        await this.replaceLineSelection(data);
      }
      this.refreshSuggestions();
      return true;
    }

    if (data === '\x7f' || data === '\b') {
      // Backspace
      if (this.cursorPos > 0) {
        this.currentLine = `${this.currentLine.slice(0, this.cursorPos - 1)}${this.currentLine.slice(this.cursorPos)}`;
        this.cursorPos -= 1;
      }
    } else if (data === '\x03') {
      // Ctrl+C
      this.currentLine = '';
      this.cursorPos = 0;
      this.clearLineSelection();
    } else if (data === '\x15') {
      // Ctrl+U - clear line
      this.currentLine = '';
      this.cursorPos = 0;
      this.clearLineSelection();
    } else if (this.isPrintableInput(data)) {
      this.currentLine = `${this.currentLine.slice(0, this.cursorPos)}${data}${this.currentLine.slice(this.cursorPos)}`;
      this.cursorPos += data.length;
    } else if (data === '\t') {
      // Tab - handled by suggestion selector
      return false;
    }

    this.refreshSuggestions();
    return false;
  }

  private isPrintableInput(data: string): boolean {
    return data.length > 0 && !/[\x00-\x1f\x7f]/.test(data);
  }

  private async tryOpenPreview(commandLine: string): Promise<boolean> {
    if (this.launchOptions.mode === 'ssh') return false;
    const path = resolvePreviewPath(commandLine, this.cwdPath);
    if (!path) return false;
    return openFilePreview(path, commandLine);
  }

  private refreshSuggestions() {
    if (this.currentLine.trim()) {
      const hasSuggestions = this.commandSuggest.update(this.currentLine);
      if (hasSuggestions) {
        this.positionSuggestPopup();
      }
      this.updateGhostText();
      return;
    }
    this.commandSuggest.hide();
    this.hideGhostText();
  }

  private updateGhostText() {
    const ghost = this.commandSuggest.getGhostSuggestion(this.currentLine);
    if (!ghost || !ghost.text.trim()) {
      this.hideGhostText();
      return;
    }
    this.showGhostText(ghost.text);
  }

  private showGhostText(text: string) {
    this.ghostText = text;
    const terminalBody = this.container.querySelector('.terminal-body') as HTMLElement;
    if (!terminalBody) return;

    if (!this.ghostOverlay) {
      this.ghostOverlay = document.createElement('span');
      this.ghostOverlay.className = 'ghost-text-overlay';
      terminalBody.appendChild(this.ghostOverlay);
    }

    // Position at cursor location
    const buffer = this.term.buffer.active;
    const cursorX = buffer.cursorX;
    const cursorY = buffer.cursorY;
    const rowHeight = terminalBody.clientHeight / this.term.rows;
    const colWidth = terminalBody.clientWidth / this.term.cols;
    const pixelX = cursorX * colWidth;
    const pixelY = cursorY * rowHeight;

    this.ghostOverlay.textContent = text;
    this.ghostOverlay.style.left = `${pixelX}px`;
    this.ghostOverlay.style.top = `${pixelY}px`;
    this.ghostOverlay.style.fontSize = `${this.term.options.fontSize}px`;
    this.ghostOverlay.style.lineHeight = `${(this.term.options.fontSize || 14) * 1.2}px`;
    this.ghostOverlay.style.display = 'block';
  }

  private hideGhostText() {
    this.ghostText = '';
    if (this.ghostOverlay) {
      this.ghostOverlay.style.display = 'none';
    }
  }

  private acceptGhostText() {
    if (!this.ghostText) return;
    // Send ghost text to PTY
    invoke('write_pty', { sessionId: this.id, data: this.ghostText }).catch(console.error);
    this.currentLine += this.ghostText;
    this.refreshSuggestions();
  }

  private bindCommandSuggest() {
    // When user selects a command from suggestions
    this.commandSuggest.onSelect = (item: SuggestionItem) => {
      const replacement = item.type === 'mapping' ? item.executeText : item.insertText;
      const partial = this.currentLine.trimStart().split(/\s/)[0];
      const erase = partial ? '\b \b'.repeat(partial.length) : '';
      invoke('write_pty', { sessionId: this.id, data: `${erase}${replacement}` }).catch(console.error);
      const leadingSpaces = this.currentLine.match(/^\s*/)?.[0] || '';
      this.currentLine = `${leadingSpaces}${replacement}`;
      this.cursorPos = this.currentLine.length;
      this.clearLineSelection();
      this.refreshSuggestions();
      this.hideGhostText();
    };

    this.container.addEventListener('keydown', (e: KeyboardEvent) => {
      if (this.handleLineEditingShortcut(e)) {
        return;
      }

      // Tab - accept ghost text if no suggestion popup visible
      if (e.key === 'Tab' && this.ghostText && !this.commandSuggest.isVisible()) {
        e.preventDefault();
        e.stopPropagation();
        this.acceptGhostText();
        return;
      }

      if (this.commandSuggest.isVisible()) {
        const handled = this.commandSuggest.handleKey(e);
        if (handled) {
          e.stopPropagation();
        }
      }
    }, true); // capture phase to intercept before xterm
  }

  private handleLineEditingShortcut(event: KeyboardEvent): boolean {
    const isPrimaryA = this.shortcutManager
      ? this.shortcutManager.matches('terminal.selectLine', event)
      : ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'a');

    if (isPrimaryA && this.currentLine) {
      event.preventDefault();
      event.stopPropagation();
      this.selectionAnchor = 0;
      this.cursorPos = this.currentLine.length;
      this.updateLineSelectionOverlay();
      return true;
    }

    if (event.shiftKey && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      void this.extendSelection(event.key);
      return true;
    }

    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      this.clearLineSelection();
      void this.moveCursorByKey(event.key);
      return true;
    }

    return false;
  }

  private positionSuggestPopup() {
    const terminalBody = this.container.querySelector('.terminal-body') as HTMLElement;
    if (!terminalBody) return;

    // Use xterm buffer cursor position for accurate placement
    const buffer = this.term.buffer.active;
    const cursorX = buffer.cursorX;
    const cursorY = buffer.cursorY;

    // Calculate pixel position from character grid
    const rowHeight = terminalBody.clientHeight / this.term.rows;
    const colWidth = terminalBody.clientWidth / this.term.cols;
    const pixelX = cursorX * colWidth;
    const pixelY = (cursorY + 1.35) * rowHeight;

    this.commandSuggest.positionAt(terminalBody, pixelX, pixelY);
  }

  private hasLineSelection(): boolean {
    return this.selectionAnchor !== null && this.selectionAnchor !== this.cursorPos;
  }

  private getLineSelectionRange(): { start: number; end: number } | null {
    if (this.selectionAnchor === null || this.selectionAnchor === this.cursorPos) return null;
    return {
      start: Math.min(this.selectionAnchor, this.cursorPos),
      end: Math.max(this.selectionAnchor, this.cursorPos),
    };
  }

  private clearLineSelection() {
    this.selectionAnchor = null;
    if (this.selectionOverlay) {
      this.selectionOverlay.style.display = 'none';
    }
  }

  private async moveCursorByKey(key: string) {
    let next = this.cursorPos;
    if (key === 'ArrowLeft') next = Math.max(0, this.cursorPos - 1);
    if (key === 'ArrowRight') next = Math.min(this.currentLine.length, this.cursorPos + 1);
    if (key === 'Home') next = 0;
    if (key === 'End') next = this.currentLine.length;
    await this.moveCursorTo(next);
  }

  private async extendSelection(key: string) {
    if (!this.currentLine) return;
    if (this.selectionAnchor === null) {
      this.selectionAnchor = this.cursorPos;
    }
    await this.moveCursorByKey(key);
    this.updateLineSelectionOverlay();
  }

  private async moveCursorTo(target: number) {
    const next = Math.max(0, Math.min(target, this.currentLine.length));
    const delta = next - this.cursorPos;
    if (delta === 0) {
      this.updateLineSelectionOverlay();
      return;
    }
    if (delta > 0) {
      await invoke('write_pty', { sessionId: this.id, data: '\x1b[C'.repeat(delta) });
    } else {
      await invoke('write_pty', { sessionId: this.id, data: '\x1b[D'.repeat(Math.abs(delta)) });
    }
    this.cursorPos = next;
    this.updateLineSelectionOverlay();
  }

  private async replaceLineSelection(text: string) {
    const range = this.getLineSelectionRange();
    if (!range) return;

    await this.moveCursorTo(range.start);
    if (range.end > range.start) {
      await invoke('write_pty', { sessionId: this.id, data: '\x1b[3~'.repeat(range.end - range.start) });
    }

    this.currentLine = `${this.currentLine.slice(0, range.start)}${this.currentLine.slice(range.end)}`;
    this.cursorPos = range.start;
    this.clearLineSelection();

    if (text) {
      await invoke('write_pty', { sessionId: this.id, data: text });
      this.currentLine = `${this.currentLine.slice(0, this.cursorPos)}${text}${this.currentLine.slice(this.cursorPos)}`;
      this.cursorPos += text.length;
    }
    this.updateLineSelectionOverlay();
  }

  private updateLineSelectionOverlay() {
    const range = this.getLineSelectionRange();
    const terminalBody = this.container.querySelector('.terminal-body') as HTMLElement | null;
    if (!range || !terminalBody || !this.currentLine) {
      if (this.selectionOverlay) this.selectionOverlay.style.display = 'none';
      return;
    }

    if (!this.selectionOverlay) {
      this.selectionOverlay = document.createElement('div');
      this.selectionOverlay.className = 'line-selection-overlay';
      terminalBody.appendChild(this.selectionOverlay);
    }

    const buffer = this.term.buffer.active;
    const rowHeight = terminalBody.clientHeight / this.term.rows;
    const colWidth = terminalBody.clientWidth / this.term.cols;
    const promptStartX = Math.max(0, buffer.cursorX - this.cursorPos);
    const left = (promptStartX + range.start) * colWidth;
    const width = Math.max(colWidth * (range.end - range.start), 2);
    const top = buffer.cursorY * rowHeight;

    this.selectionOverlay.style.left = `${left}px`;
    this.selectionOverlay.style.top = `${top}px`;
    this.selectionOverlay.style.width = `${width}px`;
    this.selectionOverlay.style.height = `${Math.max(rowHeight, 18)}px`;
    this.selectionOverlay.style.display = 'block';
  }

  private extractTitleFromOsc(data: string) {
    const oscRegex = /\x1b\](0|2);([^\x07\x1b]*)(?:\x07|\x1b\\)/g;
    let match;
    let lastTitle = '';
    while ((match = oscRegex.exec(data)) !== null) {
      lastTitle = match[2];
    }
    if (lastTitle) {
      // Save raw cwd path (don't update title bar — user can rename)
      this.cwdPath = lastTitle.trim();
      this.onCwdChange?.(this.cwdPath);
    }
  }

  private buildDOM(parent: HTMLElement): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'terminal-window';
    el.style.left = `${this.x}px`;
    el.style.top = `${this.y}px`;
    el.style.width = `${this.width}px`;
    el.style.height = `${this.height}px`;
    el.innerHTML = `
      <div class="title-bar">
        <div class="title-spacer"></div>
        <span class="terminal-name">未命名</span>
        <div class="window-controls">
          <button class="btn-minimize" title="Minimize"></button>
          <button class="btn-maximize" title="Maximize"></button>
          <button class="btn-close" title="Close"></button>
        </div>
      </div>
      <div class="terminal-body"></div>
      <div class="resize-handle resize-n"></div>
      <div class="resize-handle resize-s"></div>
      <div class="resize-handle resize-e"></div>
      <div class="resize-handle resize-w"></div>
      <div class="resize-handle resize-ne"></div>
      <div class="resize-handle resize-nw"></div>
      <div class="resize-handle resize-se"></div>
      <div class="resize-handle resize-sw"></div>
    `;
    parent.appendChild(el);
    return el;
  }

  private bindSelectionContextMenu() {
    const terminalBody = this.container.querySelector('.terminal-body') as HTMLDivElement;
    document.addEventListener('click', (event) => {
      if (!(event.target as HTMLElement).closest('.terminal-selection-menu')) {
        this.closeTerminalContextMenu();
      }
    });

    terminalBody.addEventListener('contextmenu', (event) => {
      const selected = this.term.getSelection().trim();
      if (!selected) return;
      event.preventDefault();
      event.stopPropagation();
      this.showTerminalContextMenu(event.clientX, event.clientY, selected);
    });
  }

  private showTerminalContextMenu(x: number, y: number, selected: string) {
    this.closeTerminalContextMenu();
    const menu = document.createElement('div');
    menu.className = 'context-menu terminal-selection-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.innerHTML = `
      <div class="context-menu-item" data-terminal-copy>复制文本</div>
      <div class="context-menu-item" data-terminal-map>添加为命令映射</div>
    `;

    menu.querySelector('[data-terminal-copy]')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(selected);
      } catch (error) {
        console.error('clipboard write failed', error);
      }
      this.closeTerminalContextMenu();
    });

    menu.querySelector('[data-terminal-map]')?.addEventListener('click', () => {
      this.onAddMappingFromSelection?.(selected);
      this.closeTerminalContextMenu();
    });

    document.body.appendChild(menu);
    this.terminalContextMenu = menu;
  }

  private closeTerminalContextMenu() {
    if (!this.terminalContextMenu) return;
    this.terminalContextMenu.remove();
    this.terminalContextMenu = null;
  }

  private bindActivation() {
    this.container.addEventListener('mousedown', () => {
      if (!this.id) return;
      this.onActivate?.(this.id);
    });
  }

  private bindWindowControls() {
    this.container.querySelector('.btn-close')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });
    this.container.querySelector('.btn-minimize')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMinimize();
    });
    this.container.querySelector('.btn-maximize')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMaximize();
    });
  }

  private bindDrag() {
    const titleBar = this.container.querySelector('.title-bar') as HTMLDivElement;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStarted = false;

    titleBar.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).closest('.window-controls')) return;
      if (this.isMaximized) return;
      if (e.button !== 0) return; // left button only
      if (this.id) {
        this.onActivate?.(this.id);
      }
      // Record start position but don't start dragging yet
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragStarted = false;
      const { zoom, panX, panY } = this.canvasController.getState();
      const viewportRect = this.container.closest('#app-viewport')!.getBoundingClientRect();
      const containerLeft = parseFloat(this.container.style.left) || 0;
      const containerTop = parseFloat(this.container.style.top) || 0;
      this.dragOffsetX = e.clientX - (viewportRect.left + panX + containerLeft * zoom);
      this.dragOffsetY = e.clientY - (viewportRect.top + panY + containerTop * zoom);
      window.addEventListener('mousemove', this.boundDragMove);
      window.addEventListener('mouseup', this.boundDragEnd);
    });

    // Override drag move to require minimum movement threshold
    const origDragMove = this.boundDragMove;
    this.boundDragMove = (e: MouseEvent) => {
      if (!dragStarted) {
        const dx = Math.abs(e.clientX - dragStartX);
        const dy = Math.abs(e.clientY - dragStartY);
        if (dx < 4 && dy < 4) return; // Not enough movement yet
        dragStarted = true;
        this.isDragging = true;
        this.container.classList.add('dragging');
      }
      origDragMove.call(this, e);
    };

    const origDragEnd = this.boundDragEnd;
    this.boundDragEnd = () => {
      this.isDragging = false;
      dragStarted = false;
      this.container.classList.remove('dragging');
      this.canvasController.clearGuides();
      window.removeEventListener('mousemove', this.boundDragMove);
      window.removeEventListener('mouseup', this.boundDragEnd);
      origDragEnd.call(this);
    };
  }

  private onDragMove(e: MouseEvent) {
    if (!this.isDragging) return;
    const { zoom, panX, panY } = this.canvasController.getState();
    const viewportRect = this.container.closest('#app-viewport')!.getBoundingClientRect();
    const canvasX = (e.clientX - this.dragOffsetX - viewportRect.left - panX) / zoom;
    const canvasY = (e.clientY - this.dragOffsetY - viewportRect.top - panY) / zoom;
    const snapped = this.canvasController.snapRect({
      x: canvasX,
      y: canvasY,
      w: this.container.offsetWidth,
      h: this.container.offsetHeight,
    }, {
      sourceId: this.id,
      mode: 'drag',
    });
    this.container.style.left = `${snapped.x}px`;
    this.container.style.top = `${snapped.y}px`;
  }

  private onDragEnd() {
    this.isDragging = false;
    this.container.classList.remove('dragging');
    this.canvasController.clearGuides();
    window.removeEventListener('mousemove', this.boundDragMove);
    window.removeEventListener('mouseup', this.boundDragEnd);
  }

  private bindResize() {
    const handles = this.container.querySelectorAll<HTMLElement>('.resize-handle');
    handles.forEach((handle) => {
      handle.addEventListener('mousedown', (e: MouseEvent) => {
        if (this.isMaximized) return;
        e.preventDefault();
        e.stopPropagation();
        if (this.id) {
          this.onActivate?.(this.id);
        }
        const dir = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].find((d) =>
          handle.classList.contains(`resize-${d}`)
        ) || '';
        this.isResizing = true;
        this.resizeDirection = dir;
        this.resizeStartX = e.clientX;
        this.resizeStartY = e.clientY;
        this.resizeStartW = this.container.offsetWidth;
        this.resizeStartH = this.container.offsetHeight;
        this.resizeStartLeft = parseFloat(this.container.style.left) || 0;
        this.resizeStartTop = parseFloat(this.container.style.top) || 0;
        window.addEventListener('mousemove', this.boundResizeMove);
        window.addEventListener('mouseup', this.boundResizeEnd);
      });
    });
  }

  private bindTitleRename() {
    const titleBar = this.container.querySelector('.title-bar') as HTMLDivElement;
    titleBar.addEventListener('dblclick', (e) => {
      if ((e.target as HTMLElement).closest('.window-controls')) return;
      e.stopPropagation();
      e.preventDefault();
      const nameEl = this.container.querySelector('.terminal-name') as HTMLSpanElement;
      if (nameEl) {
        this.startTitleRename(nameEl);
      }
    });
  }

  private startTitleRename(nameEl: HTMLSpanElement) {
    const current = nameEl.textContent || '';
    const input = document.createElement('input');
    input.className = 'title-rename-input';
    input.value = current;
    input.style.cssText = `
      background: var(--bg-surface0);
      border: 1px solid var(--accent);
      color: var(--text);
      font-size: 12px;
      font-weight: 500;
      padding: 1px 6px;
      border-radius: 4px;
      outline: none;
      width: ${Math.max(100, nameEl.offsetWidth + 20)}px;
      font-family: inherit;
    `;
    nameEl.replaceWith(input);
    input.focus();
    input.select();

    const finish = () => {
      const newName = input.value.trim();
      const span = document.createElement('span');
      span.className = 'terminal-name';
      span.textContent = newName || current;
      input.replaceWith(span);
      // Re-bind rename on new element
      span.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        this.startTitleRename(span);
      });
    };

    input.addEventListener('blur', finish);
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { input.value = current; input.blur(); }
    });
  }

  private onResizeMove(e: MouseEvent) {
    if (!this.isResizing) return;
    const { zoom } = this.canvasController.getState();
    const dx = (e.clientX - this.resizeStartX) / zoom;
    const dy = (e.clientY - this.resizeStartY) / zoom;
    const dir = this.resizeDirection;

    let newLeft = this.resizeStartLeft;
    let newTop = this.resizeStartTop;
    let newW = this.resizeStartW;
    let newH = this.resizeStartH;

    if (dir.includes('e')) newW = Math.max(200, this.resizeStartW + dx);
    if (dir.includes('s')) newH = Math.max(100, this.resizeStartH + dy);
    if (dir.includes('w')) {
      const proposedW = this.resizeStartW - dx;
      if (proposedW >= 200) {
        newW = proposedW;
        newLeft = this.resizeStartLeft + dx;
      }
    }
    if (dir.includes('n')) {
      const proposedH = this.resizeStartH - dy;
      if (proposedH >= 100) {
        newH = proposedH;
        newTop = this.resizeStartTop + dy;
      }
    }

    const snapped = this.canvasController.snapRect({
      x: newLeft,
      y: newTop,
      w: newW,
      h: newH,
    }, {
      sourceId: this.id,
      mode: 'resize',
      direction: dir,
    });

    this.container.style.left = `${snapped.x}px`;
    this.container.style.top = `${snapped.y}px`;
    this.container.style.width = `${snapped.w}px`;
    this.container.style.height = `${snapped.h}px`;
  }

  private onResizeEnd() {
    if (!this.isResizing) return;
    this.isResizing = false;
    window.removeEventListener('mousemove', this.boundResizeMove);
    window.removeEventListener('mouseup', this.boundResizeEnd);
    this.canvasController.clearGuides();
    this.updateFontSizeAndFit();
    // Reposition suggestion popup if visible
    if (this.commandSuggest.isVisible()) {
      this.positionSuggestPopup();
    }
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    this.container.classList.toggle('minimized', this.isMinimized);
    if (!this.isMinimized) {
      setTimeout(() => {
        this.fitAddon.fit();
      }, 50);
    }
  }

  toggleMaximize() {
    if (this.isMaximized) {
      if (this.savedRect) {
        this.container.style.left = `${this.savedRect.x}px`;
        this.container.style.top = `${this.savedRect.y}px`;
        this.container.style.width = `${this.savedRect.w}px`;
        this.container.style.height = `${this.savedRect.h}px`;
      }
      this.isMaximized = false;
    } else {
      this.savedRect = {
        x: parseFloat(this.container.style.left) || 0,
        y: parseFloat(this.container.style.top) || 0,
        w: this.container.offsetWidth,
        h: this.container.offsetHeight,
      };
      const viewport = this.container.closest('#app-viewport')!;
      const { zoom, panX, panY } = this.canvasController.getState();
      this.container.style.left = `${-panX / zoom}px`;
      this.container.style.top = `${-panY / zoom}px`;
      this.container.style.width = `${viewport.clientWidth / zoom}px`;
      this.container.style.height = `${viewport.clientHeight / zoom}px`;
      this.isMaximized = true;
    }
    setTimeout(() => {
      this.updateFontSizeAndFit();
    }, 50);
  }

  async close() {
    this.commandSuggest.hide();
    this.closeTerminalContextMenu();
    if (this.id) {
      try {
        await invoke('kill_pty', { sessionId: this.id });
      } catch {
        // Ignore
      }
    }
    this.unlisten?.();
    window.removeEventListener('mousemove', this.boundDragMove);
    window.removeEventListener('mouseup', this.boundDragEnd);
    window.removeEventListener('mousemove', this.boundResizeMove);
    window.removeEventListener('mouseup', this.boundResizeEnd);
    this.container.style.transition = 'opacity 0.15s, transform 0.15s';
    this.container.style.opacity = '0';
    this.container.style.transform = 'scale(0.95)';
    setTimeout(() => {
      this.container.remove();
      this.term.dispose();
    }, 150);
  }

  getId(): string {
    return this.id;
  }

  focus() {
    this.term.focus();
    this.container.classList.add('focused');
    this.container.classList.remove('focus-pulse');
    void this.container.offsetWidth;
    this.container.classList.add('focus-pulse');
  }

  blur() {
    this.container.classList.remove('focused');
  }

  getCwd(): string {
    return this.cwdPath;
  }

  getTitle(): string {
    const nameEl = this.container.querySelector('.terminal-name') as HTMLSpanElement;
    return nameEl?.textContent || '';
  }

  getRect(): { x: number; y: number; w: number; h: number } {
    return {
      x: parseFloat(this.container.style.left) || 0,
      y: parseFloat(this.container.style.top) || 0,
      w: this.container.offsetWidth,
      h: this.container.offsetHeight,
    };
  }

  getLaunchOptions(): TerminalLaunchOptions {
    if (this.launchOptions.mode === 'ssh') {
      return { ...this.launchOptions };
    }
    return {
      ...this.launchOptions,
      cwd: this.cwdPath || this.launchOptions.cwd,
    };
  }

  setTheme(theme: string) {
    this.term.options.theme = theme === 'light' ? LIGHT_THEME : DARK_THEME;
  }

  setZIndex(zIndex: number) {
    this.container.style.zIndex = String(zIndex);
  }

  async sendText(text: string) {
    if (!this.id || !text) return;
    await invoke('write_pty', { sessionId: this.id, data: text });
    this.focus();
  }

  private calcFontSize(w: number, h: number): number {
    const area = w * h;
    const refArea = 700 * 450;
    const scale = Math.sqrt(area / refArea);
    return Math.max(8, Math.min(26, Math.round(14 * scale)));
  }

  private updateFontSizeAndFit() {
    const w = this.container.offsetWidth;
    const h = this.container.offsetHeight;
    const newSize = this.calcFontSize(w, h);
    if (newSize !== this.term.options.fontSize) {
      this.term.options.fontSize = newSize;
    }
    this.fitAddon.fit();
    if (this.id) {
      invoke('resize_pty', {
        sessionId: this.id,
        cols: this.term.cols,
        rows: this.term.rows,
      }).catch(console.error);
    }
  }
}
