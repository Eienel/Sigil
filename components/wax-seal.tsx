"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";

type Variant = "filled" | "engraved" | "assisted";

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };

/*
  The Sigil signet. A wax seal stamped with a monogram.
  filled    -> human made, solid wax
  engraved  -> AI generated, outline only, same accent
  assisted  -> AI assisted, split diagonally: solid wax on one half,
               engraved outline on the other, so it reads as both at once.
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
  const uid = useId().replace(/:/g, "");
  const isFilled = variant === "filled";
  const isAssisted = variant === "assisted";

  const label =
    title ??
    (variant === "filled"
      ? "Human wax seal"
      : variant === "assisted"
        ? "AI assisted wax seal"
        : "Agent wax seal");

  // Diagonal split: lower-left triangle is filled, upper-right is engraved.
  const lowerLeftClip = `${uid}-ll`;
  const upperRightClip = `${uid}-ur`;

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={label}
      initial={false}
      animate={reduce ? {} : pressed ? { scale: 1, rotate: 0 } : { scale: 1, rotate: 0 }}
    >
      {title ? <title>{title}</title> : null}

      {isAssisted ? (
        <>
          <defs>
            {/* split along the main diagonal (top-left to bottom-right) */}
            <clipPath id={lowerLeftClip}>
              <polygon points="0,0 0,100 100,100" />
            </clipPath>
            <clipPath id={upperRightClip}>
              <polygon points="0,0 100,0 100,100" />
            </clipPath>
          </defs>

          {/* Filled half (lower-left triangle) */}
          <g clipPath={`url(#${lowerLeftClip})`}>
            <Scallop filled />
            <InnerRing filled />
          </g>
          {/* Engraved half (upper-right triangle) */}
          <g clipPath={`url(#${upperRightClip})`}>
            <Scallop filled={false} />
            <InnerRing filled={false} />
          </g>

          {/* Diagonal seam line */}
          <line
            x1="11"
            y1="11"
            x2="89"
            y2="89"
            stroke="var(--accent)"
            strokeWidth="1.25"
            strokeOpacity="0.55"
          />

          {/* Monogram: split colors per half so it reads on both sides */}
          <g clipPath={`url(#${lowerLeftClip})`}>
            <Monogram filled />
          </g>
          <g clipPath={`url(#${upperRightClip})`}>
            <Monogram filled={false} />
          </g>
        </>
      ) : (
        <>
          <Scallop filled={isFilled} />
          <InnerRing filled={isFilled} />
          <Monogram filled={isFilled} />
        </>
      )}
    </motion.svg>
  );
}

function InnerRing({ filled }: { filled: boolean }) {
  return (
    <circle
      cx="50"
      cy="50"
      r="30"
      fill="none"
      stroke={filled ? "color-mix(in srgb, white 18%, transparent)" : "var(--accent)"}
      strokeOpacity={filled ? 1 : 0.5}
      strokeWidth="1.5"
    />
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
    <g fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeOpacity="0.85">
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
