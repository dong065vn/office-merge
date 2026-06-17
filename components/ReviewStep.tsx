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
  deleteColumns,
  deleteRows,
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
  const scannedRowCount = bounds ? bounds.rhi - bounds.rlo + 1 : 0;
  const scannedColCount = bounds ? bounds.chi - bounds.clo + 1 : 0;
  // Quét bao phủ toàn bộ cột → có thể xóa hàng.
  const isFullRowScan = bounds != null && bounds.clo === 0 && bounds.chi === sheet.headers.length - 1;
  // Quét bao phủ toàn bộ dòng → có thể xóa cột.
  const isFullColScan = bounds != null && bounds.rlo === 0 && bounds.rhi === sheet.rows.length - 1;

  const apply = (next: SheetData) => onUpdateSheet(sheet.id, next);

  function setSelected(ids: ReadonlySet<string>) {
    apply({ ...sheet, selectedRowIds: new Set(ids) });
  }

  function clearScanned() {
    if (!bounds) return;
    apply(clearCells(sheet, bounds.rlo, bounds.rhi, bounds.clo, bounds.chi));
  }

  function deleteScannedRows() {
    if (!bounds) return;
    if (sheet.rows.length - scannedRowCount < 1) {
      window.alert("Không thể xóa hết tất cả dòng.");
      return;
    }
    apply(deleteRows(sheet, bounds.rlo, bounds.rhi));
    setAnchor(null);
    setFocus(null);
  }

  function deleteScannedCols() {
    if (!bounds) return;
    if (sheet.headers.length - scannedColCount < 1) {
      window.alert("Không thể xóa hết tất cả cột.");
      return;
    }
    apply(deleteColumns(sheet, bounds.clo, bounds.chi));
    setAnchor(null);
    setFocus(null);
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

  // Theo dõi ô đang chọn để làm gốc cho phím tắt quét cột.
  function handleSelectedCellChange(args: { rowIdx: number; column: { idx: number } }) {
    const c = args.column.idx - 1; // cột SelectColumn idx 0 -> trừ 1
    if (c < 0 || args.rowIdx < 0) return;
    const cell = { r: args.rowIdx, c };
    setAnchor(cell);
    setFocus(cell);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const tag = (document.activeElement?.tagName ?? "").toUpperCase();
    if (tag === "INPUT" || tag === "TEXTAREA") return; // đang sửa ô
    // Ctrl/Cmd + Shift + ↓ : quét nhanh toàn bộ nội dung cột hiện tại.
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "ArrowDown") {
      const origin = focus ?? anchor;
      if (origin && sheet.rows.length > 0) {
        e.preventDefault();
        const c0 = bounds ? bounds.clo : origin.c;
        const c1 = bounds ? bounds.chi : origin.c;
        setAnchor({ r: 0, c: c0 });
        setFocus({ r: sheet.rows.length - 1, c: c1 });
      }
      return;
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      if (bounds) {
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
          // Ctrl+Delete: force xóa hàng hoặc cột (khi quét một phần).
          if (isFullColScan && !isFullRowScan) {
            deleteScannedCols();
          } else {
            deleteScannedRows();
          }
        } else if (isFullRowScan && !isFullColScan) {
          // Quét toàn bộ cột (tất cả cột) → xóa hàng đã quét.
          deleteScannedRows();
        } else if (isFullColScan && !isFullRowScan) {
          // Quét toàn bộ dòng (tất cả dòng) → xóa cột đã quét.
          deleteScannedCols();
        } else {
          // Quét một phần → chỉ xóa nội dung ô.
          clearScanned();
        }
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
          {scannedRowCount > 0 && <> ({scannedRowCount} dòng × {scannedColCount} cột)</>}
        </span>
        <button
          type="button"
          className="rounded border border-red-300 px-2 py-1 text-red-600 hover:bg-red-50 disabled:opacity-40"
          disabled={scanCount === 0}
          onClick={clearScanned}
          title="Xóa rỗng nội dung các ô đã bôi đen (phím tắt: Delete)"
        >
          🧽 Xóa nội dung
        </button>
        <button
          type="button"
          className="rounded border border-red-300 px-2 py-1 text-red-600 hover:bg-red-50 disabled:opacity-40"
          disabled={scannedRowCount === 0}
          onClick={deleteScannedRows}
          title={`Xóa vĩnh viễn ${scannedRowCount} dòng đã quét (Ctrl+Delete)`}
        >
          🗑️ Xóa {scannedRowCount} dòng
        </button>
        <button
          type="button"
          className="rounded border border-red-300 px-2 py-1 text-red-600 hover:bg-red-50 disabled:opacity-40"
          disabled={scannedColCount === 0}
          onClick={deleteScannedCols}
          title={`Xóa vĩnh viễn ${scannedColCount} cột đã quét`}
        >
          🗑️ Xóa {scannedColCount} cột
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
        Kéo chuột để <strong>bôi đen vùng ô</strong> rồi bấm <kbd>Delete</kbd>: chọn cả hàng → xóa hàng, chọn cả cột → xóa cột, còn lại → xóa nội dung ·
        <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>↓</kbd> quét nhanh toàn bộ cột ·
        <kbd>Ctrl</kbd>+<kbd>Z</kbd> hoàn tác · bấm header sắp xếp · kéo header đổi thứ tự · bấm đúp sửa ô.
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
          onSelectedCellChange={handleSelectedCellChange}
          className="rdg-light"
        />
      </div>
    </div>
  );
}
