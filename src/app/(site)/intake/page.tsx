import type { Metadata } from "next";
import IntakeForm from "../../IntakeForm";
import { FIRM } from "@/lib/firm";

export const metadata: Metadata = { title: `악플 고소 접수 | ${FIRM.name}` };

export default function IntakePage() {
  return (
    <>
      <section className="sub-visual">
        <p className="sub-visual-en">Online Intake</p>
        <h1>악플 고소 접수</h1>
        <p>악성댓글 피해 내용을 접수하시면 담당 변호사가 직접 검토 후 연락드립니다.</p>
      </section>
      <main className="container">
        <IntakeForm />
      </main>
    </>
  );
}
