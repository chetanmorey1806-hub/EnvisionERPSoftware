# Fee & Invoicing Ledger — Design & Security Specification

**Roles:** Accountant / Finance Manager
**Scope:** payment plans (one-time vs installments), automatic late fees, discount
coupons, printable PDF receipts, and the controls that make transaction history
tamper-evident.

---

## 0. What exists today, and why it must change

```
fee_structures  (student_id, total_amount, discount)
fee_transactions(student_id, amount, mode, reference_no, receipt_no, remarks, paid_at)
```

Three defects make this unsuitable for money:

| # | Defect | Consequence |
|---|---|---|
| 1 | `fee_transactions` rows are **mutable** — the app's DB user holds `UPDATE`/`DELETE` | An insider can rewrite a ₹50,000 payment to ₹5,000 leaving no trace |
| 2 | There is **no invoice** — a payment points at a student, not at an obligation | Cannot answer "what is owed, for what, and when is it due" |
| 3 | `discount` is a bare column on the structure | No coupon identity, no validity window, no redemption audit |

The design below replaces this with an **append-only, hash-chained ledger**.

---

## 1. Design principles

| # | Principle | Rationale |
|---|---|---|
| P1 | **The ledger is append-only.** Nothing is ever updated or deleted. | An audit trail the application can rewrite is not an audit trail. |
| P2 | **Corrections are reversals**, never edits. A wrong entry is neutralised by an equal-and-opposite entry. | Preserves history; matches how accountants actually work. |
| P3 | **Money is `DECIMAL(14,2)`, never `FLOAT`/`DOUBLE`.** | Binary floats cannot represent 0.10 exactly; DECIMAL is exact in MySQL. |
| P4 | **The server is the sole authority on amounts.** The client never sends "amount due" or "discount"; it sends an invoice id + coupon code and the server recomputes. | Prevents price/discount tampering from the browser. |
| P5 | **Every mutating money call is idempotent** via a client-supplied `Idempotency-Key`. | A retried request must not charge twice. |
| P6 | **Separation of duties.** The user who records a payment cannot approve its refund. | Removes the single-actor fraud path. |
| P7 | **Never store card data.** Tokenize at the gateway. | Keeps PCI-DSS scope at SAQ-A. |

---

## 2. Entity-Relationship logic

```
courses 1 ──< fee_plans 1 ──< fee_plan_installments
                  │
students 1 ──< student_fee_plans >── 1 fee_plans
                  │
                  └──1 invoices 1 ──< invoice_lines
                                 │
                                 ├──< late_fee_charges
                                 ├──< coupon_redemptions >── 1 coupons
                                 └──< payment_allocations >── 1 payments
                                                                 │
                                                                 └──1 receipts

ledger_entries  (append-only, hash-chained)  ← every financial event lands here
```

Cardinalities and the reasoning:

- **fee_plan → fee_plan_installments** (1:N). A *one-time* plan is simply a plan
  with exactly **one** installment due on day 0. This collapses two payment modes
  into one code path — no `if (isOneTime)` branching anywhere.
- **student_fee_plans → invoices** (1:N). Enrolling a student on a plan
  *materialises* one invoice per installment, each with its own `due_date`. Late
  fees and dunning then operate on invoices, not on abstract schedules.
- **payments → invoices** is **many-to-many through `payment_allocations`**.
  This is the non-obvious one: a single ₹10,000 payment may settle installment #2
  fully and #3 partially. Without an allocation table you cannot answer
  "which installment is still open?"
- **coupons → coupon_redemptions** (1:N). Redemption is a *recorded event* with a
  unique constraint, not a mutated `discount` column — that is what makes
  "one coupon per student" enforceable at the database level.
- **ledger_entries** references any of the above polymorphically
  (`ref_type`,`ref_id`) and is the immutable source of truth for reporting.

---

## 3. Schema (DDL)

### 3.1 Payment plans (one-time *and* installments)

