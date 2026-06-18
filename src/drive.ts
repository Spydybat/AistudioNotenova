/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.message?.includes('popup-closed-by-user') ||
      error?.message?.includes('cancelled-popup-request') ||
      error?.message?.includes('closed-by-user')
    ) {
      console.warn('Sign in cancelled because the popup was closed.');
      return null;
    }
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const googleSignOut = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// Google Drive Sync Helper Functions
export interface DriveFile {
  id: string;
  name: string;
  size?: string;
  modifiedTime?: string;
}

// 1. Get or create folder named "NoteNova"
export async function getOrCreateNoteNovaFolder(token: string): Promise<string> {
  const query = encodeURIComponent("name = 'NoteNova' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    throw new Error('Failed to find NoteNova folder');
  }
  
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'NoteNova',
      mimeType: 'application/vnd.google-apps.folder'
    })
  });
  
  if (!createRes.ok) {
    throw new Error('Failed to create NoteNova folder');
  }
  
  const createdFolder = await createRes.json();
  return createdFolder.id;
}

// 2. List TXT files inside "NoteNova" folder
export async function listDriveFiles(token: string, folderId: string): Promise<DriveFile[]> {
  const query = encodeURIComponent(`'${folderId}' in parents and mimeType = 'text/plain' and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,size,modifiedTime)&orderBy=modifiedTime desc`;
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    throw new Error('Failed to list files from Google Drive');
  }
  
  const data = await res.json();
  return data.files || [];
}

// 3. Save / upload file to "NoteNova" folder
export async function saveFileToDrive(
  token: string,
  folderId: string,
  fileName: string,
  content: string,
  existingFileId?: string | null
): Promise<string> {
  const cleanName = fileName.endsWith('.txt') ? fileName : `${fileName}.txt`;
  let fileId = existingFileId;
  
  if (!fileId) {
    const query = encodeURIComponent(`'${folderId}' in parents and name = '${cleanName.replace(/'/g, "\\'")}' and mimeType = 'text/plain' and trashed = false`);
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        fileId = searchData.files[0].id;
      }
    }
  }
  
  if (fileId) {
    const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    const uploadRes = await fetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'text/plain'
      },
      body: content
    });
    
    if (!uploadRes.ok) {
      throw new Error(`Failed to update file content on Drive: ${uploadRes.statusText}`);
    }
    
    const metaUrl = `https://www.googleapis.com/drive/v3/files/${fileId}`;
    await fetch(metaUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: cleanName })
    });
    
    return fileId;
  } else {
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: cleanName,
        parents: [folderId],
        mimeType: 'text/plain'
      })
    });
    
    if (!createRes.ok) {
      throw new Error('Failed to create file on Drive');
    }
    
    const createdMeta = await createRes.json();
    const newFileId = createdMeta.id;
    
    const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${newFileId}?uploadType=media`;
    const uploadRes = await fetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'text/plain'
      },
      body: content
    });
    
    if (!uploadRes.ok) {
      throw new Error('Failed to upload file content to Drive');
    }
    
    return newFileId;
  }
}

// 4. Delete file from Google Drive NoteNova folder
export async function deleteFileFromDrive(token: string, fileId: string): Promise<void> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    throw new Error('Failed to delete file from Google Drive');
  }
}
