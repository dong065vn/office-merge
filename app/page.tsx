import { Wizard } from "@/components/Wizard";

// "Luôn sạch khi reload": không cho Next cache HTML, luôn render mới.
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Office Merge — Gộp file Excel / CSV
        </h1>
        <p className="mt-1 text-slate-500">
          Tải lên nhiều file, xem trước &amp; chỉnh sửa, rồi gộp và tải về theo đúng
          định dạng gốc. Mọi xử lý chạy ngay trong trình duyệt — file không rời máy bạn.
        </p>
      </header>
      <Wizard />
      <footer className="mt-10 text-center text-xs text-slate-400">
        Xử lý hoàn toàn phía trình duyệt · Không lưu dữ liệu · Tải lại trang để bắt đầu lại
      </footer>
    </main>
  );
}
