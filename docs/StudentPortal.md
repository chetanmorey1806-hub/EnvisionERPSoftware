# Student Portal — Functional & UX Specification

**Audience:** learners (16–35), often on a phone, often on a poor connection, with
no ERP vocabulary. They open this to answer four questions:

> *Am I short on attendance? What do I owe? Where's my assignment? Is my certificate ready?*

The portal must answer all four **above the fold, in under three seconds.**

---

## 0. Two blocking gaps (must be fixed before any UI ships)

| # | Gap | Consequence |
|---|---|---|
| G1 | `students` has **no `user_id`** and there are **0 accounts with `role='student'`** | No student can log in at all. |
| G2 | The `student` role holds **module-level** permissions (`fees.view`, `attendance.view`, `results.view`) | On today's endpoints (`GET /fees/transactions`, `GET /attendance/student/:id`) a logged-in student could read **every other student's** fees and attendance. |

**G2 is a data-breach class defect, not a UI concern.** Module permissions answer
*"may this role touch the fees module?"* They do not answer *"is this row yours?"*

**Resolution:** the portal is served from **self-scoped `/api/students/me/*`
endpoints** that derive `student_id` from the JWT — exactly the pattern already
used by the Instructor Portal (`/faculty/me/*`). The client **never** sends a
student id, so there is no id to tamper with. `GET /students/:id` remains
staff-only.

---

## 1. Design principles

| # | Principle | Why it matters for learners |
|---|---|---|
| P1 | **One number per card.** Each card answers exactly one question. | A learner scanning on a bus cannot parse a dense table. |
| P2 | **Plain language.** "Fees due", not "Outstanding receivables". "Classes attended", not "Attendance register". | ERP vocabulary is staff vocabulary. |
| P3 | **Never encode meaning in colour alone.** Every status = colour **+ icon + text**. | WCAG 1.4.1; ~1 in 12 men have CVD. |
| P4 | **Progressive disclosure.** Dashboard shows totals; detail lives one tap away. | Reduces the first screen to four decisions. |
| P5 | **Show the gap, not just the number.** Not "72%" but "72% — attend 3 more classes to reach 75%". | A number without a next action is anxiety, not information. |
| P6 | **Never show a raw error.** Every failure has a plain-language message and a retry. | |
| P7 | **Read-only by default.** The only write actions are *download* and *pay*. | Removes an entire class of mistakes. |

---

## 2. Information architecture

```
/portal                     Dashboard (home)
  ├── /portal/attendance    Attendance detail — per batch, per day
  ├── /portal/assignments   Assignments & course materials (download)
  ├── /portal/fees          Payment history + pending dues + receipts
  └── /portal/certificate   Digital certificate (locked until completion)
```

**Navigation**
- **Mobile (< 768px):** fixed **bottom tab bar**, 4 tabs + Home. Thumb-reachable.
  Labels always visible (icon-only navigation fails first-time users).
- **Desktop (≥ 768px):** existing left sidebar, filtered to these five items.
- No nested menus. Maximum depth: 2.

---

## 3. Screens & functional requirements

### 3.1 Dashboard (home)

Four cards, in this order — ordered by *urgency to the learner*, not by module:

| Card | Primary value | Secondary | Tap target |
|---|---|---|---|
| **Attendance** | `72%` | "Attend 3 more classes to reach 75%" | → attendance |
| **Fees due** | `₹12,000` | "Next installment due 15 Jul (in 6 days)" | → fees |
| **Assignments** | `2 pending` | "Lab 1 — Arrays · due 20 Jul" | → assignments |
| **Certificate** | `Locked` / `Ready` | "Complete your course to unlock" | → certificate |

- **FR-1.1** Cards render from a **single** `GET /students/me/dashboard` call.
  No card may issue its own request (four spinners on a 3G phone is a failure).
- **FR-1.2** Above the cards: greeting + student name + **student UID**
  (`ENV/2026/CS-101/0002`) + course + batch. The UID is the one thing staff will
  ask them for; make it copyable with one tap.
- **FR-1.3** Attendance card colour thresholds: `≥ 75%` emerald ✓, `65–74%` amber ⚠,
  `< 65%` rose ✕. Threshold is configurable per institute, **not hard-coded**.
- **FR-1.4** If dues = 0 → card reads "All clear ✓" in emerald, not "₹0".
- **FR-1.5** Skeleton loaders, never a blank screen or a full-page spinner.

### 3.2 Attendance detail

- **FR-2.1** Header: overall %, "X of Y classes attended", and the shortfall
  sentence from P5.
- **FR-2.2** A horizontal progress bar with a **marker at the 75% threshold**, so
  the learner sees where they stand relative to the requirement.
