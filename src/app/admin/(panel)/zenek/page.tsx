import { TrainingManager } from "@/components/admin/TrainingManager";
import { PageTitle } from "@/components/admin/ui";
import { getRepo } from "@/lib/db";

export const metadata = { title: "Zenék és tanítás" };

export default async function TrainingPage() {
  const repo = getRepo();
  const [samples, jobs, styles] = await Promise.all([repo.listTrainingSamples(), repo.listTrainingJobs(), repo.listStyles()]);
  return (
    <>
      <PageTitle
        title="Zenék és tanítás"
        sub={process.env.MUSIC_API_URL ? `Zene-API: ${new URL(process.env.MUSIC_API_URL).host}` : "Zene-API nincs csatlakoztatva – a tanítás szimulált (MUSIC_API_URL beállítása után valódi)."}
      />
      <TrainingManager samples={samples.filter((s) => (s.purpose ?? "style") === "style")} jobs={jobs.filter((j) => (j.type ?? "style") === "style")} styles={styles} />
      <p className="mt-4 text-sm text-muted">Előadói hangok tanítása: <a href="/admin/katalogus/artists" className="font-semibold text-gold">Előadók és felárak</a> → az előadó „Hang és élesítés” oldala.</p>
    </>
  );
}
