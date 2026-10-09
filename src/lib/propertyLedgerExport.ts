import type { LedgerReport } from '@/types/propertyLedger';

const escapeCsv = (value: unknown) => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const escapeXml = (value: unknown) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const propertyName = (value: unknown) => typeof value === 'object' && value && 'name' in value ? String(value.name) : '';
const apartmentName = (value: unknown) => typeof value === 'object' && value && 'apartmentNumber' in value ? String(value.apartmentNumber) : '';
const categoryName = (value: unknown) => typeof value === 'object' && value && 'name' in value ? String(value.name) : '';

const saveBlob = (content: BlobPart, type: string, filename: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  URL.revokeObjectURL(url);
};

type DetailRow = { period: string; kind: string; property: string; apartment: string; description: string; status: string; amount: number; receipt: string };
const detailRows = (report: LedgerReport): DetailRow[] => [
  ...report.rentBills.map((row) => ({ period: row.billingPeriod ?? '', kind: 'Rent', property: propertyName(row.propertyId), apartment: row.apartmentSnapshot.apartmentNumber, description: row.tenantSnapshot.name, status: row.status, amount: row.totalAmount, receipt: row.receiptNumber })),
  ...report.incomes.map((row) => ({ period: row.period, kind: 'Other income', property: propertyName(row.propertyId), apartment: apartmentName(row.apartmentId), description: row.title, status: row.status, amount: row.amount, receipt: '' })),
  ...report.expenses.map((row) => ({ period: row.period, kind: `Expense: ${categoryName(row.categoryId)}`, property: propertyName(row.propertyId), apartment: apartmentName(row.apartmentId), description: row.title, status: row.status, amount: row.amount ?? 0, receipt: '' })),
].sort((a, b) => a.period.localeCompare(b.period));

export const downloadLedgerCsv = (report: LedgerReport) => {
  const headers = ['Period', 'Type', 'Property', 'Apartment', 'Description', 'Status', 'Amount (BDT)', 'Receipt'];
  const rows = detailRows(report).map((row) => [row.period, row.kind, row.property, row.apartment, row.description, row.status, row.amount, row.receipt]);
  const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
  saveBlob(`\uFEFF${csv}`, 'text/csv;charset=utf-8', `property-ledger-${report.startPeriod}-to-${report.endPeriod}.csv`);
};

const xmlCell = (value: unknown, number = false) => `<Cell><Data ss:Type="${number ? 'Number' : 'String'}">${escapeXml(value)}</Data></Cell>`;
const xmlSheet = (name: string, rows: Array<Array<{ value: unknown; number?: boolean }>>) => `<Worksheet ss:Name="${escapeXml(name)}"><Table>${rows.map((row) => `<Row>${row.map((cell) => xmlCell(cell.value, cell.number)).join('')}</Row>`).join('')}</Table></Worksheet>`;

export const downloadLedgerExcel = (report: LedgerReport) => {
  const summary = [
    ['Metric', 'Amount (BDT)'],
    ['Rent billed', report.summary.rentBilled],
    ['Rent collected', report.summary.rentCollected],
    ['Other income', report.summary.otherIncome],
    ['Expenses paid', report.summary.expenses],
    ['Net cash flow', report.summary.netCashFlow],
  ].map((row, index) => row.map((value, column) => ({ value, number: index > 0 && column === 1 })));
  const monthly = [
    ['Period', 'Rent Billed', 'Rent Collected', 'Other Income', 'Expenses', 'Net Cash Flow'].map((value) => ({ value })),
    ...report.monthly.map((row) => [
      { value: row.period }, { value: row.rentBilled, number: true }, { value: row.rentCollected, number: true }, { value: row.otherIncome, number: true }, { value: row.expenses, number: true }, { value: row.netCashFlow, number: true },
    ]),
  ];
  const details = [
    ['Period', 'Type', 'Property', 'Apartment', 'Description', 'Status', 'Amount', 'Receipt'].map((value) => ({ value })),
    ...detailRows(report).map((row) => [
      { value: row.period }, { value: row.kind }, { value: row.property }, { value: row.apartment }, { value: row.description }, { value: row.status }, { value: row.amount, number: true }, { value: row.receipt },
    ]),
  ];
  const workbook = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">${xmlSheet('Summary', summary)}${xmlSheet('Monthly', monthly)}${xmlSheet('Transactions', details)}</Workbook>`;
  saveBlob(workbook, 'application/vnd.ms-excel', `property-ledger-${report.startPeriod}-to-${report.endPeriod}.xls`);
};

