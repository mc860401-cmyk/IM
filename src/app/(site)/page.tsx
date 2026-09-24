import Link from "next/link";
import { FIRM, LAWYERS, PILLARS, PROMISES } from "@/lib/firm";

export default function Home() {
  return (
    <>
      {/* 메인 비주얼: 가장 먼저 / 보다 높이 / 당신 곁에 */}
      <section className="hero" aria-label="우선">
        <div className="hero-cols">
          {PILLARS.map((p) => (
            <div key={p.ko} className="hero-col">
              <span className="hero-en">{p.en}</span>
              <strong className="hero-ko">{p.ko}</strong>
              <span className="hero-hanja">{p.hanja}</span>
            </div>
          ))}
        </div>
        <div className="hero-bottom">
          <p className="hero-slogan">{FIRM.slogan}</p>
          <h1 className="hero-title">악성댓글 피해, 온라인으로 고소를 접수하세요</h1>
          <div className="row" style={{ justifyContent: "center", gap: 12 }}>
            <Link href="/intake" className="btn btn-lg btn-light">악플 고소 접수하기</Link>
            <a href={FIRM.telHref} className="btn btn-lg btn-ghost">상담전화 {FIRM.tel}</a>
          </div>
        </div>
      </section>

      {/* 우선 소개 */}
      <section id="about" className="section">
        <div className="section-inner">
          <p className="eyebrow">About Usun</p>
          <h2 className="section-title">우선</h2>
          <div className="pillars">
            {PILLARS.map((p) => (
              <article key={p.ko} className="pillar">
                <div className="pillar-head">
                  <span className="pillar-hanja">{p.hanja}</span>
                  <span className="pillar-ko">{p.ko} <em>{p.en}</em></span>
                </div>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 업무 원칙 */}
      <section className="section section-navy">
        <div className="section-inner">
          <p className="eyebrow light">Our Promise</p>
          <h2 className="section-title light">{FIRM.slogan}</h2>
          <div className="promises">
            {PROMISES.map((p, i) => (
              <article key={p.title} className="promise">
                <span className="promise-no">{String(i + 1).padStart(2, "0")}</span>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 구성원 */}
      <section id="members" className="section">
        <div className="section-inner">
          <p className="eyebrow">Members</p>
          <h2 className="section-title">구성원</h2>
          <p className="section-lead">
            우선의 구성원들은 끊임없이 변화하는 규제·법령과 복잡한 행정절차에 정확히 대응해
            고객에게 최적의 해결방안을 제시합니다
          </p>
          <div className="members" data-testid="members">
            {LAWYERS.map((l) => (
              <Link key={l.slug} href={`/lawyers/${l.slug}`} className="member-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.photo} alt={`${l.name} ${l.title}`} />
                <div className="member-meta">
                  <strong>{l.name}</strong> <span>{l.title}</span>
                  <p className="member-headline">{l.headline}</p>
                  <p className="member-contact">T. {l.mobile}<br />E. {l.email}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 접수 안내 */}
      <section className="section section-soft">
        <div className="section-inner cta-band">
          <div>
            <p className="eyebrow">Online Intake</p>
            <h2 className="section-title" style={{ marginBottom: 8 }}>악플 고소 온라인 접수</h2>
            <p className="section-lead" style={{ margin: 0 }}>
              악플 원문과 캡처를 올려 주시면 담당 변호사가 직접 검토 후 연락드립니다.
              주민등록번호는 받지 않으며, 접수 후 접수번호가 발급됩니다.
            </p>
          </div>
          <Link href="/intake" className="btn btn-lg">접수하기</Link>
        </div>
      </section>

      {/* 오시는 길 */}
      <section id="location" className="section">
        <div className="section-inner">
          <p className="eyebrow">Location</p>
          <h2 className="section-title">오시는 길</h2>
          <p className="section-lead">법무법인 방문이 처음이셔도 편하게 오실 수 있도록 위치와 교통편을 안내해드립니다.</p>
          <div className="location">
            <div className="location-card">
              <h3>{FIRM.name}</h3>
              <p>{FIRM.address}</p>
              <p>Tel: <a href={FIRM.telHref}>{FIRM.tel}</a><br />Fax: {FIRM.fax}<br />E-mail: <a href={`mailto:${FIRM.email}`}>{FIRM.email}</a></p>
              <a className="btn secondary small" href={`https://map.kakao.com/link/search/${encodeURIComponent("서초중앙로 160")}`} target="_blank" rel="noopener noreferrer">카카오맵에서 보기</a>
            </div>
            <dl className="location-dirs">
              {FIRM.directions.map((d) => (
                <div key={d.label}>
                  <dt>{d.label}</dt>
                  <dd>{d.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
    </>
  );
}
