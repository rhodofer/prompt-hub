import * as vscode from 'vscode';
import { Prompt } from './types';
import { getPrompts } from './promptManager';

export class PromptTreeItem extends vscode.TreeItem {
  constructor(
    public readonly prompt: Prompt,
    contextValue: 'prompt-active' | 'prompt-completed'
  ) {
    super(prompt.title, vscode.TreeItemCollapsibleState.None);
    this.tooltip = prompt.content;
    this.description = prompt.content.length > 60
      ? prompt.content.slice(0, 60) + '…'
      : prompt.content;
    this.contextValue = contextValue;

    // Show image icon when any images are present
    const hasImages = (prompt.imagePaths && prompt.imagePaths.length > 0) || prompt.imagePath;
    if (hasImages) {
      this.iconPath = new vscode.ThemeIcon('file-media');
    }

    // Click always copies prompt
    this.command = {
      command: 'promptHub.copyPrompt',
      title: 'Copy Prompt',
      arguments: [prompt],
    };
  }
}

export class PromptTreeProvider implements vscode.TreeDataProvider<PromptTreeItem>, vscode.TreeDragAndDropController<PromptTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<PromptTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  public readonly dropMimeTypes = [];
  public readonly dragMimeTypes = ['text/plain', 'text/uri-list'];

  constructor(
    private readonly context: vscode.ExtensionContext,
    public readonly filter: 'active' | 'completed'
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: PromptTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: PromptTreeItem): PromptTreeItem[] {
    if (element) return [];

    const all = getPrompts(this.context);
    if (this.filter === 'active') {
      return all.filter(p => !p.isCompleted).map(p => new PromptTreeItem(p, 'prompt-active'));
    } else {
      return all.filter(p => p.isCompleted).map(p => new PromptTreeItem(p, 'prompt-completed'));
    }
  }

  public async handleDrag(source: readonly PromptTreeItem[], dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
    const item = source[0];
    if (!item) return;

    // Attach text data
    dataTransfer.set('text/plain', new vscode.DataTransferItem(item.prompt.content));

    // Attach image data as URIs if present
    const paths = item.prompt.imagePaths || (item.prompt.imagePath ? [item.prompt.imagePath] : []);
    if (paths.length > 0) {
      const fs = require('fs');
      const uris = [];
      for (const p of paths) {
        if (fs.existsSync(p)) {
          uris.push(vscode.Uri.file(p).toString());
        }
      }
      if (uris.length > 0) {
        dataTransfer.set('text/uri-list', new vscode.DataTransferItem(uris.join('\r\n')));
      }
    }
  }

  public async handleDrop(target: PromptTreeItem | undefined, dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
    // No-op: we don't handle dropping items into the tree view for now.
  }
}
