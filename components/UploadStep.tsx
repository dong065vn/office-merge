"use client";

import { useRef, useState } from "react";
import { ACCEPTED_EXTENSIONS, detectFormat } from "@/lib/format";
import { parseFileAsync } from "@/lib/worker/client";
import type { SheetData } from "@/lib/types";

interface Props {
  sheets: SheetData[];
  onAdd: (sheets: SheetData[]) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

function isAccepted(name: string): boolean {
  const lower = name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function UploadStep({ sheets, onAdd, onRemove, onClearAll }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  async function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    setBusy(true);
    setErrors([]);
    const parsed: SheetData[] = [];
    const errs: string[] = [];
    for (const file of files) {
      if (!isAccepted(file.name)) {
        errs.push(`Bỏ qua "${file.name}" — chỉ hỗ trợ .xlsx, .xls, .csv`);
        continue;
      }
      try {
        parsed.push(await parseFileAsync(file));
      } catch (e) {
        errs.push(`Lỗi đọc "${file.name}": ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    if (parsed.length) onAdd(parsed);
    setErrors(errs);
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) void handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={[
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition",
          dragOver ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-white hover:bg-slate-50",
        ].join(" ")}
      >
        <span className="text-4xl">📂</span>
        <p className="font-medium text-slate-700">
          Kéo-thả file vào đây, hoặc bấm để chọn
        </p>
        <p className="text-sm text-slate-400">Hỗ trợ nhiều file .xlsx, .xls, .csv</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS.join(",")}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {busy && <p className="text-sm text-blue-600">Đang đọc file…</p>}

      {errors.length > 0 && (
        <ul className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
          {errors.map((m, i) => (
            <li key={i}>⚠️ {m}</li>
          ))}
        </ul>
      )}

      {sheets.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
            <h3 className="font-medium">Đã tải {sheets.length} file</h3>
            <button
              onClick={onClearAll}
              className="text-sm text-red-600 hover:underline"
              type="button"
            >
              Xóa tất cả
            </button>
          </div>
          <ul className="divide-y divide-slate-100">
            {sheets.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="truncate">
                  <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs uppercase text-slate-500">
                    {detectFormat(s.fileName)}
                  </span>
                  {s.fileName}
                  <span className="ml-2 text-slate-400">
                    {s.rows.length} dòng · {s.headers.length} cột
                  </span>
                </span>
                <button
                  onClick={() => onRemove(s.id)}
                  className="text-slate-400 hover:text-red-600"
                  type="button"
                  aria-label="Xóa file"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
