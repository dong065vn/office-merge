/** Định dạng file dữ liệu bảng được hỗ trợ. */
export type TableFormat = "xlsx" | "xls" | "csv";

/** Một ô có thể là chuỗi, số, boolean, hoặc rỗng. */
export type CellValue = string | number | boolean | null;

/** Một dòng dữ liệu: ánh xạ tên cột -> giá trị ô. */
export type Row = Record<string, CellValue>;

/**
 * Dữ liệu một bảng đã parse từ một file. Giữ trong RAM trong suốt phiên,
 * không lưu xuống localStorage (yêu cầu "luôn sạch khi reload").
 */
export interface SheetData {
  /** id nội bộ, ổn định trong phiên. */
  id: string;
  /** tên file gốc, dùng làm nhãn và để suy ra định dạng xuất. */
  fileName: string;
  /** định dạng nguồn — quyết định định dạng xuất mặc định. */
  format: TableFormat;
  /** danh sách cột theo thứ tự. */
  headers: string[];
  /** các dòng dữ liệu; mỗi dòng có khóa `__id` nội bộ để chọn/sửa. */
  rows: Row[];
  /** id các dòng được chọn để đưa vào kết quả gộp. */
  selectedRowIds: Set<string>;
}

/** Khóa nội bộ gắn vào mỗi dòng để theo dõi chọn/sửa, không xuất ra file. */
export const ROW_ID_KEY = "__rowId" as const;

/** Các kiểu gộp được hỗ trợ. */
export type MergeStrategy =
  /** Nối dòng các file cùng cấu trúc cột thành 1 bảng (mặc định, khuyến nghị). */
  | "append-rows";

/** Cảnh báo phát sinh khi validate trước lúc gộp. */
export interface MergeWarning {
  level: "warning" | "error";
  message: string;
}

/** Kết quả gộp: bảng đã gộp + các cảnh báo (nếu có). */
export interface MergeResult {
  headers: string[];
  rows: Row[];
  warnings: MergeWarning[];
}
