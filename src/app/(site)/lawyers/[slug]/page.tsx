import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FIRM, findLawyer, LAWYERS } from "@/lib/firm";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return LAWYERS.map((l) => ({ slug: l.slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const l = findLawyer((await params).slug);
  return { title: l ? `${l.name} ${l.title} | ${FIRM.name}` : FIRM.name };
}

export default async function LawyerPage({ params }: { params: Params }) {
  const l = findLawyer((await params).slug);
  if (!l) notFound();
  const contacts: [string, string][] = [
    ["T.", l.tel], ["F.", l.fax], ["E.", l.email], ["M.", l.mobile],
    ...(l.mobileFr ? [["M(Fr).", l.mobileFr] as [string, string]] : []),
  ];
  return (
    <>
      <section className="profile-hero">
        <div className="profile-inner">
          <div className="profile-text">
            <p className="crumb"><Link href="/">홈</Link> · <Link href="/#members">구성원</Link> · 구성원 소개</p>
            <p className="profile-headline">{l.headline}</p>
            <h1 className="profile-name">{l.name} <span>{l.title}</span></h1>
            <dl className="profile-contacts">
              {contacts.map(([k, v]) => (
                <div key={k}><dt>{k}</dt><dd>{k === "E." ? <a href={`mailto:${v}`}>{v}</a> : v}</dd></div>
              ))}
            </dl>
            <hr className="profile-bar" />
            <blockquote className="profile-quote">“{l.quote.join(" ")}”</blockquote>
            {l.intro.map((p) => <p key={p} className="profile-intro">{p}</p>)}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="profile-photo" src={l.profilePhoto} alt={`${l.name} ${l.title}`} />
        </div>
      </section>
      <section className="section">
        <div className="section-inner profile-cols">
          <div>
            <h2 className="profile-sub">학력·자격</h2>
            <ul className="profile-list">{l.education.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
          <div>
            <h2 className="profile-sub">주요약력ㆍ경력</h2>
            <ul className="profile-list">{l.career.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
          <div className="profile-cases">
            <h2 className="profile-sub">주요 수행사례</h2>
            <ul className="profile-list">{l.cases.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        </div>
        <div className="section-inner" style={{ textAlign: "center", marginTop: 40 }}>
          <Link href="/intake" className="btn btn-lg">악플 고소 접수하기</Link>
        </div>
      </section>
    </>
  );
}
