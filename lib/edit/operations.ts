import { ROW_ID_KEY, type Row, type SheetData } from "@/lib/types";

const rowKeyGetter = (row: Row) => row[ROW_ID_KEY] as unknown as string;

/** Sinh tên cột mới không trùng: "Cột mới", "Cột mới 2", … */
function uniqueName(base: string, existing: string[]): string {
  if (!existing.includes(base)) return base;
  let i = 2;
  while (existing.includes(`${base} ${i}`)) i += 1;
  return `${base} ${i}`;
}

/** Thêm một cột trống vào cuối bảng. */
export function addColumn(sheet: SheetData, name = "Cột mới"): SheetData {
  const col = uniqueName(name, sheet.headers);
  return {
    ...sheet,
    headers: [...sheet.headers, col],
    rows: sheet.rows.map((r) => ({ ...r, [col]: null })),
  };
}

/** Xóa một cột khỏi bảng (bỏ header + key tương ứng ở mọi dòng). */
export function deleteColumn(sheet: SheetData, name: string): SheetData {
  if (!sheet.headers.includes(name)) return sheet;
  return {
    ...sheet,
    headers: sheet.headers.filter((h) => h !== name),
    rows: sheet.rows.map((r) => {
      const { [name]: _removed, ...rest } = r;
      return rest as Row;
    }),
  };
}

/** Đổi tên cột (đổi cả header lẫn key ở mọi dòng, giữ nguyên thứ tự). */
export function renameColumn(sheet: SheetData, from: string, to: string): SheetData {
  const target = to.trim();
  if (!target || from === target || !sheet.headers.includes(from)) return sheet;
  // Tránh trùng tên cột khác.
  const finalName = uniqueName(target, sheet.headers.filter((h) => h !== from));
  return {
    ...sheet,
    headers: sheet.headers.map((h) => (h === from ? finalName : h)),
    rows: sheet.rows.map((r) => {
      const next: Row = {};
      for (const key of Object.keys(r)) {
        if (key === from) next[finalName] = r[from];
        else next[key] = r[key];
      }
      return next;
    }),
  };
}

/** Đổi thứ tự cột: chuyển cột `sourceKey` tới vị trí của `targetKey`. */
export function reorderColumns(
  sheet: SheetData,
  sourceKey: string,
  targetKey: string,
): SheetData {
  const headers = [...sheet.headers];
  const from = headers.indexOf(sourceKey);
  const to = headers.indexOf(targetKey);
  if (from === -1 || to === -1 || from === to) return sheet;
  const [moved] = headers.splice(from, 1);
  headers.splice(to, 0, moved);
  return { ...sheet, headers };
}

/** Thêm một dòng trống vào cuối bảng (tự chọn dòng mới). */
export function addRow(sheet: SheetData): SheetData {
  const id = `${sheet.id}-new-${sheet.rows.length}-${Object.keys(sheet.rows).length}`;
  const row: Row = { [ROW_ID_KEY]: id };
  for (const h of sheet.headers) row[h] = null;
  const selectedRowIds = new Set(sheet.selectedRowIds);
  selectedRowIds.add(id);
  return { ...sheet, rows: [...sheet.rows, row], selectedRowIds };
}

/**
 * Xóa (đặt rỗng) nội dung tất cả ô trong vùng chữ nhật đã quét.
 * Chỉ số dòng tính theo `rows[]`, chỉ số cột theo `headers[]` (0-based, bao gồm 2 đầu).
 * Không xóa dòng/cột — chỉ làm trống giá trị.
 */
export function clearCells(
  sheet: SheetData,
  rowA: number,
  rowB: number,
  colA: number,
  colB: number,
): SheetData {
  const rlo = Math.max(0, Math.min(rowA, rowB));
  const rhi = Math.min(sheet.rows.length - 1, Math.max(rowA, rowB));
  const clo = Math.max(0, Math.min(colA, colB));
  const chi = Math.min(sheet.headers.length - 1, Math.max(colA, colB));
  if (rlo > rhi || clo > chi) return sheet;
  const cols = sheet.headers.slice(clo, chi + 1);
  const rows = sheet.rows.map((row, i) => {
    if (i < rlo || i > rhi) return row;
    const next = { ...row };
    for (const c of cols) next[c] = null;
    return next;
  });
  return { ...sheet, rows };
}

/** Sắp xếp các dòng theo giá trị một cột. */
export function sortRows(
  sheet: SheetData,
  column: string,
  direction: "ASC" | "DESC",
): SheetData {
  const dir = direction === "ASC" ? 1 : -1;
  const rows = [...sheet.rows].sort((a, b) => {
    const va = a[column];
    const vb = b[column];
    if (va === null || va === undefined) return 1; // rỗng xuống cuối
    if (vb === null || vb === undefined) return -1;
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
    return String(va).localeCompare(String(vb), "vi") * dir;
  });
  return { ...sheet, rows };
}

/**
 * Xóa nhiều dòng theo chỉ số (0-based, inclusive range).
 * Cập nhật selectedRowIds cho khớp.
 */
export function deleteRows(
  sheet: SheetData,
  fromRow: number,
  toRow: number,
): SheetData {
  const rlo = Math.max(0, Math.min(fromRow, toRow));
  const rhi = Math.min(sheet.rows.length - 1, Math.max(fromRow, toRow));
  if (rhi < rlo) return sheet;

  const removedIds = new Set<string>();
  for (let i = rlo; i <= rhi; i++) {
    removedIds.add(rowKeyGetter(sheet.rows[i]));
  }

  const rows = sheet.rows.filter((_r, i) => i < rlo || i > rhi);
  const selectedRowIds = new Set(
    [...sheet.selectedRowIds].filter((id) => !removedIds.has(id)),
  );
  return { ...sheet, rows, selectedRowIds };
}

/**
 * Xóa nhiều cột theo chỉ số (0-based, inclusive range).
 * Bỏ header + key tương ứng ở mọi dòng.
 */
export function deleteColumns(
  sheet: SheetData,
  fromCol: number,
  toCol: number,
): SheetData {
  const clo = Math.max(0, Math.min(fromCol, toCol));
  const chi = Math.min(sheet.headers.length - 1, Math.max(fromCol, toCol));
  if (chi < clo) return sheet;

  const removedCols = new Set(sheet.headers.slice(clo, chi + 1));
  const headers = sheet.headers.filter((h) => !removedCols.has(h));

  if (headers.length === 0) return sheet; // không xóa hết cột

  const rows = sheet.rows.map((r) => {
    const next: Row = {};
    for (const key of Object.keys(r)) {
      if (!removedCols.has(key)) next[key] = r[key];
    }
    return next;
  });
  return { ...sheet, headers, rows };
}
