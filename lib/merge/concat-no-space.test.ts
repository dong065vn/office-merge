import { describe, it, expect } from "vitest";
import { mergeConcatNoSpace } from "./concat-no-space";
import { ROW_ID_KEY, type SheetData } from "@/lib/types";

function makeSheet(id: string, data: Record<string, unknown>[]): SheetData {
  const headers = Object.keys(data[0] ?? {}).filter((k) => k !== ROW_ID_KEY);
  const rows = data.map((d, i) => ({ [ROW_ID_KEY]: `${id}-${i}`, ...d }));
  return {
    id,
    fileName: `${id}.xlsx`,
    format: "xlsx",
    headers,
    rows,
    selectedRowIds: new Set(rows.map((r) => r[ROW_ID_KEY] as string)),
  };
}

describe("mergeConcatNoSpace", () => {
  it("nối giá trị cùng cột không khoảng trắng", () => {
    const s1 = makeSheet("a", [{ X: "Hello", Y: 1 }]);
    const s2 = makeSheet("b", [{ X: "World", Y: 2 }]);
    const result = mergeConcatNoSpace([s1, s2]);
    expect(result.headers).toEqual(["X", "Y"]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].X).toBe("HelloWorld");
    expect(result.rows[0].Y).toBe("12");
  });

  it("giữ nguyên khi chỉ 1 sheet", () => {
    const s = makeSheet("a", [{ X: "abc" }]);
    const result = mergeConcatNoSpace([s]);
    expect(result.rows[0].X).toBe("abc");
  });

  it("file có số dòng khác nhau → cảnh báo, dòng thừa giữ nguyên", () => {
    const s1 = makeSheet("a", [{ X: "A" }, { X: "B" }]);
    const s2 = makeSheet("b", [{ X: "1" }]);
    const result = mergeConcatNoSpace([s1, s2]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].X).toBe("A1");
    expect(result.rows[1].X).toBe("B"); // s2 không có dòng thứ 2
    expect(result.warnings.some((w) => w.message.includes("không bằng nhau"))).toBe(true);
  });

  it("ô rỗng được bỏ qua khi nối", () => {
    const s1 = makeSheet("a", [{ X: "abc" }]);
    const s2 = makeSheet("b", [{ X: null }]);
    const result = mergeConcatNoSpace([s1, s2]);
    expect(result.rows[0].X).toBe("abc");
  });

  it("tất cả ô rỗng → null", () => {
    const s1 = makeSheet("a", [{ X: null }]);
    const s2 = makeSheet("b", [{ X: null }]);
    const result = mergeConcatNoSpace([s1, s2]);
    expect(result.rows[0].X).toBe(null);
  });

  it("trả lỗi khi không có sheet", () => {
    const result = mergeConcatNoSpace([]);
    expect(result.warnings.some((w) => w.level === "error")).toBe(true);
    expect(result.rows).toHaveLength(0);
  });

  it("hợp nhất cột khác cấu trúc", () => {
    const s1 = makeSheet("a", [{ X: "A" }]);
    const s2 = makeSheet("b", [{ X: "1", Y: "extra" }]);
    const result = mergeConcatNoSpace([s1, s2]);
    expect(result.headers).toEqual(["X", "Y"]);
    expect(result.rows[0].X).toBe("A1");
    expect(result.rows[0].Y).toBe("extra");
    expect(result.warnings.some((w) => w.message.includes("không hoàn toàn giống"))).toBe(true);
  });
});