```sql
CREATE TABLE fee_plans (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id     INT UNSIGNED NULL,
  name          VARCHAR(120) NOT NULL,          -- 'CS-101 · 6-month EMI'
  plan_type     ENUM('one_time','installment') NOT NULL,
  total_amount  DECIMAL(14,2) NOT NULL,
  currency      CHAR(3) NOT NULL DEFAULT 'INR',
  status        ENUM('active','archived') NOT NULL DEFAULT 'active',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fp_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
  CONSTRAINT ck_fp_total  CHECK (total_amount >= 0)
) ENGINE=InnoDB;

-- A one_time plan has exactly one row here (seq=1, offset_days=0).
CREATE TABLE fee_plan_installments (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fee_plan_id  INT UNSIGNED NOT NULL,
  seq          SMALLINT UNSIGNED NOT NULL,      -- 1..N
  amount       DECIMAL(14,2) NOT NULL,
  offset_days  INT NOT NULL DEFAULT 0,          -- due = enrolled_on + offset_days
  UNIQUE KEY uq_fpi (fee_plan_id, seq),
  CONSTRAINT fk_fpi_plan FOREIGN KEY (fee_plan_id) REFERENCES fee_plans(id) ON DELETE CASCADE,
  CONSTRAINT ck_fpi_amt  CHECK (amount > 0)
) ENGINE=InnoDB;
```

> **Invariant** (enforced by a service-layer assertion, not a CHECK, because MySQL
> cannot aggregate in CHECK): `SUM(fee_plan_installments.amount) = fee_plans.total_amount`.

```sql
CREATE TABLE student_fee_plans (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id   INT UNSIGNED NOT NULL,
  fee_plan_id  INT UNSIGNED NOT NULL,
  enrolled_on  DATE NOT NULL,
  status       ENUM('active','completed','cancelled') NOT NULL DEFAULT 'active',
  UNIQUE KEY uq_sfp (student_id, fee_plan_id),
  CONSTRAINT fk_sfp_student FOREIGN KEY (student_id)  REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_sfp_plan    FOREIGN KEY (fee_plan_id) REFERENCES fee_plans(id)
) ENGINE=InnoDB;
```

### 3.2 Invoices

```sql
CREATE TABLE invoices (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_no          VARCHAR(40) NOT NULL,           -- INV/2026/000123 (gap-free)
  student_id          INT UNSIGNED NOT NULL,
  student_fee_plan_id INT UNSIGNED NULL,
  installment_seq     SMALLINT UNSIGNED NULL,
  issue_date          DATE NOT NULL,
  due_date            DATE NOT NULL,
  subtotal            DECIMAL(14,2) NOT NULL,
  discount_total      DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  late_fee_total      DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  grand_total         DECIMAL(14,2) AS (subtotal - discount_total + late_fee_total) STORED,
  amount_paid         DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  balance             DECIMAL(14,2) AS (subtotal - discount_total + late_fee_total - amount_paid) STORED,
  status              ENUM('draft','open','partly_paid','paid','overdue','void') NOT NULL DEFAULT 'open',
  currency            CHAR(3) NOT NULL DEFAULT 'INR',
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_invoice_no (invoice_no),
  KEY idx_inv_student_status (student_id, status),
  KEY idx_inv_due (due_date, status),
  CONSTRAINT fk_inv_student FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT ck_inv_paid CHECK (amount_paid >= 0)
) ENGINE=InnoDB;

CREATE TABLE invoice_lines (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_id  BIGINT UNSIGNED NOT NULL,
  description VARCHAR(200) NOT NULL,
  kind        ENUM('tuition','late_fee','discount','adjustment') NOT NULL,
  amount      DECIMAL(14,2) NOT NULL,             -- negative for discounts
  CONSTRAINT fk_il_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

`grand_total` and `balance` are **generated columns** — the arithmetic cannot
drift from the components because the database computes it.

### 3.3 Payments & allocations

```sql
CREATE TABLE payments (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payment_no       VARCHAR(40) NOT NULL,
  student_id       INT UNSIGNED NOT NULL,
  amount           DECIMAL(14,2) NOT NULL,
  currency         CHAR(3) NOT NULL DEFAULT 'INR',
  method           ENUM('cash','card','upi','bank','cheque','gateway') NOT NULL,
  gateway_ref      VARCHAR(120) NULL,             -- token/txn id; NEVER a card number
  idempotency_key  CHAR(64) NOT NULL,
  received_by      INT UNSIGNED NULL,
  received_at      DATETIME(3) NOT NULL,
  status           ENUM('pending','settled','failed','reversed') NOT NULL DEFAULT 'settled',
  UNIQUE KEY uq_payment_no (payment_no),
  UNIQUE KEY uq_idempotency (idempotency_key),     -- retry-safe by construction
  KEY idx_pay_student (student_id, received_at),
  CONSTRAINT fk_pay_student FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_pay_user    FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT ck_pay_amount  CHECK (amount > 0)
) ENGINE=InnoDB;

