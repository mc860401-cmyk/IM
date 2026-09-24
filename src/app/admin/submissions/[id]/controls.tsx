"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STATUSES, type Status } from "@/lib/constants";
import { formatKst } from "@/lib/time";

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "요청에 실패했습니다.");
  return data;
}

export function StatusControl({ id, status }: { id: string; status: Status }) {
  const router = useRouter();
  const [value, setValue] = useState<Status>(status);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function change(next: Status) {
    const prev = value;
    setValue(next);
    setBusy(true);
    setMsg("");
    try {
      await send(`/api/admin/submissions/${id}`, "PATCH", { status: next });
      setMsg("저장됨");
      router.refresh();
    } catch (e) {
      setValue(prev);
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="row">
      <label htmlFor="status" style={{ margin: 0 }}>상태</label>
      <select id="status" value={value} disabled={busy} onChange={(e) => change(e.target.value as Status)} style={{ width: "auto" }}>
        {(Object.keys(STATUSES) as Status[]).map((s) => <option key={s} value={s}>{STATUSES[s]}</option>)}
      </select>
      <span className={`badge ${value}`}>{STATUSES[value]}</span>
      {msg && <span className="muted" role="status">{msg}</span>}
    </div>
  );
}

interface Memo { id: string; body: string; created_at: string }

export function MemoPanel({ id, initial }: { id: string; initial: Memo[] }) {
  const [memos, setMemos] = useState<Memo[]>(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    try {
      const m = await send(`/api/admin/submissions/${id}/memos`, "POST", { body: text });
      setMemos((l) => [...l, m]);
      setText("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2>내부 메모 <span className="muted">(고객에게 보이지 않음)</span></h2>
      {memos.length === 0 && <p className="muted">메모가 없습니다.</p>}
      {memos.map((m) => (
        <div key={m.id} style={{ borderLeft: "3px solid var(--line)", padding: "4px 10px", margin: "8px 0" }}>
          <div className="muted">{formatKst(m.created_at)}</div>
          <div style={{ whiteSpace: "pre-wrap" }}>{m.body}</div>
        </div>
      ))}
      <form onSubmit={add}>
        <label htmlFor="memo" className="muted" style={{ fontWeight: 400 }}>새 메모</label>
        <textarea id="memo" value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 80 }} />
        {error && <div className="error" role="alert">{error}</div>}
        <button className="btn" type="submit" disabled={busy || !text.trim()} style={{ marginTop: 8 }}>메모 추가</button>
      </form>
    </section>
  );
}

export function DeleteButton({ id, receiptNo }: { id: string; receiptNo: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onDelete() {
    const typed = window.prompt(`삭제하려면 접수번호 ${receiptNo} 를 입력하세요.`);
    if (typed?.trim() !== receiptNo) return;
    setBusy(true);
    setError("");
    try {
      await send(`/api/admin/submissions/${id}`, "DELETE");
      window.location.href = "/admin";
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="btn danger" onClick={onDelete} disabled={busy}>접수 삭제</button>
      {error && <div className="error" role="alert">{error}</div>}
    </>
  );
}
