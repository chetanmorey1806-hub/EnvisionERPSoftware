import React, { useRef, useState } from 'react';
import Modal from './Modal';
import { Icons } from './icons';
import { useT } from '../../context/LanguageContext';
import { excelSchemas } from '../../config/excelSchemas';
import {
  exportToExcel, downloadTemplate, parseExcelFile, validateRows, toPayload,
} from '../../utils/excel';

/**
 * ExcelTools — Export / Template / Import, on any list screen.
 *
 *   <ExcelTools
 *     schema="students"          // key in config/excelSchemas
 *     rows={students}            // what Export writes
 *     onCreate={studentApi.create}   // omit to hide Import
 *     onDone={reload}
 *     variant="hero"             // glass buttons for a hero band
 *   />
 *
 * Import deliberately posts one record per request through the module's normal
 * create endpoint, rather than a bulk route. That means every row goes through
 * the same permission checks, validation and side effects (audit rows, welcome
 * emails, admission numbers) as a record typed in by hand — a bulk INSERT would
 * quietly skip all of it. The cost is one request per row, which is why the
 * progress bar and the per-row result report exist.
 */
const ExcelTools = ({
  schema,
  rows = [],
  onCreate,
  onDone,
  variant = 'default',
  filename,
  disabled = false,
}) => {
  const { t } = useT();
  const fileRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(null);   // { valid, invalid, unknownHeaders, missingRequired }
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [report, setReport] = useState(null);   // { created, failed: [{ line, reason }] }
  const [error, setError] = useState('');

  const def = excelSchemas[schema];
  if (!def) return null;

  const columns = def.columns;
  const base = filename || schema;

  const btn = variant === 'hero'
    ? 'erp-hero-btn px-3 py-2.5 min-h-11'
    : 'erp-btn-outline px-3 py-2 text-[11px]';

  /* ------------------------------------------------------------------ export */

  const doExport = () => {
    exportToExcel({ filename: base, sheetName: def.label, columns, rows });
  };

  const doTemplate = () => {
    downloadTemplate({ filename: base, sheetName: def.label, columns });
  };

  /* ------------------------------------------------------------------ import */

  const pickFile = () => {
    setError('');
    setParsed(null);
    setReport(null);
    fileRef.current?.click();
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';               // let the same file be re-picked after a fix
    if (!file) return;

    setParsing(true);
    setError('');
    try {
      const { rows: read, unknownHeaders, missingRequired } = await parseExcelFile(file, columns);
      if (read.length === 0) {
        setError(t('That file has no data rows. Download the template and fill it in.'));
        setParsing(false);
        return;
      }
      const checked = validateRows(read, columns);
      setParsed({
        valid: checked.filter((r) => r.errors.length === 0),
        invalid: checked.filter((r) => r.errors.length > 0),
        unknownHeaders,
        missingRequired,
      });
      setOpen(true);
    } catch (err) {
      setError(err?.message || t('Could not read that file. Is it a valid .xlsx?'));
    } finally {
      setParsing(false);
    }
  };

  const runImport = async () => {
    if (!parsed?.valid.length || !onCreate) return;
    setRunning(true);
    setProgress({ done: 0, total: parsed.valid.length });

    const failed = [];
    let created = 0;

    for (let i = 0; i < parsed.valid.length; i += 1) {
      const { row, index } = parsed.valid[i];
      try {
        await onCreate(toPayload(row, columns));
        created += 1;
      } catch (err) {
        failed.push({
          // +2 = one for the header row, one because spreadsheets are 1-based.
          line: index + 2,
          reason: err?.response?.data?.message || err?.message || t('Rejected by the server'),
        });
      }
      setProgress({ done: i + 1, total: parsed.valid.length });
    }

    setRunning(false);
    setReport({ created, failed });
    if (created > 0) onDone?.();
  };

  const close = () => {
    setOpen(false);
    setParsed(null);
    setReport(null);
    setProgress({ done: 0, total: 0 });
  };

  /* ------------------------------------------------------------------ render */

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={doExport}
          disabled={disabled || rows.length === 0}
          title={rows.length === 0 ? t('Nothing to export yet') : t('Download this list as Excel')}
          className={`${btn} disabled:opacity-50 disabled:pointer-events-none`}
        >
          <Icons.download size={15} aria-hidden="true" />
          <span className="hidden sm:inline">{t('Excel')}</span>
        </button>

        {onCreate && (
          <button
            type="button"
            onClick={pickFile}
            disabled={disabled || parsing}
            title={t('Bulk-add records from an Excel file')}
            className={`${btn} disabled:opacity-50 disabled:pointer-events-none`}
          >
            <Icons.upload size={15} aria-hidden="true" />
            <span className="hidden sm:inline">{parsing ? t('Reading…') : t('Import')}</span>
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={onFile}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {error && (
        <p className="mt-2 text-[11px] font-semibold text-rose-600 dark:text-rose-400">{error}</p>
      )}

      {open && (
        <Modal
          isOpen
          size="xl"
          title={report ? t('Import finished') : `${t('Import')} · ${t(def.label)}`}
          onClose={running ? () => {} : close}
          footer={
            report ? (
              <button onClick={close} className="erp-btn-primary px-4 py-2.5 text-xs">
                {t('Done')}
              </button>
            ) : (
              <>
                <button onClick={close} disabled={running} className="erp-btn-soft px-4 py-2.5 text-xs">
                  {t('Cancel')}
                </button>
                <button
                  onClick={runImport}
                  disabled={running || !parsed?.valid.length}
                  className="erp-btn-primary px-4 py-2.5 text-xs"
                >
                  {running
                    ? `${t('Importing')} ${progress.done}/${progress.total}…`
                    : `${t('Import')} ${parsed?.valid.length ?? 0} ${t('rows')}`}
                </button>
              </>
            )
          }
        >
          {/* ---------------- result ---------------- */}
          {report ? (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-900">
                  <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">{report.created}</p>
                  <p className="text-[11px] font-semibold text-emerald-700/80 dark:text-emerald-400">{t('added')}</p>
                </div>
                <div className={`flex-1 p-4 rounded-xl border ${
                  report.failed.length
                    ? 'bg-rose-50 dark:bg-rose-950/25 border-rose-200 dark:border-rose-900'
                    : 'bg-gray-50 dark:bg-slate-800/40 border-gray-200 dark:border-slate-800'
                }`}>
                  <p className={`text-2xl font-extrabold ${
                    report.failed.length ? 'text-rose-700 dark:text-rose-300' : 'text-gray-400'
                  }`}>
                    {report.failed.length}
                  </p>
                  <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400">{t('failed')}</p>
                </div>
              </div>

              {report.failed.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                    {t('Rows the server rejected')}
                  </p>
                  <ul className="space-y-1.5 max-h-56 overflow-y-auto">
                    {report.failed.map((f) => (
                      <li key={f.line} className="flex gap-2 text-xs">
                        <span className="shrink-0 font-mono font-bold text-rose-600">
                          {t('Row')} {f.line}
                        </span>
                        <span className="text-gray-600 dark:text-slate-400">{f.reason}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-gray-400 mt-2">
                    {t('Fix these rows in your sheet and import it again — the rows that already went in will not be duplicated by this list.')}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* ---------------- preview ---------------- */
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="status-pill bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900">
                  {parsed.valid.length} {t('ready')}
                </span>
                {parsed.invalid.length > 0 && (
                  <span className="status-pill bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900">
                    {parsed.invalid.length} {t('need fixing')}
                  </span>
                )}
              </div>

              {parsed.missingRequired.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300">
                  <b>{t('Missing columns')}:</b> {parsed.missingRequired.join(', ')}
                </div>
              )}

              {parsed.unknownHeaders.length > 0 && (
                <p className="text-[11px] text-gray-400">
                  {t('Ignored columns')}: {parsed.unknownHeaders.join(', ')}
                </p>
              )}

              {parsed.invalid.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                    {t('These rows will be skipped')}
                  </p>
                  <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                    {parsed.invalid.slice(0, 30).map((r) => (
                      <li key={r.index} className="flex gap-2 text-xs">
                        <span className="shrink-0 font-mono font-bold text-rose-600">
                          {t('Row')} {r.index + 2}
                        </span>
                        <span className="text-gray-600 dark:text-slate-400">{r.errors.join('; ')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {parsed.valid.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                    {t('Preview')} · {t('first rows')}
                  </p>
                  <div className="erp-card overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr>
                          {columns.filter((c) => !c.readOnly).slice(0, 6).map((c) => (
                            <th key={c.key} className="erp-table-th whitespace-nowrap">{c.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.valid.slice(0, 5).map((r) => (
                          <tr key={r.index}>
                            {columns.filter((c) => !c.readOnly).slice(0, 6).map((c) => (
                              <td key={c.key} className="erp-table-td whitespace-nowrap">
                                {String(r.row[c.key] ?? '—')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {running && (
                <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-brand-600 transition-all duration-200"
                    style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }}
                  />
                </div>
              )}

              <button
                onClick={doTemplate}
                className="text-[11px] font-bold text-brand-600 hover:underline inline-flex items-center gap-1"
              >
                <Icons.download size={12} aria-hidden="true" /> {t('Download blank template')}
              </button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
};

export default ExcelTools;
