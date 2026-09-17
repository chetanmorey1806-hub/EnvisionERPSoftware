/**
 * ClassController — Google Classroom-style classes (/api/classes).
 *
 * A batch is a class. Inside it:
 *   Stream     announcements, class comments, and a line for each new piece of work
 *   Classwork  assignments, questions and materials, grouped by topic
 *   People     the teacher and the enrolled students
 *   Grades     every student × every graded item
 *
 * Grading follows Google Classroom: a teacher drafts grades privately, then
 * RETURNS them. A student sees a grade only once it has been returned.
 *
 * Access is resolved per request by services/ClassAccess — the client never
 * says who it is to a class.
 */
const crypto = require('crypto');
const { query } = require('../config/db');
const { success, created, fail } = require('../utils/response');
const NotificationService = require('../services/NotificationService');
const Access = require('../services/ClassAccess');

const THEMES = ['red', 'orange', 'amber', 'green', 'teal', 'blue', 'indigo', 'violet', 'pink', 'slate'];
const WORK_TYPES = ['assignment', 'question', 'material'];
const LEGACY_TYPES = ['classwork', 'homework', 'lab'];   // still accepted and shown
const GRADABLE_SQL = "m.type <> 'material'";
const TYPE_LABEL = {
  assignment: 'assignment', question: 'question', material: 'material',
  classwork: 'classwork', homework: 'homework', lab: 'lab assignment',
};
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no 0/O, 1/I

const clean = (v, max) => String(v ?? '').trim().slice(0, max);
const intOrNull = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

/** 'YYYY-MM-DDTHH:MM' or 'YYYY-MM-DD HH:MM[:SS]' → MySQL DATETIME string, else null. */
function toDateTime(v) {
  if (!v) return null;
  const m = String(v).trim().match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(:\d{2})?$/);
  return m ? `${m[1]} ${m[2]}${m[3] || ':00'}` : undefined;   // undefined = malformed
}

