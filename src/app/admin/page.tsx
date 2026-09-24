import { requireAdminPage } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  await requireAdminPage();
  return <main className="container wide"><h1>접수 목록</h1></main>;
}
