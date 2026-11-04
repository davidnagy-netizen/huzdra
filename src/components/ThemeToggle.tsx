"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "./icons";

/** A <head>-ben futó script (layout) állítja be a kezdő témát villanás nélkül. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('huzdra:theme');var d=t?t==='dark':true;document.documentElement.classList.toggle('dark',d);}catch(e){document.documentElement.classList.add('dark');}})();`;

export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("huzdra:theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  };
  return (
    <button
      type="button"
      onClick={toggle}
      className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink hover:border-gold"
      aria-label={dark ? "Váltás világos módra" : "Váltás sötét módra"}
      title={dark ? "Világos mód" : "Sötét mód"}
    >
      {dark === false ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
