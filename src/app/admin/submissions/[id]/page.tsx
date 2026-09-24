import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import { APPLICANT_TYPES } from "@/lib/constants";
import { formatBytes } from "@/lib/files";
import { getSubmission } from "@/lib/submissions";
import { formatKst } from "@/lib/time";
import AdminHeader from "../../_components/AdminHeader";
import { DeleteButton, MemoPanel, StatusControl } from "./controls";

export const dynamic = "force-dynamic";

function KV({ items }: { items: [string, React.ReactNode][] }) {
  const shown = items.filter(([, v]) => v !== null && v !== undefined && v !== "");
  return (
    <dl className="kv">
      {shown.map(([k, v]) => (
        <div key={k} style={{ display: "contents" }}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function SubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const s = await getSubmission(id);
  if (!s) notFound();
  const a = s.applicant;
  const fileCount = s.comments.reduce((n, c) => n + c.files.length, 0);

  return (
    <main className="container wide">
      <AdminHeader />
      <p><Link href="/admin">← 목록</Link></p>
      <div className="spread">
        <div>
          <h1 data-testid="detail-receipt-no">{s.receipt_no}</h1>
          <div className="muted">접수 {formatKst(s.created_at)} · 최종 변경 {formatKst(s.updated_at)}</div>
        </div>
        <StatusControl id={s.id} status={s.status} />
      </div>

      <section className="card">
        <h2>접수자 — {APPLICANT_TYPES[s.applicant_type]}</h2>
        {s.applicant_type === "corporation" ? (
          <KV items={[
            ["상호", a.name], ["사업자등록번호", a.bizNo], ["대표자", a.representative],
            ["담당자", a.contactName], ["휴대폰", a.phone], ["이메일", a.email], ["주소", a.address],
          ]} />
        ) : s.applicant_type === "guardian" ? (
          <KV items={[
            ["법정대리인", a.name], ["피해자와의 관계", a.relation], ["휴대폰", a.phone], ["이메일", a.email], ["주소", a.address],
            ["피해자(미성년자)", a.victimName], ["피해자 생년월일", a.victimBirthDate],
          ]} />
        ) : (
          <KV items={[
            ["이름", a.name], ["생년월일", a.birthDate], ["휴대폰", a.phone], ["이메일", a.email], ["주소", a.address],
          ]} />
        )}
        <div className="muted" style={{ marginTop: 8 }}>개인정보 수집·이용 동의: {formatKst(s.consent_at)}</div>
      </section>

      <section className="card">
        <h2>사건 경위</h2>
        {s.narrative ? <div className="pre">{s.narrative}</div> : <p className="muted">작성하지 않음</p>}
      </section>

      <section className="card">
        <h2>악플 {s.comments.length}건 · 증거파일 {fileCount}개</h2>
        {s.comments.map((c) => (
          <div key={c.id} className="card" style={{ background: "#fafbfc" }} data-testid={`detail-comment-${c.position}`}>
            <h3>악플 {c.position}</h3>
            <div className="pre" style={{ marginBottom: 10 }}>{c.content}</div>
            <KV items={[
              ["플랫폼", c.platform],
              ["URL", c.url && <a href={c.url} target="_blank" rel="noopener noreferrer nofollow">{c.url}</a>],
              ["작성일시", [c.posted_date, c.posted_time].filter(Boolean).join(" ")],
              ["가해자 닉네임", c.offender_nickname],
              ["가해자 계정·프로필", c.offender_account],
              ["가해자 실명", c.offender_real_name],
              ["가해자와의 관계", c.offender_relation],
              ["피해 유형", c.harm_types.join(", ")],
              ["현재 게시 상태", c.post_status],
              ["최초 인지일", c.first_known_date],
            ]} />
            <div style={{ marginTop: 10 }}>
              <b style={{ fontSize: 13 }}>증거파일</b>
              {c.files.length === 0 ? (
                <span className="muted"> 없음</span>
              ) : (
                <ul style={{ margin: "4px 0", paddingLeft: 18 }}>
                  {c.files.map((f) => (
                    <li key={f.id}>
                      <a href={`/api/admin/files/${f.id}`}>{f.original_name}</a>{" "}
                      <span className="muted">({formatBytes(f.size)})</span>{" "}
                      <a className="muted" href={`/api/admin/files/${f.id}?inline=1`} target="_blank" rel="noopener noreferrer">[미리보기]</a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </section>

      <MemoPanel id={s.id} initial={s.memos} />

      <section className="card" style={{ borderColor: "#f0c9c6" }}>
        <h2>접수 삭제</h2>
        <p className="muted">접수 내용과 증거파일이 모두 완전히 삭제되며 되돌릴 수 없습니다.</p>
        <DeleteButton id={s.id} receiptNo={s.receipt_no} />
      </section>
    </main>
  );
}
