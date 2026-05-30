"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  UploadSimple,
  File as FileIcon,
  SealCheck,
  Warning,
  Question,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { PROVENANCE_LABEL, type ProvenanceType } from "@/lib/sigil";

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };

type Verdict = "authentic" | "tampered" | "not_found";

type Attestation = {
  objectId: string;
  signer: string;
  walrusBlobId: string;
  sha256Hex: string;
  provenanceType: number;
  timestampMs: number;
  label: string;
};

type Result = {
  verdict: Verdict;
  hashMatch: boolean | null;
  submittedHash: string | null;
  blobAvailable: boolean;
  attestation: Attestation;
};

export function VerifyFlow() {
  const params = useSearchParams();
  const [sigilId, setSigilId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | "not_found" | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const runVerify = useCallback(async (opts: { id?: string; file?: File }) => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      if (opts.id) form.set("sigilId", opts.id);
      if (opts.file) form.set("file", opts.file);
      const res = await fetch("/api/verify", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Verification failed.");
      if (data.verdict === "not_found") setResult("not_found");
      else setResult(data as Result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }, []);

  // Deep link from the certificate: /verify?id=0x...
  useEffect(() => {
    const id = params.get("id");
    if (id) {
      setSigilId(id);
      runVerify({ id });
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      {/* File dropzone */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0] ?? null;
          setFile(f);
          if (f) runVerify({ file: f, id: sigilId || undefined });
        }}
        disabled={busy}
        className={`flex w-full flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 transition-colors ${
          dragOver ? "border-wax bg-paper" : "border-hairline bg-surface"
        } ${busy ? "opacity-60" : "hover:border-wax"}`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            if (f) runVerify({ file: f, id: sigilId || undefined });
          }}
        />
        {file ? (
          <span className="flex items-center gap-2 text-sm text-ink">
            <FileIcon size={18} weight="regular" />
            {file.name}
          </span>
        ) : (
          <>
            <UploadSimple size={24} weight="regular" className="mb-2 text-muted" />
            <span className="text-sm text-ink">Drop a file to verify</span>
            <span className="mt-1 text-xs text-muted">
              We recompute sha256 and compare on chain
            </span>
          </>
        )}
      </button>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-hairline" />
        <span className="font-mono text-[11px] uppercase tracking-wide text-muted">
          or
        </span>
        <span className="h-px flex-1 bg-hairline" />
      </div>

      {/* Sigil ID lookup */}
      <div className="flex gap-2">
        <input
          value={sigilId}
          onChange={(e) => setSigilId(e.target.value.trim())}
          placeholder="Paste a Sigil ID, 0x..."
          disabled={busy}
          className="min-w-0 flex-1 rounded-xl border border-hairline bg-surface px-3.5 py-2.5 font-mono text-sm text-ink outline-none placeholder:font-sans placeholder:text-muted focus:border-wax"
        />
        <button
          type="button"
          onClick={() => sigilId && runVerify({ id: sigilId })}
          disabled={busy || !sigilId}
          className="flex items-center gap-2 rounded-xl bg-wax px-4 py-2.5 text-sm font-medium transition-transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
          style={{ color: "var(--bg)" }}
        >
          <MagnifyingGlass size={16} weight="regular" />
          Look up
        </button>
      </div>

      {busy && <Skeleton />}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-hairline bg-paper px-3.5 py-3 text-sm text-wax">
          <Warning size={18} weight="regular" className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {result === "not_found" && <NotFound key="nf" />}
        {result && result !== "not_found" && (
          <ResultCard key="res" result={result} />
        )}
      </AnimatePresence>
    </div>
  );
}

function ResultCard({ result }: { result: Result }) {
  const reduce = useReducedMotion();
  const { verdict, attestation: a, blobAvailable, hashMatch } = result;
  const authentic = verdict === "authentic";
  const network = process.env.NEXT_PUBLIC_SUI_NETWORK ?? "testnet";
  const objUrl = `https://suiscan.xyz/${network}/object/${a.objectId}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={SPRING}
      className="overflow-hidden rounded-2xl border border-hairline bg-surface"
    >
      <div
        className="flex items-center gap-3 border-b border-hairline px-5 py-5"
        style={{
          color: authentic ? "var(--verified)" : "var(--accent)",
        }}
      >
        {authentic ? (
          <CheckDraw reduce={!!reduce} />
        ) : (
          <Warning size={32} weight="regular" />
        )}
        <div>
          <p className="text-lg font-semibold">
            {authentic ? "Authentic" : "Tampered"}
          </p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {authentic
              ? hashMatch === null
                ? "Record found on chain. Drop the file to compare its hash."
                : "The file hash matches the record on Sui."
              : "The file hash does not match the record on Sui."}
          </p>
        </div>
      </div>

      <dl className="divide-y divide-hairline">
        <Row label="Signer" value={a.signer} mono />
        <Row label="Provenance" value={PROVENANCE_LABEL[a.provenanceType as ProvenanceType] ?? String(a.provenanceType)} />
        <Row label="Time" value={new Date(a.timestampMs).toUTCString()} />
        {a.label && <Row label="Label" value={a.label} />}
        <Row label="On chain sha256" value={a.sha256Hex} mono />
        {result.submittedHash && (
          <Row label="Your file sha256" value={result.submittedHash} mono />
        )}
        <Row
          label="Walrus blob"
          value={`${a.walrusBlobId} ${blobAvailable ? "(retrievable)" : "(not retrievable)"}`}
          mono
        />
        <Row label="Sigil ID" value={a.objectId} mono />
      </dl>

      <div className="p-4">
        <a
          href={objUrl}
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-center rounded-full border border-hairline bg-surface px-4 py-2.5 text-sm font-medium text-ink transition-transform hover:scale-[1.005] active:scale-[0.99]"
        >
          View on chain
        </a>
      </div>
    </motion.div>
  );
}

function NotFound() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={SPRING}
      className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface px-5 py-6 text-muted"
    >
      <Question size={28} weight="regular" />
      <div>
        <p className="text-base font-medium text-ink">Not found</p>
        <p className="text-sm">
          No attestation matches this. The file may never have been sealed, or
          the Sigil ID is wrong.
        </p>
      </div>
    </motion.div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-3 sm:px-5">
      <dt className="shrink-0 font-mono text-[11px] uppercase tracking-wide text-muted sm:w-32">
        {label}
      </dt>
      <dd className={`min-w-0 break-all text-sm text-ink ${mono ? "font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2 rounded-2xl border border-hairline bg-surface p-5">
      <div className="h-5 w-32 animate-pulse rounded bg-paper" />
      <div className="h-3 w-full animate-pulse rounded bg-paper" />
      <div className="h-3 w-3/4 animate-pulse rounded bg-paper" />
    </div>
  );
}

function CheckDraw({ reduce }: { reduce: boolean }) {
  return (
    <svg width="32" height="32" viewBox="0 0 36 36" aria-hidden>
      <circle
        cx="18"
        cy="18"
        r="16"
        fill="none"
        stroke="var(--verified)"
        strokeWidth="1.5"
        strokeOpacity="0.3"
      />
      <motion.path
        d="M11 18.5 L16 23.5 L25.5 13"
        fill="none"
        stroke="var(--verified)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={reduce ? { duration: 0 } : { duration: 0.5, ease: "easeOut" }}
      />
    </svg>
  );
}
