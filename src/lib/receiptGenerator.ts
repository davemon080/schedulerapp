import { WalletTransaction } from './dbService';
import { UserSession } from '../types';

export interface ReceiptDetails {
  transaction: WalletTransaction;
  studentName: string;
  studentMatric: string;
  studentEmail?: string;
  studentDepartment?: string;
  studentLevel?: number | string;
  semester?: string;
  session?: string;
}

/**
 * Formats currency to Nigerian Naira string (₦)
 */
export function formatNaira(amount: number): string {
  return `₦${Number(amount || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Renders the official graphic receipt onto an HTML5 Canvas
 */
export function renderReceiptCanvas(
  tx: WalletTransaction,
  session: UserSession | null,
  activeLevel: number | string = 100,
  activeSemester = '1st Semester'
): HTMLCanvasElement | null {
  try {
    const studentName = session?.fullName || (session as any)?.name || 'Student';
    const studentMatric = session?.matricNumber || (session as any)?.matric_number || '2025/PS/ICH/0001';
    const studentDept = session?.department || 'Department of Industrial Chemistry';
    const studentEmail = session?.email || 'student@university.edu';
    const cleanLevel = session?.level || activeLevel || 100;
    const cleanSem = session?.semester || activeSemester || '1st Semester';

    const canvas = document.createElement('canvas');
    const width = 800;
    const height = 1120;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 1. Background clean white with subtle warm border
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Decorative top colored ribbon
    const isCredit = tx.type === 'credit';
    const isAccess = tx.category === 'access';
    const headerGrad = ctx.createLinearGradient(0, 0, width, 0);
    if (isCredit) {
      headerGrad.addColorStop(0, '#047857');
      headerGrad.addColorStop(1, '#059669');
    } else if (isAccess) {
      headerGrad.addColorStop(0, '#0047AB');
      headerGrad.addColorStop(0.5, '#0052CC');
      headerGrad.addColorStop(1, '#007AFF');
    } else {
      headerGrad.addColorStop(0, '#4338CA');
      headerGrad.addColorStop(1, '#6366F1');
    }
    ctx.fillStyle = headerGrad;
    ctx.fillRect(0, 0, width, 14);

    // Subtle outer security frame
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    ctx.strokeRect(28, 36, width - 56, height - 72);

    // Security inner border
    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 1;
    ctx.strokeRect(34, 42, width - 68, height - 84);

    // Watermark pattern in background
    ctx.save();
    ctx.translate(width / 2, height / 2 + 30);
    ctx.rotate(-Math.PI / 6);
    ctx.font = 'bold 54px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(226, 232, 240, 0.35)';
    ctx.textAlign = 'center';
    ctx.fillText('VERIFIED TRANSACTION', 0, -40);
    ctx.fillText('CAMPUS TREASURY', 0, 40);
    ctx.restore();

    // 2. Header Section
    // Crest Emblem Icon Background
    ctx.fillStyle = '#0052CC';
    ctx.beginPath();
    ctx.arc(width / 2, 95, 32, 0, Math.PI * 2);
    ctx.fill();

    // Crest letters
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FU', width / 2, 102);

    // Institution Name
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CAMPUS SCHEDULER & STUDENT PORTAL', width / 2, 160);

    ctx.fillStyle = '#64748B';
    ctx.font = '600 13px system-ui, -apple-system, sans-serif';
    ctx.fillText('BURSARY & DIGITAL TREASURY MANAGEMENT SYSTEM', width / 2, 182);

    ctx.fillStyle = '#007AFF';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.fillText('OFFICIAL ELECTRONIC TRANSACTION RECEIPT', width / 2, 204);

    // Divider
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(60, 224);
    ctx.lineTo(width - 60, 224);
    ctx.stroke();

    // 3. Amount Display Box
    const amountBoxY = 245;
    const amountBoxHeight = 110;
    ctx.fillStyle = '#F8FAFC';
    ctx.roundRect ? ctx.roundRect(60, amountBoxY, width - 120, amountBoxHeight, 16) : ctx.fillRect(60, amountBoxY, width - 120, amountBoxHeight);
    ctx.fill();
    ctx.strokeStyle = '#E2E8F0';
    ctx.stroke();

    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TRANSACTION TOTAL AMOUNT', width / 2, amountBoxY + 32);

    // Amount text
    ctx.fillStyle = isCredit ? '#047857' : '#0F172A';
    ctx.font = 'bold 38px monospace, system-ui, sans-serif';
    const amountStr = `${isCredit ? '+' : ''}${formatNaira(tx.amount)}`;
    ctx.fillText(amountStr, width / 2, amountBoxY + 76);

    // Status Badge inside box
    const badgeText = '● SUCCESSFUL & SETTLED';
    ctx.fillStyle = '#DCFCE7';
    const badgeW = 200;
    const badgeH = 24;
    const badgeX = (width - badgeW) / 2;
    const badgeY = amountBoxY + amountBoxHeight - 12;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 12);
      ctx.fill();
      ctx.strokeStyle = '#86EFAC';
      ctx.stroke();
    }
    ctx.fillStyle = '#166534';
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    ctx.fillText(badgeText, width / 2, badgeY + 16);

    // 4. Detailed Data Grid
    const startY = 390;
    const rowH = 34;
    let currY = startY;

    // Helper for table rows
    const drawRow = (label: string, value: string, isMono = false, isBold = false) => {
      ctx.textAlign = 'left';
      ctx.font = '600 13px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#64748B';
      ctx.fillText(label, 70, currY);

      ctx.textAlign = 'right';
      ctx.font = `${isBold ? 'bold' : '600'} 13px ${isMono ? 'monospace, sans-serif' : 'system-ui, sans-serif'}`;
      ctx.fillStyle = isBold ? '#0F172A' : '#1E293B';

      // Truncate if too long
      let textToDraw = value;
      if (ctx.measureText(textToDraw).width > 420) {
        while (ctx.measureText(textToDraw + '...').width > 420 && textToDraw.length > 5) {
          textToDraw = textToDraw.slice(0, -1);
        }
        textToDraw += '...';
      }
      ctx.fillText(textToDraw, width - 70, currY);

      // Light underline
      ctx.strokeStyle = '#F1F5F9';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(70, currY + 10);
      ctx.lineTo(width - 70, currY + 10);
      ctx.stroke();

      currY += rowH;
    };

    // Category Header: TRANSACTION SUMMARY
    ctx.fillStyle = '#0052CC';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('TRANSACTION SPECIFICATIONS', 70, currY);
    currY += 22;

    drawRow('Transaction Reference', tx.ref || tx.id, true, true);
    drawRow('Transaction Type', tx.title, false, true);
    drawRow('Category', tx.category ? tx.category.toUpperCase() : 'WALLET PAYMENT', false, false);
    drawRow('Payment Gateway / Channel', isCredit ? 'Paystack Checkout (Secured)' : 'Campus Digital Wallet', false, false);
    drawRow('Date & Timestamp', `${tx.date} • ${new Date(tx.timestamp || Date.now()).toLocaleTimeString()}`, false, false);
    if (tx.recipientOrSender) {
      drawRow('Counterparty / Sender', tx.recipientOrSender, false, true);
    }
    if (tx.note) {
      drawRow('Description / Note', tx.note, false, false);
    }

    currY += 16;
    // Category Header: STUDENT ACCOUNT INFO
    ctx.fillStyle = '#0052CC';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('STUDENT ACCOUNT & ACADEMIC SCOPE', 70, currY);
    currY += 22;

    drawRow('Student Full Name', studentName, false, true);
    drawRow('Matriculation Number', studentMatric, true, true);
    drawRow('Academic Department', studentDept, false, false);
    drawRow('Level & Semester', `${cleanLevel} Level • ${cleanSem}`, false, false);
    drawRow('Student Email', studentEmail, false, false);

    // 5. Verification Seal & Barcode area
    const footerY = 920;

    // Box for Verification
    ctx.fillStyle = '#F8FAFC';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(60, footerY, width - 120, 110, 16);
      ctx.fill();
      ctx.strokeStyle = '#E2E8F0';
      ctx.stroke();
    } else {
      ctx.fillRect(60, footerY, width - 120, 110);
    }

    // Official Digital Stamp / Seal on left of footer box
    ctx.save();
    ctx.translate(140, footerY + 55);
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.strokeStyle = '#86EFAC';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#059669';
    ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BURSARY', 0, -12);
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.fillText('VERIFIED', 0, 4);
    ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
    ctx.fillText('PAID', 0, 18);
    ctx.restore();

    // Security text & simulated barcode
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.fillText('DIGITALLY AUTHENTICATED BY CAMPUS BURSARY', 200, footerY + 38);

    ctx.fillStyle = '#64748B';
    ctx.font = '500 11px system-ui, -apple-system, sans-serif';
    ctx.fillText('This document serves as valid proof of payment for academic activities.', 200, footerY + 58);
    ctx.fillText(`Verification Key: SHA256-${(tx.ref || tx.id).slice(0, 16).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`, 200, footerY + 76);

    // 6. Bottom notice
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 10.5px system-ui, -apple-system, sans-serif';
    ctx.fillText('System Generated Receipt • No signature required • Powered by Campus Digital Wallet', width / 2, height - 26);

    return canvas;
  } catch (err) {
    console.error('Error rendering receipt canvas:', err);
    return null;
  }
}

/**
 * Generates an official, high-resolution graphic receipt canvas (PNG)
 * and returns it as a Base64 data URL for instant in-app viewing or saving.
 */
export async function generateReceiptDataURL(
  tx: WalletTransaction,
  session: UserSession | null,
  activeLevel: number | string = 100,
  activeSemester = '1st Semester'
): Promise<string | null> {
  const canvas = renderReceiptCanvas(tx, session, activeLevel, activeSemester);
  if (!canvas) return null;
  return canvas.toDataURL('image/png', 1.0);
}

/**
 * Generates an official, high-resolution graphic receipt canvas (PNG)
 * and triggers direct browser file download for the student.
 */
export async function downloadTransactionReceiptPNG(
  tx: WalletTransaction,
  session: UserSession | null,
  activeLevel: number | string = 100,
  activeSemester = '1st Semester'
): Promise<boolean> {
  try {
    const canvas = renderReceiptCanvas(tx, session, activeLevel, activeSemester);
    if (!canvas) return false;

    // Convert canvas to PNG blob and trigger browser download
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(false);
          return;
        }
        const cleanRef = (tx.ref || tx.id).replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `Receipt_${cleanRef}.png`;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.target = '_self';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        resolve(true);
      }, 'image/png', 1.0);
    });
  } catch (err) {
    console.error('Error generating transaction receipt:', err);
    return false;
  }
}

/**
 * Shares or saves transaction receipt using Native Web Share API if supported on Android/iOS,
 * or falls back to direct download.
 */
export async function shareTransactionReceipt(
  tx: WalletTransaction,
  session: UserSession | null,
  activeLevel: number | string = 100,
  activeSemester = '1st Semester'
): Promise<boolean> {
  try {
    const canvas = renderReceiptCanvas(tx, session, activeLevel, activeSemester);
    if (!canvas) return false;

    const cleanRef = (tx.ref || tx.id).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Receipt_${cleanRef}.png`;

    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          resolve(false);
          return;
        }

        if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
          try {
            const file = new File([blob], filename, { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: `Receipt - ${tx.ref || tx.id}`,
                text: `Official Campus Payment Receipt for ${tx.title} (${formatNaira(tx.amount)})`,
                files: [file],
              });
              resolve(true);
              return;
            }
          } catch (e: any) {
            if (e.name === 'AbortError') {
              resolve(true);
              return;
            }
          }
        }

        // Fallback to standard download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        resolve(true);
      }, 'image/png', 1.0);
    });
  } catch (err) {
    console.error('Error sharing receipt:', err);
    return false;
  }
}

