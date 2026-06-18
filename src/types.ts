/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  isDraft?: boolean;
  inTrash?: boolean;
  trashedAt?: number;
  driveFileId?: string;
}

export type EditorTheme = 'windows-classic' | 'android-light' | 'android-dark' | 'obsidian-contrast';

export type FontStyle = 'monospace' | 'sans-serif' | 'serif' | 'friendly';

export interface EditorSettings {
  fontSize: number;
  fontFamily: FontStyle;
  theme: EditorTheme;
  lineSpacing: number; // multiplier, e.g. 1.2, 1.5, 2.0
  wordWrap: boolean;
}
