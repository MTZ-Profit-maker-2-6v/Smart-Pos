// src/hooks/useReportSharer.ts
import { useState } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { DailySalesReport } from '@/types'; // Assuming you have this type defined

// Extend the jsPDF type to include the autoTable method
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

/**
 * A hook to provide functionality for sharing daily sales reports.
 */
export const useReportSharer = () => {

  /**
   * Generates a professional PDF document from the daily sales report data.
   * @param report - The daily sales report data.
   * @returns A Blob representing the generated PDF file.
   */
  const generatePdf = (report: DailySalesReport): Blob => {
    const doc = new jsPDF();
    const startDate = report.startDate ? new Date(report.startDate).toLocaleDateString('en-GB') : '';
    const endDate = report.endDate ? new Date(report.endDate).toLocaleDateString('en-GB') : new Date(report.date).toLocaleDateString('en-GB');
    const reportDate = `${startDate} → ${endDate}`;

    const brandText = report.brandName ? `${report.brandName} – ` : '';

    // Header
    doc.setFontSize(18);
    doc.text(`${brandText}Daily Sales Report`, 14, 22);
    doc.setFontSize(11);
    doc.text(`Period: ${reportDate}`, 14, 28);

    // Totals Section
    doc.autoTable({
      startY: 35,
      head: [['Metric', 'Value']],
      body: [
        ['Net Sales', `K ${report.totals.netSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Gross Sales', `K ${report.totals.grossSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Cost of Goods Sold', `K ${report.totals.cogs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Gross Profit', `K ${report.totals.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Labor Cost', `K ${report.totals.laborCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [22, 160, 133] }, // Emerald green
    });

    // Top Selling Items
    doc.autoTable({
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Top Selling Items', 'Quantity', 'Total Sales']],
      body: report.topSellingItems.map(item => [
        item.name,
        item.quantity,
        `K ${item.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] }, // Belize hole blue
    });

    // Stock Variances
    if (report.stockVariances.length > 0) {
      doc.autoTable({
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Stock Variances', 'Theoretical', 'Actual', 'UoM', 'Cost Impact']],
        body: report.stockVariances.map(v => [
          v.item,
          v.theoretical,
          v.actual,
          v.uom,
          `K ${v.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [192, 57, 43] }, // Pomegranate red
      });
    }
    
    // Voids
    if (report.voids.length > 0) {
      doc.autoTable({
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Voids', 'Count', 'Value']],
        body: report.voids.map(v => [
          v.reason,
          v.count,
          `K ${v.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [243, 156, 18] }, // Orange
      });
    }

    return doc.output('blob');
  };

  /**
   * Formats the report data into a concise text summary for messaging apps like WhatsApp.
   * @param report - The daily sales report data.
   * @param approvalToken - A unique token for the remote approval link.
   * @returns A formatted string.
   */
  const formatWhatsAppSummary = (report: DailySalesReport, approvalToken: string): string => {
    const startDate = report.startDate ? new Date(report.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    const endDate = report.endDate ? new Date(report.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date(report.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const totalVoids = report.voids.reduce((sum, v) => sum + v.value, 0);
    const totalVariance = report.stockVariances.reduce((sum, v) => sum + v.cost, 0);

    const header = `*${report.brandName ? report.brandName + ' - ' : ''}Daily Report: ${startDate} → ${endDate}*`;
    const sales = `💰 *Sales*: K ${report.totals.grossSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const profit = `📈 *Profit*: K ${report.totals.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const voids = `🚩 *Voids*: K ${totalVoids.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const variance = `📉 *Variance*: K ${totalVariance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    const topItem = report.topSellingItems[0];
    const bestSeller = `⭐ *Best Seller*: ${topItem.name} (K ${topItem.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;

    const quickActionLink = `https://profitmaker.example.com/approve-cashup?token=${approvalToken}`;
    const action = `\n\n*Quick Action:*\n[Click to approve cash-up](${quickActionLink})`;

    return `${header}\n\n${sales}\n${profit}\n${voids}\n${variance}\n\n${bestSeller}${action}`;
  };

  /**
   * Shares the daily report using the Web Share API.
   * It generates a PDF, creates a text summary, and prompts the user to share.
   * @param report - The daily sales report data.
   */
  const shareDailyReport = async (report: DailySalesReport) => {
    if (!navigator.share) {
      alert("Sharing is not supported on this browser.");
      return;
    }

    // Generate a unique token for the approval link
    const approvalToken = crypto.randomUUID();

    const pdfBlob = generatePdf(report);
    const reportDate = new Date(report.date).toISOString().split('T')[0];
    const fileName = `Daily_Report_${reportDate}.pdf`;
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

    const summaryText = formatWhatsAppSummary(report, approvalToken);

    try {
      if (!navigator.canShare || !navigator.canShare({ files: [pdfFile] })) {
        throw new Error("Can't share files on this browser.");
      }

      await navigator.share({
        files: [pdfFile],
        title: `Daily Report ${reportDate}`,
        text: summaryText,
      });
    } catch (error) {
      console.error('Error sharing report with file:', error);
      // Fallback for when sharing files and text together is not supported or fails
      try {
        await navigator.share({
          title: `Daily Report ${reportDate}`,
          text: summaryText,
        });
      } catch (fallbackError) {
        console.error('Error sharing text only:', fallbackError);
        alert("Could not share the report. You may need to share the text manually.");
      }
    }
  };

  const csvEscape = (value: string | number | boolean | null | undefined) => {
    const raw = value === undefined || value === null ? '' : String(value);
    if (/[",\n]/.test(raw)) {
      return `"${raw.replace(/"/g, '""')}"`;
    }
    return raw;
  };

  const generateCsv = (report: DailySalesReport): string => {
    const start = report.startDate ?? report.date;
    const end = report.endDate ?? report.date;
    const brand = report.brandName ? `${report.brandName}, ` : '';

    const lines: string[] = [];
    lines.push(`${brand}Daily Sales Report`);
    lines.push(`Range,${start} → ${end}`);
    lines.push('');
    lines.push('Totals');
    lines.push('Metric,Value');
    lines.push(`Net Sales,${report.totals.netSales}`);
    lines.push(`Gross Sales,${report.totals.grossSales}`);
    lines.push(`Cost of Goods Sold,${report.totals.cogs}`);
    lines.push(`Gross Profit,${report.totals.profit}`);
    lines.push(`Labor Cost,${report.totals.laborCost}`);
    lines.push('');

    if (report.topSellingItems.length > 0) {
      lines.push('Top Selling Items');
      lines.push('Name,Quantity,Total Sales');
      report.topSellingItems.forEach((item) => {
        lines.push([csvEscape(item.name), csvEscape(item.quantity), csvEscape(item.totalSales)].join(','));
      });
      lines.push('');
    }

    if (report.stockVariances.length > 0) {
      lines.push('Stock Variances');
      lines.push('Item,Theoretical,Actual,UoM,Cost Impact');
      report.stockVariances.forEach((item) => {
        lines.push([
          csvEscape(item.item),
          csvEscape(item.theoretical),
          csvEscape(item.actual),
          csvEscape(item.uom),
          csvEscape(item.cost),
        ].join(','));
      });
      lines.push('');
    }

    if (report.voids.length > 0) {
      lines.push('Voids');
      lines.push('Reason,Count,Value');
      report.voids.forEach((v) => {
        lines.push([csvEscape(v.reason), csvEscape(v.count), csvEscape(v.value)].join(','));
      });
      lines.push('');
    }

    return lines.join('\n');
  };

  const downloadCsv = (report: DailySalesReport, fileName = `daily-sales-report-${report.date}.csv`) => {
    const content = generateCsv(report);
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const generateDoc = (report: DailySalesReport): Blob => {
    const reportDate = new Date(report.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const rows = report.topSellingItems
      .map((item) => `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${item.totalSales.toFixed(2)}</td></tr>`)
      .join('');
    const varianceRows = report.stockVariances
      .map((item) => `<tr><td>${item.item}</td><td>${item.theoretical}</td><td>${item.actual}</td><td>${item.uom}</td><td>${item.cost.toFixed(2)}</td></tr>`)
      .join('');
    const voidRows = report.voids
      .map((item) => `<tr><td>${item.reason}</td><td>${item.count}</td><td>${item.value.toFixed(2)}</td></tr>`)
      .join('');

    const html = `<!doctype html><html><head><meta charset="utf-8" /><title>Daily Sales Report</title></head><body style="font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color:#1f2937; margin:24px;">
      <h1 style="font-size:22px; margin-bottom:8px;">Daily Sales Report</h1>
      <p>Date: ${reportDate}</p>
      <h2 style="margin-top:20px;">Totals</h2>
      <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
        <tr><th style="border:1px solid #ccc; padding:8px; background:#f9fafb; text-align:left;">Metric</th><th style="border:1px solid #ccc; padding:8px; background:#f9fafb; text-align:left;">Value</th></tr>
        <tr><td style="border:1px solid #ccc; padding:8px;">Net Sales</td><td style="border:1px solid #ccc; padding:8px;">${report.totals.netSales.toFixed(2)}</td></tr>
        <tr><td style="border:1px solid #ccc; padding:8px;">Gross Sales</td><td style="border:1px solid #ccc; padding:8px;">${report.totals.grossSales.toFixed(2)}</td></tr>
        <tr><td style="border:1px solid #ccc; padding:8px;">Cost of Goods Sold</td><td style="border:1px solid #ccc; padding:8px;">${report.totals.cogs.toFixed(2)}</td></tr>
        <tr><td style="border:1px solid #ccc; padding:8px;">Gross Profit</td><td style="border:1px solid #ccc; padding:8px;">${report.totals.profit.toFixed(2)}</td></tr>
        <tr><td style="border:1px solid #ccc; padding:8px;">Labor Cost</td><td style="border:1px solid #ccc; padding:8px;">${report.totals.laborCost.toFixed(2)}</td></tr>
      </table>
      <h2>Top Selling Items</h2>
      <table style="width:100%; border-collapse:collapse; margin-bottom:16px;"><thead><tr><th style="border:1px solid #ccc; padding:8px; background:#f3f4f6;">Name</th><th style="border:1px solid #ccc; padding:8px; background:#f3f4f6;">Qty</th><th style="border:1px solid #ccc; padding:8px; background:#f3f4f6;">Sales</th></tr></thead><tbody>${rows}</tbody></table>
      <h2>Stock Variances</h2>
      <table style="width:100%; border-collapse:collapse; margin-bottom:16px;"><thead><tr><th style="border:1px solid #ccc; padding:8px; background:#f3f4f6;">Item</th><th style="border:1px solid #ccc; padding:8px; background:#f3f4f6;">Theoretical</th><th style="border:1px solid #ccc; padding:8px; background:#f3f4f6;">Actual</th><th style="border:1px solid #ccc; padding:8px; background:#f3f4f6;">UoM</th><th style="border:1px solid #ccc; padding:8px; background:#f3f4f6;">Cost</th></tr></thead><tbody>${varianceRows}</tbody></table>
      <h2>Voids</h2>
      <table style="width:100%; border-collapse:collapse; margin-bottom:16px;"><thead><tr><th style="border:1px solid #ccc; padding:8px; background:#f3f4f6;">Reason</th><th style="border:1px solid #ccc; padding:8px; background:#f3f4f6;">Count</th><th style="border:1px solid #ccc; padding:8px; background:#f3f4f6;">Value</th></tr></thead><tbody>${voidRows}</tbody></table>
    </body></html>`;

    return new Blob([html], { type: 'application/msword;charset=utf-8' });
  };

  const downloadDoc = (report: DailySalesReport, fileName = `daily-sales-report-${report.date}.doc`) => {
    const blob = generateDoc(report);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const downloadMetricCsv = (
    metricName: string,
    metricValue: number | string,
    report: DailySalesReport,
    fileName = `metric-${metricName.replace(/\s+/g, '-').toLowerCase()}-${report.date}.csv`,
  ) => {
    const start = report.startDate ?? report.date;
    const end = report.endDate ?? report.date;
    const brand = report.brandName ?? 'Profit Maker POS';

    const lines = [
      [`Brand`, `${brand}`],
      [`Range`, `${start} → ${end}`],
      ['', ''],
      [`Metric`, `Value`],
      [`${metricName}`, `${metricValue}`],
    ];

    const csv = lines.map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const shareViaWhatsApp = async (report: DailySalesReport) => {
    const approvalToken = crypto.randomUUID();
    const text = `${formatWhatsAppSummary(report, approvalToken)}\n\nGenerated with Profit Maker POS`;
    const encoded = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/?text=${encoded}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `Daily Report ${report.date}`, text });
        return;
      } catch {
        // continue to open fallback URL
      }
    }

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return {
    shareDailyReport,
    generatePdf,
    formatWhatsAppSummary,
    generateCsv,
    downloadCsv,
    generateDoc,
    downloadDoc,
    shareViaWhatsApp,
    downloadMetricCsv,
  };
};
