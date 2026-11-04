import type { Catalog } from "@/lib/catalog";
import { SITE } from "@/lib/site";
import type { Faq, OccasionId, Review, SiteStats } from "@/lib/types";
import type { WizardPreset } from "@/lib/wizard-bus";
import { FeaturedPlayer } from "../audio/FeaturedPlayer";
import { Wizard } from "../wizard/Wizard";
import { ArtistCards } from "./ArtistCards";
import { SampleGrid } from "./SampleGrid";
import { ClosingCta, Comparison, FaqList, Hero, HowItWorks, Pricing, Reviews, SectionTitle } from "./Sections";

export interface HomeData extends Catalog {
  reviews: Review[];
  faqs: Faq[];
  stats: SiteStats;
}

export function HomeView({
  data,
  hero,
  preset,
  initialOccasion,
  intro,
}: {
  data: HomeData;
  hero?: { title: React.ReactNode; sub: string };
  preset?: WizardPreset;
  initialOccasion?: OccasionId;
  intro?: React.ReactNode;
}) {
  const minPrice = Math.min(...data.packages.map((p) => p.priceHuf));
  const maxPrice = Math.max(...data.packages.map((p) => p.priceHuf)) + Math.max(...data.artists.map((a) => a.surchargeHuf));
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Egyedi, személyre szóló mulatós dal",
      brand: { "@type": "Brand", name: "Húzdrá!" },
      description: SITE.promise,
      offers: { "@type": "AggregateOffer", priceCurrency: "HUF", lowPrice: minPrice, highPrice: maxPrice, offerCount: data.packages.length },
      ...(data.reviews.length && {
        aggregateRating: { "@type": "AggregateRating", ratingValue: data.stats.averageRating, reviewCount: data.stats.reviewCount },
        review: data.reviews.slice(0, 3).map((r) => ({
          "@type": "Review",
          author: { "@type": "Person", name: r.authorName },
          reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
          reviewBody: r.text,
          datePublished: r.createdAt,
        })),
      }),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: data.faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Hero stats={data.stats} title={hero?.title} sub={hero?.sub} />
      {intro}

      <section id="eloadok" aria-labelledby="eloadok-t" className="mx-auto max-w-6xl px-4 py-16">
        <SectionTitle id="eloadok-t" eyebrow="Hangjaink" title="Ki húzza rá a te nótádat?" sub="Öt saját hang, öt stílus – a pörgős lakodalmastól a megható balladáig. Hallgass bele, és válaszd ki a kedvencedet!" />
        <ArtistCards catalog={data} />
      </section>

      <section id="mintadalok" aria-labelledby="minta-t" className="mx-auto max-w-6xl px-4 py-16">
        <SectionTitle id="minta-t" eyebrow="Hallgass bele" title="Így szól egy saját nóta" sub="Válassz előadót, és indulhat a zene. Mindegyik dal egy valódi történetből születhetne – akár a tiédből is." />
        <div className="mx-auto max-w-3xl">
          <FeaturedPlayer catalog={data} />
        </div>
        <div className="mt-12">
          <h3 className="mb-4 font-display text-2xl font-bold">Minden alkalomra, minden hangulatra</h3>
          <SampleGrid catalog={data} initialOccasion={initialOccasion} />
        </div>
      </section>

      <section id="hogyan" aria-labelledby="hogyan-t" className="mx-auto max-w-6xl px-4 py-16">
        <SectionTitle id="hogyan-t" eyebrow="Egyszerű, mint egy pohárköszöntő" title="Hogyan működik?" />
        <HowItWorks />
      </section>

      <section id="velemenyek" aria-labelledby="vel-t" className="mx-auto max-w-6xl px-4 py-16">
        <SectionTitle id="vel-t" eyebrow="Akik már rendeltek" title="Könnyek, kiabálás, hajnalig tartó tánc" />
        <Reviews reviews={data.reviews} catalog={data} stats={data.stats} />
      </section>

      <section aria-labelledby="osszehasonlitas-t" className="mx-auto max-w-4xl px-4 py-16">
        <SectionTitle id="osszehasonlitas-t" eyebrow="Ajándékötlet" title="Saját nóta vs. egy átlagos ajándék" />
        <Comparison />
      </section>

      <section id="rendeles" aria-labelledby="rendeles-t" className="relative scroll-mt-16 px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <SectionTitle id="rendeles-t" eyebrow="Rendelés" title={<>Mondd el a történeted, <span className="text-gradient-gold">mi meg húzzuk rá!</span></>} sub="6 rövid lépés, kb. 5 perc. Fizetni csak akkor kell, ha kész a dal." />
          <Wizard catalog={data} preset={preset} />
        </div>
      </section>

      <section id="arak" aria-labelledby="arak-t" className="mx-auto max-w-6xl px-4 py-16">
        <SectionTitle id="arak-t" eyebrow="Árak és csomagok" title="Válaszd ki, mikorra kell a dal" sub={`Már ${minPrice.toLocaleString("hu-HU")} Ft-tól, előadói felárral. Fizetés csak ha kész.`} />
        <Pricing catalog={data} />
      </section>

      <section id="gyik" aria-labelledby="gyik-t" className="mx-auto max-w-6xl px-4 py-16">
        <SectionTitle id="gyik-t" eyebrow="GYIK" title="Gyakori kérdések" />
        <FaqList faqs={data.faqs} />
      </section>

      <ClosingCta />
    </>
  );
}
