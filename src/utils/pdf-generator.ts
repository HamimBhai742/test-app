import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

export interface PDFTransactionItem {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
}

export interface PDFStatementSummary {
  monthName: string;
  year: number;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate: number;
  userName?: string;
  userEmail?: string;
}

const formatNum = (num: number) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export function generateMonthlyStatementHTML(
  summary: PDFStatementSummary,
  transactions: PDFTransactionItem[]
): string {
  const currentDate = new Date().toLocaleDateString('bn-BD', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const txRows = transactions
    .map(
      (tx) => `
    <tr class="${tx.type}">
      <td>${tx.date}</td>
      <td><span class="cat-badge">${tx.category}</span></td>
      <td class="tx-title">${tx.title}</td>
      <td class="type-badge-cell">
        <span class="badge ${tx.type}">${tx.type === 'income' ? 'আয় (Income)' : 'ব্যয় (Expense)'}</span>
      </td>
      <td class="amount ${tx.type}">
        ${tx.type === 'income' ? '+' : '-'} ৳ ${formatNum(tx.amount)}
      </td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <title>হিসাব কিতাব - ${summary.monthName} ${summary.year} স্টেটমেন্ট</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, sans-serif; }
    body { background-color: #f8fafc; color: #1e293b; padding: 45px 30px; }
    .container { max-width: 820px; margin: 0 auto; background: #ffffff; padding: 45px 40px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); }
    
    /* Header */
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2.5px solid #e2e8f0; padding-bottom: 24px; margin-bottom: 30px; }
    .brand { display: flex; align-items: center; gap: 14px; }
    .brand-logo { font-size: 36px; }
    .brand-name { font-size: 26px; font-weight: 800; color: #208aef; }
    .brand-tagline { font-size: 12px; color: #64748b; font-weight: 600; margin-top: 2px; }
    .doc-info { text-align: right; }
    .doc-title { font-size: 17px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
    .doc-date { font-size: 13px; color: #64748b; margin-top: 4px; font-weight: 600; }
    
    /* User Banner */
    .user-banner { background: #f1f5f9; padding: 16px 24px; border-radius: 14px; display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 13.5px; border: 1px solid #e2e8f0; }
    .user-name { font-weight: 700; color: #334155; }

    /* Summary Grid */
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 35px; }
    .summary-card { padding: 20px 16px; border-radius: 14px; text-align: center; border: 1.5px solid #e2e8f0; }
    .summary-card.income { background: rgba(16, 185, 129, 0.08); border-color: rgba(16, 185, 129, 0.3); }
    .summary-card.expense { background: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.3); }
    .summary-card.savings { background: rgba(32, 138, 239, 0.08); border-color: rgba(32, 138, 239, 0.3); }
    .summary-card.rate { background: rgba(139, 92, 246, 0.08); border-color: rgba(139, 92, 246, 0.3); }
    
    .card-val { font-size: 19px; font-weight: 800; margin-bottom: 6px; }
    .card-val.income { color: #10b981; }
    .card-val.expense { color: #ef4444; }
    .card-val.savings { color: #208aef; }
    .card-val.rate { color: #8b5cf6; }
    .card-lbl { font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }

    /* Table */
    .section-title { font-size: 17px; font-weight: 800; margin-bottom: 18px; color: #0f172a; border-left: 4px solid #208aef; padding-left: 12px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 35px; }
    th { background: #f8fafc; color: #475569; font-size: 12.5px; font-weight: 700; text-align: left; padding: 14px 18px; border-bottom: 2.5px solid #e2e8f0; }
    td { padding: 14px 18px; border-bottom: 1px solid #f1f5f9; font-size: 13.5px; color: #334155; }
    tr:nth-child(even) { background: #fafafa; }
    .cat-badge { background: #e2e8f0; color: #475569; padding: 4px 10px; border-radius: 8px; font-size: 11.5px; font-weight: 600; }
    .badge { padding: 4px 10px; border-radius: 8px; font-size: 11.5px; font-weight: 700; color: #fff; display: inline-block; }
    .badge.income { background: #10b981; }
    .badge.expense { background: #ef4444; }
    .amount { font-weight: 800; font-size: 14.5px; text-align: right; }
    .amount.income { color: #10b981; }
    .amount.expense { color: #ef4444; }
    .tx-title { font-weight: 600; }

    /* Footer Stamp */
    .footer { border-top: 2px dashed #e2e8f0; padding-top: 25px; margin-top: 10px; display: flex; justify-content: space-between; align-items: center; }
    .stamp-box { border: 2.5px solid #10b981; color: #10b981; padding: 10px 20px; border-radius: 10px; font-weight: 800; font-size: 13px; text-transform: uppercase; transform: rotate(-3deg); letter-spacing: 0.5px; }
    .footer-text { font-size: 11.5px; color: #94a3b8; text-align: right; line-height: 1.5; }

    @page {
      size: A4;
      margin: 15mm 15mm 15mm 15mm;
    }

    @media print {
      html, body { background: #ffffff !important; padding: 0 !important; margin: 0 !important; }
      .container { box-shadow: none !important; border: none !important; padding: 10px 15px !important; width: 100% !important; max-width: 100% !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="brand">
        <div class="brand-logo">💰</div>
        <div>
          <div class="brand-name">হিসাব কিতাব</div>
          <div class="brand-tagline">আপনার স্মার্ট ফিনান্সিয়াল ম্যানেজার</div>
        </div>
      </div>
      <div class="doc-info">
        <div class="doc-title">মাসিক স্টেটমেন্ট রিপোর্ট</div>
        <div class="doc-date">${summary.monthName} ${summary.year}</div>
      </div>
    </div>

    <!-- User Info -->
    <div class="user-banner">
      <div>হিসাবগ্রহীতা: <span class="user-name">${summary.userName || 'গ্রাহক'}</span></div>
      <div>রিপোর্ট তৈরির তারিখ: <span>${currentDate}</span></div>
    </div>

    <!-- Summary Grid -->
    <div class="summary-grid">
      <div class="summary-card income">
        <div class="card-val income">৳ ${formatNum(summary.totalIncome)}</div>
        <div class="card-lbl">মোট আয়</div>
      </div>
      <div class="summary-card expense">
        <div class="card-val expense">৳ ${formatNum(summary.totalExpense)}</div>
        <div class="card-lbl">মোট ব্যয়</div>
      </div>
      <div class="summary-card savings">
        <div class="card-val savings">৳ ${formatNum(summary.netSavings)}</div>
        <div class="card-lbl">নিট সঞ্চয়</div>
      </div>
      <div class="summary-card rate">
        <div class="card-val rate">${summary.savingsRate}%</div>
        <div class="card-lbl">সঞ্চয়ের হার</div>
      </div>
    </div>

    <!-- Transactions Table -->
    <div class="section-title">লেনদেনের বিস্তারিত বিবরণী (${transactions.length} টি এন্ট্রি)</div>
    <table>
      <thead>
        <tr>
          <th>তারিখ</th>
          <th>ক্যাটাগরি</th>
          <th>বিবরণ / শিরোনাম</th>
          <th>ধরন</th>
          <th style="text-align: right;">পরিমাণ (TK)</th>
        </tr>
      </thead>
      <tbody>
        ${txRows}
      </tbody>
    </table>

    <!-- Footer -->
    <div class="footer">
      <div class="stamp-box">VERIFIED STATEMENT</div>
      <div class="footer-text">
        Generated automatically by Hisab Kitab Personal Finance App.<br>
        www.hisabkitab.app
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

export function generateCashMemoHTML(
  tx: PDFTransactionItem,
  userName?: string
): string {
  const currentDate = new Date().toLocaleDateString('bn-BD', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <title>হিসাব কিতাব - ক্যাশ মেমো #${tx.id.slice(-6)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, sans-serif; }
    body { background-color: #f8fafc; color: #1e293b; padding: 40px; display: flex; justify-content: center; }
    .memo-card { width: 450px; background: #ffffff; padding: 30px; border-radius: 20px; border: 2px solid #e2e8f0; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
    .memo-header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 20px; }
    .logo { font-size: 36px; margin-bottom: 4px; }
    .title { font-size: 22px; font-weight: 800; color: #208aef; }
    .subtitle { font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
    
    .info-row { display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-bottom: 16px; background: #f8fafc; padding: 10px 14px; border-radius: 10px; }
    .info-val { font-weight: 700; color: #1e293b; }

    .details-box { border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
    .detail-item { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 10px; }
    .detail-item:last-child { margin-bottom: 0; }
    .detail-lbl { color: #64748b; }
    .detail-val { font-weight: 700; color: #0f172a; }

    .amount-box { text-align: center; background: ${tx.type === 'income' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}; padding: 18px; border-radius: 14px; margin-bottom: 24px; border: 1px solid ${tx.type === 'income' ? '#10b981' : '#ef4444'}; }
    .amount-lbl { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; }
    .amount-val { font-size: 28px; font-weight: 800; color: ${tx.type === 'income' ? '#10b981' : '#ef4444'}; margin-top: 4px; }

    .stamp-container { display: flex; justify-content: center; margin-bottom: 16px; }
    .stamp { border: 2.5px solid ${tx.type === 'income' ? '#10b981' : '#ef4444'}; color: ${tx.type === 'income' ? '#10b981' : '#ef4444'}; font-weight: 800; font-size: 13px; padding: 6px 20px; border-radius: 8px; text-transform: uppercase; transform: rotate(-5deg); letter-spacing: 1px; }

    .footer { text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px dashed #e2e8f0; padding-top: 14px; }

    @page {
      size: A4;
      margin: 15mm 15mm 15mm 15mm;
    }

    @media print {
      html, body { background: #ffffff !important; padding: 0 !important; margin: 0 !important; }
      .memo-card { box-shadow: none !important; border: 1.5px solid #e2e8f0 !important; padding: 25px !important; width: 100% !important; }
    }
  </style>
</head>
<body>
  <div class="memo-card">
    <div class="memo-header">
      <div class="logo">🧾</div>
      <div class="title">হিসাব কিতাব মেমো</div>
      <div class="subtitle">Digital Cash Receipt</div>
    </div>

    <div class="info-row">
      <div>রসিদ নম্বর: <span class="info-val">#${tx.id.slice(-6)}</span></div>
      <div>তারিখ: <span class="info-val">${tx.date}</span></div>
    </div>

    <div class="details-box">
      <div class="detail-item">
        <span class="detail-lbl">লেনদেনের বিবরণ:</span>
        <span class="detail-val">${tx.title}</span>
      </div>
      <div class="detail-item">
        <span class="detail-lbl">ক্যাটাগরি:</span>
        <span class="detail-val">${tx.category}</span>
      </div>
      <div class="detail-item">
        <span class="detail-lbl">লেনদেনের ধরন:</span>
        <span class="detail-val" style="color: ${tx.type === 'income' ? '#10b981' : '#ef4444'}">
          ${tx.type === 'income' ? 'আয় (Income)' : 'ব্যয় (Expense)'}
        </span>
      </div>
      <div class="detail-item">
        <span class="detail-lbl">হিসাবগ্রহীতা:</span>
        <span class="detail-val">${userName || 'গ্রাহক'}</span>
      </div>
    </div>

    <div class="amount-box">
      <div class="amount-lbl">মোট টাকার পরিমাণ</div>
      <div class="amount-val">৳ ${formatNum(tx.amount)}</div>
    </div>

    <div class="stamp-container">
      <div class="stamp">${tx.type === 'income' ? '✓ RECEIVED' : '✓ PAID & RECORDED'}</div>
    </div>

    <div class="footer">
      Generated by Hisab Kitab Smart Finance Manager.<br>
      ডিজিটাল মেমো প্রমাণপত্র হিসাবে সংরক্ষিত।
    </div>
  </div>
</body>
</html>
  `;
}

export async function printOrDownloadPDF(htmlContent: string, documentTitle: string) {
  const safeFilename = documentTitle.replace(/[^a-zA-Z0-9_\-]/g, '_');

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // 1. Prioritize browser Print dialog for "Save as PDF" / "Print to PDF"
    try {
      let iframe = document.getElementById('pdf-print-iframe') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'pdf-print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
      }

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        }, 400);
      }
      return;
    } catch (e) {
      console.warn('Iframe print error, falling back to direct html download:', e);
    }

    // Fallback: Direct HTML file download
    try {
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${safeFilename}.html`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }, 1000);
      return;
    } catch (e) {
      console.error('Direct download error:', e);
    }
  } else {
    // 2. Native Mobile App (Android / iOS): Generate PDF, copy to a clean filename, and share
    try {
      const pdf = await Print.printToFileAsync({ html: htmlContent });
      const filename = `${safeFilename}.pdf`;
      const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
      const targetUri = `${cacheDir}${filename}`;

      if (pdf && pdf.uri) {
        // Copy the temporary UUID file to a clean, professionally-named file in the cache
        await FileSystem.copyAsync({
          from: pdf.uri,
          to: targetUri,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(targetUri, {
            mimeType: 'application/pdf',
            dialogTitle: filename,
            UTI: 'com.adobe.pdf',
          });
          return;
        }
      }
      // Fallback if sharing is unavailable
      await Print.printAsync({ html: htmlContent });
    } catch (error) {
      console.warn('PDF export error:', error);
      try {
        await Print.printAsync({ html: htmlContent });
      } catch (fallbackErr) {
        console.error('Final fallback error:', fallbackErr);
      }
    }
  }
}
