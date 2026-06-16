import * as vscode from 'vscode';
import { randomUUID } from 'crypto';
import { PromptTreeProvider, PromptTreeItem } from './promptProvider';
import { addPrompt, updatePrompt, deletePrompt, getPrompts } from './promptManager';
import { Prompt } from './types';
import { openPromptPanel } from './promptWebview';
import { exec } from 'child_process';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext): void {
  const out = vscode.window.createOutputChannel('Prompt Hub');
  context.subscriptions.push(out);
  out.appendLine('[Prompt Hub] activate() called');
  out.show(true);

  const provider = new PromptTreeProvider(context);
  out.appendLine(`[Prompt Hub] Stored prompts database contents: ${JSON.stringify(getPrompts(context))}`);
  const treeView = vscode.window.createTreeView('promptHubView', {
    treeDataProvider: provider,
    showCollapseAll: false,
  });
  context.subscriptions.push(treeView);
  out.appendLine('[Prompt Hub] TreeView created');

  // ── Add Prompt (opens Webview panel) ─────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('promptHub.addPrompt', () => {
      out.appendLine('[Prompt Hub] addPrompt triggered — opening webview');
      openPromptPanel(context, async (data) => {
        const prompt: Prompt = {
          id: randomUUID(),
          title: data.title,
          content: data.content,
          imagePath: data.imagePath,
        };
        await addPrompt(context, prompt);
        const all = getPrompts(context);
        out.appendLine(`[Prompt Hub] saved. Total: ${all.length}`);
        vscode.window.showInformationMessage(
          `✅ "${prompt.title}" added${prompt.imagePath ? ' with image 🖼️' : ''}.`
        );
        provider.refresh();
      });
    })
  );

  // ── Copy Prompt ───────────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('promptHub.copyPrompt', async (promptOrItem: Prompt | PromptTreeItem) => {
      const prompt = 'prompt' in promptOrItem ? promptOrItem.prompt : promptOrItem;

      if (prompt.imagePath && fs.existsSync(prompt.imagePath)) {
        try {
          await copyTextAndImageToClipboard(prompt.content, prompt.imagePath);
          try {
            await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(prompt.imagePath), {
              viewColumn: vscode.ViewColumn.Beside,
              preserveFocus: true,
            });
            vscode.window.showInformationMessage(`📋 Prompt ve resim kopyalandı + 🖼️ Yan tarafta açıldı.`);
          } catch {
            vscode.window.showInformationMessage(`📋 Prompt ve resim panoya kopyalandı.`);
          }
        } catch (err) {
          out.appendLine(`[Prompt Hub] Failed to copy image to clipboard: ${String(err)}`);
          await vscode.env.clipboard.writeText(prompt.content);
          vscode.window.showWarningMessage(`📋 Sadece metin kopyalandı (Resim panoya yazılırken hata oluştu).`);
        }
      } else {
        await vscode.env.clipboard.writeText(prompt.content);
        vscode.window.showInformationMessage(`📋 "${prompt.title}" kopyalandı.`);
      }
    })
  );

  // ── Open Image ────────────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('promptHub.openImage', async (prompt: Prompt) => {
      if (!prompt.imagePath) {
        await vscode.env.clipboard.writeText(prompt.content);
        vscode.window.showInformationMessage(`📋 "${prompt.title}" copied.`);
        return;
      }
      try {
        await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(prompt.imagePath));
      } catch (err) {
        vscode.window.showErrorMessage(`Cannot open image: ${String(err)}`);
      }
    })
  );

  // ── Edit Prompt (opens Webview panel) ────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('promptHub.editPrompt', (item: PromptTreeItem) => {
      openPromptPanel(
        context,
        async (data) => {
          await updatePrompt(context, item.prompt.id, {
            title: data.title,
            content: data.content,
            imagePath: data.imagePath,
          });
          provider.refresh();
          vscode.window.showInformationMessage('✏️ Prompt updated.');
        },
        item.prompt
      );
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

async function copyTextAndImageToClipboard(text: string, imagePath: string): Promise<void> {
  if (process.platform !== 'win32') {
    throw new Error('Clipboard image copying is only supported on Windows.');
  }

  return new Promise((resolve, reject) => {
    const textBase64 = Buffer.from(text, 'utf8').toString('base64');
    const imagePathBase64 = Buffer.from(imagePath, 'utf8').toString('base64');

    const psScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$text = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${textBase64}'))
$imagePath = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${imagePathBase64}'))
if (Test-Path $imagePath) {
    $image = [System.Drawing.Image]::FromFile($imagePath)
    $dataObject = New-Object System.Windows.Forms.DataObject
    $dataObject.SetData([System.Windows.Forms.DataFormats]::UnicodeText, $text)
    $dataObject.SetData([System.Windows.Forms.DataFormats]::Bitmap, $image)
    [System.Windows.Forms.Clipboard]::SetDataObject($dataObject, $true)
    $image.Dispose()
} else {
    throw "Image path not found"
}
`.trim();

    const encodedScript = Buffer.from(psScript, 'utf16le').toString('base64');
    exec(`powershell -NoProfile -NonInteractive -EncodedCommand ${encodedScript}`, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

export function deactivate(): void {}
