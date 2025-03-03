/* eslint-disable @typescript-eslint/no-restricted-imports */
import '@shoelace-style/shoelace/dist/components/button-group/button-group.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/color-picker/color-picker.js';
import '@shoelace-style/shoelace/dist/components/divider/divider.js';
import '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/menu-item/menu-item.js';
import '@shoelace-style/shoelace/dist/components/menu/menu.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
import '@shoelace-style/shoelace/dist/components/tab/tab.js';
import '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js';
import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/themes/dark.css';
import './left-side-panel';
import './side-panel';

import {
  BlocksUtils,
  ColorVariables,
  extractCssVariables,
  FontFamilyVariables,
  HtmlTransformer,
  MarkdownTransformer,
  SizeVariables,
  StyleVariables,
  type SurfaceBlockComponent,
  ZipTransformer,
} from '@blocksuite/blocks';
import type { TreeNode } from '@blocksuite/blocks/_common/mind-map/draw';
import type { ContentParser } from '@blocksuite/blocks/content-parser';
import { assertExists } from '@blocksuite/global/utils';
import {
  type BlockElement,
  type EditorHost,
  ShadowlessElement,
} from '@blocksuite/lit';
import type { CopilotPanel } from '@blocksuite/presets';
import { AffineEditorContainer } from '@blocksuite/presets';
import type { BaseBlockModel } from '@blocksuite/store';
import { Utils, type Workspace } from '@blocksuite/store';
import type { SlDropdown } from '@shoelace-style/shoelace';
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';
import { css, html } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import * as lz from 'lz-string';
import type { Pane } from 'tweakpane';

import { extendFormatBar } from './custom-format-bar.js';
import type { CustomFramePanel } from './custom-frame-panel.js';
import type { CustomTOCOutlinePanel } from './custom-toc-outline-panel.js';
import type { LeftSidePanel } from './left-side-panel';
import type { PagesPanel } from './pages-panel';
import type { SidePanel } from './side-panel';

export function getSurfaceElementFromEditor(editor: AffineEditorContainer) {
  const { page } = editor;
  const surfaceModel = page.getBlockByFlavour('affine:surface')[0];
  assertExists(surfaceModel);

  const surfaceId = surfaceModel.id;
  const surfaceElement = editor.querySelector(
    `affine-surface[data-block-id="${surfaceId}"]`
  ) as SurfaceBlockComponent;
  assertExists(surfaceElement);

  return surfaceElement;
}

const cssVariablesMap = extractCssVariables(document.documentElement);
const plate: Record<string, string> = {};
ColorVariables.forEach((key: string) => {
  plate[key] = cssVariablesMap[key];
});
const OTHER_CSS_VARIABLES = StyleVariables.filter(
  variable =>
    !SizeVariables.includes(variable) &&
    !ColorVariables.includes(variable) &&
    !FontFamilyVariables.includes(variable)
);
let styleDebugMenuLoaded = false;

const basePath = import.meta.env.DEV
  ? '/node_modules/@shoelace-style/shoelace/dist'
  : 'https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.11.2/dist';
setBasePath(basePath);

