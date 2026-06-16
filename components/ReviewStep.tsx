"use client";

import { useEffect, useMemo, useState } from "react";
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
  deleteColumn,
  renameColumn,
  reorderColumns,
  sortRows,
} from "@/lib/edit/operations";

interface Props {
  sheets: SheetData[];
  onUpdateSheet: (id: string, patch: Partial<SheetData>) => void;
}

const rowKeyGetter = (row: Row) => row[ROW_ID_KEY] as unknown as string;

export function ReviewStep({ sheets, onUpdateSheet }: Props) {
  const [active, setActive] = useState(0);
  const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);
  const sheet = sheets[Math.min(active, sheets.length - 1)];
  const [colTarget, setColTarget] = useState<string>("");

  useEffect(() => {
    // Đổi tab -> reset cột đang chọn để thao tác và bỏ trạng thái sort.
    setColTarget(sheet?.headers[0] ?? "");
    setSortColumns([]);
  }, [sheet?.id, sheet?.headers]);

  const columns = useMemo<Column<Row>[]>(() => {
    if (!sheet) return [];
    const cols: Column<Row>[] = sheet.headers.map((h) => ({
      key: h,
      name: h,
      resizable: true,
      sortable: true,
      draggable: true,
      editable: true,
      renderEditCell: renderTextEditor,
    }));
    return [SelectColumn, ...cols];
  }, [sheet]);

  if (!sheet) return null;

  const selectedCount = sheet.selectedRowIds.size;

  /** Áp một phép biến đổi bảng (trả về SheetData mới). */
  const apply = (next: SheetData) => onUpdateSheet(sheet.id, next);

  function setSelected(ids: ReadonlySet<string>) {
    apply({ ...sheet, selectedRowIds: new Set(ids) });
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
        <span className="text-slate-400">Bấm header để sắp xếp · kéo header để đổi thứ tự cột.</span>
      </div>

      {/* Thanh công cụ thao tác dòng */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium">
          {selectedCount}/{sheet.rows.length} dòng được chọn để gộp
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
        <span className="text-slate-400">Bấm đúp vào ô để sửa nội dung.</span>
      </div>

      <div className="h-[58vh] overflow-hidden rounded-lg border border-slate-200">
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
