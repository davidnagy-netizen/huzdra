import type { PublicArtist } from "@/lib/catalog";

/**
 * Előadói kép. Amíg nincs feltöltve licencelt fotó, stilizált, ünnepi helykitöltő
 * (monogram + reflektorfény + hangszer-motívum) jelenik meg.
 */
export function ArtistPortrait({ artist, className = "", priority = false, monogram = true }: { artist: PublicArtist; className?: string; priority?: boolean; monogram?: boolean }) {
  const photo = artist.photos[0];
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photo} alt={`${artist.name} fotója`} className={`h-full w-full object-cover ${className}`} loading={priority ? "eager" : "lazy"} />
    );
  }
  const initials = artist.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2);
  const h = artist.accentHue;
  const duo = artist.styles.includes("duett");
  return (
    <svg viewBox="0 0 400 300" role="img" aria-label={`${artist.name} – fotó hamarosan`} className={`h-full w-full ${className}`} preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id={`spot-${artist.id}`} cx="50%" cy="0%" r="90%">
          <stop offset="0" stopColor={`hsl(${h} 85% 62%)`} stopOpacity="0.9" />
          <stop offset="0.45" stopColor={`hsl(${h} 70% 30%)`} stopOpacity="0.85" />
          <stop offset="1" stopColor="#0d0a24" />
        </radialGradient>
        <linearGradient id={`gold-${artist.id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#f6d58a" />
          <stop offset="1" stopColor="#e0433a" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#spot-${artist.id})`} />
      {/* reflektorsugarak */}
      <g opacity="0.18" fill="#fff">
        <path d="M200 0 L120 300 L160 300 Z" />
        <path d="M200 0 L240 300 L280 300 Z" />
      </g>
      {/* discogömb-pöttyök */}
      <g fill="#f6d58a" opacity="0.55">
        {Array.from({ length: 22 }).map((_, i) => (
          <circle key={i} cx={(i * 73) % 400} cy={(i * 47) % 160} r={(i % 3) + 1} />
        ))}
      </g>
      {/* sziluett(ek) */}
      <g fill="#0b0714" opacity="0.92">
        {duo ? (
          <>
            <circle cx="160" cy="150" r="34" />
            <path d="M100 300 C100 220 130 195 160 195 C190 195 220 220 220 300Z" />
            <circle cx="245" cy="160" r="32" />
            <path d="M188 300 C188 230 215 205 245 205 C275 205 302 230 302 300Z" />
          </>
        ) : (
          <>
            <circle cx="200" cy="145" r="38" />
            <path d="M125 300 C125 215 160 190 200 190 C240 190 275 215 275 300Z" />
            <path d="M236 180 l26 -40" stroke="#0b0714" strokeWidth="7" strokeLinecap="round" />
            <circle cx="266" cy="134" r="9" />
          </>
        )}
      </g>
      {monogram && <text x="24" y="276" fontFamily="var(--font-display), Georgia, serif" fontSize="56" fontWeight="800" fill={`url(#gold-${artist.id})`} opacity="0.95">
        {initials}
      </text>}
    </svg>
  );
}
