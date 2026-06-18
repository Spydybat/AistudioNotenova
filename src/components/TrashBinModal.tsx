/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Trash2, RotateCcw, Check } from 'lucide-react';
import { Note, EditorTheme } from '../types';

interface TrashBinModalProps {
  isOpen: boolean;
  notes: Note[];
  theme: EditorTheme;
  onClose: () => void;
  onRestoreNote: (id: string) => void;
  onDeletePermanently: (id: string) => void;
}

export default function TrashBinModal({
  isOpen,
  notes,
  theme,
  onClose,
  onRestoreNote,
  onDeletePermanently
}: TrashBinModalProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const isClassic = theme === 'windows-classic';

  // Extract deleted files from notes index
  const trashedNotes = notes.filter(note => note.inTrash);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      {isClassic ? (
        /* Win98 styled parameters panels */
        <div className="w-full max-w-[420px] windows-3d-box p-1 text-black font-mono select-none my-8">
          {/* Blue Title banner */}
          <div className="bg-blue-800 text-white flex justify-between items-center px-2 py-1 font-bold text-xs animate-none">
            <span className="flex items-center gap-1.5 uppercase font-mono">
              <Trash2 className="w-3.5 h-3.5 text-white" />
              Trash Bin Property File
            </span>
            <button 
              onClick={onClose}
              className="windows-3d-button text-black w-4 h-4 p-0 ml-2 hover:bg-slate-300 font-bold flex items-center justify-center text-[10px]"
            >
              x
            </button>
          </div>

          <div className="p-3 space-y-4 max-h-[85vh] overflow-y-auto">
            {/* Storage directory layout */}
            <fieldset className="border border-zinc-400 p-2.5 rounded-sm space-y-2">
              <legend className="px-1 font-bold text-[11px] text-blue-900">Deleted Documents (.txt)</legend>
              <p className="text-[10px] text-zinc-600 font-mono leading-relaxed pb-1 select-none">
                NoteNova retains deleted text files for 15 days before permanent, automated local eradication.
              </p>

              <div className="bg-white border border-zinc-400 max-h-[220px] overflow-y-auto p-1 font-mono text-[11px] space-y-1">
                {trashedNotes.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 text-[10px] select-none">
                    Trash is empty.
                  </div>
                ) : (
                  trashedNotes.map(note => {
                    const daysLeft = note.trashedAt
                      ? Math.max(1, 15 - Math.floor((Date.now() - note.trashedAt) / (24 * 60 * 60 * 1000)))
                      : 15;
                    return (
                      <div
                        key={note.id}
                        className="flex items-center justify-between p-1.5 bg-zinc-50 border-b border-zinc-200 text-black text-[11px] select-none gap-2"
                      >
                        <div className="truncate font-bold flex-1 pl-1 min-w-0 flex flex-col" title={note.title}>
                          <span className="truncate">{note.title}</span>
                          <span className="text-[9px] text-red-700 font-semibold mt-0.5">
                            {daysLeft} days left
                          </span>
                        </div>

                        {confirmDeleteId === note.id ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[9px] font-bold text-red-800 uppercase pr-0.5">Sure?</span>
                            <button
                              onClick={() => {
                                onDeletePermanently(note.id);
                                setConfirmDeleteId(null);
                              }}
                              className="windows-3d-button text-red-800 font-bold w-5 h-5 p-0 flex items-center justify-center hover:bg-red-50 text-[10px]"
                              title="Delete permanently"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="windows-3d-button text-black w-5 h-5 p-0 flex items-center justify-center hover:bg-slate-200 text-[10px]"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => onRestoreNote(note.id)}
                              className="windows-3d-button text-blue-900 w-5 h-5 p-0 flex items-center justify-center hover:bg-slate-200 text-[10px]"
                              title="Restore document"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(note.id)}
                              className="windows-3d-button text-red-850 w-5 h-5 p-0 flex items-center justify-center hover:bg-red-50 text-[10px]"
                              title="Delete permanently"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </fieldset>

            {/* Close action ribbon */}
            <div className="flex justify-end pt-1">
              <button
                onClick={onClose}
                className="windows-3d-button text-xs py-1.5 px-6 font-bold cursor-pointer text-center"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Sleek Modern Material Design panel wrapper */
        <div className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl relative my-8 border ${
          theme === 'android-light'
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}>
          <div className={`flex items-center justify-between mb-5 select-none ${
            theme === 'android-light' ? 'text-slate-900' : 'text-slate-50'
          }`}>
            <h2 className={`text-sm font-bold flex items-center gap-2 ${
              theme === 'android-light' ? 'text-slate-900' : 'text-white'
            }`}>
              <Trash2 className="w-4.5 h-4.5 text-red-500 animate-none shrink-0" />
              Trash Bin
            </h2>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                theme === 'android-light'
                  ? 'hover:bg-slate-105 hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className={`space-y-6 max-h-[80vh] overflow-y-auto pr-1 no-scrollbar ${
            theme === 'android-light' ? 'text-slate-800' : 'text-slate-101'
          }`}>
            <div className={`space-y-3 p-4 border rounded-2xl ${
              theme === 'android-light'
                ? 'bg-slate-50 border-slate-200'
                : 'bg-slate-955/60 border-slate-850'
            }`}>
              <label className={`text-[10px] font-bold tracking-wider uppercase flex items-center justify-between ${
                theme === 'android-light' ? 'text-slate-500' : 'text-slate-400'
              }`}>
                <span>Files inside Trash Can</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                  trashedNotes.length > 0
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : theme === 'android-light'
                      ? 'bg-slate-200 text-slate-600 border border-slate-300'
                      : 'bg-slate-900 border border-slate-800 text-slate-500'
                }`}>
                  {trashedNotes.length} pending
                </span>
              </label>

              <p className={`text-[11px] leading-relaxed select-hidden ${
                theme === 'android-light' ? 'text-slate-600 font-medium' : 'text-slate-400 font-sans'
              }`}>
                Files in the trash will automatically expire and be deleted from local memory permanently after 15 days.
              </p>

              {/* Scrollable deleted files list */}
              <div className={`p-1.5 rounded-xl border max-h-[220px] overflow-y-auto space-y-1 ${
                theme === 'android-light'
                  ? 'bg-white border-slate-200 text-slate-900 shadow-inner'
                  : 'bg-slate-955 border border-slate-850/85'
              }`}>
                {trashedNotes.length === 0 ? (
                  <div className={`text-center py-8 text-[11px] select-none leading-relaxed font-sans px-3 ${
                    theme === 'android-light' ? 'text-slate-450' : 'text-slate-500'
                  }`}>
                    Trash is empty. No files removed recently.
                  </div>
                ) : (
                  trashedNotes.map(note => {
                    const daysLeft = note.trashedAt
                      ? Math.max(1, 15 - Math.floor((Date.now() - note.trashedAt) / (24 * 60 * 60 * 1000)))
                      : 15;
                    return (
                      <div
                        key={note.id}
                        className={`flex items-center justify-between border p-2.5 rounded-lg gap-2 transition-colors ${
                          theme === 'android-light'
                            ? 'bg-slate-50 border-slate-200/60 hover:bg-slate-100'
                            : 'bg-slate-900/30 border-slate-855/40 hover:bg-slate-905/65'
                        }`}
                      >
                        <div className="min-w-0 flex-1 truncate select-none leading-none">
                          <p className={`text-[11px] font-semibold truncate ${
                            theme === 'android-light' ? 'text-slate-800' : 'text-slate-300'
                          }`} title={note.title}>
                            {note.title}
                          </p>
                          <span className={`text-[8px] inline-block mt-1 font-bold ${
                            theme === 'android-light' ? 'text-red-600' : 'text-red-400'
                          }`}>
                            {daysLeft} days left
                          </span>
                        </div>

                        {confirmDeleteId === note.id ? (
                          <div className="flex items-center gap-1 shrink-0 animate-pulse">
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${
                              theme === 'android-light' ? 'text-red-650' : 'text-red-400'
                            }`}>Sure?</span>
                            <button
                              onClick={() => {
                                onDeletePermanently(note.id);
                                setConfirmDeleteId(null);
                              }}
                              className={`p-1.5 border rounded-lg cursor-pointer transition-colors ${
                                theme === 'android-light'
                                  ? 'bg-red-50 hover:bg-red-100 border-red-200 text-red-700'
                                  : 'bg-red-950/45 hover:bg-red-900 border-red-900/30 text-red-400'
                              }`}
                              title="Confirm Delete"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className={`p-1.5 border rounded-lg cursor-pointer transition-colors ${
                                theme === 'android-light'
                                  ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400'
                              }`}
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => onRestoreNote(note.id)}
                              className={`p-1.5 border rounded-lg cursor-pointer transition-colors ${
                                theme === 'android-light'
                                  ? 'hover:bg-blue-50 border-slate-202 hover:border-blue-200 text-blue-600 hover:text-blue-800'
                                  : 'hover:bg-blue-955/40 border border-slate-850 hover:border-blue-900/30 text-blue-455 hover:text-blue-300'
                              }`}
                              title="Restore to Workspace"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(note.id)}
                              className={`p-1.5 border rounded-lg cursor-pointer transition-colors ${
                                theme === 'android-light'
                                  ? 'hover:bg-red-50 border-slate-202 hover:border-red-200 text-red-650 hover:text-red-700'
                                  : 'hover:bg-red-955/40 border border-slate-850 hover:border-red-900/30 text-red-400 hover:text-red-350'
                              }`}
                              title="Delete permanently"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Done bottom button */}
            <button
              onClick={onClose}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs select-none font-semibold py-3 rounded-xl transition-all shadow-md shadow-blue-900/30 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
