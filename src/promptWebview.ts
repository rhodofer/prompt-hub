import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { Prompt } from './types';

export function openPromptPanel(
  context: vscode.ExtensionContext,
  onSave: (data: { title: string; content: string; imagePath?: string }) => Promise<void>,
  existing?: Prompt
): void {
  const panel = vscode.window.createWebviewPanel(
    'promptHub.form',
    existing ? `Edit: ${existing.title}` : 'New Prompt',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: false,
      localResourceRoots: [],
    }
  );

  // Load existing image as base64 for editing
  let existingImageSrc = '';
  if (existing?.imagePath && fs.existsSync(existing.imagePath)) {
    const ext = path.extname(existing.imagePath).slice(1).toLowerCase();
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
    const b64 = fs.readFileSync(existing.imagePath).toString('base64');
    existingImageSrc = `data:${mime};base64,${b64}`;
  }

  panel.webview.html = getHtml(existing, existingImageSrc);

  panel.webview.onDidReceiveMessage(async (msg) => {
    if (msg.type === 'cancel') {
      panel.dispose();
      return;
    }

    if (msg.type === 'save') {
      let imagePath = existing?.imagePath;

      if (msg.clearImage) {
        imagePath = undefined;
      } else if (msg.imageBase64 && msg.imageType) {
        // Ensure storage directory exists
        const storageDir = context.globalStorageUri.fsPath;
        const imagesDir = path.join(storageDir, 'images');
        if (!fs.existsSync(imagesDir)) {
          fs.mkdirSync(imagesDir, { recursive: true });
        }

        const ext = msg.imageType === 'image/jpeg' ? 'jpg' : 'png';
        const imgPath = path.join(imagesDir, `${randomUUID()}.${ext}`);
        const base64Data = msg.imageBase64.replace(/^data:image\/\w+;base64,/, '');
        fs.writeFileSync(imgPath, Buffer.from(base64Data, 'base64'));
        imagePath = imgPath;
      }

      await onSave({ title: msg.title, content: msg.content, imagePath });
      panel.dispose();
    }
  }, undefined, context.subscriptions);
}

