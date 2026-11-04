"use client";

import { useId } from "react";

export function FieldError({ id, msg }: { id: string; msg?: string }) {
  if (!msg) return null;
  return (
    <p id={id} className="mt-1.5 text-sm font-semibold text-red" role="alert">
      {msg}
    </p>
  );
}

interface BaseProps {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
}

export function TextField({
  label,
  hint,
  error,
  optional,
  value,
  onChange,
  maxLength,
  ...rest
}: BaseProps & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & { value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-bold">
        <span>{label} {optional && <span className="font-normal text-muted">(nem kötelező)</span>}</span>
      </label>
      <input
        id={id}
        className="field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        aria-invalid={!!error}
        aria-describedby={[hint && `${id}-h`, error && `${id}-e`].filter(Boolean).join(" ") || undefined}
        {...rest}
      />
      {hint && <p id={`${id}-h`} className="mt-1 text-xs text-muted">{hint}</p>}
      <FieldError id={`${id}-e`} msg={error} />
    </div>
  );
}

export function TextArea({
  label,
  hint,
  error,
  optional,
  value,
  onChange,
  maxLength,
  rows = 4,
  placeholder,
}: BaseProps & { value: string; onChange: (v: string) => void; maxLength: number; rows?: number; placeholder?: string }) {
  const id = useId();
  const near = value.length > maxLength * 0.9;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold">
        {label} {optional && <span className="font-normal text-muted">(nem kötelező)</span>}
      </label>
      <textarea
        id={id}
        className="field resize-y"
        rows={rows}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={`${id}-c${hint ? ` ${id}-h` : ""}${error ? ` ${id}-e` : ""}`}
      />
      <div className="mt-1 flex justify-between gap-3 text-xs text-muted">
        <span id={`${id}-h`}>{hint}</span>
        <span id={`${id}-c`} className={`shrink-0 tabular-nums ${near ? "font-bold text-red" : ""}`} aria-live={near ? "polite" : "off"}>
          {value.length} / {maxLength}
        </span>
      </div>
      <FieldError id={`${id}-e`} msg={error} />
    </div>
  );
}

export function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
  columns = "sm:grid-cols-3",
}: {
  label: string;
  options: { value: T; title: string; desc?: string; icon?: React.ReactNode }[];
  value: T | "";
  onChange: (v: T) => void;
  error?: string;
  columns?: string;
}) {
  const id = useId();
  return (
    <fieldset aria-describedby={error ? `${id}-e` : undefined}>
      <legend className="mb-2 text-sm font-bold">{label}</legend>
      <div role="radiogroup" className={`grid gap-2 ${columns}`}>
        {options.map((o) => {
          const on = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.value)}
              className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition ${on ? "border-gold bg-gold/10 ring-2 ring-gold/40" : "border-line bg-surface hover:border-gold/60"}`}
            >
              {o.icon && <span className="text-2xl leading-none" aria-hidden>{o.icon}</span>}
              <span>
                <span className="block font-bold">{o.title}</span>
                {o.desc && <span className="mt-0.5 block text-sm text-muted">{o.desc}</span>}
              </span>
            </button>
          );
        })}
      </div>
      <FieldError id={`${id}-e`} msg={error} />
    </fieldset>
  );
}

export function Toggle({ checked, onChange, label, desc, price }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string; price?: string }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition ${checked ? "border-gold bg-gold/10" : "border-line bg-surface hover:border-gold/60"}`}>
      <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[var(--gold)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <b>{label}</b>
          {price && <span className="shrink-0 text-sm font-bold text-gold">{price}</span>}
        </span>
        {desc && <span className="mt-0.5 block text-sm text-muted">{desc}</span>}
      </span>
    </label>
  );
}
