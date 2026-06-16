import * as vscode from 'vscode';
import { Prompt } from './types';
import * as fs from 'fs';

const STORAGE_KEY = 'prompts';

export function getPrompts(context: vscode.ExtensionContext): Prompt[] {
  return context.globalState.get<Prompt[]>(STORAGE_KEY, []);
}

export async function addPrompt(context: vscode.ExtensionContext, prompt: Prompt): Promise<void> {
  const prompts = getPrompts(context);
  prompts.push(prompt);
  await context.globalState.update(STORAGE_KEY, prompts);
}

export async function updatePrompt(
  context: vscode.ExtensionContext,
  id: string,
  updates: Partial<Pick<Prompt, 'title' | 'content' | 'imagePath' | 'imagePaths'>>
): Promise<void> {
  const prompts = getPrompts(context);
  const idx = prompts.findIndex((p) => p.id === id);
  if (idx === -1) return;

  const oldPrompt = prompts[idx];
  const oldPaths = oldPrompt.imagePaths || (oldPrompt.imagePath ? [oldPrompt.imagePath] : []);
  const newPaths = updates.imagePaths || (updates.imagePath ? [updates.imagePath] : []);

  // Delete orphaned image files from the disk
  for (const oldPath of oldPaths) {
    if (!newPaths.includes(oldPath)) {
      try {
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      } catch (err) {
        console.error(`[Prompt Hub] Failed to delete orphaned image file: ${oldPath}`, err);
      }
    }
  }

  prompts[idx] = { ...prompts[idx], ...updates };
  await context.globalState.update(STORAGE_KEY, prompts);
}

export async function deletePrompt(context: vscode.ExtensionContext, id: string): Promise<void> {
  const prompts = getPrompts(context);
  const toDelete = prompts.find((p) => p.id === id);

  // Delete all image files of the deleted prompt from the disk
  if (toDelete) {
    const paths = toDelete.imagePaths || (toDelete.imagePath ? [toDelete.imagePath] : []);
    for (const p of paths) {
      try {
        if (fs.existsSync(p)) {
          fs.unlinkSync(p);
        }
      } catch (err) {
        console.error(`[Prompt Hub] Failed to delete image file: ${p}`, err);
      }
    }
  }

  const remaining = prompts.filter((p) => p.id !== id);
  await context.globalState.update(STORAGE_KEY, remaining);
}
