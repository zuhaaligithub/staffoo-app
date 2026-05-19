// react-native-html-to-pdf v1.3.0 — correct import: named `generatePDF` function
import { generatePDF } from 'react-native-html-to-pdf';
import { Platform } from 'react-native';

// ─── Types ───────────────────────────────────────────────────────────────────

interface InvoiceItem {
  description: string;
  qty: number | string;
  rate: number | string;
}
interface ContactInfo {
  name?: string;
  email?: string;
  phone?: string;
  abn?: string;
}
interface PaymentMethods {
  bankTransfer?: boolean;
  bpay?: boolean;
  card?: boolean;
}
interface InvoiceData {
  invoiceNo: string | number;
  currency?: string;
  startDate: string;
  dueDate?: string;
  from: ContactInfo;
  to: ContactInfo;
  items: InvoiceItem[];
  subtotal: number;
  gstAmount?: number;
  lateFeeAmount?: number;
  grandTotal: number;
  includeGst?: boolean;
  gstPercent?: number;
  notes?: string;
  includeNotes?: boolean;
  paymentMethods?: PaymentMethods;
}
interface SigninDetails {
  signin_time?: string;
  signout_time?: string;
  location?: string;
  signout_location?: string;
  signin_notes?: string;
  signout_notes?: string;
}
interface ShiftReportData {
  siteName?: string;
  siteAddress?: string;
  guardName?: string;
  shiftStart?: string;
  shiftEnd?: string;
  totalHours?: number | string;
  jobStatus?: string;
  signinDetails?: SigninDetails;
}

// ─── Shared CSS ──────────────────────────────────────────────────────────────

