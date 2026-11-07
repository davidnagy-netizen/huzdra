import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LEGAL_DOCS } from "@/lib/legal";

export function generateStaticParams() {
  return LEGAL_DOCS.map((d) => ({ doc: d.slug }));
}
export const dynamicParams = false;

export async function generateMetadata(props: PageProps<"/jogi/[doc]">): Promise<Metadata> {
  const { doc } = await props.params;
  const d = LEGAL_DOCS.find((x) => x.slug === doc);
  return d ? { title: d.title, alternates: { canonical: `/jogi/${d.slug}` } } : {};
}

export default async function LegalPage(props: PageProps<"/jogi/[doc]">) {
  const { doc } = await props.params;
  const d = LEGAL_DOCS.find((x) => x.slug === doc);
  if (!d) notFound();
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl font-black">{d.title}</h1>
      <p className="mt-3 rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm">Tervezet – élesítés előtt jogász által véglegesítendő.</p>
      {d.sections.map((s) => (
        <section key={s.h} className="mt-8">
          <h2 className="font-display text-xl font-bold">{s.h}</h2>
          {s.p.map((p, i) => <p key={i} className="mt-2 text-muted">{p}</p>)}
        </section>
      ))}
    </article>
  );
}
