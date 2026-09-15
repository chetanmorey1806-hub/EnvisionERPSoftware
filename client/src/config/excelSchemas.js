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
};

export default excelSchemas;
