import { extensionFor, mimeFor } from "@/lib/format";
import type { Row, TableFormat } from "@/lib/types";
import { serialize } from "./serialize";

/** Bỏ đuôi file để ghép tên xuất theo định dạng đích. */
function stripExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

/**
 * Tạo Blob từ dữ liệu đã gộp và kích hoạt tải về trong trình duyệt.
 * Tên file gợi ý dựa trên `baseName` + đúng đuôi của định dạng đích.
 */
export function downloadTable(
  headers: string[],
  rows: Row[],
  format: TableFormat,
  baseName = "ket-qua-gop",
): void {
  const bytes = serialize(headers, rows, format);
  const blob = new Blob([bytes as BlobPart], { type: mimeFor(format) });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${stripExtension(baseName)}${extensionFor(format)}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Giải phóng ngay để không giữ blob trong RAM (yêu cầu "luôn sạch").
  URL.revokeObjectURL(url);
}
