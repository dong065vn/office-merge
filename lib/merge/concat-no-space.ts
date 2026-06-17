import {
  ROW_ID_KEY,
  type CellValue,
  type MergeResult,
  type MergeWarning,
  type Row,
  type SheetData,
} from "@/lib/types";

/**
 * Gộp nối tiếp giá trị ô cùng cột từ nhiều file, KHÔNG khoảng trắng.
 *
 * Logic:
 * - Dùng append-rows để nối tất cả dòng đã chọn từ mọi sheet.
 * - Cột kết quả = union các cột, giữ thứ tự xuất hiện.
 * - Giá trị ô = nối chuỗi (không khoảng trắng) các giá trị non-null
 *   từ cùng vị trí dòng/cột trên các sheet.
 * - Nếu chỉ 1 sheet: kết quả giống append-rows.
 *
 * Cách nối: Với mỗi dòng ở vị trí i, gộp giá trị cột j từ tất cả sheet
 * thành 1 giá trị duy nhất = concat(sheet1[i][j], sheet2[i][j], ...).
 */
export function mergeConcatNoSpace(sheets: SheetData[]): MergeResult {
  const warnings: MergeWarning[] = [];

  if (sheets.length === 0) {
    warnings.push({ level: "error", message: "Chưa có file nào để gộp." });
    return { headers: [], rows: [], warnings };
  }

  // Union headers.
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

  // Lấy dòng đã chọn từ mỗi sheet.
  const selectedBySheet: Row[][] = sheets.map((s) =>
    s.rows.filter((r) => s.selectedRowIds.has(r[ROW_ID_KEY] as unknown as string)),
  );

  const maxRows = Math.max(...selectedBySheet.map((r) => r.length));

  if (maxRows === 0) {
    warnings.push({ level: "warning", message: "Không có dòng nào được chọn." });
    return { headers, rows: [], warnings };
  }

  // Cảnh báo nếu số dòng khác nhau.
  const rowCounts = selectedBySheet.map((r) => r.length);
  if (new Set(rowCounts).size > 1) {
    warnings.push({
      level: "warning",
      message:
        `Số dòng đã chọn giữa các file không bằng nhau (${rowCounts.join(", ")}). ` +
        `Các dòng thừa sẽ được nối thêm, ô thiếu để trống.`,
    });
  }

  // Cảnh báo cấu trúc cột khác nhau.
  const mismatched = sheets.filter(
    (s) => s.headers.length !== headers.length || s.headers.some((h, i) => h !== headers[i]),
  );
  if (mismatched.length > 0) {
    warnings.push({
      level: "warning",
      message:
        "Cấu trúc cột giữa các file không hoàn toàn giống nhau — đã hợp nhất " +
        `tất cả cột (${headers.length} cột). Ô thiếu sẽ để trống.`,
    });
  }

  function cellToString(v: CellValue): string {
    if (v === null || v === undefined) return "";
    return String(v);
  }

  const rows: Row[] = [];
  for (let i = 0; i < maxRows; i++) {
    const merged: Row = {};
    for (const h of headers) {
      const parts: string[] = [];
      for (const sheetRows of selectedBySheet) {
        const row = sheetRows[i];
        if (row) {
          const val = cellToString(row[h] ?? null);
          if (val !== "") parts.push(val);
        }
      }
      // Nối không khoảng trắng.
      const joined = parts.join("");
      merged[h] = joined === "" ? null : joined;
    }
    rows.push(merged);
  }

  return { headers, rows, warnings };
}
