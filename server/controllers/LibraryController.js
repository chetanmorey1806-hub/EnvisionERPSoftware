/**
 * LibraryController — /api/library (libraryApi.js).
 * Issuing/returning keeps available_copies in sync.
 */
const { pick, insert, findById, query } = require('../utils/crud');
const { success, created, fail } = require('../utils/response');

const BOOK_FIELDS = ['isbn', 'title', 'author', 'category', 'total_copies', 'available_copies'];

const LibraryController = {
  // GET /library/books?search=&category=
  async searchBooks(req, res) {
    const { search, category } = req.query;
    const where = [];
    const params = [];
    if (search) { where.push('(title LIKE ? OR author LIKE ? OR isbn LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (category) { where.push('category = ?'); params.push(category); }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await query(`SELECT * FROM library_books ${clause} ORDER BY title ASC`, params);
    return success(res, { data: rows }, 'Books fetched.');
  },

  // POST /library/books
  async addBook(req, res) {
    const data = pick(req.body, BOOK_FIELDS);
    if (!data.title) return fail(res, 'Book title is required.', 422);
    if (data.total_copies !== undefined && data.available_copies === undefined) {
      data.available_copies = data.total_copies;
    }
    const id = await insert('library_books', data);
    return created(res, { data: await findById('library_books', id) }, 'Book added.');
  },

  // POST /library/issue  { book_id, student_id, due_date }
  async issueBook(req, res) {
    const { book_id, student_id, due_date } = req.body || {};
    if (!book_id || !student_id) return fail(res, 'book_id and student_id are required.', 422);
    const book = await findById('library_books', book_id);
    if (!book) return fail(res, 'Book not found.', 404);
    if (book.available_copies < 1) return fail(res, 'No copies available to issue.', 409);
    if (!(await findById('students', student_id))) return fail(res, 'Student not found.', 404);

    const id = await insert('library_issues', {
      book_id, student_id,
      issued_date: new Date().toISOString().slice(0, 10),
      due_date: due_date || null,
    });
    await query('UPDATE library_books SET available_copies = available_copies - 1 WHERE id = ?', [book_id]);
    return created(res, { data: await findById('library_issues', id) }, 'Book issued.');
  },

  // POST /library/return/:issueId
  async returnBook(req, res) {
    const issue = await findById('library_issues', req.params.issueId);
    if (!issue) return fail(res, 'Issue record not found.', 404);
    if (issue.status === 'returned') return fail(res, 'Book already returned.', 409);

    await query(
      "UPDATE library_issues SET status = 'returned', return_date = CURDATE() WHERE id = ?",
      [req.params.issueId]
    );
    await query('UPDATE library_books SET available_copies = available_copies + 1 WHERE id = ?', [issue.book_id]);
    return success(res, { data: await findById('library_issues', req.params.issueId) }, 'Book returned.');
  },
};

module.exports = LibraryController;
