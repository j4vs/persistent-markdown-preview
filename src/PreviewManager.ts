import * as vscode from 'vscode';
import { PreviewInstance, PreviewState, viewType } from './PreviewInstance';

export class PreviewManager implements vscode.Disposable, vscode.WebviewPanelSerializer {
  private previews = new Map<string, PreviewInstance>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private subscriptions: vscode.Disposable[];
  constructor(private extensionUri: vscode.Uri) {
    this.subscriptions = [vscode.workspace.onDidChangeTextDocument(event => {
      const key = event.document.uri.toString();
      if (!event.contentChanges.length || !this.matching(key).length) return;
      clearTimeout(this.timers.get(key));
      this.timers.set(key, setTimeout(() => {
        this.timers.delete(key);
        for (const preview of this.matching(key)) preview.update(event.document.getText());
      }, 150));
    }), vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('persistentMarkdownPreview')) {
        for (const preview of this.previews.values()) preview.refreshAppearance();
      }
    })];
  }
  private matching(key: string): PreviewInstance[] { return [...this.previews.values()].filter(preview => preview.uri.toString() === key); }
  async open(reveal = false): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    const document = editor?.document;
    if (!document || document.languageId !== 'markdown') {
      void vscode.window.showInformationMessage('Selecciona un documento con lenguaje Markdown, incluso uno sin guardar.'); return;
    }
    const existing = this.matching(document.uri.toString());
    if (reveal && existing.length) { existing[0].panel.reveal(); return; }
    const ordinal = Math.max(0, ...existing.map(p => p.ordinal)) + 1;
    const initialLine = editor?.selection.active.line;
    const panel = vscode.window.createWebviewPanel(viewType, 'Preview', vscode.ViewColumn.Active, { enableScripts: true, retainContextWhenHidden: true });
    this.attach(panel, document.uri, ordinal, document.getText(), undefined, initialLine);
  }
  private attach(panel: vscode.WebviewPanel, uri: vscode.Uri, ordinal: number, markdown: string, id?: string, initialLine?: number): void {
    const preview = new PreviewInstance(panel, uri, ordinal, this.extensionUri, markdown, () => {
      this.previews.delete(preview.id);
      if (!this.matching(uri.toString()).length) { clearTimeout(this.timers.get(uri.toString())); this.timers.delete(uri.toString()); }
    }, id, initialLine);
    this.previews.set(preview.id, preview);
  }
  async deserializeWebviewPanel(panel: vscode.WebviewPanel, state?: PreviewState): Promise<void> {
    if (!state || typeof state.documentUri !== 'string' || typeof state.markdown !== 'string') { panel.dispose(); return; }
    try {
      const uri = vscode.Uri.parse(state.documentUri);
      let source = state.markdown;
      const openDocument = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === uri.toString());
      if (openDocument) source = openDocument.getText();
      else if (uri.scheme !== 'untitled') {
        try { source = (await vscode.workspace.openTextDocument(uri)).getText(); } catch { /* Preserve the last snapshot if the source is unavailable. */ }
      }
      this.attach(panel, uri, Number.isInteger(state.ordinal) && state.ordinal > 0 ? state.ordinal : 1, source, state.instanceId);
    } catch { panel.dispose(); }
  }
  dispose(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    for (const subscription of this.subscriptions) subscription.dispose();
    for (const preview of [...this.previews.values()]) preview.dispose();
    this.previews.clear();
  }
}
