# Prompt Hub 🚀

Save, organize, and instantly copy your reusable AI prompts (with text and image support) from a dedicated VS Code sidebar directly into AI chat assistants.

---

## ✨ Features

- **📁 Prompt Management:** Save your recurring and complex AI prompt templates with custom titles and content.
- **🖼️ Multimodal Support:** Attach screenshots and image files to your prompts via clipboard paste (`Ctrl+V`), drag & drop, or file browsing.
- **🤖 Deep AI Chat Integration:**
  - **Auto Context Attachment:** Images are automatically attached as a "context" file in supported chat panels (e.g., Antigravity IDE).
  - **Clipboard Copying:** Prompt text is instantly copied to the clipboard.
  - **Smart Pasting:** Simulates `Ctrl+V` after a customizable delay, automatically pasting your prompt into the active chat input field.
- **🖱️ Drag & Drop:** Drag prompt items directly from the sidebar tree view and drop them into any active text editor or chat pane.
- **✅ Archiving Completed Prompts:** Mark prompts as completed to archive them in a separate view, maintaining a clean and focused workspace.
- **🌐 Dual-Language UI:** Built-in localization support for English and Turkish, auto-detecting your VS Code display language or allowing manual override.

---

## 🛠️ Installation

Since Prompt Hub is under local development, you can use or install it with the following methods:

### Method 1: Run via Extension Development Host (Developer Mode)

1. Clone or download this repository.
2. Open the project folder in VS Code.
3. Open the terminal and install the dependencies:
   ```bash
   npm install
   ```
4. Compile the source code:
   ```bash
   npm run compile
   ```
5. Press `F5` to start debugging. A new **Extension Development Host** window will open with the extension loaded.

### Method 2: Build & Install VSIX Package (Permanent Local Installation)

1. Install `vsce` (VS Code Extension Manager) globally:
   ```bash
   npm install -g @vscode/vsce
   ```
2. Run the packaging command in the root folder:
   ```bash
   vsce package
   ```
   *This command creates a `prompt-hub-1.0.0.vsix` file in the root directory.*
3. Open the VS Code **Extensions** view (`Ctrl+Shift+X`).
4. Click the ellipsis button (`...`) at the top right of the Extensions view.
5. Select **Install from VSIX...**, and choose the generated `.vsix` file.

---

## 💡 How to Use

1. Click the **Prompt Hub** icon in the VS Code Activity Bar (Sidebar).
2. Click the **`+`** (Add Prompt) button in the header of the "My Prompts" section.
3. In the Webview panel, enter the prompt **Title** and **Content**.
4. *(Optional)* Add images by pasting screenshots (`Ctrl+V`) or dragging files into the Webview page.
5. Click **Save**.
6. Select any prompt in the tree view list:
   - Associated images will be attached to the AI chat session as context.
   - Prompt text will copy to the clipboard.
   - The sidebar chat window is focused, and the prompt text is automatically pasted after the configured delay.
7. Click the checkmark icon next to a prompt to mark it as completed and archive it.

---

## ⚙️ Extension Settings

Prompt Hub contributes the following settings under VS Code Configuration:

- `promptHub.language`: Preferred language for the Prompt Hub interface. Options: `auto` (detects VS Code language), `en` (English), or `tr` (Turkish). (Default: `auto`)
- `promptHub.pasteDelay`: The duration of delay (in milliseconds) before simulating the `Ctrl+V` keyboard shortcut to paste text. (Default: `200ms`)

---

## 📋 Requirements & Platform Support

* **VS Code version:** `1.85.0` or higher.
* **Platform Support:** Clipboard image copying and automation features are optimized for **Windows** (`win32`) using PowerShell integration.

---
*Developed with ❤️ by [rhodofer](https://github.com/rhodofer).*
