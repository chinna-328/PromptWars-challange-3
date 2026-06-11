/**
 * Inline icon set for the navigation and brand mark.
 * Paths are from Lucide (https://lucide.dev, ISC licence) — 24×24 grid,
 * 2px stroke, round caps/joins — inlined as components so they inherit
 * `currentColor` and add no runtime dependency. All icons are decorative
 * (`aria-hidden`): the adjacent text label always carries the meaning.
 */
import type { ReactNode } from 'react';

interface IconProps {
  children: ReactNode;
}

/** Shared 20px decorative SVG frame for every icon glyph. */
function Icon({ children }: IconProps): JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Gauge — Dashboard nav item. */
export function GaugeIcon(): JSX.Element {
  return (
    <Icon>
      <path d="m12 14 4-4" />
      <path d="M3.34 19a10 10 0 1 1 17.32 0" />
    </Icon>
  );
}

/** Circled plus — Log activity nav item. */
export function PlusIcon(): JSX.Element {
  return (
    <Icon>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8" />
      <path d="M12 8v8" />
    </Icon>
  );
}

/** Lightbulb — Insights nav item. */
export function BulbIcon(): JSX.Element {
  return (
    <Icon>
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </Icon>
  );
}

/** Target — Actions & goals nav item. */
export function TargetIcon(): JSX.Element {
  return (
    <Icon>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </Icon>
  );
}

/** Book — Understand nav item. */
export function BookIcon(): JSX.Element {
  return (
    <Icon>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </Icon>
  );
}

/** Leaf brand mark shown beside the EcoTrace wordmark. */
export function LeafMark(): JSX.Element {
  return (
    <svg
      className="brand-mark"
      width="32"
      height="32"
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="40" height="40" rx="11" fill="#101714" />
      <rect
        x="0.6"
        y="0.6"
        width="38.8"
        height="38.8"
        rx="10.4"
        stroke="#1fb86f"
        strokeOpacity="0.45"
        strokeWidth="1.2"
      />
      <path d="M11 27C11 18.7 17.7 12 26 12H29V15C29 23.3 22.3 30 14 30H11V27Z" fill="url(#leaf-g)" />
      <path
        d="M13.5 27.5C17 22 21.5 18.5 27 16"
        stroke="#04140c"
        strokeOpacity="0.7"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="leaf-g" x1="11" y1="12" x2="29" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5cdc9c" />
          <stop offset="1" stopColor="#16965a" />
        </linearGradient>
      </defs>
    </svg>
  );
}
