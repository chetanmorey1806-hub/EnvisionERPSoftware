/**
 * PortfolioController — the student's own evidence of capability.
 *
 * Mounted under /api/students/me/*, so ownership comes from the JWT via
 * resolveStudent. A student can only ever read or write THEIR OWN portfolio;
 * there is no id in the URL for them to tamper with.
 *
 * The resume is stored AND its text extracted, because a PDF sitting in a
 * folder is invisible to matching. The extracted text is what lets a recruiter
 * search "Django" and find the student who never thought to tag it.
 */
const fs = require('fs');
const path = require('path');
const { query } = require('../config/db');
const { success, fail } = require('../utils/response');

/**
 * Pull readable words out of an uploaded resume.
 *
 * Deliberately dependency-free. A real PDF parse needs pdf-parse/textract; we
 * are not pretending otherwise — for a PDF we salvage the literal text runs
 * that PDFs store in plain form, and for .txt/.md we just read it. Anything we
 * cannot read stores NULL rather than garbage, because a garbage keyword index
 * is worse than an empty one: it produces confident wrong matches.
 */
function extractText(filePath, mime) {
  try {
    const buf = fs.readFileSync(filePath);
    if (mime === 'text/plain' || mime === 'text/markdown' || /\.(txt|md)$/i.test(filePath)) {
      return buf.toString('utf8').slice(0, 60000);
    }
    if (mime === 'application/pdf' || /\.pdf$/i.test(filePath)) {
      // PDF text runs appear between parentheses inside content streams. This
      // catches uncompressed PDFs only — good enough to index, honest about it.
      const raw = buf.toString('latin1');
      const runs = raw.match(/\(([^()\\]{2,})\)/g) || [];
      const text = runs.map((s) => s.slice(1, -1)).join(' ').replace(/\s+/g, ' ').trim();
      return text.length > 40 ? text.slice(0, 60000) : null;
    }
    return null;   // .docx etc — we do not guess
  } catch {
    return null;
  }
}

const PortfolioController = {
  // GET /students/me/portfolio
  async get(req, res) {
    const [profile] = await query('SELECT * FROM student_profiles WHERE student_id = ?', [req.student.id]);
    const skills = await query(
      `SELECT ss.skill_id, sk.name, ss.level, ss.source, ss.verified_at, f.name AS verified_by_name
       FROM student_skills ss
       JOIN skills sk ON sk.id = ss.skill_id
       LEFT JOIN faculty f ON f.id = ss.verified_by
       WHERE ss.student_id = ? ORDER BY ss.source DESC, sk.name`,
      [req.student.id]
    );

    // Show the student exactly what a recruiter will see — including WHY they
    // are or are not in the pool. No student should be surprised by this.
    const EmployabilityService = require('../services/EmployabilityService');
    const readiness = await EmployabilityService.readiness(req.student.id);

    return success(res, {
      data: {
        profile: profile || { student_id: req.student.id },
        skills,
        employability: req.student.employability,
        readiness: {
          checks: readiness.checks,
          attendance_pct: readiness.attendance_pct,
          technical_pct: readiness.technical_pct,
          job_ready: readiness.job_ready,
        },
        has_resume_text: Boolean(profile?.resume_text),
      },
    }, 'Portfolio fetched.');
  },

  // PUT /students/me/portfolio  { github_url, portfolio_url, linkedin_url, summary }
  async update(req, res) {
    const b = req.body || {};
    const url = (v) => {
      if (!v) return null;
      const s = String(v).trim();
      if (!s) return null;
      if (!/^https?:\/\//i.test(s)) return `https://${s}`;   // be kind about the scheme
      return s.slice(0, 255);
    };

    await query(
      `INSERT INTO student_profiles (student_id, github_url, portfolio_url, linkedin_url, summary)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         github_url = VALUES(github_url), portfolio_url = VALUES(portfolio_url),
         linkedin_url = VALUES(linkedin_url), summary = VALUES(summary)`,
      [req.student.id, url(b.github_url), url(b.portfolio_url), url(b.linkedin_url),
        b.summary ? String(b.summary).slice(0, 1000) : null]
    );
    const [profile] = await query('SELECT * FROM student_profiles WHERE student_id = ?', [req.student.id]);
    return success(res, { data: profile }, 'Portfolio updated.');
  },

  // POST /students/me/portfolio/resume  (multipart: file)
  async uploadResume(req, res) {
    if (!req.file) return fail(res, 'No resume file was uploaded.', 422);

    const text = extractText(req.file.path, req.file.mimetype);

    await query(
      `INSERT INTO student_profiles (student_id, resume_path, resume_name, resume_text)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         resume_path = VALUES(resume_path), resume_name = VALUES(resume_name),
         resume_text = VALUES(resume_text)`,
      [req.student.id, req.file.path, req.file.originalname, text]
    );

    return success(res, {
      data: {
        resume_name: req.file.originalname,
        size_kb: Math.round(req.file.size / 1024),
        // Say plainly whether the resume is searchable. A student who uploaded a
        // scanned image should know it will not be matched on.
        indexed: Boolean(text),
        note: text
          ? 'Resume uploaded and indexed for keyword matching.'
          : 'Resume uploaded, but no text could be extracted — recruiters can open it, but keyword matching will not find it. A text-based PDF works best.',
      },
    }, 'Resume uploaded.');
  },

  // GET /students/me/skills — what the student claims vs what a trainer verified
  async addSkill(req, res) {
    const { skill_id, level } = req.body || {};
    if (!skill_id) return fail(res, 'skill_id is required.', 422);

    // A student may CLAIM a skill, never verify it. `source` stays 'self' and a
    // recruiter search only trusts trainer-verified skills.
    await query(
      `INSERT INTO student_skills (student_id, skill_id, level, source)
       VALUES (?, ?, ?, 'self')
       ON DUPLICATE KEY UPDATE
         level  = IF(source = 'trainer', level, VALUES(level))`,
      [req.student.id, skill_id, level || 'beginner']
    );
    const skills = await query(
      `SELECT ss.skill_id, sk.name, ss.level, ss.source
       FROM student_skills ss JOIN skills sk ON sk.id = ss.skill_id
       WHERE ss.student_id = ?`,
      [req.student.id]
    );
    return success(res, { data: skills }, 'Skill added. A trainer must verify it before recruiters see it.');
  },
};

module.exports = PortfolioController;
