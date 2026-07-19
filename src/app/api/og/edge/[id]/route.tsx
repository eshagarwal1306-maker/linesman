import { ImageResponse } from "next/og";
import { getSourceEdges } from "@/lib/sources/manager";

export const runtime = "nodejs";

const VENUE_LABEL: Record<string, string> = { polymarket: "Polymarket", kalshi: "Kalshi" };

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [outcomeId, venue] = decodeURIComponent(id).split("::");
  const { edges } = await getSourceEdges();
  const edge = edges.find((item) => item.outcomeId === outcomeId && item.venue.venue === venue);

  if (!edge) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0e14", color: "#a6b1c6", fontSize: 40, fontFamily: "sans-serif" }}>
          Edge not found
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }

  const { sharp } = edge;
  const positive = edge.direction === "underpriced";
  const accent = positive ? "#00e676" : "#ff4757";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "linear-gradient(135deg, #0a0e14 0%, #121826 60%, #0a0e14 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 900, color: "#f4f6fa", letterSpacing: 1 }}>
            LINES<span style={{ color: "#00e676" }}>MAN</span>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#a6b1c6", textTransform: "uppercase", letterSpacing: 2 }}>
            {sharp.competition} · {sharp.market.replace("_", " ")}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", fontSize: 30, color: "#a6b1c6" }}>
            {sharp.homeTeam.name} vs {sharp.awayTeam.name}
          </div>
          <div style={{ display: "flex", fontSize: 54, fontWeight: 800, color: "#f4f6fa" }}>{sharp.selectionLabel}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
            <div style={{ display: "flex", fontSize: 120, fontWeight: 900, color: accent }}>
              {edge.evPct > 0 ? "+" : ""}
              {edge.evPct.toFixed(0)}%
            </div>
            <div style={{ display: "flex", fontSize: 30, color: "#a6b1c6", textTransform: "uppercase" }}>
              {positive ? "Underpriced" : "Overpriced"} EV
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#a6b1c6" }}>
            {VENUE_LABEL[edge.venue.venue] ?? edge.venue.venue} {(edge.venue.yesPrice * 100).toFixed(0)}¢ vs sharp fair {(sharp.fairProb * 100).toFixed(1)}%
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 22, color: "#00e676" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00e676" strokeWidth="2" strokeLinecap="round">
            <path d="M9.5 14.5 14.5 9.5" />
            <path d="M11 6.5 13 4.6a3.6 3.6 0 0 1 5.1 5.1L16.2 11.6" />
            <path d="M13 17.5 11 19.4a3.6 3.6 0 0 1-5.1-5.1l1.9-1.9" />
          </svg>
          <span>Proven on Solana · slot {sharp.proofRef.slot?.toLocaleString() ?? "—"}</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
