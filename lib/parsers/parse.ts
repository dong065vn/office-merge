import * as XLSX from "xlsx";
import { detectFormat } from "@/lib/format";
import { ROW_ID_KEY, type CellValue, type Row, type SheetData } from "@/lib/types";

let idCounter = 0;
function nextSheetId(): string {
  idCounter += 1;
  return `sheet-${idCounter}-${idCounter * 7919}`;
}

/**
 * Parse dữ liệu nhị phân/chuỗi của một file bảng thành SheetData.
 * Lấy sheet đầu tiên. Dòng đầu là tiêu đề cột; ô tiêu đề trống -> "Cột N".
 */
export function parseTable(
  data: ArrayBuffer | Uint8Array | string,
  fileName: string,
): SheetData {
  const wb =
    typeof data === "string"
      ? XLSX.read(data, { type: "string" })
      : XLSX.read(data, { type: "array" });

  const firstSheetName = wb.SheetNames[0];
  const ws = firstSheetName ? wb.Sheets[firstSheetName] : undefined;

  const aoa: CellValue[][] = ws
    ? (XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false }) as CellValue[][])
    : [];

  const rawHeaders = aoa[0] ?? [];
  const headers = rawHeaders.map((h, i) =>
    h === null || h === undefined || String(h).trim() === "" ? `Cột ${i + 1}` : String(h),
  );

  const id = nextSheetId();
  const rows: Row[] = aoa.slice(1).map((cells, rowIndex) => {
    const row: Row = { [ROW_ID_KEY]: `${id}-${rowIndex}` };
    headers.forEach((h, colIndex) => {
      const v = cells[colIndex];
      row[h] = v === undefined ? null : v;
    });
    return row;
  });

  return {
    id,
    fileName,
    format: detectFormat(fileName),
    headers,
    rows,
    selectedRowIds: new Set(rows.map((r) => r[ROW_ID_KEY] as unknown as string)),
  };
}
