"use client";

import Link from "next/link";

export default function AdminHeader() {
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }
  return (
    <header className="spread" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10, marginBottom: 8 }}>
      <Link href="/admin" style={{ fontWeight: 700, color: "var(--text)", textDecoration: "none" }}>악플 고소 접수 · 전산</Link>
      <button type="button" className="btn secondary small" onClick={logout}>로그아웃</button>
    </header>
  );
}
