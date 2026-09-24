"use client";

import Link from "next/link";
import { useState } from "react";
import { FIRM } from "@/lib/firm";

const NAV = [
  { href: "/#about", label: "우선" },
  { href: "/#members", label: "구성원" },
  { href: "/#location", label: "오시는 길" },
  { href: "/intake", label: "악플 고소 접수" },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-logo" aria-label={`${FIRM.name} 홈`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt={`${FIRM.name} ${FIRM.nameEn}`} width={224} height={61} />
        </Link>
        <button type="button" className="site-menu-btn" aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen((v) => !v)}>
          <span className="sr-only">메뉴</span>
          <span aria-hidden>{open ? "✕" : "☰"}</span>
        </button>
        <nav id="site-nav" className={`site-nav${open ? " open" : ""}`} aria-label="주 메뉴">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={n.href === "/intake" ? "nav-cta" : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>
        <a href={FIRM.telHref} className="site-tel">{FIRM.tel}</a>
      </div>
    </header>
  );
}
