import * as vscode from 'vscode';
import { PreviewManager } from './PreviewManager';
import { viewType } from './PreviewInstance';

export function activate(context: vscode.ExtensionContext): void {
  const manager = new PreviewManager(context.extensionUri);
  context.subscriptions.push(manager,
    vscode.commands.registerCommand('persistentMarkdownPreview.open', () => manager.open()),
    vscode.commands.registerCommand('persistentMarkdownPreview.reveal', () => manager.open(true)),
    vscode.window.registerWebviewPanelSerializer(viewType, manager));
}
