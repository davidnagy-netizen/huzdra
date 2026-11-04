import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 20) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const PlayIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p} fill="currentColor" stroke="none"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>
);
export const PauseIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p} fill="currentColor" stroke="none"><rect x="6" y="5" width="4" height="14" rx="1.2" /><rect x="14" y="5" width="4" height="14" rx="1.2" /></svg>
);
export const NextIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M6 6l9 6-9 6V6z" fill="currentColor" /><path d="M18 6v12" /></svg>
);
export const PrevIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M18 6l-9 6 9 6V6z" fill="currentColor" /><path d="M6 6v12" /></svg>
);
export const StarIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p} fill="currentColor" stroke="none"><path d="M12 2.8l2.8 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17l-5.6 3 1.1-6.2L2.9 9.4l6.3-.9z" /></svg>
);
export const CheckIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
export const ShieldIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></svg>
);
export const ClockIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const RefreshIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M20 11a8 8 0 0 0-14.6-4.5L4 8" /><path d="M4 4v4h4" /><path d="M4 13a8 8 0 0 0 14.6 4.5L20 16" /><path d="M20 20v-4h-4" /></svg>
);
export const CardIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3 10h18M7 15h3" /></svg>
);
export const MicIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" /></svg>
);
export const MailIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M4 7l8 6 8-6" /></svg>
);
export const PenIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" /><path d="M14 6l3 3" /></svg>
);
export const DownloadIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" /></svg>
);
export const ShareIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="18" cy="5.5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="18.5" r="2.5" /><path d="M8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1" /></svg>
);
export const SunIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
);
export const MoonIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
);
export const ChevronIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M6 9l6 6 6-6" /></svg>
);
export const ArrowLeftIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
);
export const ArrowRightIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const GiftIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><rect x="3.5" y="9" width="17" height="11.5" rx="1.5" /><path d="M2.5 9h19v-3h-19zM12 6v14.5M12 6c-1.5-3-5-3.5-5-1.2C7 6 9.5 6 12 6zm0 0c1.5-3 5-3.5 5-1.2C17 6 14.5 6 12 6z" /></svg>
);

/** Hegedű motívum (dekoratív) */
export const ViolinIcon = ({ size = 48, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden {...p}>
    <path d="M40 8l6 6-4 4-6-6z" />
    <path d="M38 14L28 24" />
    <path d="M28 24c-3-3-9-2-11 2-1.5 3 0 5-2 7-3 1-6 3-6 8 0 7 7 14 14 14 5 0 7-3 8-6 2-2 4-.5 7-2 4-2 5-8 2-11-2-2-2-3 0-5l-12-7z" />
    <path d="M22 36c1 1 3 1 4 0M30 44c-1-1-1-3 0-4" />
    <path d="M18 46l8-8" />
    <path d="M6 58L58 6" strokeWidth={1.4} opacity={0.6} />
  </svg>
);
/** Cimbalom motívum */
export const CimbalomIcon = ({ size = 48, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden {...p}>
    <path d="M6 40l8-18h36l8 18z" />
    <path d="M14 22l-8 18M50 22l8 18" />
    <path d="M14 27h36M12 31h40M10 35h44" strokeWidth={1.2} opacity={0.7} />
    <path d="M14 40v10M50 40v10" />
    <path d="M24 10l6 14M42 10l-6 14" />
    <circle cx="24" cy="9" r="2" /><circle cx="42" cy="9" r="2" />
  </svg>
);
/** Szintetizátor motívum */
export const SynthIcon = ({ size = 48, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden {...p}>
    <rect x="4" y="18" width="56" height="30" rx="4" />
    <path d="M4 32h56" />
    <path d="M12 32v16M20 32v16M28 32v16M36 32v16M44 32v16M52 32v16" strokeWidth={1.4} />
    <circle cx="14" cy="25" r="2.5" /><circle cx="24" cy="25" r="2.5" />
    <path d="M36 25h18" />
  </svg>
);
/** Tánc motívum (táncoló pár) */
export const DanceIcon = ({ size = 48, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
    <circle cx="22" cy="10" r="4" /><circle cx="42" cy="12" r="4" />
    <path d="M22 14v16l-6 14M22 30l6 14M22 20l10 2 6-4" />
    <path d="M42 16l-2 14 8 16H32l8-16" />
    <path d="M42 22l8 4" />
  </svg>
);
