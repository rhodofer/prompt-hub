import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { Prompt } from './types';

export function openPromptPanel(
  context: vscode.ExtensionContext,
  onSave: (data: { title: string; content: string; imagePath?: string; imagePaths?: string[] }) => Promise<void>,
  existing?: Prompt
): void {
  const panel = vscode.window.createWebviewPanel(
    'promptHub.form',
    existing ? 'Edit Prompt' : 'New Prompt',
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: false, localResourceRoots: [] }
  );

  let existingImagesJson = '[]';
  const paths = existing?.imagePaths || (existing?.imagePath ? [existing.imagePath] : []);
  const imgList = [];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      const ext = path.extname(p).slice(1).toLowerCase();
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
      const base64 = `data:${mime};base64,${fs.readFileSync(p).toString('base64')}`;
      imgList.push({ path: p, base64 });
    }
  }
  existingImagesJson = JSON.stringify(imgList);

  panel.webview.html = getHtml(existing, existingImagesJson);

  panel.webview.onDidReceiveMessage(async (msg) => {
    if (msg.type === 'cancel') { panel.dispose(); return; }

    if (msg.type === 'save') {
      const imagePaths: string[] = [];
      const storageDir = context.globalStorageUri.fsPath;
      const imagesDir = path.join(storageDir, 'images');
      if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

      if (msg.images && Array.isArray(msg.images)) {
        for (const img of msg.images) {
          if (img.path) {
            // Keep existing image path
            imagePaths.push(img.path);
          } else if (img.base64 && img.type) {
            // Write new image to extension storage
            const ext = img.type === 'image/jpeg' ? 'jpg' : 'png';
            const imgPath = path.join(imagesDir, `${randomUUID()}.${ext}`);
            fs.writeFileSync(imgPath, Buffer.from(img.base64.replace(/^data:image\/\w+;base64,/, ''), 'base64'));
            imagePaths.push(imgPath);
          }
        }
      }

      // Auto-generate title from first line / first 40 chars of content or use default for image-only
      const firstLine = (msg.content as string).split('\n')[0].trim();
      const title = firstLine
        ? (firstLine.length > 40 ? firstLine.slice(0, 40) + '…' : firstLine)
        : 'Görsel Prompt';

      await onSave({
        title,
        content: msg.content,
        imagePaths,
        imagePath: imagePaths[0] // Set first image as legacy fallback for backward compatibility
      });
      panel.dispose();
    }
  }, undefined, context.subscriptions);
}

function getHtml(existing?: Prompt, existingImagesJson?: string): string {
  const nonce = randomUUID().replace(/-/g, '');
  const safeContent = (existing?.content ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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
    textarea {
      width: 100%;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, rgba(128,128,128,0.4));
      border-radius: 4px;
      padding: 8px 10px;
      font: inherit;
      outline: none;
      resize: vertical;
      min-height: 140px;
      transition: border-color 0.15s;
    }
    textarea:focus { border-color: var(--vscode-focusBorder); }
    .error { color: var(--vscode-errorForeground); font-size: 0.82em; margin-top: 4px; display: none; }

    /* Paste Zone */
    #paste-zone {
      border: 2px dashed var(--vscode-input-border, rgba(128,128,128,0.5));
      border-radius: 8px;
      min-height: 110px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 12px;
      transition: border-color 0.15s, background 0.15s;
      position: relative;
      overflow: hidden;
      padding: 16px;
    }
    #paste-zone.hover {
      border-color: var(--vscode-focusBorder);
      background: var(--vscode-list-hoverBackground);
    }
    #paste-zone.has-images { border-color: var(--vscode-focusBorder); padding: 12px; min-height: unset; }
    #paste-hint { color: var(--vscode-descriptionForeground); font-size: 0.88em; text-align: center; pointer-events: none; }
    #paste-hint kbd {
      background: var(--vscode-keybindingLabel-background, rgba(128,128,128,0.2));
      border: 1px solid var(--vscode-keybindingLabel-border, rgba(128,128,128,0.4));
      border-radius: 3px; padding: 1px 5px; font-family: monospace;
    }

    /* Previews Grid */
    .previews-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      width: 100%;
      justify-content: flex-start;
    }
    .preview-card {
      position: relative;
      width: 80px;
      height: 80px;
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid var(--vscode-input-border, rgba(128,128,128,0.4));
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      background: #000;
    }
    .preview-card img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .preview-card .remove-badge {
      position: absolute;
      top: 4px;
      right: 4px;
      background: rgba(230, 50, 50, 0.9);
      color: #fff;
      border: none;
      border-radius: 50%;
      width: 18px;
      height: 18px;
      font-size: 11px;
      line-height: 18px;
      text-align: center;
      cursor: pointer;
      font-weight: bold;
      padding: 0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }

    .actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 24px; }
    button.primary, button.secondary {
      padding: 7px 22px; border: none; border-radius: 4px;
      cursor: pointer; font: inherit; font-size: 0.92em;
    }
    button.primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
    button.primary:hover { background: var(--vscode-button-hoverBackground); }
    button.secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
    button.secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
  </style>
