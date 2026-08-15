import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { SubscriptionDocument } from '@/modules/subscriptions/schemas/Subscription.schema';
import { IUser } from '@/modules/users/schemas/User.schema';
import { TIER_LABEL } from '@/modules/pricing/services/pricing.service';
import { PBT_LOGO_JPEG_BASE64 } from '@/assets/pbt-logo-base64';
import { config } from '@/config/environment';

const NAVY = '#130f40';
const SKY = '#1e8fc4';
const TEXT_MUTED = '#6b7280';
const BORDER = '#e5e7eb';
const PAGE_MARGIN = 48;
const PAGE_WIDTH = 595.28; // A4

/**
 * Only what's independently established elsewhere in this codebase (the
 * "support@propertybusinesstraining.com" copy in set-password-form.tsx, the
 * domain referenced throughout) makes it onto the receipt as company
 * contact info. No street address, company registration number, or phone
 * number is fabricated for this real financial document -- none exist
 * anywhere else in either repo to source from honestly.
 */
const COMPANY_NAME = 'Property Business Training (PBT)';
const COMPANY_WEBSITE = 'www.propertybusinesstraining.com';
const COMPANY_EMAIL = 'support@propertybusinesstraining.com';

function money(amount: number, currency: string): string {
  const symbol = currency.toUpperCase() === 'GBP' ? '£' : `${currency.toUpperCase()} `;
  return `${symbol}${amount.toFixed(2)}`;
}

