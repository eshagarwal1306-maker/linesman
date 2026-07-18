import type { ClosedMarketRecord, SettlementAudit } from "@/lib/types";

/** Beyond this lag a correct settlement is still flagged "late", not "correct". */
export const LATE_THRESHOLD_MINUTES = 60;

/** Compare one closed venue market's resolution against TxLINE's proven result. */
export function computeAudit(record: ClosedMarketRecord): SettlementAudit {
  const { resolvedAt, fullTimeAt, venueResolution, provenResult } = record;

  if (resolvedAt === undefined) {
    return {
      venueMarketId: record.venueMarketId,
      venue: record.venue,
      question: record.question,
      fixtureId: record.fixtureId,
      provenResult,
      venueResolution,
      fullTimeAt,
      proofRef: record.proofRef,
      verdict: "unresolved",
    };
  }

  const lagMinutes = Math.max(0, Math.round((resolvedAt - fullTimeAt) / 60_000));
  const matches = venueResolution === provenResult;

  const verdict = !matches
    ? "incorrect"
    : lagMinutes > LATE_THRESHOLD_MINUTES
      ? "late"
      : "correct";

  return {
    venueMarketId: record.venueMarketId,
    venue: record.venue,
    question: record.question,
    fixtureId: record.fixtureId,
    provenResult,
    venueResolution,
    resolvedAt,
    fullTimeAt,
    proofRef: record.proofRef,
    verdict,
    lagMinutes,
  };
}

export function computeAudits(records: ClosedMarketRecord[]): SettlementAudit[] {
  return records.map(computeAudit);
}

export interface WatchdogSummary {
  total: number;
  correct: number;
  late: number;
  incorrect: number;
  unresolved: number;
}

export function summarizeAudits(audits: SettlementAudit[]): WatchdogSummary {
  return audits.reduce<WatchdogSummary>(
    (summary, audit) => {
      summary.total += 1;
      if (audit.verdict === "correct") summary.correct += 1;
      else if (audit.verdict === "late") summary.late += 1;
      else if (audit.verdict === "incorrect") summary.incorrect += 1;
      else summary.unresolved += 1;
      return summary;
    },
    { total: 0, correct: 0, late: 0, incorrect: 0, unresolved: 0 },
  );
}

/** Scandal rows first: incorrect, then late, then everything else by lag. */
export function sortAudits(audits: SettlementAudit[]): SettlementAudit[] {
  const severity: Record<SettlementAudit["verdict"], number> = {
    incorrect: 3,
    late: 2,
    unresolved: 1,
    correct: 0,
  };
  return [...audits].sort((a, b) => {
    const bySeverity = severity[b.verdict] - severity[a.verdict];
    if (bySeverity !== 0) return bySeverity;
    return (b.lagMinutes ?? 0) - (a.lagMinutes ?? 0);
  });
}