</head>
<body>
  <h1>${existing ? '✏️ Edit Prompt' : '📝 New Prompt'}</h1>

  <div class="field">
    <label for="inp-content">Prompt</label>
    <textarea id="inp-content" placeholder="Prompt metnini buraya yazın veya yapıştırın…">${safeContent}</textarea>
    <div class="error" id="err-content">En az bir prompt metni veya görsel eklemelisiniz.</div>
  </div>

  <div class="field">
    <label>Resimler (isteğe bağlı)</label>
    <div id="paste-zone">
      <div id="previews-container" class="previews-grid" style="display: none;"></div>
      <div id="paste-hint">
        <div>📋 <kbd>Ctrl+V</kbd> ile panodaki resimleri yapıştırın</div>
        <div style="margin-top:4px;opacity:0.7">ya da PNG / JPG dosyalarını buraya sürükleyin</div>
      </div>
    </div>
  </div>

  <div class="actions">
    <button class="secondary" id="btn-cancel">İptal</button>
    <button class="primary" id="btn-save">💾 Kaydet</button>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    
    // Parse loaded images: Array of { path, base64 }
    const loadedImages = ${existingImagesJson || '[]'};
    
    // Map to active images array: { base64, type, path }
    let images = loadedImages.map(img => ({
      base64: img.base64,
      type: 'image/png',
      path: img.path
    }));

    const pasteZone = document.getElementById('paste-zone');
    const hint      = document.getElementById('paste-hint');
    const container = document.getElementById('previews-container');

    function renderPreviews() {
      container.innerHTML = '';
      if (images.length === 0) {
        container.style.display = 'none';
        hint.style.display = '';
        pasteZone.classList.remove('has-images');
      } else {
        container.style.display = 'flex';
        hint.style.display = 'none';
        pasteZone.classList.add('has-images');

        images.forEach((img, index) => {
          const card = document.createElement('div');
          card.className = 'preview-card';

          const imageEl = document.createElement('img');
          imageEl.src = img.base64;
          card.appendChild(imageEl);

          const removeBtn = document.createElement('button');
          removeBtn.className = 'remove-badge';
          removeBtn.innerHTML = '✕';
          removeBtn.title = 'Resmi Kaldır';
          removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeImage(index);
          });
          card.appendChild(removeBtn);

          container.appendChild(card);
        });
      }
    }

    function removeImage(index) {
      images.splice(index, 1);
      renderPreviews();
    }

    function addImage(base64, type) {
      images.push({ base64, type });
      renderPreviews();
    }

    // Render loaded previews initially
    renderPreviews();

    // Ctrl+V — Resim yapıştırmayı yakala
    document.addEventListener('paste', (e) => {
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        for (const file of Array.from(files)) {
          if (file.type.startsWith('image/')) {
            e.preventDefault();
            const reader = new FileReader();
            reader.onload = (ev) => addImage(ev.target.result, file.type);
            reader.readAsDataURL(file);
          }
        }
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => addImage(ev.target.result, item.type);
            reader.readAsDataURL(file);
          }
          return;
        }
      }
    });

    // Drag & drop
    pasteZone.addEventListener('dragover', (e) => { e.preventDefault(); pasteZone.classList.add('hover'); });
    pasteZone.addEventListener('dragleave', () => pasteZone.classList.remove('hover'));
    pasteZone.addEventListener('drop', (e) => {
      e.preventDefault(); pasteZone.classList.remove('hover');
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        for (const file of Array.from(files)) {
          if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => addImage(ev.target.result, file.type);
            reader.readAsDataURL(file);
          }
        }
      }
    });

    document.getElementById('btn-save').addEventListener('click', () => {
      const content = document.getElementById('inp-content').value.trim();
      const isValid = content.length > 0 || images.length > 0;
      document.getElementById('err-content').style.display = isValid ? 'none' : 'block';
      if (!isValid) return;
      
      vscode.postMessage({
        type: 'save',
        content,
        images: images.map(img => ({
          base64: img.base64.startsWith('data:') ? img.base64 : null, // only send base64 data for new unsaved images
          type: img.type,
          path: img.path // preserve existing file paths
        }))
      });
    });

    document.getElementById('btn-cancel').addEventListener('click', () => vscode.postMessage({ type: 'cancel' }));

    document.getElementById('inp-content').focus();
  </script>
</body>
</html>`;
}
