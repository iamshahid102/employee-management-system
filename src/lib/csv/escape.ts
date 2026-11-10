/**
 * Spreadsheet applications execute cells that start with these characters.
 * Prefixing with an apostrophe keeps the value readable and inert.
 */
const FORMULA_STARTERS = /^[=+\-@\t\r]/;

export function sanitizeSpreadsheetCell(value: string): string {
  return FORMULA_STARTERS.test(value) ? `'${value}` : value;
}

export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";

  const text = sanitizeSpreadsheetCell(String(value));

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function toCsv(headers: string[], rows: Array<Array<string | number | null>>): string {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];

  // CRLF keeps Excel, Numbers and LibreOffice happy.
  return `${lines.join("\r\n")}\r\n`;
}
