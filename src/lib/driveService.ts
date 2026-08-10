export interface DriveUploadResult {
  id: string;
  name: string;
  webViewLink?: string;
  webContentLink?: string;
  size?: string;
}

/**
 * Helper to check if folder "Ghi hinh" exists on Google Drive, or create it if not.
 */
export async function getOrCreateFolder(
  accessToken: string,
  folderName: string = 'Ghi hinh'
): Promise<string | null> {
  try {
    const q = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
      }
    }

    // Folder does not exist, create it
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (createRes.ok) {
      const createData = await createRes.json();
      return createData.id;
    }
  } catch (err) {
    console.warn('Error checking/creating Google Drive folder:', err);
  }
  return null;
}

/**
 * Uploads a file blob to Google Drive using Google Drive v3 REST API inside "Ghi hinh" folder
 */
export async function uploadToDrive(
  accessToken: string,
  fileBlob: Blob,
  fileName: string,
  mimeType: string,
  onProgress?: (percent: number) => void
): Promise<DriveUploadResult> {
  const folderId = await getOrCreateFolder(accessToken, 'Ghi hinh');

  // Try client-side direct upload first
  try {
    const metadata: Record<string, any> = {
      name: fileName,
      mimeType: mimeType,
    };
    if (folderId) {
      metadata.parents = [folderId];
    }

    const formData = new FormData();
    formData.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    formData.append('file', fileBlob, fileName);

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,size',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      }
    );

    if (res.ok) {
      const data = await res.json();
      return data;
    }

    const errData = await res.json().catch(() => ({}));
    console.warn('Client direct Drive upload failed, trying server proxy endpoint...', errData);
  } catch (err) {
    console.warn('Client direct upload fetch error, falling back to server API endpoint:', err);
  }

  // Fallback to server proxy route /api/drive/upload
  const base64Data = await blobToBase64(fileBlob);
  const serverRes = await fetch('/api/drive/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      accessToken,
      fileName,
      mimeType,
      folderId,
      fileData: base64Data,
    }),
  });

  const serverData = await serverRes.json();
  if (!serverRes.ok || !serverData.success) {
    throw new Error(serverData.error || 'Lỗi khi tải file lên Google Drive');
  }

  return serverData.file;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
