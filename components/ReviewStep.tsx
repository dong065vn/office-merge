"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DataGrid,
  SelectColumn,
  SELECT_COLUMN_KEY,
  renderTextEditor,
  type Column,
  type SortColumn,
} from "react-data-grid";
import "react-data-grid/lib/styles.css";
import { ROW_ID_KEY, type Row, type SheetData } from "@/lib/types";
import {
  addColumn,
  addRow,
  clearCells,
  deleteColumn,
  renameColumn,
  reorderColumns,
  sortRows,
} from "@/lib/edit/operations";

interface Props {
  sheets: SheetData[];
  onUpdateSheet: (id: string, patch: Partial<SheetData>) => void;
}

interface CellPos {
  r: number; // chỉ số dòng trong rows[]
  c: number; // chỉ số cột trong headers[]
}

const rowKeyGetter = (row: Row) => row[ROW_ID_KEY] as unknown as string;

/** Tìm ô dữ liệu (r,c) dưới con trỏ qua aria-rowindex/aria-colindex của RDG. */
function cellAtPoint(x: number, y: number): CellPos | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  if (!el) return null;
  const cellEl = el.closest("[aria-colindex]");
  const rowEl = el.closest("[aria-rowindex]");
  if (!cellEl || !rowEl) return null;
  // aria-colindex: SelectColumn=1, cột dữ liệu bắt đầu từ 2 -> trừ 2.
  // aria-rowindex: header=1, dòng dữ liệu bắt đầu từ 2 -> trừ 2.
  const c = Number(cellEl.getAttribute("aria-colindex")) - 2;
  const r = Number(rowEl.getAttribute("aria-rowindex")) - 2;
  if (!Number.isFinite(c) || !Number.isFinite(r) || c < 0 || r < 0) return null;
  return { r, c };
}

