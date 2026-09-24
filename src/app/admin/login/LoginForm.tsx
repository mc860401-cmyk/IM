"use client";

import { useState } from "react";

export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }).catch(() => null);
    if (res?.ok) {
      window.location.href = "/admin";
      return;
    }
    const data = await res?.json().catch(() => ({}));
    setError(data?.error ?? "로그인에 실패했습니다.");
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="password">비밀번호</label>
      <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
      {error && <div className="error" role="alert">{error}</div>}
      <button className="btn" type="submit" disabled={busy || !password} style={{ width: "100%", marginTop: 12 }}>
        {busy ? "확인 중…" : "로그인"}
      </button>
    </form>
  );
}
