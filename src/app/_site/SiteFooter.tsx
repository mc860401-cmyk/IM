import { FIRM } from "@/lib/firm";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/foot_logo.png" alt={FIRM.name} width={91} height={99} className="foot-logo" />
        <div className="foot-info">
          <p className="foot-links">
            <span>법적고지</span>
            <span>개인정보처리방침</span>
            <span>광고책임변호사: {FIRM.adLawyer}</span>
          </p>
          <p>{FIRM.name} &nbsp; 주소 : {FIRM.address} &nbsp; TEL : {FIRM.tel}</p>
          <p className="foot-copy">{FIRM.copyright}</p>
        </div>
        <div className="foot-contact">
          <div>
            <small>상담전화</small>
            <a href={FIRM.telHref}>{FIRM.tel.replace(/-/g, ".")}</a>
          </div>
          <div>
            <small>메일문의</small>
            <a href={`mailto:${FIRM.email}`}>{FIRM.email}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
