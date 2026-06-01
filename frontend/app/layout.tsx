import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LG LifeCycle Decision Check",
  description: "가전 유지·수리·구독·교체 의사결정 TOOL",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 sticky top-0 z-10">
          <span className="text-2xl font-black text-red-700">LG</span>
          <span className="text-sm font-semibold text-gray-600">LifeCycle Decision Check</span>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
        <footer className="text-center text-xs text-gray-400 py-6 border-t">
          모든 수치는 현재 입력 조건 기준 추정 결과이며, 정확한 고장 예측이 아닙니다.
        </footer>
      </body>
    </html>
  );
}
