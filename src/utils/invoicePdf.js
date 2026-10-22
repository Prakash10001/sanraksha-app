import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

function formatInvoiceAmount(amountPaise, currency = "INR") {
  const amount = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((Number(amountPaise) || 0) / 100);
  return `${currency} ${amount}`;
}

function formatInvoiceDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-IN");
}

export default function downloadInvoicePdf(invoice) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const amount = formatInvoiceAmount(invoice.amountPaise, invoice.currency);
  const invoiceNumber = invoice.invoiceNumber || `Invoice-${invoice.id}`;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text("Sanraksha Hospital", 16, 22);
  pdf.setFontSize(16);
  pdf.text("INVOICE", pageWidth - 16, 22, { align: "right" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`Invoice: ${invoiceNumber}`, 16, 34);
  pdf.text(`Issued: ${formatInvoiceDate(invoice.createdAt)}`, 16, 41);
  pdf.text(`Status: ${invoice.status || "PENDING"}`, pageWidth - 16, 34, { align: "right" });
  if (invoice.paidAt) {
    pdf.text(`Paid: ${formatInvoiceDate(invoice.paidAt)}`, pageWidth - 16, 41, { align: "right" });
  }

  autoTable(pdf, {
    startY: 52,
    head: [["Bill to", "Invoice details"]],
    body: [[
      `${invoice.patientName || "Patient"}\n${invoice.patientEmail || ""}`,
      `Appointment: ${invoice.appointmentId ? `#${invoice.appointmentId}` : "—"}\nDescription: ${invoice.description || "—"}`,
    ]],
    theme: "grid",
    headStyles: { fillColor: [138, 42, 42] },
    styles: { font: "helvetica", fontSize: 10, cellPadding: 4, overflow: "linebreak" },
  });

  autoTable(pdf, {
    startY: pdf.lastAutoTable.finalY + 12,
    head: [["Description", "Amount"]],
    body: [[invoice.description || "Invoice charge", amount]],
    foot: [["Total", amount]],
    theme: "grid",
    headStyles: { fillColor: [138, 42, 42] },
    footStyles: { fillColor: [250, 247, 243], textColor: [38, 32, 28], fontStyle: "bold" },
    styles: { font: "helvetica", fontSize: 10, cellPadding: 4 },
    columnStyles: { 1: { halign: "right", cellWidth: 45 } },
  });

  pdf.setFontSize(9);
  pdf.setTextColor(110);
  pdf.text("This is a computer-generated invoice.", 16, pdf.internal.pageSize.getHeight() - 14);
  const filename = String(invoiceNumber).replace(/[^a-z0-9_-]/gi, "_");
  pdf.save(`${filename}.pdf`);
}
