import * as vscode from 'vscode';
import { randomUUID } from 'crypto';
import { PromptTreeProvider, PromptTreeItem } from './promptProvider';
import { addPrompt, updatePrompt, deletePrompt, getPrompts } from './promptManager';
import { Prompt } from './types';

export function activate(context: vscode.ExtensionContext): void {
  const out = vscode.window.createOutputChannel('Prompt Hub');
  context.subscriptions.push(out);
  out.appendLine('[Prompt Hub] activate() called');
  out.show(true);

  const provider = new PromptTreeProvider(context);
  const treeView = vscode.window.createTreeView('promptHubView', {
    treeDataProvider: provider,
    showCollapseAll: false,
  });
  context.subscriptions.push(treeView);

  // ── Add Prompt ────────────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('promptHub.addPrompt', async () => {
      out.appendLine('[Prompt Hub] addPrompt triggered');
      try {
        const title = await vscode.window.showInputBox({
          title: 'New Prompt — Step 1/3',
          prompt: 'Enter a short title for this prompt',
          placeHolder: 'e.g. Refactor TypeScript',
        });
        if (!title?.trim()) return;

        const content = await vscode.window.showInputBox({
          title: 'New Prompt — Step 2/3',
          prompt: 'Enter the full prompt content',
          placeHolder: 'Paste or type your prompt here…',
        });
        if (!content?.trim()) return;

        // Step 3 — Optional image
        const imageChoice = await vscode.window.showQuickPick(
          ['📎 Select an image (PNG/JPG)', '⏭️ Skip — no image'],
          { title: 'New Prompt — Step 3/3: Image (optional)' }
        );

        let imagePath: string | undefined;
        if (imageChoice?.startsWith('📎')) {
          const uris = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            openLabel: 'Select Image',
            filters: { Images: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] },
          });
          if (uris && uris.length > 0) {
            imagePath = uris[0].fsPath;
            out.appendLine(`[Prompt Hub] image selected: ${imagePath}`);
          }
        }

        const prompt: Prompt = {
          id: randomUUID(),
          title: title.trim(),
          content: content.trim(),
          imagePath,
        };

        await addPrompt(context, prompt);
        const all = getPrompts(context);
        out.appendLine(`[Prompt Hub] saved. Total: ${all.length}`);
        vscode.window.showInformationMessage(`✅ "${prompt.title}" added${imagePath ? ' with image 🖼️' : ''}.`);
        provider.refresh();
      } catch (err) {
        out.appendLine(`[Prompt Hub] ERROR: ${String(err)}`);
        vscode.window.showErrorMessage(`Prompt Hub: ${String(err)}`);
      }
    })
  );

  // ── Copy Prompt ───────────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('promptHub.copyPrompt', async (promptOrItem: Prompt | PromptTreeItem) => {
      const prompt = 'prompt' in promptOrItem ? promptOrItem.prompt : promptOrItem;
      await vscode.env.clipboard.writeText(prompt.content);
      vscode.window.showInformationMessage(`📋 "${prompt.title}" copied.`);
    })
  );

  // ── Open Image ────────────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('promptHub.openImage', async (prompt: Prompt) => {
      if (!prompt.imagePath) {
        // Fallback: copy content if no image
        await vscode.env.clipboard.writeText(prompt.content);
        vscode.window.showInformationMessage(`📋 "${prompt.title}" copied.`);
        return;
      }
      try {
        const uri = vscode.Uri.file(prompt.imagePath);
        await vscode.commands.executeCommand('vscode.open', uri);
      } catch (err) {
        vscode.window.showErrorMessage(`Cannot open image: ${String(err)}`);
      }
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
      if (newTitle === undefined) return;

      const newContent = await vscode.window.showInputBox({
        title: 'Edit Prompt — Content',
        value: item.prompt.content,
        prompt: 'Update the prompt content',
      });
      if (newContent === undefined) return;

      // Allow changing the image
      const imageChoice = await vscode.window.showQuickPick(
        [
          '🔄 Change image',
          '🗑️ Remove image',
          '✅ Keep current image',
        ],
        { title: 'Edit Prompt — Image' }
      );

      let imagePath = item.prompt.imagePath;
      if (imageChoice?.startsWith('🔄')) {
        const uris = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          openLabel: 'Select Image',
          filters: { Images: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] },
        });
        if (uris && uris.length > 0) {
          imagePath = uris[0].fsPath;
        }
      } else if (imageChoice?.startsWith('🗑️')) {
        imagePath = undefined;
      }

      await updatePrompt(context, item.prompt.id, {
        title: newTitle.trim() || item.prompt.title,
        content: newContent.trim() || item.prompt.content,
        imagePath,
      });
      provider.refresh();
      vscode.window.showInformationMessage('✏️ Prompt updated.');
    })
  );

  // ── Delete Prompt ─────────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('promptHub.deletePrompt', async (item: PromptTreeItem) => {
      const ok = await vscode.window.showWarningMessage(
        `Delete "${item.prompt.title}"?`,
        { modal: true },
        'Delete'
      );
      if (ok !== 'Delete') return;
      await deletePrompt(context, item.prompt.id);
      provider.refresh();
      vscode.window.showInformationMessage('🗑️ Prompt deleted.');
    })
  );
}

export function deactivate(): void {}
