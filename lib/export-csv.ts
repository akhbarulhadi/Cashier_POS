/**
 * Utilitas Ekspor CSV (client-side, tanpa dependency tambahan)
 * ============================================================================
 * Mengubah array of objects menjadi file CSV dan langsung memicu unduhan di
 * browser. Dipakai di halaman Riwayat Transaksi & Laporan untuk ekspor data.
 */

export interface CsvColumn<T> {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
}

function escapeCsvValue(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  // Bungkus dengan tanda kutip jika mengandung koma, kutip, atau baris baru.
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCsv<T>(filename: string, columns: CsvColumn<T>[], rows: T[]) {
  if (typeof window === "undefined") return;

  const headerLine = columns.map((c) => escapeCsvValue(c.header)).join(",");
  const dataLines = rows.map((row) =>
    columns.map((c) => escapeCsvValue(c.accessor(row))).join(",")
  );

  // Tambahkan BOM UTF-8 agar karakter (mis. "Rp") tampil benar saat dibuka di Excel.
  const csvContent = "\uFEFF" + [headerLine, ...dataLines].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
