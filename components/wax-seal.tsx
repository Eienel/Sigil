"use client";

import { motion, useReducedMotion } from "motion/react";

type Variant = "filled" | "engraved";

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };

/*
  The Sigil signet. A wax seal stamped with a monogram.
  filled   -> human signature, solid wax
  engraved -> AI agent signature, outline only, same accent
  Animate transform and opacity only.
*/
export function WaxSeal({
  variant = "filled",
  size = 96,
  pressed = false,
  className,
  title,
}: {
  variant?: Variant;
  size?: number;
  pressed?: boolean;
  className?: string;
  title?: string;
}) {
  const reduce = useReducedMotion();
  const isFilled = variant === "filled";

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={title ?? (isFilled ? "Human wax seal" : "Agent wax seal")}
      initial={false}
      animate={
        reduce
          ? {}
          : pressed
            ? { scale: 1, rotate: 0 }
            : { scale: 1, rotate: 0 }
      }
    >
      {title ? <title>{title}</title> : null}

      {/* Outer scalloped wax rim */}
      <Scallop filled={isFilled} />

      {/* Inner ring */}
      <circle
        cx="50"
        cy="50"
        r="30"
        fill="none"
        stroke={isFilled ? "color-mix(in srgb, white 18%, transparent)" : "var(--accent)"}
        strokeOpacity={isFilled ? 1 : 0.5}
        strokeWidth="1.5"
      />

      {/* Monogram: a stylized sigil mark */}
      <Monogram filled={isFilled} />
    </motion.svg>
  );
}

function Scallop({ filled }: { filled: boolean }) {
  // 24 small bumps approximated by a dashed thick ring for a wax rim feel.
  const teeth = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    const r = 44;
    const cx = 50 + Math.cos(a) * r;
    const cy = 50 + Math.sin(a) * r;
    return <circle key={i} cx={cx} cy={cy} r={3.2} />;
  });

  if (filled) {
    return (
      <g>
        <g fill="var(--accent)">{teeth}</g>
        <circle cx="50" cy="50" r="44" fill="var(--accent)" />
        {/* soft inner emboss using transform/opacity only via overlay shapes */}
        <circle
          cx="50"
          cy="46"
          r="40"
          fill="color-mix(in srgb, white 10%, transparent)"
        />
        <circle
          cx="50"
          cy="56"
          r="40"
          fill="color-mix(in srgb, black 12%, transparent)"
        />
        <circle cx="50" cy="50" r="38" fill="var(--accent)" />
      </g>
    );
  }

  return (
    <g
      fill="none"
      stroke="var(--accent)"
      strokeWidth="1.5"
      strokeOpacity="0.85"
    >
      <g fill="var(--accent)" fillOpacity="0.9" stroke="none">
        {teeth}
      </g>
      <circle cx="50" cy="50" r="44" />
      <circle cx="50" cy="50" r="38" />
    </g>
  );
}

function Monogram({ filled }: { filled: boolean }) {
  const stroke = filled
    ? "color-mix(in srgb, white 82%, transparent)"
    : "var(--accent)";
  return (
    <g
      fill="none"
      stroke={stroke}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* An S serpentine, the sigil stroke */}
      <path d="M61 38 C61 31 39 31 39 41 C39 51 61 49 61 59 C61 69 39 69 39 62" />
      {/* A vertical pen axis through it */}
      <path d="M50 30 L50 70" strokeOpacity={filled ? 0.5 : 0.4} />
    </g>
  );
}
