# Envision ERP — Database Reference

- **Engine**: MySQL 8 (InnoDB, `utf8mb4_unicode_ci`)
- **Database**: `envision_erp`
- **Schema file**: [`database/envision_erp.sql`](../database/envision_erp.sql)
- **Sample data**: [`database/seed.sql`](../database/seed.sql)

## Setup

```bash
cd server
npm run db:setup    # creates the database + all tables, seeds a super-admin
npm run db:seed     # (optional) loads sample data — idempotent
```

`db:setup` runs the schema then inserts the default admin with a bcrypt-hashed
password (`admin@envision.local` / `Admin@123`, overridable via
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).

## Tables

| Table | Purpose | Key relationships |
|---|---|---|
| `users` | Identity & access (login) | — |
| `courses` | Course catalog | referenced by batches, students, admissions, exams |
| `faculty` | Teaching staff | referenced by batches |
| `staff` | Non-teaching staff (JSON `permissions`) | — |
| `batches` | Cohorts | → `courses`, `faculty` (ON DELETE SET NULL) |
| `students` | Enrolled students | → `courses`, `batches` (SET NULL) |
| `admissions` | Applications (pending→approved) | → `courses`; approval creates a `students` row |
| `enquiries` | Leads | — |
| `followups` | Enquiry follow-up log | → `enquiries` (CASCADE) |
| `fee_structures` | Per-student fee plan (unique student) | → `students` (CASCADE) |
| `fee_transactions` | Payments (unique `receipt_no`) | → `students` (CASCADE) |
| `attendance` | Daily marks (unique batch+student+date) | → `batches`, `students` (CASCADE) |
| `exams` | Exam schedule | → `batches` (SET NULL) |
| `marks` | Exam results (unique exam+student) | → `exams`, `students` (CASCADE) |
| `certificate_templates` | Certificate types | — |
| `certificates_issued` | Issued certs (unique number) | → `students`, `certificate_templates` |
| `placement_jobs` | Job postings | — |
| `placement_applications` | Applications (unique job+student) | → `placement_jobs`, `students` (CASCADE) |
| `library_books` | Catalog (tracks available copies) | — |
| `library_issues` | Issue/return records | → `library_books`, `students` (CASCADE) |
| `inventory_suppliers` | Suppliers | — |
| `inventory_items` | Stock items (unique `sku`) | → `inventory_suppliers` (SET NULL) |
| `inventory_transactions` | Stock in/out ledger | → `inventory_items` (CASCADE) |
| `institution_settings` | Single-row institution profile | — |
| `backup_logs` | Backup history | — |

## Selected columns

### `users`
`id, name, email (unique), password (bcrypt), role ENUM(super_admin|admin|faculty|staff|student), phone, avatar, status ENUM(active|inactive|suspended), last_login_at, reset_token, reset_token_expires, created_at, updated_at`

### `students`
`id, admission_no (unique), name, email, phone, dob, gender, address, course_id → courses, batch_id → batches, avatar, status ENUM(active|inactive|graduated|dropped), admission_date, created_at, updated_at`

### `fee_transactions`
`id, student_id → students, amount DECIMAL(12,2), mode ENUM(cash|card|upi|bank|cheque), reference_no, receipt_no (unique), remarks, paid_at`

> The full column definitions, indexes and foreign keys live in
> [`database/envision_erp.sql`](../database/envision_erp.sql).

## Notes

- Deleting a course/faculty/batch **nulls** the reference on dependent rows
  (students/batches stay); deleting a student/enquiry/book **cascades** to its
  child records (fees, attendance, follow-ups, issues).
- Money is stored as `DECIMAL(12,2)`; the pool uses `dateStrings: true`, so date
  columns come back as `'YYYY-MM-DD'` / `'YYYY-MM-DD HH:MM:SS'` strings.
