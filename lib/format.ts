import type { TableFormat } from "@/lib/types";

/** Các đuôi file được hỗ trợ. */
export const ACCEPTED_EXTENSIONS = [".xlsx", ".xls", ".csv"] as const;

/**
 * Suy ra định dạng bảng từ tên file. Mặc định "xlsx" nếu không nhận diện được
 * (theo yêu cầu: định dạng xuất mặc định là Excel).
 */
export function detectFormat(fileName: string): TableFormat {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".xls")) return "xls";
  return "xlsx";
}

/** Đuôi file tương ứng một định dạng. */
export function extensionFor(format: TableFormat): string {
  return format === "csv" ? ".csv" : format === "xls" ? ".xls" : ".xlsx";
}

/** MIME type tương ứng một định dạng (dùng khi tạo Blob tải về). */
export function mimeFor(format: TableFormat): string {
  switch (format) {
    case "csv":
      return "text/csv;charset=utf-8";
    case "xls":
      return "application/vnd.ms-excel";
    default:
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
}
