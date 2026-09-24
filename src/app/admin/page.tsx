import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { APPLICANT_TYPES, STATUSES, type Status } from "@/lib/constants";
import { listSubmissions, PAGE_SIZE } from "@/lib/submissions";
import { formatKst } from "@/lib/time";
import AdminHeader from "./_components/AdminHeader";
import RowLink from "./_components/RowLink";

export const dynamic = "force-dynamic";

type Search = Promise<{ status?: string; page?: string }>;

export default async function AdminListPage({ searchParams }: { searchParams: Search }) {
  await requireAdminPage();
  const sp = await searchParams;
  const status = sp.status && sp.status in STATUSES ? (sp.status as Status) : null;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const { items, counts } = await listSubmissions(status, page);
  const total = status ? counts[status] : counts.all;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (s: Status | null, p = 1) => {
    const q = new URLSearchParams();
    if (s) q.set("status", s);
    if (p > 1) q.set("page", String(p));
    const qs = q.toString();
    return qs ? `/admin?${qs}` : "/admin";
  };

  return (
    <main className="container wide">
      <AdminHeader />
      <h1>접수 목록</h1>
      <nav className="tabs" aria-label="상태 필터">
        <Link href={href(null)} className={status === null ? "on" : undefined}>전체 {counts.all}</Link>
        {(Object.keys(STATUSES) as Status[]).map((s) => (
          <Link key={s} href={href(s)} className={status === s ? "on" : undefined}>
            {STATUSES[s]} {counts[s]}
          </Link>
        ))}
      </nav>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>접수번호</th>
              <th>접수일시</th>
              <th>상태</th>
              <th>접수자명</th>
              <th>유형</th>
              <th>연락처</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={6} className="muted" style={{ textAlign: "center", padding: 32 }}>접수 건이 없습니다.</td></tr>
            )}
            {items.map((r) => (
              <RowLink key={r.id} href={`/admin/submissions/${r.id}`}>
                <td><Link href={`/admin/submissions/${r.id}`}>{r.receipt_no}</Link></td>
                <td>{formatKst(r.created_at)}</td>
                <td><span className={`badge ${r.status}`}>{STATUSES[r.status]}</span></td>
                <td>{r.display_name}</td>
                <td>{APPLICANT_TYPES[r.applicant_type]}</td>
                <td>{r.phone}</td>
              </RowLink>
            ))}
          </tbody>
        </table>
      </div>
      {lastPage > 1 && (
        <div className="row" style={{ justifyContent: "center", marginTop: 12 }}>
          {page > 1 && <Link className="btn secondary small" href={href(status, page - 1)}>이전</Link>}
          <span className="muted">{page} / {lastPage}</span>
          {page < lastPage && <Link className="btn secondary small" href={href(status, page + 1)}>다음</Link>}
        </div>
      )}
    </main>
  );
}
