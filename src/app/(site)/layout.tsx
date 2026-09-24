import SiteHeader from "../_site/SiteHeader";
import SiteFooter from "../_site/SiteFooter";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div className="site-body">{children}</div>
      <SiteFooter />
    </>
  );
}