-- One payment may settle several installments (FIFO by due_date).
CREATE TABLE payment_allocations (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payment_id  BIGINT UNSIGNED NOT NULL,
  invoice_id  BIGINT UNSIGNED NOT NULL,
  amount      DECIMAL(14,2) NOT NULL,
  UNIQUE KEY uq_alloc (payment_id, invoice_id),
  CONSTRAINT fk_alloc_pay FOREIGN KEY (payment_id) REFERENCES payments(id),
  CONSTRAINT fk_alloc_inv FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  CONSTRAINT ck_alloc_amt CHECK (amount > 0)
) ENGINE=InnoDB;
```

> **Invariant:** `SUM(payment_allocations.amount) <= payments.amount`.
> Any unallocated remainder becomes student **credit** (an advance), recorded as a
> ledger entry — never silently dropped.

### 3.4 Discount coupons

```sql
CREATE TABLE coupons (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code               VARCHAR(40) NOT NULL,
  description        VARCHAR(200),
  discount_type      ENUM('percent','flat') NOT NULL,
  discount_value     DECIMAL(10,2) NOT NULL,       -- 10.00 = 10% or ₹10
  max_discount       DECIMAL(14,2) NULL,           -- caps a percent coupon
  min_invoice_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  course_id          INT UNSIGNED NULL,            -- NULL = any course
  valid_from         DATETIME NOT NULL,
  valid_until        DATETIME NOT NULL,
  max_redemptions    INT UNSIGNED NULL,            -- NULL = unlimited
  per_student_limit  INT UNSIGNED NOT NULL DEFAULT 1,
  times_redeemed     INT UNSIGNED NOT NULL DEFAULT 0,
  status             ENUM('active','disabled') NOT NULL DEFAULT 'active',
  created_by         INT UNSIGNED NULL,
  UNIQUE KEY uq_coupon_code (code),
  KEY idx_coupon_valid (status, valid_from, valid_until),
  CONSTRAINT ck_coupon_window CHECK (valid_until > valid_from),
  CONSTRAINT ck_coupon_value  CHECK (discount_value > 0)
) ENGINE=InnoDB;

CREATE TABLE coupon_redemptions (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  coupon_id    INT UNSIGNED NOT NULL,
  student_id   INT UNSIGNED NOT NULL,
  invoice_id   BIGINT UNSIGNED NOT NULL,
  amount_off   DECIMAL(14,2) NOT NULL,
  redeemed_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_redemption_invoice (coupon_id, invoice_id),
  KEY idx_redeem_student (coupon_id, student_id),
  CONSTRAINT fk_cr_coupon  FOREIGN KEY (coupon_id)  REFERENCES coupons(id),
  CONSTRAINT fk_cr_student FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_cr_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id)
) ENGINE=InnoDB;
```

**Race condition — read this before implementing.** Checking
`times_redeemed < max_redemptions` and then incrementing is a classic
check-then-act TOCTOU bug: two concurrent requests both pass the check and the
coupon over-redeems. Redemption must be:

```sql
START TRANSACTION;
  SELECT * FROM coupons WHERE id = ? FOR UPDATE;      -- serialise redeemers
  -- re-validate window, status, per-student limit, min amount
  INSERT INTO coupon_redemptions (...);               -- unique key is the backstop
  UPDATE coupons SET times_redeemed = times_redeemed + 1
   WHERE id = ? AND (max_redemptions IS NULL OR times_redeemed < max_redemptions);
  -- 0 affected rows => coupon exhausted => ROLLBACK
COMMIT;
```

The `UNIQUE (coupon_id, invoice_id)` key means even a bug in the service layer
cannot double-apply a coupon to one invoice.

### 3.5 Late fees

```sql
CREATE TABLE late_fee_rules (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(120) NOT NULL,
  course_id         INT UNSIGNED NULL,            -- NULL = institute-wide default
  grace_days        INT UNSIGNED NOT NULL DEFAULT 0,
  charge_type       ENUM('flat','percent_per_day','flat_per_day') NOT NULL,
  charge_value      DECIMAL(10,2) NOT NULL,
  max_charge        DECIMAL(14,2) NULL,           -- cap; protects against runaway accrual
  compounding       TINYINT(1) NOT NULL DEFAULT 0,
  status            ENUM('active','disabled') NOT NULL DEFAULT 'active'
) ENGINE=InnoDB;

