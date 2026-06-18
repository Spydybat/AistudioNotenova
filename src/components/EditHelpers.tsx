/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Undo2, Redo2, 
  ArrowLeftRight
} from 'lucide-react';
import { EditorTheme } from '../types';

interface EditHelpersProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  wordWrap: boolean;
  onToggleWordWrap: () => void;
  theme: EditorTheme;
}

export default function EditHelpers({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  wordWrap,
  onToggleWordWrap,
  theme
}: EditHelpersProps) {
  const isClassic = theme === 'windows-classic';

  let btnStyle = '';
  if (isClassic) {
    btnStyle = 'windows-3d-button text-[11px] font-bold px-1.5 py-0.5 min-w-[28px] h-5.5 flex items-center justify-center cursor-pointer text-black disabled:opacity-40 disabled:pointer-events-none';
  } else if (theme === 'android-light') {
    btnStyle = 'p-2 text-slate-650 hover:text-slate-950 hover:bg-slate-205 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none';
  } else {
    btnStyle = 'p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none';
  }

  return (
    <div className={`p-1 flex items-center justify-between border-b overflow-x-auto select-none no-scrollbar ${
      isClassic 
        ? 'bg-[#c0c0c0] border-t border-[#dfdfdf] border-b-[#808080] gap-1' 
        : theme === 'android-light'
          ? 'bg-slate-100 border-slate-205 border-b-slate-205 gap-1.5'
          : 'bg-slate-950/40 border-slate-900 border-b-slate-900 gap-1.5'
    }`}>
      {/* Undo & Redo controls */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={btnStyle}
          title="Undo changes (Ctrl+Z)"
        >
          {isClassic ? 'Undo' : <Undo2 className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={btnStyle}
          title="Redo changes (Ctrl+Y)"
        >
          {isClassic ? 'Redo' : <Redo2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Retro divider spacer */}
      {isClassic && <div className="w-[2px] h-4 bg-zinc-400 border-l border-zinc-500 shrink-0 mx-1" />}



      {/* Searching and line wraps widgets */}
      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
        <button
          onClick={onToggleWordWrap}
          className={`${btnStyle} flex items-center ${
            isClassic 
              ? wordWrap ? 'bg-zinc-350 outline-dotted outline-blue-900/40' : ''
              : wordWrap 
                ? theme === 'android-light'
                  ? 'text-blue-700 hover:text-blue-800 bg-blue-100 hover:bg-blue-180 border border-blue-200 px-1.5 py-1 font-bold'
                  : 'text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/20 px-1.5 py-1'
                : 'px-1.5 py-1'
          }`}
          title="Toggle Word Wrap lines fit"
        >
          {isClassic ? (
            <span className={wordWrap ? 'font-bold' : ''}>Wrap</span>
          ) : (
            <div className="flex items-center gap-1 text-[11px] font-semibold">
              <ArrowLeftRight className="w-3 h-3" />
              <span className="hidden sm:inline">{wordWrap ? 'Wrap ON' : 'Wrap OFF'}</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
