/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, FileText, Settings, Download, Share2, Plus, ArrowLeftRight,
  Trash2, AlertTriangle, Check, Sliders, ChevronRight, HelpCircle, X,
  Sun, Moon, Wrench, Bold, Table, Cloud, Database
} from 'lucide-react';
import { Note, EditorSettings } from './types';
import { 
  loadSavedNotes, saveNotesToStorage, loadEditorSettings, saveEditorSettings,
  loadLastActiveNoteId, saveLastActiveNoteId, generateId, downloadTxtFile
} from './utils';
import { 
  initAuth, googleSignIn, googleSignOut,
  getOrCreateNoteNovaFolder, listDriveFiles, saveFileToDrive, deleteFileFromDrive,
  getAccessToken, setCachedAccessToken
} from './drive';

// Import modular sub-components
import DeviceFrame from './components/DeviceFrame';
import FileExplorer from './components/FileExplorer';
import SettingsModal from './components/SettingsModal';
import TrashBinModal from './components/TrashBinModal';
import EditHelpers from './components/EditHelpers';

export default function App() {
  // Core notes list and settings state
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [settings, setSettings] = useState<EditorSettings>(() => loadEditorSettings());

  // Input states tracking the active editing session
  const [activeContent, setActiveContent] = useState('');
  const [activeTitle, setActiveTitle] = useState('');

  // Undo/Redo historical state stacks for text transitions, limited to 40 items
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const lastStateCount = useRef<number>(0);

  // Layout UI interactive states
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'file' | 'edit' | 'format' | 'view' | 'help' | null>(null);
  const [isBottomMenuOpen, setIsBottomMenuOpen] = useState(false);

  // Transient status alerts and feedback triggers
  const [autosaveStatus, setAutosaveStatus] = useState<'saved' | 'saving' | 'ready'>('ready');
  const [clipboardFeedback, setClipboardFeedback] = useState<string | null>(null);

  // Google Drive & Cloud Synchronization states
  const [storageChoice, setStorageChoice] = useState<'local' | 'drive' | null>(() => {
    return localStorage.getItem('notepad_storage_choice') as 'local' | 'drive' | null;
  });
  const [cachedAccessToken, setCachedAccessTokenState] = useState<string | null>(null);
  const [driveUser, setDriveUser] = useState<any | null>(null);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [driveFolderId, setDriveFolderId] = useState<string | null>(() => {
    return localStorage.getItem('notepad_drive_folder_id');
  });

  // Resilient sandboxed-paste manual override state
  const [isManualPasteOpen, setIsManualPasteOpen] = useState(false);
  const [manualPasteVal, setManualPasteVal] = useState('');

  // Floating user manual dialogue
  const [isClassicHelpOpen, setIsClassicHelpOpen] = useState(false);

  // Ref hook to control text cursor offsets and physical scrolls
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const keyboardTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load notes on mount
  useEffect(() => {
    let loadedNotes = loadSavedNotes();
    
    // Auto-delete trash older than 15 days
    const fifteenDaysInMs = 15 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let changed = false;

    loadedNotes = loadedNotes.map(n => {
      if (n.inTrash && !n.trashedAt) {
        changed = true;
        return { ...n, trashedAt: now };
      }
      return n;
    }).filter(n => {
      if (n.inTrash && n.trashedAt) {
        const elapsed = now - n.trashedAt;
        if (elapsed > fifteenDaysInMs) {
          changed = true;
          return false;
        }
      }
      return true;
    });

    if (changed) {
      saveNotesToStorage(loadedNotes);
    }

    setNotes(loadedNotes);

    // Track last session page restore
    const lastId = loadLastActiveNoteId();
    const activeLoaded = loadedNotes.filter(n => !n.inTrash);
    const hasLastNote = lastId && activeLoaded.some(n => n.id === lastId);
    
    if (hasLastNote) {
      const active = loadedNotes.find(n => n.id === lastId)!;
      setActiveNoteId(lastId);
      setActiveContent(active.content);
      setActiveTitle(active.title);
    } else if (activeLoaded.length > 0) {
      // Default fallback notes load
      const first = activeLoaded[0];
      setActiveNoteId(first.id);
      setActiveContent(first.content);
      setActiveTitle(first.title);
      saveLastActiveNoteId(first.id);
    } else {
      // If no active note is present, instantiate a clean starting notepad
      const freshId = generateId();
      const empty: Note = {
        id: freshId,
        title: 'Document1.txt',
        content: '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      const appendedNotes = [empty, ...loadedNotes];
      setNotes(appendedNotes);
      saveNotesToStorage(appendedNotes);
      setActiveNoteId(freshId);
      setActiveContent('');
      setActiveTitle('Document1.txt');
      saveLastActiveNoteId(freshId);
    }
  }, []);

  // Save current properties whenever settings change
  useEffect(() => {
    saveEditorSettings(settings);
  }, [settings]);

  // AUTOSAVE ENGINE: Real-time writing persistence to localStorage and Google Drive with active index caching
  useEffect(() => {
    if (!activeNoteId) return;

    // Set temporary typing status
    setAutosaveStatus('saving');

    const debouncer = setTimeout(() => {
      setNotes(prevNotes => {
        const index = prevNotes.findIndex(n => n.id === activeNoteId);
        if (index !== -1) {
          const updated = [...prevNotes];
          // Guard state loops to prevent dirtying indices on unchanged ticks
          if (updated[index].content !== activeContent || updated[index].title !== activeTitle) {
            updated[index] = {
              ...updated[index],
              content: activeContent,
              title: activeTitle,
              updatedAt: Date.now(),
              isDraft: true,
            };
            saveNotesToStorage(updated);

            // Trigger real-time background cloud synchronization if Google Drive is active
            if (storageChoice === 'drive' && cachedAccessToken && driveFolderId) {
              const fileToSync = updated[index];
              saveFileToDrive(cachedAccessToken, driveFolderId, fileToSync.title, fileToSync.content, fileToSync.driveFileId)
                .then(newFileId => {
                  if (newFileId !== fileToSync.driveFileId) {
                    setNotes(latestNotes => {
                      const lIdx = latestNotes.findIndex(n => n.id === fileToSync.id);
                      if (lIdx !== -1) {
                        const lUpdated = [...latestNotes];
                        lUpdated[lIdx] = {
                          ...lUpdated[lIdx],
                          driveFileId: newFileId
                        };
                        saveNotesToStorage(lUpdated);
                        return lUpdated;
                      }
                      return latestNotes;
                    });
                  }
                  // Refresh drive file list in settings background quietly
                  loadDriveFilesList(cachedAccessToken, driveFolderId);
                })
                .catch(err => {
                  console.error("Cloud autosave sync backup failed:", err);
                });
            }
          }
        }
        return prevNotes;
      });
      setAutosaveStatus('saved');
    }, 600); // 600ms safety debouncing latency

    return () => clearTimeout(debouncer);
  }, [activeContent, activeTitle, activeNoteId, storageChoice, cachedAccessToken, driveFolderId]);

  // Restores active Google Drive auth session on page load if drive is the choice
  useEffect(() => {
    const authUnsubscribe = initAuth(
      (user, token) => {
        setDriveUser(user);
        setCachedAccessTokenState(token);
        if (driveFolderId) {
          loadDriveFilesList(token, driveFolderId);
        }
      },
      () => {
        setDriveUser(null);
        setCachedAccessTokenState(null);
      }
    );
    return () => authUnsubscribe && authUnsubscribe();
  }, [driveFolderId]);

  // Sync all local files to Google Drive workspace folder NoteNova
  const syncAllActiveNotesToDrive = async (token: string, folderId: string, currentNotes: Note[]) => {
    try {
      const activeToSync = currentNotes.filter(n => !n.inTrash);
      if (activeToSync.length === 0) return;
      
      showFlashFeedback('Pushing workspace backups to Google Drive...');
      
      const syncedUpdatedNotes = [...currentNotes];
      let hasUpdates = false;
      
      for (let i = 0; i < syncedUpdatedNotes.length; i++) {
        const note = syncedUpdatedNotes[i];
        if (note.inTrash) continue;
        
        try {
          const driveId = await saveFileToDrive(token, folderId, note.title, note.content, note.driveFileId);
          if (note.driveFileId !== driveId) {
            syncedUpdatedNotes[i] = {
              ...note,
              driveFileId: driveId
            };
            hasUpdates = true;
          }
        } catch (e) {
          console.error(`Failed to sync note "${note.title}" to Google Drive:`, e);
        }
      }
      
      if (hasUpdates) {
        setNotes(syncedUpdatedNotes);
        saveNotesToStorage(syncedUpdatedNotes);
      }
      
      await loadDriveFilesList(token, folderId);
      showFlashFeedback('All local files are synced successfully inside "NoteNova"!');
    } catch (e) {
      console.error('Unified cloud files sync failed:', e);
    }
  };

  // Retrieve files from Google Drive
  const loadDriveFilesList = async (token: string, folderId: string) => {
    setIsDriveLoading(true);
    try {
      const files = await listDriveFiles(token, folderId);
      setDriveFiles(files);
    } catch (err) {
      console.error('Error fetching drive files list:', err);
    } finally {
      setIsDriveLoading(false);
    }
  };

  // Connect Google account and retrieve/create folder NoteNova
  const handleConnectDrive = async () => {
    setIsDriveLoading(true);
    try {
      showFlashFeedback('Connecting with Google accounts...');
      const result = await googleSignIn();
      if (result) {
        setCachedAccessTokenState(result.accessToken);
        setDriveUser(result.user);
        setStorageChoice('drive');
        localStorage.setItem('notepad_storage_choice', 'drive');
        
        showFlashFeedback('Configuring "NoteNova" folder inside Drive...');
        const folderId = await getOrCreateNoteNovaFolder(result.accessToken);
        setDriveFolderId(folderId);
        localStorage.setItem('notepad_drive_folder_id', folderId);
        
        const files = await listDriveFiles(result.accessToken, folderId);
        setDriveFiles(files);
        
        await syncAllActiveNotesToDrive(result.accessToken, folderId, notes);
      } else {
        showFlashFeedback('Connection cancelled: the integration was closed.');
      }
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.message?.includes('popup-closed-by-user') ||
        err?.message?.includes('cancelled-popup-request') ||
        err?.message?.includes('closed-by-user')
      ) {
        console.warn('Connection to Drive cancelled because the popup was closed.');
        showFlashFeedback('Connection cancelled. The login popup was closed.');
      } else {
        console.error('Connection to Drive failed:', err);
        showFlashFeedback('Failed to link account: ' + (err.message || 'Unknown issue'));
      }
    } finally {
      setIsDriveLoading(false);
    }
  };

  // Unlink Google account and return to local storage choice
  const handleDisconnectDrive = async () => {
    try {
      await googleSignOut();
      setCachedAccessTokenState(null);
      setDriveUser(null);
      setDriveFiles([]);
      setStorageChoice('local');
      localStorage.setItem('notepad_storage_choice', 'local');
      localStorage.removeItem('notepad_drive_folder_id');
      setDriveFolderId(null);
      showFlashFeedback('Google Drive unlinked. Returned workspace to Offline mode.');
    } catch (err) {
      console.error('Sign out from Google Drive session failed:', err);
    }
  };

  // Manual list refresh trigger
  const handleRefreshDriveFiles = async () => {
    if (cachedAccessToken && driveFolderId) {
      showFlashFeedback('Refreshing Drive files list...');
      await loadDriveFilesList(cachedAccessToken, driveFolderId);
    } else {
      showFlashFeedback('Please connect your Google Drive first.');
    }
  };

  // Permanently delete file from Google Drive NoteNova folder
  const handleDeleteDriveFile = async (fileId: string, fileName: string) => {
    const isConfirmed = window.confirm(`Permanently delete "${fileName}" from Google Drive? This cannot be undone.`);
    if (!isConfirmed) return;
    
    if (cachedAccessToken) {
      try {
        setIsDriveLoading(true);
        await deleteFileFromDrive(cachedAccessToken, fileId);
        showFlashFeedback(`Deleted "${fileName}" from Google Drive cloud storage.`);
        
        if (driveFolderId) {
          await loadDriveFilesList(cachedAccessToken, driveFolderId);
        }
        
        setNotes(prev => {
          const updated = prev.map(n => n.driveFileId === fileId ? { ...n, driveFileId: undefined } : n);
          saveNotesToStorage(updated);
          return updated;
        });
        
      } catch (e: any) {
        console.error('Failed to delete cloud file:', e);
        showFlashFeedback('Failed to delete Drive file: ' + e.message);
      } finally {
        setIsDriveLoading(false);
      }
    }
  };

  // Handle virtual Back triggers from simulation frame (collapses panels)
  const handleVirtualBack = () => {
    if (isExplorerOpen) {
      setIsExplorerOpen(false);
    } else if (isSettingsOpen) {
      setIsSettingsOpen(false);
    } else if (activeDropdown) {
      setActiveDropdown(null);
    } else if (isManualPasteOpen) {
      setIsManualPasteOpen(false);
    } else if (isClassicHelpOpen) {
      setIsClassicHelpOpen(false);
    } else {
      // Simulate typical Android double-tap warning
      showFlashFeedback('Slide out Workspace drawer (left side icon) to switch files!');
    }
  };

  const showFlashFeedback = (msg: string) => {
    setClipboardFeedback(msg);
    setTimeout(() => {
      setClipboardFeedback(null);
    }, 2500);
  };

  // Switch between notes with automatic prior state commits
  const handleSelectNote = (id: string, currentNotesList?: Note[]) => {
    // Flush active save before transition
    const notesList = currentNotesList || notes;
    const noteObj = notesList.find(n => n.id === id);
    if (!noteObj) return;

    // Reset undo/redo scopes for pristine slate swap
    setUndoStack([]);
    setRedoStack([]);

    setActiveNoteId(id);
    setActiveContent(noteObj.content);
    setActiveTitle(noteObj.title);
    saveLastActiveNoteId(id);
    
    // Auto collapse explorer drawer on small viewports
    setIsExplorerOpen(false);
  };

  // Create a brand new workspace note
  const handleNewNote = () => {
    const freshId = generateId();
    const freshNote: Note = {
      id: freshId,
      title: 'Untitled Note.txt',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const nextNotes = [freshNote, ...notes];
    setNotes(nextNotes);
    saveNotesToStorage(nextNotes);

    setUndoStack([]);
    setRedoStack([]);

    setActiveNoteId(freshId);
    setActiveContent('');
    setActiveTitle('Untitled Note.txt');
    saveLastActiveNoteId(freshId);

    setIsExplorerOpen(false);
    showFlashFeedback('Created a fresh offline .txt file!');
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 150);
  };

  // Move active note to Trash instead of permanent deletion
  const handleDeleteNote = (id: string) => {
    const updated = notes.map(n => n.id === id ? { ...n, inTrash: true, updatedAt: Date.now() } : n);
    setNotes(updated);
    saveNotesToStorage(updated);

    if (activeNoteId === id) {
      const activeRemaining = updated.filter(n => !n.inTrash);
      if (activeRemaining.length > 0) {
        handleSelectNote(activeRemaining[0].id, updated);
      } else {
        // Create full empty reset note
        const freshId = generateId();
        const empty: Note = {
          id: freshId,
          title: 'Document1.txt',
          content: '',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        const resetNotes = [empty, ...updated];
        setNotes(resetNotes);
        saveNotesToStorage(resetNotes);
        handleSelectNote(freshId, resetNotes);
      }
    }
    showFlashFeedback('File moved to Trash Bin.');
  };

  // Restore note elements from Trash back into working session
  const handleRestoreNote = (id: string) => {
    setNotes(prevNotes => {
      const updated = prevNotes.map(n => n.id === id ? { ...n, inTrash: false, updatedAt: Date.now() } : n);
      saveNotesToStorage(updated);
      
      // Sync to Google Drive if active
      if (storageChoice === 'drive' && cachedAccessToken && driveFolderId) {
        const restoredNote = updated.find(n => n.id === id);
        if (restoredNote) {
          saveFileToDrive(cachedAccessToken, driveFolderId, restoredNote.title, restoredNote.content, restoredNote.driveFileId)
            .then(newFileId => {
              if (newFileId !== restoredNote.driveFileId) {
                setNotes(latestNotes => {
                  const lIdx = latestNotes.findIndex(n => n.id === id);
                  if (lIdx !== -1) {
                    const lUpdated = [...latestNotes];
                    lUpdated[lIdx] = {
                      ...lUpdated[lIdx],
                      driveFileId: newFileId
                    };
                    saveNotesToStorage(lUpdated);
                    return lUpdated;
                  }
                  return latestNotes;
                });
              }
              loadDriveFilesList(cachedAccessToken, driveFolderId);
            })
            .catch(err => {
              console.error("Failed to sync restored note to Google Drive:", err);
            });
        }
      }
      
      return updated;
    });
    
    showFlashFeedback('File restored successfully!');
  };

  // Permanently purge note records from offline and cloud stores
  const handleDeletePermanently = (id: string) => {
    setNotes(prevNotes => {
      const targetNote = prevNotes.find(n => n.id === id);
      const remaining = prevNotes.filter(n => n.id !== id);
      saveNotesToStorage(remaining);

      if (activeNoteId === id) {
        const activeRemaining = remaining.filter(n => !n.inTrash);
        if (activeRemaining.length > 0) {
          // Defer selection cleanly so state commits first
          setTimeout(() => {
            handleSelectNote(activeRemaining[0].id, remaining);
          }, 0);
        } else {
          const freshId = generateId();
          const empty: Note = {
            id: freshId,
            title: 'Document1.txt',
            content: '',
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          const resetNotes = [empty];
          saveNotesToStorage(resetNotes);
          setTimeout(() => {
            setNotes(resetNotes);
            handleSelectNote(freshId, resetNotes);
          }, 0);
        }
      }

      // Clean up Google Drive file permanently if synced & active
      if (storageChoice === 'drive' && cachedAccessToken && targetNote?.driveFileId) {
        deleteFileFromDrive(cachedAccessToken, targetNote.driveFileId)
          .then(() => {
            if (driveFolderId) {
              loadDriveFilesList(cachedAccessToken, driveFolderId);
            }
          })
          .catch(err => {
            console.error("Failed to delete synced Google Drive file:", err);
          });
      }
      
      return remaining;
    });

    showFlashFeedback('File purged permanently.');
  };

  // Inline rename note title
  const handleRenameNote = (id: string, newTitle: string) => {
    setNotes(prev => {
      const updated = prev.map(note => {
        if (note.id === id) {
          return { ...note, title: newTitle, updatedAt: Date.now() };
        }
        return note;
      });
      saveNotesToStorage(updated);
      return updated;
    });

    if (activeNoteId === id) {
      setActiveTitle(newTitle);
    }
  };

  // File Import listener
  const handleImportNote = (title: string, content: string) => {
    const importId = generateId();
    const imported: Note = {
      id: importId,
      title,
      content,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const merged = [imported, ...notes];
    setNotes(merged);
    saveNotesToStorage(merged);
    handleSelectNote(importId, merged);
    showFlashFeedback(`Success: ${title} loaded!`);
  };

  // Trigger local file download of .txt physical file
  const handleExportNote = (note: Note) => {
    // Save state matches first
    const contentToDownload = note.id === activeNoteId ? activeContent : note.content;
    const titleToDownload = note.id === activeNoteId ? activeTitle : note.title;
    downloadTxtFile(titleToDownload, contentToDownload);
    showFlashFeedback(`Physical download triggered: ${titleToDownload}`);
  };

  // File sharing support (with physical TXT File constructs and clean clipboard/download fallbacks)
  const handleShareNote = async (note: Note) => {
    const shareContent = note.id === activeNoteId ? activeContent : note.content;
    const shareTitle = note.id === activeNoteId ? activeTitle : note.title;

    // Build standard text/plain physical File representation
    const sanitizedTitle = shareTitle.endsWith('.txt') ? shareTitle : `${shareTitle}.txt`;
    const blobFile = new File([shareContent], sanitizedTitle, { type: 'text/plain' });

    // Define potential fallback download trigger
    const triggerFileFallback = () => {
      try {
        navigator.clipboard.writeText(shareContent);
      } catch (err) {
        console.warn('Clipboard write fallback blocked', err);
      }
      downloadTxtFile(sanitizedTitle, shareContent);
      showFlashFeedback('File content copied & download initiated!');
    };

    if (navigator.share) {
      try {
        // Feature check: Support for sharing files on mobile systems (Web Share Level 2)
        if (navigator.canShare && navigator.canShare({ files: [blobFile] })) {
          await navigator.share({
            files: [blobFile],
            title: sanitizedTitle,
            text: `Sharing document: ${sanitizedTitle}`
          });
          showFlashFeedback('File attachment shared!');
        } else {
          // Fallback to text-only Web Share
          await navigator.share({
            title: sanitizedTitle,
            text: shareContent
          });
          showFlashFeedback('Text content shared.');
        }
      } catch (err: any) {
        console.warn('Web Share API error or cancelled:', err);
        // If it was cancelled by user, don't trigger fallback copy
        if (err?.name === 'AbortError') {
          showFlashFeedback('Share cancelled.');
        } else {
          triggerFileFallback();
        }
      }
    } else {
      triggerFileFallback();
    }
  };

  // Input keystroke capture (with debounced undo commits)
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    const prevVal = activeContent;
    setActiveContent(newVal);

    // Capture Undo snapshots periodically when typing stops or on space/enter
    if (keyboardTimerRef.current) clearTimeout(keyboardTimerRef.current);

    const isWordBoundary = (newVal.length - prevVal.length === 1) && 
                           (newVal.endsWith(' ') || newVal.endsWith('\n') || newVal.endsWith('\t'));

    if (isWordBoundary) {
      commitUndoSnapshot(prevVal);
    } else {
      keyboardTimerRef.current = setTimeout(() => {
        commitUndoSnapshot(prevVal);
      }, 700);
    }
  };

  const commitUndoSnapshot = (textToCommit: string) => {
    setUndoStack(prev => {
      if (prev.length > 0 && prev[prev.length - 1] === textToCommit) return prev;
      return [...prev.slice(-39), textToCommit]; // cap stack to 40 levels
    });
    setRedoStack([]); // wipe redo on fresh branches
  };

  // Standard Undo/Redo calls
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    const newUndo = undoStack.slice(0, -1);
    
    setRedoStack(prev => [...prevDraftHistoryCheck(prev), activeContent]);
    setUndoStack(newUndo);
    setActiveContent(previous);
    
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const newRedo = redoStack.slice(0, -1);

    setUndoStack(prev => [...prevDraftHistoryCheck(prev), activeContent]);
    setRedoStack(newRedo);
    setActiveContent(next);

    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const prevDraftHistoryCheck = (list: string[]) => {
    // Deduplicates sequential snapshots
    if (list.length > 0 && list[list.length - 1] === activeContent) {
      return list.slice(0, -1);
    }
    return list;
  };

  // Keyboard Event shortcuts (Ctrl+S, Ctrl+F, Ctrl+Z etc)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const hasModifier = isMac ? e.metaKey : e.ctrlKey;

    if (hasModifier) {
      switch (e.key.toLowerCase()) {
        case 's':
          e.preventDefault();
          // Explicit save manual action (export + localStorage flush)
          if (activeNoteId) {
            setNotes(prev => {
              const updated = prev.map(n => n.id === activeNoteId ? { ...n, content: activeContent, title: activeTitle, updatedAt: Date.now() } : n);
              saveNotesToStorage(updated);
              return updated;
            });
            showFlashFeedback('Saved current changes to local store!');
          }
          break;
        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
          break;
        case 'y':
          e.preventDefault();
          handleRedo();
          break;
        case 'a':
          // Standard selection logic handles normally, but focus-lock if desired
          break;
      }
    }
  };

  // Select all helper operation
  const handleSelectAll = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.focus();
      textarea.select();
      showFlashFeedback('Entire document selected');
    }
  };

  // Cut text selection helper
  const handleCutSelection = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start === end) {
      showFlashFeedback('Select a span of text first to "Cut" selection.');
      return;
    }

    const selectedText = activeContent.substring(start, end);
    navigator.clipboard.writeText(selectedText)
      .then(() => {
        commitUndoSnapshot(activeContent);
        const nextContent = activeContent.substring(0, start) + activeContent.substring(end);
        setActiveContent(nextContent);
        showFlashFeedback('Cut: copied selection text to clipboard');
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start, start);
        }, 50);
      });
  };

  // Clipboard copies
  const handleCopyAll = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    let textToCopy = activeContent;
    let message = 'Copied entire document to clipboard';

    if (start !== end) {
      textToCopy = activeContent.substring(start, end);
      message = 'Copied selection to clipboard';
    }

    navigator.clipboard.writeText(textToCopy)
      .then(() => showFlashFeedback(message))
      .catch(() => showFlashFeedback('Permission error: Clipboard copy failed.'));
  };

  // Paste resilient helper bypasses typical sandboxed iFrame restrictions
  const handlePasteAll = async () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    try {
      // Try native clipboard read
      const ClipboardText = await navigator.clipboard.readText();
      if (ClipboardText) {
        insertTextAtCursor(ClipboardText);
        showFlashFeedback('Pasted text from clipboard');
        return;
      }
    } catch (err) {
      console.warn('Native clipboard block occurred. Launching fallback dialog mode.', err);
    }

    // Launch paste override manual inputs
    setManualPasteVal('');
    setIsManualPasteOpen(true);
  };

  const insertTextAtCursor = (insertText: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    commitUndoSnapshot(activeContent);

    const updatedText = activeContent.substring(0, start) + insertText + activeContent.substring(end);
    setActiveContent(updatedText);

    setTimeout(() => {
      textarea.focus();
      const insertPost = start + insertText.length;
      textarea.setSelectionRange(insertPost, insertPost);
    }, 50);
  };

  const handleToggleBold = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = activeContent.substring(start, end);

    commitUndoSnapshot(activeContent);

    let updatedText = '';
    let newStart = start;
    let newEnd = end;

    if (start !== end) {
      if (selectedText.startsWith('**') && selectedText.endsWith('**')) {
        const unwrapped = selectedText.substring(2, selectedText.length - 2);
        updatedText = activeContent.substring(0, start) + unwrapped + activeContent.substring(end);
        newStart = start;
        newEnd = start + unwrapped.length;
      } else {
        const wrapped = `**${selectedText}**`;
        updatedText = activeContent.substring(0, start) + wrapped + activeContent.substring(end);
        newStart = start;
        newEnd = start + wrapped.length;
      }
    } else {
      updatedText = activeContent.substring(0, start) + '****' + activeContent.substring(end);
      newStart = start + 2;
      newEnd = start + 2;
    }

    setActiveContent(updatedText);

    // Save notes
    const activeNote = notes.find(n => n.id === activeNoteId);
    if (activeNote) {
      const updatedNotes = notes.map(n => {
        if (n.id === activeNoteId) {
          return { ...n, content: updatedText, updatedAt: Date.now() };
        }
        return n;
      });
      setNotes(updatedNotes);
      saveNotesToStorage(updatedNotes);
    }

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newStart, newEnd);
    }, 50);
  };

  const handleInsertTable = () => {
    const tableTemplate = 
      "\n| Header 1 | Header 2 | Header 3 |\n" +
      "|---|---|---|\n" +
      "| Row 1 Col 1 | Row 1 Col 2 | Row 1 Col 3 |\n" +
      "| Row 2 Col 1 | Row 2 Col 2 | Row 2 Col 3 |\n";
    insertTextAtCursor(tableTemplate);
    showFlashFeedback('Inserted standard markdown table');
  };

  const handleAddTableRow = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const beforeCursor = activeContent.substring(0, start);
    const afterCursor = activeContent.substring(start);

    // Find the current line the user is on
    const linesBefore = beforeCursor.split('\n');
    const currentLine = linesBefore[linesBefore.length - 1];

    let rowText = '\n|   |   |   |'; // default empty row
    if (currentLine.startsWith('|')) {
      const colCount = (currentLine.match(/\|/g) || []).length - 1;
      if (colCount > 0) {
        rowText = `\n|${'   |'.repeat(colCount)}`;
      }
    }

    commitUndoSnapshot(activeContent);
    const updatedText = beforeCursor + rowText + afterCursor;
    setActiveContent(updatedText);

    // Save notes
    const activeNote = notes.find(n => n.id === activeNoteId);
    if (activeNote) {
      const updatedNotes = notes.map(n => {
        if (n.id === activeNoteId) {
          return { ...n, content: updatedText, updatedAt: Date.now() };
        }
        return n;
      });
      setNotes(updatedNotes);
      saveNotesToStorage(updatedNotes);
    }

    setTimeout(() => {
      textarea.focus();
      const insertPost = start + rowText.length;
      textarea.setSelectionRange(insertPost, insertPost);
    }, 50);

    showFlashFeedback('Added table row');
  };

  const handleAddTableColumn = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // We can append "   |" to each contiguous table row around the cursor
    const start = textarea.selectionStart;
    const lines = activeContent.split('\n');
    
    // Find absolute line index of the cursor position
    let charAccumulator = 0;
    let targetIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      charAccumulator += lines[i].length + 1; // +1 for newline
      if (start <= charAccumulator) {
        targetIndex = i;
        break;
      }
    }

    // Identify start/end of the table block around target line index
    let startTableIdx = targetIndex;
    while (startTableIdx >= 0 && lines[startTableIdx].trim().startsWith('|')) {
      startTableIdx--;
    }
    startTableIdx++; // revert last decrement

    let endTableIdx = targetIndex;
    while (endTableIdx < lines.length && endTableIdx >= 0 && lines[endTableIdx].trim().startsWith('|')) {
      endTableIdx++;
    }
    endTableIdx--; // revert last increment

    if (startTableIdx <= endTableIdx && lines[startTableIdx].trim().startsWith('|')) {
      // Modify table rows to add a column
      const updatedLines = [...lines];
      for (let i = startTableIdx; i <= endTableIdx; i++) {
        const line = updatedLines[i].trim();
        if (line.endsWith('|')) {
          if (i === startTableIdx + 1) { // this is the separator row like |---|---|
            updatedLines[i] = line.slice(0, -1) + '---|';
          } else {
            updatedLines[i] = line.slice(0, -1) + '   |';
          }
        }
      }

      commitUndoSnapshot(activeContent);
      const updatedText = updatedLines.join('\n');
      setActiveContent(updatedText);

      // Save notes
      const activeNote = notes.find(n => n.id === activeNoteId);
      if (activeNote) {
        const updatedNotes = notes.map(n => {
          if (n.id === activeNoteId) {
            return { ...n, content: updatedText, updatedAt: Date.now() };
          }
          return n;
        });
        setNotes(updatedNotes);
        saveNotesToStorage(updatedNotes);
      }

      showFlashFeedback('Added column to table');
    } else {
      // Not in a table, just add to current line
      commitUndoSnapshot(activeContent);
      const updatedLines = [...lines];
      updatedLines[targetIndex] = updatedLines[targetIndex] + ' |   |';
      const updatedText = updatedLines.join('\n');
      setActiveContent(updatedText);

      // Save
      const activeNote = notes.find(n => n.id === activeNoteId);
      if (activeNote) {
        const updatedNotes = notes.map(n => {
          if (n.id === activeNoteId) {
            return { ...n, content: updatedText, updatedAt: Date.now() };
          }
          return n;
        });
        setNotes(updatedNotes);
        saveNotesToStorage(updatedNotes);
      }
      showFlashFeedback('Added column at line end');
    }
  };

  const applyManualPaste = () => {
    if (manualPasteVal) {
      insertTextAtCursor(manualPasteVal);
      showFlashFeedback('Pasted manually input text!');
    }
    setIsManualPasteOpen(false);
  };

  const closeDropdowns = () => {
    setActiveDropdown(null);
    setIsBottomMenuOpen(false);
  };

  const isClassic = settings.theme === 'windows-classic';

  return (
    <DeviceFrame onVirtualBack={handleVirtualBack} onVirtualHome={() => handleSelectNote(notes[0]?.id || 'welcome-note')}>
      <div 
        className={`flex-1 flex flex-col h-full relative overflow-hidden font-sans select-none ${
          settings.theme === 'windows-classic' 
            ? 'bg-[#c0c0c0] text-black font-mono'
            : settings.theme === 'android-dark'
              ? 'bg-[#090d16] text-slate-100'
              : settings.theme === 'android-light'
                ? 'bg-[#f8fafc] text-slate-900'
                : 'bg-black text-amber-500 border border-amber-500/20'
        }`}
        onClick={closeDropdowns}
      >
        {/* ========================================================
            1. APP HEADER COMPONENT
            ======================================================== */}
        
        {isClassic ? (
          /* ================= CLASSIC RETRO HEADER ================= */
          <div className="flex flex-col border-b border-[#808080] select-none text-black">
            {/* Win98 blue title banner */}
            <div className="bg-blue-800 text-white flex justify-between items-center px-1.5 py-1 text-xs font-bold leading-none">
              <div className="flex items-center gap-1.5 font-mono">
                <FileText className="w-3.5 h-3.5" />
                <span>{activeTitle} - Notepad Classic</span>
              </div>
              <div className="flex items-center gap-0.5">
                {/* 3D Title Bar Actions */}
                <span className="w-3.5 h-3.5 bg-[#c0c0c0] text-black text-[9px] font-bold border border-zinc-500 flex items-center justify-center">-</span>
                <span className="w-3.5 h-3.5 bg-[#c0c0c0] text-black text-[9px] font-bold border border-zinc-500 flex items-center justify-center">□</span>
                <button 
                  onClick={() => alert('Exit classic emulator? Switch theme or expand layout anytime!')}
                  className="w-3.5 h-3.5 bg-[#c0c0c0] text-black text-[10px] font-bold border border-zinc-500 flex items-center justify-center cursor-pointer hover:bg-zinc-300 active:bg-zinc-400"
                >
                  x
                </button>
              </div>
            </div>

            {/* Menu options row */}
            <div className="flex items-center gap-2 px-1 py-0.5 bg-[#c0c0c0] text-xs select-none">
              {/* File Menu */}
              <div className="relative">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdown(activeDropdown === 'file' ? null : 'file');
                  }}
                  className={`px-2 py-0.5 cursor-pointer font-sans leading-relaxed ${
                    activeDropdown === 'file' ? 'bg-blue-800 text-white font-bold' : 'hover:bg-zinc-300 text-black'
                  }`}
                >
                  File
                </button>
                {activeDropdown === 'file' && (
                  <div className="absolute left-0 top-full mt-0.5 w-44 windows-3d-box p-0.5 z-50 text-black text-xs font-sans leading-loose">
                    <button onClick={handleNewNote} className="w-full text-left px-3 hover:bg-blue-800 hover:text-white flex justify-between cursor-pointer">
                      <span>New</span>
                      <span className="text-[10px] pl-3 text-zinc-500 hover:text-inherit">Ctrl+N</span>
                    </button>
                    <button onClick={() => setIsExplorerOpen(true)} className="w-full text-left px-3 hover:bg-blue-800 hover:text-white flex justify-between cursor-pointer">
                      <span>Open Files...</span>
                      <span className="text-[10px] pl-3 text-zinc-500 hover:text-inherit">Ctrl+O</span>
                    </button>
                    <button onClick={() => handleExportNote(notes.find(n => n.id === activeNoteId)!)} className="w-full text-left px-3 hover:bg-blue-800 hover:text-white flex justify-between cursor-pointer">
                      <span>Export TXT</span>
                      <span className="text-[10px] pl-3 text-zinc-500 hover:text-inherit">Ctrl+S</span>
                    </button>
                    <div className="h-[2px] bg-zinc-400 my-0.5 border-b border-white" />
                    <button onClick={() => setIsSettingsOpen(true)} className="w-full text-left px-3 hover:bg-blue-800 hover:text-white cursor-pointer">
                      Page Setup / Properties
                    </button>
                    <button onClick={() => setIsClassicHelpOpen(true)} className="w-full text-left px-3 hover:bg-blue-800 hover:text-white cursor-pointer">
                      Help Topics
                    </button>
                  </div>
                )}
              </div>

              {/* Edit Menu */}
              <div className="relative">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdown(activeDropdown === 'edit' ? null : 'edit');
                  }}
                  className={`px-2 py-0.5 cursor-pointer font-sans leading-relaxed ${
                    activeDropdown === 'edit' ? 'bg-blue-800 text-white font-bold' : 'hover:bg-zinc-300 text-black'
                  }`}
                >
                  Edit
                </button>
                {activeDropdown === 'edit' && (
                  <div className="absolute left-0 top-full mt-0.5 w-44 windows-3d-box p-0.5 z-50 text-black text-xs font-sans leading-loose">
                    <button onClick={handleUndo} disabled={undoStack.length === 0} className="w-full text-left px-3 hover:bg-blue-800 hover:text-white flex justify-between cursor-pointer disabled:opacity-40">
                      <span>Undo</span>
                      <span className="text-[10px] pl-3 text-zinc-500 hover:text-inherit">Ctrl+Z</span>
                    </button>
                    <button onClick={handleRedo} disabled={redoStack.length === 0} className="w-full text-left px-3 hover:bg-blue-800 hover:text-white flex justify-between cursor-pointer disabled:opacity-40">
                      <span>Redo</span>
                      <span className="text-[10px] pl-3 text-zinc-500 hover:text-inherit">Ctrl+Y</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Format Menu */}
              <div className="relative">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdown(activeDropdown === 'format' ? null : 'format');
                  }}
                  className={`px-2 py-0.5 cursor-pointer font-sans leading-relaxed ${
                    activeDropdown === 'format' ? 'bg-blue-800 text-white font-bold' : 'hover:bg-zinc-300 text-black'
                  }`}
                >
                  Format
                </button>
                {activeDropdown === 'format' && (
                  <div className="absolute left-0 top-full mt-0.5 w-48 windows-3d-box p-0.5 z-50 text-black text-xs font-sans leading-loose">
                    <button 
                      onClick={() => setSettings(prev => ({ ...prev, wordWrap: !prev.wordWrap }))}
                      className="w-full text-left px-3 hover:bg-blue-800 hover:text-white flex items-center justify-between cursor-pointer"
                    >
                      <span>Word Wrap Check</span>
                      <span>{settings.wordWrap ? '✓' : ''}</span>
                    </button>
                    <button onClick={() => setIsSettingsOpen(true)} className="w-full text-left px-3 hover:bg-blue-800 hover:text-white cursor-pointer">
                      Font Properties...
                    </button>
                  </div>
                )}
              </div>

              {/* Help option */}
              <div className="relative">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdown(activeDropdown === 'help' ? null : 'help');
                  }}
                  className={`px-2 py-0.5 cursor-pointer font-sans leading-relaxed ${
                    activeDropdown === 'help' ? 'bg-blue-800 text-white font-bold' : 'hover:bg-zinc-300 text-black'
                  }`}
                >
                  Help
                </button>
                {activeDropdown === 'help' && (
                  <div className="absolute left-0 top-full mt-0.5 w-40 windows-3d-box p-0.5 z-50 text-black text-xs font-sans leading-loose">
                    <button onClick={() => setIsClassicHelpOpen(true)} className="w-full text-left px-3 hover:bg-blue-800 hover:text-white cursor-pointer">
                      User Manual Guide
                    </button>
                    <div className="h-[2px] bg-zinc-400 my-0.5 border-b border-white" />
                    <button onClick={() => alert('Windows Notepad Mobile Clone v1.0. Developed offline first.')} className="w-full text-left px-3 hover:bg-blue-800 hover:text-white cursor-pointer">
                      About Notepad
                    </button>
                  </div>
                )}
              </div>

              {/* Divider spacing */}
              <div className="ml-auto flex items-center gap-1.5 px-2">
                <button 
                  onClick={() => setIsExplorerOpen(true)}
                  className="windows-3d-button text-[10px] px-2 py-0.5 flex items-center gap-1 cursor-pointer font-bold shrink-0 text-black"
                >
                  Files System
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ================= SLEEK MATERIAL HEADER ================= */
          <div className="h-16 flex items-center justify-between px-4 select-none shrink-0 border-b border-black/10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsExplorerOpen(true)}
                className={`p-2.5 rounded-2xl transition-all relative cursor-pointer ${
                  settings.theme === 'android-light' 
                    ? 'bg-slate-200/50 hover:bg-slate-200 text-slate-800' 
                    : 'bg-slate-900/60 hover:bg-slate-850 text-slate-200 border border-slate-850'
                }`}
                title="Expand workspace folder"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div className="flex flex-col select-none justify-center">
                {/* Top: NoteNova */}
                <span className={`text-sm font-semibold tracking-tight leading-tight transition-all max-w-[150px] sm:max-w-xs ${
                  settings.theme === 'android-light' 
                    ? 'text-slate-900' 
                    : 'text-white'
                }`}>
                  NoteNova
                </span>
                
                {/* Below: Note Name (White / Slate-750 in light) */}
                <span className={`text-[10px] font-medium leading-tight mt-0.5 ${
                  settings.theme === 'android-light' ? 'text-slate-600' : 'text-white'
                }`}>
                  {activeTitle}
                </span>
              </div>
            </div>

            {/* Android Right System Toolbar */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Quick Theme Toggle Option (Light / Dark) */}
              <button
                onClick={() => {
                  setSettings(prev => ({
                    ...prev,
                    theme: prev.theme === 'android-light' ? 'android-dark' : 'android-light'
                  }));
                }}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  settings.theme === 'android-light' 
                    ? 'hover:bg-slate-200 text-slate-600 hover:text-slate-905' 
                    : 'hover:bg-slate-900 text-slate-400 hover:text-slate-105'
                }`}
                title={settings.theme === 'android-light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
              >
                {settings.theme === 'android-light' ? (
                  <Moon className="w-4.5 h-4.5 text-zinc-600" />
                ) : (
                  <Sun className="w-4.5 h-4.5 text-amber-400" />
                )}
              </button>

              {/* Force local download export button */}
              <button
                onClick={() => handleExportNote(notes.find(n => n.id === activeNoteId)!)}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  settings.theme === 'android-light' 
                    ? 'hover:bg-slate-200 text-slate-600 hover:text-slate-900' 
                    : 'hover:bg-slate-900 text-slate-400 hover:text-slate-100'
                }`}
                title="Download txt file"
              >
                <Download className="w-4.5 h-4.5" />
              </button>

              {/* Share */}
              <button
                onClick={() => handleShareNote(notes.find(n => n.id === activeNoteId)!)}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  settings.theme === 'android-light' 
                    ? 'hover:bg-slate-200 text-slate-600 hover:text-slate-900' 
                    : 'hover:bg-slate-900 text-slate-400 hover:text-slate-100'
                }`}
                title="Share document contents"
              >
                <Share2 className="w-4.5 h-4.5" />
              </button>

              {/* Wrap ON/OFF Toggle */}
              <button
                onClick={() => setSettings(prev => ({ ...prev, wordWrap: !prev.wordWrap }))}
                className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                  settings.theme === 'android-light' 
                    ? settings.wordWrap
                      ? 'bg-blue-105 hover:bg-blue-200 text-blue-700'
                      : 'hover:bg-slate-200 text-slate-650 hover:text-slate-950' 
                    : settings.wordWrap
                      ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400'
                      : 'hover:bg-slate-900 text-slate-400 hover:text-white'
                }`}
                title={settings.wordWrap ? "Word Wrap: ON" : "Word Wrap: OFF"}
              >
                <ArrowLeftRight className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            2. KEYBOARD ACCESSORY SHORTCUT BAR (EDIT HELPERS)
            ======================================================== */}
        <EditHelpers
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          wordWrap={settings.wordWrap}
          onToggleWordWrap={() => setSettings(prev => ({ ...prev, wordWrap: !prev.wordWrap }))}
          theme={settings.theme}
        />

        {/* ========================================================
            3. MAIN NOTEPAD TEXT EDITING WINDOW AREA
            ======================================================== */}
        <div className="flex-1 relative flex flex-col overflow-hidden select-text">
          <textarea
            ref={textareaRef}
            value={activeContent}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            className={`w-full flex-1 p-5 outline-none resize-none overflow-y-auto ${
              settings.theme === 'windows-classic'
                ? 'font-classic bg-white text-black'
                : settings.theme === 'obsidian-contrast'
                  ? 'font-sans text-amber-400 font-medium'
                  : settings.fontFamily === 'monospace'
                    ? 'font-mono'
                    : settings.fontFamily === 'serif'
                      ? 'font-serif'
                      : settings.fontFamily === 'friendly'
                        ? 'font-friendly'
                        : 'font-sans'
            }`}
            style={{
              fontSize: `${settings.fontSize}px`,
              lineHeight: settings.lineSpacing,
              whiteSpace: settings.wordWrap ? 'pre-wrap' : 'pre',
              wordWrap: settings.wordWrap ? 'break-word' : 'normal',
            }}
            placeholder="Type your notes or document text here..."
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />

          {/* Transparent Transient Feedback Overlay (e.g. copied, autosaved notification) */}
          {clipboardFeedback && (
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-950/90 text-white text-[11px] font-semibold tracking-wide py-2 px-4 border border-blue-500/30 rounded-2xl z-40 select-none shadow-xl animate-bounce flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {clipboardFeedback}
            </div>
          )}
        </div>

        {/* ========================================================
            4. BOTTOM SYSTEM STATUS BAR (L/COL STATS & WORDS)
            ======================================================== */}
        <div 
          className={`h-8 px-3 flex items-center justify-between text-[11px] select-none border-t relative ${
            isClassic 
              ? 'bg-[#c0c0c0] text-black border-[#808080] font-mono' 
              : 'bg-slate-950/90 border-slate-900 text-slate-500'
          }`}
          onClick={closeDropdowns}
        >
          {/* Left panel: quick info summary stats */}
          <div className="flex items-center gap-3">
            <span className="font-semibold truncate">
              Words: {activeContent ? activeContent.trim().split(/\s+/).length : 0}
            </span>
            <span className={isClassic ? 'text-zinc-650' : 'text-slate-600'}>|</span>
             <span className="font-semibold">
              Chars: {activeContent.length}
            </span>
          </div>

          {/* Right section: line col position offsets and bottom actions menu */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-slate-500">
              UTF-8
            </span>
            <span className="hidden sm:inline">
              Ln {activeContent.substring(0, textareaRef.current?.selectionStart || 0).split('\n').length}, Col {(textareaRef.current?.selectionStart || 0) - activeContent.lastIndexOf('\n', (textareaRef.current?.selectionStart || 0) - 1)}
            </span>
            <span className={isClassic ? 'text-zinc-650' : 'text-slate-600'}>|</span>

            {/* Wrench tools popover menu trigger */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsBottomMenuOpen(!isBottomMenuOpen);
                  setActiveDropdown(null);
                }}
                className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                  isClassic
                    ? 'windows-3d-button text-black'
                    : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                }`}
                title="NoteNova Tools"
              >
                <Wrench className="w-3.5 h-3.5" />
              </button>

              {isBottomMenuOpen && (
                <div 
                  className={`absolute right-0 bottom-full mb-2 w-64 sm:w-72 z-50 text-xs p-3.5 flex flex-col gap-3.5 shadow-2xl rounded-2xl ${
                    isClassic
                      ? 'windows-3d-box bg-[#c0c0c0] text-black font-mono'
                      : settings.theme === 'android-light'
                        ? 'bg-white border border-slate-200 text-slate-900 font-sans shadow-xl'
                        : 'bg-slate-900 border border-slate-800 rounded-xl text-slate-100 font-sans shadow-2xl'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header Title with custom styling */}
                  <div className={`flex items-center justify-between border-b pb-2 ${isClassic ? 'border-zinc-400' : 'border-slate-800'}`}>
                    <span className="font-bold flex items-center gap-1.5 text-blue-500">
                      <Wrench className="w-3.5 h-3.5" /> NoteNova Tools
                    </span>
                    <button 
                      onClick={() => setIsBottomMenuOpen(false)} 
                      className={`cursor-pointer p-0.5 rounded ${
                        isClassic 
                          ? 'windows-3d-button text-black' 
                          : settings.theme === 'android-light'
                            ? 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
                            : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
                      }`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* 1. Font Families */}
                  <div className="flex flex-col gap-1">
                    <span className={`font-semibold text-[10px] uppercase tracking-wider ${settings.theme === 'android-light' ? 'text-slate-500' : 'text-slate-400'}`}>
                      Font Style
                    </span>
                    <div className={`grid grid-cols-2 gap-1 p-1 rounded-lg ${settings.theme === 'android-light' ? 'bg-slate-100/70' : 'bg-slate-950/60'}`}>
                      {[
                        { value: 'monospace', label: 'Monospace' },
                        { value: 'sans-serif', label: 'Sans-Serif' },
                        { value: 'serif', label: 'Serif' },
                        { value: 'friendly', label: 'Friendly' }
                      ].map((f) => {
                        const active = settings.fontFamily === f.value;
                        return (
                          <button
                            key={f.value}
                            onClick={() => {
                              setSettings(prev => ({ ...prev, fontFamily: f.value as any }));
                            }}
                            className={`px-1.5 py-1.5 rounded text-center truncate text-[10px] font-medium cursor-pointer transition-all ${
                              active
                                ? (isClassic 
                                  ? 'bg-blue-800 text-white font-bold' 
                                  : 'bg-blue-600 text-white font-semibold')
                                : (isClassic
                                  ? 'hover:bg-zinc-350 text-black'
                                  : settings.theme === 'android-light'
                                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800')
                            }`}
                          >
                            {f.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Font Sizing Offset */}
                  <div className="flex flex-col gap-1">
                    <span className={`font-semibold text-[10px] uppercase tracking-wider ${settings.theme === 'android-light' ? 'text-slate-500' : 'text-slate-400'}`}>
                      Font Size
                    </span>
                    <div className={`flex items-center justify-between p-1.5 rounded-lg ${settings.theme === 'android-light' ? 'bg-slate-100/70' : 'bg-slate-950/60'}`}>
                      <button
                        onClick={() => {
                          setSettings(prev => ({ ...prev, fontSize: Math.max(10, prev.fontSize - 1) }));
                        }}
                        className={`w-8 h-6 flex items-center justify-center rounded font-bold cursor-pointer transition-all ${
                          isClassic 
                            ? 'windows-3d-button text-black' 
                            : settings.theme === 'android-light'
                              ? 'bg-slate-200/55 hover:bg-slate-200 text-slate-700'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                        }`}
                        title="Decrease Font Size"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-xs select-all">
                        {settings.fontSize}px
                      </span>
                      <button
                        onClick={() => {
                          setSettings(prev => ({ ...prev, fontSize: Math.min(48, prev.fontSize + 1) }));
                        }}
                        className={`w-8 h-6 flex items-center justify-center rounded font-bold cursor-pointer transition-all ${
                          isClassic 
                            ? 'windows-3d-button text-black' 
                            : settings.theme === 'android-light'
                              ? 'bg-slate-200/55 hover:bg-slate-200 text-slate-700'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                        }`}
                        title="Increase Font Size"
                      >
                        +
                      </button>
                    </div>
                  </div>


                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================
            5. DRAWER AND OVERLAYS IMPLEMENTATIONS
            ======================================================== */}

        {/* COLLAPSIBLE SIDEBAR FILE WORKSPACE EXPLORER */}
        <FileExplorer
          notes={notes}
          activeNoteId={activeNoteId}
          onSelectNote={handleSelectNote}
          onNewNote={handleNewNote}
          onDeleteNote={handleDeleteNote}
          onRestoreNote={handleRestoreNote}
          onDeletePermanently={handleDeletePermanently}
          onRenameNote={handleRenameNote}
          onImportNote={handleImportNote}
          onExportNote={handleExportNote}
          onShareNote={handleShareNote}
          theme={settings.theme}
          isOpen={isExplorerOpen}
          onClose={() => setIsExplorerOpen(false)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenTrash={() => setIsTrashOpen(true)}
          activeStorage={storageChoice || 'local'}
        />

        {/* TRANSPARENT DRAWER BACKDROP DISMISS CONTROL */}
        {isExplorerOpen && (
          <div 
            onClick={() => setIsExplorerOpen(false)}
            className="absolute inset-0 bg-black/40 z-30 transition-opacity backdrop-blur-3xs"
          />
        )}

        {/* EDIT CONFIGURABLE SETTINGS APPEARANCE POPUP */}
        <SettingsModal
          isOpen={isSettingsOpen}
          settings={settings}
          onChangeSettings={(next) => setSettings(next)}
          onClose={() => {
            setIsSettingsOpen(false);
            textareaRef.current?.focus();
          }}
          storageChoice={storageChoice}
          onSetStorageChoice={(c) => {
            setStorageChoice(c);
            localStorage.setItem('notepad_storage_choice', c);
            if (c === 'local') {
              handleDisconnectDrive();
            } else {
              handleConnectDrive();
            }
          }}
          driveUser={driveUser}
          driveFiles={driveFiles}
          isDriveLoading={isDriveLoading}
          onConnectDrive={handleConnectDrive}
          onDisconnectDrive={handleDisconnectDrive}
          onRefreshDriveFiles={handleRefreshDriveFiles}
          onDeleteDriveFile={handleDeleteDriveFile}
        />

        {/* REGENERATED TRASH BIN POPUP MODAL SCREEN */}
        <TrashBinModal
          isOpen={isTrashOpen}
          notes={notes}
          theme={settings.theme}
          onClose={() => {
            setIsTrashOpen(false);
            textareaRef.current?.focus();
          }}
          onRestoreNote={handleRestoreNote}
          onDeletePermanently={handleDeletePermanently}
        />

        {/* STARTUP WORKSPACE STORAGE CHOICE POPUP */}
        {storageChoice === null && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-55 p-4 select-none">
            <div className={`w-full max-w-sm rounded-3xl p-6 border text-slate-100 shadow-2xl ${
              settings.theme === 'windows-classic' ? 'windows-3d-box text-black font-mono' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500 mb-2 border border-blue-500/10">
                  <Cloud className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Select Storage Workspace</h3>
                  <p className="text-xs text-slate-400">Choose how would you like to save and sync your notes inside NoteNova.</p>
                </div>

                <div className="space-y-3 pt-3">
                  {/* Option 1: Local Storage */}
                  <button
                    onClick={() => {
                      setStorageChoice('local');
                      localStorage.setItem('notepad_storage_choice', 'local');
                      showFlashFeedback('Storage Choice: Offline Local Storage Mode initialized.');
                    }}
                    className="w-full text-left p-4 rounded-2xl bg-slate-950 border border-slate-850 hover:bg-slate-900/60 transition-all cursor-pointer flex gap-3 group"
                  >
                    <div className="p-2 rounded-xl bg-slate-900 group-hover:bg-slate-950 border border-slate-800 shrink-0">
                      <Database className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="min-w-0 flex-1 leading-normal">
                      <div className="text-xs font-semibold text-slate-100">Option 1 — Local Storage</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Use the app offline. Notes persist locally on this device's cache.</div>
                    </div>
                  </button>

                  {/* Option 2: Google Drive Login */}
                  <button
                    onClick={handleConnectDrive}
                    className="w-full text-left p-4 rounded-2xl bg-slate-950 border border-blue-900/20 hover:border-blue-505/40 hover:bg-blue-950/10 transition-all cursor-pointer flex gap-3 group"
                  >
                    <div className="p-2 rounded-xl bg-blue-950 border border-blue-900 shrink-0">
                      <Cloud className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="min-w-0 flex-1 leading-normal">
                      <div className="text-xs font-semibold text-slate-100">Option 2 — Google Drive Cloud</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Connect Google Drive, automatically create NoteNova folder, sync and backup files securely in the cloud.</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PASTE MANUAL OVERRIDE OVERLAY MODULE */}
        {isManualPasteOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-55 p-4">
            <div className={`w-full max-w-sm rounded-3xl p-5 border text-slate-100 shadow-2xl ${
              isClassic ? 'windows-3d-box text-black font-mono' : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider">Manual Clipboard Import</h4>
                <button onClick={() => setIsManualPasteOpen(false)} className="cursor-pointer">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                iFrame sandbox security block bypassed successfully. Paste your notes content below and hit insert:
              </p>
              <textarea
                value={manualPasteVal}
                onChange={(e) => setManualPasteVal(e.target.value)}
                rows={5}
                className="w-full text-xs p-2 text-black bg-white border border-zinc-400 outline-none rounded-lg resize-none mb-3 font-semibold"
                placeholder="Ctrl+V or tap paste here..."
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setIsManualPasteOpen(false)}
                  className="flex-1 py-1.5 border border-zinc-400 text-xs rounded hover:bg-zinc-100 active:bg-zinc-200 cursor-pointer font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={applyManualPaste}
                  className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded shadow cursor-pointer"
                >
                  Insert Text
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HELP GUIDE TOPICS MODAL DIALOG */}
        {isClassicHelpOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-55 p-4 select-text font-mono text-black">
            <div className="w-[360px] windows-3d-box p-1">
              <div className="bg-blue-800 text-white flex justify-between items-center px-1.5 py-0.5 leading-normal font-bold text-xs select-none">
                <span>Notepad Help Manual</span>
                <button onClick={() => setIsClassicHelpOpen(false)} className="windows-3d-button text-black w-4 h-4 p-0 font-bold text-[10px]">x</button>
              </div>
              <div className="p-3 space-y-2.5 max-h-[380px] overflow-y-auto text-[11px] leading-relaxed">
                <div>
                  <h5 className="font-bold border-b border-zinc-400 pb-0.5">📂 Open Files Dialog</h5>
                  <p className="text-zinc-700">{"Click the menu File -> Open Files... (or the slide icon in modern theme) to display the offline files structure sidebar panel."}</p>
                </div>
                <div>
                  <h5 className="font-bold border-b border-zinc-400 pb-0.5">💾 File Saving System</h5>
                  <p className="text-zinc-700">All typing is durably cached in offline browser localStorage immediately. Session is saved across browser reloads so you never lose metadata!</p>
                </div>
                <div>
                  <h5 className="font-bold border-b border-zinc-400 pb-0.5">🛠️ Clipboard Shortcuts</h5>
                  <p className="text-zinc-700 font-sans">Use our Keyboard Accessory Bar (Undo, Redo, Cut, Copy, Paste, Select All) to write efficiently without having to fight viewport keyboards.</p>
                </div>
                <div>
                  <h5 className="font-bold border-b border-zinc-400 pb-0.5">🎨 Theme Customisation</h5>
                  <p className="text-zinc-700">{"Modify properties under \"Format -> Font Properties\" to toggle themes, adjust font scaling, spacing height, or Word Wrap."}</p>
                </div>
              </div>
              <div className="p-2 border-t border-zinc-350 flex justify-end select-none">
                <button onClick={() => setIsClassicHelpOpen(false)} className="windows-3d-button px-4 py-1.5 font-bold text-xs cursor-pointer text-center">OK</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DeviceFrame>
  );
}