function initStyleDebugMenu(styleMenu: Pane, style: CSSStyleDeclaration) {
  const sizeFolder = styleMenu.addFolder({ title: 'Size', expanded: false });
  const fontFamilyFolder = styleMenu.addFolder({
    title: 'Font Family',
    expanded: false,
  });
  const colorFolder = styleMenu.addFolder({ title: 'Color', expanded: false });
  const othersFolder = styleMenu.addFolder({
    title: 'Others',
    expanded: false,
  });
  SizeVariables.forEach(name => {
    sizeFolder
      .addBinding(
        {
          [name]: isNaN(parseFloat(cssVariablesMap[name]))
            ? 0
            : parseFloat(cssVariablesMap[name]),
        },
        name,
        {
          min: 0,
          max: 100,
        }
      )
      .on('change', e => {
        style.setProperty(name, `${Math.round(e.value)}px`);
      });
  });
  FontFamilyVariables.forEach(name => {
    fontFamilyFolder
      .addBinding(
        {
          [name]: cssVariablesMap[name],
        },
        name
      )
      .on('change', e => {
        style.setProperty(name, e.value);
      });
  });
  OTHER_CSS_VARIABLES.forEach(name => {
    othersFolder
      .addBinding({ [name]: cssVariablesMap[name] }, name)
      .on('change', e => {
        style.setProperty(name, e.value);
      });
  });
  fontFamilyFolder
    .addBinding(
      {
        '--affine-font-family':
          'Roboto Mono, apple-system, BlinkMacSystemFont,Helvetica Neue, Tahoma, PingFang SC, Microsoft Yahei, Arial,Hiragino Sans GB, sans-serif, Apple Color Emoji, Segoe UI Emoji,Segoe UI Symbol, Noto Color Emoji',
      },
      '--affine-font-family'
    )
    .on('change', e => {
      style.setProperty('--affine-font-family', e.value);
    });
  for (const plateKey in plate) {
    colorFolder.addBinding(plate, plateKey).on('change', e => {
      style.setProperty(plateKey, e.value);
    });
  }
}
export function getSelectedBlocks(host: EditorHost) {
  let blocks: BlockElement[] = [];

  host.std.command
    .pipe()
    .getBlockSelections()
    .inline((ctx, next) => {
      const selections = ctx.currentBlockSelections;
      if (!selections) return;

      blocks = selections
        .map(selection => ctx.std.view.viewFromPath('block', selection.path))
        .filter(
          (block): block is BlockElement =>
            block !== null &&
            BlocksUtils.matchFlavours(block.model, [
              'affine:paragraph',
              'affine:list',
              'affine:code',
            ])
        );

      return next();
    })
    .run();

  return blocks;
}

@customElement('debug-menu')
export class DebugMenu extends ShadowlessElement {
  static override styles = css`
    :root {
      --sl-font-size-medium: var(--affine-font-xs);
      --sl-input-font-size-small: var(--affine-font-xs);
    }

    .dg.ac {
      z-index: 1001 !important;
    }
  `;

  @property({ attribute: false })
  workspace!: Workspace;

  @property({ attribute: false })
  editor!: AffineEditorContainer;

  @property({ attribute: false })
  contentParser!: ContentParser;

  @property({ attribute: false })
  navigationPanel!: CustomTOCOutlinePanel;

  @property({ attribute: false })
  framePanel!: CustomFramePanel;

  @property({ attribute: false })
  copilotPanel!: CopilotPanel;

  @property({ attribute: false })
  sidePanel!: SidePanel;
  @property({ attribute: false })
  leftSidePanel!: LeftSidePanel;
  @property({ attribute: false })
  pagesPanel!: PagesPanel;

  @state()
  private _connected = true;

  @state()
  private _canUndo = false;

  @state()
  private _canRedo = false;

  @property({ attribute: false })
  mode: 'page' | 'edgeless' = 'page';

  @property({ attribute: false })
  readonly = false;

  @state()
  private _hasOffset = false;

  @query('#block-type-dropdown')
  blockTypeDropdown!: SlDropdown;

  private _styleMenu!: Pane;
  private _showStyleDebugMenu = false;

  @state()
  private _dark = localStorage.getItem('blocksuite:dark') === 'true';

  get page() {
    return this.editor.page;
  }

  override createRenderRoot() {
    const matchMedia = window.matchMedia('(prefers-color-scheme: dark)');
    this._setThemeMode(this._dark && matchMedia.matches);
    matchMedia.addEventListener('change', this._darkModeChange);

    return this;
  }

  override connectedCallback() {
    super.connectedCallback();

    const readSelectionFromURL = async () => {
      const root = this.editor.root;
      if (!root) {
        await new Promise(resolve => {
          setTimeout(resolve, 500);
        });
        readSelectionFromURL().catch(console.error);
        return;
      }
      const url = new URL(window.location.toString());
      const sel = url.searchParams.get('sel');
      if (!sel) return;
      try {
        const json = JSON.parse(lz.decompressFromEncodedURIComponent(sel));
        root.std.selection.fromJSON(json);
      } catch {
        return;
      }
    };
    readSelectionFromURL().catch(console.error);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();

    const matchMedia = window.matchMedia('(prefers-color-scheme: dark)');
    matchMedia.removeEventListener('change', this._darkModeChange);
  }

