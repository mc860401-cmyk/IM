import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "악플 고소 접수",
  description: "악성댓글 피해 고소 상담 온라인 접수",
  robots: { index: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
