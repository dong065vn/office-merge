"use client";

import { useCallback, useEffect, useState } from "react";
import { Stepper, STEPS } from "./Stepper";
import { UploadStep } from "./UploadStep";
import { ReviewStep } from "./ReviewStep";
import { MergeConfigStep } from "./MergeConfigStep";
import { ExportStep } from "./ExportStep";
import type { MergeStrategy, SheetData } from "@/lib/types";

export function Wizard() {
  const [step, setStep] = useState(0);
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [strategy, setStrategy] = useState<MergeStrategy>("append-rows");

  // "Luôn sạch khi reload": cảnh báo khi rời trang nếu đang có dữ liệu,
  // và không lưu gì xuống storage — state chỉ sống trong RAM.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (sheets.length > 0) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [sheets.length]);

  const addSheets = useCallback(
    (added: SheetData[]) => setSheets((prev) => [...prev, ...added]),
    [],
  );
  const removeSheet = useCallback(
    (id: string) => setSheets((prev) => prev.filter((s) => s.id !== id)),
    [],
  );
  const clearAll = useCallback(() => setSheets([]), []);
  const updateSheet = useCallback(
    (id: string, patch: Partial<SheetData>) =>
      setSheets((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s))),
    [],
  );

  const canNext =
    (step === 0 && sheets.length > 0) || (step > 0 && step < STEPS.length - 1);

  return (
    <div className="space-y-6">
      <Stepper current={step} />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {step === 0 && (
          <UploadStep
            sheets={sheets}
            onAdd={addSheets}
            onRemove={removeSheet}
            onClearAll={clearAll}
          />
        )}
        {step === 1 && <ReviewStep sheets={sheets} onUpdateSheet={updateSheet} />}
        {step === 2 && (
          <MergeConfigStep
            sheets={sheets}
            strategy={strategy}
            onChangeStrategy={setStrategy}
          />
        )}
        {step === 3 && <ExportStep sheets={sheets} strategy={strategy} />}
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded-lg border border-slate-300 px-4 py-2 disabled:opacity-40"
        >
          ← Quay lại
        </button>
        {step < STEPS.length - 1 && (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext}
            className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            Tiếp tục →
          </button>
        )}
      </div>
    </div>
  );
}
