import { describe, it, expect } from "vitest";
import { serialize } from "@/lib/export/serialize";
import { parseTable } from "@/lib/parsers/parse";
import { detectFormat, extensionFor } from "@/lib/format";
import { ROW_ID_KEY } from "@/lib/types";

describe("parse <-> serialize round-trip", () => {
  const headers = ["Ten", "Tuoi", "Email"];
  const rows = [
    { Ten: "An", Tuoi: 20, Email: "an@x.vn" },
    { Ten: "Bình", Tuoi: 30, Email: "binh@x.vn" }, // tiếng Việt có dấu
  ];

  for (const format of ["xlsx", "csv"] as const) {
    it(`giữ nguyên dữ liệu qua ${format}`, () => {
      const bytes = serialize(headers, rows, format);
      const parsed = parseTable(bytes, `out${extensionFor(format)}`);

      expect(parsed.headers).toEqual(headers);
      expect(parsed.rows).toHaveLength(2);
      expect(String(parsed.rows[0].Ten)).toBe("An");
      expect(String(parsed.rows[1].Ten)).toBe("Bình");
      expect(Number(parsed.rows[0].Tuoi)).toBe(20);
    });
  }

  it("gắn ROW_ID_KEY cho mỗi dòng và chọn sẵn tất cả", () => {
    const bytes = serialize(headers, rows, "xlsx");
    const parsed = parseTable(bytes, "out.xlsx");
    expect(parsed.rows.every((r) => typeof r[ROW_ID_KEY] === "string")).toBe(true);
    expect(parsed.selectedRowIds.size).toBe(2);
  });

  it("ô tiêu đề trống -> đặt tên Cột N", () => {
    const bytes = serialize(["Ten", "", "Email"], [{ Ten: "An", Email: "a@x.vn" }], "xlsx");
    const parsed = parseTable(bytes, "out.xlsx");
    expect(parsed.headers[1]).toBe("Cột 2");
  });

  it("detectFormat suy ra đúng định dạng đích", () => {
    expect(detectFormat("a.csv")).toBe("csv");
    expect(detectFormat("a.XLSX")).toBe("xlsx");
    expect(detectFormat("a.unknown")).toBe("xlsx"); // mặc định Excel
  });
});
