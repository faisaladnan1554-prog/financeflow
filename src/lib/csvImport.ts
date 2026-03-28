import type { Transaction } from '../types';
import { generateId, todayISO } from './utils';

export interface CSVImportResult {
  transactions: Transaction[];
  errors: string[];
  total: number;
  success: number;
}

export function parseCSV(csvText: string, defaultAccountId: string): CSVImportResult {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    return { transactions: [], errors: ['CSV file must have a header row and at least one data row'], total: 0, success: 0 };
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  const dateIdx = headers.findIndex(h => h === 'date');
  const amountIdx = headers.findIndex(h => h === 'amount');
  const descIdx = headers.findIndex(h => ['description', 'desc', 'notes', 'memo'].includes(h));
  const typeIdx = headers.findIndex(h => h === 'type');
  const categoryIdx = headers.findIndex(h => h === 'category');

  if (dateIdx === -1 || amountIdx === -1) {
    return { transactions: [], errors: ['CSV must have "date" and "amount" columns'], total: 0, success: 0 };
  }

  const transactions: Transaction[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCSVLine(line);
    const dateRaw = cols[dateIdx]?.replace(/['"]/g, '').trim();
    const amountRaw = cols[amountIdx]?.replace(/['",$]/g, '').trim();
    const desc = cols[descIdx]?.replace(/['"]/g, '').trim() ?? '';
    const typeRaw = cols[typeIdx]?.replace(/['"]/g, '').trim().toLowerCase() ?? '';
    const category = cols[categoryIdx]?.replace(/['"]/g, '').trim() ?? 'cat_other_expense';

    const amount = parseFloat(amountRaw);
    if (isNaN(amount)) {
      errors.push(`Row ${i + 1}: Invalid amount "${amountRaw}"`);
      continue;
    }

    const date = parseDate(dateRaw);
    if (!date) {
      errors.push(`Row ${i + 1}: Invalid date "${dateRaw}"`);
      continue;
    }

    let type: 'income' | 'expense';
    if (typeRaw === 'income' || typeRaw === 'credit' || typeRaw === 'cr') {
      type = 'income';
    } else if (typeRaw === 'expense' || typeRaw === 'debit' || typeRaw === 'dr') {
      type = 'expense';
    } else {
      type = amount >= 0 ? 'income' : 'expense';
    }

    transactions.push({
      id: generateId(),
      type,
      amount: Math.abs(amount),
      date,
      category: category || (type === 'income' ? 'cat_other_income' : 'cat_other_expense'),
      accountId: defaultAccountId,
      notes: desc,
      createdAt: todayISO(),
    });
  }

  return { transactions, errors, total: lines.length - 1, success: transactions.length };
}

function parseCSVLine(line: string): string[] {
  const cols: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      cols.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  cols.push(current);
  return cols;
}

function parseDate(raw: string): string | null {
  if (!raw) return null;
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/,  // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // MM/DD/YYYY
    /^(\d{2})-(\d{2})-(\d{4})$/,   // MM-DD-YYYY
    /^(\d{2})\/(\d{2})\/(\d{2})$/,  // MM/DD/YY
  ];

  for (const fmt of formats) {
    const m = raw.match(fmt);
    if (m) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    }
  }

  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
}