function newCode() {
  const bytes = crypto.randomBytes(7);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

/** Give a class a join code if it has none. Retries on the (rare) collision. */
async function ensureCode(batch) {
  if (batch.class_code) return batch.class_code;
  for (let i = 0; i < 6; i += 1) {
    const code = newCode();
    try {
      const r = await query('UPDATE batches SET class_code = ? WHERE id = ? AND class_code IS NULL', [code, batch.id]);
      if (r.affectedRows) return code;
      const again = await query('SELECT class_code FROM batches WHERE id = ?', [batch.id]);
      if (again[0]?.class_code) return again[0].class_code;
    } catch (e) {
      if (e.code !== 'ER_DUP_ENTRY') throw e;
    }
  }
  throw new Error('Could not generate a class code.');
}

const themeFor = (batch) => batch.class_theme || THEMES[batch.id % THEMES.length];

/** The class header every tab shows. The code is only for people who teach. */
function classHeader(batch, viewer, code) {
  return {
    id: batch.id,
    code: batch.code,
    name: batch.name,
    course_name: batch.course_name,
    trainer_name: batch.trainer_name,
    trainer_email: batch.trainer_email,
    status: batch.status,
    timeline: batch.timeline,
    start_date: batch.start_date,
    end_date: batch.end_date,
    theme: themeFor(batch),
    description: batch.class_description,
    role: viewer.role,
    can_teach: Access.canTeach(viewer),
    class_code: Access.canTeach(viewer) ? code : undefined,
    join_enabled: Access.canTeach(viewer) ? !!batch.class_join_enabled : undefined,
  };
}

async function notifyMany(userIds, payload) {
  for (const id of new Set(userIds.filter(Boolean))) {
    NotificationService.notifyUser(id, payload);
  }
}

/** Resolve the viewer or answer 404/403. Returns null when a response was sent. */
async function gate(req, res, { teach = false } = {}) {
  const viewer = await Access.viewerFor(req.user, req.params.batchId);
  if (!viewer.batch) { fail(res, 'Class not found.', 404); return null; }
  if (!viewer.role) { fail(res, 'You are not a member of this class.', 403); return null; }
  if (teach && !Access.canTeach(viewer)) { fail(res, 'Only the teacher can do this.', 403); return null; }
  return viewer;
}

/** A classwork item that belongs to this class, or null (404 sent). */
async function itemIn(res, batchId, itemId) {
  const rows = await query(
    `SELECT m.*, t.name AS topic_name FROM course_materials m
     LEFT JOIN class_topics t ON t.id = m.topic_id
     WHERE m.id = ? AND m.batch_id = ?`,
    [itemId, batchId]
  );
  if (!rows[0]) { fail(res, 'Classwork not found in this class.', 404); return null; }
  return rows[0];
}

const ClassController = {
  // GET /classes?archived=1 — the class cards for this person
  async myClasses(req, res) {
    const archived = req.query.archived === '1';
    const statusClause = archived ? "b.status <> 'active'" : "b.status = 'active'";
    const base = `SELECT b.id, b.code, b.name, b.status, b.class_code, b.class_theme, b.faculty_id,
                         c.title AS course_name, f.name AS trainer_name
                  FROM batches b
                  LEFT JOIN courses c ON c.id = b.course_id
                  LEFT JOIN faculty f ON f.id = b.faculty_id`;

    const cards = new Map();   // id -> { ...batch, role }
    if (Access.isSupervisor(req.user)) {
      for (const b of await query(`${base} WHERE ${statusClause} ORDER BY b.name`)) cards.set(b.id, { ...b, role: 'supervisor' });
    } else {
      const faculty = await Access.facultyForUser(req.user.id);
      if (faculty) {
        for (const b of await query(`${base} WHERE b.faculty_id = ? AND ${statusClause} ORDER BY b.name`, [faculty.id])) {
          cards.set(b.id, { ...b, role: 'teacher' });
        }
      }
      const student = await Access.studentForUser(req.user.id);
      if (student) {
        const rows = await query(
          `${base} WHERE ${statusClause} AND EXISTS (
             SELECT 1 FROM students s WHERE s.id = ? AND ${Access.ROSTER_WHERE.replace(/\?/g, 'b.id')}
           ) ORDER BY b.name`,
          [student.id]
        );
        for (const b of rows) if (!cards.has(b.id)) cards.set(b.id, { ...b, role: 'student', student_id: student.id });
      }
    }

    const data = [];
    for (const b of cards.values()) {
      const teach = b.role !== 'student';
      const [{ n: students }] = await query(
        `SELECT COUNT(*) AS n FROM students s WHERE ${Access.ROSTER_WHERE}`, [b.id, b.id]
      );
      const card = {
        id: b.id, code: b.code, name: b.name, status: b.status, course_name: b.course_name,
        trainer_name: b.trainer_name, theme: b.class_theme || THEMES[b.id % THEMES.length],
        role: b.role, students,
      };
      if (teach) {
        card.class_code = await ensureCode(b);
        const [{ n }] = await query(
          `SELECT COUNT(*) AS n FROM assignment_submissions s JOIN course_materials m ON m.id = s.material_id
           WHERE m.batch_id = ? AND s.status IN ('submitted','late')`, [b.id]
        );
        card.to_review = n;
      } else {
        const [counts] = await query(
          `SELECT
             SUM(sub.id IS NULL AND (m.due_at IS NULL OR m.due_at >= NOW())) AS assigned,
             SUM(sub.id IS NULL AND m.due_at IS NOT NULL AND m.due_at < NOW()) AS missing
           FROM course_materials m
           LEFT JOIN assignment_submissions sub ON sub.material_id = m.id AND sub.student_id = ?
           WHERE m.batch_id = ? AND ${GRADABLE_SQL}`,
          [b.student_id, b.id]
        );
        card.to_do = Number(counts.assigned || 0);
        card.missing = Number(counts.missing || 0);
        const due = await query(
          `SELECT m.id, m.title, m.due_at FROM course_materials m
           LEFT JOIN assignment_submissions sub ON sub.material_id = m.id AND sub.student_id = ?
           WHERE m.batch_id = ? AND ${GRADABLE_SQL} AND sub.id IS NULL
             AND m.due_at >= NOW() AND m.due_at < NOW() + INTERVAL 7 DAY
           ORDER BY m.due_at LIMIT 2`,
          [b.student_id, b.id]
        );
        card.due_soon = due;
      }
      data.push(card);
    }
    return success(res, { data }, 'Classes fetched.');
  },

  // POST /classes/join { code } — a student joins with the class code
  async join(req, res) {
    const code = clean(req.body?.code, 8).toUpperCase();
    if (!code) return fail(res, 'Enter the class code your trainer gave you.', 422);
    const student = await Access.studentForUser(req.user.id);
    if (!student) return fail(res, 'Only students can join a class with a code.', 403);

    const rows = await query(
      "SELECT id, name, capacity, class_join_enabled, status, faculty_id FROM batches WHERE class_code = ? LIMIT 1", [code]
    );
    const batch = rows[0];
    if (!batch || batch.status !== 'active') return fail(res, 'No active class uses that code. Check it with your trainer.', 404);
    if (!batch.class_join_enabled) return fail(res, 'Joining this class with a code is turned off. Ask your trainer to add you.', 403);

    const already = await query(`SELECT s.id FROM students s WHERE s.id = ? AND ${Access.ROSTER_WHERE}`, [student.id, batch.id, batch.id]);
    if (already.length) return success(res, { data: { id: batch.id } }, `You are already in ${batch.name}.`);

    const previous = await query('SELECT id, status FROM student_batches WHERE student_id = ? AND batch_id = ? LIMIT 1', [student.id, batch.id]);
    if (previous.length) {
      return fail(res, 'You were removed from this class earlier. Ask your trainer to add you back.', 403);
    }
    if (Number(batch.capacity) > 0) {
      const [{ n }] = await query(`SELECT COUNT(*) AS n FROM students s WHERE ${Access.ROSTER_WHERE}`, [batch.id, batch.id]);
      if (n >= Number(batch.capacity)) return fail(res, 'This class is full.', 409);
    }

    await query(
      "INSERT INTO student_batches (student_id, batch_id, enrolled_on, status) VALUES (?, ?, CURDATE(), 'enrolled')",
      [student.id, batch.id]
    );
    const t = await query('SELECT user_id FROM faculty WHERE id = ?', [batch.faculty_id]);
    await notifyMany([t[0]?.user_id], {
      type: 'info', title: 'A student joined your class',
      message: `${student.name} joined ${batch.name} with the class code.`, link: `/classroom/${batch.id}`,
    });
    return created(res, { data: { id: batch.id } }, `You joined ${batch.name}.`);
  },

  // GET /classes/:batchId
  async show(req, res) {
    const viewer = await gate(req, res);
    if (!viewer) return undefined;
    const code = Access.canTeach(viewer) ? await ensureCode(viewer.batch) : null;
    return success(res, { data: classHeader(viewer.batch, viewer, code) }, 'Class fetched.');
  },

  // PATCH /classes/:batchId { theme?, description?, join_enabled? }
  async updateSettings(req, res) {
    const viewer = await gate(req, res, { teach: true });
    if (!viewer) return undefined;
    const patch = {};
    if (req.body.theme !== undefined) {
      if (!THEMES.includes(req.body.theme)) return fail(res, `theme must be one of: ${THEMES.join(', ')}.`, 422);
      patch.class_theme = req.body.theme;
    }
    if (req.body.description !== undefined) patch.class_description = clean(req.body.description, 2000) || null;
    if (req.body.join_enabled !== undefined) patch.class_join_enabled = req.body.join_enabled ? 1 : 0;
    const keys = Object.keys(patch);
    if (keys.length) {
      await query(`UPDATE batches SET ${keys.map((k) => `\`${k}\` = ?`).join(', ')} WHERE id = ?`,
        [...keys.map((k) => patch[k]), viewer.batch.id]);
    }
    const fresh = await Access.viewerFor(req.user, viewer.batch.id);
    return success(res, { data: classHeader(fresh.batch, fresh, await ensureCode(fresh.batch)) }, 'Class settings saved.');
  },

  // POST /classes/:batchId/code/reset
  async resetCode(req, res) {
    const viewer = await gate(req, res, { teach: true });
    if (!viewer) return undefined;
    await query('UPDATE batches SET class_code = NULL WHERE id = ?', [viewer.batch.id]);
    const code = await ensureCode({ ...viewer.batch, class_code: null });
    return success(res, { data: { class_code: code } }, 'New class code created. The old one no longer works.');
  },

  // GET /classes/:batchId/stream
  async stream(req, res) {
    const viewer = await gate(req, res);
    if (!viewer) return undefined;
    const batchId = viewer.batch.id;

    const announcements = await query(
      `SELECT a.id, a.body, a.file_name, a.file_url, a.size_kb, a.created_at, a.user_id,
              u.name AS author_name, u.role AS author_role
       FROM class_announcements a LEFT JOIN users u ON u.id = a.user_id
       WHERE a.batch_id = ? ORDER BY a.created_at DESC, a.id DESC`, [batchId]
    );
    const comments = await query(
      `SELECT cc.id, cc.announcement_id, cc.body, cc.created_at, cc.user_id, u.name AS author_name
       FROM class_comments cc LEFT JOIN users u ON u.id = cc.user_id
       WHERE cc.batch_id = ? AND cc.announcement_id IS NOT NULL ORDER BY cc.created_at, cc.id`, [batchId]
    );
    const work = await query(
      `SELECT m.id, m.title, m.type, m.created_at, m.due_at FROM course_materials m
       WHERE m.batch_id = ? ORDER BY m.created_at DESC`, [batchId]
    );

    const byAnn = new Map();
    for (const c of comments) {
      if (!byAnn.has(c.announcement_id)) byAnn.set(c.announcement_id, []);
      byAnn.get(c.announcement_id).push(c);
    }
    const posts = [
      ...announcements.map((a) => ({ kind: 'announcement', ...a, comments: byAnn.get(a.id) || [] })),
      ...work.map((w) => ({ kind: 'classwork', ...w, author_name: viewer.batch.trainer_name })),
    ].sort((x, y) => String(y.created_at).localeCompare(String(x.created_at)));

    let upcoming;
    if (viewer.role === 'student') {
      upcoming = await query(
        `SELECT m.id, m.title, m.due_at FROM course_materials m
         LEFT JOIN assignment_submissions sub ON sub.material_id = m.id AND sub.student_id = ?
         WHERE m.batch_id = ? AND ${GRADABLE_SQL} AND sub.id IS NULL
           AND m.due_at >= NOW() AND m.due_at < NOW() + INTERVAL 7 DAY ORDER BY m.due_at`,
        [viewer.studentId, batchId]
      );
    } else {
      upcoming = await query(
        `SELECT m.id, m.title, m.due_at FROM course_materials m
         WHERE m.batch_id = ? AND ${GRADABLE_SQL} AND m.due_at >= NOW() AND m.due_at < NOW() + INTERVAL 7 DAY
         ORDER BY m.due_at`, [batchId]
      );
    }
    return success(res, { data: { posts, upcoming, me: req.user.id, can_teach: Access.canTeach(viewer) } }, 'Stream fetched.');
  },

  // POST /classes/:batchId/announcements  (multipart documents[] optional) { body }
  async announce(req, res) {
    const viewer = await gate(req, res, { teach: true });
    if (!viewer) return undefined;
    const body = clean(req.body?.body, 5000);
    if (!body) return fail(res, 'Write something to announce.', 422);
    const file = req.files?.[0] || null;
    const r = await query(
      `INSERT INTO class_announcements (batch_id, user_id, body, file_name, file_url, size_kb)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [viewer.batch.id, req.user.id, body, file?.originalname || null,
        file ? `/uploads/documents/${file.filename}` : null, file ? Math.round(file.size / 1024) : 0]
    );
    const students = await Access.roster(viewer.batch.id);
    await notifyMany(students.map((s) => s.user_id), {
      type: 'info', title: `New announcement in ${viewer.batch.name}`,
      message: body.slice(0, 120), link: `/classroom/${viewer.batch.id}`,
    });
    const rows = await query('SELECT * FROM class_announcements WHERE id = ?', [r.insertId]);
    return created(res, { data: rows[0] }, 'Announcement posted.');
  },

  // DELETE /classes/:batchId/announcements/:id
  async removeAnnouncement(req, res) {
    const viewer = await gate(req, res);
    if (!viewer) return undefined;
    const rows = await query('SELECT id, user_id FROM class_announcements WHERE id = ? AND batch_id = ?', [req.params.id, viewer.batch.id]);
    if (!rows[0]) return fail(res, 'Announcement not found.', 404);
    if (rows[0].user_id !== req.user.id && !Access.canTeach(viewer)) return fail(res, 'You cannot delete this announcement.', 403);
    await query('DELETE FROM class_announcements WHERE id = ?', [req.params.id]);
    return success(res, {}, 'Announcement deleted.');
  },

  // POST /classes/:batchId/comments { announcement_id | material_id, body }
  async comment(req, res) {
    const viewer = await gate(req, res);
    if (!viewer) return undefined;
    const body = clean(req.body?.body, 1000);
    if (!body) return fail(res, 'The comment is empty.', 422);
    const annId = intOrNull(req.body?.announcement_id);
    const matId = intOrNull(req.body?.material_id);
    if (!!annId === !!matId) return fail(res, 'Comment on exactly one announcement or piece of classwork.', 422);

    const target = annId
      ? await query('SELECT id, user_id FROM class_announcements WHERE id = ? AND batch_id = ?', [annId, viewer.batch.id])
      : await query('SELECT id, title FROM course_materials WHERE id = ? AND batch_id = ?', [matId, viewer.batch.id]);
    if (!target[0]) return fail(res, 'That post is not in this class.', 404);

    const r = await query(
      'INSERT INTO class_comments (batch_id, announcement_id, material_id, user_id, body) VALUES (?, ?, ?, ?, ?)',
      [viewer.batch.id, annId, matId, req.user.id, body]
    );
    if (viewer.role === 'student') {
      await notifyMany([viewer.batch.trainer_user_id], {
        type: 'info', title: `New class comment in ${viewer.batch.name}`,
        message: body.slice(0, 120), link: `/classroom/${viewer.batch.id}`,
      });
    }
    const rows = await query(
      `SELECT cc.*, u.name AS author_name FROM class_comments cc LEFT JOIN users u ON u.id = cc.user_id WHERE cc.id = ?`,
      [r.insertId]
    );
    return created(res, { data: rows[0] }, 'Comment posted.');
  },

  // DELETE /classes/:batchId/comments/:id
  async removeComment(req, res) {
    const viewer = await gate(req, res);
    if (!viewer) return undefined;
    const rows = await query('SELECT id, user_id FROM class_comments WHERE id = ? AND batch_id = ?', [req.params.id, viewer.batch.id]);
    if (!rows[0]) return fail(res, 'Comment not found.', 404);
    if (rows[0].user_id !== req.user.id && !Access.canTeach(viewer)) return fail(res, 'You cannot delete this comment.', 403);
    await query('DELETE FROM class_comments WHERE id = ?', [req.params.id]);
    return success(res, {}, 'Comment deleted.');
  },

  // ---- topics --------------------------------------------------------------
  async createTopic(req, res) {
    const viewer = await gate(req, res, { teach: true });
    if (!viewer) return undefined;
    const name = clean(req.body?.name, 120);
    if (!name) return fail(res, 'Give the topic a name.', 422);
    const [{ pos }] = await query('SELECT COALESCE(MAX(position), 0) + 1 AS pos FROM class_topics WHERE batch_id = ?', [viewer.batch.id]);
    const r = await query('INSERT INTO class_topics (batch_id, name, position) VALUES (?, ?, ?)', [viewer.batch.id, name, pos]);
    const rows = await query('SELECT * FROM class_topics WHERE id = ?', [r.insertId]);
    return created(res, { data: rows[0] }, 'Topic added.');
  },

  async renameTopic(req, res) {
    const viewer = await gate(req, res, { teach: true });
    if (!viewer) return undefined;
    const name = clean(req.body?.name, 120);
    if (!name) return fail(res, 'Give the topic a name.', 422);
    const r = await query('UPDATE class_topics SET name = ? WHERE id = ? AND batch_id = ?', [name, req.params.id, viewer.batch.id]);
    if (!r.affectedRows) return fail(res, 'Topic not found.', 404);
    return success(res, {}, 'Topic renamed.');
  },

  // Deleting a topic keeps its classwork — it just moves to "No topic".
  async removeTopic(req, res) {
    const viewer = await gate(req, res, { teach: true });
    if (!viewer) return undefined;
    await query('UPDATE course_materials SET topic_id = NULL WHERE topic_id = ? AND batch_id = ?', [req.params.id, viewer.batch.id]);
    const r = await query('DELETE FROM class_topics WHERE id = ? AND batch_id = ?', [req.params.id, viewer.batch.id]);
    if (!r.affectedRows) return fail(res, 'Topic not found.', 404);
    return success(res, {}, 'Topic deleted. Its classwork is kept under "No topic".');
  },

  // ---- classwork -------------------------------------------------------------
  // GET /classes/:batchId/classwork
  async classwork(req, res) {
    const viewer = await gate(req, res);
    if (!viewer) return undefined;
    const batchId = viewer.batch.id;
    const topics = await query('SELECT id, name, position FROM class_topics WHERE batch_id = ? ORDER BY position, id', [batchId]);

    let items;
    if (viewer.role === 'student') {
      items = await query(
        `SELECT m.id, m.title, m.instructions, m.type, m.topic_id, m.points, m.due_at, m.file_name, m.file_url,
                m.size_kb, m.created_at,
                sub.status AS submission_status, sub.submitted_at,
                CASE WHEN sub.status = 'returned' THEN sub.grade END AS grade,
                CASE
                  WHEN m.type = 'material' THEN NULL
                  WHEN sub.status = 'returned' THEN 'returned'
                  WHEN sub.id IS NOT NULL THEN IF(sub.status = 'late', 'turned_in_late', 'turned_in')
                  WHEN m.due_at IS NOT NULL AND m.due_at < NOW() THEN 'missing'
                  ELSE 'assigned'
                END AS my_status
         FROM course_materials m
         LEFT JOIN assignment_submissions sub ON sub.material_id = m.id AND sub.student_id = ?
         WHERE m.batch_id = ? ORDER BY m.created_at DESC, m.id DESC`,
        [viewer.studentId, batchId]
      );
    } else {
      const [{ n: assigned }] = await query(`SELECT COUNT(*) AS n FROM students s WHERE ${Access.ROSTER_WHERE}`, [batchId, batchId]);
      items = await query(
        `SELECT m.id, m.title, m.instructions, m.type, m.topic_id, m.points, m.due_at, m.file_name, m.file_url,
                m.size_kb, m.created_at,
                SUM(sub.id IS NOT NULL) AS turned_in,
                SUM(sub.status IN ('graded','returned')) AS graded,
                SUM(sub.status = 'returned') AS returned
         FROM course_materials m
         LEFT JOIN assignment_submissions sub ON sub.material_id = m.id
         WHERE m.batch_id = ?
         GROUP BY m.id ORDER BY m.created_at DESC, m.id DESC`,
        [batchId]
      );
      items = items.map((i) => ({ ...i, assigned, turned_in: Number(i.turned_in || 0), graded: Number(i.graded || 0), returned: Number(i.returned || 0) }));
    }
    return success(res, { data: { topics, items, can_teach: Access.canTeach(viewer) } }, 'Classwork fetched.');
  },

  // POST /classes/:batchId/classwork  (multipart documents[] optional)
  async createWork(req, res) {
    const viewer = await gate(req, res, { teach: true });
    if (!viewer) return undefined;
    const b = req.body || {};
    const title = clean(b.title, 180);
    const type = b.type || 'assignment';
    if (!title) return fail(res, 'Give the classwork a title.', 422);
    if (![...WORK_TYPES, ...LEGACY_TYPES].includes(type)) return fail(res, `type must be one of: ${WORK_TYPES.join(', ')}.`, 422);

    const dueAt = toDateTime(b.due_at);
    if (dueAt === undefined) return fail(res, 'The due date and time could not be read.', 422);
    const points = type === 'material' ? null : intOrNull(b.points);
    if (points !== null && (!Number.isInteger(points) || points < 0 || points > 1000)) {
      return fail(res, 'Points must be a whole number from 0 to 1000, or blank for ungraded.', 422);
    }
    const topicId = intOrNull(b.topic_id);
    if (topicId) {
      const t = await query('SELECT id FROM class_topics WHERE id = ? AND batch_id = ?', [topicId, viewer.batch.id]);
      if (!t.length) return fail(res, 'That topic is not in this class.', 422);
    }
    if (type === 'material' && dueAt) return fail(res, 'Material has no due date.', 422);

    const file = req.files?.[0] || null;
    const r = await query(
      `INSERT INTO course_materials
         (batch_id, topic_id, course_id, faculty_id, title, instructions, type, points,
          assigned_date, due_date, due_at, file_name, file_url, mime_type, size_kb)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?)`,
      [viewer.batch.id, topicId, viewer.batch.course_id, viewer.batch.faculty_id, title,
        clean(b.instructions, 10000) || null, type, points,
        dueAt ? dueAt.slice(0, 10) : null, dueAt,
        file?.originalname || '', file ? `/uploads/documents/${file.filename}` : '',
        file?.mimetype || null, file ? Math.round(file.size / 1024) : 0]
    );
    const students = await Access.roster(viewer.batch.id);
    await notifyMany(students.map((s) => s.user_id), {
      type: 'info', title: `New ${TYPE_LABEL[type]}: ${title}`,
      message: `${viewer.batch.name}${dueAt ? ` · due ${dueAt.slice(0, 16)}` : ''}`,
      link: `/classroom/${viewer.batch.id}?item=${r.insertId}`,
    });
    const rows = await query('SELECT * FROM course_materials WHERE id = ?', [r.insertId]);
    return created(res, { data: rows[0] }, `${TYPE_LABEL[type][0].toUpperCase()}${TYPE_LABEL[type].slice(1)} posted.`);
  },

  // PATCH /classes/:batchId/classwork/:id { title?, instructions?, topic_id?, points?, due_at? }
  async updateWork(req, res) {
    const viewer = await gate(req, res, { teach: true });
    if (!viewer) return undefined;
    const item = await itemIn(res, viewer.batch.id, req.params.id);
    if (!item) return undefined;
    const b = req.body || {};
    const patch = {};
    if (b.title !== undefined) {
      patch.title = clean(b.title, 180);
      if (!patch.title) return fail(res, 'The title cannot be empty.', 422);
    }
    if (b.instructions !== undefined) patch.instructions = clean(b.instructions, 10000) || null;
    if (b.topic_id !== undefined) {
      const topicId = intOrNull(b.topic_id);
      if (topicId) {
        const t = await query('SELECT id FROM class_topics WHERE id = ? AND batch_id = ?', [topicId, viewer.batch.id]);
        if (!t.length) return fail(res, 'That topic is not in this class.', 422);
      }
      patch.topic_id = topicId;
    }
    if (b.points !== undefined && item.type !== 'material') {
      const points = intOrNull(b.points);
      if (points !== null && (!Number.isInteger(points) || points < 0 || points > 1000)) {
        return fail(res, 'Points must be a whole number from 0 to 1000, or blank for ungraded.', 422);
      }
      patch.points = points;
    }
    if (b.due_at !== undefined && item.type !== 'material') {
      const dueAt = toDateTime(b.due_at);
      if (dueAt === undefined) return fail(res, 'The due date and time could not be read.', 422);
      patch.due_at = dueAt;
      patch.due_date = dueAt ? dueAt.slice(0, 10) : null;
    }
    const keys = Object.keys(patch);
    if (keys.length) {
      await query(`UPDATE course_materials SET ${keys.map((k) => `\`${k}\` = ?`).join(', ')} WHERE id = ?`,
        [...keys.map((k) => patch[k]), item.id]);
    }
    const rows = await query('SELECT * FROM course_materials WHERE id = ?', [item.id]);
    return success(res, { data: rows[0] }, 'Classwork updated.');
  },

  async removeWork(req, res) {
    const viewer = await gate(req, res, { teach: true });
    if (!viewer) return undefined;
    const item = await itemIn(res, viewer.batch.id, req.params.id);
    if (!item) return undefined;
    await query('DELETE FROM course_materials WHERE id = ?', [item.id]);
    return success(res, {}, 'Classwork deleted, with its submissions and comments.');
  },

  // GET /classes/:batchId/classwork/:id — the item, its class comments, and
  // either the whole class's work (teacher) or my own work (student).
  async workDetail(req, res) {
    const viewer = await gate(req, res);
    if (!viewer) return undefined;
    const item = await itemIn(res, viewer.batch.id, req.params.id);
    if (!item) return undefined;

    const comments = await query(
      `SELECT cc.id, cc.body, cc.created_at, cc.user_id, u.name AS author_name
       FROM class_comments cc LEFT JOIN users u ON u.id = cc.user_id
       WHERE cc.material_id = ? ORDER BY cc.created_at, cc.id`, [item.id]
    );

    if (viewer.role === 'student') {
      const subs = await query('SELECT * FROM assignment_submissions WHERE material_id = ? AND student_id = ?', [item.id, viewer.studentId]);
      const sub = subs[0] || null;
      if (sub && sub.status !== 'returned') { sub.grade = null; sub.feedback = null; }
      const privateComments = await query(
        `SELECT pc.id, pc.body, pc.created_at, pc.user_id, u.name AS author_name
         FROM class_private_comments pc LEFT JOIN users u ON u.id = pc.user_id
         WHERE pc.material_id = ? AND pc.student_id = ? ORDER BY pc.created_at, pc.id`,
        [item.id, viewer.studentId]
      );
      const [{ past }] = await query('SELECT (? IS NOT NULL AND ? < NOW()) AS past', [item.due_at, item.due_at]);
      return success(res, {
        data: { item, comments, me: req.user.id, role: 'student', submission: sub, private_comments: privateComments, past_due: !!past },
      }, 'Classwork fetched.');
    }

    const rows = await query(
      `SELECT s.id AS student_id, s.name AS student_name, s.email, s.avatar,
              sub.id AS submission_id, sub.status, sub.note, sub.file_name, sub.file_url, sub.size_kb,
              sub.grade, sub.feedback, sub.submitted_at, sub.returned_at,
              (SELECT COUNT(*) FROM class_private_comments pc WHERE pc.material_id = ? AND pc.student_id = s.id) AS private_count,
              CASE
                WHEN sub.status = 'returned' THEN 'returned'
                WHEN sub.status = 'graded' THEN 'graded'
                WHEN sub.id IS NOT NULL THEN IF(sub.status = 'late', 'turned_in_late', 'turned_in')
                WHEN ? IS NOT NULL AND ? < NOW() THEN 'missing'
                ELSE 'assigned'
              END AS work_status
       FROM students s
       LEFT JOIN assignment_submissions sub ON sub.material_id = ? AND sub.student_id = s.id
       WHERE ${Access.ROSTER_WHERE}
       ORDER BY s.name`,
      [item.id, item.due_at, item.due_at, item.id, viewer.batch.id, viewer.batch.id]
    );
    const count = (st) => rows.filter((r) => st.includes(r.work_status)).length;
    return success(res, {
      data: {
        item, comments, me: req.user.id, role: viewer.role, roster: rows,
        summary: {
          assigned: rows.length,
          turned_in: count(['turned_in', 'turned_in_late', 'graded', 'returned']),
          missing: count(['missing']),
          graded: count(['graded', 'returned']),
          returned: count(['returned']),
        },
      },
    }, 'Student work fetched.');
  },

  // POST /classes/:batchId/classwork/:id/turn-in  (multipart "file" optional) { note? }
  async turnIn(req, res) {
    const viewer = await gate(req, res);
    if (!viewer) return undefined;
    if (viewer.role !== 'student') return fail(res, 'Only students turn in work.', 403);
    const item = await itemIn(res, viewer.batch.id, req.params.id);
    if (!item) return undefined;
    if (item.type === 'material') return fail(res, 'Material does not take submissions.', 422);

    const existing = await query('SELECT status FROM assignment_submissions WHERE material_id = ? AND student_id = ?', [item.id, viewer.studentId]);
    if (existing[0]?.status === 'returned') return fail(res, 'This work has already been graded and returned.', 409);

    const file = req.file || null;
    const note = clean(req.body?.note, 5000) || null;
    if (item.type === 'question' && !note) return fail(res, 'Type your answer before turning it in.', 422);
    if (!file && !note) return fail(res, 'Attach a file or write something before turning in.', 422);

    const [{ late }] = await query('SELECT (? IS NOT NULL AND ? < NOW()) AS late', [item.due_at, item.due_at]);
    const status = late ? 'late' : 'submitted';
    await query(
      `INSERT INTO assignment_submissions (material_id, student_id, note, file_name, file_url, mime_type, size_kb, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE note = VALUES(note),
         file_name = COALESCE(VALUES(file_name), file_name), file_url = COALESCE(VALUES(file_url), file_url),
         mime_type = COALESCE(VALUES(mime_type), mime_type), size_kb = IF(VALUES(file_url) IS NULL, size_kb, VALUES(size_kb)),
         status = VALUES(status), grade = NULL, feedback = NULL, graded_by = NULL, graded_at = NULL,
         returned_at = NULL, submitted_at = CURRENT_TIMESTAMP`,
      [item.id, viewer.studentId, note, file?.originalname || null,
        file ? `/uploads/submissions/${file.filename}` : null, file?.mimetype || null,
        file ? Math.round(file.size / 1024) : 0, status]
    );
    await notifyMany([viewer.batch.trainer_user_id], {
      type: 'info', title: `Work turned in${late ? ' (late)' : ''}`,
      message: `${viewer.studentName} · ${item.title}`, link: `/classroom/${viewer.batch.id}?item=${item.id}`,
    });
    const rows = await query('SELECT * FROM assignment_submissions WHERE material_id = ? AND student_id = ?', [item.id, viewer.studentId]);
    return created(res, { data: rows[0] }, late ? 'Turned in (done late).' : 'Turned in.');
  },

  // POST /classes/:batchId/classwork/:id/unsubmit — take work back before it is graded
  async unsubmit(req, res) {
    const viewer = await gate(req, res);
    if (!viewer) return undefined;
    if (viewer.role !== 'student') return fail(res, 'Only students can unsubmit.', 403);
    const item = await itemIn(res, viewer.batch.id, req.params.id);
    if (!item) return undefined;
    const rows = await query('SELECT id, status FROM assignment_submissions WHERE material_id = ? AND student_id = ?', [item.id, viewer.studentId]);
    if (!rows[0]) return fail(res, 'Nothing has been turned in.', 404);
    if (['graded', 'returned'].includes(rows[0].status)) {
      return fail(res, 'Your trainer has already graded this. Leave a private comment instead.', 409);
    }
    await query('DELETE FROM assignment_submissions WHERE id = ?', [rows[0].id]);
    return success(res, {}, 'Unsubmitted. Turn it in again when it is ready.');
  },

  // PUT /classes/:batchId/classwork/:id/grades/:studentId { grade, feedback? }
  // A DRAFT grade: the student does not see it until it is returned. Works
  // for a student who never turned anything in, too (work done on paper).
  async grade(req, res) {
    const viewer = await gate(req, res, { teach: true });
    if (!viewer) return undefined;
    const item = await itemIn(res, viewer.batch.id, req.params.id);
    if (!item) return undefined;
    if (item.type === 'material') return fail(res, 'Material is not graded.', 422);

    const inClass = await query(`SELECT s.id FROM students s WHERE s.id = ? AND ${Access.ROSTER_WHERE}`,
      [req.params.studentId, viewer.batch.id, viewer.batch.id]);
    if (!inClass.length) return fail(res, 'That student is not in this class.', 404);

    const raw = String(req.body?.grade ?? '').trim();
    if (!raw) return fail(res, 'Enter a grade.', 422);
    if (item.points !== null && item.points !== undefined) {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > Number(item.points)) {
        return fail(res, `Grade must be a number from 0 to ${item.points}.`, 422);
      }
    } else if (raw.length > 10) {
      return fail(res, 'A grade is at most 10 characters (for example A+ or Pass).', 422);
    }
    const feedback = clean(req.body?.feedback, 500) || null;

    await query(
      `INSERT INTO assignment_submissions (material_id, student_id, status, grade, feedback, graded_by, graded_at)
       VALUES (?, ?, 'graded', ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE grade = VALUES(grade), feedback = VALUES(feedback),
         graded_by = VALUES(graded_by), graded_at = NOW(),
         status = IF(status = 'returned', 'returned', 'graded')`,
      [item.id, req.params.studentId, raw, feedback, req.user.id]
    );
    const rows = await query('SELECT * FROM assignment_submissions WHERE material_id = ? AND student_id = ?', [item.id, req.params.studentId]);
    const returned = rows[0]?.status === 'returned';
    if (returned) {
      const u = await query('SELECT user_id FROM students WHERE id = ?', [req.params.studentId]);
      await notifyMany([u[0]?.user_id], {
        type: 'info', title: 'Your grade was updated', message: `${item.title}: ${raw}`,
        link: `/classroom/${viewer.batch.id}?item=${item.id}`,
      });
    }
    return success(res, { data: rows[0] }, returned ? 'Grade updated for the student.' : 'Draft grade saved. Return it to show the student.');
  },

  // POST /classes/:batchId/classwork/:id/return { student_ids: [] }
  async returnWork(req, res) {
    const viewer = await gate(req, res, { teach: true });
    if (!viewer) return undefined;
    const item = await itemIn(res, viewer.batch.id, req.params.id);
    if (!item) return undefined;
    const ids = Array.isArray(req.body?.student_ids) ? req.body.student_ids.map(Number).filter(Number.isInteger) : [];
    if (!ids.length) return fail(res, 'Choose at least one student to return work to.', 422);

    const rows = await query(
      `SELECT sub.id, sub.student_id, sub.grade, s.user_id FROM assignment_submissions sub
       JOIN students s ON s.id = sub.student_id
       WHERE sub.material_id = ? AND sub.student_id IN (${ids.map(() => '?').join(',')}) AND sub.status <> 'returned'`,
      [item.id, ...ids]
    );
    if (!rows.length) return fail(res, 'Nothing to return: those students have no work or grade yet, or it was already returned.', 422);
    await query(
      `UPDATE assignment_submissions SET status = 'returned', returned_at = NOW()
       WHERE id IN (${rows.map(() => '?').join(',')})`,
      rows.map((r) => r.id)
    );
    for (const r of rows) {
      NotificationService.notifyUser(r.user_id, {
        type: 'info', title: 'Work returned',
        message: `${item.title}${r.grade ? ` · grade ${r.grade}${item.points !== null ? `/${item.points}` : ''}` : ''}`,
        link: `/classroom/${viewer.batch.id}?item=${item.id}`,
      });
    }
    return success(res, { data: { returned: rows.length } }, `Returned to ${rows.length} student${rows.length === 1 ? '' : 's'}.`);
  },

  // GET /classes/:batchId/classwork/:id/private-comments?student_id=
  async privateComments(req, res) {
    const viewer = await gate(req, res);
    if (!viewer) return undefined;
    const item = await itemIn(res, viewer.batch.id, req.params.id);
    if (!item) return undefined;
    const studentId = viewer.role === 'student' ? viewer.studentId : Number(req.query.student_id);
    if (!studentId) return fail(res, 'student_id is required.', 422);
    const rows = await query(
      `SELECT pc.id, pc.body, pc.created_at, pc.user_id, u.name AS author_name
       FROM class_private_comments pc LEFT JOIN users u ON u.id = pc.user_id
       WHERE pc.material_id = ? AND pc.student_id = ? ORDER BY pc.created_at, pc.id`,
      [item.id, studentId]
    );
    return success(res, { data: rows }, 'Private comments fetched.');
  },

  // POST /classes/:batchId/classwork/:id/private-comments { body, student_id? }
  async addPrivateComment(req, res) {
    const viewer = await gate(req, res);
    if (!viewer) return undefined;
    const item = await itemIn(res, viewer.batch.id, req.params.id);
    if (!item) return undefined;
    const body = clean(req.body?.body, 1000);
    if (!body) return fail(res, 'The comment is empty.', 422);

    let studentId;
    let notifyUser;
    if (viewer.role === 'student') {
      studentId = viewer.studentId;
      notifyUser = viewer.batch.trainer_user_id;
    } else {
      studentId = Number(req.body?.student_id);
      const s = await query(`SELECT s.id, s.user_id FROM students s WHERE s.id = ? AND ${Access.ROSTER_WHERE}`,
        [studentId, viewer.batch.id, viewer.batch.id]);
      if (!s.length) return fail(res, 'That student is not in this class.', 404);
      notifyUser = s[0].user_id;
    }
    const r = await query(
      'INSERT INTO class_private_comments (material_id, student_id, user_id, body) VALUES (?, ?, ?, ?)',
      [item.id, studentId, req.user.id, body]
    );
    await notifyMany([notifyUser], {
      type: 'info', title: 'New private comment', message: `${item.title}: ${body.slice(0, 100)}`,
      link: `/classroom/${viewer.batch.id}?item=${item.id}`,
    });
    const rows = await query(
      `SELECT pc.*, u.name AS author_name FROM class_private_comments pc LEFT JOIN users u ON u.id = pc.user_id WHERE pc.id = ?`,
      [r.insertId]
    );
    return created(res, { data: rows[0] }, 'Private comment sent.');
  },

  // GET /classes/:batchId/people
  async people(req, res) {
    const viewer = await gate(req, res);
    if (!viewer) return undefined;
    const teach = Access.canTeach(viewer);
    const students = (await Access.roster(viewer.batch.id)).map((s) => ({
      id: s.id, name: s.name, avatar: s.avatar,
      // Classmates see names only; contact details are for the teacher.
      ...(teach ? { email: s.email, phone: s.phone } : {}),
    }));
    const teachers = viewer.batch.trainer_name
      ? [{ name: viewer.batch.trainer_name, email: viewer.batch.trainer_email, avatar: viewer.batch.trainer_avatar }]
      : [];
    return success(res, { data: { teachers, students, can_teach: teach } }, 'People fetched.');
  },

  // DELETE /classes/:batchId/people/:studentId — remove a student from the class
  async removeStudent(req, res) {
    const viewer = await gate(req, res, { teach: true });
    if (!viewer) return undefined;
    const r = await query(
      "UPDATE student_batches SET status = 'dropped', completed_on = CURDATE() WHERE student_id = ? AND batch_id = ? AND status = 'enrolled'",
      [req.params.studentId, viewer.batch.id]
    );
    if (!r.affectedRows) {
      return fail(res, "This student is in the class through their student record. Change their batch on the Students page.", 409);
    }
    return success(res, {}, 'Student removed from the class.');
  },

  // GET /classes/:batchId/grades — students × graded classwork
  async grades(req, res) {
    const viewer = await gate(req, res, { teach: true });
    if (!viewer) return undefined;
    const batchId = viewer.batch.id;
    const items = await query(
      `SELECT m.id, m.title, m.type, m.points, m.due_at FROM course_materials m
       WHERE m.batch_id = ? AND ${GRADABLE_SQL}
       ORDER BY m.due_at IS NULL, m.due_at, m.created_at`, [batchId]
    );
    const students = await Access.roster(batchId);
    const subs = await query(
      `SELECT sub.material_id, sub.student_id, sub.status, sub.grade, sub.submitted_at, sub.returned_at
       FROM assignment_submissions sub JOIN course_materials m ON m.id = sub.material_id
       WHERE m.batch_id = ?`, [batchId]
    );
    const [{ now }] = await query('SELECT NOW() AS now');
    const key = (m, s) => `${m}:${s}`;
    const byKey = new Map(subs.map((s) => [key(s.material_id, s.student_id), s]));

    const rows = students.map((st) => {
      let earned = 0;
      let possible = 0;
      const cells = {};
      for (const it of items) {
        const sub = byKey.get(key(it.id, st.id));
        let status;
        if (sub?.status === 'returned') status = 'returned';
        else if (sub?.status === 'graded') status = 'draft';
        else if (sub) status = sub.status === 'late' ? 'turned_in_late' : 'turned_in';
        else if (it.due_at && String(it.due_at) < String(now)) status = 'missing';
        else status = 'assigned';
        cells[it.id] = { status, grade: sub?.grade ?? null };
        if (it.points && sub?.grade !== null && sub?.grade !== undefined && ['returned', 'draft'].includes(status)) {
          const n = Number(sub.grade);
          if (Number.isFinite(n)) { earned += n; possible += Number(it.points); }
        }
      }
      return {
        student_id: st.id, name: st.name, email: st.email, cells,
        average: possible ? Math.round((earned / possible) * 1000) / 10 : null,
      };
    });

    const classAvg = items.map((it) => {
      const graded = rows.map((r) => r.cells[it.id]).filter((c) => c.grade !== null && Number.isFinite(Number(c.grade)));
      return {
        id: it.id,
        average: it.points && graded.length
          ? Math.round((graded.reduce((a, c) => a + Number(c.grade), 0) / graded.length) * 10) / 10
          : null,
      };
    });
    return success(res, { data: { items, rows, item_averages: classAvg } }, 'Grades fetched.');
  },
};

module.exports = ClassController;
