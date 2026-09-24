import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
