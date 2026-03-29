import { onLangChange, t } from './i18n';
import type { ShortcutBinding } from './types';
import type { ShortcutManager } from './shortcut-manager';

export class ShortcutPanel {
  private container: HTMLDivElement;

  constructor(container: HTMLDivElement, private shortcuts: ShortcutManager) {
    this.container = container;
    this.renderShell();
    this.render();

    this.shortcuts.onChange(() => this.render());
    onLangChange(() => {
      this.renderShell();
      this.render();
    });
  }

  private renderShell() {
    this.container.innerHTML = `
      <div class="panel-header">
        <h2>${shortcutIcon()} ${t('shortcut.title')}</h2>
      </div>
      <div class="panel-body shortcut-panel-body"></div>
    `;
  }

  private get body(): HTMLDivElement {
    return this.container.querySelector('.shortcut-panel-body') as HTMLDivElement;
  }

  private render() {
    const bindings = this.shortcuts.getBindings();
    this.body.innerHTML = `
      <div class="shortcut-summary">${t('shortcut.summary', this.platformLabel())}</div>
      <div class="shortcut-list">
        ${bindings.map((binding) => this.renderItem(binding)).join('')}
      </div>
      <div class="cmd-overlay-actions shortcut-actions">
        <button class="cmd-toolbar-btn primary" id="shortcut-save">${t('cmd.save')}</button>
      </div>
    `;
    this.bindEvents();
  }

  private renderItem(binding: ShortcutBinding): string {
    return `
      <div class="shortcut-item" data-shortcut-id="${escapeHtml(binding.id)}">
        <div class="shortcut-item-head">
          <div class="shortcut-item-title">${escapeHtml(binding.label)}</div>
          <div class="shortcut-item-desc">${escapeHtml(binding.description)}</div>
        </div>
        <div class="shortcut-grid">
          <label class="cmd-field">
            <span>Windows</span>
            <input data-shortcut-field="windows" type="text" value="${escapeHtml(binding.windows)}" placeholder="Ctrl+C">
          </label>
          <label class="cmd-field">
            <span>macOS</span>
            <input data-shortcut-field="darwin" type="text" value="${escapeHtml(binding.darwin)}" placeholder="Cmd+C">
          </label>
          <label class="cmd-field">
            <span>Linux</span>
            <input data-shortcut-field="linux" type="text" value="${escapeHtml(binding.linux)}" placeholder="Ctrl+C">
          </label>
        </div>
      </div>
    `;
  }

  private bindEvents() {
    this.body.querySelector('#shortcut-save')?.addEventListener('click', async () => {
      const next = this.shortcuts.getBindings().map((binding) => {
        const root = this.body.querySelector(`[data-shortcut-id="${CSS.escape(binding.id)}"]`) as HTMLElement | null;
        return {
          ...binding,
          windows: (root?.querySelector('[data-shortcut-field="windows"]') as HTMLInputElement | null)?.value.trim() || '',
          darwin: (root?.querySelector('[data-shortcut-field="darwin"]') as HTMLInputElement | null)?.value.trim() || '',
          linux: (root?.querySelector('[data-shortcut-field="linux"]') as HTMLInputElement | null)?.value.trim() || '',
        };
      });

      await this.shortcuts.saveBindings(next);
    });
  }

  private platformLabel(): string {
    const platform = this.shortcuts.getPlatform();
    if (platform === 'darwin') return 'macOS';
    if (platform === 'linux') return 'Linux';
    return 'Windows';
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function shortcutIcon(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M10 8h10"></path><path d="M4 8h2"></path><path d="M4 16h16"></path><path d="M8 12h8"></path></svg>`;
}
