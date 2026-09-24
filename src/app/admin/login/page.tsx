import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <main className="container" style={{ maxWidth: 420 }}>
      <section className="card">
        <h1>관리자 로그인</h1>
        <p className="muted">악플 고소 접수 전산</p>
        <LoginForm />
      </section>
    </main>
  );
}
