"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import { Stepper, STEPS } from "./Stepper";
import { UploadStep } from "./UploadStep";
import { ReviewStep } from "./ReviewStep";
import { MergeConfigStep } from "./MergeConfigStep";
import { ExportStep } from "./ExportStep";
import type { MergeStrategy, SheetData } from "@/lib/types";

const HISTORY_LIMIT = 100;

interface HistoryState {
  past: SheetData[][];
  present: SheetData[];
  future: SheetData[][];
}

type Action =
  | { type: "commit"; updater: (prev: SheetData[]) => SheetData[] }
  | { type: "undo" }
  | { type: "redo" };

function reducer(state: HistoryState, action: Action): HistoryState {
  switch (action.type) {
    case "commit": {
      const next = action.updater(state.present);
      if (next === state.present) return state;
      return {
        past: [...state.past, state.present].slice(-HISTORY_LIMIT),
        present: next,
        future: [],
      };
    }
    case "undo": {
      if (state.past.length === 0) return state;
      const prev = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: prev,
        future: [state.present, ...state.future],
      };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(1),
      };
    }
  }
}

export function Wizard() {
  const [{ past, present: sheets, future }, dispatch] = useReducer(reducer, {
    past: [],
    present: [],
    future: [],
  });
  // step và strategy không nằm trong lịch sử undo dữ liệu.
  const [step, setStep] = useState(0);
  const [strategy, setStrategy] = useState<MergeStrategy>("append-rows");

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  // "Luôn sạch khi reload": cảnh báo khi rời trang nếu đang có dữ liệu.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (sheets.length > 0) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [sheets.length]);

  // Ctrl+Z = undo, Ctrl+Y / Ctrl+Shift+Z = redo (toàn cục, trừ khi đang sửa ô).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const tag = (document.activeElement?.tagName ?? "").toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "undo" });
      } else if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        dispatch({ type: "redo" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const addSheets = useCallback(
    (added: SheetData[]) =>
      dispatch({ type: "commit", updater: (prev) => [...prev, ...added] }),
    [],
  );
  const removeSheet = useCallback(
    (id: string) =>
      dispatch({ type: "commit", updater: (prev) => prev.filter((s) => s.id !== id) }),
    [],
  );
  const clearAll = useCallback(
    () => dispatch({ type: "commit", updater: () => [] }),
    [],
  );
  const updateSheet = useCallback(
    (id: string, patch: Partial<SheetData>) =>
      dispatch({
        type: "commit",
        updater: (prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      }),
    [],
  );

  const canNext =
    (step === 0 && sheets.length > 0) || (step > 0 && step < STEPS.length - 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Stepper current={step} />
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => dispatch({ type: "undo" })}
            disabled={!canUndo}
            title="Hoàn tác (Ctrl+Z)"
            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm disabled:opacity-40"
          >
            ↶ Hoàn tác
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "redo" })}
            disabled={!canRedo}
            title="Làm lại (Ctrl+Y)"
            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm disabled:opacity-40"
          >
            ↷ Làm lại
          </button>
        </div>
      </div>

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
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="rounded-lg border border-slate-300 px-4 py-2 disabled:opacity-40"
        >
          ← Quay lại
        </button>
        {step < STEPS.length - 1 && (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
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
