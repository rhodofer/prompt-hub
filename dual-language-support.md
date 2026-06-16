# Dual Language Support Plan

## Goal
Add dual language (English / Turkish) support to the Prompt Hub extension UI, notifications, and webview forms.

## Tasks
- [ ] Task 1: Add `promptHub.language` config in `package.json` with values `["auto", "en", "tr"]` (default `"auto"`).
- [ ] Task 2: Create `src/localization.ts` containing translation dictionaries for English (`en`) and Turkish (`tr`), with helper methods targeting VS Code configuration and `vscode.env.language`.
- [ ] Task 3: Refactor `src/promptWebview.ts` to load translations and inject localized strings (labels, placeholders, buttons) into the HTML template.
- [ ] Task 4: Refactor `src/extension.ts` to use localized notifications, dialog titles, and automatically generate either `"Image Prompt"` or `"Görsel Prompt"`.
- [ ] Task 5: Run `npm run compile` to build the extension and verify TypeScript compiler errors.
- [ ] Task 6: Commit and push changes to GitHub.

## Done When
- The settings include the language option.
- The webview UI and info notifications render correctly in Turkish/English based on VS Code language or setting override.
- Build compiles successfully.
