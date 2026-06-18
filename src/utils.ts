/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Note, EditorSettings } from './types';

// Default files setup to provide a rich first-run experience that is fully interactive and editable
export const DEFAULT_NOTES: Note[] = [
  {
    id: 'welcome-note',
    title: 'Welcome to Notepad.txt',
    content: `=========================================
WINDOWS NOTEPAD CLONE - MOBILE APP
=========================================

Welcome to your offline-first text editor! This application brings the classic, distraction-free simplicity of desktop Windows Notepad to a highly responsive, mobile-oriented Material Design experience.

Key Features Built-In:
-----------------------------------------
✦ Complete File Operations: Create, edit, rename, and delete notes.
✦ Seamless Import/Export: Import existing .txt files from your device and export files directly back to your local folder.
✦ Total Autosave & Disaster Recovery: The editor automatically saves while you type. Restores last editing session automatically—even after a crash!
✦ Rich Theme Options: Toggle instantly between retro "Windows Classic" win98 style and modern "Android Light/Dark" material layouts.
✦ Typography Settings: Adjust font size, line spacing, font family, and word wrap instantly.

How to edit:
Just start typing here! Any changes are saved instantly in your offline persistent workspace.

Try exporting this file using the "File -> Export as TXT" menu to save it onto your local device storage!`,
    createdAt: Date.now() - 1000 * 60 * 60, // 1 hour ago
    updatedAt: Date.now() - 1000 * 60 * 60,
  },
  {
    id: 'android-shortcuts',
    title: 'Notepad Mobile Tips.txt',
    content: `QUICK TIPS FOR NOTEPAD MOBILE
-----------------------------

1. Quick Shortcuts Bar
Use the helper overlay pill at the top of the editor for quick clipboard and formatting actions without having to wrestle with virtual keyboard selections:
• Undo (↺) & Redo (↻)
• Copy (❏)
• Paste (📋)
• Select All (∀)

2. Folder Toggle
To get more writing space on small mobile screens:
• In Android mode: swipe or tap the left-drawer button.
• In Windows Classic mode: click the sidebar button on the Status Bar or use 'View -> Toggle Sidebar'.

3. Word Wrap
If lines are clipping off the screen, you can toggle 'Word Wrap' in the Format settings. When enabled, your text wraps cleanly; when disabled, you get horizontal scrolling—essential for code or structured tabular files.`,
    createdAt: Date.now() - 1000 * 60 * 30, // 30 mins ago
    updatedAt: Date.now() - 1000 * 60 * 30,
  }
];

export const INITIAL_SETTINGS: EditorSettings = {
  fontSize: 14,
  fontFamily: 'monospace',
  theme: 'android-dark',
  lineSpacing: 1.4,
  wordWrap: true,
};

// Generates a simple UUID-like string for notes
export function generateId(): string {
  return 'note_' + Math.random().toString(36).substring(2, 11);
}

// Download TXT file client-side
export function downloadTxtFile(title: string, content: string) {
  const cleanTitle = title.endsWith('.txt') ? title : `${title}.txt`;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = cleanTitle;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Safely retrieve notes from LocalStorage
export function loadSavedNotes(): Note[] {
  try {
    const saved = localStorage.getItem('notepad_notes');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load notes from localStorage:', e);
  }
  // Initialize with defaults if none exist
  saveNotesToStorage(DEFAULT_NOTES);
  return DEFAULT_NOTES;
}

// Save notes list directly to local storage
export function saveNotesToStorage(notes: Note[]) {
  try {
    localStorage.setItem('notepad_notes', JSON.stringify(notes));
  } catch (e) {
    console.error('Failed to save notes to localStorage:', e);
  }
}

// Load and save settings
export function loadEditorSettings(): EditorSettings {
  try {
    const saved = localStorage.getItem('notepad_settings');
    if (saved) {
      return { ...INITIAL_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return INITIAL_SETTINGS;
}

export function saveEditorSettings(settings: EditorSettings) {
  try {
    localStorage.setItem('notepad_settings', JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

// Load and save last active note session id
export function loadLastActiveNoteId(): string | null {
  return localStorage.getItem('notepad_last_active_id');
}

export function saveLastActiveNoteId(id: string | null) {
  if (id) {
    localStorage.setItem('notepad_last_active_id', id);
  } else {
    localStorage.removeItem('notepad_last_active_id');
  }
}
