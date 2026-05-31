"use client";

import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";

/*
  A small back-to-home control for inner pages. Sits above the page title.
  Underline-wipe on hover to match the nav links.
*/
export function BackHome({ label = "Home" }: { label?: string }) {
  return (
    <Link
      href="/"
      className="group mb-5 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
    >
      <ArrowLeft
        size={15}
        weight="regular"
        className="transition-transform duration-200 group-hover:-translate-x-0.5"
      />
      {label}
    </Link>
  );
}
