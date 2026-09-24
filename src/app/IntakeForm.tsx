"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  APPLICANT_TYPES, GUARDIAN_RELATIONS, HARM_TYPES, OFFENDER_RELATIONS, POST_STATUSES,
  type ApplicantType,
} from "@/lib/constants";
import {
  emptyApplicant, emptyComment, validateSubmission,
  type ApplicantInput, type CommentInput, type Errors,
} from "@/lib/validation";

function Err({ errors, k }: { errors: Errors; k: string }) {
  return errors[k] ? <div className="error" role="alert">{errors[k]}</div> : null;
}

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  errors: Errors;
  errKey: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  className?: string;
  autoComplete?: string;
}

function TextField({ id, label, value, onChange, errors, errKey, required, type = "text", placeholder, className, autoComplete }: TextFieldProps) {
  return (
    <div className={`field ${className ?? ""}`}>
      <label htmlFor={id} className={required ? "req" : undefined}>{label}</label>
      <input
        id={id} name={id} type={type} value={value} placeholder={placeholder} autoComplete={autoComplete}
        aria-invalid={Boolean(errors[errKey])}
        onChange={(e) => onChange(e.target.value)}
      />
      <Err errors={errors} k={errKey} />
    </div>
  );
}

function SelectField({ id, label, value, onChange, options, errors, errKey }: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  options: readonly string[]; errors: Errors; errKey: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} name={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">선택 안 함</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <Err errors={errors} k={errKey} />
    </div>
  );
}

