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
          imagePaths: data.imagePaths,
        };
        await addPrompt(context, prompt);
        const all = getPrompts(context);
        out.appendLine(`[Prompt Hub] saved. Total: ${all.length}`);
        vscode.window.showInformationMessage(
          `✅ "${prompt.title}" added${(prompt.imagePaths && prompt.imagePaths.length > 0) ? ` with ${prompt.imagePaths.length} images 🖼️` : ''}.`
        );
        provider.refresh();
      });
    })
  );

  // ── Copy / Send Prompt ────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('promptHub.copyPrompt', async (promptOrItem: Prompt | PromptTreeItem) => {
      const prompt = 'prompt' in promptOrItem ? promptOrItem.prompt : promptOrItem;

      // 1 & 2. Resimleri kopyala/ekle
      const imagePaths = (prompt as any).imagePaths || (prompt.imagePath ? [prompt.imagePath] : []);
      let firstImageCopied = false;
      let imagesAttachedAutoCount = 0;

      const cmds = await vscode.commands.getCommands();
      const hasAddContext = cmds.includes('antigravity.addContext');

      for (let i = 0; i < imagePaths.length; i++) {
        const imgPath = imagePaths[i];
        if (fs.existsSync(imgPath)) {
          if (hasAddContext) {
            try {
              const uri = vscode.Uri.file(imgPath);
              await vscode.commands.executeCommand('antigravity.addContext', uri);
              imagesAttachedAutoCount++;
            } catch (err) {
              out.appendLine(`[Prompt Hub] addContext başarisiz: ${String(err)}`);
            }
          }
          if (i === 0) {
            try {
              await copyImageToClipboard(imgPath);
              firstImageCopied = true;
            } catch (err) {
              out.appendLine(`[Prompt Hub] Failed to copy image to clipboard: ${String(err)}`);
            }
          }
        }
      }

      const imageAttachedAuto = imagesAttachedAutoCount > 0;

      // 3. Metni panoya kopyala (sadece metin varsa)
      if (prompt.content) {
        await vscode.env.clipboard.writeText(prompt.content);
      }

      // 4. Chat alanını her durumda odakla ve otomatik Ctrl+V yap
      const hasImages = imagePaths.length > 0;
      out.appendLine(`[Prompt Hub] copyPrompt: prompt clicked: "${prompt.title}" (görseller: ${imagePaths.length})`);

      if (hasImages) {
        if (cmds.includes('antigravity.agentSidePanel.focus')) {
          out.appendLine('[Prompt Hub] Yan panel odaklanıyor (antigravity.agentSidePanel.focus)...');
          await vscode.commands.executeCommand('antigravity.agentSidePanel.focus');
        }
      } else {
        if (cmds.includes('antigravity.toggleChatFocus')) {
          out.appendLine('[Prompt Hub] Chat girdi kutusu odaklanıyor (antigravity.toggleChatFocus)...');
          await vscode.commands.executeCommand('antigravity.toggleChatFocus');
        } else if (cmds.includes('antigravity.agentSidePanel.focus')) {
          out.appendLine('[Prompt Hub] Yan panel odaklanıyor (antigravity.agentSidePanel.focus)...');
          await vscode.commands.executeCommand('antigravity.agentSidePanel.focus');
        }
      }

      const shouldPaste = prompt.content || (hasImages && !imageAttachedAuto);
      if (shouldPaste) {
        const delay = hasImages ? 250 : 400;
        out.appendLine(`[Prompt Hub] Yapıştırma gecikmesi: ${delay}ms`);

        setTimeout(() => {
          out.appendLine('[Prompt Hub] Ctrl+V simüle ediliyor...');
          simulateCtrlV().catch(err => {
            out.appendLine(`[Prompt Hub] Auto Ctrl+V failed: ${String(err)}`);
          });
        }, delay);
      } else {
        out.appendLine('[Prompt Hub] Görseller otomatik eklendi ve metin olmadığı için yapıştırma simülasyonu atlanıyor.');
      }
      
      // 5. Kullanıcıyı bilgilendir
      if (imageAttachedAuto) {
        const countStr = imagesAttachedAutoCount > 1 ? `${imagesAttachedAutoCount} görsel` : 'Görsel';
        if (prompt.content) {
          vscode.window.showInformationMessage(`🚀 ${countStr} ve metin Chat kutusuna otomatik eklendi!`);
        } else {
          vscode.window.showInformationMessage(`🚀 ${countStr} Chat kutusuna otomatik eklendi!`);
        }
      } else if (firstImageCopied) {
        if (prompt.content) {
          vscode.window.showInformationMessage(`🚀 Metin Chat kutusuna eklendi, ilk resmi yapıştırmak için Win+V yapabilirsiniz.`);
        } else {
          vscode.window.showInformationMessage(`🚀 İlk resim panoya kopyalandı, yapıştırmak için Win+V veya Ctrl+V yapabilirsiniz.`);
        }
      } else {
        vscode.window.showInformationMessage(`🚀 "${prompt.title}" Chat kutusuna eklendi!`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('promptHub.openImage', async (prompt: Prompt) => {
      const paths = (prompt as any).imagePaths || (prompt.imagePath ? [prompt.imagePath] : []);
      if (paths.length === 0) {
        await vscode.env.clipboard.writeText(prompt.content);
        vscode.window.showInformationMessage(`📋 "${prompt.title}" copied.`);
        return;
      }
      for (const p of paths) {
        try {
          await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(p));
        } catch (err) {
          vscode.window.showErrorMessage(`Cannot open image ${path.basename(p)}: ${String(err)}`);
        }
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
            imagePaths: data.imagePaths,
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
