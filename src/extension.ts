import * as vscode from 'vscode';
import { randomUUID } from 'crypto';
import { PromptTreeProvider, PromptTreeItem } from './promptProvider';
import { addPrompt, updatePrompt, deletePrompt } from './promptManager';
import { Prompt } from './types';

export function activate(context: vscode.ExtensionContext): void {
  const provider = new PromptTreeProvider(context);

  vscode.window.registerTreeDataProvider('promptHubView', provider);

  // ── Add Prompt ────────────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('promptHub.addPrompt', async () => {
      const title = await vscode.window.showInputBox({
        title: 'New Prompt — Step 1/2',
        prompt: 'Enter a short title for this prompt',
        placeHolder: 'e.g. Refactor TypeScript',
      });
      if (!title?.trim()) return;

      const content = await vscode.window.showInputBox({
        title: 'New Prompt — Step 2/2',
        prompt: 'Enter the full prompt content',
        placeHolder: 'Paste or type your prompt here…',
      });
      if (!content?.trim()) return;

      const prompt: Prompt = {
        id: randomUUID(),
        title: title.trim(),
        content: content.trim(),
      };

      await addPrompt(context, prompt);
      provider.refresh();
      vscode.window.showInformationMessage(`✅ Prompt "${prompt.title}" added.`);
    })
  );

  // ── Copy Prompt ───────────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('promptHub.copyPrompt', async (promptOrItem: Prompt | PromptTreeItem) => {
      const prompt = 'prompt' in promptOrItem ? promptOrItem.prompt : promptOrItem;
      await vscode.env.clipboard.writeText(prompt.content);
      vscode.window.showInformationMessage(`📋 "${prompt.title}" copied to clipboard.`);
    })
  );

  // ── Edit Prompt ───────────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('promptHub.editPrompt', async (item: PromptTreeItem) => {
      const newTitle = await vscode.window.showInputBox({
        title: 'Edit Prompt — Title',
        value: item.prompt.title,
        prompt: 'Update the prompt title',
      });
      if (newTitle === undefined) return; // ESC pressed

      const newContent = await vscode.window.showInputBox({
        title: 'Edit Prompt — Content',
        value: item.prompt.content,
        prompt: 'Update the prompt content',
      });
      if (newContent === undefined) return; // ESC pressed

      await updatePrompt(context, item.prompt.id, {
        title: newTitle.trim() || item.prompt.title,
        content: newContent.trim() || item.prompt.content,
      });
      provider.refresh();
      vscode.window.showInformationMessage(`✏️ Prompt updated.`);
    })
  );

  // ── Delete Prompt ─────────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('promptHub.deletePrompt', async (item: PromptTreeItem) => {
      const confirm = await vscode.window.showWarningMessage(
        `Delete "${item.prompt.title}"?`,
        { modal: true },
        'Delete'
      );
      if (confirm !== 'Delete') return;

      await deletePrompt(context, item.prompt.id);
      provider.refresh();
      vscode.window.showInformationMessage(`🗑️ Prompt deleted.`);
    })
  );
}

export function deactivate(): void {}
