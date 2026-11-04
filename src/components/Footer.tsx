import Link from "next/link";
import { SITE } from "@/lib/site";
import { Logo } from "./Logo";
import { CookieSettingsLink } from "./CookieBanner";

export const LEGAL_LINKS = [
  { href: "/jogi/aszf", label: "ÁSZF" },
  { href: "/jogi/adatvedelem", label: "Adatvédelem" },
  { href: "/jogi/cookie", label: "Cookie" },
  { href: "/jogi/elallas", label: "Elállás" },
  { href: "/jogi/impresszum", label: "Impresszum" },
  { href: "/jogi/eloadoi-licenc", label: "Előadói licenc-tájékoztató" },
];

const SEO_LINKS = [
  { href: "/lakodalmas-dal", label: "Lakodalmas dal" },
  { href: "/szulinapi-mulatos-dal", label: "Szülinapi mulatós dal" },
  { href: "/keresztelo-dal", label: "Keresztelői dal" },
  { href: "/nevnapi-dal", label: "Névnapi dal" },
  { href: "/evfordulos-dal", label: "Évfordulós dal" },
  { href: "/dogos-robi-egyedi-dal", label: "Dögös Robi egyedi dal" },
  { href: "/bitto-duo-egyedi-dal", label: "Bitto Duó egyedi dal" },
];

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-line bg-bg-2">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted">{SITE.slogan}</p>
          <p className="mt-4 text-xs text-muted">
            A dalok mesterséges intelligenciával készülnek az előadók hivatalos, írásos licenccel engedélyezett
            hangmodelljével. Személyes, nem kereskedelmi felhasználásra.
          </p>
          <p className="mt-4 text-sm">
            <a className="font-semibold text-gold hover:underline" href={`mailto:${SITE.email}`}>
              {SITE.email}
            </a>
          </p>
        </div>
        <nav aria-label="Alkalmak">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">Alkalmak és előadók</h2>
          <ul className="space-y-2 text-sm">
            {SEO_LINKS.map((l) => (
              <li key={l.href}>
                <Link className="hover:text-gold" href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Jogi információk">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">Jogi</h2>
          <ul className="space-y-2 text-sm">
            {LEGAL_LINKS.map((l) => (
              <li key={l.href}>
                <Link className="hover:text-gold" href={l.href}>{l.label}</Link>
              </li>
            ))}
            <li><CookieSettingsLink /></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line py-5 text-center text-xs text-muted">
        © {new Date().getFullYear()} Húzdrá! – huzdra.hu
      </div>
    </footer>
  );
}