const baseStyles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1e2937; font-size: 13px; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
  .tagline { font-size: 10px; color: #64748b; font-weight: bold; margin-top: 6px; }
  .header-title { text-align: right; }
  .header-title h1 { font-size: 30px; color: #1e2937; margin-bottom: 6px; }
  .meta-table { font-size: 11px; border-collapse: collapse; margin-left: auto; }
  .meta-table td { padding: 2px 4px; }
  .meta-label { color: #64748b; text-align: right; padding-right: 8px; }
  .meta-value { color: #1e2937; font-weight: bold; text-align: right; }
  .divider { border: none; border-top: 1px solid #e2e8f0; margin: 14px 0; }
  .two-col { display: flex; justify-content: space-between; margin-bottom: 24px; }
  .col { width: 48%; }
  .section-label { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 6px; }
  .col-name { font-size: 13px; font-weight: bold; color: #1e2937; margin-bottom: 4px; }
  .col-detail { font-size: 11px; color: #64748b; line-height: 1.7; }
  table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  table.data-table thead th { background-color: #f8fafc; color: #1e2937; font-size: 11px; font-weight: bold; padding: 10px 8px; text-align: left; border-bottom: 1px solid #e2e8f0; }
  table.data-table tbody td { font-size: 11px; color: #1e2937; padding: 10px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .footer-section { display: flex; justify-content: space-between; margin-top: 10px; }
  .notes-block { width: 50%; font-size: 11px; }
  .notes-block h4 { color: #1e2937; margin-bottom: 6px; font-size: 12px; }
  .notes-block p { color: #64748b; line-height: 1.6; }
  .payment-block { width: 50%; font-size: 11px; }
  .payment-block h4 { color: #1e2937; margin-bottom: 6px; font-size: 12px; }
  .payment-block p { color: #64748b; line-height: 1.8; }
  .totals-block { margin-left: auto; width: 220px; margin-top: 10px; }
  .totals-row { display: flex; justify-content: space-between; font-size: 11px; padding: 4px 0; color: #64748b; }
  .totals-row span:last-child { font-weight: bold; color: #1e2937; }
  .totals-row.red span { color: #ef4444 !important; }
  .totals-divider { border: none; border-top: 1.5px solid #0d6efd; margin: 6px 0; }
  .grand-total-row { display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; color: #0d6efd; padding: 4px 0; }
  .page-footer { text-align: center; margin-top: 50px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 14px; }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (value: number | string | undefined, currency = 'AUD') =>
  `${currency} ${Number(value || 0).toFixed(2)}`;

const todayStr = () => new Date().toLocaleDateString('en-AU');

const outputDir = () => (Platform.OS === 'android' ? 'Downloads' : 'Documents');

// ─── Invoice PDF ─────────────────────────────────────────────────────────────

const generateInvoicePDF = async (
  invoiceData: InvoiceData,
): Promise<string | undefined> => {
  const {
    invoiceNo,
    currency = 'AUD',
    startDate,
    dueDate,
    from,
    to,
    items,
    subtotal,
    gstAmount = 0,
    lateFeeAmount = 0,
    grandTotal,
    includeGst = false,
    gstPercent = 10,
    notes,
    includeNotes = false,
    paymentMethods,
  } = invoiceData;

  const tableRows = items
    .map(item => {
      const lineTotal = Number(item.qty || 0) * Number(item.rate || 0);
      return `<tr>
      <td>${item.description || '-'}</td>
      <td class="text-center">${Number(item.qty || 0).toFixed(2)}</td>
      <td class="text-right">${fmt(item.rate, currency)}</td>
      <td class="text-right">${fmt(lineTotal, currency)}</td>
    </tr>`;
    })
    .join('');

  const notesHTML =
    includeNotes && notes
      ? `<div class="notes-block"><h4>Notes</h4><p>${notes}</p></div>`
      : '';

  const paymentHTML = paymentMethods
    ? `<div class="payment-block"><h4>Payment Methods</h4><p>
        ${paymentMethods.bankTransfer ? '&#8226; Bank Transfer<br>' : ''}
        ${paymentMethods.bpay ? '&#8226; BPAY<br>' : ''}
        ${paymentMethods.card ? '&#8226; Credit / Debit Card' : ''}
       </p></div>`
    : '';

  const gstRow = includeGst
    ? `<div class="totals-row"><span>GST (${gstPercent}%)</span><span>${fmt(
        gstAmount,
        currency,
      )}</span></div>`
    : '';

  const lateFeeRow =
    lateFeeAmount > 0
      ? `<div class="totals-row red"><span>Late Fee</span><span>${fmt(
          lateFeeAmount,
          currency,
        )}</span></div>`
      : '';

  const html = `<html><head><meta charset="utf-8"><style>${baseStyles}</style></head><body>
    <div class="header">
      <div><div class="tagline">Professional Facility &amp; Workforce Services</div></div>
      <div class="header-title">
        <h1>INVOICE</h1>
        <table class="meta-table">
          <tr><td class="meta-label">Invoice No.</td><td class="meta-value">#${invoiceNo}</td></tr>
          <tr><td class="meta-label">Issue Date</td><td class="meta-value">${startDate}</td></tr>
          ${
            dueDate
              ? `<tr><td class="meta-label">Due Date</td><td class="meta-value">${dueDate}</td></tr>`
              : ''
          }
        </table>
      </div>
    </div>
    <hr class="divider"/>
    <div class="two-col">
      <div class="col">
        <div class="section-label">From</div>
        <div class="col-name">${from.name || 'Staffoo Facility Services'}</div>
        <div class="col-detail">
          ${from.email ? from.email + '<br>' : ''}
          ${from.phone ? from.phone + '<br>' : ''}
          ${from.abn ? 'ABN: ' + from.abn : ''}
        </div>
      </div>
      <div class="col">
        <div class="section-label">Billed To</div>
        <div class="col-name">${to.name || '-'}</div>
        <div class="col-detail">
          ${to.email ? to.email + '<br>' : ''}
          ${to.phone ? to.phone + '<br>' : ''}
          ${to.abn ? 'ABN: ' + to.abn : ''}
        </div>
      </div>
    </div>
    <table class="data-table">
      <thead><tr><th>Item</th><th class="text-center">Hours</th><th class="text-right">Price</th><th class="text-right">Total</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    <div class="footer-section">
      <div style="display:flex;gap:20px;">${notesHTML}${paymentHTML}</div>
      <div class="totals-block">
        <div class="totals-row"><span>Subtotal</span><span>${fmt(
          subtotal,
          currency,
        )}</span></div>
        ${gstRow}${lateFeeRow}
        <hr class="totals-divider"/>
        <div class="grand-total-row"><span>TOTAL AMOUNT</span><span>${fmt(
          grandTotal,
          currency,
        )}</span></div>
      </div>
    </div>
    <div class="page-footer">Thank you for choosing Staffo Facility Services.<br/>https://app.staffoo.com.au</div>
  </body></html>`;

  const result = await generatePDF({
    html,
    fileName: `Invoice_${invoiceNo}_${startDate.replace(/\//g, '-')}`,
    directory: outputDir(),
    width: 612,
    height: 792,
  });

  return result.filePath;
};

// ─── Shift Report PDF ─────────────────────────────────────────────────────────

const generateShiftReportPDF = async (
  reportData: ShiftReportData,
): Promise<string | undefined> => {
  const {
    siteName,
    siteAddress,
    guardName,
    shiftStart,
    shiftEnd,
    totalHours = 0,
    jobStatus,
    signinDetails,
  } = reportData;

  const logRows = signinDetails
    ? `
    <tr>
      <td style="color:#0d6efd;font-weight:bold;">Sign In</td>
      <td>${signinDetails.signin_time || '-'}</td>
      <td>${signinDetails.location || '-'}</td>
      <td>${signinDetails.signin_notes || 'No notes'}</td>
    </tr>
    <tr>
      <td style="color:#0d6efd;font-weight:bold;">Sign Out</td>
      <td>${signinDetails.signout_time || '-'}</td>
      <td>${signinDetails.location || '-'}</td>
      <td>${signinDetails.signout_notes || 'No notes'}</td>
    </tr>`
    : `<tr><td colspan="4" style="color:#64748b;padding:10px 8px;">No sign in data available</td></tr>`;

  const html = `<html><head><meta charset="utf-8"><style>${baseStyles}</style></head><body>
    <div class="header">
      <div><div class="tagline">Professional Facility &amp; Workforce Services</div></div>
      <div class="header-title">
        <h1>SHIFT REPORT</h1>
        <table class="meta-table">
          <tr><td class="meta-label">Status</td><td class="meta-value">${(
            jobStatus || 'PENDING'
          ).toUpperCase()}</td></tr>
          <tr><td class="meta-label">Total Hours</td><td class="meta-value">${totalHours} Hrs</td></tr>
          <tr><td class="meta-label">Date</td><td class="meta-value">${todayStr()}</td></tr>
        </table>
      </div>
    </div>
    <hr class="divider"/>
    <div class="two-col">
      <div class="col">
        <div class="section-label">Site Details</div>
        <div class="col-name">${siteName || 'N/A'}</div>
        <div class="col-detail">${siteAddress || ''}</div>
      </div>
      <div class="col">
        <div class="section-label">Assignment Details</div>
        <div class="col-name">Guard: ${guardName || 'Unassigned'}</div>
        <div class="col-detail">
          ${shiftStart ? 'Start: ' + shiftStart + '<br>' : ''}
          ${shiftEnd ? 'End: ' + shiftEnd : ''}
        </div>
      </div>
    </div>
    <table class="data-table">
      <thead><tr><th>Activity</th><th>Time</th><th>Coordinates / Location</th><th>Notes</th></tr></thead>
      <tbody>${logRows}</tbody>
    </table>
    <div style="text-align:right;font-size:15px;font-weight:bold;color:#0d6efd;margin-top:10px;">
      Total Hours: ${totalHours} hrs
    </div>
    <div class="page-footer">Thank you for choosing Staffo Facility Services.<br/>https://app.staffoo.com.au</div>
  </body></html>`;

  const result = await generatePDF({
    html,
    fileName: `ShiftReport_${siteName || 'Staffo'}_${new Date()
      .toISOString()
      .slice(0, 10)}`,
    directory: outputDir(),
    width: 612,
    height: 792,
  });

  return result.filePath;
};

// ─── Export ───────────────────────────────────────────────────────────────────

const PDFGenerator = {
  generateInvoicePDF,
  generateShiftReportPDF,
};

export default PDFGenerator;
