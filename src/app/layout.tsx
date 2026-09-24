import type { Metadata } from "next";
import "./globals.css";
import { isDemoMode } from "@/lib/demo";

export const metadata: Metadata = {
  title: "법무법인 우선 | 악플 고소 접수",
  description: "흔들린 오늘을 바로잡고, 더 높은 내일을 세웁니다. 법무법인 우선 악성댓글 피해 온라인 고소 접수",
  icons: { icon: "/brand/visual_logo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        {isDemoMode() && (
          <div className="demo-banner" role="note">
            초안(데모) 사이트입니다 — 실제 접수를 받지 않으며, 입력한 내용은 서버가 재시작되면 사라집니다.
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
