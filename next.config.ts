import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "Luôn sạch khi reload": không cache tài liệu HTML để mỗi lần tải trang
  // người dùng luôn nhận bản deploy mới nhất. Asset băm nội dung (_next/static)
  // không bị ảnh hưởng vì rule chỉ áp cho trang gốc.
  async headers() {
    return [
      {
        source: "/",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
