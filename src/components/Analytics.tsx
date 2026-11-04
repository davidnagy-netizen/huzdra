"use client";

import { useEffect } from "react";
import { CONSENT_EVENT, readConsent, type Consent } from "./CookieBanner";

const GA = process.env.NEXT_PUBLIC_GA4_ID;
const PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID;

function loadScript(src: string) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

function apply(c: Consent | null) {
  if (!c) return;
  if (GA && c.analytics && !window.gtag) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", GA, { anonymize_ip: true });
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${GA}`);
  }
  if (PIXEL && c.marketing && !window.fbq) {
    const q: unknown[] = [];
    const fbq = (...args: unknown[]) => q.push(args);
    (fbq as unknown as { queue: unknown[] }).queue = q;
    window.fbq = fbq;
    loadScript("https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", PIXEL);
    window.fbq("track", "PageView");
  }
}

/** Analitikai szkriptek betöltése kizárólag hozzájárulás után. */
export function Analytics() {
  useEffect(() => {
    apply(readConsent());
    const on = (e: Event) => apply((e as CustomEvent<Consent>).detail);
    window.addEventListener(CONSENT_EVENT, on);
    return () => window.removeEventListener(CONSENT_EVENT, on);
  }, []);
  return null;
}
