"use client";

import { useRouter } from "next/navigation";

export default function RowLink({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <tr onClick={() => router.push(href)} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") router.push(href); }}>
      {children}
    </tr>
  );
}
