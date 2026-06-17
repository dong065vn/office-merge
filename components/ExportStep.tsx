"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DataGrid, type Column } from "react-data-grid";
import "react-data-grid/lib/styles.css";
import { mergeAsync } from "@/lib/worker/client";
import { downloadTable } from "@/lib/export/download";
import { extensionFor } from "@/lib/format";
import type {
  MergeResult,
  MergeStrategy,
  Row,
  SheetData,
  TableFormat,
} from "@/lib/types";

interface Props {
  sheets: SheetData[];
  strategy: MergeStrategy;
}

const FORMATS: { value: TableFormat; label: string }[] = [
  { value: "xlsx", label: "Excel (.xlsx)" },
  { value: "xls", label: "Excel 97-2003 (.xls)" },
  { value: "csv", label: "CSV (.csv)" },
];

/** Định dạng gốc phổ biến nhất trong các file đầu vào (mặc định xlsx). */
function dominantFormat(sheets: SheetData[]): TableFormat {
  const count: Record<string, number> = {};
  for (const s of sheets) count[s.format] = (count[s.format] ?? 0) + 1;
  let best: TableFormat = "xlsx";
  let max = -1;
  for (const f of ["xlsx", "xls", "csv"] as TableFormat[]) {
    if ((count[f] ?? 0) > max) {
      max = count[f] ?? 0;
      best = f;
    }
  }
  return best;
}

const PREVIEW_LIMIT = 100;

export function ExportStep({ sheets, strategy }: Props) {
  const [result, setResult] = useState<MergeResult | null>(null);
  const [busy, setBusy] = useState(true);
  const [format, setFormat] = useState<TableFormat>(() => dominantFormat(sheets));

  // Cột đã chọn (set tên header).
  const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set());
  // Anchor cho Shift+click range.
  const lastClickedColRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setSelectedCols(new Set());
    lastClickedColRef.current = null;
    mergeAsync(sheets, strategy).then((r) => {
      if (!cancelled) {
        setResult(r);
        setBusy(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [sheets, strategy]);

  // Xử lý click header cột.
  const handleHeaderClick = useCallback(
    (colName: string, shiftKey: boolean) => {
      if (!result) return;

      if (shiftKey && lastClickedColRef.current) {
        // Shift+click: chọn range từ lastClicked đến colName.
        const from = result.headers.indexOf(lastClickedColRef.current);
        const to = result.headers.indexOf(colName);
        if (from !== -1 && to !== -1) {
          const lo = Math.min(from, to);
          const hi = Math.max(from, to);
          const next = new Set(selectedCols);
          for (let i = lo; i <= hi; i++) {
            next.add(result.headers[i]);
          }
          setSelectedCols(next);
        }
      } else {
        // Click thường: toggle cột.
        const next = new Set(selectedCols);
        if (next.has(colName)) {
          next.delete(colName);
        } else {
          next.add(colName);
        }
        setSelectedCols(next);
        lastClickedColRef.current = colName;
      }
    },
    [result, selectedCols],
  );

  // Xóa các cột đã chọn khỏi result.
  const deleteSelectedCols = useCallback(() => {
    if (!result || selectedCols.size === 0) return;
    const remaining = result.headers.filter((h) => !selectedCols.has(h));
    if (remaining.length === 0) {
      window.alert("Không thể xóa hết tất cả cột.");
      return;
    }
    const rows = result.rows.map((r) => {
      const next: Row = {};
      for (const h of remaining) {
        next[h] = r[h];
      }
      return next;
    });
    setResult({ ...result, headers: remaining, rows });
    setSelectedCols(new Set());
    lastClickedColRef.current = null;
  }, [result, selectedCols]);

  // Phím Delete xóa cột đã chọn.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? "").toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedCols.size > 0) {
        e.preventDefault();
        deleteSelectedCols();
      } else if (e.key === "Escape") {
        setSelectedCols(new Set());
      }
    },
    [selectedCols, deleteSelectedCols],
  );

  const columns = useMemo<Column<Row>[]>(() => {
    if (!result) return [];
    return result.headers.map((h) => ({
      key: h,
      name: h,
      resizable: true,
      headerCellClass: selectedCols.has(h) ? "om-col-selected" : undefined,
      cellClass: selectedCols.has(h) ? "om-col-selected" : undefined,
      renderHeaderCell: ({ column }: { column: Column<Row> }) => (
        <span
          className="om-header-clickable"
          onClick={(e) => {
            e.stopPropagation();
            handleHeaderClick(column.name as string, e.shiftKey);
          }}
          title="Click chọn cột · Shift+Click chọn nhiều cột · Delete xóa"
        >
          {column.name}
        </span>
      ),
    }));
  }, [result, selectedCols, handleHeaderClick]);

  const previewRows = useMemo(() => result?.rows.slice(0, PREVIEW_LIMIT) ?? [], [result]);

  if (busy || !result) return <p className="text-blue-600">Đang gộp dữ liệu…</p>;

  return (
    <div className="space-y-4">
      {result.warnings.map((w, i) => (
        <p
          key={i}
          className={[
            "rounded-lg p-3 text-sm",
            w.level === "error" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700",
          ].join(" ")}
        >
          {w.level === "error" ? "❌" : "⚠️"} {w.message}
        </p>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <p className="font-medium">
          Kết quả: {result.rows.length} dòng · {result.headers.length} cột
        </p>

        {selectedCols.size > 0 && (
          <>
            <span className="rounded bg-blue-50 px-2 py-1 text-sm text-blue-700">
              Đã chọn: <strong>{selectedCols.size}</strong> cột
            </span>
            <button
              type="button"
              className="rounded border border-red-300 px-2 py-1 text-sm text-red-600 hover:bg-red-50"
              onClick={deleteSelectedCols}
              title="Xóa vĩnh viễn các cột đã chọn (phím tắt: Delete)"
            >
              🗑️ Xóa {selectedCols.size} cột đã chọn
            </button>
            <button
              type="button"
              className="rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50"
              onClick={() => setSelectedCols(new Set())}
            >
              Bỏ chọn
            </button>
          </>
        )}

        <label className="ml-auto flex items-center gap-2 text-sm">
          Định dạng tải về:
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as TableFormat)}
            className="rounded border border-slate-300 px-2 py-1"
          >
            {FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={result.rows.length === 0}
          onClick={() =>
            downloadTable(result.headers, result.rows, format, `ket-qua-gop${extensionFor(format)}`)
          }
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-40"
        >
          ⬇ Tải file kết quả
        </button>
      </div>

      <p className="text-xs text-slate-400">
        Click tên cột để <strong>chọn cột</strong> · <kbd>Shift</kbd>+Click chọn nhiều cột liên tiếp ·
        <kbd>Delete</kbd> xóa cột đã chọn · <kbd>Esc</kbd> bỏ chọn.
      </p>

      {result.rows.length > PREVIEW_LIMIT && (
        <p className="text-sm text-slate-400">
          Xem trước {PREVIEW_LIMIT} dòng đầu; file tải về gồm đủ {result.rows.length} dòng.
        </p>
      )}

      <div
        className="h-[55vh] overflow-hidden rounded-lg border border-slate-200"
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <DataGrid columns={columns} rows={previewRows} className="rdg-light" />
      </div>
    </div>
  );
}

