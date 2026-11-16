import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

function formatDate(value) {
  if (!value) return "Date not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-IN");
}

export default function downloadPrescriptionPdf(prescription) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 16;
  const medicines = Array.isArray(prescription.medicines) ? prescription.medicines : [];

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(19);
  pdf.text("Sanraksha Hospital", margin, 20);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("Hyderabad, Telangana, India", margin, 27);
  if (prescription.doctorPhone) {
    pdf.text(`Doctor contact: ${prescription.doctorPhone}`, margin, 33);
  }
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("PRESCRIPTION", pageWidth - margin, 22, { align: "right" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  const detailsY = prescription.doctorPhone ? 43 : 37;
  pdf.text(`Patient: ${prescription.patientName || "Patient"}`, margin, detailsY);
  pdf.text(`Prescribed by: ${prescription.doctorName || "Doctor"}`, margin, detailsY + 7);
  if (prescription.doctorSpecialization) {
    pdf.text(`Specialty: ${prescription.doctorSpecialization}`, margin, detailsY + 14);
  }
  if (prescription.doctorRegistrationNumber) {
    pdf.text(`Medical registration: ${prescription.doctorRegistrationNumber}`, margin, detailsY + 21);
  }
  pdf.text(`Date: ${formatDate(prescription.prescribedAt)}`, pageWidth - margin, detailsY, { align: "right" });
  if (prescription.appointmentId) {
    pdf.text(`Appointment: #${prescription.appointmentId}`, pageWidth - margin, detailsY + 7, { align: "right" });
  }

  autoTable(pdf, {
    startY: detailsY + (prescription.doctorRegistrationNumber ? 28 : prescription.doctorSpecialization ? 21 : 14),
    head: [["Medicine", "Dosage", "Frequency", "Duration", "Instructions"]],
    body: medicines.map((medicine) => [
      medicine.name || "—",
      medicine.dosage || "—",
      medicine.frequency || "—",
      medicine.duration || "—",
      medicine.instructions || "—",
    ]),
    theme: "grid",
    headStyles: { fillColor: [138, 42, 42] },
    styles: { font: "helvetica", fontSize: 9, cellPadding: 3, overflow: "linebreak" },
  });

  if (prescription.notes) {
    autoTable(pdf, {
      startY: pdf.lastAutoTable.finalY + 8,
      body: [[{ content: `Notes: ${prescription.notes}`, styles: { fontStyle: "normal" } }]],
      theme: "plain",
      margin: { left: margin, right: margin },
      styles: { font: "helvetica", fontSize: 9, cellPadding: 1, overflow: "linebreak" },
    });
  }

  const needsSignaturePage = pdf.lastAutoTable.finalY + 36 > pdf.internal.pageSize.getHeight() - 16;
  if (needsSignaturePage) {
    pdf.addPage();
  }
  const signatureY = needsSignaturePage ? 35 : pdf.lastAutoTable.finalY + 18;
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(13);
  pdf.text(prescription.doctorName || "Doctor", pageWidth - margin, signatureY, { align: "right" });
  pdf.setDrawColor(130);
  pdf.line(pageWidth - 76, signatureY + 2, pageWidth - margin, signatureY + 2);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text("Electronically signed", pageWidth - margin, signatureY + 7, { align: "right" });
  if (prescription.doctorRegistrationNumber) {
    pdf.text(`Reg. No. ${prescription.doctorRegistrationNumber}`, pageWidth - margin, signatureY + 12, { align: "right" });
  }

  pdf.setFontSize(8);
  pdf.setTextColor(110);
  pdf.text("Follow the directions provided by your doctor.", 16, pdf.internal.pageSize.getHeight() - 12);
  const patientName = String(prescription.patientName || "patient").replace(/[^a-z0-9_-]/gi, "_");
  pdf.save(`prescription-${prescription.id || patientName}.pdf`);
}
