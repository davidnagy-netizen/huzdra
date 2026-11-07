import { HomeView } from "@/components/home/HomeView";
import { getHomeData } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getHomeData();
  return <HomeView data={data} />;
}
