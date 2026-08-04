/**
 * DocumentVaultController — private per-user document storage with sharing.
 *
 * ACCESS RULES (the whole point of this module):
 *   - The OWNER has full access to their own folders and files.
 *   - An ADMIN (documents.manage) may browse and open anything — that is what
 *     powers the "All Files / All users" view.
 *   - Everyone else sees an item only if a live row in `document_shares` grants
 *     it. A share on a FOLDER cascades to that folder's descendants, so sharing
 *     a parent shares everything under it without copying rows.
 *   - `access_level` decides what a recipient may do: 'view' streams inline,
 *     'download' also allows the file to be saved.
 *
 * The owner id ALWAYS comes from the JWT (req.user.id), never from the request
 * body — otherwise a caller could write into someone else's vault.
 */
const fs = require('fs');
const path = require('path');
const Documents = require('../models/DocumentModel');
const RoleModel = require('../models/RoleModel');
const { query } = require('../config/db');
const { success, created, fail } = require('../utils/response');

const UPLOAD_ROOT = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');

/** Suggested tags every vault starts with; users can add their own. */
const DEFAULT_TAGS = ['Institute Confidential', 'Student Records', 'Fees', 'Certificates'];

// ---- helpers ---------------------------------------------------------------

const sanitizeName = (s, fallback = 'Untitled') => {
  const v = String(s || '').replace(/[\\/\x00-\x1f]/g, '').trim().slice(0, 255);
  return v || fallback;
};

/** Accepts an array, a JSON string, or a comma-separated string. */
const normalizeTags = (raw) => {
  let arr = raw;
  if (typeof raw === 'string') {
    try { arr = JSON.parse(raw); } catch { arr = raw.split(','); }
  }
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const out = [];
  for (const t of arr) {
    const v = String(t || '').trim().slice(0, 50);
    if (v && !seen.has(v.toLowerCase())) { seen.add(v.toLowerCase()); out.push(v); }
  }
  return out.slice(0, 30);
};

/** Admins may browse every vault. Driven by the permission, not the role name. */
async function isVaultAdmin(userId) {
  const perms = await RoleModel.permissionNamesForUser(userId);
  return perms.includes('documents.manage');
}

/**
 * What access does `viewerId` have on a folder?
 * Checks the folder itself AND its ancestors, so a share on a parent cascades.
 * Returns 'download' | 'view' | null.
 */
async function folderAccess(folder, viewerId) {
  if (folder.user_id === viewerId) return 'download';
  if (await isVaultAdmin(viewerId)) return 'download';

  const chain = [folder.id, ...(await Documents.folderAncestorIds(folder.id, folder.user_id))];
  const shares = await Documents.liveSharesFor(viewerId, 'folder', chain);
  if (!shares.length) return null;
  return shares.some((s) => s.access_level === 'download') ? 'download' : 'view';
}

/**
 * What access does `viewerId` have on a file?
 * Either a direct share on the file, or a share on any folder above it.
 */
async function fileAccess(file, viewerId) {
  if (file.user_id === viewerId) return 'download';
  if (await isVaultAdmin(viewerId)) return 'download';

  const direct = await Documents.liveSharesFor(viewerId, 'file', [file.id]);
  let level = direct.length
    ? (direct.some((s) => s.access_level === 'download') ? 'download' : 'view')
    : null;

  if (file.folder_id) {
    const chain = [file.folder_id, ...(await Documents.folderAncestorIds(file.folder_id, file.user_id))];
    const viaFolder = await Documents.liveSharesFor(viewerId, 'folder', chain);
    if (viaFolder.length) {
      const folderLevel = viaFolder.some((s) => s.access_level === 'download') ? 'download' : 'view';
      if (folderLevel === 'download' || !level) level = folderLevel;
    }
  }
  return level;
}

/**
 * Whose vault is this listing request for?
 * No folderId => the viewer's own root. A folderId belonging to someone else is
 * allowed only when it (or an ancestor) is shared with the viewer.
 */
async function resolveScope(folderId, viewerId) {
  if (!folderId) return { ownerId: viewerId, access: 'download', shared: false };
  const folder = await Documents.findFolder(folderId);
  if (!folder) return null;
  if (folder.user_id === viewerId) return { ownerId: viewerId, access: 'download', shared: false };
  const level = await folderAccess(folder, viewerId);
  if (!level) return null;
  return { ownerId: folder.user_id, access: level, shared: true };
}

const num = (v) => (v ? Number(v) : null);

// ---- controller ------------------------------------------------------------

