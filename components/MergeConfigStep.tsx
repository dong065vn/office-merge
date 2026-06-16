"use client";

import { useMemo } from "react";
import { MERGE_STRATEGIES } from "@/lib/merge";
import type { MergeStrategy, SheetData } from "@/lib/types";

interface Props {
  sheets: SheetData[];
  strategy: MergeStrategy;
  onChangeStrategy: (s: MergeStrategy) => void;
}

export function MergeConfigStep({ sheets, strategy, onChangeStrategy }: Props) {
  const validation = useMemo(() => {
    if (sheets.length === 0) return null;
    const ref = sheets[0].headers;
    const sameStructure = sheets.every(
      (s) => s.headers.length === ref.length && s.headers.every((h, i) => h === ref[i]),
    );
    const totalRows = sheets.reduce((n, s) => n + s.selectedRowIds.size, 0);
    return { sameStructure, totalRows };
  }, [sheets]);

  return (
    <div className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="mb-1 font-medium">Chọn kiểu gộp</legend>
        {MERGE_STRATEGIES.map((s) => (
          <label
            key={s.value}
            className={[
              "flex cursor-pointer gap-3 rounded-lg border p-3",
              strategy === s.value ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white",
            ].join(" ")}
          >
            <input
              type="radio"
              name="strategy"
              className="mt-1"
              checked={strategy === s.value}
              onChange={() => onChangeStrategy(s.value)}
            />
            <span>
              <span className="font-medium">
                {s.label}
                {s.recommended && (
                  <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-xs font-normal text-green-700">
                    Khuyến nghị
                  </span>
                )}
              </span>
              <span className="block text-sm text-slate-500">{s.description}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {validation && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <p>
            Sẽ gộp <strong>{sheets.length}</strong> file →{" "}
            <strong>{validation.totalRows}</strong> dòng (chỉ tính dòng đã chọn).
          </p>
          {validation.sameStructure ? (
            <p className="mt-1 text-green-700">✓ Các file có cùng cấu trúc cột.</p>
          ) : (
            <p className="mt-1 text-amber-700">
              ⚠️ Cấu trúc cột giữa các file không hoàn toàn giống nhau. Khi gộp sẽ hợp nhất
              tất cả cột; ô thiếu sẽ để trống.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
