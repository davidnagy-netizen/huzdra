"use client";

import type { OccasionId, StyleId } from "./types";

export interface WizardPreset {
  artistId?: string;
  occasionId?: OccasionId;
  styleId?: StyleId;
}

export const PRESET_EVENT = "huzdra:wizard-preset";

/** Kívülről (előadókártya, mintadal, landing) előtölti a varázslót és odagörget. */
export function presetWizard(p: WizardPreset) {
  window.dispatchEvent(new CustomEvent<WizardPreset>(PRESET_EVENT, { detail: p }));
  // Előadóválasztás után egyenesen a varázslóhoz, egyébként a rendelés szekció elejére.
  const target = (p.artistId && document.getElementById("wizard")) || document.getElementById("rendeles");
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}
