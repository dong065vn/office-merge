# Office Merge — Thiết kế

**Ngày:** 2026-06-16
**Trạng thái:** Đã duyệt, đang triển khai

## Mục tiêu
Web app GUI gộp dữ liệu bảng (Excel/CSV), deploy trên Vercel. Người dùng tải lên nhiều
file, xem trước & chỉnh sửa, gộp lại và tải về theo đúng định dạng gốc. Xử lý hoàn toàn
client-side — file không bao giờ rời máy người dùng.

## Phạm vi v1
- **Định dạng vào:** `.xlsx`, `.xls`, `.csv`
- **Kiểu gộp:** danh sách có validate; recommend mặc định = *nối dòng (append rows) các
  file cùng cấu trúc cột thành 1 file*. Các kiểu khác có thể bổ sung sau (mỗi file → 1 sheet, join theo khóa).
- **Review/Edit:** xem trước + sửa giá trị ô; tick chọn dòng & lọc/xóa dòng.
- **Định dạng ra:** khớp đúng định dạng file gốc (`.xlsx` mặc định khi không rõ).

## Ngoài phạm vi v1 (YAGNI)
- Gộp tài liệu Word/PDF (cơ chế khác hẳn).
- Ánh xạ cột lệch tên, loại trùng (dedup) — cân nhắc v2.
- Tài khoản, lưu trữ phía server, lịch sử.

## Stack
- **Next.js (App Router) + TypeScript** — native Vercel.
- **SheetJS (`xlsx`)** — đọc/ghi xlsx/xls/csv client-side.
- **react-data-grid** (MIT) — bảng xem trước, sửa ô, chọn dòng.
- **Tailwind CSS + shadcn/ui** — UI tiếng Việt.
- **Web Worker** — parse/merge ở luồng nền.

## Yêu cầu "luôn sạch khi reload"
- Không dùng localStorage/sessionStorage cho file/edit → state chỉ in-memory.
- HTTP `Cache-Control: no-store` cho HTML; không đăng ký service worker.
- Dọn blob/object trong RAM khi `beforeunload`.

## Luồng (wizard 4 bước)
1. **Upload** — kéo-thả nhiều file; parse trong Web Worker thành bảng in-memory.
2. **Review & Edit** — mỗi file 1 tab: xem trước, sửa ô, chọn/xóa/lọc dòng.
3. **Cấu hình gộp** — chọn kiểu gộp (recommend append-rows); validate cấu trúc cột, cảnh báo lệch.
4. **Xuất** — gộp trong Web Worker → tải về theo định dạng gốc.

## Kiến trúc module
- `lib/parsers/` — đọc file → cấu trúc `SheetData` (headers + rows). Tách biệt I/O đọc.
- `lib/merge/` — thuần logic gộp (append-rows, validate cột). Không phụ thuộc UI/DOM → test được.
- `lib/export/` — `SheetData` → blob theo định dạng đích.
- `workers/` — Web Worker bọc parse/merge cho file nặng.
- `components/` — UploadStep, ReviewGrid, MergeConfig, ExportStep, Wizard.
- `app/` — trang chính + headers no-store.

## Mô hình dữ liệu
```ts
type SheetData = {
  id: string;          // id nội bộ
  fileName: string;    // tên file gốc
  format: 'xlsx' | 'xls' | 'csv';
  headers: string[];
  rows: Record<string, unknown>[];
  selectedRowIds: Set<string>; // dòng được chọn để gộp
};
```

## Xử lý lỗi
- File hỏng/không parse được → báo lỗi theo từng file, không chặn các file khác.
- Cấu trúc cột lệch khi append → cảnh báo, cho phép tiếp tục (gộp theo union cột) hoặc hủy.
- File quá lớn → cảnh báo ngưỡng dòng; xử lý qua worker để không treo UI.

## Test
- Unit test (vitest) cho `lib/merge` và `lib/export`: append cùng cột, lệch cột, chọn dòng, round-trip định dạng.
- Test parser với file mẫu nhỏ xlsx/csv.

## Deploy
- Vercel, framework Next.js, không cần biến môi trường.
- `vercel.json`/headers cấu hình `Cache-Control: no-store` cho document.
