export function formatPct(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

export function formatSignedPct(value: number, digits = 0): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatCents(price: number): string {
  return `${Math.round(price * 100)}¢`;
}

export function formatLiquidity(amount?: number): string {
  if (!amount) return "—";
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(amount >= 10_000 ? 0 : 1)}k`;
  return `$${Math.round(amount)}`;
}

export function formatRelativeTime(timestamp: number, now = Date.now()): string {
  const diffMs = now - timestamp;
  const diffSec = Math.round(diffMs / 1_000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.round(diffMin / 60);
  return `${diffHour}h ago`;
}

export function formatLag(minutes?: number): string {
  if (minutes === undefined) return "unresolved";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h ${rest}m`;
}

export function formatKickoffCountdown(kickoffTime: number, now = Date.now()): string {
  const diffMs = kickoffTime - now;
  if (diffMs <= 0) return "In progress";
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `Kicks off in ${hours}h ${minutes % 60}m`;
  return `Kicks off in ${minutes}m`;
}
