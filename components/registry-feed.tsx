"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowClockwise, Stack } from "@phosphor-icons/react";
import { WaxSeal } from "./wax-seal";
import { ButtonLink } from "./button";
import { PROVENANCE_LABEL, type ProvenanceType } from "@/lib/sigil";

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };

type Item = {
  objectId: string;
  signer: string;
  walrusBlobId: string;
  sha256Hex: string;
  provenanceType: number;
  timestampMs: number;
  label: string;
  txDigest: string;
};

export function RegistryFeed() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(opts: { silent?: boolean } = {}) {
    // Only show the skeleton on the first load; background refreshes are silent
    // so the feed does not flash while polling.
    if (!opts.silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/registry", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load the registry.");
      setItems(data.items as Item[]);
    } catch (e) {
      if (!opts.silent) {
        setError(e instanceof Error ? e.message : "Could not load the registry.");
      }
    } finally {
      if (!opts.silent) setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // Refresh when the tab regains focus or becomes visible, so an attestation
    // created elsewhere (the API, a curl, another tab) shows up on return.
    function onFocus() {
      load({ silent: true });
    }
    function onVisible() {
      if (document.visibilityState === "visible") load({ silent: true });
    }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    // And poll gently while open.
    const interval = setInterval(() => load({ silent: true }), 20000);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wide text-muted">
          {items ? `${items.length} attestations` : "Loading"}
        </span>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink disabled:opacity-50"
        >
          <ArrowClockwise size={14} weight="regular" />
          Refresh
        </button>
      </div>

      {loading && <SkeletonList />}

      {error && !loading && (
        <div className="rounded-xl border border-hairline bg-paper px-4 py-3 text-sm text-wax">
          {error}
        </div>
      )}

      {!loading && items && items.length === 0 && <EmptyState />}

      {!loading &&
        items &&
        items.map((it, i) => <Entry key={it.objectId + i} item={it} index={i} />)}
    </div>
  );
}

function Entry({ item, index }: { item: Item; index: number }) {
  const sealVariant =
    item.provenanceType === 0
      ? "filled"
      : item.provenanceType === 2
        ? "assisted"
        : "engraved";
  const when = item.timestampMs
    ? new Date(item.timestampMs).toUTCString().replace(" GMT", " UTC")
    : "unknown time";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: Math.min(index * 0.03, 0.3) }}
    >
      <Link
        href={`/verify?id=${item.objectId}`}
        className="flex items-start gap-4 rounded-2xl border border-hairline bg-surface p-4 transition-transform hover:scale-[1.005] active:scale-[0.997]"
      >
        <div className="mt-0.5 shrink-0">
          <WaxSeal size={40} variant={sealVariant} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-medium text-ink">
              {PROVENANCE_LABEL[item.provenanceType as ProvenanceType] ??
                "Unknown"}
            </span>
            {item.label && (
              <span className="text-sm text-muted">, {item.label}</span>
            )}
          </div>
          <p className="mt-1 truncate font-mono text-xs text-muted">
            {item.signer}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted">
            <span className="truncate">blob {item.walrusBlobId.slice(0, 10)}...</span>
            <span>{when}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-4 rounded-2xl border border-hairline bg-surface p-4"
        >
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-paper" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-paper" />
            <div className="h-3 w-full animate-pulse rounded bg-paper" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-paper" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-hairline bg-surface px-6 py-12 text-center">
      <Stack size={28} weight="regular" className="mb-3 text-muted" />
      <p className="text-base font-medium text-ink">No attestations yet</p>
      <p className="mt-1 max-w-sm text-sm text-muted">
        Sign something on the app or through the agent API and it will show up
        here.
      </p>
      <ButtonLink href="/app" className="mt-4">
        Sign something
      </ButtonLink>
    </div>
  );
}
