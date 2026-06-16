"use client";

import { useMemo, useState } from "react";
import { DataGrid, SelectColumn, renderTextEditor, type Column } from "react-data-grid";
import "react-data-grid/lib/styles.css";
import { ROW_ID_KEY, type Row, type SheetData } from "@/lib/types";

interface Props {
  sheets: SheetData[];
  onUpdateSheet: (id: string, patch: Partial<SheetData>) => void;
}

const rowKeyGetter = (row: Row) => row[ROW_ID_KEY] as unknown as string;

export function ReviewStep({ sheets, onUpdateSheet }: Props) {
  const [active, setActive] = useState(0);
  const sheet = sheets[Math.min(active, sheets.length - 1)];

  const columns = useMemo<Column<Row>[]>(() => {
    if (!sheet) return [];
    const cols: Column<Row>[] = sheet.headers.map((h) => ({
      key: h,
      name: h,
      resizable: true,
      editable: true,
      renderEditCell: renderTextEditor,
    }));
    return [SelectColumn, ...cols];
  }, [sheet]);

  if (!sheet) return null;

  const selectedCount = sheet.selectedRowIds.size;

  function setSelected(ids: ReadonlySet<string>) {
    onUpdateSheet(sheet.id, { selectedRowIds: new Set(ids) });
  }

  function deleteUnselected() {
    const kept = sheet.rows.filter((r) => sheet.selectedRowIds.has(rowKeyGetter(r)));
    onUpdateSheet(sheet.id, {
      rows: kept,
      selectedRowIds: new Set(kept.map(rowKeyGetter)),
    });
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

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium">
          {selectedCount}/{sheet.rows.length} dòng được chọn để gộp
        </span>
        <button
          type="button"
          className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50"
          onClick={() => setSelected(new Set(sheet.rows.map(rowKeyGetter)))}
        >
          Chọn tất cả
        </button>
        <button
          type="button"
          className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50"
          onClick={() => setSelected(new Set())}
        >
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

      <div className="h-[60vh] overflow-hidden rounded-lg border border-slate-200">
        <DataGrid
          columns={columns}
          rows={sheet.rows}
          rowKeyGetter={rowKeyGetter}
          selectedRows={sheet.selectedRowIds as ReadonlySet<string>}
          onSelectedRowsChange={setSelected}
          onRowsChange={(rows) => onUpdateSheet(sheet.id, { rows })}
          className="rdg-light"
        />
      </div>
    </div>
  );
}
