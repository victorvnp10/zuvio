/** CSV simples (vírgula, aspas duplas escapadas) — sem dependência
 * externa, é só texto. Compartilhado por todos os exports do painel
 * do administrador (participantes, avaliações, atividades). */
export function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCsv(rows: string[][]): string {
  return rows.map((cols) => cols.map(escapeCsvField).join(",")).join("\n");
}

/** BOM (﻿) na frente — sem isso o Excel abre acentuação em UTF-8 (nome,
 * comentário) toda quebrada. */
export function triggerCsvDownload(csv: string, filename: string) {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
