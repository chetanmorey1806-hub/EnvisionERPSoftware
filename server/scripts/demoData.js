/**
 * Demo data — load a realistic training institute, or remove it again.
 *
 *   npm run demo:load    (the API must be running: npm run dev)
 *   npm run demo:clear
 *
 * database/seed.sql is empty on purpose: a demo row looks exactly like a real
 * one once it is in the database. So this script does two things differently:
 *
 *   1. Everything goes through the real API, signed in as the person who would
 *      do it (admin sets up, trainers mark attendance, students turn in work),
 *      so fees, numbering and clash checks behave exactly as in real use.
 *   2. Every row it creates is written to `demo_records`, and `demo:clear`
 *      deletes exactly those rows — nothing an admin typed in by hand.
 *
 * Demo accounts all use the domain @envisiondemo.in and the password Demo@123.
 */
require('dotenv').config({ quiet: true });
const { pool } = require('../config/db');

const API = process.env.DEMO_API_URL || `http://localhost:${process.env.PORT || 5000}/api`;
const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL || 'admin@envision.local').toLowerCase();
const ADMIN_PASSWORD = process.env.DEMO_ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
const PASSWORD = 'Demo@123';
const DOMAIN = 'envisiondemo.in';

const q = (sql, params = []) => pool.query(sql, params).then((r) => r[0]);
const warnings = [];
const counts = {};

/* ------------------------------------------------------------------ helpers */

const day = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const at = (offset, time) => `${day(offset)}T${time}`;
const WEEKDAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

async function api(token, method, path, body, { form = false } = {}) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  let payload;
  if (body && form) {
    payload = new FormData();
    for (const [k, v] of Object.entries(body)) if (v !== undefined && v !== null && v !== '') payload.append(k, String(v));
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(API + path, { method, headers, body: payload });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(`${method} ${path} → ${res.status} ${json.message || ''}`.trim());
    e.status = res.status;
    throw e;
  }
  return json;
}

async function record(table, id) {
  if (!id) return;
  await q('INSERT IGNORE INTO demo_records (table_name, record_id) VALUES (?, ?)', [table, id]);
  counts[table] = (counts[table] || 0) + 1;
}

/** Run one step; a failure is reported and the rest carries on. */
async function step(label, fn) {
  try {
    return await fn();
  } catch (e) {
    warnings.push(`${label}: ${e.message}`);
    return null;
  }
}

const login = async (email, password = PASSWORD) => (await api(null, 'POST', '/auth/login', { email, password })).token;

/* ------------------------------------------------------------------ the institute */

const TRAINERS = [
  { name: 'Rahul Deshmukh', email: 'rahul.deshmukh', phone: '9822011001', department: 'Programming', designation: 'Senior Trainer', specialization: 'Python, Data Analytics, SQL', qualification: 'M.Sc. Computer Science', experience: 9 },
  { name: 'Sneha Kulkarni', email: 'sneha.kulkarni', phone: '9822011002', department: 'Web Development', designation: 'Lead Trainer', specialization: 'HTML, CSS, JavaScript, React, Node.js', qualification: 'B.E. Information Technology', experience: 7 },
  { name: 'Amit Joshi', email: 'amit.joshi', phone: '9822011003', department: 'Programming', designation: 'Trainer', specialization: 'Core Java, Spring Boot', qualification: 'MCA', experience: 6 },
  { name: 'Pooja Shinde', email: 'pooja.shinde', phone: '9822011004', department: 'Accounts', designation: 'Trainer', specialization: 'Tally Prime, GST, Advanced Excel', qualification: 'M.Com.', experience: 8 },
];

const STAFF_ACCOUNTS = [
  { name: 'Kavita Pawar', email: 'kavita.pawar', role: 'registrar', phone: '9822012001' },
  { name: 'Suresh Patil', email: 'suresh.patil', role: 'accountant', phone: '9822012002' },
  { name: 'Meena Gaikwad', email: 'meena.gaikwad', role: 'librarian', phone: '9822012003' },
  { name: 'Nikhil More', email: 'nikhil.more', role: 'placement', phone: '9822012004' },
  { name: 'Anjali Bhosale', email: 'anjali.bhosale', role: 'coordinator', phone: '9822012005' },
  { name: 'Rohan Jadhav', email: 'rohan.jadhav', role: 'teaching_assistant', phone: '9822012006' },
];

const ROOMS = [
  { code: 'LAB-1', name: 'Python Lab', type: 'lab', capacity: 30, location: 'First floor' },
  { code: 'LAB-2', name: 'Web Development Lab', type: 'lab', capacity: 25, location: 'First floor' },
  { code: 'CR-101', name: 'Classroom 101', type: 'classroom', capacity: 40, location: 'Ground floor' },
  { code: 'CR-102', name: 'Classroom 102', type: 'classroom', capacity: 30, location: 'Ground floor' },
];

