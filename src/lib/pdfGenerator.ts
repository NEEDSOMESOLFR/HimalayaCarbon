import { PurchaseReceipt } from '../types';
import {
  formatUtcDateTime,
  formatUtcDate,
  lamportsToSol,
  formatApproxUsd,
} from './receiptStorage';
import { ONCHAIN_BURN_ENABLED, RECIPIENT_ADDRESS } from '../config';

const HONESTY_FOOTER =
  'Demo document issued by the Himalaya Carbon prototype on Solana devnet. Devnet SOL has no monetary value. This is not a legal title, a registry entry, or a verified carbon offset claim.';

/**
 * Replace characters outside Latin-1 with '?'
 * to prevent jsPDF built-in fonts from garbling glyphs.
 */
function sanitizeLatin1(text?: string): string {
  if (!text) return '';
  return text.replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');
}

/**
 * Clean filename to [A-Za-z0-9._-]
 */
function sanitizeFilename(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]/g, '_');
}

/**
 * Returns RGB tuple for category
 */
function getCategoryRgb(category: string): [number, number, number] {
  const cat = category.toLowerCase();
  if (cat.includes('hydro')) {
    return [43, 108, 176]; // #2B6CB0
  }
  if (cat.includes('bio')) {
    return [92, 122, 74]; // #5C7A4A
  }
  return [27, 58, 47]; // #1B3A2F (forestry default)
}

function getCategoryDisplayLabel(category: string): string {
  const cat = category.toLowerCase();
  if (cat.includes('hydro')) return 'Hydropower';
  if (cat.includes('bio')) return 'Biogas';
  return 'Community Forestry';
}

/**
 * Generate and trigger download of PDF paperwork for a confirmed purchase
 */
