/** „Húzdrá!” szóvédjegy – a felkiáltójel egy hegedűvonó (rúd + szőrzet + kápa) és egy pont. */
export function Logo({ className = "", size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const text = size === "lg" ? "text-6xl sm:text-7xl" : size === "sm" ? "text-2xl" : "text-3xl";
  const bow = size === "lg" ? "h-16 sm:h-20" : size === "sm" ? "h-7" : "h-9";
  return (
    <span className={`inline-flex items-end font-script leading-none ${text} ${className}`} aria-label="Húzdrá!">
      <span aria-hidden className="text-gradient-gold pb-[0.08em] pr-[0.04em]">Húzdrá</span>
      <svg aria-hidden viewBox="0 0 20 64" className={`${bow} w-auto -ml-[0.05em] translate-y-[0.02em]`}>
        <defs>
          <linearGradient id="bowg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--gold-soft)" />
            <stop offset="1" stopColor="var(--red)" />
          </linearGradient>
        </defs>
        {/* vonórúd enyhe ívvel, ferdén */}
        <path d="M14 2 C 12 18, 9 32, 7.2 46" stroke="url(#bowg)" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        {/* szőrzet */}
        <path d="M16.5 4 L 9.6 45" stroke="var(--gold-soft)" strokeWidth="0.9" opacity="0.75" />
        {/* hegy */}
        <path d="M13 1.5 l4 2.2" stroke="var(--gold-soft)" strokeWidth="2" strokeLinecap="round" />
        {/* kápa (béka) */}
        <rect x="5.2" y="42" width="5.6" height="6" rx="1.4" transform="rotate(8 8 45)" fill="var(--red)" />
        {/* a felkiáltójel pontja */}
        <circle cx="6.6" cy="58" r="3.6" fill="var(--gold-soft)" />
      </svg>
    </span>
  );
}
