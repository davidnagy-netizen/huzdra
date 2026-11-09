import Link from "next/link";
import { notFound } from "next/navigation";
import { ArtistLaunch } from "@/components/admin/ArtistLaunch";
import { TrainingManager } from "@/components/admin/TrainingManager";
import { PageTitle, Tone } from "@/components/admin/ui";
import { getRepo } from "@/lib/db";
import { formatHuf } from "@/lib/pricing";

export const metadata = { title: "Előadó – hang és élesítés" };

export default async function ArtistAdminPage(props: PageProps<"/admin/eloadok/[id]">) {
  const { id } = await props.params;
  const repo = getRepo();
  const artist = await repo.getArtistById(decodeURIComponent(id));
  if (!artist) notFound();
  const [samples, jobs, styles, orders] = await Promise.all([repo.listTrainingSamples(), repo.listTrainingJobs(), repo.listStyles(), repo.listOrders()]);
  const voiceSamples = samples.filter((s) => s.purpose === "voice" && s.artistId === artist.id);
  const voiceJobs = jobs.filter((j) => j.type === "voice" && j.artistId === artist.id);
  const mine = orders.filter((o) => o.data.artistId === artist.id && o.payment.state === "captured");
  const revenue = mine.reduce((s, o) => s + o.price.totalHuf, 0);
  const royalty = Math.round(revenue * (artist.royaltyPercent / 100));
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/katalogus/artists" className="text-muted hover:text-ink">← Előadók és felárak</Link></p>
      <PageTitle
        title={`${artist.name} – hang és élesítés`}
        sub={`${artist.kind === "celebrity" ? "Ismert előadó" : "Saját hang"} · ${mine.length} fizetett rendelés · ${formatHuf(revenue)} bevétel · jogdíj (${artist.royaltyPercent}%): ${formatHuf(royalty)}`}
        actions={artist.availability === "available" ? <Tone tone="good">Elérhető</Tone> : <Tone tone="warn">Egyeztetés alatt</Tone>}
      />
      <ArtistLaunch artist={artist} voiceSamples={voiceSamples.length} hasActiveVoice={voiceJobs.some((j) => j.active)} />
      <h2 className="mb-3 mt-8 font-display text-2xl font-bold">Hang tanítása</h2>
      <TrainingManager mode="voice" artist={{ id: artist.id, name: artist.name }} samples={voiceSamples} jobs={voiceJobs} styles={styles} />
    </>
  );
}
