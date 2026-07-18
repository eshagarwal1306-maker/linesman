import { NextResponse } from "next/server";
import { getFixtureLabel } from "@/lib/sources/mock";
import { getSourceClosedMarkets } from "@/lib/sources/manager";
import { computeAudits, sortAudits, summarizeAudits } from "@/lib/engine/watchdog";

export async function GET() {
  const { records, status } = await getSourceClosedMarkets();
  const audits = sortAudits(computeAudits(records)).map((audit) => ({
    ...audit,
    fixtureLabel: getFixtureLabel(audit.fixtureId),
  }));
  const summary = summarizeAudits(audits);
  return NextResponse.json({ audits, summary, status, generatedAt: Date.now() });
}
