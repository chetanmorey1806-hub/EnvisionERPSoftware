import api from './axios';

/**
 * Document Vault.
 *
 * File bytes are streamed by the API (never a guessable static URL), so every
 * read re-checks access. Downloads therefore come back as blobs.
 */
export const documentApi = {
  // folders
  listFolders: (parentId) => api.get('/documents/folders', { params: { parentId } }),
  createFolder: (data) => api.post('/documents/folders', data),
  renameFolder: (id, name) => api.patch(`/documents/folders/${id}`, { name }),
  moveFolder: (id, parentId) => api.patch(`/documents/folders/${id}/move`, { parentId }),
  deleteFolder: (id) => api.delete(`/documents/folders/${id}`),
  breadcrumb: (id) => api.get(`/documents/folders/${id}/breadcrumb`),

  // files
  listFiles: (params) => api.get('/documents/files', { params }),
  upload: (formData, onProgress) =>
    api.post('/documents/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
      },
    }),
  updateFile: (id, data) => api.patch(`/documents/files/${id}`, data),
  moveFile: (id, folderId) => api.patch(`/documents/files/${id}/move`, { folderId }),
  deleteFile: (id) => api.delete(`/documents/files/${id}`),
  download: (id) => api.get(`/documents/files/${id}/download`, { responseType: 'blob' }),
  view: (id) => api.get(`/documents/files/${id}/view`, { responseType: 'blob' }),

  // tags & sharing
  tags: (scope) => api.get('/documents/tags', { params: { scope } }),
  shareUsers: () => api.get('/documents/users'),
  share: (data) => api.post('/documents/share', data),
  revokeShare: (id) => api.delete(`/documents/share/${id}`),
  sharedWithMe: () => api.get('/documents/shared-with-me'),
  sharedByMe: () => api.get('/documents/shared-by-me'),

  // admin
  owners: () => api.get('/documents/owners'),
  allFiles: (params) => api.get('/documents/all-files', { params }),
};

/** Trigger a browser save for a blob response. */
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'document';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default documentApi;
