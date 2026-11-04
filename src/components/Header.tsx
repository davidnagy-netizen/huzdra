import Link from "next/link";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/#eloadok", label: "Előadók" },
  { href: "/#mintadalok", label: "Mintadalok" },
  { href: "/#hogyan", label: "Hogyan működik?" },
  { href: "/#arak", label: "Árak" },
  { href: "/#gyik", label: "GYIK" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="shrink-0" aria-label="Húzdrá! – főoldal">
          <Logo size="sm" />
        </Link>
        <nav aria-label="Fő navigáció" className="hidden items-center gap-6 text-sm font-semibold text-muted lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/rendelesem" className="hidden text-sm font-semibold text-muted hover:text-ink sm:inline">
            Már rendeltél?
          </Link>
          <ThemeToggle />
          <Link href="/#rendeles" className="btn-primary !px-4 !py-2 text-sm">
            Húzd rá!
          </Link>
        </div>
      </div>
    </header>
  );
}
