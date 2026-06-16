import * as vscode from 'vscode';
import { Prompt } from './types';

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
  updates: Partial<Pick<Prompt, 'title' | 'content' | 'imagePath'>>
): Promise<void> {
  const prompts = getPrompts(context);
  const idx = prompts.findIndex((p) => p.id === id);
  if (idx === -1) return;
  prompts[idx] = { ...prompts[idx], ...updates };
  await context.globalState.update(STORAGE_KEY, prompts);
}

export async function deletePrompt(context: vscode.ExtensionContext, id: string): Promise<void> {
  const prompts = getPrompts(context).filter((p) => p.id !== id);
  await context.globalState.update(STORAGE_KEY, prompts);
}