- **FR-2.3** Per-batch breakdown (a student may hold concurrent enrollments):
  batch name, %, attended/total.
- **FR-2.4** Recent 30 days as a list: date, batch, status pill
  (`Present ✓` / `Absent ✕` / `Late ⏱` / `Leave —`). Icon **and** word, per P3.
- **FR-2.5** Empty state: "No classes recorded yet." Never `0%` — a new student is
  not a defaulter.

### 3.3 Assignments & materials

- **FR-3.1** List `course_materials` for the student's **enrolled** batches only.
- **FR-3.2** Group by type with clear icons: 🧪 Lab · 📝 Assignment · 📄 Material.
- **FR-3.3** Each row: title, batch, file name + size, due date, **Download**.
- **FR-3.4** Due-date states: `Due in 3 days` (neutral) · `Due tomorrow` (amber) ·
  `Overdue` (rose ✕). Materials with no due date show no date chip.
- **FR-3.5** Download streams via a **signed, short-lived URL**; a student may not
  fetch `/uploads/...` for a batch they are not enrolled in (see §7).
- **FR-3.6** Show file size **before** download — data is expensive on mobile.
- **FR-3.7** Empty state: "No assignments yet. Your instructor will post them here."

### 3.4 Fees — history & pending dues

- **FR-4.1** Top: **Total due** (large), **Total paid**, and a payment-progress bar.
- **FR-4.2** **Pending dues** listed first, as installments: amount, due date,
  status (`Due in 6 days` / `Overdue by 4 days` + accrued late fee, if any).
- **FR-4.3** **Payment history** below: date, amount, method, receipt no,
  **Download receipt (PDF)**.
- **FR-4.4** Amounts render as `₹12,000` (Indian grouping, `toLocaleString('en-IN')`).
  Never `12000.00`.
- **FR-4.5** Late fees are shown as their **own line item** with the reason —
  never silently folded into the amount. Surprise charges destroy trust.
- **FR-4.6** Read-only. Online payment is out of scope for v1; show
  "Pay at the front desk" with the branch phone number.
- **FR-4.7** Empty state: "No payments recorded yet."

### 3.5 Digital certificate

Three mutually exclusive states — the whole screen is a state machine:

| State | Condition | UI |
|---|---|---|
| **Locked** | `student.status = 'active'` | Greyed certificate illustration + progress ("You're 60% through the course") + "Complete your course to unlock." |
| **Pending** | `status = 'completed'`, no certificate issued | "🎉 Course complete! Your certificate is being prepared — you'll be notified." |
| **Ready** | certificate row exists, `status='issued'` | Certificate preview, number, issue date, **Download PDF**, **Verify** link + QR. |

- **FR-5.1** The **Verify** link points at the public
  `GET /certificates/verify/:certificateNumber` endpoint that already exists.
  A student sharing their certificate with an employer is the core value here.
- **FR-5.2** A `revoked` certificate must **never** render as Ready.
- **FR-5.3** Real-time: when the certificate is issued, push `notification:new`
  over the existing socket and flip the card to **Ready** without a refresh.

---

## 4. Component & state specification

Every data-bearing component implements **four** states. A component that only
handles the happy path is not done.

| State | Requirement |
|---|---|
| **Loading** | Skeleton matching the final layout's shape (no layout shift, CLS ≈ 0). |
| **Empty** | Illustration + one plain sentence + (where useful) a next action. |
| **Error** | "We couldn't load your attendance." + **Retry** button. Never an HTTP code or stack trace. |
| **Offline** | Banner: "You're offline. Showing your last update from 10:32." Serve the cached payload. |

**Cards** (`StatCard`): label (uppercase, 11px, grey) · value (24px, black weight)
· sub-line (11px) · optional icon · whole card is one tap target.

**Status pills:** `rounded-full`, 10px bold uppercase, always `icon + word`.

---

## 5. Responsive & accessibility

- **Mobile-first.** Single column < 640px; `sm:grid-cols-2`; `lg:grid-cols-4`.
- **Tap targets ≥ 44 × 44 px** (WCAG 2.5.5). The download button is a button, not
  a 12px text link.
- **Contrast ≥ 4.5:1** for text, ≥ 3:1 for UI boundaries. Verify amber-on-white —
  `amber-500` on white fails; use `amber-700` for text.
- **Focus visible** on every interactive element; full keyboard traversal.
- **Screen readers:** `aria-label` on icon-only controls; attendance % announced as
  "Attendance 72 percent, below the 75 percent requirement".
- **Wide content** (payment table) scrolls inside its own `overflow-x-auto`; the
  page body never scrolls sideways.
- **Dark mode** honoured (the app already ships a class-based dark theme).
- **Respect `prefers-reduced-motion`** — disable the progress-bar animation.