export function ReviewStep({ sheets, onUpdateSheet }: Props) {
  const [active, setActive] = useState(0);
  const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);
  const [colTarget, setColTarget] = useState<string>("");
  const [anchor, setAnchor] = useState<CellPos | null>(null);
  const [focus, setFocus] = useState<CellPos | null>(null);
  const draggingRef = useRef(false);

  const sheet = sheets[Math.min(active, sheets.length - 1)];

  useEffect(() => {
    setColTarget(sheet?.headers[0] ?? "");
    setSortColumns([]);
    setAnchor(null);
    setFocus(null);
  }, [sheet?.id, sheet?.headers]);

  const rowIndex = useMemo(() => {
    const m = new Map<string, number>();
    sheet?.rows.forEach((r, i) => m.set(rowKeyGetter(r), i));
    return m;
  }, [sheet?.rows]);

  // Vùng đã quét, chuẩn hóa.
  const bounds = useMemo(() => {
    if (!anchor || !focus) return null;
    return {
      rlo: Math.min(anchor.r, focus.r),
      rhi: Math.max(anchor.r, focus.r),
      clo: Math.min(anchor.c, focus.c),
      chi: Math.max(anchor.c, focus.c),
    };
  }, [anchor, focus]);

  const columns = useMemo<Column<Row>[]>(() => {
    if (!sheet) return [];
    const cols: Column<Row>[] = sheet.headers.map((h, ci) => ({
      key: h,
      name: h,
      resizable: true,
      sortable: true,
      draggable: true,
      editable: true,
      renderEditCell: renderTextEditor,
      cellClass: (row: Row) => {
        if (!bounds) return undefined;
        const ri = rowIndex.get(rowKeyGetter(row));
        if (ri == null) return undefined;
        return ri >= bounds.rlo && ri <= bounds.rhi && ci >= bounds.clo && ci <= bounds.chi
          ? "om-range"
          : undefined;
      },
    }));
    return [SelectColumn, ...cols];
  }, [sheet, bounds, rowIndex]);

  if (!sheet) return null;

  const selectedCount = sheet.selectedRowIds.size;
  const scanCount = bounds ? (bounds.rhi - bounds.rlo + 1) * (bounds.chi - bounds.clo + 1) : 0;

  const apply = (next: SheetData) => onUpdateSheet(sheet.id, next);

  function setSelected(ids: ReadonlySet<string>) {
    apply({ ...sheet, selectedRowIds: new Set(ids) });
  }

  function clearScanned() {
    if (!bounds) return;
    apply(clearCells(sheet, bounds.rlo, bounds.rhi, bounds.clo, bounds.chi));
  }

  function deleteUnselected() {
    const kept = sheet.rows.filter((r) => sheet.selectedRowIds.has(rowKeyGetter(r)));
    apply({ ...sheet, rows: kept, selectedRowIds: new Set(kept.map(rowKeyGetter)) });
  }

  function handleSort(next: readonly SortColumn[]) {
    setSortColumns(next);
    const first = next[0];
    if (first) apply(sortRows(sheet, String(first.columnKey), first.direction));
  }

  function handleReorder(sourceKey: string, targetKey: string) {
    if (sourceKey === SELECT_COLUMN_KEY || targetKey === SELECT_COLUMN_KEY) return;
    apply(reorderColumns(sheet, sourceKey, targetKey));
  }

  function handleRenameColumn() {
    if (!colTarget) return;
    const to = window.prompt(`Đổi tên cột "${colTarget}" thành:`, colTarget);
    if (to && to.trim()) apply(renameColumn(sheet, colTarget, to));
  }

  function handleDeleteColumn() {
    if (!colTarget) return;
    if (sheet.headers.length <= 1) {
      window.alert("Không thể xóa cột cuối cùng.");
      return;
    }
    if (window.confirm(`Xóa cột "${colTarget}"? Dữ liệu trong cột này sẽ mất.`)) {
      apply(deleteColumn(sheet, colTarget));
    }
  }

  // Bắt đầu quét bằng kéo chuột.
  function handlePointerDown(e: React.PointerEvent) {
    const start = cellAtPoint(e.clientX, e.clientY);
    if (!start) return;
    setAnchor(start);
    setFocus(start);
    draggingRef.current = true;
    document.body.style.userSelect = "none";
    const onMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return;
      const cell = cellAtPoint(ev.clientX, ev.clientY);
      if (cell) setFocus(cell);
    };
    const onUp = () => {
      draggingRef.current = false;
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const tag = (document.activeElement?.tagName ?? "").toUpperCase();
    if (tag === "INPUT" || tag === "TEXTAREA") return; // đang sửa ô
    if (e.key === "Delete" || e.key === "Backspace") {
      if (bounds) {
        e.preventDefault();
        clearScanned();
      }
    } else if (e.key === "Escape") {
      setAnchor(null);
      setFocus(null);
    }
  }

  return (
    <div className="space-y-3">
      {sheets.length > 1 && (
        <div className="flex flex-wrap gap-1 border-b border-slate-200">
          {sheets.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(i)}
              className={[
                "rounded-t-md px-3 py-1.5 text-sm",
                i === active
                  ? "border border-b-white border-slate-200 bg-white font-medium text-slate-900"
                  : "text-slate-500 hover:text-slate-800",
              ].join(" ")}
            >
              {s.fileName}
            </button>
          ))}
        </div>
      )}

      {/* Thanh công cụ thao tác cột */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-100 p-2 text-sm">
        <span className="font-medium text-slate-600">Cột:</span>
        <select
          value={colTarget}
          onChange={(e) => setColTarget(e.target.value)}
          className="rounded border border-slate-300 bg-white px-2 py-1"
        >
          {sheet.headers.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <button type="button" className="rounded border border-slate-300 bg-white px-2 py-1 hover:bg-slate-50" onClick={handleRenameColumn}>
          ✏️ Đổi tên
        </button>
        <button type="button" className="rounded border border-red-300 bg-white px-2 py-1 text-red-600 hover:bg-red-50" onClick={handleDeleteColumn}>
          🗑️ Xóa cột
        </button>
        <button type="button" className="rounded border border-slate-300 bg-white px-2 py-1 hover:bg-slate-50" onClick={() => apply(addColumn(sheet))}>
          ➕ Thêm cột
        </button>
        <span className="mx-1 h-4 w-px bg-slate-300" />
        <button type="button" className="rounded border border-slate-300 bg-white px-2 py-1 hover:bg-slate-50" onClick={() => apply(addRow(sheet))}>
          ➕ Thêm dòng
        </button>
      </div>

      {/* Thanh công cụ quét vùng + thao tác dòng */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded bg-blue-50 px-2 py-1 text-blue-700">
          Đã quét: <strong>{scanCount}</strong> ô
        </span>
        <button
          type="button"
          className="rounded border border-red-300 px-2 py-1 text-red-600 hover:bg-red-50 disabled:opacity-40"
          disabled={scanCount === 0}
          onClick={clearScanned}
          title="Xóa rỗng nội dung các ô đã bôi đen (phím tắt: Delete)"
        >
          🧽 Xóa nội dung vùng đã quét
        </button>
        <span className="mx-1 h-4 w-px bg-slate-300" />
        <span className="font-medium">
          {selectedCount}/{sheet.rows.length} dòng được chọn
        </span>
        <button type="button" className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50" onClick={() => setSelected(new Set(sheet.rows.map(rowKeyGetter)))}>
          Chọn tất cả
        </button>
        <button type="button" className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50" onClick={() => setSelected(new Set())}>
          Bỏ chọn tất cả
        </button>
        <button
          type="button"
          className="rounded border border-red-300 px-2 py-1 text-red-600 hover:bg-red-50 disabled:opacity-40"
          disabled={selectedCount === sheet.rows.length}
          onClick={deleteUnselected}
          title="Xóa vĩnh viễn các dòng không được chọn khỏi bảng này"
        >
          Xóa dòng không chọn
        </button>
      </div>

      <p className="text-xs text-slate-400">
        Kéo chuột để <strong>bôi đen vùng ô</strong> rồi bấm <kbd>Delete</kbd> để xóa nội dung ·
        bấm header để sắp xếp · kéo header để đổi thứ tự cột · bấm đúp vào ô để sửa.
      </p>

      <div
        className="h-[56vh] overflow-hidden rounded-lg border border-slate-200"
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
      >
        <DataGrid
          columns={columns}
          rows={sheet.rows}
          rowKeyGetter={rowKeyGetter}
          selectedRows={sheet.selectedRowIds as ReadonlySet<string>}
          onSelectedRowsChange={setSelected}
          onRowsChange={(rows) => apply({ ...sheet, rows })}
          sortColumns={sortColumns}
          onSortColumnsChange={handleSort}
          onColumnsReorder={handleReorder}
          className="rdg-light"
        />
      </div>
    </div>
  );
}
