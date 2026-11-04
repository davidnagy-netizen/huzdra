"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export interface Consent {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  at: string;
}

const KEY = "huzdra:consent:v1";
export const CONSENT_EVENT = "huzdra:consent";

export function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Consent) : null;
  } catch {
    return null;
  }
}

function saveConsent(c: Omit<Consent, "necessary" | "at">) {
  const full: Consent = { necessary: true, ...c, at: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(full));
  } catch {}
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: full }));
}

export function CookieSettingsLink() {
  return (
    <button type="button" className="hover:text-gold" onClick={() => window.dispatchEvent(new Event("huzdra:open-cookie"))}>
      Cookie-beállítások
    </button>
  );
}

export function CookieBanner() {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const c = readConsent();
    if (!c) setOpen(true);
    else {
      setAnalytics(c.analytics);
      setMarketing(c.marketing);
    }
    const reopen = () => {
      setDetails(true);
      setOpen(true);
    };
    window.addEventListener("huzdra:open-cookie", reopen);
    return () => window.removeEventListener("huzdra:open-cookie", reopen);
  }, []);

  if (!open) return null;
  const done = (c: { analytics: boolean; marketing: boolean }) => {
    saveConsent(c);
    setOpen(false);
  };

  return (
    <div role="dialog" aria-modal="false" aria-labelledby="cookie-title" className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4">
      <div className="card mx-auto max-w-3xl p-5 shadow-2xl shadow-black/40">
        <h2 id="cookie-title" className="font-display text-lg font-bold">Egy kis süti a mulatság előtt? 🍪</h2>
        <p className="mt-2 text-sm text-muted">
          A szükséges sütik az oldal működéséhez kellenek (pl. a rendelési piszkozat mentése). Analitikai és
          marketing sütit csak a hozzájárulásoddal használunk. Részletek a{" "}
          <Link href="/jogi/cookie" className="font-semibold text-gold underline">cookie-tájékoztatóban</Link>.
        </p>
        {details && (
          <div className="mt-4 space-y-3 text-sm">
            <label className="flex items-start gap-3">
              <input type="checkbox" checked disabled className="mt-1 h-4 w-4 accent-[var(--gold)]" />
              <span><b>Szükséges</b> – mindig aktív</span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--gold)]" />
              <span><b>Analitika</b> (Google Analytics 4) – látjuk, mi működik jól az oldalon</span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--gold)]" />
              <span><b>Marketing</b> (Meta Pixel) – releváns hirdetések</span>
            </label>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-primary !py-2.5 text-sm" onClick={() => done({ analytics: true, marketing: true })}>
            Mindet elfogadom
          </button>
          {details ? (
            <button type="button" className="btn-ghost !py-2.5 text-sm" onClick={() => done({ analytics, marketing })}>
              Kiválasztottak mentése
            </button>
          ) : (
            <button type="button" className="btn-ghost !py-2.5 text-sm" onClick={() => setDetails(true)}>
              Beállítások
            </button>
          )}
          <button type="button" className="btn-ghost !py-2.5 text-sm" onClick={() => done({ analytics: false, marketing: false })}>
            Csak a szükségesek
          </button>
        </div>
      </div>
    </div>
  );
}
