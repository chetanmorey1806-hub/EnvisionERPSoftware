-- ===========================================================================
--  Envision ERP — seed data: NONE, deliberately.
--
--  This file used to insert sample courses, students, trainers, fees, books and
--  job postings. It no longer does. A demo row is indistinguishable from a real
--  one once it is in the database, and "who is this student and why do they owe
--  us ₹60,000?" is not a question anyone should have to answer six months in.
--
--  What exists after `npm run db:setup`:
--    - the schema (database/envision_erp.sql)
--    - roles and permissions (generated from server/config/seedRbac.js)
--    - ONE super-admin account, from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
--      in server/.env  (see server/config/createTables.js)
--
--  Everything else — trainers, the placement team, students, courses, batches,
--  fee plans — is created by the admin from inside the app:
--
--      Settings -> User Management
--
--  which creates the login AND the trainer/student profile it resolves to.
--
--  To wipe an existing database back to that state:
--
--      cd server && npm run db:fresh
-- ===========================================================================

USE `envision_erp`;

-- Intentionally empty.
