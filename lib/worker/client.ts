import { parseTable } from "@/lib/parsers/parse";
import { runMerge } from "@/lib/merge";
import type { MergeResult, MergeStrategy, SheetData } from "@/lib/types";

/**
 * Client cho Web Worker xử lý parse/merge ở luồng nền, giữ UI không treo.
 * Nếu môi trường không hỗ trợ Worker, tự fallback chạy đồng bộ trên main thread.
 */
let worker: Worker | null = null;
let seq = 0;
const pending = new Map<
  number,
  { resolve: (v: unknown) => void; reject: (e: Error) => void }
>();

function getWorker(): Worker | null {
  if (typeof window === "undefined" || typeof Worker === "undefined") return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("../../workers/sheet.worker.ts", import.meta.url));
    worker.onmessage = (e: MessageEvent) => {
      const { id, type } = e.data;
      const entry = pending.get(id);
      if (!entry) return;
      pending.delete(id);
      if (type === "error") entry.reject(new Error(e.data.message));
      else if (type === "parsed") entry.resolve(e.data.sheet);
      else if (type === "merged") entry.resolve(e.data.result);
    };
    worker.onerror = () => {
      // Một lỗi worker -> tắt worker, các lần sau fallback sync.
      worker = null;
    };
    return worker;
  } catch {
    return null;
  }
}

/** Parse một file thành SheetData (qua worker nếu có). */
export function parseFileAsync(file: File): Promise<SheetData> {
  return file.arrayBuffer().then((buffer) => {
    const w = getWorker();
    if (!w) return parseTable(new Uint8Array(buffer), file.name);
    const id = ++seq;
    return new Promise<SheetData>((resolve, reject) => {
      pending.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
      });
      w.postMessage({ type: "parse", id, buffer, fileName: file.name }, [buffer]);
    });
  });
}

/** Gộp các sheet theo kiểu đã chọn (qua worker nếu có). */
export function mergeAsync(
  sheets: SheetData[],
  strategy: MergeStrategy,
): Promise<MergeResult> {
  const w = getWorker();
  if (!w) return Promise.resolve(runMerge(sheets, strategy));
  const id = ++seq;
  return new Promise<MergeResult>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    w.postMessage({ type: "merge", id, sheets, strategy });
  });
}