  private _toggleConnection() {
    if (this._connected) {
      this.workspace.providers.forEach(provider => {
        if ('passive' in provider && provider.connected) {
          provider.disconnect();
        }
      });
      this._connected = false;
    } else {
      this.workspace.providers.forEach(provider => {
        if ('passive' in provider && !provider.connected) {
          provider.connect();
        }
      });
      this._connected = true;
    }
  }

  private _switchEditorMode() {
    const editor = document.querySelector<AffineEditorContainer>(
      'affine-editor-container'
    );
    if (editor instanceof AffineEditorContainer) {
      const mode = editor.mode === 'page' ? 'edgeless' : 'page';
      editor.mode = mode;
    } else {
      const mode = this.editor.mode === 'page' ? 'edgeless' : 'page';
      this.mode = mode;
    }
  }

  private _toggleNavigationPanel() {
    this.navigationPanel.toggleDisplay();
  }

  private _toggleFramePanel() {
    this.framePanel.toggleDisplay();
  }

  private _toggleCopilotPanel() {
    this.sidePanel.toggle(this.copilotPanel);
  }
  private _togglePagesPanel() {
    this.leftSidePanel.toggle(this.pagesPanel);
  }

  private _createMindMap() {
    function makeid(length: number) {
      let result = '';
      const characters =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      const charactersLength = characters.length;
      let counter = 0;
      while (counter < length) {
        result += characters.charAt(
          Math.floor(Math.random() * charactersLength)
        );
        counter += 1;
      }
      return result;
    }

    const _genTree = (deep: number = 0): TreeNode => {
      const count = Math.floor(Math.random() * 10) - deep - 2;
      const children: TreeNode[] = [];
      for (let i = 0; i < count; i++) {
        children.push(_genTree(deep + 1));
      }
      return {
        text: makeid(Math.random() * 200 + 30),
        children,
      };
    };
    const blocks = getSelectedBlocks(this.editor.root!);
    const toTreeNode = (block: BaseBlockModel): TreeNode => {
      return {
        text: block.text?.toString() ?? '',
        children: block.children.map(toTreeNode),
      };
    };
    const node = {
      text: 'Root',
      children: blocks.map(v => toTreeNode(v.model)),
    };
    // const node: TreeNode = genTree();
    BlocksUtils.mindMap.drawInEdgeless(
      getSurfaceElementFromEditor(this.editor),
      node
    );
  }

  private _switchOffsetMode() {
    this._hasOffset = !this._hasOffset;
  }

  private _addNote() {
    const root = this.page.root;
    if (!root) return;
    const pageId = root.id;

    this.page.captureSync();

    const count = root.children.length;
    const xywh = `[0,${count * 60},800,95]`;

    const noteId = this.page.addBlock('affine:note', { xywh }, pageId);
    this.page.addBlock('affine:paragraph', {}, noteId);
  }

  private _exportPdf() {
    this.contentParser.exportPdf().catch(console.error);
  }

  private _exportHtml() {
    HtmlTransformer.exportPage(this.page).catch(console.error);
  }

  private async _exportMarkDown() {
    MarkdownTransformer.exportPage(this.page).catch(console.error);
  }

  private _exportPng() {
    this.contentParser.exportPng().catch(console.error);
  }

  private async _exportSnapshot() {
    const file = await ZipTransformer.exportPages(this.workspace, [
      ...this.workspace.pages.values(),
    ]);
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `${this.page.id}.bs.zip`);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  private _importSnapshot() {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', '.zip');
    input.multiple = false;
    input.onchange = async () => {
      const file = input.files?.item(0);
      if (!file) {
        return;
      }
      try {
        await ZipTransformer.importPages(this.workspace, file);
        this.requestUpdate();
      } catch (e) {
        console.error('Invalid snapshot.');
        console.error(e);
      } finally {
        input.remove();
      }
    };
    input.click();
  }

  private _shareUrl() {
    const base64 = Utils.encodeWorkspaceAsYjsUpdateV2(this.workspace);
    const url = new URL(window.location.toString());
    url.searchParams.set('init', base64);
    window.history.pushState({}, '', url);
  }

