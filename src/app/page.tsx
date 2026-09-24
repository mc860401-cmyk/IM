import IntakeForm from "./IntakeForm";

export default function Home() {
  return (
    <main className="container">
      <h1>악플 고소 접수</h1>
      <p className="muted">악성댓글 피해 내용을 접수하시면 변호사가 검토 후 연락드립니다.</p>
      <IntakeForm />
    </main>
  );
}