export default function IntakeForm() {
  const router = useRouter();
  const [applicantType, setApplicantType] = useState<ApplicantType | "">("");
  const [applicant, setApplicant] = useState<ApplicantInput>(emptyApplicant());
  const [comments, setComments] = useState<CommentInput[]>([emptyComment()]);
  const [narrative, setNarrative] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const setA = (k: keyof ApplicantInput) => (v: string) => setApplicant((p) => ({ ...p, [k]: v }));
  const setC = (i: number, patch: Partial<CommentInput>) =>
    setComments((list) => list.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  const addComment = () => setComments((l) => [...l, emptyComment()]);
  const removeComment = (i: number) => setComments((l) => l.filter((_, j) => j !== i));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");
    const payload = { applicantType, applicant, comments, narrative, consent };
    const v = validateSubmission(payload);
    if (!v.ok) {
      setErrors(v.errors);
      requestAnimationFrame(() => document.querySelector("[role=alert]")?.scrollIntoView({ block: "center" }));
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.receiptNo) {
        router.push(`/submitted/${encodeURIComponent(data.receiptNo)}`);
        return;
      }
      if (data.errors) setErrors(data.errors);
      setServerError(data.error ?? "접수에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } catch {
      setServerError("네트워크 오류로 접수하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  const t = applicantType;

  return (
    <form onSubmit={onSubmit} noValidate>
      {/* 1. 접수자 유형 */}
      <section className="card">
        <h2>1. 접수자 유형</h2>
        <div className="radio-cards" role="radiogroup" aria-label="접수자 유형">
          {(Object.keys(APPLICANT_TYPES) as ApplicantType[]).map((k) => (
            <label key={k} className={t === k ? "on" : undefined}>
              <input
                type="radio" name="applicantType" value={k} checked={t === k}
                onChange={() => setApplicantType(k)}
              />{" "}
              {APPLICANT_TYPES[k]}
              <small>
                {k === "individual" && "성인 피해자가 직접 접수"}
                {k === "guardian" && "부모·후견인이 미성년 피해자를 대리"}
                {k === "corporation" && "회사·기관이 피해자"}
              </small>
            </label>
          ))}
        </div>
        <Err errors={errors} k="applicantType" />
      </section>

      {/* 2. 접수자 정보 */}
      {t && (
        <section className="card">
          <h2>2. 접수자 정보</h2>
          <p className="muted">주민등록번호는 받지 않습니다. 필요한 경우 상담 후 별도로 안내드립니다.</p>
          <div className="grid">
            {t === "corporation" ? (
              <>
                <TextField id="name" label="상호(법인·단체명)" required value={applicant.name} onChange={setA("name")} errors={errors} errKey="applicant.name" autoComplete="organization" />
                <TextField id="bizNo" label="사업자등록번호" value={applicant.bizNo} onChange={setA("bizNo")} errors={errors} errKey="applicant.bizNo" placeholder="000-00-00000" />
                <TextField id="representative" label="대표자" value={applicant.representative} onChange={setA("representative")} errors={errors} errKey="applicant.representative" />
                <TextField id="contactName" label="담당자 이름" required value={applicant.contactName} onChange={setA("contactName")} errors={errors} errKey="applicant.contactName" autoComplete="name" />
              </>
            ) : (
              <TextField
                id="name" label={t === "guardian" ? "법정대리인 이름" : "이름"} required
                value={applicant.name} onChange={setA("name")} errors={errors} errKey="applicant.name" autoComplete="name"
              />
            )}
            {t === "individual" && (
              <TextField id="birthDate" label="생년월일" type="date" value={applicant.birthDate} onChange={setA("birthDate")} errors={errors} errKey="applicant.birthDate" />
            )}
            {t === "guardian" && (
              <SelectField id="relation" label="피해자와의 관계" value={applicant.relation} onChange={setA("relation")} options={GUARDIAN_RELATIONS} errors={errors} errKey="applicant.relation" />
            )}
            <TextField id="phone" label={t === "corporation" ? "담당자 휴대폰" : "휴대폰"} required type="tel" value={applicant.phone} onChange={setA("phone")} errors={errors} errKey="applicant.phone" placeholder="010-0000-0000" autoComplete="tel" />
            <TextField id="email" label={t === "corporation" ? "담당자 이메일" : "이메일"} required type="email" value={applicant.email} onChange={setA("email")} errors={errors} errKey="applicant.email" autoComplete="email" />
            <TextField id="address" label="주소" className="full" value={applicant.address} onChange={setA("address")} errors={errors} errKey="applicant.address" autoComplete="street-address" />
          </div>
          {t === "guardian" && (
            <>
              <h3 style={{ marginTop: 16 }}>피해자(미성년자) 정보</h3>
              <div className="grid">
                <TextField id="victimName" label="피해자 이름" required value={applicant.victimName} onChange={setA("victimName")} errors={errors} errKey="applicant.victimName" />
                <TextField id="victimBirthDate" label="피해자 생년월일" type="date" value={applicant.victimBirthDate} onChange={setA("victimBirthDate")} errors={errors} errKey="applicant.victimBirthDate" />
              </div>
            </>
          )}
        </section>
      )}

      {/* 3. 악플 목록 */}
      <section className="card">
        <h2>3. 악플 목록</h2>
        <p className="muted">악플 1건마다 항목 1개를 작성해 주세요. <b>내용(원문)</b>만 필수이고 나머지는 아는 만큼만 적으시면 됩니다.</p>
        <Err errors={errors} k="comments" />
        {comments.map((c, i) => {
          const p = `comments.${i}`;
          const id = (k: string) => `c${i}-${k}`;
          return (
            <div key={i} className="card" style={{ background: "#fafbfc" }} data-testid={`comment-${i}`}>
              <div className="spread">
                <h3>악플 {i + 1}</h3>
                <button type="button" className="btn secondary small" onClick={() => removeComment(i)} disabled={comments.length === 1}>
                  항목 삭제
                </button>
              </div>
              <div className="grid">
                <div className="field full">
                  <label htmlFor={id("content")} className="req">내용(원문 그대로)</label>
                  <textarea id={id("content")} value={c.content} aria-invalid={Boolean(errors[`${p}.content`])} onChange={(e) => setC(i, { content: e.target.value })} />
                  <Err errors={errors} k={`${p}.content`} />
                </div>
                <TextField id={id("platform")} label="플랫폼" value={c.platform} onChange={(v) => setC(i, { platform: v })} errors={errors} errKey={`${p}.platform`} placeholder="예: 네이버 뉴스 댓글" />
                <TextField id={id("url")} label="게시물 주소(URL)" type="url" value={c.url} onChange={(v) => setC(i, { url: v })} errors={errors} errKey={`${p}.url`} placeholder="https://" />
                <TextField id={id("postedDate")} label="작성일" type="date" value={c.postedDate} onChange={(v) => setC(i, { postedDate: v })} errors={errors} errKey={`${p}.postedDate`} />
                <TextField id={id("postedTime")} label="작성시각(아는 경우)" type="time" value={c.postedTime} onChange={(v) => setC(i, { postedTime: v })} errors={errors} errKey={`${p}.postedTime`} />
                <TextField id={id("nick")} label="가해자 닉네임" value={c.offenderNickname} onChange={(v) => setC(i, { offenderNickname: v })} errors={errors} errKey={`${p}.offenderNickname`} />
                <TextField id={id("account")} label="가해자 계정ID·프로필 주소" value={c.offenderAccount} onChange={(v) => setC(i, { offenderAccount: v })} errors={errors} errKey={`${p}.offenderAccount`} />
                <TextField id={id("realName")} label="가해자 실명(알고 있는 경우)" value={c.offenderRealName} onChange={(v) => setC(i, { offenderRealName: v })} errors={errors} errKey={`${p}.offenderRealName`} />
                <SelectField id={id("relation")} label="가해자와의 관계" value={c.offenderRelation} onChange={(v) => setC(i, { offenderRelation: v })} options={OFFENDER_RELATIONS} errors={errors} errKey={`${p}.offenderRelation`} />
                <div className="field full">
                  <label>피해 유형(해당하는 것 모두)</label>
                  <div className="checks">
                    {HARM_TYPES.map((h) => (
                      <label key={h}>
                        <input
                          type="checkbox" checked={c.harmTypes.includes(h)}
                          onChange={(e) => setC(i, {
                            harmTypes: e.target.checked ? [...c.harmTypes, h] : c.harmTypes.filter((x) => x !== h),
                          })}
                        />
                        {h}
                      </label>
                    ))}
                  </div>
                </div>
                <SelectField id={id("postStatus")} label="현재 게시 상태" value={c.postStatus} onChange={(v) => setC(i, { postStatus: v })} options={POST_STATUSES} errors={errors} errKey={`${p}.postStatus`} />
                <TextField id={id("firstKnown")} label="처음 알게 된 날" type="date" value={c.firstKnownDate} onChange={(v) => setC(i, { firstKnownDate: v })} errors={errors} errKey={`${p}.firstKnownDate`} />
              </div>
            </div>
          );
        })}
        <button type="button" className="btn secondary" onClick={addComment}>+ 악플 항목 추가</button>
      </section>

      {/* 4. 사건 경위 */}
      <section className="card">
        <h2>4. 사건 경위 <span className="muted">(선택)</span></h2>
        <label htmlFor="narrative" className="muted" style={{ fontWeight: 400 }}>
          가해자와의 관계, 악플이 시작된 계기, 피해 상황 등을 자유롭게 적어 주세요.
        </label>
        <textarea id="narrative" value={narrative} onChange={(e) => setNarrative(e.target.value)} style={{ minHeight: 160 }} />
        <Err errors={errors} k="narrative" />
      </section>

      {/* 5. 동의 */}
      <section className="card">
        <h2>5. 개인정보 수집·이용 동의</h2>
        <div className="pre" style={{ fontSize: 13, maxHeight: 200, overflow: "auto" }}>
{`1. 수집 항목: 접수자 이름(상호)·휴대폰·이메일, (선택) 생년월일·주소·사업자등록번호·대표자, 법정대리인의 경우 피해자 이름·생년월일, 악플 내용 및 관련 정보, 증거파일
2. 이용 목적: 법률상담 및 사건 검토, 상담 연락
3. 보유 기간: 상담 목적 달성 시 또는 삭제 요청 시 지체 없이 파기
4. 동의를 거부할 권리가 있으며, 거부 시 온라인 접수가 제한됩니다.`}
        </div>
        <label style={{ marginTop: 10, display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" id="consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span className="req">위 내용에 동의합니다</span>
        </label>
        <Err errors={errors} k="consent" />
      </section>

      {serverError && <div className="error" role="alert" style={{ marginBottom: 12 }}>{serverError}</div>}
      <button type="submit" className="btn" disabled={submitting} style={{ width: "100%", padding: 14 }}>
        {submitting ? "접수 중…" : "접수하기"}
      </button>
    </form>
  );
}
