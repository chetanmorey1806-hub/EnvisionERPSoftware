/**
 * PacingService — is the syllabus actually on track?
 *
 * "60% covered" means nothing on its own. 60% covered with 80% of the term gone
 * is a batch in trouble; 60% with 40% gone is ahead. The comparison is the
 * signal, so this computes BOTH and reports the gap.
 *
 *   elapsed_pct  = how much of the batch's calendar has been used
 *   covered_pct  = how much of the syllabus is marked covered
 *   drift        = covered_pct - elapsed_pct     (negative = behind)
 *
 * A batch that has not started yet has no elapsed time and therefore cannot be
 * behind — reporting it as 100% behind on day zero would bury the real ones.
 */
const { query } = require('../config/db');

const BEHIND_AT = Number(process.env.PACING_BEHIND_PCT || 10); // drift worse than -10 = behind
const AT_RISK_AT = Number(process.env.PACING_RISK_PCT || 25);  // worse than -25 = critical

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function elapsedPct(start, end, asOf = new Date()) {
  if (!start || !end) return null;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const now = asOf.getTime();
  if (!(e > s)) return null;
  if (now <= s) return 0;
  return clamp(Math.round(((now - s) / (e - s)) * 100), 0, 100);
}

function verdict(drift, elapsed) {
  if (elapsed === null) return 'unscheduled';
  if (elapsed === 0) return 'not_started';
  if (drift <= -AT_RISK_AT) return 'critical';
  if (drift <= -BEHIND_AT) return 'behind';
  if (drift >= BEHIND_AT) return 'ahead';
  return 'on_track';
}

const PacingService = {
  /** Pacing for every active batch — the coordinator's morning screen. */
  async overview() {
    const rows = await query(
      `SELECT b.id, b.code, b.name, b.start_date, b.end_date, b.status,
              c.title AS course_title,
              f.name  AS faculty_name,
              (SELECT COUNT(*) FROM course_syllabus cs WHERE cs.course_id = b.course_id) AS total_topics,
              (SELECT COUNT(*) FROM topic_progress tp
                 JOIN course_syllabus cs2 ON cs2.id = tp.syllabus_id
                WHERE tp.batch_id = b.id AND tp.status = 'covered'
                  AND cs2.course_id = b.course_id)                                       AS covered_topics,
              (SELECT MAX(tp2.covered_on) FROM topic_progress tp2
                WHERE tp2.batch_id = b.id AND tp2.status = 'covered')                    AS last_covered_on
       FROM batches b
       LEFT JOIN courses c ON c.id = b.course_id
       LEFT JOIN faculty f ON f.id = b.faculty_id
       WHERE b.status = 'active'
       ORDER BY b.end_date ASC`
    );

    const items = rows.map((b) => {
      const total = Number(b.total_topics);
      const covered = Number(b.covered_topics);
      const covered_pct = total > 0 ? Math.round((covered / total) * 100) : 0;
      const elapsed_pct = elapsedPct(b.start_date, b.end_date);
      const drift = elapsed_pct === null ? null : covered_pct - elapsed_pct;
      const days_left = b.end_date
        ? Math.ceil((new Date(b.end_date) - new Date()) / 86400000)
        : null;

      return {
        ...b,
        total_topics: total,
        covered_topics: covered,
        covered_pct,
        elapsed_pct,
        drift,
        days_left,
        // Topics that still have to be taught, and the working days to do it in.
        topics_remaining: Math.max(total - covered, 0),
        status_label: verdict(drift ?? 0, elapsed_pct),
      };
    });

    const behind = items.filter((i) => ['behind', 'critical'].includes(i.status_label));
    return {
      items,
      summary: {
        batches: items.length,
        behind: behind.length,
        critical: items.filter((i) => i.status_label === 'critical').length,
        on_track: items.filter((i) => i.status_label === 'on_track').length,
        ahead: items.filter((i) => i.status_label === 'ahead').length,
        no_syllabus: items.filter((i) => i.total_topics === 0).length,
      },
    };
  },

  /** Topic-by-topic detail for one batch. */
  async forBatch(batchId) {
    const [batch] = await query(
      `SELECT b.*, c.title AS course_title FROM batches b
       LEFT JOIN courses c ON c.id = b.course_id WHERE b.id = ? LIMIT 1`,
      [batchId]
    );
    if (!batch) {
      const e = new Error('Batch not found.');
      e.status = 404;
      throw e;
    }

    const topics = await query(
      `SELECT cs.id, cs.seq, cs.topic, cs.hours,
              COALESCE(tp.status, 'pending') AS status,
              tp.covered_on, tp.notes
       FROM course_syllabus cs
       LEFT JOIN topic_progress tp ON tp.syllabus_id = cs.id AND tp.batch_id = ?
       WHERE cs.course_id = ?
       ORDER BY cs.seq ASC`,
      [batchId, batch.course_id]
    );

    const total = topics.length;
    const covered = topics.filter((t) => t.status === 'covered').length;
    const covered_pct = total > 0 ? Math.round((covered / total) * 100) : 0;
    const elapsed_pct = elapsedPct(batch.start_date, batch.end_date);
    const drift = elapsed_pct === null ? null : covered_pct - elapsed_pct;

    return {
      batch,
      topics,
      covered_pct,
      elapsed_pct,
      drift,
      status_label: verdict(drift ?? 0, elapsed_pct),
      resume_from: topics.find((t) => t.status !== 'covered') || null,
    };
  },
};

module.exports = PacingService;
