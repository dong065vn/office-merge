import { ROW_ID_KEY, type Row, type SheetData } from "@/lib/types";

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