// trainer = index in TRAINERS, room = index in ROOMS
const COURSES = [
  { code: 'PY-101', title: 'Python Programming', department: 'Programming', duration: '3 months', fee: 18000, credits: 6,
    description: 'Python from first principles to working scripts, files, OOP and SQL basics.',
    batch: { code: 'PY-101-MOR', name: 'Python Morning Batch', trainer: 0, room: 0, days: ['mon', 'wed', 'fri'], start: '09:00', end: '11:00', started: -42, weeks: 13, seats: 25 } },
  { code: 'FSWD-201', title: 'Full Stack Web Development', department: 'Web Development', duration: '6 months', fee: 45000, credits: 12,
    description: 'HTML, CSS, JavaScript, React, Node.js and MySQL, ending in a deployed project.',
    batch: { code: 'FSWD-201-A', name: 'Full Stack Batch A', trainer: 1, room: 1, days: ['mon', 'tue', 'wed', 'thu', 'fri'], start: '11:00', end: '13:00', started: -35, weeks: 26, seats: 22 } },
  { code: 'JAVA-150', title: 'Core and Advanced Java', department: 'Programming', duration: '4 months', fee: 25000, credits: 8,
    description: 'Core Java, collections, JDBC and an introduction to Spring Boot.',
    batch: { code: 'JAVA-150-EVE', name: 'Java Evening Batch', trainer: 2, room: 2, days: ['tue', 'thu', 'sat'], start: '17:00', end: '19:00', started: -28, weeks: 17, seats: 35 } },
  { code: 'DA-301', title: 'Data Analytics with Excel and Power BI', department: 'Programming', duration: '3 months', fee: 30000, credits: 6,
    description: 'Cleaning, pivots, dashboards and storytelling with data.',
    batch: { code: 'DA-301-WKD', name: 'Data Analytics Batch', trainer: 0, room: 3, days: ['tue', 'thu'], start: '14:00', end: '16:00', started: -21, weeks: 13, seats: 25 } },
  { code: 'TALLY-110', title: 'Tally Prime with GST', department: 'Accounts', duration: '2 months', fee: 12000, credits: 4,
    description: 'Vouchers, inventory, GST returns and payroll in Tally Prime.',
    batch: { code: 'TALLY-110-A', name: 'Tally Prime Batch', trainer: 3, room: 3, days: ['mon', 'wed', 'fri'], start: '17:00', end: '19:00', started: -14, weeks: 9, seats: 25 } },
];

const FIRST = ['Aarti', 'Rohit', 'Sakshi', 'Omkar', 'Priya', 'Tejas', 'Neha', 'Siddharth', 'Rutuja', 'Aditya',
  'Shruti', 'Pranav', 'Vaishnavi', 'Akash', 'Komal', 'Yash', 'Snehal', 'Harshal', 'Mansi', 'Vishal', 'Pallavi', 'Sagar'];
const LAST = ['Deshpande', 'Pawar', 'Kale', 'Jagtap', 'Patil', 'Kulkarni', 'Chavan', 'Mane', 'Salunkhe', 'Wagh',
  'Bhosale', 'Gokhale', 'Shirke', 'Nikam', 'Thorat', 'Joshi', 'Kadam', 'Sawant', 'Rane', 'Ghorpade', 'Sathe', 'Dhumal'];
const QUAL = ['B.Sc. Computer Science', 'B.Com.', 'BCA', 'B.E. Mechanical', 'Diploma in Computer Engineering', 'B.A.', 'M.Com.', 'B.Sc. IT'];
const AREAS = ['Kothrud', 'Hadapsar', 'Wakad', 'Baner', 'Shivajinagar', 'Pimpri', 'Karve Nagar', 'Aundh', 'Viman Nagar', 'Katraj'];

/* ------------------------------------------------------------------ load */

