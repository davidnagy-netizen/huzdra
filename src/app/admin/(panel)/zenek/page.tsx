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
      <TrainingManager samples={samples} jobs={jobs} styles={styles} />
    </>
  );
}
