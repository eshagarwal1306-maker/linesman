import type { Team } from "@/lib/types";

const SIZES = { sm: 28, md: 40, lg: 64 } as const;

export function TeamCrest({
  team,
  size = "md",
}: {
  team: Team;
  size?: keyof typeof SIZES;
}) {
  const px = SIZES[size];
  return (
    <div
      role="img"
      aria-label={team.name}
      className="flex shrink-0 items-center justify-center rounded-full font-display text-[color:var(--color-bg)] shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
      style={{
        width: px,
        height: px,
        fontSize: px * 0.36,
        background: `linear-gradient(135deg, ${team.primaryColor} 45%, ${team.secondaryColor} 100%)`,
      }}
    >
      {team.code}
    </div>
  );
}