export async function generatePurchasePdf(receipt: PurchaseReceipt): Promise<void> {
  // Dynamically import jsPDF and qrcode so they aren't in initial bundle
  const { jsPDF } = await import('jspdf');
  const QRCode = await import('qrcode');

  const totalPages = receipt.retire ? 3 : 2;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const sanitizedReceiptNo = sanitizeFilename(receipt.receiptNo);
  const fileName = `himalaya-carbon-receipt-${sanitizedReceiptNo}.pdf`;

  // Set document metadata
  doc.setProperties({
    title: `Himalaya Carbon Purchase Receipt ${receipt.receiptNo}`,
    subject: 'Solana Devnet Environmental Asset Purchase Receipt',
    author: 'Himalaya Carbon (devnet demo)',
    creator: 'Himalaya Carbon Prototype',
  });

  // Colors
  const textColor: [number, number, number] = [23, 36, 29]; // #17241D
  const forestColor: [number, number, number] = [27, 58, 47]; // #1B3A2F
  const hairlineColor: [number, number, number] = [220, 226, 222]; // RGB(220,226,222)
  const categoryRgb = getCategoryRgb(receipt.category);

  // Generate QR Code data URL (28mm square, M error correction)
  const explorerUrl = `https://explorer.solana.com/tx/${receipt.signature}?cluster=devnet`;
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(explorerUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 256,
    });
  } catch (qrErr) {
    console.warn('QR code generation failed:', qrErr);
  }

  const margin = 18;
  const pageWidth = 210;
  const pageHeight = 297;
  const contentWidth = pageWidth - margin * 2; // 174mm
  const rightMargin = pageWidth - margin; // 192mm

  // Helper for rendering standard honesty footer
  const renderFooter = (pageNumber: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...textColor);

    const footerText = doc.splitTextToSize(HONESTY_FOOTER, contentWidth - 24);
    doc.text(footerText, margin, pageHeight - 14, { align: 'left', lineHeightFactor: 1.25 });

    doc.text(`Page ${pageNumber} of ${totalPages}`, rightMargin, pageHeight - 12, {
      align: 'right',
    });
  };

  // =========================================================================
  // PAGE 1: PURCHASE RECEIPT
  // =========================================================================

  // 1. Header: 12mm rounded square in forest with white mountain lines
  doc.setFillColor(...forestColor);
  doc.roundedRect(margin, margin, 12, 12, 2, 2, 'F');

  // Draw white mountain icon inside 12mm square
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.6);
  // Left peak
  doc.line(margin + 2.5, margin + 9.5, margin + 5.5, margin + 4.2);
  doc.line(margin + 5.5, margin + 4.2, margin + 8.5, margin + 9.5);
  // Right peak
  doc.line(margin + 6.5, margin + 7.5, margin + 8.8, margin + 4.8);
  doc.line(margin + 8.8, margin + 4.8, margin + 10.2, margin + 8.5);

  // "Himalaya Carbon" in times bold 16pt beside logo
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...textColor);
  doc.text('Himalaya Carbon', margin + 15, margin + 8);

  // Right-aligned header: "PURCHASE RECEIPT", receipt no, date
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('P U R C H A S E   R E C E I P T', rightMargin, margin + 4, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Receipt no. ${receipt.receiptNo}`, rightMargin, margin + 9, { align: 'right' });

  const issuedTimeStr = `Issued ${formatUtcDateTime(receipt.blockTime)}${
    receipt.isApproximateTime ? ' (Time approximate)' : ''
  }`;
  doc.text(issuedTimeStr, rightMargin, margin + 13.5, { align: 'right' });

  // Hairline under header
  let y = margin + 17;
  doc.setDrawColor(...hairlineColor);
  doc.setLineWidth(0.25);
  doc.line(margin, y, rightMargin, y);

  // 2. Two columns under hairline: "Paid by" and "Paid to"
  y += 6;
  const colWidth = (contentWidth - 8) / 2;
  const col2X = margin + colWidth + 8;

  // Left column: Paid by
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Paid by', margin, y);

  doc.setFont('courier', 'normal');
  doc.setFontSize(8.5);
  const buyerLines = doc.splitTextToSize(receipt.buyer, colWidth);
  doc.text(buyerLines, margin, y + 4.5);

  // Right column: Paid to
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Paid to', col2X, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Himalaya Carbon devnet wallet', col2X, y + 4.5);

  doc.setFont('courier', 'normal');
  doc.setFontSize(8.5);
  const recipientAddr = receipt.recipient || RECIPIENT_ADDRESS;
  const recipientLines = doc.splitTextToSize(recipientAddr, colWidth);
  doc.text(recipientLines, col2X, y + 9);

  y += 20;

  // Hairline under columns
  doc.setDrawColor(...hairlineColor);
  doc.setLineWidth(0.25);
  doc.line(margin, y, rightMargin, y);

  // 3. Line-item table
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...forestColor);

  const colX = {
    desc: margin,
    qty: margin + 90,
    unit: margin + 118,
    amount: rightMargin,
  };

  doc.text('Description', colX.desc, y);
  doc.text('Qty (tCO2e)', colX.qty, y);
  doc.text('Unit price (SOL)', colX.unit, y);
  doc.text('Amount (SOL)', colX.amount, y, { align: 'right' });

  y += 2.5;
  doc.setDrawColor(...hairlineColor);
  doc.setLineWidth(0.2);
  doc.line(margin, y, rightMargin, y);

  // First row: project name + category/province
  y += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...textColor);
  doc.text(receipt.projectName, colX.desc, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${receipt.qty.toLocaleString()}`, colX.qty, y);

  const unitSol = lamportsToSol(receipt.unitPriceLamports, 6);
  doc.text(unitSol, colX.unit, y);

  // Subtotal lamports = qty * unitPriceLamports
  let subtotalLamports = BigInt(0);
  try {
    subtotalLamports = BigInt(receipt.unitPriceLamports) * BigInt(receipt.qty);
  } catch {
    subtotalLamports = BigInt(receipt.totalLamports);
  }
  const subtotalSol = lamportsToSol(subtotalLamports.toString(), 4);
  doc.text(subtotalSol, colX.amount, y, { align: 'right' });

  // Subtext under project name
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(85, 105, 94);
  const catLabel = getCategoryDisplayLabel(receipt.category);
  doc.text(`${catLabel} - ${receipt.province} Province, Nepal`, colX.desc, y);

  y += 4.5;
  doc.setDrawColor(...hairlineColor);
  doc.setLineWidth(0.2);
  doc.line(margin, y, rightMargin, y);

  // Network fee row (only if feeLamports is known)
  if (receipt.feeLamports && BigInt(receipt.feeLamports) > BigInt(0)) {
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...textColor);
    doc.text('Network fee (Solana devnet transaction fee)', colX.desc, y);
    doc.text('1 tx', colX.qty, y);
    doc.text('-', colX.unit, y);
    const feeSol = lamportsToSol(receipt.feeLamports, 6);
    doc.text(feeSol, colX.amount, y, { align: 'right' });

    y += 3;
    doc.setDrawColor(...hairlineColor);
    doc.setLineWidth(0.2);
    doc.line(margin, y, rightMargin, y);
  }

  // Bold "Total" row
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...textColor);
  doc.text('Total', colX.desc, y);

  const totalSol = lamportsToSol(receipt.totalLamports, 4);
  doc.text(`${totalSol} SOL`, colX.amount, y, { align: 'right' });

  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(85, 105, 94);
  const usdText = formatApproxUsd(receipt.totalLamports, receipt.demoSolUsd);
  doc.text(usdText, colX.amount, y, { align: 'right' });

  y += 5;
  doc.setDrawColor(...hairlineColor);
  doc.setLineWidth(0.25);
  doc.line(margin, y, rightMargin, y);

  // 4. "Payment details" block
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...textColor);
  doc.text('Payment details', margin, y);

  const detailsStartY = y + 5;
  const detailsColWidth = contentWidth - 36; // leave room for 28mm QR code

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  let dy = detailsStartY;
  doc.text('Network:', margin, dy);
  doc.text('Solana devnet', margin + 28, dy);

  dy += 5;
  doc.text('Status:', margin, dy);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(62, 85, 49); // green
  doc.text('Confirmed', margin + 28, dy);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);

  dy += 5;
  doc.text('Slot:', margin, dy);
  doc.text(String(receipt.slot), margin + 28, dy);

  dy += 5;
  doc.text('Signature:', margin, dy);
  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  const sigLines = doc.splitTextToSize(receipt.signature, detailsColWidth - 28);
  doc.text(sigLines, margin + 28, dy);

  // QR code on the right (28mm square)
  if (qrDataUrl) {
    const qrX = rightMargin - 28;
    const qrY = detailsStartY - 1;
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, 28, 28);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(85, 105, 94);
    doc.text('Scan to verify on Solana Explorer', qrX + 14, qrY + 31, { align: 'center' });

    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    doc.text(`explorer.solana.com/tx/${receipt.signature.slice(0, 14)}...`, qrX + 14, qrY + 34, {
      align: 'center',
    });
  }

  // Page 1 footer
  renderFooter(1);

  // =========================================================================
  // PAGE 2: CERTIFICATE OF PURCHASE
  // =========================================================================
  doc.addPage();

  // Double border:
  // Outer 0.6mm in category accent color, 8mm inset
  // Inner 0.2mm hairline, inset 10.5mm
  const certInset = 8;
  const innerInset = 10.5;

  doc.setDrawColor(...categoryRgb);
  doc.setLineWidth(0.6);
  doc.rect(certInset, certInset, pageWidth - certInset * 2, pageHeight - certInset * 2);

  doc.setDrawColor(...hairlineColor);
  doc.setLineWidth(0.2);
  doc.rect(innerInset, innerInset, pageWidth - innerInset * 2, pageHeight - innerInset * 2);

  // Top: small caps "H I M A L A Y A   C A R B O N" (helvetica 9pt)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...categoryRgb);
  doc.text('H I M A L A Y A   C A R B O N', pageWidth / 2, 28, { align: 'center' });

  // "Certificate of Purchase" in times 30pt
  doc.setFont('times', 'bold');
  doc.setFontSize(30);
  doc.setTextColor(...textColor);
  doc.text('Certificate of Purchase', pageWidth / 2, 42, { align: 'center' });

  // 40mm rule in accent color beneath
  doc.setDrawColor(...categoryRgb);
  doc.setLineWidth(0.8);
  doc.line(pageWidth / 2 - 20, 48, pageWidth / 2 + 20, 48);

  // Statement: "This certifies that wallet {buyer} purchased"
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...textColor);
  doc.text('This certifies that wallet', pageWidth / 2, 64, { align: 'center' });

  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  const certBuyerLines = doc.splitTextToSize(receipt.buyer, 130);
  doc.text(certBuyerLines, pageWidth / 2, 71, { align: 'center' });

  const afterBuyerY = 71 + certBuyerLines.length * 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('purchased', pageWidth / 2, afterBuyerY + 2, { align: 'center' });

  // Large centered figure: "{qty}" in times bold 54pt
  doc.setFont('times', 'bold');
  doc.setFontSize(54);
  doc.setTextColor(...categoryRgb);
  doc.text(receipt.qty.toLocaleString(), pageWidth / 2, afterBuyerY + 28, { align: 'center' });

  // "tCO2e of {category} credits" in helvetica 12pt
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...textColor);
  doc.text(`tCO2e of ${catLabel.toLowerCase()} credits`, pageWidth / 2, afterBuyerY + 36, {
    align: 'center',
  });

  // "from {projectName}, {province} Province, Nepal"
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(
    `from ${receipt.projectName}, ${receipt.province} Province, Nepal`,
    pageWidth / 2,
    afterBuyerY + 46,
    { align: 'center' }
  );

  // "on {date UTC}, recorded by Solana devnet transaction {first 8 chars of signature}..."
  const certDate = formatUtcDate(receipt.blockTime);
  const sigShort = receipt.signature.slice(0, 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    `on ${certDate}, recorded by Solana devnet transaction ${sigShort}...`,
    pageWidth / 2,
    afterBuyerY + 53,
    { align: 'center' }
  );

  // Bottom row:
  // left: "Certificate no. {receiptNo}"
  // center: QR code (28mm square) with caption
  // right: "Network: Solana devnet"
  const certBottomY = 230;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...textColor);
  doc.text(`Certificate no. ${receipt.receiptNo}`, margin + 2, certBottomY + 12);

  doc.text('Network: Solana devnet', rightMargin - 2, certBottomY + 12, { align: 'right' });

  if (qrDataUrl) {
    const certQrX = pageWidth / 2 - 14;
    doc.addImage(qrDataUrl, 'PNG', certQrX, certBottomY - 6, 28, 28);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(85, 105, 94);
    doc.text('Scan to verify on Solana Explorer', pageWidth / 2, certBottomY + 25, {
      align: 'center',
    });

    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    doc.text(
      `https://explorer.solana.com/tx/${receipt.signature.slice(0, 16)}...`,
      pageWidth / 2,
      certBottomY + 28,
      { align: 'center' }
    );
  }

  // Page 2 footer inside inner border
  renderFooter(2);

  // =========================================================================
  // PAGE 3 (ONLY IF retire === true): RETIREMENT STATEMENT
  // =========================================================================
  if (receipt.retire) {
    doc.addPage();

    // Title: "Retirement Statement" (times 24pt)
    doc.setFont('times', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(...textColor);
    doc.text('Retirement Statement', margin, margin + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(85, 105, 94);
    doc.text(`Receipt no. ${receipt.receiptNo}`, rightMargin, margin + 4, { align: 'right' });
    doc.text(`Issued ${formatUtcDateTime(receipt.blockTime)}`, rightMargin, margin + 8.5, {
      align: 'right',
    });

    // Hairline under header
    let p3Y = margin + 14;
    doc.setDrawColor(...hairlineColor);
    doc.setLineWidth(0.25);
    doc.line(margin, p3Y, rightMargin, p3Y);

    p3Y += 10;

    // Fields: Quantity retired
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...forestColor);
    doc.text('Quantity Retired', margin, p3Y);

    doc.setFont('times', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...textColor);
    doc.text(`${receipt.qty.toLocaleString()} tCO2e`, margin, p3Y + 8);

    p3Y += 16;
    doc.setDrawColor(...hairlineColor);
    doc.setLineWidth(0.2);
    doc.line(margin, p3Y, rightMargin, p3Y);

    p3Y += 8;
    // Project
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...forestColor);
    doc.text('Project', margin, p3Y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(...textColor);
    doc.text(
      `${receipt.projectName} (${receipt.province} Province, Nepal)`,
      margin,
      p3Y + 5.5
    );

    p3Y += 14;
    doc.setDrawColor(...hairlineColor);
    doc.setLineWidth(0.2);
    doc.line(margin, p3Y, rightMargin, p3Y);

    p3Y += 8;
    // Beneficiary (wrapped, sanitized)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...forestColor);
    doc.text('Beneficiary', margin, p3Y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    const beneficiaryText = sanitizeLatin1(receipt.beneficiary?.trim()) || 'Anonymous Offset';
    const benLines = doc.splitTextToSize(beneficiaryText, contentWidth - 36);
    doc.text(benLines, margin, p3Y + 5.5);

    p3Y += 9 + benLines.length * 4;
    doc.setDrawColor(...hairlineColor);
    doc.setLineWidth(0.2);
    doc.line(margin, p3Y, rightMargin, p3Y);

    p3Y += 8;
    // Purpose (wrapped, sanitized)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...forestColor);
    doc.text('Purpose / Retirement Reason', margin, p3Y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    const purposeText = sanitizeLatin1(receipt.purpose?.trim()) || 'Not provided';
    const purpLines = doc.splitTextToSize(purposeText, contentWidth - 36);
    doc.text(purpLines, margin, p3Y + 5.5);

    p3Y += 9 + purpLines.length * 4;
    doc.setDrawColor(...hairlineColor);
    doc.setLineWidth(0.2);
    doc.line(margin, p3Y, rightMargin, p3Y);

    p3Y += 8;
    // Transaction signature
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...forestColor);
    doc.text('Transaction Signature', margin, p3Y);

    doc.setFont('courier', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...textColor);
    const p3SigLines = doc.splitTextToSize(receipt.signature, contentWidth - 36);
    doc.text(p3SigLines, margin, p3Y + 5);

    p3Y += 8 + p3SigLines.length * 4;

    // Status sentence depends on ONCHAIN_BURN_ENABLED
    const statusSentence = ONCHAIN_BURN_ENABLED
      ? 'These credits were burned on-chain in the transaction shown above.'
      : 'This retirement is recorded in this receipt. On-chain burning is available once the registry program is live.';

    p3Y += 6;
    doc.setFillColor(238, 242, 231); // var(--moss-tint)
    doc.roundedRect(margin, p3Y, contentWidth, 14, 2, 2, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(62, 85, 49);
    doc.text(statusSentence, margin + 4, p3Y + 9);

    // QR code placed in bottom right
    if (qrDataUrl) {
      const p3QrX = rightMargin - 28;
      const p3QrY = p3Y + 22;
      doc.addImage(qrDataUrl, 'PNG', p3QrX, p3QrY, 28, 28);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(85, 105, 94);
      doc.text('Scan to verify on Solana Explorer', p3QrX + 14, p3QrY + 31, { align: 'center' });

      doc.setFont('courier', 'normal');
      doc.setFontSize(6.5);
      doc.text(
        `explorer.solana.com/tx/${receipt.signature.slice(0, 14)}...`,
        p3QrX + 14,
        p3QrY + 34,
        { align: 'center' }
      );
    }

    // Page 3 footer
    renderFooter(3);
  }

  // Save the document or fallback on mobile Safari
  try {
    doc.save(fileName);
  } catch (saveErr) {
    console.warn('doc.save() encountered issue, attempting blob fallback:', saveErr);
    try {
      const blobUrl = doc.output('bloburl');
      if (blobUrl) {
        window.open(blobUrl as unknown as string, '_blank');
      }
    } catch (blobErr) {
      console.error('Blob URL fallback failed:', blobErr);
      throw saveErr;
    }
  }
}
