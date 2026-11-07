import type { Metadata } from "next";
import { LookupForm } from "@/components/order/LookupForm";

export const metadata: Metadata = { title: "Már rendeltél? – Rendelés követése", robots: { index: false } };

export default function LookupPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-3xl font-black">Már rendeltél?</h1>
      <p className="mt-2 text-muted">Add meg a rendelésszámot (a visszaigazoló e-mailben találod, pl. HZ-4F7K2Q) és az e-mail-címedet.</p>
      <LookupForm />
    </div>
  );
}
