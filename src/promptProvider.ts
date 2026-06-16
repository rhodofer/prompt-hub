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
    this.command = {
      command: 'promptHub.copyPrompt',
      title: 'Copy Prompt',
      arguments: [prompt],
    };
  }
}

export class PromptTreeProvider implements vscode.TreeDataProvider<PromptTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<PromptTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

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
}
