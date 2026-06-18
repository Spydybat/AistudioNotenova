/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  X, Sliders, SunMoon, Cloud, RefreshCw, Trash2, User, FolderOpen, LogOut
} from 'lucide-react';
import { EditorSettings, EditorTheme, FontStyle } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  settings: EditorSettings;
  onChangeSettings: (settings: EditorSettings) => void;
  onClose: () => void;
  
  // Google Drive connection parameters
  storageChoice: 'local' | 'drive' | null;
  onSetStorageChoice: (choice: 'local' | 'drive') => void;
  driveUser: any | null;                 // Authenticated User profile
  driveFiles: any[];                     // List of synced files in NoteNova folder
  isDriveLoading: boolean;
  onConnectDrive: () => void;
  onDisconnectDrive: () => void;
  onRefreshDriveFiles: () => void;
  onDeleteDriveFile: (fileId: string, name: string) => void;
}

export default function SettingsModal({
  isOpen,
  settings,
  onChangeSettings,
  onClose,
  storageChoice,
  onSetStorageChoice,
  driveUser,
  driveFiles,
  isDriveLoading,
  onConnectDrive,
  onDisconnectDrive,
  onRefreshDriveFiles,
  onDeleteDriveFile
}: SettingsModalProps) {
  if (!isOpen) return null;

  const isClassic = settings.theme === 'windows-classic';

  const updateSetting = <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
    onChangeSettings({
      ...settings,
      [key]: value,
    });
  };

  const themesList: { value: EditorTheme; label: string; preview: string }[] = [
    { value: 'windows-classic', label: 'Windows Classic (98/XP)', preview: 'bg-[#c0c0c0] border-black text-black' },
    { value: 'android-dark', label: 'Material Dark Charcoal', preview: 'bg-slate-900 border-slate-800 text-white' },
    { value: 'android-light', label: 'Material Soft Alabaster', preview: 'bg-slate-50 border-slate-200 text-slate-900 border' },
    { value: 'obsidian-contrast', label: 'High Contrast Obsidian', preview: 'bg-black border-yellow-500 text-yellow-450 border' },
  ];

  const fontsList: { value: FontStyle; label: string; familyClass: string }[] = [
    { value: 'monospace', label: 'Classic Monospace (JetBrains Mono)', familyClass: 'font-mono' },
    { value: 'sans-serif', label: 'Standard Interface (Inter)', familyClass: 'font-sans' },
    { value: 'serif', label: 'Editorial Typewriter (Playfair)', familyClass: 'font-serif' },
    { value: 'friendly', label: 'Cursive Friendly (Playpen)', familyClass: 'font-friendly' },
  ];

  // Helper to check if theme is dark
  const isDark = settings.theme === 'android-dark' || settings.theme === 'obsidian-contrast';

  const togglePrimaryTheme = (mode: 'light' | 'dark') => {
    if (mode === 'dark') {
      updateSetting('theme', 'android-dark');
    } else {
      updateSetting('theme', 'android-light');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      {isClassic ? (
        /* Win98 styled parameters panels */
        <div className="w-full max-w-[420px] windows-3d-box p-1 text-black font-mono select-none my-8">
          {/* Blue Title banner */}
          <div className="bg-blue-800 text-white flex justify-between items-center px-2 py-1 font-bold text-xs">
            <span className="flex items-center gap-1.5 uppercase">
              <Sliders className="w-3.5 h-3.5" />
              Notepad Properties
            </span>
            <button 
              onClick={onClose}
              className="windows-3d-button text-black w-4 h-4 p-0 ml-2 hover:bg-slate-300 font-bold flex items-center justify-center text-[10px]"
            >
              x
            </button>
          </div>

          <div className="p-3 space-y-4 max-h-[85vh] overflow-y-auto">
            {/* Primary default Theme toggle */}
            <fieldset className="border border-zinc-400 p-2.5 rounded-sm">
              <legend className="px-1 font-bold text-[11px] text-blue-900">Default Theme (Instant)</legend>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => togglePrimaryTheme('dark')}
                  className={`windows-3d-button py-1 text-xs font-bold cursor-pointer text-center ${
                    isDark ? 'bg-zinc-350 outline-dotted outline-blue-900' : ''
                  }`}
                >
                  Dark Mode
                </button>
                <button
                  type="button"
                  onClick={() => togglePrimaryTheme('light')}
                  className={`windows-3d-button py-1 text-xs font-bold cursor-pointer text-center ${
                    !isDark ? 'bg-zinc-350 outline-dotted outline-blue-900' : ''
                  }`}
                >
                  Light Mode
                </button>
              </div>
            </fieldset>

            {/* Google Drive Connection box */}
            <fieldset className="border border-zinc-400 p-2.5 rounded-sm space-y-2">
              <legend className="px-1 font-bold text-[11px] text-blue-900">Google Drive Storage</legend>
              
              {driveUser ? (
                <div className="space-y-2.5">
                  <div className="bg-white p-2 border border-zinc-400 text-[11px] space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                      <Cloud className="w-3.5 h-3.5" />
                      <span>Connected to Google</span>
                    </div>
                    <div className="flex items-center gap-1 text-zinc-650 truncate pl-5">
                      <User className="w-3 h-3 shrink-0" />
                      <span className="truncate">{driveUser.email}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-700">
                      <span className="flex items-center gap-1">
                        <FolderOpen className="w-3 h-3 text-blue-800" /> NoteNova files in Drive:
                      </span>
                      <button 
                        onClick={onRefreshDriveFiles}
                        disabled={isDriveLoading}
                        className="windows-3d-button p-0.5 px-1 flex items-center gap-1 hover:bg-zinc-200 disabled:opacity-50"
                        title="Reload drive files"
                      >
                        <RefreshCw className={`w-2.5 h-2.5 ${isDriveLoading ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                    </div>

                    <div className="bg-white border border-zinc-400 max-h-[140px] overflow-y-auto p-1 font-sans text-[11px] space-y-1">
                      {isDriveLoading && driveFiles.length === 0 ? (
                        <div className="text-center py-4 text-zinc-500 text-[10px] select-none font-mono">
                          Retrieving file index...
                        </div>
                      ) : driveFiles.length === 0 ? (
                        <div className="text-center py-4 text-zinc-500 text-[10px] select-none font-mono">
                          No TXT files found in NoteNova.
                        </div>
                      ) : (
                        driveFiles.map(file => (
                          <div key={file.id} className="flex justify-between items-center bg-zinc-50 border-b border-zinc-150 p-1 truncate">
                            <div className="truncate flex-1 min-w-0 font-mono text-[10px] pr-1">
                              <div className="truncate font-bold text-zinc-800">{file.name}</div>
                              <div className="text-[8px] text-zinc-500">
                                {file.size ? `${Math.ceil(parseInt(file.size)/1024)} KB` : 'Media'} • {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'Sync'}
                              </div>
                            </div>
                            <button
                              onClick={() => onDeleteDriveFile(file.id, file.name)}
                              className="p-1 px-1.5 hover:bg-red-100 border border-zinc-350 hover:border-red-300 text-red-700 rounded-sm cursor-pointer shrink-0 animate-none"
                              title="Delete File from Google Drive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    onClick={onDisconnectDrive}
                    className="windows-3d-button w-full text-xs py-1 flex items-center justify-center gap-1 font-bold text-red-800"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Unlink Google Drive
                  </button>
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <div className="text-[10px] text-zinc-650 leading-relaxed">
                    Link your account to auto-generate a <strong>"NoteNova"</strong> folder inside your Google Drive for cloud synchronization of .txt files.
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 pb-1">
                    <button
                      type="button"
                      onClick={() => onSetStorageChoice('local')}
                      className={`windows-3d-button py-1 text-[10px] font-bold ${
                        storageChoice === 'local' ? 'bg-zinc-350 outline-dotted outline-blue-955' : ''
                      }`}
                    >
                      Local Offline
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetStorageChoice('drive')}
                      className={`windows-3d-button py-1 text-[10px] font-bold ${
                        storageChoice === 'drive' ? 'bg-zinc-350 outline-dotted outline-blue-955' : ''
                      }`}
                    >
                      Drive Mode
                    </button>
                  </div>

                  <button
                    onClick={onConnectDrive}
                    className="windows-3d-button w-full text-xs py-1.5 flex items-center justify-center gap-1.5 font-bold"
                  >
                    <Cloud className="w-3.5 h-3.5 text-blue-800" />
                    Connect Google Drive
                  </button>
                </div>
              )}
            </fieldset>

            {/* Closing buttons bar */}
            <div className="flex justify-end pt-2">
              <button
                onClick={onClose}
                className="windows-3d-button text-xs py-1.5 px-6 font-bold cursor-pointer text-center"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Sleek Modern Material Design panel wrapper */
        <div className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl relative my-8 border ${
          settings.theme === 'android-light'
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}>
          <div className={`flex items-center justify-between mb-5 select-none ${
            settings.theme === 'android-light' ? 'text-slate-900' : 'text-slate-50'
          }`}>
            <h2 className={`text-sm font-bold flex items-center gap-2 ${
              settings.theme === 'android-light' ? 'text-slate-900' : 'text-white'
            }`}>
              <Sliders className="w-4.5 h-4.5 text-blue-500" />
              Notepad Settings
            </h2>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                settings.theme === 'android-light'
                  ? 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className={`space-y-6 max-h-[80vh] overflow-y-auto pr-1 no-scrollbar ${
            settings.theme === 'android-light' ? 'text-slate-800' : 'text-slate-100'
          }`}>
            {/* Theme Toggle System (Required Segmented Picker) */}
            <div className="space-y-2.5">
              <label className={`text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5 ${
                settings.theme === 'android-light' ? 'text-slate-500' : 'text-slate-400'
              }`}>
                <SunMoon className="w-3.5 h-3.5 text-blue-500" /> Theme Mode
              </label>
              <div className={`p-1 rounded-xl grid grid-cols-2 gap-1.5 border ${
                settings.theme === 'android-light'
                  ? 'bg-slate-100 border-slate-200'
                  : 'bg-slate-950 border-slate-850'
              }`}>
                <button
                  type="button"
                  onClick={() => togglePrimaryTheme('dark')}
                  className={`py-2 text-xs font-semibold rounded-lg text-center transition-all cursor-pointer ${
                    isDark 
                      ? 'bg-blue-600 text-white shadow shadow-blue-900/30' 
                      : (settings.theme === 'android-light'
                          ? 'text-slate-600 hover:text-slate-800 font-semibold'
                          : 'text-slate-400 hover:text-slate-200')
                  }`}
                >
                  Dark Mode
                </button>
                <button
                  type="button"
                  onClick={() => togglePrimaryTheme('light')}
                  className={`py-2 text-xs font-semibold rounded-lg text-center transition-all cursor-pointer ${
                    !isDark 
                      ? (settings.theme === 'android-light'
                          ? 'bg-white text-slate-900 border border-slate-205 shadow-sm font-bold'
                          : 'bg-slate-800 text-white border border-slate-700 font-bold')
                      : (settings.theme === 'android-light'
                          ? 'text-slate-600 hover:text-slate-800 font-semibold'
                          : 'text-slate-400 hover:text-slate-200')
                  }`}
                >
                  Light Mode
                </button>
              </div>
            </div>

            {/* Google Drive Connect Panel */}
            <div className={`space-y-2.5 p-4 border rounded-2xl ${
              settings.theme === 'android-light'
                ? 'bg-slate-50 border-slate-200'
                : 'bg-slate-955/60 border-slate-850'
            }`}>
              <label className={`text-[10px] font-bold tracking-wider uppercase flex items-center justify-between ${
                settings.theme === 'android-light' ? 'text-slate-500' : 'text-slate-400'
              }`}>
                <span className="flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 text-blue-500" /> Google Drive Cloud Storage
                </span>
                <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                  driveUser 
                    ? settings.theme === 'android-light'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-emerald-950/45 text-emerald-400 border border-emerald-900/40' 
                    : settings.theme === 'android-light'
                      ? 'bg-slate-200 text-slate-600 border border-slate-300'
                      : 'bg-slate-900 border border-slate-800 text-slate-500'
                }`}>
                  {driveUser ? 'Synced' : 'Offline'}
                </span>
              </label>

              {driveUser ? (
                <div className="space-y-3.5">
                  {/* Account Badge */}
                  <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    settings.theme === 'android-light'
                      ? 'bg-white hover:bg-slate-50 border-slate-200 shadow-sm'
                      : 'bg-slate-955 hover:bg-slate-910 border-slate-850/80'
                  }`}>
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 font-bold uppercase text-xs ${
                      settings.theme === 'android-light'
                        ? 'bg-blue-105 border-blue-200 text-blue-755'
                        : 'bg-blue-950 border border-blue-900/50 text-blue-400'
                    }`}>
                      {driveUser.email.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1 select-all">
                      <div className={`text-[10px] font-bold uppercase leading-none mb-1 ${
                        settings.theme === 'android-light' ? 'text-slate-450' : 'text-slate-500'
                      }`}>Google Account</div>
                      <div className={`text-xs truncate font-semibold leading-tight ${
                        settings.theme === 'android-light' ? 'text-slate-855' : 'text-slate-200'
                      }`}>{driveUser.email}</div>
                    </div>
                  </div>

                  {/* Synced NoteNova Directory */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider px-1">
                      <span className={settings.theme === 'android-light' ? 'text-slate-500' : 'text-slate-400'}>Folder: NoteNova</span>
                      <button
                        onClick={onRefreshDriveFiles}
                        disabled={isDriveLoading}
                        className={`py-1 px-2.5 rounded border transition-all cursor-pointer flex items-center gap-1 text-[9px] font-bold disabled:opacity-50 ${
                          settings.theme === 'android-light'
                            ? 'text-blue-700 bg-white border-slate-205 hover:bg-slate-55 shadow-sm'
                            : 'text-blue-455 bg-slate-950 border-slate-850 hover:bg-slate-900'
                        }`}
                      >
                        <RefreshCw className={`w-2.5 h-2.5 ${isDriveLoading ? 'animate-spin' : ''}`} />
                        Refresh List
                      </button>
                    </div>
                    <div className={`p-1.5 rounded-xl border max-h-[148px] overflow-y-auto space-y-1 ${
                      settings.theme === 'android-light'
                        ? 'bg-white border-slate-200 text-slate-900 shadow-inner'
                        : 'bg-slate-955 border border-slate-850/85'
                    }`}>
                      {isDriveLoading && driveFiles.length === 0 ? (
                        <div className={`text-center py-6 text-[11px] font-mono select-none ${
                          settings.theme === 'android-light' ? 'text-slate-500' : 'text-slate-500'
                        }`}>
                          Fetching files from Drive...
                        </div>
                      ) : driveFiles.length === 0 ? (
                        <div className={`text-center py-6 text-[11px] select-none leading-relaxed font-sans px-3 ${
                          settings.theme === 'android-light' ? 'text-slate-550' : 'text-slate-400'
                        }`}>
                          No text files inside the NoteNova folder yet. Synchronized files will appear here!
                        </div>
                      ) : (
                        driveFiles.map(file => (
                          <div key={file.id} className={`flex justify-between items-center border p-2 rounded-lg gap-2 transition-colors ${
                            settings.theme === 'android-light'
                              ? 'bg-slate-50 border-slate-200/60 hover:bg-slate-100'
                              : 'bg-slate-900/30 border-slate-855/40 hover:bg-slate-905/65'
                          }`}>
                            <div className="min-w-0 flex-1 truncate select-none leading-none">
                              <p className={`text-[11px] font-semibold truncate ${
                                settings.theme === 'android-light' ? 'text-slate-800' : 'text-slate-300'
                              }`} title={file.name}>
                                {file.name}
                              </p>
                              <span className={`text-[8px] inline-block mt-1 ${
                                settings.theme === 'android-light' ? 'text-slate-500' : 'text-slate-450'
                              }`}>
                                {file.size ? `${Math.ceil(parseInt(file.size)/1024)} KB` : 'Media'} • {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'Sync'}
                              </span>
                            </div>
                            <button
                              onClick={() => onDeleteDriveFile(file.id, file.name)}
                              className={`p-1 px-1.5 border rounded-lg cursor-pointer transition-colors ${
                                settings.theme === 'android-light'
                                  ? 'hover:bg-red-50 border-slate-202 hover:border-red-200 text-red-650 hover:text-red-700'
                                  : 'hover:bg-red-955/40 border border-slate-850 hover:border-red-900/30 text-red-400 hover:text-red-350'
                              }`}
                              title="Delete file from Google Drive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Disconnect button */}
                  <button
                    onClick={onDisconnectDrive}
                    className={`w-full text-[11px] font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      settings.theme === 'android-light'
                        ? 'bg-white hover:bg-red-50 text-red-600 hover:text-red-700 border border-slate-202 hover:border-red-202 shadow-sm'
                        : 'bg-slate-955 hover:bg-red-955/20 text-red-400 hover:text-red-300 border border-slate-850 hover:border-red-900/30'
                    }`}
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    Unlink Google Drive Sync
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <p className={`text-[11px] leading-relaxed ${
                    settings.theme === 'android-light' ? 'text-slate-600 font-medium' : 'text-slate-400'
                  }`}>
                    Create backups of your notes as plain `.txt` files directly inside a <strong>"NoteNova"</strong> folder in your Google Drive cloud account automatically.
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <button
                      type="button"
                      onClick={() => onSetStorageChoice('local')}
                      className={`py-1.5 rounded-lg border text-center transition-colors cursor-pointer ${
                        storageChoice === 'local'
                          ? settings.theme === 'android-light'
                            ? 'bg-blue-50 border-blue-550 text-blue-700 font-bold shadow-sm'
                            : 'bg-blue-600/10 border-blue-500 text-white font-semibold'
                          : settings.theme === 'android-light'
                            ? 'bg-white border-slate-202 text-slate-500 hover:text-slate-700'
                            : 'bg-slate-955 border-slate-850 text-slate-500'
                      }`}
                    >
                      Local Offline only
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetStorageChoice('drive')}
                      className={`py-1.5 rounded-lg border text-center transition-colors cursor-pointer ${
                        storageChoice === 'drive'
                          ? settings.theme === 'android-light'
                            ? 'bg-blue-50 border-blue-550 text-blue-750 font-bold shadow-sm'
                            : 'bg-blue-600/10 border-blue-500 text-white font-semibold'
                          : settings.theme === 'android-light'
                            ? 'bg-white border-slate-202 text-slate-500 hover:text-slate-705'
                            : 'bg-slate-955 border-slate-850 text-slate-500'
                      }`}
                    >
                      Drive Backup Sync
                    </button>
                  </div>

                  <button
                    onClick={onConnectDrive}
                    className="w-full bg-blue-600 hover:bg-blue-550 text-white text-[11px] font-semibold py-3 rounded-xl transition-all shadow-md shadow-blue-900/30 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Cloud className="w-4 h-4 text-white" />
                    Connect Google Drive Account
                  </button>
                </div>
              )}
            </div>

            {/* Done button */}
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
