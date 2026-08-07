import React from 'react';
import { Icons } from '../../components/common/icons';

/** Extension → icon + colour, so a PDF reads differently from a spreadsheet. */
const KINDS = [
  { exts: ['pdf'], icon: Icons.admissions, cls: 'text-rose-500' },
  { exts: ['doc', 'docx', 'odt', 'rtf', 'txt', 'md'], icon: Icons.admissions, cls: 'text-brand-500' },
  { exts: ['xls', 'xlsx', 'csv', 'ods'], icon: Icons.reports, cls: 'text-emerald-500' },
  { exts: ['ppt', 'pptx', 'odp'], icon: Icons.faculty, cls: 'text-orange-500' },
  { exts: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'], icon: Icons.view, cls: 'text-violet-500' },
  { exts: ['zip', 'rar', '7z', 'tar', 'gz'], icon: Icons.inventory, cls: 'text-amber-600' },
  { exts: ['dwg', 'dxf'], icon: Icons.courses, cls: 'text-cyan-600' },
];

export const FileIcon = ({ ext, size = 22 }) => {
  const kind = KINDS.find((k) => k.exts.includes(String(ext || '').toLowerCase()));
  const Icon = kind?.icon || Icons.admissions;
  return <Icon size={size} className={`shrink-0 ${kind?.cls || 'text-gray-400'}`} />;
};

/** 1234567 -> "1.2 MB" */
export function formatSize(bytes) {
  const n = Number(bytes);
  if (!n) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1; }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

export default FileIcon;
