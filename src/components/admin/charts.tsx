// Egysoros (egy adatsoros) grafikonok: egy szín (--chart-1), jelmagyarázat nélkül, a cím nevezi meg
// az adatot. Vékony, a tengelyre ülő, 4px-es lekerekítésű oszlopok, 2px rés, rámutatásra tooltip,
// és minden grafikon mellett táblázatos nézet (képernyőolvasónak és pontos értékekhez).
import { formatHuf } from "@/lib/pricing";
import type { Bar } from "@/lib/admin-stats";

export function DailyBars({ data, title }: { data: Bar[]; title: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <figure>
      <figcaption className="mb-3 flex items-baseline justify-between gap-2">
        <span className="text-sm font-bold">{title}</span>
        <span className="text-sm text-muted">összesen <b className="text-ink">{formatHuf(total)}</b></span>
      </figcaption>
      <div className="relative h-40" role="img" aria-label={`${title}: ${data.map((d) => `${d.label} ${formatHuf(d.value)}`).join(", ")}`}>
        <div className="absolute inset-x-0 bottom-0 border-t border-line" aria-hidden />
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-line/60" aria-hidden />
        <span className="absolute -top-2 right-0 bg-surface pl-1 text-[10px] text-muted">{formatHuf(max)}</span>
        <div className="flex h-full items-end gap-[2px]">
          {data.map((d, i) => (
            <div key={i} className="group relative flex h-full flex-1 items-end">
              <div
                className="w-full rounded-t-[4px] bg-chart-1 transition-opacity group-hover:opacity-80"
                style={{ height: `${d.value ? Math.max(2, (d.value / max) * 100) : 0}%` }}
              />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-surface px-2 py-1 text-xs shadow-lg group-hover:block">
                {d.label}: <b>{formatHuf(d.value)}</b>
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted" aria-hidden>
        <span>{data[0]?.label}</span>
        <span>{data.at(-1)?.label}</span>
      </div>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-muted">Táblázat</summary>
        <table className="mt-2 w-full">
          <tbody>{data.map((d) => <tr key={d.label} className="border-t border-line"><td className="py-1">{d.label}</td><td className="py-1 text-right tabular-nums">{formatHuf(d.value)}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}

export function BarList({ data, title, money = true, empty = "Még nincs adat." }: { data: Bar[]; title: string; money?: boolean; empty?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure>
      <figcaption className="mb-3 text-sm font-bold">{title}</figcaption>
      {data.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="space-y-2.5">
          {data.map((d) => (
            <li key={d.label} title={`${d.label}: ${money ? formatHuf(d.value) : d.value}${d.sub ? ` · ${d.sub}` : ""}`}>
              <div className="mb-1 flex justify-between gap-2 text-sm">
                <span className="truncate">{d.label}</span>
                <span className="shrink-0 tabular-nums text-muted">
                  <b className="text-ink">{money ? formatHuf(d.value) : d.value}</b>{d.sub ? ` · ${d.sub}` : ""}
                </span>
              </div>
              <div className="h-2 rounded-full bg-line/50">
                <div className="h-full rounded-full bg-chart-1" style={{ width: `${Math.max(2, (d.value / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}

export function Funnel({ steps, title }: { steps: { label: string; value: number }[]; title: string }) {
  const top = Math.max(1, steps[0]?.value ?? 1);
  return (
    <figure>
      <figcaption className="mb-3 text-sm font-bold">{title}</figcaption>
      <ol className="space-y-2">
        {steps.map((s, i) => {
          const prev = i ? steps[i - 1].value : null;
          const rate = prev ? Math.round((s.value / prev) * 100) : null;
          return (
            <li key={s.label} title={`${s.label}: ${s.value}`}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{s.label}</span>
                <span className="tabular-nums text-muted">
                  <b className="text-ink">{s.value}</b>
                  {rate != null && ` · ${rate}% az előző lépésből`}
                </span>
              </div>
              <div className="h-2 rounded-full bg-line/50">
                <div className="h-full rounded-full bg-chart-1" style={{ width: `${s.value ? Math.min(100, Math.max(2, (s.value / top) * 100)) : 0}%` }} />
              </div>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
