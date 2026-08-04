/**
 * DocumentModel — raw SQL data access for the Document Vault.
 *
 * The security boundary is OWNERSHIP: every folder and file belongs to exactly
 * one user. Nothing here is ever queried without a `user_id` scope unless the
 * caller has already established the viewer is an admin. Access granted to
 * other users lives in `document_shares` and is resolved by the controller.
 */
const { query } = require('../config/db');

const FOLDER_COLS = 'id, user_id, parent_id, name, is_system, created_at, updated_at';
const FILE_COLS =
  'id, user_id, folder_id, name, file_name, stored_name, file_path, file_size, mime_type, ext, tags, created_at, updated_at';

/** `tags` is a JSON column: mysql2 may hand it back as a string. */
const parseTags = (row) => {
  if (!row) return row;
  let tags = row.tags;
  if (typeof tags === 'string') {
    try { tags = JSON.parse(tags); } catch { tags = []; }
  }
  return { ...row, tags: Array.isArray(tags) ? tags : [] };
};

const DocumentModel = {
  // ---- folders ------------------------------------------------------------

  async findFolder(id) {
    const rows = await query(
      `SELECT ${FOLDER_COLS} FROM document_folders WHERE id = ? AND is_deleted = 0 LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  /** Direct subfolders of `parentId` (NULL = root) inside one owner's vault. */
  async listFolders(ownerId, parentId = null) {
    const where = parentId ? 'parent_id = ?' : 'parent_id IS NULL';
    const params = parentId ? [ownerId, parentId] : [ownerId];
    return query(
      `SELECT ${FOLDER_COLS},
              (SELECT COUNT(*) FROM document_files f
                WHERE f.folder_id = document_folders.id AND f.is_deleted = 0) AS file_count
         FROM document_folders
        WHERE user_id = ? AND is_deleted = 0 AND ${where}
        ORDER BY name ASC, id ASC`,
      params
    );
  },

  async createFolder({ userId, parentId = null, name }) {
    const r = await query(
      'INSERT INTO document_folders (user_id, parent_id, name) VALUES (?, ?, ?)',
      [userId, parentId || null, name]
    );
    return DocumentModel.findFolder(r.insertId);
  },

  async renameFolder(id, name) {
    await query('UPDATE document_folders SET name = ? WHERE id = ?', [name, id]);
    return DocumentModel.findFolder(id);
  },

  async moveFolder(id, parentId) {
    await query('UPDATE document_folders SET parent_id = ? WHERE id = ?', [parentId || null, id]);
    return DocumentModel.findFolder(id);
  },

  /**
   * A folder plus every descendant folder id, owner-scoped. Used for cascading
   * share checks and for recursive delete. Guarded against cycles.
   */
  async folderSubtreeIds(rootId, ownerId) {
    const ids = [Number(rootId)];
    let frontier = [Number(rootId)];
    let guard = 0;
    while (frontier.length && guard++ < 500) {
      const kids = await query(
        `SELECT id FROM document_folders
          WHERE user_id = ? AND is_deleted = 0 AND parent_id IN (${frontier.map(() => '?').join(',')})`,
        [ownerId, ...frontier]
      );
      const next = kids.map((k) => k.id).filter((id) => !ids.includes(id));
      ids.push(...next);
      frontier = next;
    }
    return ids;
  },

  /** Ancestor chain of a folder (excluding itself), owner-scoped. */
  async folderAncestorIds(folderId, ownerId) {
    const ids = [];
    let cur = folderId;
    let guard = 0;
    while (cur && guard++ < 100) {
      const rows = await query(
        'SELECT parent_id FROM document_folders WHERE id = ? AND user_id = ? LIMIT 1',
        [cur, ownerId]
      );
      const parent = rows[0]?.parent_id;
      if (!parent) break;
      ids.push(parent);
      cur = parent;
    }
    return ids;
  },

  /** Root → … → folder, for the breadcrumb. */
  async breadcrumb(folderId, ownerId) {
    const trail = [];
    let cur = folderId;
    let guard = 0;
    while (cur && guard++ < 100) {
      const rows = await query(
        'SELECT id, name, parent_id FROM document_folders WHERE id = ? AND user_id = ? LIMIT 1',
        [cur, ownerId]
      );
      if (!rows.length) break;
      trail.unshift({ id: rows[0].id, name: rows[0].name });
      cur = rows[0].parent_id;
    }
    return trail;
  },

  /** Soft-delete a folder, its descendant folders, and all their files. */
  async softDeleteFolderTree(rootId, ownerId) {
    const ids = await DocumentModel.folderSubtreeIds(rootId, ownerId);
    const marks = ids.map(() => '?').join(',');
    await query(
      `UPDATE document_files SET is_deleted = 1, deleted_at = NOW()
        WHERE user_id = ? AND folder_id IN (${marks})`,
      [ownerId, ...ids]
    );
    await query(
      `UPDATE document_folders SET is_deleted = 1, deleted_at = NOW()
        WHERE user_id = ? AND id IN (${marks})`,
      [ownerId, ...ids]
    );
    return ids.length;
  },

  // ---- files --------------------------------------------------------------

  async findFile(id) {
    const rows = await query(
      `SELECT ${FILE_COLS} FROM document_files WHERE id = ? AND is_deleted = 0 LIMIT 1`,
      [id]
    );
    return rows[0] ? parseTags(rows[0]) : null;
  },

  /**
   * Files in one owner's vault.
   * `folderId` NULL means root. When `search`/`tag` is set on the viewer's OWN
   * vault the folder scope is dropped so the search spans the whole vault.
   */
  async listFiles(ownerId, { folderId = null, search = '', tag = '', wholeVault = false } = {}) {
    const where = ['user_id = ?', 'is_deleted = 0'];
    const params = [ownerId];

    if (!wholeVault) {
      if (folderId) { where.push('folder_id = ?'); params.push(folderId); }
      else { where.push('folder_id IS NULL'); }
    }
    if (search) { where.push('name LIKE ?'); params.push(`%${search}%`); }

    const rows = await query(
      `SELECT ${FILE_COLS} FROM document_files
        WHERE ${where.join(' AND ')}
        ORDER BY created_at DESC, id DESC`,
      params
    );
    const files = rows.map(parseTags);
    if (!tag) return files;
    const wanted = tag.toLowerCase();
    return files.filter((f) => f.tags.some((t) => String(t).toLowerCase() === wanted));
  },

  async createFile(data) {
    const r = await query(
      `INSERT INTO document_files
         (user_id, folder_id, name, file_name, stored_name, file_path, file_size, mime_type, ext, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.userId, data.folderId || null, data.name, data.fileName, data.storedName,
        data.filePath, data.fileSize || null, data.mimeType || null, data.ext || null,
        JSON.stringify(data.tags || []),
      ]
    );
    return DocumentModel.findFile(r.insertId);
  },

  async updateFile(id, { name, tags }) {
    const sets = [];
    const params = [];
    if (name !== undefined) { sets.push('name = ?'); params.push(name); }
    if (tags !== undefined) { sets.push('tags = ?'); params.push(JSON.stringify(tags)); }
    if (!sets.length) return DocumentModel.findFile(id);
    params.push(id);
    await query(`UPDATE document_files SET ${sets.join(', ')} WHERE id = ?`, params);
    return DocumentModel.findFile(id);
  },

  async moveFile(id, folderId) {
    await query('UPDATE document_files SET folder_id = ? WHERE id = ?', [folderId || null, id]);
    return DocumentModel.findFile(id);
  },

  async softDeleteFile(id) {
    await query('UPDATE document_files SET is_deleted = 1, deleted_at = NOW() WHERE id = ?', [id]);
  },

  /** Every distinct tag in an owner's vault, with a usage count. */
  async tagCounts(ownerId) {
    const rows = await query(
      'SELECT tags FROM document_files WHERE user_id = ? AND is_deleted = 0',
      [ownerId]
    );
    const counts = new Map();
    for (const row of rows) {
      const { tags } = parseTags(row);
      for (const t of tags) {
        const key = String(t);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
    return counts;
  },

  // ---- shares -------------------------------------------------------------

  /** Live (unrevoked, unexpired) shares granted to a viewer for given items. */
  async liveSharesFor(viewerId, itemType, itemIds) {
    if (!itemIds.length) return [];
    const marks = itemIds.map(() => '?').join(',');
    return query(
      `SELECT id, item_type, item_id, access_level, owner_id
         FROM document_shares
        WHERE shared_with_user_id = ? AND is_revoked = 0
          AND item_type = ? AND item_id IN (${marks})
          AND (expires_at IS NULL OR expires_at > NOW())`,
      [viewerId, itemType, ...itemIds]
    );
  },

  async createShare({ ownerId, sharedWithUserId, itemType, itemId, accessLevel, expiresAt }) {
    // Re-sharing the same item with the same person updates the grant instead
    // of stacking duplicate rows.
    const existing = await query(
      `SELECT id FROM document_shares
        WHERE owner_id = ? AND shared_with_user_id = ? AND item_type = ? AND item_id = ? AND is_revoked = 0
        LIMIT 1`,
      [ownerId, sharedWithUserId, itemType, itemId]
    );
    if (existing.length) {
      await query(
        'UPDATE document_shares SET access_level = ?, expires_at = ? WHERE id = ?',
        [accessLevel, expiresAt || null, existing[0].id]
      );
      return existing[0].id;
    }
    const r = await query(
      `INSERT INTO document_shares
         (owner_id, shared_with_user_id, item_type, item_id, access_level, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ownerId, sharedWithUserId, itemType, itemId, accessLevel, expiresAt || null]
    );
    return r.insertId;
  },

  async findShare(id) {
    const rows = await query('SELECT * FROM document_shares WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  },

  async revokeShare(id) {
    await query('UPDATE document_shares SET is_revoked = 1 WHERE id = ?', [id]);
  },

  /** Items other people shared with me. */
  async sharedWithMe(viewerId) {
    return query(
      `SELECT s.id AS share_id, s.item_type, s.item_id, s.access_level, s.expires_at,
              s.created_at, u.id AS owner_id, u.name AS owner_name,
              COALESCE(fo.name, fi.name) AS item_name,
              fi.ext, fi.file_size, fi.file_path
         FROM document_shares s
         JOIN users u ON u.id = s.owner_id
         LEFT JOIN document_folders fo ON s.item_type = 'folder' AND fo.id = s.item_id AND fo.is_deleted = 0
         LEFT JOIN document_files   fi ON s.item_type = 'file'   AND fi.id = s.item_id AND fi.is_deleted = 0
        WHERE s.shared_with_user_id = ? AND s.is_revoked = 0
          AND (s.expires_at IS NULL OR s.expires_at > NOW())
          AND COALESCE(fo.id, fi.id) IS NOT NULL
        ORDER BY s.created_at DESC`,
      [viewerId]
    );
  },

  /** Items I shared with other people. */
  async sharedByMe(ownerId) {
    return query(
      `SELECT s.id AS share_id, s.item_type, s.item_id, s.access_level, s.expires_at,
              s.created_at, u.id AS shared_with_id, u.name AS shared_with_name,
              COALESCE(fo.name, fi.name) AS item_name,
              fi.ext, fi.file_size
         FROM document_shares s
         JOIN users u ON u.id = s.shared_with_user_id
         LEFT JOIN document_folders fo ON s.item_type = 'folder' AND fo.id = s.item_id AND fo.is_deleted = 0
         LEFT JOIN document_files   fi ON s.item_type = 'file'   AND fi.id = s.item_id AND fi.is_deleted = 0
        WHERE s.owner_id = ? AND s.is_revoked = 0
          AND COALESCE(fo.id, fi.id) IS NOT NULL
        ORDER BY s.created_at DESC`,
      [ownerId]
    );
  },

  // ---- admin --------------------------------------------------------------

  /** Users who own at least one live folder or file. */
  async documentOwners() {
    return query(
      `SELECT DISTINCT u.id, u.name, u.role
         FROM users u
        WHERE EXISTS (SELECT 1 FROM document_folders f WHERE f.user_id = u.id AND f.is_deleted = 0)
           OR EXISTS (SELECT 1 FROM document_files  f WHERE f.user_id = u.id AND f.is_deleted = 0)
        ORDER BY u.name ASC`
    );
  },

  /** Every folder in the institute (admin view), with its owner. */
  async allFolders({ search = '', ownerId = 0 } = {}) {
    const where = ['f.is_deleted = 0'];
    const params = [];
    if (search) { where.push('f.name LIKE ?'); params.push(`%${search}%`); }
    if (ownerId) { where.push('f.user_id = ?'); params.push(ownerId); }
    return query(
      `SELECT f.id, f.user_id, f.parent_id, f.name, f.created_at, u.name AS owner_name,
              (SELECT COUNT(*) FROM document_files df
                WHERE df.folder_id = f.id AND df.is_deleted = 0) AS file_count
         FROM document_folders f
         JOIN users u ON u.id = f.user_id
        WHERE ${where.join(' AND ')}
        ORDER BY f.name ASC, f.id ASC`,
      params
    );
  },

  /** Every file in the institute (admin view), with its owner. */
  async allFiles({ search = '', ownerId = 0, tag = '' } = {}) {
    const where = ['f.is_deleted = 0'];
    const params = [];
    if (search) { where.push('f.name LIKE ?'); params.push(`%${search}%`); }
    if (ownerId) { where.push('f.user_id = ?'); params.push(ownerId); }
    const rows = await query(
      `SELECT f.id, f.user_id, f.folder_id, f.name, f.ext, f.file_size, f.mime_type,
              f.file_path, f.tags, f.created_at, u.name AS owner_name
         FROM document_files f
         JOIN users u ON u.id = f.user_id
        WHERE ${where.join(' AND ')}
        ORDER BY f.created_at DESC, f.id DESC`,
      params
    );
    const files = rows.map(parseTags);
    if (!tag) return files;
    const wanted = tag.toLowerCase();
    return files.filter((f) => f.tags.some((t) => String(t).toLowerCase() === wanted));
  },

  /** Tag counts across every vault (admin view). */
  async allTagCounts() {
    const rows = await query('SELECT tags FROM document_files WHERE is_deleted = 0');
    const counts = new Map();
    for (const row of rows) {
      const { tags } = parseTags(row);
      for (const t of tags) counts.set(String(t), (counts.get(String(t)) || 0) + 1);
    }
    return counts;
  },
};

module.exports = DocumentModel;
