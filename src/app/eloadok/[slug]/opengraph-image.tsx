import { ImageResponse } from "next/og";
import { getRepo } from "@/lib/db";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Húzdrá! – egyedi dal a hivatalos előadói hangon";

export default async function Image(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const artist = await getRepo().getArtistBySlug(slug);
  const name = artist?.name ?? "Húzdrá!";
  const hue = artist?.accentHue ?? 12;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: `radial-gradient(circle at 20% 0%, hsl(${hue} 80% 40%), #14060e 60%), #14060e`,
          color: "#fbf3e6",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 44, color: "#f0c35e", fontWeight: 800 }}>Húzdrá!</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 30, color: "#f0c35e", fontWeight: 700, textTransform: "uppercase", letterSpacing: 4 }}>Hivatalos hang</div>
          <div style={{ fontSize: 96, fontWeight: 900, lineHeight: 1.05 }}>{name}</div>
          <div style={{ fontSize: 38, marginTop: 16, color: "#e7d3c4" }}>Saját nótád, az ő hangján – akár pár órán belül.</div>
        </div>
        <div style={{ fontSize: 30, color: "#c7b1b8" }}>huzdra.hu · Mondd el a történeted, mi meg húzzuk rá!</div>
      </div>
    ),
    size,
  );
}
