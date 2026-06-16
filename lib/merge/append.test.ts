import { describe, it, expect } from "vitest";
import { mergeAppendRows } from "./append";
import { ROW_ID_KEY, type SheetData } from "@/lib/types";

/** Helper dựng SheetData với mọi dòng được chọn mặc định. */
function makeSheet(
  id: string,
  headers: string[],
  rows: Record<string, string | number | boolean | null>[],
  fileName = `${id}.xlsx`,
): SheetData {
  const withIds = rows.map((r, i) => ({ ...r, [ROW_ID_KEY]: `${id}-${i}` }));
  return {
    id,
    fileName,
    format: "xlsx",
    headers,
    rows: withIds,
    selectedRowIds: new Set(withIds.map((r) => r[ROW_ID_KEY] as string)),
  };
}

describe("mergeAppendRows", () => {
  it("nối dòng các file cùng cấu trúc cột, không cảnh báo", () => {
    const a = makeSheet("a", ["Ten", "Tuoi"], [{ Ten: "An", Tuoi: 20 }]);
    const b = makeSheet("b", ["Ten", "Tuoi"], [{ Ten: "Binh", Tuoi: 30 }]);

    const result = mergeAppendRows([a, b]);

    expect(result.headers).toEqual(["Ten", "Tuoi"]);
    expect(result.rows.map((r) => r.Ten)).toEqual(["An", "Binh"]);
    expect(result.warnings).toHaveLength(0);
  });

  it("chỉ gộp các dòng được chọn", () => {
    const a = makeSheet("a", ["Ten"], [{ Ten: "An" }, { Ten: "Bỏ" }]);
    a.selectedRowIds = new Set(["a-0"]); // bỏ dòng a-1

    const result = mergeAppendRows([a]);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].Ten).toBe("An");
  });

  it("cột lệch -> hợp nhất cột (union) và sinh cảnh báo, ô thiếu là null", () => {
    const a = makeSheet("a", ["Ten", "Tuoi"], [{ Ten: "An", Tuoi: 20 }]);
    const b = makeSheet("b", ["Ten", "Email"], [{ Ten: "Binh", Email: "b@x.vn" }]);

    const result = mergeAppendRows([a, b]);

    expect(result.headers).toEqual(["Ten", "Tuoi", "Email"]);
    expect(result.rows[0]).toMatchObject({ Ten: "An", Tuoi: 20, Email: null });
    expect(result.rows[1]).toMatchObject({ Ten: "Binh", Tuoi: null, Email: "b@x.vn" });
    expect(result.warnings.some((w) => w.level === "warning")).toBe(true);
  });

  it("không gắn khóa nội bộ ROW_ID_KEY vào kết quả", () => {
    const a = makeSheet("a", ["Ten"], [{ Ten: "An" }]);
    const result = mergeAppendRows([a]);
    expect(ROW_ID_KEY in result.rows[0]).toBe(false);
  });

  it("danh sách rỗng -> kết quả rỗng, có cảnh báo lỗi", () => {
    const result = mergeAppendRows([]);
    expect(result.rows).toHaveLength(0);
    expect(result.warnings.some((w) => w.level === "error")).toBe(true);
  });
});
