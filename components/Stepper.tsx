"use client";

export const STEPS = ["Tải lên", "Xem & sửa", "Cấu hình gộp", "Xuất file"] as const;

export function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 text-sm">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={[
                "flex h-7 w-7 items-center justify-center rounded-full font-medium",
                active
                  ? "bg-blue-600 text-white"
                  : done
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-200 text-slate-500",
              ].join(" ")}
            >
              {done ? "✓" : i + 1}
            </span>
            <span className={active ? "font-semibold text-slate-900" : "text-slate-500"}>
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="mx-1 text-slate-300">›</span>}
          </li>
        );
      })}
    </ol>
  );
}