function getHtml(existing?: Prompt, existingImageSrc?: string): string {
  const nonce = randomUUID().replace(/-/g, '');
  const safeTitle = (existing?.title ?? '').replace(/"/g, '&quot;');
  const safeContent = (existing?.content ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const hasImage = !!existingImageSrc;

  return /* html */`<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; img-src data: blob:;">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${existing ? 'Edit Prompt' : 'New Prompt'}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 28px 32px;
      max-width: 640px;
    }
    h1 { font-size: 1.15em; font-weight: 600; margin-bottom: 24px; }
    .field { margin-bottom: 18px; }
    label {
      display: block;
      font-size: 0.82em;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 6px;
    }
    input[type="text"], textarea {
      width: 100%;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, rgba(128,128,128,0.4));
      border-radius: 4px;
      padding: 8px 10px;
      font: inherit;
      outline: none;
      resize: none;
      transition: border-color 0.15s;
    }
    input[type="text"]:focus, textarea:focus {
      border-color: var(--vscode-focusBorder);
    }
    textarea { min-height: 110px; resize: vertical; }

    /* Paste Zone */
    #paste-zone {
      border: 2px dashed var(--vscode-input-border, rgba(128,128,128,0.5));
      border-radius: 8px;
      min-height: 90px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 8px;
      cursor: default;
      transition: border-color 0.15s, background 0.15s;
      position: relative;
      overflow: hidden;
      padding: 16px;
    }
    #paste-zone.hover {
      border-color: var(--vscode-focusBorder);
      background: var(--vscode-list-hoverBackground);
    }
    #paste-zone.has-image {
      border-color: var(--vscode-focusBorder);
      padding: 8px;
      min-height: unset;
    }
    #paste-hint { color: var(--vscode-descriptionForeground); font-size: 0.88em; text-align: center; pointer-events: none; }
    #paste-hint kbd {
      background: var(--vscode-keybindingLabel-background, rgba(128,128,128,0.2));
      border: 1px solid var(--vscode-keybindingLabel-border, rgba(128,128,128,0.4));
      border-radius: 3px;
      padding: 1px 5px;
      font-family: monospace;
    }
    #preview-img {
      max-width: 100%;
      max-height: 220px;
      border-radius: 6px;
      display: ${hasImage ? 'block' : 'none'};
    }
    #remove-btn {
      position: absolute;
      top: 6px; right: 6px;
      background: var(--vscode-errorForeground);
      color: #fff;
      border: none;
      border-radius: 50%;
      width: 22px; height: 22px;
      font-size: 14px;
      line-height: 22px;
      text-align: center;
      cursor: pointer;
      display: ${hasImage ? 'block' : 'none'};
      z-index: 10;
    }

    /* Actions */
    .actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 24px; }
    button.primary, button.secondary {
      padding: 7px 22px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font: inherit;
      font-size: 0.92em;
    }
    button.primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    button.primary:hover { background: var(--vscode-button-hoverBackground); }
    button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    button.secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .error { color: var(--vscode-errorForeground); font-size: 0.82em; margin-top: 4px; display: none; }
  </style>
</head>
<body>
  <h1>${existing ? '✏️ Edit Prompt' : '📝 New Prompt'}</h1>

  <div class="field">
    <label for="inp-title">Title</label>
    <input id="inp-title" type="text" placeholder="e.g. Refactor TypeScript" value="${safeTitle}" autocomplete="off" spellcheck="false">
    <div class="error" id="err-title">Title is required.</div>
  </div>

  <div class="field">
    <label for="inp-content">Prompt Content</label>
    <textarea id="inp-content" placeholder="Paste or type your prompt here…">${safeContent}</textarea>
    <div class="error" id="err-content">Content is required.</div>
  </div>

  <div class="field">
    <label>Image (optional)</label>
    <div id="paste-zone">
      <button id="remove-btn" title="Remove image">✕</button>
      <img id="preview-img" src="${existingImageSrc ?? ''}" alt="Preview">
      <div id="paste-hint">
        <div>📋 Press <kbd>Ctrl+V</kbd> to paste an image from clipboard</div>
        <div style="margin-top:4px; opacity:0.7;">or drag &amp; drop a PNG / JPG file here</div>
      </div>
    </div>
  </div>

  <div class="actions">
    <button class="secondary" id="btn-cancel">Cancel</button>
    <button class="primary" id="btn-save">💾 Save</button>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    let imageBase64 = ${hasImage ? `"${existingImageSrc}"` : 'null'};
    let imageType = ${hasImage ? '"image/png"' : 'null'};
    let clearImage = false;
    let originalHasImage = ${hasImage};

    const pasteZone = document.getElementById('paste-zone');
    const hint = document.getElementById('paste-hint');
    const previewImg = document.getElementById('preview-img');
    const removeBtn = document.getElementById('remove-btn');

    function showImage(src, type) {
      imageBase64 = src;
      imageType = type;
      clearImage = false;
      previewImg.src = src;
      previewImg.style.display = 'block';
      removeBtn.style.display = 'block';
      hint.style.display = 'none';
      pasteZone.classList.add('has-image');
    }

    function clearImageFn() {
      imageBase64 = null;
      imageType = null;
      clearImage = originalHasImage; // only flag clear if there was an original
      previewImg.src = '';
      previewImg.style.display = 'none';
      removeBtn.style.display = 'none';
      hint.style.display = '';
      pasteZone.classList.remove('has-image');
    }

    removeBtn.addEventListener('click', clearImageFn);

    // Global paste — catch Ctrl+V anywhere on the page
    document.addEventListener('paste', (e) => {
      // Don't intercept if user is typing in title/content
      const active = document.activeElement;
      if (active && (active.id === 'inp-title' || active.id === 'inp-content')) return;

      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          const reader = new FileReader();
          reader.onload = (ev) => showImage(ev.target.result, item.type);
          reader.readAsDataURL(blob);
          return;
        }
      }
    });

    // Drag & drop onto paste zone
    pasteZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      pasteZone.classList.add('hover');
    });
    pasteZone.addEventListener('dragleave', () => pasteZone.classList.remove('hover'));
    pasteZone.addEventListener('drop', (e) => {
      e.preventDefault();
      pasteZone.classList.remove('hover');
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => showImage(ev.target.result, file.type);
        reader.readAsDataURL(file);
      }
    });

    // Save
    document.getElementById('btn-save').addEventListener('click', () => {
      const title = document.getElementById('inp-title').value.trim();
      const content = document.getElementById('inp-content').value.trim();
      let valid = true;

      document.getElementById('err-title').style.display = title ? 'none' : 'block';
      document.getElementById('err-content').style.display = content ? 'none' : 'block';
      if (!title || !content) return;

      // Strip the data:... prefix — only send raw base64 + type separately
      let rawBase64 = null;
      if (imageBase64 && !clearImage) {
        rawBase64 = imageBase64; // keep full data URL, extension will strip
      }

      vscode.postMessage({
        type: 'save',
        title,
        content,
        imageBase64: rawBase64,
        imageType,
        clearImage,
      });
    });

    document.getElementById('btn-cancel').addEventListener('click', () => {
      vscode.postMessage({ type: 'cancel' });
    });

    // Auto-focus
    document.getElementById('inp-title').focus();
  </script>
</body>
</html>`;
}
