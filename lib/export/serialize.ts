import * as XLSX from "xlsx";
import type { Row, TableFormat } from "@/lib/types";

/**
 * Chuyển headers + rows thành dữ liệu nhị phân theo định dạng đích.
 * Hàm thuần (không đụng DOM) để test được; tải về xử lý ở tầng UI.
 */
export function serialize(
  headers: string[],
  rows: Row[],
  format: TableFormat,
): Uint8Array {
  const aoa: unknown[][] = [headers, ...rows.map((r) => headers.map((h) => r[h] ?? ""))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(ws);
    // BOM để Excel mở UTF-8 (tiếng Việt) đúng.
    return new TextEncoder().encode("﻿" + csv);
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  const bookType = format === "xls" ? "xls" : "xlsx";
  const out = XLSX.write(wb, { type: "array", bookType }) as ArrayBuffer;
  return new Uint8Array(out);
}
