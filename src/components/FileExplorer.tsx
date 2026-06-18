/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  FileText, Plus, Search, Trash2, Download, Share2, 
  UploadCloud, X, FolderOpen, Save, Pencil, Check, RotateCcw,
  Settings
} from 'lucide-react';
import { Note, EditorTheme } from '../types';

interface FileExplorerProps {
  notes: Note[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onNewNote: () => void;
  onDeleteNote: (id: string) => void;
  onRestoreNote: (id: string) => void;
  onDeletePermanently: (id: string) => void;
  onRenameNote: (id: string, newTitle: string) => void;
  onImportNote: (title: string, content: string) => void;
  onExportNote: (note: Note) => void;
  onShareNote: (note: Note) => void;
  theme: EditorTheme;
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenTrash: () => void;
  activeStorage?: 'local' | 'drive';
}

export default function FileExplorer({
  notes,
  activeNoteId,
  onSelectNote,
  onNewNote,
  onDeleteNote,
  onRestoreNote,
  onDeletePermanently,
  onRenameNote,
  onImportNote,
  onExportNote,
  onShareNote,
  theme,
  isOpen,
  onClose,
  onOpenSettings,
  onOpenTrash,
  activeStorage = 'local'
}: FileExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isClassic = theme === 'windows-classic';

  // Split into active notes vs trashed notes
  const activeNotes = notes.filter(note => !note.inTrash);
  const trashedNotes = notes.filter(note => note.inTrash);

  // Search filter applies to active files
  const filteredNotes = activeNotes.filter(note => {
    const query = searchQuery.toLowerCase();
    return (
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query)
    );
  });

  // Handle local TXT file importing via File API
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string || '';
      // Strip out the extension to form the note title
      let title = file.name;
      if (!title.toLowerCase().endsWith('.txt')) {
        title = `${title}.txt`;
      }
      onImportNote(title, text);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const triggerImportClick = () => {
    fileInputRef.current?.click();
  };

  // Inline Rename controls
  const startRename = (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(note.id);
    setEditTitleValue(note.title);
  };

