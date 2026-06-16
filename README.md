# Office Merge

Web app **gộp file Excel / CSV** chạy hoàn toàn trong trình duyệt. Tải lên nhiều file,
xem trước & chỉnh sửa dữ liệu, gộp lại và tải về theo đúng định dạng gốc. **File không
bao giờ rời máy người dùng** — mọi xử lý chạy client-side.

## Tính năng

- 📂 Kéo-thả nhiều file `.xlsx`, `.xls`, `.csv`
- 👀 Xem trước từng file, **sửa trực tiếp giá trị ô**
- ✅ Tick chọn dòng đưa vào kết quả, lọc/xóa dòng không cần
- 🔀 Gộp theo kiểu **nối dòng** (các file cùng cấu trúc cột) — có validate & cảnh báo khi cột lệch
- ⬇️ Tải về theo đúng định dạng gốc (mặc định Excel `.xlsx`), hoặc chọn `.xls` / `.csv`
- ⚡ Parse/gộp chạy trong **Web Worker** để UI không treo với file lớn
- 🧹 **Luôn sạch khi reload**: không lưu localStorage, HTML `no-store`, không service worker

## Công nghệ

- Next.js 16 (App Router) + TypeScript
- [SheetJS `xlsx`](https://sheetjs.com) — đọc/ghi xlsx/xls/csv
- [react-data-grid](https://github.com/adazzle/react-data-grid) — bảng xem trước & chỉnh sửa
- Tailwind CSS v4

## Phát triển

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # chạy unit test (vitest)
npm run build    # build production
```

## Deploy lên Vercel

1. Push repo này lên GitHub.
2. Vào [vercel.com/new](https://vercel.com/new), import repo. Vercel tự nhận framework Next.js.
3. Không cần biến môi trường. Bấm **Deploy**.

Hoặc dùng CLI:

```bash
npm i -g vercel
vercel        # preview
vercel --prod # production
```

## Cấu trúc

```
app/            # trang Next.js (force-dynamic, no-store)
components/     # Wizard + 4 bước: Upload, Review, MergeConfig, Export
lib/
  types.ts      # SheetData, MergeResult…
  format.ts     # nhận diện/đuôi/MIME định dạng
  parsers/      # parse file -> SheetData (+ test round-trip)
  merge/        # logic gộp append-rows (+ test)
  export/       # serialize + download
  worker/       # client cho Web Worker (fallback sync)
workers/        # Web Worker parse/merge
docs/           # spec thiết kế
```

## Phạm vi v1 & hướng mở rộng

v1 tập trung dữ liệu bảng (Excel/CSV) với kiểu gộp nối dòng. Có thể mở rộng:
mỗi file → 1 sheet, gộp theo khóa (join), ánh xạ cột lệch tên, loại trùng (dedup).
