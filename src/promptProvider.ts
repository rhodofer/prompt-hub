import * as vscode from 'vscode';
import { Prompt } from './types';
import { getPrompts } from './promptManager';

export class PromptTreeItem extends vscode.TreeItem {
  constructor(public readonly prompt: Prompt) {
    super(prompt.title, vscode.TreeItemCollapsibleState.None);
    this.tooltip = prompt.content;
    this.description = prompt.content.length > 60
      ? prompt.content.slice(0, 60) + '…'
      : prompt.content;
    this.contextValue = 'prompt';

    // Show image icon when imagePath is set
    if (prompt.imagePath) {
      this.iconPath = new vscode.ThemeIcon('file-media');
    }

    // Click always copies prompt (and opens image if present)
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

  constructor(private readonly context: vscode.ExtensionContext) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: PromptTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): PromptTreeItem[] {
    return getPrompts(this.context).map((p) => new PromptTreeItem(p));
  }

  public async handleDrag(source: readonly PromptTreeItem[], dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
    const item = source[0];
    if (!item) return;

    // Attach text data
    dataTransfer.set('text/plain', new vscode.DataTransferItem(item.prompt.content));

    // Attach image data as URI if present
    if (item.prompt.imagePath) {
      const fs = require('fs');
      if (fs.existsSync(item.prompt.imagePath)) {
        const uri = vscode.Uri.file(item.prompt.imagePath);
        dataTransfer.set('text/uri-list', new vscode.DataTransferItem(uri.toString()));
      }
    }
  }

  public async handleDrop(target: PromptTreeItem | undefined, dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): Promise<void> {
    // No-op: we don't handle dropping items into the tree view for now.
  }
}
