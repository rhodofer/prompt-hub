import * as vscode from 'vscode';
import { randomUUID } from 'crypto';
import { getTranslations, TranslationBundle } from './localization';

export function openSettingsPanel(
  context: vscode.ExtensionContext,
  onSave: () => void
): void {
  const t = getTranslations();
  const panel = vscode.window.createWebviewPanel(
    'promptHub.settings',
    t.settingsTitle,
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: false, localResourceRoots: [] }
  );

  const config = vscode.workspace.getConfiguration('promptHub');
  const currentLanguage = config.get<string>('language', 'auto');
  const currentPasteDelay = config.get<number>('pasteDelay', 200);

  panel.webview.html = getHtml(t, currentLanguage, currentPasteDelay);

  panel.webview.onDidReceiveMessage(async (msg) => {
    if (msg.type === 'cancel') {
      panel.dispose();
      return;
    }

    if (msg.type === 'save') {
      const config = vscode.workspace.getConfiguration('promptHub');
      try {
        await config.update('language', msg.language, vscode.ConfigurationTarget.Global);
        await config.update('pasteDelay', msg.pasteDelay, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(t.settingsSaved);
        onSave();
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to save settings: ${String(err)}`);
      }
      panel.dispose();
    }
  }, undefined, context.subscriptions);
}

function getHtml(t: TranslationBundle, currentLanguage: string, currentPasteDelay: number): string {
  const nonce = randomUUID().replace(/-/g, '');

  return /* html */`<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.settingsTitle}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 32px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
    }
    
    .settings-container {
      width: 100%;
      max-width: 500px;
      background: var(--vscode-sideBar-background, rgba(30, 30, 30, 0.3));
      border: 1px solid var(--vscode-widget-border, rgba(128, 128, 128, 0.25));
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      backdrop-filter: blur(16px);
      transition: box-shadow 0.3s ease;
    }
    
    h1 {
      font-size: 1.3em;
      font-weight: 600;
      margin-bottom: 24px;
      border-bottom: 1px solid var(--vscode-widget-border, rgba(128, 128, 128, 0.15));
      padding-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .field {
      margin-bottom: 22px;
    }
    
    .field-label {
      display: block;
      font-size: 0.85em;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 6px;
    }
    
    .field-desc {
      font-size: 0.85em;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 10px;
      line-height: 1.4;
      opacity: 0.85;
    }
    
    select, input[type="number"] {
      width: 100%;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, rgba(128,128,128,0.4));
      border-radius: 6px;
      padding: 10px 12px;
      font: inherit;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    
    select:focus, input[type="number"]:focus {
      border-color: var(--vscode-focusBorder);
      box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.25);
    }
    
    .slider-container {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 8px;
    }
    
    input[type="range"] {
      flex: 1;
      accent-color: var(--vscode-button-background);
      cursor: pointer;
    }
    
    .delay-value {
      font-family: monospace;
      font-weight: 600;
      min-width: 55px;
      text-align: right;
      font-size: 1.05em;
    }

    .actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 32px;
      border-top: 1px solid var(--vscode-widget-border, rgba(128, 128, 128, 0.15));
      padding-top: 20px;
    }
    
    button {
      padding: 9px 24px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font: inherit;
      font-size: 0.9em;
      font-weight: 500;
      transition: transform 0.1s ease, background-color 0.15s ease;
    }
    
    button:active {
      transform: scale(0.97);
    }
    
    button.primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    
    button.primary:hover {
      background: var(--vscode-button-hoverBackground);
    }
    
    button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    
    button.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
  </style>
</head>
<body>
  <div class="settings-container">
    <h1>${t.settingsTitle}</h1>

    <div class="field">
      <label class="field-label" for="select-language">${t.languageLabel}</label>
      <div class="field-desc">${t.languageDescription}</div>
      <select id="select-language">
        <option value="auto">Auto (${vscode.env.language.startsWith('tr') ? 'Türkçe' : 'English'})</option>
        <option value="en">English</option>
        <option value="tr">Türkçe</option>
      </select>
    </div>

    <div class="field">
      <label class="field-label" for="inp-delay">${t.pasteDelayLabel}</label>
      <div class="field-desc">${t.pasteDelayDescription}</div>
      <div class="slider-container">
        <input type="range" id="slider-delay" min="0" max="1500" step="50" value="${currentPasteDelay}">
        <input type="number" id="inp-delay" min="0" max="2000" step="10" value="${currentPasteDelay}" style="width: 90px; text-align: center;">
        <span class="delay-value">ms</span>
      </div>
    </div>

    <div class="actions">
      <button class="secondary" id="btn-cancel">${t.cancelButton}</button>
      <button class="primary" id="btn-save">${t.saveButton}</button>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    const selectLanguage = document.getElementById('select-language');
    const sliderDelay = document.getElementById('slider-delay');
    const inpDelay = document.getElementById('inp-delay');
    const btnSave = document.getElementById('btn-save');
    const btnCancel = document.getElementById('btn-cancel');

    // Sync current values
    selectLanguage.value = "${currentLanguage}";

    // Bidirectional sync between slider and number input
    sliderDelay.addEventListener('input', (e) => {
      inpDelay.value = e.target.value;
    });

    inpDelay.addEventListener('input', (e) => {
      let val = parseInt(e.target.value) || 0;
      if (val < 0) val = 0;
      if (val > 2000) val = 2000;
      sliderDelay.value = val;
    });

    btnSave.addEventListener('click', () => {
      const language = selectLanguage.value;
      const pasteDelay = parseInt(inpDelay.value) || 0;

      vscode.postMessage({
        type: 'save',
        language,
        pasteDelay
      });
    });

    btnCancel.addEventListener('click', () => {
      vscode.postMessage({ type: 'cancel' });
    });
  </script>
</body>
</html>`;
}