  private async _toggleStyleDebugMenu() {
    if (!styleDebugMenuLoaded) {
      styleDebugMenuLoaded = true;
      const { Pane } = await import('tweakpane');
      this._styleMenu = new Pane({ title: 'Waiting' });
      this._styleMenu.hidden = true;
      this._styleMenu.element.style.width = '650';
      initStyleDebugMenu(this._styleMenu, document.documentElement.style);
    }

    this._showStyleDebugMenu = !this._showStyleDebugMenu;
    this._showStyleDebugMenu
      ? (this._styleMenu.hidden = false)
      : (this._styleMenu.hidden = true);
  }

  private _toggleReadonly() {
    const page = this.page;
    page.awarenessStore.setReadonly(page, !page.readonly);
  }

  private _shareSelection() {
    const selection = this.editor.root?.selection.value;
    if (!selection || selection.length === 0) {
      return;
    }
    const json = selection.map(sel => sel.toJSON());
    const hash = lz.compressToEncodedURIComponent(JSON.stringify(json));
    const url = new URL(window.location.toString());
    url.searchParams.set('sel', hash);
    window.history.pushState({}, '', url);
  }

  private _setThemeMode(dark: boolean) {
    const html = document.querySelector('html');

    this._dark = dark;
    localStorage.setItem('blocksuite:dark', dark ? 'true' : 'false');
    if (!html) return;
    html.setAttribute('data-theme', dark ? 'dark' : 'light');

    this._insertTransitionStyle('color-transition', 0);

    if (dark) {
      html.classList.add('dark');
      html.classList.add('sl-theme-dark');
    } else {
      html.classList.remove('dark');
      html.classList.remove('sl-theme-dark');
    }
  }

  private _insertTransitionStyle(classKey: string, duration: number) {
    const $html = document.documentElement;
    const $style = document.createElement('style');
    const slCSSKeys = ['sl-transition-x-fast'];
    $style.innerHTML = `html.${classKey} * { transition: all ${duration}ms 0ms linear !important; } :root { ${slCSSKeys.map(
      key => `--${key}: ${duration}ms`
    )} }`;

    $html.appendChild($style);
    $html.classList.add(classKey);

    setTimeout(() => {
      $style.remove();
      $html.classList.remove(classKey);
    }, duration);
  }

  private _toggleDarkMode() {
    this._setThemeMode(!this._dark);
  }

  private _darkModeChange = (e: MediaQueryListEvent) => {
    this._setThemeMode(!!e.matches);
  };

  private _extendFormatBar() {
    extendFormatBar();
  }

  override firstUpdated() {
    this.page.slots.historyUpdated.on(() => {
      this._canUndo = this.page.canUndo;
      this._canRedo = this.page.canRedo;
    });
  }

