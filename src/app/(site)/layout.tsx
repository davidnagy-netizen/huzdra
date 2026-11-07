import { CookieBanner } from "@/components/CookieBanner";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { isMock } from "@/lib/site";

/** A nyilvános weboldal kerete. Az admin és a hirdetési one-pager saját keretet használ. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {isMock() && (
        <div className="bg-navy px-4 py-1.5 text-center text-xs font-semibold text-white/90">
          Demó mód – a hangok, vélemények és fizetés helykitöltők, valódi terhelés nem történik.
        </div>
      )}
      <Header />
      <main id="main" className="relative">{children}</main>
      <Footer />
      <CookieBanner />
    </>
  );
}
