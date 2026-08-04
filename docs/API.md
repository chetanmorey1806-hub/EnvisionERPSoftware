# Envision ERP — API Reference

Base URL: `http://localhost:5000/api`

## Conventions

- **Auth**: send `Authorization: Bearer <token>` on all protected routes. Obtain the token from `POST /auth/login`.
- **Success**: `{ "success": true, "message": "...", ...payload }` — auth returns `token` + `user` at the top level; list/detail routes return a `data` field.
- **Error**: `{ "success": false, "message": "...", "errors"?: [{ "field", "message" }] }`.
- **Validation** failures return HTTP `422` with an `errors` array.
- **Status codes**: `200` OK, `201` Created, `400` Bad request, `401` Unauthenticated, `403` Forbidden, `404` Not found, `409` Conflict, `422` Validation, `500` Server, `503` DB unavailable.

Seeded admin (after `npm run db:setup`): `admin@envision.local` / `Admin@123`.

---

## Auth — `/auth`

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/auth/register` | – | `{ name, email, password, role? }` | role ∈ staff\|student\|faculty |
| POST | `/auth/login` | – | `{ email, password }` | → `{ token, user }` |
| GET  | `/auth/me` | ✔ | – | current user from token |
| POST | `/auth/forgot-password` | – | `{ email }` | emails/logs a reset link |
| POST | `/auth/reset-password` | – | `{ token, password }` | |
| POST | `/auth/verify-otp` | – | – | 501 (not enabled yet) |

## Users — `/users` _(admin/super_admin only)_

| Method | Path | Body |
|---|---|---|
| GET | `/users` | – |
| GET | `/users/:id` | – |
| POST | `/users` | `{ name, email, password, role?, phone? }` |
| PUT | `/users/:id` | `{ name?, email?, role?, status?, phone? }` |
| DELETE | `/users/:id` | – (cannot delete self) |

## Students — `/students`

| Method | Path | Body / Query |
|---|---|---|
| GET | `/students` | `?search&status&batchId&courseId` |
| GET | `/students/:id` | – |
| POST | `/students` | `{ name*, email?, phone?, gender?, course_id?, batch_id? }` (auto `admission_no`) |
| PUT | `/students/:id` | partial |
| DELETE | `/students/:id` | – |
| POST | `/students/:id/upload-avatar` | multipart, field `avatar` (image) |

## Courses — `/courses`

`GET /courses` · `GET /courses/:id` · `POST /courses` `{ code*, title*, credits?, department?, fee? }` · `PUT /courses/:id` · `DELETE /courses/:id`

## Batches — `/batches`

`GET /batches` (with course/faculty names + student_count) · `GET /batches/:id` · `POST /batches` `{ code*, name*, course_id?, faculty_id?, capacity? }` · `PUT /batches/:id` · `POST /batches/:id/assign-faculty` `{ facultyId* }`

## Faculty — `/faculty`

`GET /faculty` · `GET /faculty/:id` · `POST /faculty` `{ name*, email?, department?, ... }` · `PUT /faculty/:id` · `POST /faculty/:id/schedule` `{ ...schedule }`

## Staff — `/staff`

`GET /staff` · `GET /staff/:id` · `POST /staff` `{ name*, ... }` · `PUT /staff/:id` · `PATCH /staff/:id/permissions` `{ permissions: [] }`

## Admissions — `/admissions`

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/admissions` | `?status` | with course name |
| GET | `/admissions/:id` | – | |
| POST | `/admissions` | `{ name*, email?, phone?, course_id?, batch_id? }` | |
| PATCH | `/admissions/:id/status` | `{ status, remarks? }` | `approved` auto-creates a student |
| POST | `/admissions/:id/verify-docs` | – | marks docs verified |

## Enquiries — `/enquiries`

`GET /enquiries` `?status` · `GET /enquiries/:id` · `POST /enquiries` `{ name*, ... }` · `PUT /enquiries/:id` · `POST /enquiries/:id/convert` (→ creates an admission)

