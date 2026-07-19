import type { SVGProps } from "react";

/**
 * Minimal stroke-icon set — 24x24, 1.75 stroke, currentColor. One shared
 * visual language everywhere an emoji used to stand in for an icon (nav,
 * verify/share affordances, verdict badges). Keeps sizing/spacing consistent
 * via `className` (default h-4 w-4) rather than relying on font glyph
 * metrics, which is why the emoji swap-out also fixed baseline misalignment.
 */

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: "h-4 w-4",
    ...props,
  };
}

export function IconBolt(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </svg>
  );
}

export function IconShield(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3 4.5 5.5v6c0 5 3.2 7.8 7.5 9.5 4.3-1.7 7.5-4.5 7.5-9.5v-6L12 3Z" />
    </svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 7.5V12l3.2 2" />
    </svg>
  );
}

export function IconChainLink(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9.5 14.5 14.5 9.5" />
      <path d="M11 6.5 13 4.6a3.6 3.6 0 0 1 5.1 5.1L16.2 11.6" />
      <path d="M13 17.5 11 19.4a3.6 3.6 0 0 1-5.1-5.1l1.9-1.9" />
    </svg>
  );
}

export function IconTrophy(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5.5H5.5A2.5 2.5 0 0 0 6 10.4" />
      <path d="M16 5.5h2.5A2.5 2.5 0 0 1 18 10.4" />
      <path d="M10 15.5h4" />
      <path d="M12 12v3.5" />
      <path d="M8.5 20h7" />
      <path d="M10 20v-2.3h4V20" />
    </svg>
  );
}

export function IconMedal(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8.5 3 6 9l3 1.8" />
      <path d="M15.5 3 18 9l-3 1.8" />
      <circle cx="12" cy="14.5" r="6" />
      <path d="M12 11.8v5.4" />
    </svg>
  );
}

export function IconArrowUpRight(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 17 17 7" />
      <path d="M9 7h8v8" />
    </svg>
  );
}

export function IconShare(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="M8.2 10.7 15.8 6.5" />
      <path d="M8.2 13.3 15.8 17.5" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 12.5 9.5 17 19 7" />
    </svg>
  );
}

export function IconX(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function IconAlertTriangle(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 4 3 20h18L12 4Z" />
      <path d="M12 10v4.5" />
      <path d="M12 17.2v.1" />
    </svg>
  );
}

export function IconChevronLeft(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M15 5 8 12l7 7" />
    </svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 5 16 12l-7 7" />
    </svg>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 9 12 16l7-7" />
    </svg>
  );
}

export function IconArrowDown(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 4v14" />
      <path d="M6 12l6 6 6-6" />
    </svg>
  );
}

export function IconDot(props: IconProps) {
  return (
    <svg {...base(props)} className={props.className ?? "h-2 w-2"} fill="currentColor" stroke="none">
      <circle cx="12" cy="12" r="12" />
    </svg>
  );
}

export function IconSmartphone(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M10.5 18.5h3" />
    </svg>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <svg {...base(props)} fill="currentColor" stroke="none">
      <path d="M7 4.5v15l13-7.5-13-7.5Z" />
    </svg>
  );
}

export function IconPause(props: IconProps) {
  return (
    <svg {...base(props)} fill="currentColor" stroke="none">
      <rect x="6" y="4.5" width="4.5" height="15" rx="1" />
      <rect x="13.5" y="4.5" width="4.5" height="15" rx="1" />
    </svg>
  );
}

export function IconMonitor(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="2.5" y="4" width="19" height="13" rx="1.75" />
      <path d="M8 20.5h8" />
      <path d="M12 17v3.5" />
    </svg>
  );
}
