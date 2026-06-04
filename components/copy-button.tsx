"use client";

import { useState } from "react";
import { Copy, Check } from "@phosphor-icons/react";

/*
  Small inline copy-to-clipboard control. Shows a check for a moment after a
  successful copy. Used next to hashes, blob ids, and Sigil ids.
*/
export function CopyButton({
  value,
  label = "Copy",
  className = "",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard can be blocked; fail quietly.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`${label} ${value.slice(0, 8)}`}
      className={`shrink-0 text-muted transition-colors hover:text-ink ${className}`}
    >
      {copied ? (
        <Check size={14} weight="regular" className="text-[var(--verified)]" />
      ) : (
        <Copy size={14} weight="regular" />
      )}
    </button>
  );
}
