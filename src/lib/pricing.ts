import type { Artist, Coupon, Extra, ExtraId, Package, PackageId, PriceBreakdown } from "./types";

export interface PricingInput {
  packageId: PackageId | "";
  artist: Pick<Artist, "name" | "surchargeHuf"> | null;
  extras: ExtraId[];
  coupon: Coupon | null;
}

export interface PricingCatalog {
  packages: Pick<Package, "id" | "name" | "priceHuf">[];
  extras: Pick<Extra, "id" | "name" | "priceHuf" | "kind">[];
}

/** Ugyanez a függvény fut a kliensen (élő végösszeg) és a szerveren (hiteles ár). */
export function calculatePrice(input: PricingInput, catalog: PricingCatalog): PriceBreakdown {
  const lines: PriceBreakdown["lines"] = [];
  const pkg = catalog.packages.find((p) => p.id === input.packageId);
  if (pkg) lines.push({ label: `${pkg.name} csomag`, amountHuf: pkg.priceHuf });
  if (input.artist && input.artist.surchargeHuf > 0) {
    lines.push({ label: `${input.artist.name} – előadói felár`, amountHuf: input.artist.surchargeHuf });
  }
  for (const id of input.extras) {
    const ex = catalog.extras.find((e) => e.id === id);
    if (ex && ex.kind === "addon") lines.push({ label: ex.name, amountHuf: ex.priceHuf });
  }
  const subtotal = lines.reduce((s, l) => s + l.amountHuf, 0);
  let discount = 0;
  if (input.coupon && subtotal > 0) {
    if (input.coupon.percentOff) discount = Math.round((subtotal * input.coupon.percentOff) / 100);
    if (input.coupon.amountOffHuf) discount = Math.max(discount, input.coupon.amountOffHuf);
    discount = Math.min(discount, subtotal);
  }
  return {
    lines,
    discountHuf: discount,
    totalHuf: subtotal - discount,
    couponApplied: discount > 0 && input.coupon ? input.coupon.code : null,
  };
}

const huf = new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 0 });
export function formatHuf(amount: number): string {
  return `${huf.format(amount)} Ft`;
}

/** Előadói felár megjelenítése: 0 Ft esetén "felár nélkül". */
export function formatSurcharge(amount: number): string {
  return amount > 0 ? `+${formatHuf(amount)}` : "felár nélkül";
}
