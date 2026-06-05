import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "ROR — Replace or Repair Check",
  description: "ThinQ 내 가정용 에어컨 의사결정 — 계속 쓸까 · 고칠까 · 바꿀까?",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {/* React 19가 <head>로 hoist */}
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap" />
        <div className="app-shell grain">
          <main className="app-main">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