  override update(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('mode')) {
      const mode = this.mode;
      this.editor.mode = mode;
    }
    if (changedProperties.has('_hasOffset')) {
      const appRoot = document.getElementById('app');
      if (!appRoot) return;
      const style: Partial<CSSStyleDeclaration> = this._hasOffset
        ? {
            margin: '60px 40px 240px 40px',
            overflow: 'auto',
            height: '400px',
            boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.2)',
          }
        : {
            margin: '0',
            overflow: 'initial',
            // edgeless needs the container height
            height: '100%',
            boxShadow: 'initial',
          };
      Object.assign(appRoot.style, style);
    }
    super.update(changedProperties);
  }

  override render() {
    return html`
      <style>
        .debug-menu {
          display: flex;
          flex-wrap: nowrap;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          overflow: auto;
          z-index: 1000; /* for debug visibility */
          pointer-events: none;
        }

        @media print {
          .debug-menu {
            display: none;
          }
        }

        .default-toolbar {
          display: flex;
          gap: 5px;
          padding: 8px;
          width: 100%;
          min-width: 390px;
        }

        .default-toolbar > * {
          pointer-events: auto;
        }

        .edgeless-toolbar {
          align-items: center;
          margin-right: 17px;
          pointer-events: auto;
        }

        .edgeless-toolbar sl-select,
        .edgeless-toolbar sl-color-picker,
        .edgeless-toolbar sl-button {
          margin-right: 4px;
        }
      </style>
      <div class="debug-menu default">
        <div class="default-toolbar">
          <!-- undo/redo group -->
          <sl-button-group label="History">
            <!-- undo -->
            <sl-tooltip content="Undo" placement="bottom" hoist>
              <sl-button
                size="small"
                .disabled=${!this._canUndo}
                @click=${() => this.page.undo()}
              >
                <sl-icon name="arrow-counterclockwise" label="Undo"></sl-icon>
              </sl-button>
            </sl-tooltip>
            <!-- redo -->
            <sl-tooltip content="Redo" placement="bottom" hoist>
              <sl-button
                size="small"
                .disabled=${!this._canRedo}
                @click=${() => this.page.redo()}
              >
                <sl-icon name="arrow-clockwise" label="Redo"></sl-icon>
              </sl-button>
            </sl-tooltip>
          </sl-button-group>

          <!-- test operations -->
          <sl-dropdown id="test-operations-dropdown" placement="bottom" hoist>
            <sl-button size="small" slot="trigger" caret>
              Test Operations
            </sl-button>
            <sl-menu>
              <sl-menu-item @click=${this._toggleConnection}>
                ${this._connected ? 'Disconnect' : 'Connect'}
              </sl-menu-item>
              <sl-menu-item @click=${this._exportMarkDown}>
                Export Markdown
              </sl-menu-item>
              <sl-menu-item @click=${this._exportHtml}>
                Export HTML
              </sl-menu-item>
              <sl-menu-item @click=${this._exportPdf}>
                Export PDF
              </sl-menu-item>
              <sl-menu-item @click=${this._exportPng}>
                Export PNG
              </sl-menu-item>
              <sl-menu-item @click=${this._exportSnapshot}>
                Export Snapshot
              </sl-menu-item>
              <sl-menu-item @click=${this._importSnapshot}>
                Import Snapshot
              </sl-menu-item>
              <sl-menu-item @click=${this._shareUrl}>Share URL</sl-menu-item>
              <sl-menu-item @click=${this._toggleStyleDebugMenu}>
                Toggle CSS Debug Menu
              </sl-menu-item>
              <sl-menu-item @click=${this._toggleReadonly}>
                Toggle Readonly
              </sl-menu-item>
              <sl-menu-item @click=${this._shareSelection}>
                Share Selection
              </sl-menu-item>
              <sl-menu-item @click=${this._switchOffsetMode}>
                Switch Offset Mode
              </sl-menu-item>
              <sl-menu-item @click=${this._toggleNavigationPanel}>
                Toggle TOC Outline Panel
              </sl-menu-item>
              <sl-menu-item @click=${this._toggleFramePanel}>
                Toggle Frame Panel
              </sl-menu-item>
              <sl-menu-item @click=${this._extendFormatBar}>
                Extend Format Bar
              </sl-menu-item>
              <sl-menu-item @click=${this._createMindMap}>
                Create Mind Map
              </sl-menu-item>
              <sl-menu-item @click=${this._addNote}>Add Note</sl-menu-item>
            </sl-menu>
          </sl-dropdown>

          <sl-tooltip content="Switch Editor Mode" placement="bottom" hoist>
            <sl-button size="small" @click=${this._switchEditorMode}>
              <sl-icon name="repeat"></sl-icon>
            </sl-button>
          </sl-tooltip>

          <sl-tooltip content="Toggle Dark Mode" placement="bottom" hoist>
            <sl-button size="small" @click=${this._toggleDarkMode}>
              <sl-icon
                name=${this._dark ? 'moon' : 'brightness-high'}
              ></sl-icon>
            </sl-button>
          </sl-tooltip>

          <sl-tooltip
            content="🚧 Toggle Copilot Panel"
            placement="bottom"
            hoist
          >
            <sl-button size="small" @click=${this._toggleCopilotPanel}>
              <sl-icon name="stars"></sl-icon>
            </sl-button>
          </sl-tooltip>
          <sl-button
            data-testid="pages-button"
            size="small"
            @click=${this._togglePagesPanel}
          >
            Pages
          </sl-button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'debug-menu': DebugMenu;
  }
}
