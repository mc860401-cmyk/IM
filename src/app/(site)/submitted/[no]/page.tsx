import Link from "next/link";
import { notFound } from "next/navigation";

const RECEIPT_RE = /^CB-\d{8}-\d{4,}$/;

export default async function SubmittedPage({ params }: { params: Promise<{ no: string }> }) {
  const { no } = await params;
  const receiptNo = decodeURIComponent(no);
  // 접수번호만 표시한다(DB 조회 없음 → 주소를 바꿔도 다른 사람의 접수 정보는 보이지 않음).
  if (!RECEIPT_RE.test(receiptNo)) notFound();
  return (
    <main className="container" style={{ paddingTop: 48 }}>
      <section className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
        <h1>접수가 완료되었습니다</h1>
        <p className="muted">아래 접수번호를 보관해 주세요. 변호사가 검토 후 입력하신 연락처로 연락드립니다.</p>
        <div
          data-testid="receipt-no"
          style={{ fontSize: 28, fontWeight: 700, letterSpacing: 1, margin: "20px 0", fontFamily: "ui-monospace, monospace" }}
        >
          {receiptNo}
        </div>
        <Link href="/" className="btn secondary">홈으로</Link>
      </section>
    </main>
  );
}
