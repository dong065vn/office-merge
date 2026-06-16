"use client";

import { useEffect, useMemo, useState } from "react";
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

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
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

  const columns = useMemo<Column<Row>[]>(
    () => (result?.headers ?? []).map((h) => ({ key: h, name: h, resizable: true })),
    [result],
  );
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

      {result.rows.length > PREVIEW_LIMIT && (
        <p className="text-sm text-slate-400">
          Xem trước {PREVIEW_LIMIT} dòng đầu; file tải về gồm đủ {result.rows.length} dòng.
        </p>
      )}

      <div className="h-[55vh] overflow-hidden rounded-lg border border-slate-200">
        <DataGrid columns={columns} rows={previewRows} className="rdg-light" />
      </div>
    </div>
  );
}