---

## 6. Data contracts

### `GET /api/students/me/dashboard` — one call, whole home screen

```json
{
  "success": true,
  "data": {
    "student": {
      "id": 6,
      "name": "Anita Verma",
      "student_uid": "ENV/2026/CS-101/0002",
      "course_name": "Full-Stack Web Development",
      "batch_name": "Morning A",
      "status": "active",
      "avatar": null
    },
    "attendance": {
      "percentage": 72,
      "attended": 18,
      "total": 25,
      "required_percentage": 75,
      "classes_needed": 3
    },
    "fees": {
      "total_payable": 45000.00,
      "total_paid": 33000.00,
      "total_due": 12000.00,
      "next_due_date": "2026-07-15",
      "days_until_due": 6,
      "is_overdue": false
    },
    "assignments": {
      "pending": 2,
      "next": { "id": 4, "title": "Lab 1 — Arrays", "type": "lab", "due_date": "2026-07-20" }
    },
    "certificate": { "state": "locked", "progress_percent": 60 }
  }
}
```

### `GET /api/students/me/attendance`

```json
{ "data": {
  "overall": { "percentage": 72, "attended": 18, "total": 25 },
  "by_batch": [ { "batch_id": 3, "batch_name": "Morning A", "attended": 18, "total": 25, "percentage": 72 } ],
  "recent": [ { "date": "2026-07-09", "batch_name": "Morning A", "status": "present" } ]
}}
```

### `GET /api/students/me/assignments`

```json
{ "data": [ {
  "id": 4, "title": "Lab 1 — Arrays", "type": "lab",
  "batch_name": "Morning A", "file_name": "lab1.pdf", "size_kb": 148,
  "due_date": "2026-07-20", "download_url": "/api/students/me/assignments/4/download"
} ] }
```

### `GET /api/students/me/fees`

```json
{ "data": {
  "summary": { "payable": 45000.00, "paid": 33000.00, "due": 12000.00 },
  "pending": [ { "invoice_no": "INV/2026/000123", "amount": 12000.00,
                 "due_date": "2026-07-15", "days_overdue": 0, "late_fee": 0.00 } ],
  "history": [ { "receipt_no": "RCPT-20260708-FFEA", "amount": 20000.00,
                 "method": "upi", "paid_at": "2026-07-08 19:23:05",
                 "receipt_url": "/api/students/me/fees/receipt/1" } ]
}}
```

### `GET /api/students/me/certificate`

```json
{ "data": {
  "state": "ready",
  "certificate_number": "ENV-CERT-20260708-8EC207",
  "issued_date": "2026-07-08",
  "download_url": "/api/students/me/certificate/download",
  "verify_url": "/api/certificates/verify/ENV-CERT-20260708-8EC207"
}}
```

---

## 7. Backend work required

1. **`students.user_id`** (`INT UNSIGNED NULL UNIQUE`, FK → `users`), mirroring
   `faculty.user_id`. Plus an account-provisioning step at admission
   (auto-create the `users` row with `role='student'`, email invite).
2. **`resolveStudent(req)`** middleware: JWT `sub` → `students` row, else `403
   "No student profile is linked to this account."`
3. **`/api/students/me/*` router**, mounted **before** `/:id` (or `me` matches as
   an id — the same trap the faculty router had).
4. **Signed download URLs.** `/uploads/**` is currently served as *unauthenticated
   static files* — anyone with a URL can read any student's ID proof. Move
   student-facing downloads behind an authorized streaming endpoint that checks
   enrollment before piping the file.
5. **Ownership, not role, is the authorization rule.** Every query in this module
   is `WHERE student_id = :me`. Never accept a student id from the client.
6. **Rate-limit** the public certificate-verify endpoint.

---

## 8. Acceptance criteria

- [ ] A student logs in and reaches the dashboard in **one** network round-trip.
- [ ] Student A **cannot** read Student B's attendance, fees, assignments or
      certificate — verified by an automated test asserting `403`/empty, not by
      the absence of a link in the UI.
- [ ] Attendance below threshold states the exact number of classes needed.
- [ ] A locked certificate cannot be downloaded by guessing the URL.
- [ ] Every screen renders correctly at **320 px** width.
- [ ] Every card has loading / empty / error states.
- [ ] Lighthouse: Accessibility ≥ 95, contrast passes at AA.
- [ ] A revoked certificate never renders as "Ready".

---

## 9. Out of scope for v1

Online fee payment, assignment **submission** (upload), chat with instructors,
timetable sync, push notifications. Each is a separate spec — v1 is read-only by
design (P7), which keeps the trust surface small while the ledger and RBAC
scoping mature.
