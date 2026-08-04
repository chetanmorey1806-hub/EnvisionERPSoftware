# Admin Module — Architecture Specification

**Scope:** multi-branch configuration, role/permission administration for staff,
executive dashboard (revenue + enrollment), and system audit logs.

**Baseline:** the codebase already ships `users`, `roles`, `permissions`,
`role_permissions` and a `can()` permission middleware. This document specifies
what the Admin Module *adds* and the migrations required to get there.

---

## 1. Design decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | **Branch-scoped roles** via `user_roles(user_id, role_id, branch_id)` — replacing the single `users.role_id` | A user is frequently an Admin at one branch and Staff at another. A single role column cannot express this. |
| D2 | **Row-level branch scoping**: `branch_id` FK on every transactional table | Branch isolation must be enforced in the data layer, not by filtering in the UI. |
| D3 | **Append-only `audit_logs`** with JSON before/after snapshots | Auditability requires an immutable trail; never UPDATE or DELETE rows. |
| D4 | **Dashboard = live queries + nightly `daily_metrics` rollup** | Live aggregates are correct but O(table). A rollup keeps the exec dashboard fast as data grows. |
| D5 | **Permissions stay generated** (`<module>.<action>`) | Already implemented; adding a module auto-creates its permissions. |
| D6 | **`is_system` roles are immutable** | Prevents an admin locking everyone out by editing `super_admin`. |

---

## 2. Entity-Relationship logic

```
branches 1 ──< user_roles >── 1 roles 1 ──< role_permissions >── 1 permissions
                  │
                  └──> users

users     1 ──< audit_logs
branches  1 ──< audit_logs
branches  1 ──< branch_settings   (1:1 in practice)
branches  1 ──< daily_metrics
branches  1 ──< students / batches / admissions / fee_transactions / enquiries / inventory
```

Cardinalities:

- **branch ↔ user** — many-to-many, *through* `user_roles`. The junction carries
  the `role_id`, so the same user can hold different roles per branch.
- **role ↔ permission** — many-to-many via `role_permissions` (existing).
- **user → audit_logs** — one-to-many; `user_id` is nullable (`ON DELETE SET NULL`)
  so deleting a user never destroys the trail.
- **branch → transactional entities** — one-to-many; `branch_id` is `NOT NULL`
  on new rows and `RESTRICT` on delete (a branch with data cannot be deleted;
  it is deactivated instead).
- **branch → daily_metrics** — one-to-many, unique on `(branch_id, metric_date)`.

**Effective permissions of a user in a branch** =
`⋃ permissions` of every role granted to that user for that `branch_id`
(plus global roles where `branch_id IS NULL`, used for `super_admin`).

---

## 3. Schema (DDL)

### 3.1 Branches

```sql
CREATE TABLE branches (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code          VARCHAR(20)  NOT NULL,              -- 'BLR-01'
  name          VARCHAR(160) NOT NULL,
  address       VARCHAR(255),
  city          VARCHAR(80),
  state         VARCHAR(80),
  country       VARCHAR(80)  DEFAULT 'India',
  phone         VARCHAR(20),
  email         VARCHAR(160),
  timezone      VARCHAR(60)  NOT NULL DEFAULT 'Asia/Kolkata',
  currency      CHAR(3)      NOT NULL DEFAULT 'INR',
  is_head_office TINYINT(1)  NOT NULL DEFAULT 0,
  status        ENUM('active','inactive') NOT NULL DEFAULT 'active',
  opened_on     DATE,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_branches_code (code),
  KEY idx_branches_status (status)
) ENGINE=InnoDB;
```

### 3.2 Branch settings (per-branch configuration)

