import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Office Merge — Gộp file Excel/CSV",
  description:
    "Gộp nhiều file Excel/CSV ngay trong trình duyệt: xem trước, chỉnh sửa, gộp và tải về. File không rời máy bạn.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-800">
        {children}
      </body>
    </html>
  );
}
