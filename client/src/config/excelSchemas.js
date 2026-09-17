/**
 * EXCEL SCHEMAS — one column list per module, shared by all three operations.
 *
 * Export, template download and import all read the same array, so a sheet
 * exported from a screen can always be edited and imported straight back into
 * it. Adding a field in one place fixes all three at once.
 *
 * Column shape:
 *   key       field name on the record AND in the create payload
 *   label     the spreadsheet header
 *   required  import fails the row if blank
 *   type      'text' | 'number' | 'email' | 'date'
 *   options   allowed values (import normalises casing to match)
 *   aliases   other headers people actually type, matched leniently
 *   readOnly  exported for reference, never imported (ids, computed totals)
 *   format    (row) => value, for export only
 *   example   what the template's sample row shows
 *   hint      shown in the template's "Column guide" sheet
 */

const STATUS = ['active', 'inactive'];

export const excelSchemas = {
  students: {
    label: 'Students',
    columns: [
      { key: 'id', label: 'ID', readOnly: true },
      { key: 'admission_no', label: 'Admission No', readOnly: true },
      { key: 'name', label: 'Full Name', required: true, example: 'Aarti Deshmukh', aliases: ['student name'] },
      { key: 'email', label: 'Email', type: 'email', example: 'aarti@example.com' },
      { key: 'phone', label: 'Phone', example: '9876543210' },
      { key: 'gender', label: 'Gender', options: ['male', 'female', 'other'], example: 'female' },
      { key: 'dob', label: 'Date of Birth', type: 'date', example: '2004-05-21', hint: 'YYYY-MM-DD' },
      { key: 'address', label: 'Address', example: 'Kothrud, Pune' },
      { key: 'course_id', label: 'Course ID', type: 'number', example: '1', hint: 'Numeric id from the Courses export' },
      { key: 'batch_id', label: 'Batch ID', type: 'number', example: '1', hint: 'Numeric id from the Batches export' },
      { key: 'status', label: 'Status', options: [...STATUS, 'graduated'], example: 'active' },
      { key: 'created_at', label: 'Created', readOnly: true },
    ],
  },

  trainers: {
    label: 'Trainers',
    columns: [
      { key: 'id', label: 'ID', readOnly: true },
      { key: 'name', label: 'Full Name', required: true, example: 'Rahul Deshmukh' },
      { key: 'email', label: 'Email', type: 'email', example: 'rahul@example.com' },
      { key: 'phone', label: 'Phone', example: '9876543210' },
      { key: 'specialization', label: 'Specialization', example: 'Python, Django', aliases: ['subject', 'expertise'] },
      { key: 'qualification', label: 'Qualification', example: 'M.Sc. Computer Science' },
      { key: 'experience_years', label: 'Experience (Years)', type: 'number', example: '6' },
      { key: 'status', label: 'Status', options: STATUS, example: 'active' },
    ],
  },

  courses: {
    label: 'Courses',
    columns: [
      { key: 'id', label: 'ID', readOnly: true },
      { key: 'code', label: 'Course Code', required: true, example: 'PY-101', aliases: ['code'] },
      { key: 'title', label: 'Course Title', required: true, example: 'Python Programming', aliases: ['name', 'course name'] },
      { key: 'description', label: 'Description', example: 'Core Python with hands-on projects' },
      { key: 'duration_months', label: 'Duration (Months)', type: 'number', example: '3' },
      { key: 'fee', label: 'Fee', type: 'number', example: '25000' },
      { key: 'status', label: 'Status', options: STATUS, example: 'active' },
    ],
  },

  batches: {
    label: 'Batches',
    columns: [
      { key: 'id', label: 'ID', readOnly: true },
      { key: 'code', label: 'Batch Code', required: true, example: 'PY-101-B1' },
      { key: 'name', label: 'Batch Name', required: true, example: 'Python Morning Batch' },
      { key: 'course_id', label: 'Course ID', type: 'number', required: true, example: '1', hint: 'Numeric id from the Courses export' },
      { key: 'faculty_id', label: 'Trainer ID', type: 'number', example: '1', hint: 'Numeric id from the Trainers export' },
      { key: 'room_id', label: 'Room ID', type: 'number', example: '1' },
      { key: 'start_date', label: 'Start Date', type: 'date', example: '2026-09-01', hint: 'YYYY-MM-DD' },
      { key: 'end_date', label: 'End Date', type: 'date', example: '2026-12-01', hint: 'YYYY-MM-DD' },
      { key: 'start_time', label: 'Start Time', example: '09:00', hint: 'HH:MM, 24-hour' },
      { key: 'end_time', label: 'End Time', example: '11:00', hint: 'HH:MM, 24-hour' },
      { key: 'capacity', label: 'Capacity', type: 'number', example: '30' },
      { key: 'status', label: 'Status', options: [...STATUS, 'completed'], example: 'active' },
    ],
  },

  rooms: {
    label: 'Classrooms & Labs',
    columns: [
      { key: 'id', label: 'ID', readOnly: true },
      { key: 'name', label: 'Room Name', required: true, example: 'Lab 1' },
      { key: 'code', label: 'Room Code', example: 'L-01' },
      { key: 'capacity', label: 'Seating Capacity', type: 'number', required: true, example: '30' },
      { key: 'type', label: 'Type', options: ['classroom', 'lab'], example: 'lab' },
      { key: 'status', label: 'Status', options: STATUS, example: 'active' },
    ],
  },

  staff: {
    label: 'Staff',
    columns: [
      { key: 'id', label: 'ID', readOnly: true },
      { key: 'name', label: 'Full Name', required: true, example: 'Sunita Patil' },
      { key: 'email', label: 'Email', type: 'email', example: 'sunita@example.com' },
      { key: 'phone', label: 'Phone', example: '9876543210' },
      { key: 'department', label: 'Department', example: 'Accounts' },
      { key: 'designation', label: 'Designation', example: 'Accountant' },
      { key: 'status', label: 'Status', options: STATUS, example: 'active' },
    ],
  },

  partners: {
    label: 'Corporate Partners',
    columns: [
      { key: 'id', label: 'ID', readOnly: true },
      { key: 'name', label: 'Company Name', required: true, example: 'Infosys Ltd.' },
      { key: 'industry', label: 'Industry', example: 'IT Services' },
      { key: 'email', label: 'Email', type: 'email', example: 'hr@infosys.com' },
      { key: 'phone', label: 'Phone', example: '02040001234' },
      { key: 'website', label: 'Website', example: 'https://infosys.com' },
      { key: 'gst_number', label: 'GST Number', example: '27AAACI1681G1ZM', aliases: ['gstin', 'gst'] },
      { key: 'pan_number', label: 'PAN Number', example: 'AAACI1681G', aliases: ['pan'] },
      { key: 'address', label: 'Address', example: 'Hinjawadi, Pune' },
      { key: 'status', label: 'Status', options: STATUS, example: 'active' },
    ],
  },

  users: {
    label: 'Users',
    columns: [
      { key: 'id', label: 'ID', readOnly: true },
      { key: 'name', label: 'Full Name', required: true, example: 'Nikhil Joshi' },
      { key: 'email', label: 'Email', type: 'email', required: true, example: 'nikhil@envision.local' },
      {
        key: 'password', label: 'Password', required: true, example: 'Set@12345',
        hint: 'Only used when creating the account; never present in an export.',
      },
      { key: 'phone', label: 'Phone', example: '9876543210' },
      {
        key: 'role', label: 'Role', required: true, example: 'faculty',
        hint: 'Must match an existing role name — see the Roles screen.',
      },
      { key: 'status', label: 'Status', options: STATUS, example: 'active' },
    ],
  },

  enquiries: {
    label: 'Enquiries',
    columns: [
      { key: 'id', label: 'ID', readOnly: true },
      { key: 'name', label: 'Name', required: true, example: 'Sneha Kulkarni' },
      { key: 'phone', label: 'Phone', required: true, example: '9876543210' },
      { key: 'email', label: 'Email', type: 'email', example: 'sneha@example.com' },
      { key: 'course_interest', label: 'Course Interest', example: 'Full Stack Development', aliases: ['course', 'interest'] },
      { key: 'source', label: 'Source', example: 'Walk-in', hint: 'Walk-in / Website / Referral / Social' },
      { key: 'city', label: 'City', example: 'Pune' },
      { key: 'notes', label: 'Notes', example: 'Prefers weekend batch' },
      { key: 'status', label: 'Status', options: ['new', 'contacted', 'converted', 'lost'], example: 'new' },
    ],
  },

  library: {
    label: 'Library Books',
    columns: [
      { key: 'id', label: 'ID', readOnly: true },
      { key: 'title', label: 'Title', required: true, example: 'Learning Python' },
      { key: 'author', label: 'Author', example: 'Mark Lutz' },
      { key: 'isbn', label: 'ISBN', example: '9781449355739' },
      { key: 'category', label: 'Category', example: 'Programming' },
      { key: 'total_copies', label: 'Total Copies', type: 'number', required: true, example: '5' },
      { key: 'available_copies', label: 'Available', readOnly: true },
    ],
  },

  inventory: {
    label: 'Inventory',
    columns: [
      { key: 'id', label: 'ID', readOnly: true },
      { key: 'name', label: 'Item Name', required: true, example: 'Dell Monitor 22"' },
      { key: 'sku', label: 'SKU', example: 'MON-DEL-22' },
      { key: 'category', label: 'Category', example: 'Hardware' },
      { key: 'quantity', label: 'Quantity', type: 'number', required: true, example: '12' },
      { key: 'unit', label: 'Unit', example: 'unit' },
      { key: 'reorder_level', label: 'Reorder Level', type: 'number', example: '3' },
    ],
  },

  /* ---- export-only lists (no create endpoint to import into safely) ---- */

  admissions: {
    label: 'Admissions',
    columns: [
      { key: 'name', label: 'Applicant' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'course_title', label: 'Course' },
      { key: 'applied_at', label: 'Applied' },
      { key: 'docs_verified', label: 'Documents verified', format: (r) => (Number(r.docs_verified) ? 'Yes' : 'No') },
      { key: 'status', label: 'Status' },
    ],
  },

  followups: {
    label: 'Follow-ups',
    columns: [
      { key: 'enquiry_name', label: 'Enquiry', format: (r) => r.enquiry_name || `#${r.enquiry_id}` },
      { key: 'phone', label: 'Phone' },
      { key: 'note', label: 'Note' },
      { key: 'followup_date', label: 'Due' },
      { key: 'next_followup_date', label: 'Next follow-up' },
      { key: 'status', label: 'Status' },
    ],
  },

  attendance: {
    label: 'Attendance',
    columns: [
      { key: 'admission_no', label: 'Admission No' },
      { key: 'name', label: 'Student' },
      { key: 'status', label: 'Status', format: (r) => r.status || 'not marked' },
      { key: 'source', label: 'Marked by', format: (r) => (r.source === 'self' ? 'self check-in' : r.source === 'trainer' ? 'trainer' : '') },
    ],
  },

  // Results is the one sheet that goes both ways: export the batch, type the
  // marks, import it back. Import only FILLS the marks on screen — the normal
  // "Save marks" still does the saving and the server's checks.
  results: {
    label: 'Marks',
    columns: [
      { key: 'student_id', label: 'Student ID', type: 'number', required: true, example: '12', hint: 'Keep the id from the export — it is how a row finds its student' },
      { key: 'admission_no', label: 'Admission No', readOnly: true },
      { key: 'name', label: 'Student', readOnly: true },
      { key: 'marks_obtained', label: 'Marks', type: 'number', required: true, example: '72', aliases: ['marks obtained', 'score'] },
    ],
  },

  certificates: {
    label: 'Certificates',
    columns: [
      { key: 'certificate_number', label: 'Certificate No' },
      { key: 'student_name', label: 'Student' },
      { key: 'admission_no', label: 'Admission No' },
      { key: 'issued_date', label: 'Issued' },
      { key: 'approved_by_name', label: 'Approved by' },
      { key: 'status', label: 'Status' },
      { key: 'remarks', label: 'Remarks' },
    ],
  },

  feeDues: {
    label: 'Fee dues',
    columns: [
      { key: 'name', label: 'Student' },
      { key: 'admission_no', label: 'Admission No' },
      { key: 'phone', label: 'Phone' },
      { key: 'course_title', label: 'Course' },
      { key: 'overdue_amount', label: 'Overdue (₹)', type: 'number' },
      { key: 'fines_due', label: 'Late fees (₹)', type: 'number' },
      { key: 'days_late', label: 'Days late', type: 'number' },
      { key: 'oldest_due', label: 'Oldest due date' },
    ],
  },

  feePlans: {
    label: 'Fee plans',
    columns: [
      { key: 'name', label: 'Plan' },
      { key: 'course_title', label: 'Course' },
      { key: 'base_fee', label: 'Base fee (₹)', type: 'number' },
      { key: 'registration_fee', label: 'Registration (₹)', type: 'number' },
      { key: 'tax_pct', label: 'GST %', type: 'number' },
      { key: 'installments', label: 'Installments', type: 'number' },
      { key: 'interval_days', label: 'Days between', type: 'number' },
      { key: 'late_fee_per_day', label: 'Late fee / day (₹)', type: 'number' },
      { key: 'late_fee_cap', label: 'Late fee cap (₹)', type: 'number' },
      { key: 'grace_days', label: 'Grace days', type: 'number' },
      { key: 'students_on_plan', label: 'Students on plan', type: 'number' },
    ],
  },

  expenses: {
    label: 'Expenses',
    columns: [
      { key: 'voucher_no', label: 'Voucher' },
      { key: 'category', label: 'Category' },
      { key: 'payee', label: 'Paid to' },
      { key: 'amount', label: 'Amount (₹)', type: 'number' },
      { key: 'spent_on', label: 'Date' },
      { key: 'mode', label: 'Mode' },
      { key: 'note', label: 'Note' },
    ],
  },

  readiness: {
    label: 'Readiness',
    columns: [
      { key: 'admission_no', label: 'Admission No' },
      { key: 'name', label: 'Student' },
      { key: 'attendance_pct', label: 'Attendance %', type: 'number' },
      { key: 'technical_pct', label: 'Technical %', type: 'number' },
      { key: 'soft_skill_cleared', label: 'Soft skills signed off', format: (r) => (r.soft_skill_cleared ? 'Yes' : 'No') },
      { key: 'employability', label: 'Status' },
      { key: 'assessments', label: 'Assessments', type: 'number' },
    ],
  },

  placementJobs: {
    label: 'Jobs',
    columns: [
      { key: 'company', label: 'Company' },
      { key: 'role', label: 'Role' },
      { key: 'location', label: 'Location' },
      { key: 'package', label: 'Package' },
      { key: 'skills', label: 'Skills' },
      { key: 'openings', label: 'Openings', type: 'number' },
      { key: 'min_attendance_pct', label: 'Min attendance %', type: 'number' },
      { key: 'min_score_pct', label: 'Min score %', type: 'number' },
      { key: 'require_job_ready', label: 'Job-Ready only', format: (r) => (Number(r.require_job_ready) ? 'Yes' : 'No') },
      { key: 'applicants', label: 'In pipeline', type: 'number' },
      { key: 'placed', label: 'Placed', type: 'number' },
      { key: 'status', label: 'Status' },
    ],
  },

  placementPipeline: {
    label: 'Pipeline',
    columns: [
      { key: 'student_name', label: 'Student' },
      { key: 'admission_no', label: 'Admission No' },
      { key: 'status', label: 'Stage' },
      { key: 'match_score', label: 'Match score', type: 'number' },
      { key: 'rounds', label: 'Rounds logged', type: 'number' },
      { key: 'rejection_reason', label: 'Rejection reason' },
    ],
  },
};

export default excelSchemas;
