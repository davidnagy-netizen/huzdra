import type { Metadata, Viewport } from "next";
import { Manrope, Pacifico, Playfair_Display } from "next/font/google";
import { Analytics } from "@/components/Analytics";
import { AudioProvider } from "@/components/audio/AudioProvider";
import { CookieBanner } from "@/components/CookieBanner";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { themeInitScript } from "@/components/ThemeToggle";
import { SITE, isMock } from "@/lib/site";
import "./globals.css";

const body = Manrope({ subsets: ["latin", "latin-ext"], variable: "--font-body", display: "swap" });
const display = Playfair_Display({ subsets: ["latin", "latin-ext"], variable: "--font-display", weight: ["700", "800", "900"], display: "swap" });
const script = Pacifico({ subsets: ["latin", "latin-ext"], variable: "--font-script", weight: "400", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Húzdrá! – Egyedi mulatós dal ajándékba, kedvenc előadód hangján",
    template: "%s | Húzdrá!",
  },
  description: `${SITE.slogan} Személyre szóló mulatós és roma zenei dal lagzira, keresztelőre, szülinapra – Dögös Robi és a Bitto Duó hivatalos hangján.`,
  applicationName: "Húzdrá!",
  openGraph: { type: "website", locale: "hu_HU", siteName: "Húzdrá!", url: SITE.url },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#14060e" },
    { media: "(prefers-color-scheme: light)", color: "#fbf4ea" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu" className={`dark ${body.variable} ${display.variable} ${script.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh font-sans">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-gold focus:px-4 focus:py-2 focus:text-on-gold">
          Ugrás a tartalomra
        </a>
        {isMock() && (
          <div className="bg-navy px-4 py-1.5 text-center text-xs font-semibold text-white/90">
            Demó mód – a hangok, vélemények és fizetés helykitöltők, valódi terhelés nem történik.
          </div>
        )}
        <AudioProvider>
          <Header />
          <main id="main" className="relative">{children}</main>
          <Footer />
        </AudioProvider>
        <CookieBanner />
        <Analytics />
      </body>
    </html>
  );
}