const DocumentVaultController = {
  // ==== folders =============================================================

  /** GET /documents/folders?parentId= */
  async listFolders(req, res) {
    const parentId = num(req.query.parentId);
    const scope = await resolveScope(parentId, req.user.id);
    if (!scope) return fail(res, 'You do not have access to this folder.', 403);

    const folders = await Documents.listFolders(scope.ownerId, parentId);
    return success(res, { data: folders, access: scope.access, shared: scope.shared }, 'Folders fetched.');
  },

  /** POST /documents/folders  { name, parentId? } */
  async createFolder(req, res) {
    const name = sanitizeName(req.body?.name, '');
    if (!name) return fail(res, 'Folder name is required.', 422);

    const parentId = num(req.body?.parentId);
    if (parentId) {
      // You may only create inside YOUR OWN folder — never inside a folder that
      // merely happens to be shared with you.
      const parent = await Documents.findFolder(parentId);
      if (!parent || parent.user_id !== req.user.id) {
        return fail(res, 'You can only create folders inside your own vault.', 403);
      }
    }
    const folder = await Documents.createFolder({ userId: req.user.id, parentId, name });
    return created(res, { data: folder }, `Folder "${folder.name}" created.`);
  },

  /** GET /documents/folders/:id/breadcrumb */
  async breadcrumb(req, res) {
    const folder = await Documents.findFolder(req.params.id);
    if (!folder) return fail(res, 'Folder not found.', 404);
    if (!(await folderAccess(folder, req.user.id))) {
      return fail(res, 'You do not have access to this folder.', 403);
    }
    const trail = await Documents.breadcrumb(folder.id, folder.user_id);
    return success(res, { data: trail }, 'Breadcrumb fetched.');
  },

  /** PATCH /documents/folders/:id  { name } */
  async renameFolder(req, res) {
    const folder = await Documents.findFolder(req.params.id);
    if (!folder) return fail(res, 'Folder not found.', 404);
    if (folder.user_id !== req.user.id) return fail(res, 'Only the owner can rename this folder.', 403);
    if (folder.is_system) return fail(res, 'System folders cannot be renamed.', 400);

    const name = sanitizeName(req.body?.name, '');
    if (!name) return fail(res, 'Folder name is required.', 422);
    return success(res, { data: await Documents.renameFolder(folder.id, name) }, 'Folder renamed.');
  },

  /** PATCH /documents/folders/:id/move  { parentId } */
  async moveFolder(req, res) {
    const folder = await Documents.findFolder(req.params.id);
    if (!folder) return fail(res, 'Folder not found.', 404);
    if (folder.user_id !== req.user.id) return fail(res, 'Only the owner can move this folder.', 403);
    if (folder.is_system) return fail(res, 'System folders cannot be moved.', 400);

    const parentId = num(req.body?.parentId);
    if (parentId) {
      const parent = await Documents.findFolder(parentId);
      if (!parent || parent.user_id !== req.user.id) {
        return fail(res, 'Destination folder not found in your vault.', 404);
      }
      // A folder cannot be moved inside itself or its own descendant — that
      // would orphan the whole subtree into an unreachable cycle.
      const subtree = await Documents.folderSubtreeIds(folder.id, req.user.id);
      if (subtree.includes(parentId)) {
        return fail(res, 'A folder cannot be moved inside itself.', 400);
      }
    }
    return success(res, { data: await Documents.moveFolder(folder.id, parentId) }, 'Folder moved.');
  },

  /** DELETE /documents/folders/:id — soft-deletes the folder and everything in it. */
  async deleteFolder(req, res) {
    const folder = await Documents.findFolder(req.params.id);
    if (!folder) return fail(res, 'Folder not found.', 404);
    if (folder.user_id !== req.user.id) return fail(res, 'Only the owner can delete this folder.', 403);
    if (folder.is_system) return fail(res, 'System folders cannot be deleted.', 400);

    const count = await Documents.softDeleteFolderTree(folder.id, req.user.id);
    return success(res, {}, `Folder "${folder.name}" and its contents were deleted (${count} folder(s)).`);
  },

  // ==== files ===============================================================

  /** GET /documents/files?folderId=&search=&tag= */
  async listFiles(req, res) {
    const folderId = num(req.query.folderId);
    const search = String(req.query.search || '').trim();
    const tag = String(req.query.tag || '').trim();

    const scope = await resolveScope(folderId, req.user.id);
    if (!scope) return fail(res, 'You do not have access to this folder.', 403);

    // Inside someone else's shared folder the listing must NEVER widen past that
    // folder — a search would otherwise expose the owner's entire vault.
    const wholeVault = !scope.shared && Boolean(search || tag);

    const files = await Documents.listFiles(scope.ownerId, { folderId, search, tag, wholeVault });
    return success(res, { data: files, access: scope.access, shared: scope.shared }, 'Files fetched.');
  },

  /** POST /documents/files/upload  (multipart: file, folderId?, tags?) */
  async uploadFile(req, res) {
    if (!req.file) return fail(res, 'Choose a file to upload.', 422);

    const folderId = num(req.body?.folderId);
    if (folderId) {
      const folder = await Documents.findFolder(folderId);
      if (!folder || folder.user_id !== req.user.id) {
        // Clean up the orphaned upload rather than leaving it on disk.
        fs.promises.unlink(req.file.path).catch(() => {});
        return fail(res, 'You can only upload into your own folders.', 403);
      }
    }

    const ext = path.extname(req.file.originalname).replace('.', '').toLowerCase();
    const file = await Documents.createFile({
      userId: req.user.id,
      folderId,
      name: sanitizeName(req.body?.name || req.file.originalname, req.file.originalname),
      fileName: req.file.originalname,
      storedName: req.file.filename,
      filePath: `/uploads/documents/${req.file.filename}`,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      ext,
      tags: normalizeTags(req.body?.tags),
    });
    return created(res, { data: file }, `"${file.name}" uploaded.`);
  },

  /** PATCH /documents/files/:id  { name?, tags? } */
  async updateFile(req, res) {
    const file = await Documents.findFile(req.params.id);
    if (!file) return fail(res, 'File not found.', 404);
    if (file.user_id !== req.user.id) return fail(res, 'Only the owner can edit this file.', 403);

    const patch = {};
    if (req.body?.name !== undefined) patch.name = sanitizeName(req.body.name, file.name);
    if (req.body?.tags !== undefined) patch.tags = normalizeTags(req.body.tags);
    return success(res, { data: await Documents.updateFile(file.id, patch) }, 'File updated.');
  },

  /** PATCH /documents/files/:id/move  { folderId } */
  async moveFile(req, res) {
    const file = await Documents.findFile(req.params.id);
    if (!file) return fail(res, 'File not found.', 404);
    if (file.user_id !== req.user.id) return fail(res, 'Only the owner can move this file.', 403);

    const folderId = num(req.body?.folderId);
    if (folderId) {
      const folder = await Documents.findFolder(folderId);
      if (!folder || folder.user_id !== req.user.id) {
        return fail(res, 'Destination folder not found in your vault.', 404);
      }
    }
    return success(res, { data: await Documents.moveFile(file.id, folderId) }, 'File moved.');
  },

  /** DELETE /documents/files/:id */
  async deleteFile(req, res) {
    const file = await Documents.findFile(req.params.id);
    if (!file) return fail(res, 'File not found.', 404);
    if (file.user_id !== req.user.id) return fail(res, 'Only the owner can delete this file.', 403);

    await Documents.softDeleteFile(file.id);
    return success(res, {}, `"${file.name}" deleted.`);
  },

  /**
   * GET /documents/files/:id/download  — and /view for inline preview.
   * The bytes are streamed by the API, never served from a guessable static
   * URL, so access is re-checked on every single read.
   */
  async streamFile(req, res, { inline }) {
    const file = await Documents.findFile(req.params.id);
    if (!file) return fail(res, 'File not found.', 404);

    const level = await fileAccess(file, req.user.id);
    if (!level) return fail(res, 'You do not have access to this file.', 403);
    if (!inline && level !== 'download') {
      return fail(res, 'You have view-only access to this file.', 403);
    }

    const abs = path.join(UPLOAD_ROOT, 'documents', file.stored_name);
    if (!fs.existsSync(abs)) return fail(res, 'The stored file is missing from disk.', 404);

    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(file.file_name)}"`
    );
    return fs.createReadStream(abs).pipe(res);
  },

  download(req, res) { return DocumentVaultController.streamFile(req, res, { inline: false }); },
  view(req, res) { return DocumentVaultController.streamFile(req, res, { inline: true }); },

  // ==== tags ================================================================

  /** GET /documents/tags — defaults plus whatever this user actually used. */
  async listTags(req, res) {
    const admin = await isVaultAdmin(req.user.id);
    const scopeAll = admin && String(req.query.scope || '') === 'all';
    const counts = scopeAll ? await Documents.allTagCounts() : await Documents.tagCounts(req.user.id);

    for (const t of DEFAULT_TAGS) if (!counts.has(t)) counts.set(t, 0);
    const tags = [...counts.entries()]
      .map(([name, count]) => ({ name, count, isDefault: DEFAULT_TAGS.includes(name) }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    return success(res, { data: { tags, defaults: DEFAULT_TAGS } }, 'Tags fetched.');
  },

  // ==== sharing =============================================================

  /** GET /documents/users — who I can share with (everyone but me). */
  async shareUsers(req, res) {
    const rows = await query(
      `SELECT id, name, email, role FROM users
        WHERE id <> ? AND status = 'active' ORDER BY name ASC`,
      [req.user.id]
    );
    return success(res, { data: rows }, 'Users fetched.');
  },

  /** POST /documents/share  { itemType, itemId, userIds[], accessLevel?, expiresAt? } */
  async share(req, res) {
    const { itemType, itemId, accessLevel = 'view', expiresAt = null } = req.body || {};
    const userIds = Array.isArray(req.body?.userIds) ? req.body.userIds : [req.body?.userId].filter(Boolean);

    if (!['folder', 'file'].includes(itemType)) return fail(res, 'itemType must be "folder" or "file".', 422);
    if (!itemId) return fail(res, 'itemId is required.', 422);
    if (!userIds.length) return fail(res, 'Choose at least one person to share with.', 422);
    if (!['view', 'download'].includes(accessLevel)) return fail(res, 'accessLevel must be "view" or "download".', 422);

    // Only the OWNER may share. Otherwise a recipient could re-share someone
    // else's private documents onward.
    const item = itemType === 'folder'
      ? await Documents.findFolder(itemId)
      : await Documents.findFile(itemId);
    if (!item) return fail(res, `${itemType === 'folder' ? 'Folder' : 'File'} not found.`, 404);
    if (item.user_id !== req.user.id) return fail(res, 'Only the owner can share this item.', 403);

    const ids = [];
    for (const uid of userIds) {
      if (Number(uid) === Number(req.user.id)) continue; // sharing with yourself is a no-op
      ids.push(await Documents.createShare({
        ownerId: req.user.id,
        sharedWithUserId: Number(uid),
        itemType,
        itemId: Number(itemId),
        accessLevel,
        expiresAt,
      }));
    }
    return created(res, { data: { shareIds: ids } }, `"${item.name}" shared with ${ids.length} person(s).`);
  },

  /** DELETE /documents/share/:id */
  async revokeShare(req, res) {
    const share = await Documents.findShare(req.params.id);
    if (!share) return fail(res, 'Share not found.', 404);
    if (share.owner_id !== req.user.id) return fail(res, 'Only the owner can revoke this share.', 403);
    await Documents.revokeShare(share.id);
    return success(res, {}, 'Access revoked.');
  },

  /** GET /documents/shared-with-me */
  async sharedWithMe(req, res) {
    return success(res, { data: await Documents.sharedWithMe(req.user.id) }, 'Shared with me.');
  },

  /** GET /documents/shared-by-me */
  async sharedByMe(req, res) {
    return success(res, { data: await Documents.sharedByMe(req.user.id) }, 'Shared by me.');
  },

  // ==== admin ===============================================================

  /** GET /documents/owners — admin only (gated by documents.manage on the route). */
  async owners(req, res) {
    return success(res, { data: await Documents.documentOwners() }, 'Document owners fetched.');
  },

  /**
   * GET /documents/all-files?search=&tag=&type=&userId=&page=&limit=
   * Admin view across every vault. Folders and files are merged into one paged
   * list, folders first — which is what the grid renders.
   */
  async allFiles(req, res) {
    const search = String(req.query.search || '').trim();
    const tag = String(req.query.tag || '').trim();
    const type = String(req.query.type || '').trim();       // '' | 'folder' | 'file'
    const ownerId = Number(req.query.userId) || 0;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));

    // Folders carry no tags, so filtering by tag necessarily narrows to files.
    const wantFolders = type !== 'file' && !tag;
    const wantFiles = type !== 'folder';

    const folders = wantFolders ? await Documents.allFolders({ search, ownerId }) : [];
    const files = wantFiles ? await Documents.allFiles({ search, ownerId, tag }) : [];

    const items = [
      ...folders.map((f) => ({ ...f, kind: 'folder' })),
      ...files.map((f) => ({ ...f, kind: 'file' })),
    ];

    const total = items.length;
    const start = (page - 1) * limit;
    return success(
      res,
      { data: items.slice(start, start + limit), meta: { total, page, limit, pages: Math.ceil(total / limit) || 1 } },
      'All documents fetched.'
    );
  },
};

module.exports = DocumentVaultController;
