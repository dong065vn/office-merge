import type { MergeResult, MergeStrategy, SheetData } from "@/lib/types";
import { mergeAppendRows } from "./append";
import { mergeConcatNoSpace } from "./concat-no-space";

/** Mô tả một kiểu gộp để hiển thị trong danh sách chọn. */
export interface StrategyInfo {
  value: MergeStrategy;
  label: string;
  description: string;
  recommended?: boolean;
}

/** Danh sách kiểu gộp được hỗ trợ (v1). */
export const MERGE_STRATEGIES: StrategyInfo[] = [
  {
    value: "append-rows",
    label: "Nối dòng các file (cùng cấu trúc cột)",
    description:
      "Dồn tất cả dòng từ các file thành một bảng duy nhất. Phù hợp khi các file có cùng các cột.",
    recommended: true,
  },
  {
    value: "concat-no-space",
    label: "Gộp nối tiếp (không khoảng trắng)",
    description:
      "Nối giá trị ô cùng cột từ nhiều file liền nhau, không thêm khoảng trắng. " +
      "Giữ nguyên cấu trúc dòng/cột — cùng dòng thứ i của mỗi file được gộp thành 1 dòng.",
  },
];

/** Thực thi gộp theo kiểu đã chọn. */
export function runMerge(sheets: SheetData[], strategy: MergeStrategy): MergeResult {
  switch (strategy) {
    case "concat-no-space":
      return mergeConcatNoSpace(sheets);
    case "append-rows":
    default:
      return mergeAppendRows(sheets);
  }
}

