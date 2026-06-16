/// <reference lib="webworker" />
import { parseTable } from "@/lib/parsers/parse";
import { runMerge } from "@/lib/merge";
import type { MergeResult, MergeStrategy, SheetData } from "@/lib/types";

type Request =
  | { type: "parse"; id: number; buffer: ArrayBuffer; fileName: string }
  | { type: "merge"; id: number; sheets: SheetData[]; strategy: MergeStrategy };

type Response =
  | { type: "parsed"; id: number; sheet: SheetData }
  | { type: "merged"; id: number; result: MergeResult }
  | { type: "error"; id: number; message: string };

self.onmessage = (e: MessageEvent<Request>) => {
  const msg = e.data;
  try {
    if (msg.type === "parse") {
      const sheet = parseTable(new Uint8Array(msg.buffer), msg.fileName);
      const res: Response = { type: "parsed", id: msg.id, sheet };
      (self as unknown as Worker).postMessage(res);
    } else if (msg.type === "merge") {
      // selectedRowIds đi qua structured clone vẫn là Set.
      const result = runMerge(msg.sheets, msg.strategy);
      const res: Response = { type: "merged", id: msg.id, result };
      (self as unknown as Worker).postMessage(res);
    }
  } catch (err) {
    const res: Response = {
      type: "error",
      id: msg.id,
      message: err instanceof Error ? err.message : String(err),
    };
    (self as unknown as Worker).postMessage(res);
  }
};
