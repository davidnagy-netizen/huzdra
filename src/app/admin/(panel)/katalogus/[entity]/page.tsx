import { notFound } from "next/navigation";
import { CrudManager } from "@/components/admin/CrudManager";
import { PageTitle } from "@/components/admin/ui";
import { ENTITIES, STATIC_OPTIONS } from "@/lib/admin-entities";
import { getRepo } from "@/lib/db";

export default async function CatalogPage(props: PageProps<"/admin/katalogus/[entity]">) {
  const { entity } = await props.params;
  const def = ENTITIES[entity];
  if (!def) notFound();
  const repo = getRepo();
  const [rows, styles, occasions, artists] = await Promise.all([repo.adminList(def.entity), repo.listStyles(), repo.listOccasions(), repo.listArtists({ includeInactive: true })]);
  const options = {
    ...STATIC_OPTIONS,
    styles: styles.map((s) => ({ value: s.id, label: s.label })),
    occasions: occasions.map((o) => ({ value: o.id, label: o.label })),
    artists: artists.map((a) => ({ value: a.id, label: a.name })),
  };
  const sorted = [...rows].sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
  return (
    <>
      <PageTitle title={def.title} />
      <CrudManager def={def} rows={sorted} options={options} />
    </>
  );
}
