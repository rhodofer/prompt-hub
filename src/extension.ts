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
    dragAndDropController: provider,
  });
  context.subscriptions.push(treeView);
  out.appendLine('[Prompt Hub] TreeView created');

  vscode.commands.getCommands(true).then(cmds => {
    const chatCmds = cmds.filter(c => c.toLowerCase().includes('chat') || c.toLowerCase().includes('antigravity') || c.toLowerCase().includes('copilot'));
    out.appendLine(`\n[Prompt Hub] POTENTIAL CHAT COMMANDS:\n${chatCmds.join('\n')}\n`);
  });

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

  // ── Copy / Send Prompt ────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('promptHub.copyPrompt', async (promptOrItem: Prompt | PromptTreeItem) => {
      const prompt = 'prompt' in promptOrItem ? promptOrItem.prompt : promptOrItem;

      // 1. Resmi panoya kopyala (varsa)
      let imageCopied = false;
      if (prompt.imagePath && fs.existsSync(prompt.imagePath)) {
        try {
          await copyImageToClipboard(prompt.imagePath);
          imageCopied = true;
        } catch (err) {
          out.appendLine(`[Prompt Hub] Failed to copy image to clipboard: ${String(err)}`);
        }
      }

      // 2. Resmi addContext komutuyla otomatik eklemeyi dene
      let imageAttachedAuto = false;
      const cmds = await vscode.commands.getCommands();
      
      if (prompt.imagePath && fs.existsSync(prompt.imagePath) && cmds.includes('antigravity.addContext')) {
        try {
          const uri = vscode.Uri.file(prompt.imagePath);
          await vscode.commands.executeCommand('antigravity.addContext', uri);
          imageAttachedAuto = true;
        } catch (err) {
          out.appendLine(`[Prompt Hub] addContext başarisiz: ${String(err)}`);
        }
      }

      // 3. Metni panoya kopyala
      await vscode.env.clipboard.writeText(prompt.content);

      // 4. Chat alanını her durumda odakla ve otomatik Ctrl+V yap
      out.appendLine(`[Prompt Hub] copyPrompt: prompt clicked: "${prompt.title}" (görsel: ${!!prompt.imagePath})`);

      if (cmds.includes('antigravity.agentSidePanel.focus')) {
        out.appendLine('[Prompt Hub] Yan panel odaklanıyor (antigravity.agentSidePanel.focus)...');
        await vscode.commands.executeCommand('antigravity.agentSidePanel.focus');
      }
      if (cmds.includes('workbench.panel.chat.view.copilot.focus')) {
        out.appendLine('[Prompt Hub] Chat girdi kutusu odaklanıyor (workbench.panel.chat.view.copilot.focus)...');
        await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
      }

      const delay = prompt.imagePath ? 250 : 400;
      out.appendLine(`[Prompt Hub] Yapıştırma gecikmesi: ${delay}ms`);

      setTimeout(() => {
        out.appendLine('[Prompt Hub] Ctrl+V simüle ediliyor...');
        simulateCtrlV().catch(err => {
          out.appendLine(`[Prompt Hub] Auto Ctrl+V failed: ${String(err)}`);
        });
      }, delay);
      
      // 5. Kullanıcıyı bilgilendir
      if (imageAttachedAuto) {
        vscode.window.showInformationMessage(`🚀 Resim ve metin Chat kutusuna otomatik eklendi!`);
      } else if (imageCopied) {
        vscode.window.showInformationMessage(`🚀 Metin Chat kutusuna eklendi, resmi yapıştırmak için Win+V yapabilirsiniz.`);
      } else {
        vscode.window.showInformationMessage(`🚀 "${prompt.title}" Chat kutusuna eklendi!`);
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

async function copyImageToClipboard(imagePath: string): Promise<void> {
  if (process.platform !== 'win32') {
    throw new Error('Clipboard image copying is only supported on Windows.');
  }

  return new Promise((resolve, reject) => {
    const imagePathBase64 = Buffer.from(imagePath, 'utf8').toString('base64');

    const psScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$imagePath = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${imagePathBase64}'))
if (Test-Path $imagePath) {
    $image = [System.Drawing.Image]::FromFile($imagePath)
    [System.Windows.Forms.Clipboard]::SetImage($image)
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

async function simulateCtrlV(): Promise<void> {
  if (process.platform !== 'win32') return;
  return new Promise((resolve) => {
    const psScript = `
$wshell = New-Object -ComObject wscript.shell
$wshell.SendKeys('^v')
`;
    const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
    exec(`powershell -NoProfile -NonInteractive -WindowStyle Hidden -EncodedCommand ${encoded}`, () => resolve());
  });
}

export function deactivate(): void {}