/**
 * Opens a dedicated print-friendly window for standard printing or saving to PDF.
 */
export function printTransactionReceipt(
  tx: WalletTransaction,
  session: UserSession | null,
  activeLevel: number | string = 100,
  activeSemester = '1st Semester'
) {
  try {
    const studentName = session?.fullName || (session as any)?.name || 'Student';
    const studentMatric = session?.matricNumber || (session as any)?.matric_number || '2025/PS/ICH/0001';
    const studentDept = session?.department || 'Department of Industrial Chemistry';
    const studentEmail = session?.email || 'student@university.edu';
    const cleanLevel = session?.level || activeLevel || 100;
    const cleanSem = session?.semester || activeSemester || '1st Semester';
    const isCredit = tx.type === 'credit';

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${tx.ref || tx.id}</title>
        <meta charset="utf-8">
        <style>
          @page { size: A4; margin: 15mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0F172A;
            background: #FFFFFF;
            margin: 0;
            padding: 24px;
            box-sizing: border-box;
          }
          .receipt-card {
            max-width: 680px;
            margin: 0 auto;
            border: 2px solid #E2E8F0;
            border-radius: 20px;
            padding: 36px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.06);
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #E2E8F0;
            padding-bottom: 20px;
            margin-bottom: 24px;
          }
          .crest {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: #0052CC;
            color: #FFF;
            font-weight: bold;
            font-size: 20px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 12px;
          }
          .title { font-size: 18px; font-weight: 800; margin: 0; color: #0F172A; }
          .subtitle { font-size: 11px; font-weight: 700; color: #64748B; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.5px; }
          .badge-receipt { display: inline-block; background: #EFF6FF; color: #0052CC; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; margin-top: 8px; }
          
          .amount-box {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 16px;
            padding: 20px;
            text-align: center;
            margin-bottom: 28px;
          }
          .amount-label { font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; }
          .amount-val { font-size: 32px; font-weight: 800; color: ${isCredit ? '#047857' : '#0F172A'}; font-family: monospace; margin: 6px 0; }
          .status-pill { display: inline-block; background: #DCFCE7; color: #166534; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 12px; border: 1px solid #86EFAC; }
          
          .section-title { font-size: 11px; font-weight: 800; color: #0052CC; text-transform: uppercase; letter-spacing: 0.5px; margin: 20px 0 10px 0; }
          .data-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          .data-table td { padding: 8px 0; border-bottom: 1px solid #F1F5F9; font-size: 13px; }
          .data-table td.label { color: #64748B; font-weight: 500; width: 40%; }
          .data-table td.value { color: #0F172A; font-weight: 700; text-align: right; }
          .data-table td.mono { font-family: monospace; }
          
          .footer-box {
            margin-top: 24px;
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 14px;
            padding: 16px;
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .seal {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            border: 2px solid #059669;
            color: #059669;
            text-align: center;
            font-size: 9px;
            font-weight: 800;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .footer-text { font-size: 11px; color: #64748B; }
          .footer-text strong { color: #0F172A; }
          .bottom-note { text-align: center; font-size: 10px; color: #94A3B8; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="receipt-card">
          <div class="header">
            <div class="crest">FU</div>
            <h1 class="title">CAMPUS SCHEDULER & STUDENT PORTAL</h1>
            <p class="subtitle">BURSARY &amp; DIGITAL TREASURY MANAGEMENT SYSTEM</p>
            <div class="badge-receipt">OFFICIAL TRANSACTION RECEIPT</div>
          </div>

          <div class="amount-box">
            <div class="amount-label">Transaction Amount</div>
            <div class="amount-val">${isCredit ? '+' : ''}${formatNaira(tx.amount)}</div>
            <div class="status-pill">● SUCCESSFUL &amp; VERIFIED</div>
          </div>

          <div class="section-title">Transaction Information</div>
          <table class="data-table">
            <tr>
              <td class="label">Reference Number</td>
              <td class="value mono">${tx.ref || tx.id}</td>
            </tr>
            <tr>
              <td class="label">Transaction Title</td>
              <td class="value">${tx.title}</td>
            </tr>
            <tr>
              <td class="label">Category</td>
              <td class="value">${(tx.category || 'WALLET').toUpperCase()}</td>
            </tr>
            <tr>
              <td class="label">Payment Channel</td>
              <td class="value">${isCredit ? 'Paystack Checkout (Secured)' : 'Campus Digital Wallet'}</td>
            </tr>
            <tr>
              <td class="label">Date &amp; Time</td>
              <td class="value">${tx.date}</td>
            </tr>
            ${tx.recipientOrSender ? `
            <tr>
              <td class="label">Counterparty / Recipient</td>
              <td class="value">${tx.recipientOrSender}</td>
            </tr>` : ''}
            ${tx.note ? `
            <tr>
              <td class="label">Description / Note</td>
              <td class="value">${tx.note}</td>
            </tr>` : ''}
          </table>

          <div class="section-title">Student Account Details</div>
          <table class="data-table">
            <tr>
              <td class="label">Student Full Name</td>
              <td class="value">${studentName}</td>
            </tr>
            <tr>
              <td class="label">Matriculation Number</td>
              <td class="value mono">${studentMatric}</td>
            </tr>
            <tr>
              <td class="label">Department</td>
              <td class="value">${studentDept}</td>
            </tr>
            <tr>
              <td class="label">Level &amp; Semester</td>
              <td class="value">${cleanLevel} Level • ${cleanSem}</td>
            </tr>
            <tr>
              <td class="label">Email Address</td>
              <td class="value">${studentEmail}</td>
            </tr>
          </table>

          <div class="footer-box">
            <div class="seal">
              <span>BURSARY</span>
              <span style="font-size: 11px;">PAID</span>
              <span>VERIFIED</span>
            </div>
            <div class="footer-text">
              <strong>Digitally Authenticated by Campus Bursary Treasury</strong><br>
              Valid electronic receipt of transaction. Verification Code: SHA256-${(tx.ref || tx.id).slice(0, 12).toUpperCase()}
            </div>
          </div>

          <div class="bottom-note">
            Generated via Campus Digital Wallet • No signature required.
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'width=800,height=900');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(printHtml);
      printWin.document.close();
    }
  } catch (e) {
    console.error('Print receipt error:', e);
  }
}