## Follow-ups — `/followups`

`GET /followups/pending` · `GET /followups/enquiry/:enquiryId` · `POST /followups` `{ enquiry_id*, note?, followup_date?, next_followup_date? }`

## Fees — `/fees`

| Method | Path | Body / Notes |
|---|---|---|
| GET | `/fees/student/:studentId` | structure (payable/paid/due) + transactions |
| POST | `/fees/collect` | `{ student_id*, amount*, mode?, reference_no?, remarks? }` → auto receipt no |
| GET | `/fees/transactions` | `?studentId` |
| GET | `/fees/receipt/:txId` | downloadable text receipt |

## Attendance — `/attendance`

`GET /attendance?batchId&date` (register) · `POST /attendance/bulk` `{ batchId, date, records:[{ studentId, status }] }` (upsert) · `GET /attendance/student/:studentId` (summary + %)

## Exams — `/exams`

`GET /exams` `?batchId&status` · `POST /exams` `{ title*, batch_id?, exam_date?, total_marks? }` · `PUT /exams/:id` · `GET /exams/:examId/hall-ticket/:studentId`

## Results — `/results`

`GET /results/batch/:batchId/exam/:examId` · `POST /results/upload` `{ examId, marks:[{ studentId, marks, grade? }] }` (auto-grades, upsert) · `GET /results/student/:studentId` (report card)

## Certificates — `/certificates`

`GET /certificates/templates` · `POST /certificates/issue` `{ student_id*, template_id?, remarks? }` (auto certificate number) · `GET /certificates/verify/:certificateNumber` **(public)**

## Placements — `/placements`

`GET /placements/jobs` · `POST /placements/jobs` `{ company*, role*, package?, location? }` · `POST /placements/apply` `{ job_id*, student_id* }` · `GET /placements/metrics`

## Library — `/library`

`GET /library/books?search&category` · `POST /library/books` `{ title*, author?, total_copies? }` · `POST /library/issue` `{ book_id*, student_id*, due_date? }` · `POST /library/return/:issueId`

## Inventory — `/inventory`

`GET /inventory/items` · `POST /inventory/items` `{ name*, sku?, quantity? }` · `POST /inventory/items/:itemId/stock` `{ type: 'in'|'out', quantity }` · `GET /inventory/suppliers` · `POST /inventory/suppliers` `{ name* }`

## Reports — `/reports`

`GET /reports/finance?range` · `GET /reports/enrollment` · `GET /reports/export/:type?format=csv` (`type` ∈ students\|courses\|fees, returns CSV)

## Settings — `/settings`

`GET /settings/profile` · `PUT /settings/profile` `{ name?, address?, phone?, email?, academic_year?, currency?, timezone? }` · `GET /settings/backups` · `POST /settings/backups/trigger`

## Notifications — `/notifications`

`GET /notifications` (list + `unread` count) · `GET /notifications/unread-count` · `GET /notifications/presence` (online users) · `PATCH /notifications/:id/read` · `PATCH /notifications/read-all`

### Real-time (Socket.IO)

Connect to the API origin (same host/port, no `/api`) with the JWT token:

```js
import { io } from 'socket.io-client';
const socket = io('http://localhost:5000', { auth: { token } });
socket.on('notification:new', (n) => { /* live notification */ });
socket.on('presence:update', (p) => { /* { onlineUsers, userIds } */ });
```

- Each connection joins rooms `user:<id>` and `role:<role>`.
- The server emits `notification:new` when domain events occur — a **fee is
  collected**, an **admission is submitted**, or an **enquiry is created** —
  fanned out to all admins.
- `presence:update` broadcasts whenever a user connects/disconnects.

## Health

`GET /api/health` → `{ success, message, db: 'connected'|'disconnected' }`

---

### Example

```bash
# 1) login
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@envision.local","password":"Admin@123"}' | jq -r .token)

# 2) create a course
curl -s -X POST http://localhost:5000/api/courses \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"code":"CS-101","title":"Intro to CS","credits":4,"fee":25000}'
```
