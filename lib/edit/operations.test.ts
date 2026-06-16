import { describe, it, expect } from "vitest";
import {
  addColumn,
  addRow,
  clearCells,
  deleteColumn,
  renameColumn,
  reorderColumns,
  sortRows,
} from "./operations";
import { ROW_ID_KEY, type SheetData } from "@/lib/types";

function makeSheet(): SheetData {
  const rows = [
    { [ROW_ID_KEY]: "s-0", Ten: "Bình", Tuoi: 30 },
    { [ROW_ID_KEY]: "s-1", Ten: "An", Tuoi: 20 },
  ];
  return {
    id: "s",
    fileName: "s.xlsx",
    format: "xlsx",
    headers: ["Ten", "Tuoi"],
    rows,
    selectedRowIds: new Set(["s-0", "s-1"]),
  };
}

describe("column operations", () => {
  it("addColumn thêm cột trống, không trùng tên", () => {
    const r = addColumn(addColumn(makeSheet(), "X"), "X");
    expect(r.headers).toEqual(["Ten", "Tuoi", "X", "X 2"]);
    expect(r.rows[0].X).toBe(null);
  });

  it("deleteColumn bỏ header và key ở mọi dòng", () => {
    const r = deleteColumn(makeSheet(), "Tuoi");
    expect(r.headers).toEqual(["Ten"]);
    expect("Tuoi" in r.rows[0]).toBe(false);
  });

  it("renameColumn đổi header và key, giữ giá trị", () => {
    const r = renameColumn(makeSheet(), "Ten", "Họ tên");
    expect(r.headers).toEqual(["Họ tên", "Tuoi"]);
    expect(r.rows[0]["Họ tên"]).toBe("Bình");
    expect("Ten" in r.rows[0]).toBe(false);
  });

  it("renameColumn trùng tên cột khác -> tự thêm hậu tố", () => {
    const r = renameColumn(makeSheet(), "Ten", "Tuoi");
    expect(r.headers).toEqual(["Tuoi 2", "Tuoi"]);
  });

  it("reorderColumns chuyển cột tới vị trí đích", () => {
    const r = reorderColumns(makeSheet(), "Tuoi", "Ten");
    expect(r.headers).toEqual(["Tuoi", "Ten"]);
  });
});

describe("clearCells (xóa nội dung vùng quét)", () => {
  it("xóa nội dung vùng chữ nhật về null, giữ nguyên dòng/cột", () => {
    const s = makeSheet(); // 2 dòng, cột [Ten, Tuoi]
    const r = clearCells(s, 0, 1, 1, 1); // chỉ cột Tuoi
    expect(r.rows.map((x) => x.Tuoi)).toEqual([null, null]);
    expect(r.rows.map((x) => x.Ten)).toEqual(["Bình", "An"]); // không đụng
    expect(r.headers).toEqual(["Ten", "Tuoi"]);
    expect(r.rows).toHaveLength(2);
  });

  it("chuẩn hóa thứ tự chỉ số và kẹp trong biên", () => {
    const s = makeSheet();
    const r = clearCells(s, 5, 0, 0, 0); // dòng ngược + vượt biên, chỉ cột Ten
    expect(r.rows.map((x) => x.Ten)).toEqual([null, null]);
    expect(r.rows.map((x) => x.Tuoi)).toEqual([30, 20]);
  });

  it("vùng rỗng -> trả nguyên sheet", () => {
    const s = makeSheet();
    expect(clearCells(s, -5, -1, 0, 0)).toBe(s);
  });
});

describe("row operations", () => {
  it("addRow thêm dòng trống và chọn sẵn", () => {
    const r = addRow(makeSheet());
    expect(r.rows).toHaveLength(3);
    const newRow = r.rows[2];
    expect(newRow.Ten).toBe(null);
    expect(r.selectedRowIds.has(newRow[ROW_ID_KEY] as unknown as string)).toBe(true);
  });

  it("sortRows ASC theo số", () => {
    const r = sortRows(makeSheet(), "Tuoi", "ASC");
    expect(r.rows.map((x) => x.Tuoi)).toEqual([20, 30]);
  });

  it("sortRows ASC theo chuỗi tiếng Việt", () => {
    const r = sortRows(makeSheet(), "Ten", "ASC");
    expect(r.rows.map((x) => x.Ten)).toEqual(["An", "Bình"]);
  });

  it("sortRows đưa ô rỗng xuống cuối", () => {
    const s = makeSheet();
    s.rows[0].Tuoi = null;
    const r = sortRows(s, "Tuoi", "ASC");
    expect(r.rows[r.rows.length - 1].Tuoi).toBe(null);
  });
});
