import { jsPDF } from "jspdf";

export interface CertificateData {
  participantName: string;
  eventTitle: string;
  /** Já formatada (ex.: "07 de agosto de 2026" ou "de 07 a 09 de agosto de 2026"). */
  eventDateLabel: string;
  /** Só para conferências — presença calculada por atividade (ver
   * `get_certificate_eligibility`, migração 0042). */
  attendancePercent?: number;
}

const CORAL = [255, 107, 74] as const;
const INK = [18, 23, 43] as const;

function drawCertificatePage(doc: jsPDF, data: CertificateData) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;

  doc.setDrawColor(...CORAL);
  doc.setLineWidth(1.2);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  doc.setLineWidth(0.3);
  doc.rect(13, 13, pageWidth - 26, pageHeight - 26);

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("ZUVIO", centerX, 28, { align: "center" });

  doc.setFontSize(30);
  doc.text("CERTIFICADO", centerX, 52, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.text("Certificamos que", centerX, 76, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(data.participantName, centerX, 92, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.text("participou do evento", centerX, 106, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(data.eventTitle, centerX, 119, { align: "center", maxWidth: pageWidth - 60 });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(90, 100, 145);
  doc.text(data.eventDateLabel, centerX, 132, { align: "center" });

  if (data.attendancePercent !== undefined) {
    doc.text(`Presença registrada: ${data.attendancePercent.toFixed(0)}%`, centerX, 141, {
      align: "center",
    });
  }
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
}

/** Um certificado, um PDF — usado na emissão individual. */
export function downloadCertificate(data: CertificateData) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  drawCertificatePage(doc, data);
  doc.save(`certificado-${slugify(data.participantName)}.pdf`);
}

/** Um PDF só, uma página por pessoa elegível — evita precisar de uma
 * biblioteca de zip só pra agrupar vários arquivos. */
export function downloadCertificatesBatch(items: CertificateData[], eventTitle: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  items.forEach((data, i) => {
    if (i > 0) doc.addPage();
    drawCertificatePage(doc, data);
  });
  doc.save(`certificados-${slugify(eventTitle)}.pdf`);
}
