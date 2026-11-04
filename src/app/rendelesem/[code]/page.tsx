import type { Metadata } from "next";
import { OrderStatus } from "@/components/order/OrderStatus";

export const metadata: Metadata = { title: "Rendelésem", robots: { index: false } };

export default async function OrderStatusPage(props: PageProps<"/rendelesem/[code]">) {
  const { code } = await props.params;
  const sp = await props.searchParams;
  const k = typeof sp.k === "string" ? sp.k : "";
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-6 font-display text-3xl font-black">Így készül a dalod</h1>
      <OrderStatus code={decodeURIComponent(code)} statusKey={k} fresh={sp.uj === "1"} />
    </div>
  );
}
