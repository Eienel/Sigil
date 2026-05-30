"use client";

import Link from "next/link";
import { forwardRef } from "react";

/*
  Sigil button. The hover effect is a wax fill that wipes up from the bottom,
  plus a small lift, so the control feels alive rather than binary. The fill is
  a layer scaled on the Y axis (transform only), under the label. Honors the
  design system: transform and opacity only, spring-like easing in CSS.

  Variants:
    primary    solid wax, fill darkens on hover
    secondary  hairline outline on surface, wax fills in on hover, label flips
    ghost      text only, paper fills in on hover
*/

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, string> = {
  // min touch target 44px tall for md/lg, comfortable on mobile
  sm: "h-9 px-3.5 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

function classesFor(variant: Variant, size: Size, full?: boolean) {
  const base =
    "group relative inline-flex items-center justify-center overflow-hidden rounded-full font-medium select-none " +
    "transition-transform duration-200 ease-out will-change-transform " +
    "hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
    "disabled:pointer-events-none disabled:opacity-50";
  const ring = "focus-visible:ring-wax focus-visible:ring-offset-paper";
  const variantCls =
    variant === "primary"
      ? "bg-wax"
      : variant === "secondary"
        ? "border border-hairline bg-surface text-ink"
        : "text-ink";
  return [base, ring, variantCls, SIZES[size], full ? "w-full" : ""].join(" ");
}

// The wipe layer + label, shared by button and link.
function Inner({
  variant,
  children,
}: {
  variant: Variant;
  children: React.ReactNode;
}) {
  // Fill color that wipes in on hover.
  const fill =
    variant === "primary"
      ? "color-mix(in srgb, black 16%, var(--accent))"
      : variant === "secondary"
        ? "var(--accent)"
        : "var(--surface)";
  // Label color: primary keeps paper text; secondary flips to paper on hover.
  const labelColor =
    variant === "primary" ? "var(--bg)" : undefined;

  return (
    <>
      <span
        aria-hidden
        className="absolute inset-0 origin-bottom scale-y-0 rounded-full transition-transform duration-300 ease-out group-hover:scale-y-100"
        style={{ backgroundColor: fill }}
      />
      <span
        className={
          "relative z-10 inline-flex items-center justify-center gap-2 " +
          (variant === "secondary"
            ? "transition-colors duration-200 group-hover:text-paper"
            : "")
        }
        style={{ color: labelColor }}
      >
        {children}
      </span>
    </>
  );
}

export type ButtonProps = {
  variant?: Variant;
  size?: Size;
  full?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", full, className, children, ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        className={`${classesFor(variant, size, full)} ${className ?? ""}`}
        {...props}
      >
        <Inner variant={variant}>{children}</Inner>
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
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  full,
  external,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  const cls = `${classesFor(variant, size, full)} ${className ?? ""}`;
  if (external) {
    return (
      <a href={href} className={cls} {...props}>
        <Inner variant={variant}>{children}</Inner>
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...props}>
      <Inner variant={variant}>{children}</Inner>
    </Link>
  );
}
