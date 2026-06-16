import {
  ROW_ID_KEY,
  type MergeResult,
  type MergeWarning,
  type Row,
  type SheetData,
} from "@/lib/types";

/**
 * Gộp nhiều bảng bằng cách nối dòng (append rows).
 *
 * - Chỉ lấy các dòng có id nằm trong `selectedRowIds` của mỗi sheet.
 * - Cột kết quả là hợp (union) các cột, giữ thứ tự xuất hiện lần đầu.
 * - Nếu cấu trúc cột giữa các file không khớp, sinh cảnh báo; ô thiếu = null.
 * - Khóa nội bộ ROW_ID_KEY bị loại khỏi kết quả.
 */
export function mergeAppendRows(sheets: SheetData[]): MergeResult {
  const warnings: MergeWarning[] = [];

  if (sheets.length === 0) {
    warnings.push({ level: "error", message: "Chưa có file nào để gộp." });
    return { headers: [], rows: [], warnings };
  }

  // Hợp nhất cột theo thứ tự xuất hiện lần đầu.
  const headers: string[] = [];
  const seen = new Set<string>();
  for (const sheet of sheets) {
    for (const h of sheet.headers) {
      if (!seen.has(h)) {
        seen.add(h);
        headers.push(h);
      }
    }
  }

  // Cảnh báo nếu có file thiếu cột so với tập hợp chung.
  const mismatched = sheets.filter(
    (s) => s.headers.length !== headers.length || s.headers.some((h, i) => h !== headers[i]),
  );
  if (mismatched.length > 0) {
    warnings.push({
      level: "warning",
      message:
        "Cấu trúc cột giữa các file không hoàn toàn giống nhau — đã hợp nhất theo " +
        `tất cả cột (${headers.length} cột). Ô thiếu sẽ để trống.`,
    });
  }

  const rows: Row[] = [];
  for (const sheet of sheets) {
    for (const sourceRow of sheet.rows) {
      const rowId = sourceRow[ROW_ID_KEY] as unknown as string;
      if (!sheet.selectedRowIds.has(rowId)) continue;

      const merged: Row = {};
      for (const h of headers) {
        const value = sourceRow[h];
        merged[h] = value === undefined ? null : value;
      }
      rows.push(merged);
    }
  }

  return { headers, rows, warnings };
}