function receiptNumber(sub: SubscriptionDocument): string {
  return `PBT-${sub.createdAt.getFullYear()}-${sub._id.toString().slice(-6).toUpperCase()}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Renders a branded payment receipt for one subscription/billing-history
 * record, in the style of the reference design supplied for this feature:
 * logo header, from/billed-to/receipt-number blocks, plan/period/status
 * tiles, a line-item table, and a footer with a QR link back to the
 * member's live subscription page.
 */
export async function generateReceiptPdf(sub: SubscriptionDocument, user: IUser): Promise<Buffer> {
  const qrDataUrl = await QRCode.toDataURL(`${config.FRONTEND_URL}/subscription`, {
    margin: 0,
    color: { dark: NAVY, light: '#ffffff' },
  });

  const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  const contentWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
  const logoBuffer = Buffer.from(PBT_LOGO_JPEG_BASE64, 'base64');

  // --- Header: logo + title ---
  doc.image(logoBuffer, PAGE_MARGIN, PAGE_MARGIN, { width: 64 });
  doc
    .fillColor(NAVY)
    .font('Helvetica-Bold')
    .fontSize(22)
    .text('PAYMENT RECEIPT', PAGE_MARGIN, PAGE_MARGIN + 4, { width: contentWidth, align: 'right' });
  doc
    .fillColor(TEXT_MUTED)
    .font('Helvetica')
    .fontSize(9)
    .text('Thank you for your payment. Your investment in your future is appreciated.', PAGE_MARGIN, PAGE_MARGIN + 30, {
      width: contentWidth,
      align: 'right',
    });

  let y = PAGE_MARGIN + 80;
  doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_MARGIN + contentWidth, y).lineWidth(1.5).strokeColor(SKY).stroke();
  y += 20;

  // --- FROM / BILLED TO / RECEIPT # ---
  const colWidth = contentWidth / 3 - 12;

  doc.fillColor(SKY).font('Helvetica-Bold').fontSize(9).text('FROM', PAGE_MARGIN, y);
  doc
    .fillColor('#111827')
    .font('Helvetica-Bold')
    .fontSize(10)
    .text(COMPANY_NAME, PAGE_MARGIN, y + 14, { width: colWidth });
  doc
    .fillColor(TEXT_MUTED)
    .font('Helvetica')
    .fontSize(9)
    .text(COMPANY_WEBSITE, PAGE_MARGIN, y + 40, { width: colWidth })
    .text(COMPANY_EMAIL, PAGE_MARGIN, y + 52, { width: colWidth });

  const col2X = PAGE_MARGIN + colWidth + 18;
  doc.fillColor(SKY).font('Helvetica-Bold').fontSize(9).text('BILLED TO', col2X, y);
  doc
    .fillColor('#111827')
    .font('Helvetica-Bold')
    .fontSize(10)
    .text(user.fullName, col2X, y + 14, { width: colWidth });
  const memberId = `PBT-M-${user._id.toString().slice(-6).toUpperCase()}`;
  doc
    .fillColor(TEXT_MUTED)
    .font('Helvetica')
    .fontSize(9)
    .text(`Member ID: ${memberId}`, col2X, y + 28, { width: colWidth })
    .text(user.email, col2X, y + 40, { width: colWidth });
  if (user.location) {
    doc.text(user.location, col2X, y + 52, { width: colWidth });
  }

  const col3X = PAGE_MARGIN + (colWidth + 18) * 2;
  const boxHeight = 62;
  doc.roundedRect(col3X, y - 4, colWidth + 12, boxHeight, 6).fillColor(NAVY).fill();
  doc
    .fillColor(SKY)
    .font('Helvetica-Bold')
    .fontSize(8)
    .text('RECEIPT #', col3X + 12, y + 6);
  doc
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .fontSize(11)
    .text(receiptNumber(sub), col3X + 12, y + 18, { width: colWidth - 12 });
  doc
    .fillColor(SKY)
    .font('Helvetica-Bold')
    .fontSize(8)
    .text('DATE ISSUED', col3X + 12, y + 38);
  doc
    .fillColor('#ffffff')
    .font('Helvetica')
    .fontSize(9)
    .text(formatDate(sub.createdAt), col3X + 12, y + 49, { width: colWidth - 12 });

  y += boxHeight + 24;

  // --- Info tiles: Membership Plan / Billing Period / Payment Method / Payment Status ---
  const tileGap = 10;
  const tileWidth = (contentWidth - tileGap * 3) / 4;
  const tileHeight = 56;
  const isPaid = sub.status !== 'pending';
  const tiles = [
    { label: 'MEMBERSHIP PLAN', value: TIER_LABEL[sub.tier] },
    {
      label: 'BILLING PERIOD',
      value: `${sub.startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - ${sub.endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    },
    { label: 'PAYMENT METHOD', value: 'Card' },
    { label: 'PAYMENT STATUS', value: isPaid ? 'PAID' : 'PENDING', accent: isPaid },
  ];

  tiles.forEach((tile, i) => {
    const x = PAGE_MARGIN + i * (tileWidth + tileGap);
    doc.roundedRect(x, y, tileWidth, tileHeight, 6).strokeColor(BORDER).lineWidth(1).stroke();
    doc.fillColor(TEXT_MUTED).font('Helvetica-Bold').fontSize(7).text(tile.label, x + 10, y + 10, { width: tileWidth - 20 });
    doc
      .fillColor(tile.accent ? '#16a34a' : '#111827')
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .text(tile.value, x + 10, y + 26, { width: tileWidth - 20 });
  });

  y += tileHeight + 28;

  // --- Line item table ---
  const cycleLabel = sub.billingCycle === 'monthly' ? 'Monthly' : 'Annual';
  const rowHeight = 22;
  const colDescW = contentWidth * 0.6;
  const colQtyW = contentWidth * 0.15;
  const colAmtW = contentWidth * 0.25;

  doc.rect(PAGE_MARGIN, y, contentWidth, rowHeight).fillColor(NAVY).fill();
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
  doc.text('DESCRIPTION', PAGE_MARGIN + 10, y + 7);
  doc.text('QTY', PAGE_MARGIN + colDescW, y + 7, { width: colQtyW, align: 'center' });
  doc.text('AMOUNT', PAGE_MARGIN + colDescW + colQtyW, y + 7, { width: colAmtW - 10, align: 'right' });
  y += rowHeight;

  const lineRowHeight = 32;
  doc.fillColor('#111827').font('Helvetica-Bold').fontSize(9.5);
  doc.text(`${TIER_LABEL[sub.tier]} – ${cycleLabel} Membership`, PAGE_MARGIN + 10, y + 6, { width: colDescW - 16 });
  doc
    .fillColor(TEXT_MUTED)
    .font('Helvetica')
    .fontSize(8)
    .text(`${sub.startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} – ${sub.endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, PAGE_MARGIN + 10, y + 19, { width: colDescW - 16 });
  doc.fillColor('#111827').font('Helvetica').fontSize(9.5).text('1', PAGE_MARGIN + colDescW, y + 10, { width: colQtyW, align: 'center' });
  doc
    .font('Helvetica-Bold')
    .text(money(sub.amount, sub.currency), PAGE_MARGIN + colDescW + colQtyW, y + 10, { width: colAmtW - 10, align: 'right' });
  y += lineRowHeight;

  doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_MARGIN + contentWidth, y).strokeColor(BORDER).lineWidth(1).stroke();
  y += 10;

  doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(9.5).text('Subtotal', PAGE_MARGIN + colDescW, y, { width: colQtyW, align: 'center' });
  doc.fillColor('#111827').font('Helvetica').text(money(sub.amount, sub.currency), PAGE_MARGIN + colDescW + colQtyW, y, { width: colAmtW - 10, align: 'right' });
  y += 22;

  const totalRowHeight = 30;
  doc.rect(PAGE_MARGIN, y, contentWidth, totalRowHeight).fillColor('#fdf3e0').fill();
  doc
    .fillColor(NAVY)
    .font('Helvetica-Bold')
    .fontSize(11)
    .text('TOTAL PAID', PAGE_MARGIN + 10, y + 8);
  doc
    .fillColor(NAVY)
    .font('Helvetica-Bold')
    .fontSize(13)
    .text(`${money(sub.amount, sub.currency)} (${sub.currency.toUpperCase()})`, PAGE_MARGIN + colDescW + colQtyW - 40, y + 7, { width: colAmtW + 30, align: 'right' });
  y += totalRowHeight + 30;

  // --- Footer: thank-you note + signature + QR ---
  const footerColWidth = contentWidth * 0.55;
  doc
    .fillColor('#111827')
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('Thank you for being a valued member of PBT.', PAGE_MARGIN, y, { width: footerColWidth });
  doc
    .fillColor(TEXT_MUTED)
    .font('Helvetica')
    .fontSize(8.5)
    .text(
      'Your subscription helps us continue to deliver world-class training, insights and opportunities to help you build lasting wealth through property.',
      PAGE_MARGIN,
      y + 16,
      { width: footerColWidth }
    );
  doc
    .fillColor(NAVY)
    .font('Helvetica-Oblique')
    .fontSize(11)
    .text('The PBT Team', PAGE_MARGIN, y + 58);

  const qrSize = 64;
  const qrX = PAGE_MARGIN + contentWidth - qrSize;
  doc
    .fillColor(TEXT_MUTED)
    .font('Helvetica')
    .fontSize(7)
    .text('Scan to view your subscription', qrX - 20, y, { width: qrSize + 40, align: 'center' });
  doc.image(qrDataUrl, qrX, y + 12, { width: qrSize, height: qrSize });

  y += 100;

  // --- Bottom contact bar ---
  const barHeight = 26;
  doc.rect(PAGE_MARGIN, y, contentWidth, barHeight).fillColor(NAVY).fill();
  doc
    .fillColor('#ffffff')
    .font('Helvetica')
    .fontSize(8)
    .text(`${COMPANY_WEBSITE}      ${COMPANY_EMAIL}`, PAGE_MARGIN + 12, y + 9, { width: contentWidth - 24 });

  y += barHeight + 10;
  doc
    .fillColor(TEXT_MUTED)
    .font('Helvetica')
    .fontSize(7)
    .text('This is a computer-generated receipt and does not require a signature.', PAGE_MARGIN, y, {
      width: contentWidth,
      align: 'center',
    });

  doc.end();
  return done;
}
