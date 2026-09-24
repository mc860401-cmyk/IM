"use client";

import { useRef, useState } from "react";
import { LIMITS } from "@/lib/constants";
import { ACCEPT_ATTR, formatBytes, precheckFile } from "@/lib/files";

export interface UploadedMeta {
  id: string;
  name: string;
  size: number;
}

interface Props {
  inputId: string;
  files: UploadedMeta[];
  totalCount: number; // 접수 전체의 첨부 개수(모든 악플 합산)
  onAdd: (f: UploadedMeta) => void;
  onRemove: (id: string) => void;
  onBusyChange: (delta: number) => void;
  error?: string;
}

export default function EvidencePicker({ inputId, files, totalCount, onAdd, onRemove, onBusyChange, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [msgs, setMsgs] = useState<string[]>([]);
  const [busy, setBusy] = useState(0);

  async function handle(list: FileList | null) {
    if (!list || list.length === 0) return;
    const picked = Array.from(list);
    const problems: string[] = [];
    let room = LIMITS.filesPerSubmission - totalCount;
    for (const f of picked) {
      const pre = precheckFile(f.name, f.size);
      if (pre) { problems.push(`${f.name}: ${pre}`); continue; }
      if (room <= 0) { problems.push(`${f.name}: 접수당 ${LIMITS.filesPerSubmission}개까지 첨부할 수 있습니다.`); continue; }
      room -= 1;
      setBusy((n) => n + 1);
      onBusyChange(1);
      try {
        const fd = new FormData();
        fd.append("file", f);
        const res = await fetch("/api/uploads", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (res.ok) onAdd({ id: data.id, name: data.name, size: data.size });
        else { problems.push(`${f.name}: ${data.error ?? "업로드 실패"}`); room += 1; }
      } catch {
        problems.push(`${f.name}: 네트워크 오류로 업로드하지 못했습니다.`);
        room += 1;
      } finally {
        setBusy((n) => n - 1);
        onBusyChange(-1);
      }
    }
    setMsgs(problems);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="field full">
      <label htmlFor={inputId}>증거파일(캡처·PDF) <span className="muted">— 선택, 파일당 4MB, 접수당 최대 {LIMITS.filesPerSubmission}개</span></label>
      <input ref={inputRef} id={inputId} type="file" multiple accept={ACCEPT_ATTR} onChange={(e) => handle(e.target.files)} />
      {busy > 0 && <div className="muted">업로드 중… ({busy}개)</div>}
      {files.length > 0 && (
        <ul style={{ margin: "6px 0", paddingLeft: 18 }}>
          {files.map((f) => (
            <li key={f.id}>
              {f.name} <span className="muted">({formatBytes(f.size)})</span>{" "}
              <button type="button" className="btn secondary small" onClick={() => onRemove(f.id)}>삭제</button>
            </li>
          ))}
        </ul>
      )}
      {msgs.map((m) => <div key={m} className="error" role="alert">{m}</div>)}
      {error && <div className="error" role="alert">{error}</div>}
    </div>
  );
}