async function load() {
  await q(`CREATE TABLE IF NOT EXISTS demo_records (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    table_name VARCHAR(64) NOT NULL,
    record_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id), UNIQUE KEY uq_demo (table_name, record_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  const [{ n: already }] = await q('SELECT COUNT(*) AS n FROM demo_records');
  if (already) {
    console.log(`Demo data is already loaded (${already} records). Run "npm run demo:clear" first to load it fresh.`);
    return;
  }

  try { await fetch(`${API}/health`); } catch {
    throw new Error(`The API is not running at ${API}. Start it with "npm run dev" and try again.`);
  }
  const admin = await login(ADMIN_EMAIL, ADMIN_PASSWORD).catch(() => {
    throw new Error(`Could not sign in as ${ADMIN_EMAIL}. Set DEMO_ADMIN_PASSWORD in server/.env if you changed the admin password.`);
  });
  console.log('Signed in as admin. Loading demo data…');

  const mkUser = async (name, local, role, phone) => {
    const r = await api(admin, 'POST', '/users', { name, email: `${local}@${DOMAIN}`, password: PASSWORD, role, phone });
    await record('users', r.data.id);
    if (r.data.profile?.id) await record(r.data.profile.type === 'student' ? 'students' : 'faculty', r.data.profile.id);
    return r.data;
  };

  /* ---- people ---- */
  const trainers = [];
  for (const t of TRAINERS) {
    const u = await step(`trainer ${t.name}`, () => mkUser(t.name, t.email, 'faculty', t.phone));
    if (!u) continue;
    const [f] = await q('SELECT id FROM faculty WHERE user_id = ?', [u.id]);
    await step(`trainer profile ${t.name}`, () => api(admin, 'PUT', `/faculty/${f.id}`, {
      department: t.department, designation: t.designation, specialization: t.specialization,
      qualification: t.qualification, experience: t.experience, joined_at: day(-400 - t.experience * 20),
    }));
    trainers.push({ ...t, id: f.id, userId: u.id, token: await login(`${t.email}@${DOMAIN}`) });
  }
  for (const s of STAFF_ACCOUNTS) await step(`account ${s.name}`, () => mkUser(s.name, s.email, s.role, s.phone));

  /* ---- rooms ---- */
  const rooms = [];
  for (const r of ROOMS) {
    const out = await step(`room ${r.code}`, () => api(admin, 'POST', '/rooms', r));
    const [row] = await q('SELECT id FROM classrooms WHERE code = ?', [r.code]);
    if (out && row) { await record('classrooms', row.id); rooms.push({ ...r, id: row.id }); }
  }

  /* ---- courses, each with its first batch (clash checks run) ---- */
  const batches = [];
  for (const c of COURSES) {
    const b = c.batch;
    const trainer = trainers[b.trainer];
    const room = rooms[b.room];
    const out = await step(`course ${c.code}`, () => api(admin, 'POST', '/courses/full', {
      course: { code: c.code, title: c.title, department: c.department, duration: c.duration, fee: c.fee, credits: c.credits, description: c.description },
      batch: {
        code: b.code, name: b.name, faculty_id: trainer?.id, classroom_id: room?.id,
        start_time: b.start, end_time: b.end, days_of_week: b.days,
        start_date: day(b.started), end_date: day(b.started + b.weeks * 7), capacity: b.seats,
        timeline: `${b.start} – ${b.end}`,
      },
    }));
    const [course] = await q('SELECT id FROM courses WHERE code = ?', [c.code]);
    const [batch] = await q('SELECT id FROM batches WHERE code = ?', [b.code]);
    if (course) await record('courses', course.id);
    if (batch) {
      await record('batches', batch.id);
      batches.push({ ...b, id: batch.id, courseId: course.id, course: c, trainer, students: [] });
    }
    if (!out) continue;
  }

  /* ---- students (login + profile), enrolled into batches ---- */
  const students = [];
  const plan = [8, 6, 5, 3, 0];   // how many students per batch; a few more join classes by code later
  let n = 0;
  for (let bi = 0; bi < batches.length; bi += 1) {
    for (let k = 0; k < plan[bi]; k += 1) {
      const first = FIRST[n % FIRST.length];
      const last = LAST[(n * 7 + 3) % LAST.length];
      const name = `${first} ${last}`;
      const local = `${first}.${last}`.toLowerCase();
      n += 1;
      const u = await step(`student ${name}`, () => mkUser(name, local, 'student', `98${String(23000000 + n * 7919).slice(0, 8)}`));
      if (!u) continue;
      const [s] = await q('SELECT id FROM students WHERE user_id = ?', [u.id]);
      const b = batches[bi];
      await step(`student details ${name}`, () => api(admin, 'PUT', `/students/${s.id}`, {
        gender: /a$|i$|l$/.test(first) && !['Vishal', 'Harshal', 'Akash'].includes(first) ? 'female' : 'male',
        dob: day(-365 * (19 + (n % 6)) - n * 11),
        address: `${AREAS[n % AREAS.length]}, Pune`,
        qualification: QUAL[n % QUAL.length],
        guardian_name: `${['Sunil', 'Vijay', 'Ramesh', 'Prakash', 'Anil'][n % 5]} ${last}`,
        guardian_phone: `97${String(64000000 + n * 1777).slice(0, 8)}`,
        course_id: b.courseId, batch_id: b.id, admission_date: day(b.started - 5),
      }));
      await step(`enroll ${name}`, () => api(admin, 'POST', `/students/${s.id}/enroll`, { batch_id: b.id, enrolled_on: day(b.started) }));
      const st = { id: s.id, userId: u.id, name, email: `${local}@${DOMAIN}`, batch: b };
      b.students.push(st);
      students.push(st);
    }
  }
  for (const st of students) st.token = await step(`login ${st.name}`, () => login(st.email));

  /* ---- fees: a plan per course, assigned from the batch start, some paid ---- */
  const feePlans = {};
  for (const b of batches) {
    const out = await step(`fee plan ${b.course.code}`, () => api(admin, 'POST', '/fees/plans', {
      name: `${b.course.title} — 3 installments`, course_id: b.courseId, base_fee: b.course.fee,
      registration_fee: 1000, tax_pct: 18, installments: 3, interval_days: 30,
      late_fee_per_day: 50, late_fee_cap: 1000, grace_days: 5,
    }));
    const [row] = await q('SELECT id FROM fee_plans WHERE course_id = ? ORDER BY id DESC LIMIT 1', [b.courseId]);
    if (out && row) { await record('fee_plans', row.id); feePlans[b.id] = row.id; }
  }
  const modes = ['upi', 'cash', 'bank', 'card', 'upi', 'cheque'];
  for (const [i, st] of students.entries()) {
    if (!feePlans[st.batch.id]) continue;
    await step(`assign fees ${st.name}`, () => api(admin, 'POST', '/fees/assign', {
      student_id: st.id, plan_id: feePlans[st.batch.id], discount: i % 5 === 0 ? 1500 : 0, start_date: day(st.batch.started),
    }));
    const [inst] = await q(
      "SELECT amount FROM fee_installments WHERE student_id = ? ORDER BY due_date, seq LIMIT 1", [st.id]
    );
    if (!inst) continue;
    // Most pay the first installment; some pay two; a few have paid nothing yet.
    const pay = i % 6 === 5 ? 0 : i % 3 === 0 ? Number(inst.amount) * 2 : Number(inst.amount);
    if (pay > 0) {
      await step(`collect fee ${st.name}`, () => api(admin, 'POST', '/fees/collect', {
        student_id: st.id, amount: Math.round(pay), mode: modes[i % modes.length],
        reference_no: i % 2 ? `UPI${4102000 + i * 37}` : undefined, remarks: 'Demo payment',
      }));
    }
  }
  await step('overdue check', () => api(admin, 'POST', '/fees/sweep'));

  /* ---- expenses ---- */
  const EXPENSES = [
    ['rent', 'Shivajinagar premises — landlord', 65000, -40, 'bank'],
    ['utilities', 'MSEDCL electricity bill', 14250, -33, 'upi'],
    ['utilities', 'Broadband — 300 Mbps business plan', 4999, -30, 'upi'],
    ['salary', 'Trainer honorarium — previous month', 185000, -28, 'bank'],
    ['marketing', 'Instagram and Google ads', 22000, -20, 'card'],
    ['equipment', '5 desktop PCs for LAB-2', 212500, -18, 'bank'],
    ['courseware', 'Printed Tally Prime workbooks', 8400, -10, 'cash'],
    ['maintenance', 'AC servicing — both labs', 6800, -6, 'cash'],
  ];
  for (const [category, payee, amount, offset, mode] of EXPENSES) {
    const out = await step(`expense ${payee}`, () => api(admin, 'POST', '/fees/expenses', { category, payee, amount, spent_on: day(offset), mode, note: 'Demo entry' }));
    if (out?.data?.id) await record('expenses', out.data.id);
  }

  /* ---- attendance for the last four weeks, marked by each trainer ---- */
  for (const b of batches) {
    if (!b.trainer?.token || !b.students.length) continue;
    for (let off = Math.max(b.started, -28); off <= -1; off += 1) {
      const d = new Date(); d.setDate(d.getDate() + off);
      if (!b.days.includes(WEEKDAY[d.getDay()])) continue;
      const records = b.students.map((st, i) => ({
        studentId: st.id,
        // Most present; one student in each batch keeps missing classes so the risk flags have something to show.
        status: i === b.students.length - 1 && off % 2 === 0 ? 'absent' : (i + off) % 11 === 0 ? 'late' : (i + off) % 13 === 0 ? 'absent' : 'present',
      }));
      await step(`attendance ${b.code} ${day(off)}`, () => api(b.trainer.token, 'POST', '/attendance/bulk', { batchId: b.id, date: day(off), records }));
    }
  }

  /* ---- exams and marks ---- */
  for (const b of batches) {
    if (!b.students.length) continue;
    const out = await step(`exam ${b.code}`, () => api(admin, 'POST', '/exams', {
      title: `${b.course.title} — Unit Test 1`, batch_id: b.id, course_id: b.courseId,
      exam_date: day(-7), total_marks: 50, passing_marks: 20, type: 'written', status: 'completed',
    }));
    const examId = out?.data?.id;
    if (!examId) continue;
    await record('exams', examId);
    const marks = b.students.map((st, i) => ({ studentId: st.id, marks: [42, 35, 47, 18, 39, 44, 29, 33][i % 8] }));
    await step(`marks ${b.code}`, () => api(b.trainer.token, 'POST', '/results/upload', { examId, marks }));
  }

  /* ---- Classroom: topics, work, announcements, submissions, grades ---- */
  for (const b of batches.slice(0, 3)) {
    const T = b.trainer?.token;
    if (!T) continue;
    const topic = await step(`topic ${b.code}`, () => api(T, 'POST', `/classes/${b.id}/topics`, { name: 'Week 1 · Getting started' }));
    const topic2 = await step(`topic2 ${b.code}`, () => api(T, 'POST', `/classes/${b.id}/topics`, { name: 'Week 2 · Core concepts' }));
    if (topic?.data?.id) await record('class_topics', topic.data.id);
    if (topic2?.data?.id) await record('class_topics', topic2.data.id);
    const ann = await step(`announcement ${b.code}`, () => api(T, 'POST', `/classes/${b.id}/announcements`,
      { body: `Welcome to ${b.name}! Lab timings are ${b.start}–${b.end}. Please bring your laptop charger and keep your projects backed up on GitHub.` }, { form: true }));
    if (ann?.data?.id) await record('class_announcements', ann.data.id);

    const WORK = {
      'PY-101-MOR': [
        ['assignment', 'Write a number-guessing game', 20, -3, 1, 'Use a while loop, input() and random.randint. Turn in your .py file.'],
        ['question', 'What is the difference between a list and a tuple?', 5, 2, 1, ''],
        ['material', 'Python cheat sheet (PDF)', null, null, 0, 'Keep this open while you practise.'],
        ['assignment', 'Read a CSV and print the average marks', 25, 5, 2, 'Use the csv module. Handle a missing file gracefully.'],
      ],
      'FSWD-201-A': [
        ['assignment', 'Build a responsive portfolio page', 30, -2, 1, 'Semantic HTML, Flexbox and one media query. Submit a ZIP.'],
        ['question', 'Explain the CSS box model in your own words', 5, 3, 1, ''],
        ['assignment', 'To-do list in vanilla JavaScript', 30, 6, 2, 'Add, complete and delete tasks. Save them in localStorage.'],
      ],
      'JAVA-150-EVE': [
        ['assignment', 'Bank account class with deposit and withdraw', 20, -1, 1, 'Throw an exception when the balance would go negative.'],
        ['material', 'Collections framework notes', null, null, 2, 'ArrayList, HashMap and when to use which.'],
      ],
    }[b.code] || [];

    for (const [type, title, points, due, topicNo, instructions] of WORK) {
      const topicId = (topicNo === 1 ? topic : topicNo === 2 ? topic2 : null)?.data?.id;
      const w = await step(`classwork ${title}`, () => api(T, 'POST', `/classes/${b.id}/classwork`, {
        type, title, instructions, points: points ?? '', due_at: due === null ? '' : at(due, '23:00'), topic_id: topicId || '',
      }, { form: true }));
      const workId = w?.data?.id;
      if (!workId) continue;
      await record('course_materials', workId);
      if (type === 'material') continue;

      // Past-due work: most turned in, graded and returned; one student missing.
      // Upcoming work: a few early submissions, not graded yet.
      const past = due < 0;
      for (const [i, st] of b.students.entries()) {
        if (!st.token) continue;
        const turnsIn = past ? i !== b.students.length - 1 : i < 2;
        if (!turnsIn) continue;
        const note = type === 'question'
          ? ['A list is mutable and a tuple is not, so tuples can be dictionary keys.', 'Content, padding, border and margin — width counts only the content unless box-sizing is border-box.'][i % 2]
          : 'Done — code and screenshots are in the attached notes.';
        await step(`turn in ${st.name}`, () => api(st.token, 'POST', `/classes/${b.id}/classwork/${workId}/turn-in`, { note }, { form: true }));
      }
      if (past) {
        const returned = [];
        for (const [i, st] of b.students.entries()) {
          if (i === b.students.length - 1) continue;
          const grade = Math.max(0, points - ((i * 3) % 7));
          const g = await step(`grade ${st.name}`, () => api(T, 'PUT', `/classes/${b.id}/classwork/${workId}/grades/${st.id}`,
            { grade: String(grade), feedback: grade === points ? 'Excellent work.' : 'Good — see the comments on edge cases.' }));
          if (g && i < b.students.length - 2) returned.push(st.id);   // one stays as a draft grade
        }
        if (returned.length) await step(`return ${title}`, () => api(T, 'POST', `/classes/${b.id}/classwork/${workId}/return`, { student_ids: returned }));
      }
    }
    const firstStudent = b.students[0];
    if (ann?.data?.id && firstStudent?.token) {
      await step('class comment', () => api(firstStudent.token, 'POST', `/classes/${b.id}/comments`, { announcement_id: ann.data.id, body: 'Thank you! See you in the lab.' }));
    }
  }

  /* ---- enquiries, callbacks, follow-ups, conversions ---- */
  const LEADS = [
    ['Tanvi Apte', '9890011201', 'PY-101', 'hot', 'walk-in', 'B.Sc. final year'],
    ['Kunal Mahajan', '9890011202', 'FSWD-201', 'hot', 'website', 'BCA'],
    ['Riya Oak', '9890011203', 'DA-301', 'warm', 'Instagram', 'B.Com.'],
    ['Saurabh Nair', '9890011204', 'JAVA-150', 'warm', 'referral', 'Diploma in IT'],
    ['Ishita Bapat', '9890011205', 'TALLY-110', 'hot', 'walk-in', 'M.Com.'],
    ['Mayur Kshirsagar', '9890011206', 'FSWD-201', 'cold', 'Google ads', 'B.E. Civil'],
    ['Gauri Phadke', '9890011207', 'DA-301', 'warm', 'website', 'MBA Finance'],
    ['Ajinkya Holkar', '9890011208', 'PY-101', 'cold', 'college seminar', 'Twelfth, science'],
    ['Nupur Datar', '9890011209', 'TALLY-110', 'warm', 'referral', 'B.Com.'],
    ['Chinmay Gadgil', '9890011210', 'JAVA-150', 'hot', 'website', 'B.E. Computer'],
    ['Sonal Ingle', '9890011211', 'FSWD-201', 'warm', 'Instagram', 'BCA'],
    ['Hrishikesh Lele', '9890011212', 'DA-301', 'cold', 'walk-in', 'B.A. Economics'],
  ];
  const leadIds = [];
  for (const [i, [name, phone, code, temperature, source, qualification]] of LEADS.entries()) {
    const course = batches.find((b) => b.course.code === code);
    const out = await step(`enquiry ${name}`, () => api(admin, 'POST', '/enquiries', {
      name, phone, email: `${name.split(' ')[0].toLowerCase()}.${name.split(' ')[1].toLowerCase()}@${DOMAIN}`,
      course_id: course?.courseId, qualification, source, temperature,
      occupation: i % 3 === 0 ? 'Student' : i % 3 === 1 ? 'Working professional' : 'Job seeker',
    }));
    const [row] = await q('SELECT id FROM enquiries WHERE phone = ? ORDER BY id DESC LIMIT 1', [phone]);
    if (!out || !row) continue;
    await record('enquiries', row.id);
    leadIds.push({ id: row.id, name, temperature });
    if (i % 3 !== 2) {
      await step(`callback ${name}`, () => api(admin, 'POST', `/enquiries/${row.id}/callback`, {
        callback_at: `${day(i % 4)} ${['11:00', '15:30', '18:00', '10:15'][i % 4]}:00`, note: 'Wants to know batch timings and EMI options.',
      }));
    }
    if (i < 6) {
      const f = await step(`follow-up ${name}`, () => api(admin, 'POST', '/followups', {
        enquiry_id: row.id, note: ['Called — interested, asked for the fee structure on WhatsApp.', 'Visited the lab, will confirm after talking to parents.', 'Did not pick up, try in the evening.'][i % 3],
        followup_date: day(-(i % 3)), next_followup_date: day(2 + i), status: 'pending',
      }));
      if (f?.data?.id) await record('followups', f.data.id);
    }
  }
  for (const lead of leadIds.filter((l) => l.temperature === 'hot').slice(0, 2)) {
    const out = await step(`convert ${lead.name}`, () => api(admin, 'POST', `/enquiries/${lead.id}/convert`, {}));
    if (out) {
      const [s] = await q('SELECT s.id FROM students s JOIN enquiries e ON e.student_id = s.id WHERE e.id = ?', [lead.id]);
      if (s) await record('students', s.id);
      const [a] = await q('SELECT id FROM admissions WHERE student_id = ? ORDER BY id DESC LIMIT 1', [s?.id || 0]);
      if (a) await record('admissions', a.id);
    }
  }

  /* ---- admission applications waiting on a decision ---- */
  const APPS = [
    ['Devika Ranade', '9890011301', 'PY-101', 'pending', 'Documents to be submitted on Monday.'],
    ['Parth Limaye', '9890011302', 'FSWD-201', 'verified', 'Aadhaar and marksheet verified.'],
    ['Shreya Vaidya', '9890011303', 'DA-301', 'pending', ''],
    ['Onkar Bhide', '9890011304', 'JAVA-150', 'verified', 'Paid registration fee in cash.'],
  ];
  for (const [name, phone, code, status, remarks] of APPS) {
    const b = batches.find((x) => x.course.code === code);
    const out = await step(`admission ${name}`, () => api(admin, 'POST', '/admissions', {
      name, phone, email: `${name.split(' ')[0].toLowerCase()}.${name.split(' ')[1].toLowerCase()}@${DOMAIN}`,
      course_id: b?.courseId, batch_id: b?.id, status, remarks,
    }));
    const [row] = await q('SELECT id FROM admissions WHERE phone = ? ORDER BY id DESC LIMIT 1', [phone]);
    if (out && row) await record('admissions', row.id);
  }

  /* ---- library ---- */
  const BOOKS = [
    ['9789355420664', 'Python Crash Course', 'Eric Matthes', 'Programming', 5],
    ['9789390727179', 'Let Us C', 'Yashavant Kanetkar', 'Programming', 6],
    ['9789332555419', 'Head First Java', 'Kathy Sierra, Bert Bates', 'Programming', 4],
    ['9789355512307', 'Eloquent JavaScript', 'Marijn Haverbeke', 'Web Development', 3],
    ['9781118008188', 'HTML and CSS: Design and Build Websites', 'Jon Duckett', 'Web Development', 4],
    ['9789390691265', 'Learning SQL', 'Alan Beaulieu', 'Databases', 3],
    ['9789355420114', 'Storytelling with Data', 'Cole Nussbaumer Knaflic', 'Data Analytics', 2],
    ['9789354243004', 'Tally Prime with GST Made Simple', 'BPB Editorial Board', 'Accounts', 6],
    ['9780132350884', 'Clean Code', 'Robert C. Martin', 'Software Engineering', 2],
    ['9789332549449', 'Data Structures Through C', 'Yashavant Kanetkar', 'Programming', 3],
  ];
  const bookIds = [];
  for (const [isbn, title, author, category, copies] of BOOKS) {
    const out = await step(`book ${title}`, () => api(admin, 'POST', '/library/books', { isbn, title, author, category, total_copies: copies, available_copies: copies }));
    const [row] = await q('SELECT id FROM library_books WHERE isbn = ? ORDER BY id DESC LIMIT 1', [isbn]);
    if (out && row) { await record('library_books', row.id); bookIds.push(row.id); }
  }
  for (let i = 0; i < Math.min(6, students.length); i += 1) {
    await step(`issue book to ${students[i].name}`, () => api(admin, 'POST', '/library/issue', {
      book_id: bookIds[i % bookIds.length], student_id: students[i].id, due_date: day(i < 2 ? -2 : 10),
    }));
  }

  /* ---- inventory ---- */
  const ITEMS = [
    ['Dell OptiPlex desktop', 'IT-DSK-01', 'Computers', 42, 'pcs', 2],
    ['Epson projector', 'IT-PRJ-01', 'Electronics', 4, 'pcs', 1],
    ['Whiteboard markers (box of 10)', 'ST-MRK-10', 'Stationery', 18, 'boxes', 5],
    ['A4 paper ream', 'ST-A4-500', 'Stationery', 25, 'reams', 10],
    ['HDMI cable 3 m', 'IT-HDMI-3', 'Electronics', 9, 'pcs', 4],
    ['Wireless mouse', 'IT-MSE-01', 'Computers', 6, 'pcs', 8],
    ['First aid kit', 'SF-FAK-01', 'Safety', 3, 'kits', 2],
    ['Arduino Uno starter kit', 'LB-ARD-01', 'Lab', 12, 'kits', 5],
  ];
  for (const [i, [name, sku, category, quantity, unit, reorder]] of ITEMS.entries()) {
    const out = await step(`item ${name}`, () => api(admin, 'POST', '/inventory/items', { name, sku, category, quantity, unit, reorder_level: reorder, status: 'active' }));
    const [row] = await q('SELECT id FROM inventory_items WHERE sku = ? ORDER BY id DESC LIMIT 1', [sku]);
    if (!out || !row) continue;
    await record('inventory_items', row.id);
    if (i === 2) await step('stock out markers', () => api(admin, 'POST', `/inventory/items/${row.id}/stock`, { type: 'out', quantity: 14, note: 'Issued to classrooms' }));
    if (i === 3) await step('stock in paper', () => api(admin, 'POST', `/inventory/items/${row.id}/stock`, { type: 'in', quantity: 20, note: 'Monthly purchase' }));
  }

  /* ---- corporate partners (fictional companies) ---- */
  const PARTNERS = [
    ['Sahyadri Softech Pvt. Ltd.', 'hiring', 'Hinjewadi Phase 1, Pune', 'https://sahyadrisoftech.example'],
    ['Deccan Data Labs LLP', 'both', 'Baner Road, Pune', 'https://deccandatalabs.example'],
    ['Kaveri Infotech Solutions', 'training', 'Kharadi, Pune', 'https://kaveriinfotech.example'],
    ['Punecloud Services Pvt. Ltd.', 'hiring', 'Magarpatta City, Pune', 'https://punecloud.example'],
  ];
  const partnerIds = [];
  for (const [name, partner_type, address, website] of PARTNERS) {
    const out = await step(`partner ${name}`, () => api(admin, 'POST', '/partners', {
      name, partner_type, corp_address: address, corp_city: 'Pune', corp_state: 'Maharashtra', website, notes: 'Demo partner',
    }));
    const id = out?.data?.id;
    if (id) { await record('partners', id); partnerIds.push({ id, name }); }
  }

  /* ---- placements: skills, jobs, readiness, a pipeline ---- */
  const skillIds = {};
  for (const name of ['Python', 'SQL', 'JavaScript', 'React', 'Java', 'Excel', 'Communication']) {
    const out = await step(`skill ${name}`, () => api(trainers[0]?.token || admin, 'POST', '/trainer/skills', { name }));
    if (out?.data?.id) {
      skillIds[name] = out.data.id;
      if (out.message === 'Skill created.') await record('skills', out.data.id);
    }
  }
  const JOBS = [
    [0, 'Junior Python Developer', '3.6 LPA', 'Hinjewadi, Pune', 3, ['Python', 'SQL']],
    [3, 'Frontend Developer Trainee', '4.2 LPA', 'Magarpatta, Pune', 2, ['JavaScript', 'React']],
    [1, 'Data Analyst — Fresher', '4.0 LPA', 'Baner, Pune', 2, ['Excel', 'SQL']],
  ];
  const jobIds = [];
  for (const [pi, role, pkg, location, openings, skills] of JOBS) {
    const p = partnerIds[pi];
    const out = await step(`job ${role}`, () => api(admin, 'POST', '/placements/jobs', {
      company: p?.name || 'Sahyadri Softech Pvt. Ltd.', partner_id: p?.id, role, package: pkg, location, openings,
      jd: `${role}. Freshers welcome. Must be comfortable with ${skills.join(' and ')}.`,
      min_attendance_pct: 85, min_score_pct: 75, require_job_ready: 1, closes_on: day(30), status: 'open',
      skills: skills.filter((s) => skillIds[s]).map((s) => ({ skill_id: skillIds[s], is_mandatory: true, min_level: 'beginner' })),
    }));
    if (out?.data?.id) { await record('placement_jobs', out.data.id); jobIds.push(out.data.id); }
  }
  // The Python batch trainer benchmarks their students; the best two become Job-Ready.
  const py = batches[0];
  if (py?.trainer?.token) {
    for (const [i, st] of py.students.entries()) {
      await step(`evaluate ${st.name}`, () => api(py.trainer.token, 'POST', '/trainer/evaluate-student', {
        student_id: st.id, batch_id: py.id, type: 'lab_exam', title: 'Python lab exam', max_marks: 100,
        marks_obtained: [92, 81, 68, 77, 88, 59, 73, 64][i % 8], weight: 2, skill_id: skillIds.Python, verify: true, level: 'intermediate',
      }));
      if (i < 3) await step(`soft skills ${st.name}`, () => api(py.trainer.token, 'PATCH', `/trainer/soft-skill-clearance/${st.id}`, { cleared: true, batch_id: py.id, note: 'Presentable, communicates clearly.' }));
    }
  }
  if (jobIds[0] && py?.students.length) {
    for (const st of py.students.slice(0, 2)) {
      await step(`shortlist ${st.name}`, () => api(admin, 'POST', '/placements/shortlist', { job_id: jobIds[0], student_id: st.id }));
    }
  }

  /* ---- a few extra students join a class with its code ---- */
  const tally = batches[4];
  if (tally) {
    const [row] = await q('SELECT class_code FROM batches WHERE id = ?', [tally.id]);
    if (!row?.class_code) await step('class code', () => api(admin, 'GET', `/classes/${tally.id}`));
    const [again] = await q('SELECT class_code FROM batches WHERE id = ?', [tally.id]);
    for (const st of students.filter((s) => s.batch === batches[3]).slice(0, 2)) {
      if (st.token && again?.class_code) await step(`join class ${st.name}`, () => api(st.token, 'POST', '/classes/join', { code: again.class_code }));
    }
  }

  /* ---- report ---- */
  console.log('\nDemo data loaded:');
  for (const [table, c] of Object.entries(counts)) console.log(`  ${table.padEnd(22)} ${c}`);
  if (warnings.length) {
    console.log(`\n${warnings.length} step(s) did not complete:`);
    for (const w of warnings) console.log(`  - ${w}`);
  }
  console.log(`\nSign in with any demo account, password ${PASSWORD}:`);
  console.log(`  trainer     ${TRAINERS[0].email}@${DOMAIN}`);
  for (const s of STAFF_ACCOUNTS) console.log(`  ${s.role.padEnd(18)} ${s.email}@${DOMAIN}`);
  if (students[0]) console.log(`  student     ${students[0].email}`);
  console.log('\nRemove all of it with: npm run demo:clear');
}

/* ------------------------------------------------------------------ clear */

// Children before parents. Anything not listed is retried at the end until it
// goes or nothing more can be deleted (foreign keys decide the real order).
const CLEAR_ORDER = [
  'class_announcements', 'course_materials', 'class_topics', 'followups', 'admissions', 'enquiries',
  'exams', 'expenses', 'placement_jobs', 'skills', 'library_books', 'inventory_items', 'partners',
  'students', 'fee_plans', 'batches', 'courses', 'classrooms', 'faculty', 'users',
];

async function clear() {
  const [exists] = await q("SHOW TABLES LIKE 'demo_records'");
  if (!exists) { console.log('No demo data to remove.'); return; }

  let rows = await q('SELECT table_name, record_id FROM demo_records');
  if (!rows.length) { console.log('No demo data to remove.'); return; }
  const rank = (t) => { const i = CLEAR_ORDER.indexOf(t); return i === -1 ? CLEAR_ORDER.length : i; };

  const removed = {};
  for (let pass = 0; pass < 5 && rows.length; pass += 1) {
    const failed = [];
    rows.sort((a, b) => rank(a.table_name) - rank(b.table_name));
    for (const r of rows) {
      try {
        // Rows that hang off a demo row without cascading.
        if (r.table_name === 'students') {
          await q('DELETE FROM student_batches WHERE student_id = ?', [r.record_id]);
          await q('UPDATE enquiries SET student_id = NULL WHERE student_id = ?', [r.record_id]);
          await q('UPDATE admissions SET student_id = NULL WHERE student_id = ?', [r.record_id]);
        }
        if (r.table_name === 'batches') await q('DELETE FROM student_batches WHERE batch_id = ?', [r.record_id]);
        if (r.table_name === 'library_books') await q('DELETE FROM library_issues WHERE book_id = ?', [r.record_id]);
        if (r.table_name === 'placement_jobs') {
          await q('DELETE FROM job_skills WHERE job_id = ?', [r.record_id]).catch(() => {});
          await q('DELETE FROM placement_applications WHERE job_id = ?', [r.record_id]).catch(() => {});
        }
        if (r.table_name === 'fee_plans') await q('DELETE FROM fee_structures WHERE plan_id = ?', [r.record_id]).catch(() => {});
        await q(`DELETE FROM \`${r.table_name}\` WHERE id = ?`, [r.record_id]);
        await q('DELETE FROM demo_records WHERE table_name = ? AND record_id = ?', [r.table_name, r.record_id]);
        removed[r.table_name] = (removed[r.table_name] || 0) + 1;
      } catch (e) {
        failed.push({ ...r, error: e.code || e.message });
      }
    }
    rows = failed;
  }

  console.log('Demo data removed:');
  for (const [t, c] of Object.entries(removed)) console.log(`  ${t.padEnd(22)} ${c}`);
  if (rows.length) {
    console.log(`\n${rows.length} row(s) could not be removed:`);
    for (const r of rows) console.log(`  - ${r.table_name} #${r.record_id}: ${r.error}`);
  } else {
    await q('DROP TABLE demo_records');
  }
}

/* ------------------------------------------------------------------ main */

const mode = process.argv[2];
(mode === 'clear' ? clear() : mode === 'load' ? load() : Promise.reject(new Error('Usage: node scripts/demoData.js load|clear')))
  .then(() => pool.end())
  .catch(async (e) => {
    console.error(`\n${e.message}`);
    await pool.end().catch(() => {});
    process.exit(1);
  });