```sql
CREATE TABLE branch_settings (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_id           INT UNSIGNED NOT NULL,
  academic_year       VARCHAR(20),
  admission_prefix    VARCHAR(20)  DEFAULT 'ADM',   -- drives generated numbers
  receipt_prefix      VARCHAR(20)  DEFAULT 'RCPT',
  invoice_footer      VARCHAR(500),
  late_fee_percent    DECIMAL(5,2) DEFAULT 0.00,
  grace_period_days   INT          DEFAULT 0,
  working_days        JSON,                          -- ["mon","tue",...]
  logo                VARCHAR(255),
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_branch_settings (branch_id),
  CONSTRAINT fk_bs_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

### 3.3 Branch-scoped role assignment (replaces `users.role_id`)

```sql
CREATE TABLE user_roles (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  role_id     INT UNSIGNED NOT NULL,
  branch_id   INT UNSIGNED NULL,        -- NULL = global (super_admin)
  assigned_by INT UNSIGNED NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_role_branch (user_id, role_id, branch_id),
  KEY idx_ur_branch (branch_id),
  CONSTRAINT fk_ur_user   FOREIGN KEY (user_id)     REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_ur_role   FOREIGN KEY (role_id)     REFERENCES roles(id)    ON DELETE CASCADE,
  CONSTRAINT fk_ur_branch FOREIGN KEY (branch_id)   REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT fk_ur_by     FOREIGN KEY (assigned_by) REFERENCES users(id)    ON DELETE SET NULL
) ENGINE=InnoDB;
```

> `roles` / `permissions` / `role_permissions` are unchanged — they already exist.
> Add `roles.branch_scoped TINYINT(1) DEFAULT 1` so a role can be marked global-only.

### 3.4 Audit logs (append-only)

```sql
CREATE TABLE audit_logs (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NULL,                    -- NULL if actor deleted / system
  branch_id   INT UNSIGNED NULL,
  action      VARCHAR(40)  NOT NULL,                -- create|update|delete|login|export|permission_change
  entity_type VARCHAR(60)  NOT NULL,                -- 'student', 'role', 'fee_transaction'
  entity_id   VARCHAR(60)  NULL,
  summary     VARCHAR(255) NULL,                    -- human-readable line
  before_json JSON NULL,
  after_json  JSON NULL,
  ip_address  VARCHAR(45)  NULL,                    -- IPv6-safe
  user_agent  VARCHAR(255) NULL,
  status      ENUM('success','failure') NOT NULL DEFAULT 'success',
  created_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_audit_entity (entity_type, entity_id),
  KEY idx_audit_user_time (user_id, created_at),
  KEY idx_audit_branch_time (branch_id, created_at),
  KEY idx_audit_action_time (action, created_at),
  CONSTRAINT fk_audit_user   FOREIGN KEY (user_id)   REFERENCES users(id)    ON DELETE SET NULL,
  CONSTRAINT fk_audit_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
) ENGINE=InnoDB;
```

Constraints: the application layer must **never** issue `UPDATE`/`DELETE` on this
table. Enforce with a dedicated DB user lacking those grants, and archive by
partitioning on `created_at` (monthly) rather than deleting.

### 3.5 Executive dashboard rollup

```sql
CREATE TABLE daily_metrics (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_id          INT UNSIGNED NOT NULL,
  metric_date        DATE NOT NULL,
  students_enrolled  INT  NOT NULL DEFAULT 0,   -- new that day
  students_active    INT  NOT NULL DEFAULT 0,   -- snapshot
  admissions_created INT  NOT NULL DEFAULT 0,
  admissions_approved INT NOT NULL DEFAULT 0,
  enquiries_created  INT  NOT NULL DEFAULT 0,
  enquiries_converted INT NOT NULL DEFAULT 0,
  revenue_collected  DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  revenue_outstanding DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  attendance_percent DECIMAL(5,2)  NULL,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_metrics (branch_id, metric_date),
  KEY idx_metrics_date (metric_date),
  CONSTRAINT fk_dm_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

### 3.6 Migrations to existing tables

```sql
-- Branch scoping on transactional data
ALTER TABLE students         ADD COLUMN branch_id INT UNSIGNED NULL AFTER id,
  ADD CONSTRAINT fk_students_branch FOREIGN KEY (branch_id) REFERENCES branches(id);
-- repeat for: batches, admissions, enquiries, followups, fee_transactions,
--             fee_structures, attendance, exams, inventory_items, library_books,
--             certificates_issued, placement_jobs, staff, faculty

-- Roles: allow global (non-branch) roles
ALTER TABLE roles ADD COLUMN branch_scoped TINYINT(1) NOT NULL DEFAULT 1;

-- Users: retire the single-role columns once user_roles is backfilled
--   1. create default branch (head office)
--   2. INSERT INTO user_roles (user_id, role_id, branch_id)
--        SELECT id, role_id, <default_branch> FROM users WHERE role_id IS NOT NULL;
--   3. keep users.role as a denormalized cache OR drop both columns.
ALTER TABLE users ADD COLUMN default_branch_id INT UNSIGNED NULL;
```

Backfill order matters: create the head-office branch → set `branch_id` on
existing rows → populate `user_roles` → only then drop `users.role_id`.

---

## 4. System requirements

### 4.1 Functional

**Branch management**
- FR-1 Create/update/deactivate branches; a branch with dependent rows can be
  deactivated but never hard-deleted.
- FR-2 Exactly one branch flagged `is_head_office`.
- FR-3 Per-branch settings: academic year, number prefixes, late-fee policy,
  working days, timezone, currency.
- FR-4 Admin can switch the "active branch" context; all list endpoints then
  scope to it.

**Roles & permissions**
- FR-5 CRUD roles; `is_system` roles are read-only for name/deletion.
- FR-6 Assign/revoke permissions per role (already implemented).
- FR-7 Assign a user a role **per branch**; a user may hold multiple.
- FR-8 Effective permissions = union across the user's roles in the active branch.
- FR-9 Every permission change writes an `audit_logs` row of action
  `permission_change` including before/after grant sets.

**Executive dashboard**
- FR-10 KPIs: total/active students, new enrollments, revenue collected,
  outstanding dues, collection rate, enquiry conversion rate, attendance %.
- FR-11 Filters: date range, branch (or "all branches" for HO), course.
- FR-12 Trends: revenue and enrollment by month; branch-vs-branch comparison.
- FR-13 Consolidated view across branches for `super_admin` only.

**Audit logs**
- FR-14 Record actor, action, entity, before/after, IP, user-agent, timestamp.
- FR-15 Filter by user, branch, action, entity type, date range; server-side
  pagination.
- FR-16 Export to CSV (itself an audited `export` action).
- FR-17 Records are immutable and retained ≥ 24 months.

### 4.2 Non-functional

| ID | Requirement |
|---|---|
| NFR-1 | **Authorization is server-side.** Hiding UI is not access control; every endpoint asserts `can('<module>.<action>')` *and* branch scope. |
| NFR-2 | Dashboard summary responds < 500 ms p95 → served from `daily_metrics`; only "today" is computed live. |
| NFR-3 | Audit writes are asynchronous (fire-and-forget) and must never fail the business transaction. |
| NFR-4 | All list endpoints paginate (`page`, `limit ≤ 100`) and return `meta`. |
| NFR-5 | Money as `DECIMAL(14,2)`; never floats. Currency per branch. |
| NFR-6 | Timestamps stored UTC; rendered in the branch timezone. |
| NFR-7 | Mutating endpoints are idempotent where retried (payments keyed by `receipt_no`). |
| NFR-8 | Rate-limit auth endpoints (e.g. 10 attempts / 15 min / IP). |
| NFR-9 | Branch isolation verified by test: a user scoped to Branch A receives 403/empty for Branch B data. |
| NFR-10 | Nightly rollup job is idempotent (`INSERT … ON DUPLICATE KEY UPDATE`) and backfillable for a date range. |

### 4.3 Authorization model

```
canAccess(user, permission, branchId):
    if user has global role with permission        -> allow   (super_admin)
    if user_roles(user, branchId) grants permission-> allow
    else                                            -> 403
```

Every query on a scoped table appends `WHERE branch_id = :activeBranch`
(or `IN (:userBranches)` for multi-branch roles). This guard belongs in the
model/repository layer so no controller can forget it.

---

## 5. Core API endpoints

Base: `/api`. All require `Authorization: Bearer <token>`.
`X-Branch-Id` header (or `?branchId=`) selects the active branch context.

### Branches
| Method | Endpoint | Permission | Notes |
|---|---|---|---|
| GET | `/branches` | `branches.view` | list; `?status` |
| GET | `/branches/:id` | `branches.view` | |
| POST | `/branches` | `branches.create` | |
| PUT | `/branches/:id` | `branches.update` | |
| PATCH | `/branches/:id/status` | `branches.update` | activate / deactivate |
| GET | `/branches/:id/settings` | `settings.view` | |
| PUT | `/branches/:id/settings` | `settings.update` | |

### Roles & permissions
| Method | Endpoint | Permission |
|---|---|---|
| GET | `/roles` | `roles.view` |
| GET | `/roles/permissions` | `roles.view` |
| GET | `/roles/:id` | `roles.view` |
| POST | `/roles` | `roles.create` |
| PUT | `/roles/:id` | `roles.update` |
| PUT | `/roles/:id/permissions` | `roles.update` |
| DELETE | `/roles/:id` | `roles.delete` |

### Staff ↔ role ↔ branch assignment
| Method | Endpoint | Permission | Body |
|---|---|---|---|
| GET | `/users?branchId=` | `users.view` | list staff in a branch |
| GET | `/users/:id/roles` | `users.view` | roles grouped by branch |
| POST | `/users/:id/roles` | `users.update` | `{ roleId, branchId }` |
| DELETE | `/users/:id/roles/:assignmentId` | `users.update` | revoke |
| PATCH | `/users/:id/default-branch` | `users.update` | `{ branchId }` |
| GET | `/auth/me` | — | returns `branches[]` + effective `permissions[]` |

### Executive dashboard
| Method | Endpoint | Permission | Query |
|---|---|---|---|
| GET | `/dashboard/summary` | `dashboard.view` | `from`, `to`, `branchId\|all` |
| GET | `/dashboard/revenue` | `dashboard.view` | monthly collected vs outstanding |
| GET | `/dashboard/enrollment` | `dashboard.view` | monthly new students, by course |
| GET | `/dashboard/branches` | `dashboard.view` | branch comparison (HO only) |
| GET | `/dashboard/activity` | `dashboard.view` | recent cross-module events |
| GET | `/dashboard/export` | `reports.export` | CSV/XLSX; audited |

### Audit logs
| Method | Endpoint | Permission | Query |
|---|---|---|---|
| GET | `/audit-logs` | `audit.view` | `userId, branchId, action, entityType, from, to, page, limit` |
| GET | `/audit-logs/:id` | `audit.view` | full before/after diff |
| GET | `/audit-logs/entity/:type/:id` | `audit.view` | history of one record |
| GET | `/audit-logs/export` | `audit.export` | CSV; writes its own audit row |

New permission modules to add to the generator matrix:
`branches: [view, create, update]`, `audit: [view, export]`.

---

## 6. Implementation notes

1. **Audit middleware** — wrap mutating routes; capture `before` via a read,
   `after` from the response, and enqueue the write. Never `await` it in the
   request path.
2. **Branch guard** — a `resolveBranch` middleware sets `req.branchId` from the
   header, validates the user is assigned to it, and the repository layer
   injects `branch_id` into every query.
3. **Rollup job** — cron at 00:15 branch-local: upsert yesterday's
   `daily_metrics` per branch; expose a manual `POST /admin/metrics/rebuild`
   with a date range for backfills.
4. **Migration safety** — ship `branch_id` as nullable, backfill, then set
   `NOT NULL`. Never add a `NOT NULL` FK to a populated table in one step.
