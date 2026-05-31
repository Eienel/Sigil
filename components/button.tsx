"use client";

import Link from "next/link";
import { forwardRef } from "react";

/*
  Sigil button, Slush-style hover.

  On hover two things happen together:
    1. A solid fill grows from the center of the pill (a layer scaled from 0 to
       1 about its center), so the button fills in rather than wiping.
    2. The label swaps with a vertical slide: the resting label slides up and
       out while the hover label slides in from below. If no hoverLabel is
       given, the same label is reused so only the fill plays.

  Transform and opacity only, per the design system. Spring-like easing in CSS.
*/

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, string> = {
  // min touch target ~44px tall for md/lg, comfortable on mobile
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

function classesFor(variant: Variant, size: Size, full?: boolean) {
  const base =
    "group relative inline-flex items-center justify-center overflow-hidden rounded-full font-medium select-none " +
    "transition-transform duration-200 ease-out will-change-transform " +
    "hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
    "focus-visible:ring-wax focus-visible:ring-offset-paper " +
    "disabled:pointer-events-none disabled:opacity-50";
  const variantCls =
    variant === "primary"
      ? "bg-wax"
      : variant === "secondary"
        ? "border border-hairline bg-surface text-ink"
        : "text-ink";
  return [base, variantCls, SIZES[size], full ? "w-full" : ""].join(" ");
}

function Inner({
  variant,
  children,
  hoverLabel,
}: {
  variant: Variant;
  children: React.ReactNode;
  hoverLabel?: React.ReactNode;
}) {
  // Fill color that grows in on hover.
  const fill =
    variant === "primary"
      ? "color-mix(in srgb, black 16%, var(--accent))"
      : variant === "secondary"
        ? "var(--accent)"
        : "var(--surface)";
  // Resting label color (primary keeps paper text on wax).
  const restColor = variant === "primary" ? "var(--bg)" : undefined;
  // Hover label color: secondary flips to paper over the wax fill.
  const hoverColor =
    variant === "primary"
      ? "var(--bg)"
      : variant === "secondary"
        ? "var(--bg)"
        : undefined;

  const swap = hoverLabel ?? children;

  return (
    <>
      {/* Fill grows from the center */}
      <span
        aria-hidden
        className="absolute inset-0 origin-center scale-0 rounded-full transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-100"
        style={{ backgroundColor: fill }}
      />
      {/* Label stack: rest label slides up and out, hover label slides in */}
      <span className="relative z-10 inline-grid">
        <span
          className="col-start-1 row-start-1 inline-flex items-center justify-center gap-2 transition-all duration-200 ease-out group-hover:-translate-y-[140%] group-hover:opacity-0"
          style={{ color: restColor }}
        >
          {children}
        </span>
        <span
          aria-hidden
          className="col-start-1 row-start-1 inline-flex translate-y-[140%] items-center justify-center gap-2 opacity-0 transition-all duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100"
          style={{ color: hoverColor }}
        >
          {swap}
        </span>
      </span>
    </>
  );
}

export type ButtonProps = {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  hoverLabel?: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      full,
      hoverLabel,
      className,
      children,
      ...props
    },
    ref
  ) {
    return (
      <button
        ref={ref}
        className={`${classesFor(variant, size, full)} ${className ?? ""}`}
        {...props}
      >
        <Inner variant={variant} hoverLabel={hoverLabel}>
          {children}
        </Inner>
      </button>
    );
  }
);

export type ButtonLinkProps = {
  href: string;
  variant?: Variant;
  size?: Size;
  full?: boolean;
  external?: boolean;
  hoverLabel?: React.ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  full,
  external,
  hoverLabel,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  const cls = `${classesFor(variant, size, full)} ${className ?? ""}`;
  const inner = (
    <Inner variant={variant} hoverLabel={hoverLabel}>
      {children}
    </Inner>
  );
  if (external) {
    return (
      <a href={href} className={cls} {...props}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...props}>
      {inner}
    </Link>
  );
}
