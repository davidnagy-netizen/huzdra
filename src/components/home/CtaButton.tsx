"use client";

import type { PackageId } from "@/lib/types";
import { presetWizard, type WizardPreset } from "@/lib/wizard-bus";

/** Fő CTA: a rendelési varázslóhoz görget (opcionálisan előtöltéssel). */
export function CtaButton({
  children,
  className = "",
  preset,
  packageId,
}: {
  children: React.ReactNode;
  className?: string;
  preset?: WizardPreset;
  packageId?: PackageId;
}) {
  return (
    <button
      type="button"
      className={`btn-primary ${className}`}
      onClick={() => {
        if (packageId) window.dispatchEvent(new CustomEvent("huzdra:wizard-package", { detail: packageId }));
        presetWizard(preset ?? {});
      }}
    >
      {children}
    </button>
  );
}
