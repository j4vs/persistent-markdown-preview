import * as vscode from 'vscode';
import { randomBytes, randomUUID } from 'node:crypto';
import { posix } from 'node:path';
import { renderMarkdown } from './markdownRenderer';

export const viewType = 'persistentMarkdownPreview';
export interface PreviewState { documentUri: string; instanceId: string; ordinal: number; markdown: string; scrollPosition?: number; }

export class PreviewInstance implements vscode.Disposable {
  readonly id: string;
  private markdown: string;
  private ready = false;
  private dead = false;
  private subscriptions: vscode.Disposable[] = [];
  constructor(readonly panel: vscode.WebviewPanel, readonly uri: vscode.Uri, readonly ordinal: number,
    private extensionUri: vscode.Uri, source: string, onDispose: () => void, id: string = randomUUID(), private initialLine?: number) {
    this.id = id;
    this.markdown = source;
    const base = posix.basename(uri.path) || uri.toString();
    panel.title = `[Preview] ${base}${ordinal > 1 ? ` (${ordinal})` : ''}`;
    panel.webview.options = { enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media'), ...this.resourceRoots()] };
    this.subscriptions.push(panel.onDidDispose(() => { this.dead = true; onDispose(); this.dispose(); }));
    this.subscriptions.push(panel.webview.onDidReceiveMessage(message => {
      if (message?.type === 'ready') { this.ready = true; this.send(); }
      if (message?.type === 'link' && typeof message.href === 'string') void this.openLink(message.href);
      if (['copyTable', 'copyCode'].includes(message?.type) && typeof message.text === 'string' && typeof message.requestId === 'string') {
        void vscode.env.clipboard.writeText(message.text).then(
          () => this.panel.webview.postMessage({ type: 'copyResult', requestId: message.requestId, ok: true }),
          () => this.panel.webview.postMessage({ type: 'copyResult', requestId: message.requestId, ok: false })
        );
      }
    }));
    this.subscriptions.push(panel.onDidChangeViewState(() => { if (panel.visible && this.ready) this.send(); }));
    const nonce = randomBytes(24).toString('hex');
    const script = panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'preview.js'));
    const mermaidScript = panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'mermaid.js'));
    const css = panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'preview.css'));
    panel.webview.html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${panel.webview.cspSource} https: http: data:; style-src ${panel.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';"><link rel="stylesheet" href="${css}"></head><body><main id="content" aria-label="Markdown preview"></main><script nonce="${nonce}" src="${mermaidScript}"></script><script nonce="${nonce}" src="${script}"></script></body></html>`;
  }
  private resourceRoots(): vscode.Uri[] {
    if (this.uri.scheme === 'untitled') return [];
    const folder = vscode.workspace.getWorkspaceFolder(this.uri);
    return [folder?.uri ?? vscode.Uri.joinPath(this.uri, '..')];
  }
  private resolve(href: string): vscode.Uri | undefined {
    if (/^[a-z][a-z\d+.-]*:/i.test(href)) return vscode.Uri.parse(href);
    if (this.uri.scheme === 'untitled' || href.startsWith('//')) return undefined;
    const relative = vscode.Uri.parse(href);
    return vscode.Uri.joinPath(this.uri, '..', relative.path).with({ query: relative.query, fragment: relative.fragment });
  }
  private async openLink(href: string): Promise<void> {
    try {
      const target = this.resolve(href);
      if (!target) return;
      if (['https', 'http', 'mailto'].includes(target.scheme)) await vscode.env.openExternal(target);
      else if (this.uri.scheme !== 'untitled' && target.scheme === this.uri.scheme && target.authority === this.uri.authority) {
        await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(target.with({ fragment: '' })), { preview: false });
      }
    } catch { void vscode.window.showWarningMessage('No se pudo abrir el enlace de la vista previa.'); }
  }
  update(source: string): void { this.markdown = source; if (this.ready) this.send(); }
  refreshAppearance(): void {
    if (!this.ready || this.dead) return;
    const config = vscode.workspace.getConfiguration('persistentMarkdownPreview', this.uri);
    void this.panel.webview.postMessage({ type: 'appearance', fontSize: config.get<number>('fontSize', 14), textFontFamily: config.get<string>('textFontFamily', ''), codeFontFamily: config.get<string>('codeFontFamily', '') });
  }
  private send(): void {
    if (this.dead) return;
    this.refreshAppearance();
    const html = renderMarkdown(this.markdown, href => {
      const target = this.resolve(href);
      if (!target) return '';
      if (['https', 'http', 'data'].includes(target.scheme)) return target.toString();
      return target.scheme === this.uri.scheme ? this.panel.webview.asWebviewUri(target).toString() : '';
    });
    void this.panel.webview.postMessage({ type: 'render', html, initialLine: this.initialLine, state: { documentUri: this.uri.toString(), instanceId: this.id, ordinal: this.ordinal, markdown: this.markdown } });
  }
  dispose(): void {
    for (const subscription of this.subscriptions.splice(0)) subscription.dispose();
    if (!this.dead) { this.dead = true; this.panel.dispose(); }
  }
}
