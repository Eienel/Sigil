"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  ConnectButton,
  useCurrentAccount,
  useSignTransaction,
  useDisconnectWallet,
} from "@mysten/dapp-kit";
import {
  UploadSimple,
  File as FileIcon,
  Feather,
  ArrowClockwise,
  Warning,
  SignOut,
  DownloadSimple,
} from "@phosphor-icons/react";
import QRCode from "qrcode";
import { WaxSeal } from "./wax-seal";
import { Button, ButtonLink } from "./button";
import { CopyButton } from "./copy-button";
import { PROVENANCE_LABEL, type ProvenanceType } from "@/lib/sigil";

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };

type Stage = "idle" | "preparing" | "awaitingSignature" | "submitting" | "done";

type Certificate = {
  digest: string;
  objectId: string | null;
  blobId: string;
  sha256: string;
  provenanceType: ProvenanceType;
  label: string;
  fileName: string;
};

const PROV_OPTIONS: ProvenanceType[] = [0, 1, 2];

export function SignFlow() {
  const account = useCurrentAccount();
  const { mutateAsync: signTransaction } = useSignTransaction();
  const { mutate: disconnect } = useDisconnectWallet();
  const reduce = useReducedMotion();

  const [file, setFile] = useState<File | null>(null);
  const [provenanceType, setProvenanceType] = useState<ProvenanceType>(0);
  const [label, setLabel] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [cert, setCert] = useState<Certificate | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const busy =
    stage === "preparing" || stage === "awaitingSignature" || stage === "submitting";

  const onPick = useCallback((f: File | null) => {
    setError(null);
    setFile(f);
  }, []);

  async function sign() {
    if (!file || !account) return;
    setError(null);
    try {
      // 1) Store on Walrus and build the tx (gas resolved via Tatum) server side.
      setStage("preparing");
      const form = new FormData();
      form.set("file", file);
      form.set("sender", account.address);
      form.set("provenanceType", String(provenanceType));
      form.set("label", label);
      const prepRes = await fetch("/api/store-and-prepare", {
        method: "POST",
        body: form,
      });
      const prep = await prepRes.json();
      if (!prepRes.ok) throw new Error(prep.error ?? "Could not prepare the attestation.");

      // 2) Wallet signs the exact bytes we built.
      setStage("awaitingSignature");
      const { signature } = await signTransaction({
        transaction: prep.txBytes,
        chain: `sui:${process.env.NEXT_PUBLIC_SUI_NETWORK ?? "testnet"}`,
      });

      // 3) Submit the signed tx through Tatum and wait for it to land.
      setStage("submitting");
      const subRes = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txBytes: prep.txBytes, signature }),
      });
      const sub = await subRes.json();
      if (!subRes.ok) throw new Error(sub.error ?? "Could not submit the transaction.");

      setCert({
        digest: sub.digest,
        objectId: sub.objectId,
        blobId: prep.blobId,
        sha256: prep.sha256,
        provenanceType,
        label,
        fileName: prep.fileName,
      });
      setStage("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStage("idle");
    }
  }

  function reset() {
    setFile(null);
    setLabel("");
    setProvenanceType(0);
    setCert(null);
    setError(null);
    setStage("idle");
  }

  if (!account) {
    return (
      <div className="rounded-2xl border border-hairline bg-surface p-8 text-center">
        <div className="mx-auto mb-4 w-fit opacity-90">
          <WaxSeal size={56} />
        </div>
        <h2 className="text-lg font-medium text-ink">Connect a wallet to sign</h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
          Your wallet signs the attestation. The transaction is submitted to Sui
          through Tatum.
        </p>
        <div className="mt-5 flex justify-center [&_button]:rounded-full">
          <ConnectButton connectText="Connect wallet" />
        </div>
      </div>
    );
  }

  if (stage === "done" && cert) {
    return <CertificateView cert={cert} onReset={reset} reduce={!!reduce} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-xl border border-hairline bg-surface px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted">Connected</span>
          <span className="font-mono text-xs text-ink">
            {account.address.slice(0, 6)}...{account.address.slice(-4)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => disconnect()}
          disabled={busy}
          className="group flex items-center gap-1.5 font-mono text-xs text-muted transition-colors hover:text-wax disabled:opacity-50"
        >
          <SignOut size={14} weight="regular" />
          Disconnect
        </button>
      </div>

      {/* Dropzone */}
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
          onPick(e.dataTransfer.files?.[0] ?? null);
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
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <span className="flex items-center gap-2 text-sm text-ink">
            <FileIcon size={18} weight="regular" />
            {file.name}
            <span className="text-muted">
              ({(file.size / 1024).toFixed(1)} KB)
            </span>
          </span>
        ) : (
          <>
            <UploadSimple size={24} weight="regular" className="mb-2 text-muted" />
            <span className="text-sm text-ink">Drop a file or click to choose</span>
            <span className="mt-1 text-xs text-muted">Up to 10 MiB</span>
          </>
        )}
      </button>

      {/* Provenance selector */}
      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">
          How was it made
        </p>
        <div className="grid grid-cols-3 gap-2">
          {PROV_OPTIONS.map((p) => {
            const active = provenanceType === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setProvenanceType(p)}
                disabled={busy}
                className={`relative rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "border-wax text-ink"
                    : "border-hairline text-muted hover:text-ink"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="prov-indicator"
                    className="absolute inset-0 rounded-xl bg-paper"
                    transition={SPRING}
                  />
                )}
                <span className="relative">{PROVENANCE_LABEL[p]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Optional label */}
      <div>
        <label
          htmlFor="label"
          className="mb-2 block font-mono text-xs uppercase tracking-wide text-muted"
        >
          Label, optional
        </label>
        <input
          id="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          disabled={busy}
          maxLength={200}
          placeholder="A short note about this work"
          className="w-full rounded-xl border border-hairline bg-surface px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-wax"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-hairline bg-paper px-3.5 py-3 text-sm text-wax">
          <Warning size={18} weight="regular" className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button type="button" onClick={sign} disabled={!file || busy} size="lg" full>
        <Feather size={16} weight="regular" />
        {stage === "preparing"
          ? "Storing on Walrus"
          : stage === "awaitingSignature"
            ? "Approve in your wallet"
            : stage === "submitting"
              ? "Submitting through Tatum"
              : "Press seal and sign"}
      </Button>
    </div>
  );
}

function CertificateView({
  cert,
  onReset,
  reduce,
}: {
  cert: Certificate;
  onReset: () => void;
  reduce: boolean;
}) {
  const network = process.env.NEXT_PUBLIC_SUI_NETWORK ?? "testnet";
  const txUrl = `https://suiscan.xyz/${network}/tx/${cert.digest}`;
  const verifyUrl = cert.objectId ? `/verify?id=${cert.objectId}` : "/verify";

  // QR of the absolute verify URL, so anyone can scan the certificate to check
  // its provenance. Built client side once the cert lands.
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    if (!cert.objectId || typeof window === "undefined") return;
    const abs = `${window.location.origin}/verify?id=${cert.objectId}`;
    QRCode.toDataURL(abs, {
      margin: 0,
      width: 240,
      color: { dark: "#15120e", light: "#00000000" },
    })
      .then(setQr)
      .catch(() => setQr(null));
  }, [cert.objectId]);

  // Download the certificate as a PNG generated server side.
  const downloadHref = `/api/cert-image?${new URLSearchParams({
    file: cert.fileName,
    sha256: cert.sha256,
    blob: cert.blobId,
    object: cert.objectId ?? "",
    digest: cert.digest,
    prov: String(cert.provenanceType),
    label: cert.label,
  }).toString()}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
      className="overflow-hidden rounded-2xl border border-hairline bg-surface"
    >
      <div className="flex flex-col items-center border-b border-hairline px-6 py-8">
        <motion.div
          initial={reduce ? { opacity: 0 } : { scale: 0.4, rotate: -20, opacity: 0 }}
          animate={reduce ? { opacity: 1 } : { scale: 1, rotate: -6, opacity: 1 }}
          transition={reduce ? { duration: 0 } : { ...SPRING, stiffness: 120 }}
        >
          <WaxSeal
            size={72}
            variant={
              cert.provenanceType === 0
                ? "filled"
                : cert.provenanceType === 2
                  ? "assisted"
                  : "engraved"
            }
          />
        </motion.div>
        <h2 className="mt-4 text-lg font-semibold text-ink">Sealed</h2>
        <p className="mt-1 text-sm text-muted">
          {PROVENANCE_LABEL[cert.provenanceType]}
          {cert.label ? ` , ${cert.label}` : ""}
        </p>

        {qr && (
          <div className="mt-5 flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="Scan to verify" width={96} height={96} />
            <span className="mt-2 font-mono text-[11px] uppercase tracking-wide text-muted">
              Scan to verify
            </span>
          </div>
        )}
      </div>

      <dl className="divide-y divide-hairline">
        <CertRow label="File" value={cert.fileName} />
        <CertRow label="sha256" value={cert.sha256} mono />
        <CertRow label="Walrus blob" value={cert.blobId} mono />
        {cert.objectId && (
          <CertRow label="Sigil ID" value={cert.objectId} mono />
        )}
        <CertRow label="Tx digest" value={cert.digest} mono />
      </dl>

      <div className="flex flex-col gap-2 p-4 sm:flex-row">
        <ButtonLink href={verifyUrl} variant="secondary" className="flex-1">
          Verify this
        </ButtonLink>
        <ButtonLink
          href={txUrl}
          external
          target="_blank"
          rel="noreferrer"
          variant="secondary"
          className="flex-1"
        >
          View transaction
        </ButtonLink>
        <a
          href={downloadHref}
          download={`sigil-${(cert.objectId ?? cert.digest).slice(0, 10)}.png`}
          className="inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          <DownloadSimple size={15} weight="regular" />
          Download
        </a>
        <Button type="button" onClick={onReset} variant="ghost">
          <ArrowClockwise size={15} weight="regular" />
          Sign another
        </Button>
      </div>
    </motion.div>
  );
}

function CertRow({
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
      <dt className="shrink-0 font-mono text-[11px] uppercase tracking-wide text-muted sm:w-24">
        {label}
      </dt>
      <dd className={`flex min-w-0 items-start gap-2 text-sm text-ink ${mono ? "font-mono" : ""}`}>
        <span className="min-w-0 break-all">{value}</span>
        {mono && <CopyButton value={value} className="mt-0.5" />}
      </dd>
    </div>
  );
}
