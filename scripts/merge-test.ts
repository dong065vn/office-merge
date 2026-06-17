/**
 * Script xuất file merge từ 3 file trong file-merge/.
 * Chạy: npx tsx scripts/merge-test.ts
 */
import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";

const INPUT_DIR = path.resolve(__dirname, "../file-merge");
const OUTPUT_FILE = path.resolve(INPUT_DIR, "ket-qua-gop.xlsx");

// Đọc tất cả file xlsx trong thư mục file-merge.
const files = fs
  .readdirSync(INPUT_DIR)
  .filter((f) => /\.(xlsx|xls|csv)$/i.test(f) && f !== "ket-qua-gop.xlsx");

console.log(`Đọc ${files.length} file: ${files.join(", ")}`);

interface ParsedSheet {
  fileName: string;
  headers: string[];
  rows: Record<string, unknown>[];
}

const sheets: ParsedSheet[] = [];
for (const file of files) {
  const filePath = path.join(INPUT_DIR, file);
  const buf = fs.readFileSync(filePath);
  const wb = XLSX.read(buf, { type: "buffer" });
  const firstSheet = wb.SheetNames[0];
  if (!firstSheet) {
    console.warn(`  ⚠️ ${file}: không có sheet nào`);
    continue;
  }
  const ws = wb.Sheets[firstSheet]!;
  const aoa: unknown[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
    blankrows: false,
  });

  const rawHeaders = (aoa[0] ?? []) as (string | null)[];
  const headers = rawHeaders.map((h, i) =>
    h === null || h === undefined || String(h).trim() === "" ? `Cột ${i + 1}` : String(h),
  );

  const rows = aoa.slice(1).map((cells) => {
    const row: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      const v = (cells as unknown[])[i];
      row[h] = v === undefined ? null : v;
    });
    return row;
  });

  sheets.push({ fileName: file, headers, rows });
  console.log(`  ✓ ${file}: ${rows.length} dòng, ${headers.length} cột`);
}

if (sheets.length === 0) {
  console.error("Không có file nào để gộp!");
  process.exit(1);
}

// Merge append-rows: union headers, nối dòng.
const mergedHeaders: string[] = [];
const seen = new Set<string>();
for (const s of sheets) {
  for (const h of s.headers) {
    if (!seen.has(h)) {
      seen.add(h);
      mergedHeaders.push(h);
    }
  }
}

const mergedRows: Record<string, unknown>[] = [];
for (const s of sheets) {
  for (const row of s.rows) {
    const merged: Record<string, unknown> = {};
    for (const h of mergedHeaders) {
      merged[h] = row[h] ?? null;
    }
    mergedRows.push(merged);
  }
}

console.log(`\nKết quả gộp: ${mergedRows.length} dòng, ${mergedHeaders.length} cột`);

// Xuất file xlsx.
const aoa: unknown[][] = [
  mergedHeaders,
  ...mergedRows.map((r) => mergedHeaders.map((h) => r[h] ?? "")),
];
const ws = XLSX.utils.aoa_to_sheet(aoa);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Data");
XLSX.writeFile(wb, OUTPUT_FILE);

console.log(`✓ Đã xuất: ${OUTPUT_FILE}`);
