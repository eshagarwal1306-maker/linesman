import { ImageResponse } from "next/og";
import { getSourceClosedMarkets } from "@/lib/sources/manager";
import { computeAudit } from "@/lib/engine/watchdog";
import { getFixtureLabel } from "@/lib/sources/mock";

export const runtime = "nodejs";

const VERDICT_STYLE: Record<string, { label: string; color: string }> = {
  correct: { label: "Correct", color: "#00e676" },
  late: { label: "Late", color: "#ffb300" },
  incorrect: { label: "Incorrect", color: "#ff4757" },
  unresolved: { label: "Unresolved", color: "#a6b1c6" },
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const venueMarketId = decodeURIComponent(id);
  const { records } = await getSourceClosedMarkets();
  const record = records.find((item) => item.venueMarketId === venueMarketId);

  if (!record) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0e14", color: "#a6b1c6", fontSize: 40, fontFamily: "sans-serif" }}>
          Audit not found
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }

  const audit = computeAudit(record);
  const style = VERDICT_STYLE[audit.verdict];

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
            Settlement Watchdog · {audit.venue}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", fontSize: 28, color: "#a6b1c6" }}>{getFixtureLabel(audit.fixtureId)}</div>
          <div style={{ display: "flex", fontSize: 48, fontWeight: 800, color: "#f4f6fa", lineHeight: 1.15 }}>{audit.question}</div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 900, color: style.color }}>{style.label}</div>
          <div style={{ display: "flex", fontSize: 26, color: "#a6b1c6" }}>
            TxLINE proved {audit.provenResult} · venue resolved {audit.venueResolution}
            {audit.lagMinutes != null ? ` · resolved ${audit.lagMinutes}m after full time` : ""}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 22, color: "#00e676" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00e676" strokeWidth="2" strokeLinecap="round">
            <path d="M9.5 14.5 14.5 9.5" />
            <path d="M11 6.5 13 4.6a3.6 3.6 0 0 1 5.1 5.1L16.2 11.6" />
            <path d="M13 17.5 11 19.4a3.6 3.6 0 0 1-5.1-5.1l1.9-1.9" />
          </svg>
          <span>Proven on Solana · slot {audit.proofRef.slot?.toLocaleString() ?? "—"}</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