CREATE TABLE late_fee_charges (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_id    BIGINT UNSIGNED NOT NULL,
  rule_id       INT UNSIGNED NULL,
  as_of_date    DATE NOT NULL,
  days_overdue  INT UNSIGNED NOT NULL,
  amount        DECIMAL(14,2) NOT NULL,
  waived        TINYINT(1) NOT NULL DEFAULT 0,
  waived_by     INT UNSIGNED NULL,
  waive_reason  VARCHAR(255) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_lfc (invoice_id, as_of_date),      -- idempotent daily accrual
  CONSTRAINT fk_lfc_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_lfc_rule    FOREIGN KEY (rule_id)   REFERENCES late_fee_rules(id) ON DELETE SET NULL
) ENGINE=InnoDB;
```

**Accrual algorithm** (nightly job, per open invoice):

```
days_overdue = max(0, today - due_date - grace_days)
if days_overdue == 0 or invoice.status in (paid, void): skip

charge = switch(charge_type):
    flat            -> charge_value                       (once)
    flat_per_day    -> charge_value * days_overdue
    percent_per_day -> invoice.balance * (charge_value/100) * days_overdue

charge = min(charge, max_charge ?? charge)
delta  = charge - already_charged(invoice)                # accrue only the difference
if delta > 0: INSERT late_fee_charges + invoice_lines(kind='late_fee') + ledger entry
```

`UNIQUE (invoice_id, as_of_date)` makes the job **idempotent** — running it twice
on the same day, or replaying a backfill, cannot double-charge a student.
Waivers are a flag plus a reason and an approver; the original charge row stays.

### 3.6 The immutable ledger

```sql
CREATE TABLE ledger_entries (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  entry_date   DATE NOT NULL,
  account      ENUM('accounts_receivable','cash','bank','discount_given',
                    'late_fee_income','tuition_income','student_credit','refunds') NOT NULL,
  debit        DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  credit       DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  currency     CHAR(3) NOT NULL DEFAULT 'INR',
  student_id   INT UNSIGNED NULL,
  ref_type     ENUM('invoice','payment','late_fee','coupon','refund','reversal') NOT NULL,
  ref_id       BIGINT UNSIGNED NOT NULL,
  memo         VARCHAR(255) NULL,
  reverses_id  BIGINT UNSIGNED NULL,             -- corrections point at the original
  created_by   INT UNSIGNED NULL,
  created_at   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  prev_hash    CHAR(64) NULL,                    -- hash of the previous row
  row_hash     CHAR(64) NOT NULL,                -- HMAC over this row + prev_hash

  KEY idx_le_ref (ref_type, ref_id),
  KEY idx_le_student_date (student_id, entry_date),
  CONSTRAINT ck_le_single_side CHECK ((debit = 0) <> (credit = 0)),
  CONSTRAINT ck_le_nonneg CHECK (debit >= 0 AND credit >= 0)
) ENGINE=InnoDB;
```

Every event writes a **balanced pair** of rows. Recording a ₹10,000 payment:

| account | debit | credit |
|---|---|---|
| `cash` | 10,000.00 | — |
| `accounts_receivable` | — | 10,000.00 |

Invariant, assertable at any time: `SUM(debit) = SUM(credit)`.

---

## 4. Tamper-evidence: the hash chain

```
row_hash = HMAC_SHA256(
    key  = LEDGER_HMAC_KEY,                       # in KMS/Vault, NOT in .env
    data = prev_hash ‖ id ‖ entry_date ‖ account ‖ debit ‖ credit ‖
           currency ‖ ref_type ‖ ref_id ‖ created_at
)
```

- `prev_hash` = `row_hash` of the immediately preceding entry (genesis = 64 × `0`).
- Altering **any** field of **any** historical row invalidates that row's hash and
  every hash after it. Silent edits become mathematically detectable.
- An HMAC (keyed) rather than a plain SHA-256 means an attacker with write access
  to the table still cannot recompute a valid chain without the key — and the key
  lives in a KMS the database user cannot read.
- **Daily anchoring:** at 00:05 publish the current head `row_hash` to
  append-only external storage (S3 Object Lock / WORM bucket, or a signed email
  to the auditor). This bounds tampering to a single day even against an attacker
  who compromises both the DB *and* the KMS.
- **Verification job:** walk the chain nightly; on mismatch, page finance +
  security and freeze write access.

> Hash-chaining detects tampering; it does not *prevent* it. Prevention comes from
> the DB grants in §5.1. Use both.

---

## 5. Security protocols

### 5.1 Preventing tampering (defence in depth)

| Layer | Control |
|---|---|
| **DB grants** | The application's MySQL user has `INSERT, SELECT` on `ledger_entries`, `payments`, `late_fee_charges`, `coupon_redemptions` — **no `UPDATE`, no `DELETE`**. Attempted edits fail at the engine, not in a code review. |
| **Schema** | `CHECK` constraints + generated columns + unique keys encode the invariants so a buggy service cannot violate them. |
| **Application** | Corrections are **reversing entries** (`reverses_id`), never edits. Void an invoice → issue a credit note. |
| **Cryptographic** | HMAC hash chain + daily external anchor (§4). |
| **Operational** | Binlog retention ≥ 35 days, shipped off-host to WORM storage. Nightly logical backup, restore-tested monthly. |
| **Detection** | Chain-verification job + daily reconciliation: `SUM(ledger.debit − ledger.credit)` per account must equal the bank statement. Divergence pages on-call. |
| **Partitioning** | `ledger_entries` partitioned monthly by `entry_date`; archive rather than delete. |

Separate DB users, least privilege:

```
erp_app       -> INSERT, SELECT on money tables; UPDATE only on mutable ones (invoices.status)
erp_reporting -> SELECT only, on a read-replica
erp_migrator  -> DDL, used only by CI, credentials rotated per deploy
```

### 5.2 Encryption

| Concern | Control |
|---|---|
| In transit | TLS 1.3 everywhere, HSTS, and **TLS to MySQL** (`ssl: { rejectUnauthorized: true }`) — not just at the edge. |
| At rest | InnoDB tablespace encryption (AES-256) + encrypted volumes/snapshots. |
| Column-level | `gateway_ref` and any PII (phone, address) encrypted with **AES-256-GCM** using envelope encryption: a per-row DEK wrapped by a KMS-held KEK. GCM supplies authentication — a flipped ciphertext bit fails decryption. |
| Key management | KEKs in AWS KMS / HashiCorp Vault. **Never in `.env`.** Annual rotation; re-wrap DEKs, no bulk re-encryption. `LEDGER_HMAC_KEY` is separate from the data KEK. |
| Card data | **Not stored.** Tokenize via the gateway; persist only the token + last4 + brand. Keeps PCI-DSS scope at SAQ-A. |
| Backups | Encrypted with a distinct key; restores require dual authorisation. |
| Logs | PANs/CVV/tokens are never logged. Scrub `req.body` for `card`, `cvv`, `pan` before the request logger touches it. |

### 5.3 Access tokens & authorization

- **Short-lived access JWT (10–15 min)** carrying `sub`, `role`, `scope[]`, `jti`,
  `aud`. Long-lived tokens are the single biggest practical risk — the current
  system issues **7-day** tokens (`JWT_EXPIRES_IN=7d`), which is far too long for
  a finance surface.
- **Refresh-token rotation with reuse detection.** Each refresh returns a new
  refresh token and invalidates the old one; presentation of an already-used
  token means theft → revoke the whole family and force re-auth.
- **`jti` denylist** in Redis for immediate revocation (logout, role change).
- **Finance-specific scopes**, distinct from generic `fees.update`:
  `fees.invoice.issue`, `fees.payment.record`, `fees.payment.reverse`,
  `fees.coupon.manage`, `fees.latefee.waive`, `fees.report.export`.
- **Step-up authentication** (re-enter password or MFA, fresh token < 5 min old)
  for `payment.reverse`, `latefee.waive`, and `invoice.void`.
- **Maker–checker:** refunds and waivers above a configurable threshold enter
  `pending_approval` and require a *different* user holding `fees.approve`.
  Enforced by `approved_by <> created_by` — a DB constraint, not a convention.
- **Idempotency:** `Idempotency-Key` header, persisted as
  `payments.idempotency_key UNIQUE`. A replayed request returns the original
  response instead of creating a second payment.
- **Amount authority:** the server recomputes `grand_total` from invoice lines and
  re-validates the coupon. A client-supplied amount is only ever used to *assert*
  agreement (`expected_total`); a mismatch is a `409`, never a silent accept.
- **Rate limiting** on payment endpoints (per user *and* per student) plus
  anomaly alerts (e.g. > 3 reversals by one user in an hour).
- **Webhooks** (gateway callbacks) verified by HMAC signature + timestamp window
  (replay protection) + allow-listed source IPs. Never trust an unsigned callback
  to mark an invoice paid.

### 5.4 Audit & retention

Every finance mutation writes to `audit_logs` (see [AdminModule.md](./AdminModule.md)):
actor, before/after, IP, user-agent, `Idempotency-Key`, and the resulting
`ledger_entries.id`. Retention ≥ 7 years (statutory). Audit writes are
fire-and-forget and must never roll back a payment.

---

## 6. PDF receipts

- Generated **on demand** from the ledger — never stored as the source of truth.
- Deterministic: `receipt_no` is gap-free (`RCPT/2026/000123`) from the same
  `id_sequences` locking pattern used for student IDs.
- Contents: institute header, receipt no, payment no, student + student UID,
  invoice(s) settled with per-invoice allocation, discounts (coupon code),
  late fees, method, amount in words, and the collecting user.
- **Integrity:** embed a QR code encoding
  `{receipt_no, amount, payment_id, sig}` where `sig = HMAC(RECEIPT_KEY, …)`, and
  expose `GET /receipts/verify/:receipt_no` (public, rate-limited) so a printed
  receipt can be checked against the ledger. This defeats forged paper receipts.
- Reissuing a receipt is logged; a **void** produces a credit note, never a
  deleted or edited receipt.
- Suggested library: `pdfkit` (no headless browser, no RCE surface from HTML).

---

## 7. Migration from the current schema

Non-negotiable order — never point the app at a half-migrated ledger:

1. Create the new tables alongside the old ones. No writes yet.
2. Backfill: for each `fee_structures` row create a `fee_plans(one_time)` +
   `student_fee_plans` + one `invoices` row.
3. Backfill: each `fee_transactions` row → `payments` + `payment_allocations`
   (FIFO against that student's invoices) + balanced `ledger_entries`.
4. Build the hash chain over the backfilled entries **in `id` order**, then anchor
   the head hash.
5. Reconcile: `SUM(payments.amount)` must equal `SUM(fee_transactions.amount)`.
   Abort if it does not.
6. Flip the app to the new write path (dual-write for one release if cautious).
7. `REVOKE UPDATE, DELETE ON envision_erp.ledger_entries FROM 'erp_app'@'%';`
8. Rename `fee_transactions` → `fee_transactions_legacy`, read-only.

---

## 8. Core API endpoints

| Method | Endpoint | Scope | Notes |
|---|---|---|---|
| POST | `/fee-plans` | `fees.coupon.manage` | validates Σ installments = total |
| POST | `/students/:id/fee-plan` | `fees.invoice.issue` | materialises the invoice schedule |
| GET | `/students/:id/ledger` | `fees.view` | invoices, payments, balance, credit |
| POST | `/invoices/:id/coupon` | `fees.invoice.issue` | `{ code }`; server computes the discount |
| DELETE | `/invoices/:id/coupon` | `fees.invoice.issue` | reversing entry, not a delete |
| POST | `/payments` | `fees.payment.record` | `Idempotency-Key` **required**; `{student_id, amount, method, allocations?}` |
| POST | `/payments/:id/reverse` | `fees.payment.reverse` | step-up auth + maker–checker |
| POST | `/invoices/:id/void` | `fees.invoice.void` | issues a credit note |
| POST | `/late-fees/run` | `system` | idempotent; `?as_of=` for backfill |
| POST | `/late-fees/:id/waive` | `fees.latefee.waive` | requires reason + approver |
| GET | `/receipts/:paymentId.pdf` | `fees.view` | streams PDF; logged |
| GET | `/receipts/verify/:receiptNo` | public | QR verification, rate-limited |
| GET | `/reports/ledger/trial-balance` | `fees.report.export` | asserts Σdebit = Σcredit |

---

## 9. The five things most likely to go wrong

1. **Floating-point money.** `DECIMAL(14,2)` everywhere; never `FLOAT`. In JS,
   `0.1 + 0.2 !== 0.3` — do arithmetic in the database or with a decimal library,
   and never round a percent discount before capping it.
2. **Coupon TOCTOU.** Check-then-increment over-redeems under concurrency. Lock
   the coupon row (§3.4) and let the unique key be the backstop.
3. **Late-fee double accrual.** A cron retry charges twice. `UNIQUE(invoice_id, as_of_date)`
   plus accruing only the **delta** makes the job replay-safe.
4. **Trusting client amounts.** Never accept `amount_due` or `discount` from the
   browser. Recompute server-side; a mismatch is a `409`.
5. **Mutable history.** If `erp_app` holds `UPDATE` on the ledger, every other
   control here is theatre. Revoke it, and prove it in a test.
