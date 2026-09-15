import * as XLSX from 'xlsx';

/**
 * Excel read/write helpers.
 *
 * One place that knows about workbooks, so no page has to import SheetJS or
 * think about cell types. Everything here works on plain arrays of objects —
 * the same shape the tables already render — keyed by a column schema
 * (see `config/excelSchemas.js`).
 */

/** Widen each column to fit its longest cell, capped so one long note can't push others off-screen. */
const autoWidth = (columns, rows) =>
  columns.map((c) => {
    const longest = rows.reduce(
      (max, r) => Math.max(max, String(r[c.key] ?? '').length),
      String(c.label).length
    );
    return { wch: Math.min(Math.max(longest + 2, 10), 46) };
  });

/**
 * Download `rows` as an .xlsx file.
 *
 * `columns` is [{ key, label, format? }]. Only declared columns are written, in
 * declared order — so an export never leaks internal fields (password hashes,
 * FKs) just because they happened to be on the record.
 */
export function exportToExcel({ filename, sheetName = 'Data', columns, rows = [] }) {
  const shaped = rows.map((row) =>
    columns.reduce((out, c) => {
      const raw = c.format ? c.format(row) : row[c.key];
      out[c.label] = raw ?? '';
      return out;
    }, {})
  );

  const sheet = XLSX.utils.json_to_sheet(shaped, { header: columns.map((c) => c.label) });
  sheet['!cols'] = autoWidth(
    columns.map((c) => ({ ...c, key: c.label })),
    shaped
  );
  sheet['!autofilter'] = { ref: sheet['!ref'] };
  // Freeze the header so it stays visible while scrolling a long export.
  sheet['!freeze'] = { xSplit: 0, ySplit: 1 };

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, sheetName.slice(0, 31));
  XLSX.writeFile(book, `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Download a blank import template: the header row, one example row, and a
 * second sheet explaining every column. People fill the template far more
 * reliably than they follow written instructions.
 */
export function downloadTemplate({ filename, sheetName = 'Import', columns }) {
  const importable = columns.filter((c) => !c.readOnly);

  const example = importable.reduce((out, c) => {
    out[c.label] = c.example ?? '';
    return out;
  }, {});

  const sheet = XLSX.utils.json_to_sheet([example], { header: importable.map((c) => c.label) });
  sheet['!cols'] = importable.map((c) => ({ wch: Math.min(Math.max(c.label.length + 4, 14), 40) }));

  const guide = XLSX.utils.json_to_sheet(
    importable.map((c) => ({
      Column: c.label,
      Required: c.required ? 'Yes' : 'No',
      Accepts: c.hint || (c.options ? c.options.join(' / ') : 'Text'),
    }))
  );
  guide['!cols'] = [{ wch: 24 }, { wch: 10 }, { wch: 52 }];

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, sheetName.slice(0, 31));
  XLSX.utils.book_append_sheet(book, guide, 'Column guide');
  XLSX.writeFile(book, `${filename}-template.xlsx`);
}

/**
 * Parse an uploaded workbook into records keyed by schema `key`.
 *
 * Header matching is deliberately forgiving — case, spacing and punctuation are
 * normalised — because a file that has been mailed around an office comes back
 * with "Full Name ", "full name" and "Full  Name" in it. A column the schema
 * doesn't know is ignored rather than rejected.
 *
 * Returns { rows, unknownHeaders, missingRequired }.
 */
export async function parseExcelFile(file, columns) {
  const buffer = await file.arrayBuffer();
  const book = XLSX.read(buffer, { cellDates: true });
  const sheet = book.Sheets[book.SheetNames[0]];
  if (!sheet) return { rows: [], unknownHeaders: [], missingRequired: [] };

  // `defval: ''` keeps blank cells as empty strings so a row never silently
  // shifts its columns when a middle cell is empty.
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

  const norm = (s) => String(s).toLowerCase().replace(/[\s_\-.]+/g, '');
  const byHeader = new Map();
  columns.forEach((c) => {
    if (c.readOnly) return;
    byHeader.set(norm(c.label), c);
    (c.aliases || []).forEach((a) => byHeader.set(norm(a), c));
  });

  const unknownHeaders = new Set();
  const rows = raw.map((r) => {
    const out = {};
    Object.entries(r).forEach(([header, value]) => {
      const col = byHeader.get(norm(header));
      if (!col) {
        if (String(value).trim() !== '') unknownHeaders.add(header);
        return;
      }
      out[col.key] = typeof value === 'string' ? value.trim() : value;
    });
    return out;
  })
  // Drop rows that are entirely blank — trailing empty rows are extremely
  // common in hand-edited sheets and must not become empty records.
  .filter((r) => Object.values(r).some((v) => v !== '' && v != null));

  const present = new Set(rows.flatMap((r) => Object.keys(r)));
  const missingRequired = columns
    .filter((c) => c.required && !c.readOnly && !present.has(c.key))
    .map((c) => c.label);

  return { rows, unknownHeaders: [...unknownHeaders], missingRequired };
}

/**
 * Per-row validation against the schema. Returns [{ row, index, errors }].
 * Rows are validated before anything is sent, so the user sees every problem
 * at once rather than discovering them one failed request at a time.
 */
export function validateRows(rows, columns) {
  return rows.map((row, index) => {
    const errors = [];

    columns.forEach((c) => {
      if (c.readOnly) return;
      const value = row[c.key];
      const blank = value === '' || value == null;

      if (c.required && blank) {
        errors.push(`${c.label} is required`);
        return;
      }
      if (blank) return;

      if (c.type === 'number' && Number.isNaN(Number(value))) {
        errors.push(`${c.label} must be a number`);
      }
      if (c.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
        errors.push(`${c.label} is not a valid email`);
      }
      if (c.options && !c.options.some((o) => String(o).toLowerCase() === String(value).toLowerCase())) {
        errors.push(`${c.label} must be one of: ${c.options.join(', ')}`);
      }
    });

    return { row, index, errors };
  });
}

/** Coerce a validated row into the payload shape the create API expects. */
export function toPayload(row, columns) {
  const out = {};
  columns.forEach((c) => {
    if (c.readOnly) return;
    let v = row[c.key];
    if (v === '' || v == null) return;
    if (c.type === 'number') v = Number(v);
    if (c.options) {
      // Normalise to the exact casing the API stores, whatever the sheet said.
      v = c.options.find((o) => String(o).toLowerCase() === String(v).toLowerCase()) ?? v;
    }
    if (v instanceof Date) v = v.toISOString().slice(0, 10);
    out[c.key] = v;
  });
  return out;
}