  const saveRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const finalized = editTitleValue.trim();
    if (finalized) {
      const withExt = finalized.toLowerCase().endsWith('.txt') ? finalized : `${finalized}.txt`;
      onRenameNote(id, withExt);
    }
    setEditingId(null);
  };

  const handleRenameKeyPress = (id: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const finalized = editTitleValue.trim();
      if (finalized) {
        const withExt = finalized.toLowerCase().endsWith('.txt') ? finalized : `${finalized}.txt`;
        onRenameNote(id, withExt);
      }
      setEditingId(null);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  return (
    <div 
      className={`absolute inset-y-0 left-0 w-80 max-w-[85vw] transform transition-transform duration-300 z-40 flex flex-col h-full shadow-2xl border-r ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } ${
        isClassic 
          ? 'bg-[#c0c0c0] border-[#808080] text-black font-mono' 
          : theme === 'android-light'
            ? 'bg-[#f8fafc] border-slate-200 text-slate-900'
            : 'bg-slate-900 border-slate-800 text-slate-100'
      }`}
    >
      {/* File Explorer Header */}
      <div className={`p-4 flex items-center justify-between border-b ${
        isClassic 
          ? 'bg-blue-800 text-white border-[#808080]' 
          : theme === 'android-light'
            ? 'bg-white text-slate-905 border-slate-200 shadow-sm'
            : 'bg-slate-950 text-white border-slate-800'
      }`}>
        <div className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 shrink-0" />
          <span className={`font-semibold tracking-tight ${isClassic ? 'text-[13px] uppercase' : 'text-sm'}`}>
            {isClassic ? 'Local Workspace Folder' : 'Workspace Files'}
          </span>
        </div>
        <button 
          onClick={onClose}
          className={`p-1 transition-all roundedCursor ${
            isClassic 
              ? 'windows-3d-button text-black p-0.5 hover:bg-slate-300 active:bg-slate-400' 
              : theme === 'android-light'
                ? 'hover:bg-slate-100 text-slate-600 hover:text-slate-950'
                : 'hover:bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Explorer Utility Action Ribbon */}
      <div className={`p-3 grid grid-cols-2 gap-2 border-b select-none ${
        isClassic
          ? 'border-light/10 bg-black/10'
          : theme === 'android-light'
            ? 'border-slate-200 bg-slate-100/60'
            : 'border-light/10 bg-black/10'
      }`}>
        <button
          onClick={onNewNote}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold cursor-pointer rounded-md transition-all ${
            isClassic 
              ? 'windows-3d-button text-black font-semibold' 
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow shadow-blue-900/30'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          New File
        </button>

        <button
          onClick={triggerImportClick}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold cursor-pointer rounded-md transition-all ${
            isClassic 
              ? 'windows-3d-button text-black' 
              : theme === 'android-light'
                ? 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-950 border border-slate-200 shadow-3xs'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
          title="Import any local TXT file from device storage"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          Import (.txt)
        </button>

        <button
          onClick={onOpenTrash}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold cursor-pointer rounded-md transition-all ${
            isClassic 
              ? 'windows-3d-button text-black' 
              : theme === 'android-light'
                ? 'bg-red-50 text-red-700 hover:text-red-800 border border-red-100 shadow-3xs'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
          Trash Bin ({trashedNotes.length})
        </button>

        <button
          onClick={onOpenSettings}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold cursor-pointer rounded-md transition-all ${
            isClassic 
              ? 'windows-3d-button text-black font-semibold' 
              : theme === 'android-light'
                ? 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-950 border border-slate-200 shadow-3xs'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          Settings
        </button>

        {/* Hidden system File Input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileImport}
          accept=".txt"
          className="hidden" 
        />
      </div>

      {/* Local Index File Keywords Filtering Search Box */}
      <div className={`p-3 border-b ${
        isClassic ? 'border-light/5' : theme === 'android-light' ? 'border-slate-200 bg-white/40' : 'border-light/5'
      }`}>
        <div className="relative">
          <Search className={`absolute left-3 top-2.5 w-4 h-4 ${
            isClassic ? 'text-zinc-650' : theme === 'android-light' ? 'text-slate-500' : 'text-slate-500'
          }`} />
          <input
            type="text"
            placeholder="Search notes / content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full py-1.5 pl-9 pr-8 text-xs outline-none transition-all ${
              isClassic 
                ? 'windows-3d-inset bg-white text-black font-mono border-none h-8' 
                : theme === 'android-light'
                  ? 'bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/10 h-9 shadow-3xs'
                  : 'bg-slate-950 border border-slate-850 rounded-lg text-slate-200 placeholder-slate-500 focus:border-blue-500 h-9'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`absolute right-2.5 top-2.5 transition-colors ${
                theme === 'android-light' ? 'text-slate-450 hover:text-slate-900' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Saved Notes List Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-8 px-4 text-xs select-none">
            {searchQuery ? (
              <p className={isClassic ? 'text-zinc-700' : theme === 'android-light' ? 'text-slate-600 font-medium' : 'text-slate-500'}>No matching files found.</p>
            ) : (
              <p className={isClassic ? 'text-zinc-700' : theme === 'android-light' ? 'text-slate-605 font-medium leading-relaxed' : 'text-slate-500'}>
                No files in workspace.<br />Click 'New File' or 'Import' to start writing.
              </p>
            )}
          </div>
        ) : (
          filteredNotes.map((note) => {
            const isActive = note.id === activeNoteId;
            const isEditingTitle = editingId === note.id;

            return (
              <div
                key={note.id}
                onClick={() => {
                  if (!isEditingTitle) onSelectNote(note.id);
                }}
                className={`group flex flex-col p-2.5 rounded-lg border cursor-pointer select-none transition-all ${
                  isActive 
                    ? isClassic 
                      ? 'bg-blue-800 !text-white border-blue-900 border-dotted' 
                      : theme === 'android-light'
                        ? 'bg-blue-50/90 border-blue-250 text-blue-800 shadow-sm'
                        : 'bg-blue-600/15 border-blue-500/40 text-blue-400'
                    : isClassic 
                      ? 'bg-white text-black border-transparent hover:border-zinc-400' 
                      : theme === 'android-light'
                        ? 'bg-white/80 border-slate-200/60 hover:border-slate-300 hover:bg-slate-50 text-slate-700 hover:text-slate-950 shadow-3xs'
                        : 'bg-slate-950/40 border-slate-900/30 hover:border-slate-800/80 text-slate-300 hover:bg-slate-900/40'
                }`}
              >
                {/* Filename Layout */}
                <div className="flex items-center justify-between gap-1 w-full relative">
                  <div className="flex items-center gap-2 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                    <FileText className={`w-4 h-4 shrink-0 ${
                      isActive 
                        ? isClassic ? 'text-white' : theme === 'android-light' ? 'text-blue-600' : 'text-blue-400' 
                        : isClassic ? 'text-zinc-700' : theme === 'android-light' ? 'text-slate-500' : 'text-slate-500'
                    }`} />
                    
                    {isEditingTitle ? (
                      <input
                        type="text"
                        value={editTitleValue}
                        onChange={(e) => setEditTitleValue(e.target.value)}
                        onBlur={(e) => saveRename(note.id, e as any)}
                        onKeyDown={(e) => handleRenameKeyPress(note.id, e)}
                        autoFocus
                        className={`w-full py-0.5 px-1 text-xs font-semibold select-all text-black outline-none border border-blue-500 ${
                          isClassic ? 'bg-white font-mono' : 'bg-slate-100 rounded'
                        }`}
                      />
                    ) : (
                      <span className={`text-xs font-semibold truncate select-none ${
                        isActive 
                          ? isClassic ? 'text-white' : theme === 'android-light' ? 'text-blue-950 font-bold' : ''
                          : theme === 'android-light' ? 'text-slate-800' : ''
                      }`}>
                        {note.title}
                      </span>
                    )}
                  </div>

                  {/* Operational Controls for Workspace files */}
                  {!isEditingTitle && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-inherit pl-2 shrink-0">
                      {/* Rename Trigger */}
                      <button
                        onClick={(e) => startRename(note, e)}
                        className={`p-1 rounded cursor-pointer ${
                          isClassic 
                            ? 'hover:bg-zinc-200 active:bg-zinc-300 text-black' 
                            : theme === 'android-light'
                              ? 'hover:bg-slate-205 hover:bg-slate-200/60 text-slate-650 hover:text-slate-950'
                              : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                        title="Rename document"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>

                      {/* Export Trigger */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onExportNote(note);
                        }}
                        className={`p-1 rounded cursor-pointer ${
                          isClassic 
                            ? 'hover:bg-zinc-200 active:bg-zinc-300 text-black' 
                            : theme === 'android-light'
                              ? 'hover:bg-slate-205 hover:bg-slate-200/60 text-slate-650 hover:text-slate-950'
                              : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                        title="Export download as TXT"
                      >
                        <Download className="w-3 h-3" />
                      </button>

                      {/* Share Trigger */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onShareNote(note);
                        }}
                        className={`p-1 rounded cursor-pointer ${
                          isClassic 
                            ? 'hover:bg-zinc-200 active:bg-zinc-300 text-black' 
                            : theme === 'android-light'
                              ? 'hover:bg-slate-205 hover:bg-slate-200/60 text-slate-650 hover:text-slate-950'
                              : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                        title="Share document contents"
                      >
                        <Share2 className="w-3 h-3" />
                      </button>

                      {/* Delete Trigger */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteNote(note.id);
                        }}
                        className={`p-1 rounded cursor-pointer ${
                          isClassic 
                            ? 'hover:bg-red-200 text-red-700 active:bg-red-300' 
                            : theme === 'android-light'
                              ? 'hover:bg-red-100 text-red-600 hover:text-red-705'
                              : 'hover:bg-red-950/75 text-red-400 hover:text-red-350'
                        }`}
                        title="Move to Trash"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Active rename save trigger */}
                  {isEditingTitle && (
                    <button
                      onClick={(e) => saveRename(note.id, e)}
                      onMouseDown={(e) => e.preventDefault()} // prevents early blur
                      className={`p-1 text-emerald-500 hover:text-emerald-400 rounded shrink-0`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Subtitle Meta Line */}
                <div className="flex items-center justify-between text-[10px] mt-1.5 select-none shrink-0" onClick={e => e.stopPropagation()}>
                  <span className={
                    isActive 
                      ? isClassic ? 'text-blue-200' : theme === 'android-light' ? 'text-blue-750/80' : 'text-blue-400/70'
                      : isClassic ? 'text-zinc-500' : theme === 'android-light' ? 'text-slate-500 font-medium' : 'text-slate-500'
                  }>
                    {new Date(note.updatedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  {note.isDraft && (
                    <span className={`px-1 rounded ${
                      theme === 'android-light'
                        ? 'bg-amber-100 text-amber-805 border border-amber-200 font-medium'
                        : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    }`}>
                      Autosaved
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Inline Trash Bin list (converted to popup) */}
        {false && (
          <div className={`mt-4 pt-3 border-t border-dashed ${isClassic ? 'border-zinc-400' : 'border-slate-200 dark:border-slate-800'}`}>
            <div className={`px-2 pb-2 text-[10px] font-bold uppercase tracking-wider ${
              isClassic ? 'text-zinc-700' : theme === 'android-light' ? 'text-slate-600' : 'text-slate-500'
            }`}>
              Files in Trash ({trashedNotes.length})
            </div>
            {trashedNotes.length === 0 ? (
              <div className={`text-center py-4 text-[11px] select-none ${
                theme === 'android-light' ? 'text-slate-500' : 'text-zinc-500'
              }`}>
                Trash is empty.
              </div>
            ) : (
              <div className="space-y-1.5">
                {trashedNotes.map(note => {
                  const daysLeft = note.trashedAt
                    ? Math.max(1, 15 - Math.floor((Date.now() - note.trashedAt) / (24 * 60 * 60 * 1000)))
                    : 15;
                  return (
                    <div
                      key={note.id}
                      className={`flex items-center justify-between p-2 rounded-lg border gap-1 select-none ${
                        isClassic
                          ? 'bg-white border-zinc-300 text-black font-mono text-[11px]'
                          : theme === 'android-light'
                            ? 'bg-white border-slate-200 text-slate-850 text-[11px] shadow-3xs'
                            : 'bg-slate-950/60 border-slate-850 text-slate-300 text-[11px]'
                      }`}
                    >
                      <div className="truncate font-semibold flex-1 pl-1 min-w-0 flex flex-col" title={note.title}>
                        <span className="truncate">{note.title}</span>
                        <span className={`text-[9px] font-semibold mt-0.5 ${theme === 'android-light' ? 'text-red-600' : 'text-red-550'}`}>
                          {daysLeft} days left
                        </span>
                      </div>

                      {confirmDeleteId === note.id ? (
                        <div className="flex items-center gap-1 animate-pulse shrink-0">
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${theme === 'android-light' ? 'text-red-600' : 'text-red-400'}`}>Sure?</span>
                          <button
                            onClick={() => {
                              onDeletePermanently(note.id);
                              setConfirmDeleteId(null);
                            }}
                            className={`p-1 rounded transition-all cursor-pointer ${
                              isClassic
                                ? 'hover:bg-red-200 text-red-700 font-bold border border-red-800'
                                : theme === 'android-light'
                                  ? 'bg-red-50 hover:bg-red-100 text-red-600'
                                  : 'bg-red-950/45 hover:bg-red-900 text-red-400'
                            }`}
                            title="Confirm Permanent Deletion"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className={`p-1 rounded transition-all cursor-pointer ${
                              isClassic
                                ? 'hover:bg-zinc-200 text-black border border-zinc-400'
                                : theme === 'android-light'
                                  ? 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                            }`}
                            title="Cancel deletion"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Restore Option */}
                          <button
                            onClick={() => onRestoreNote(note.id)}
                            className={`p-1 rounded transition-all cursor-pointer ${
                              isClassic
                                ? 'hover:bg-zinc-200 text-blue-800'
                                : theme === 'android-light'
                                  ? 'hover:bg-slate-100 text-blue-600 hover:text-blue-800'
                                  : 'hover:bg-slate-800 text-blue-400 hover:text-blue-300'
                            }`}
                            title="Restore File to Workspace"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>

                          {/* Permanently Delete Option */}
                          <button
                            onClick={() => setConfirmDeleteId(note.id)}
                            className={`p-1 rounded transition-all cursor-pointer ${
                              isClassic
                                ? 'hover:bg-red-100 text-red-700'
                                : theme === 'android-light'
                                  ? 'hover:bg-red-50 text-red-600 hover:text-red-800'
                                  : 'hover:bg-red-950/50 text-red-400 hover:text-red-300'
                            }`}
                            title="Delete Permanently"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className={`p-3 text-[10px] border-t select-none ${
        isClassic 
          ? 'bg-[#c0c0c0] border-[#808080] text-zinc-700' 
          : theme === 'android-light'
            ? 'bg-slate-100/60 border-slate-200 text-slate-600 font-medium'
            : 'bg-slate-950 border-slate-850 text-slate-500'
      }`}>
        <div className="flex justify-between items-center">
          <span>Active files: {activeNotes.length}</span>
          <span>Storage: {activeStorage === 'drive' ? 'Google Drive' : 'Offline Local'}</span>
        </div>
      </div>
    </div>
  );
}
