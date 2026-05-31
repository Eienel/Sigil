"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Feather, SealCheck, ArrowClockwise } from "@phosphor-icons/react";
import { WaxSeal } from "./wax-seal";
import { Button } from "./button";

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };
const SAMPLE = "I made this. Stamped on Sui, stored on Walrus.";

type Stage = "idle" | "signing" | "signed" | "verifying" | "verified";

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function InlineDemo() {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState<Stage>("idle");
  const [hash, setHash] = useState<string>("");
  const [pressed, setPressed] = useState(false);

  const sigilId =
    hash &&
    `0x${hash.slice(0, 6)}...${hash.slice(-4)}`;

  async function sign() {
    setStage("signing");
    const h = await sha256Hex(SAMPLE);
    setHash(h);
    setPressed(true);
    await wait(reduce ? 0 : 520);
    setStage("signed");
  }

  async function verify() {
    setStage("verifying");
    await wait(reduce ? 0 : 700);
    setStage("verified");
  }

  function reset() {
    setStage("idle");
    setHash("");
    setPressed(false);
  }

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5 shadow-[0_1px_0_rgba(0,0,0,0.02)] sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wider text-muted">
          Live demo
        </span>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink"
          aria-label="Reset demo"
        >
          <ArrowClockwise size={14} weight="regular" />
          Reset
        </button>
      </div>

      {/* The sample content card */}
      <div className="relative overflow-hidden rounded-xl border border-hairline bg-paper p-4">
        <p className="pr-16 text-[15px] leading-relaxed text-ink">{SAMPLE}</p>

        {/* The pressed seal sits in the corner of the content */}
        <div className="absolute right-3 top-3">
          <motion.div
            initial={false}
            animate={
              reduce
                ? { opacity: pressed ? 1 : 0.15 }
                : {
                    scale: pressed ? 1 : 0.6,
                    opacity: pressed ? 1 : 0.12,
                    rotate: pressed ? -6 : -20,
                  }
            }
            transition={SPRING}
          >
            <WaxSeal size={44} />
          </motion.div>
        </div>

        <AnimatePresence>
          {hash && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={SPRING}
              className="mt-3 border-t border-hairline pt-3"
            >
              <Row label="sha256" value={hash} mono truncate />
              {stage !== "signing" && sigilId && (
                <Row label="Sigil ID" value={sigilId} mono />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Verify check, SVG line draw */}
      <AnimatePresence>
        {(stage === "verifying" || stage === "verified") && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={SPRING}
            className="mt-3 flex items-center gap-3 overflow-hidden rounded-xl border border-hairline bg-paper p-4"
          >
            <CheckDraw drawn={stage === "verified"} reduce={!!reduce} />
            <div>
              <p
                className="text-sm font-medium"
                style={{
                  color:
                    stage === "verified" ? "var(--verified)" : "var(--muted)",
                }}
              >
                {stage === "verified" ? "Authentic" : "Recomputing sha256"}
              </p>
              <p className="text-xs text-muted">
                {stage === "verified"
                  ? "On chain hash matches the content."
                  : "Comparing against the on chain record."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="mt-4 flex gap-2">
        <Button
          onClick={sign}
          disabled={stage === "signing" || stage !== "idle"}
          full
        >
          <Feather size={16} weight="regular" />
          {stage === "signing" ? "Pressing seal" : "Sign sample"}
        </Button>
        <Button
          onClick={verify}
          disabled={stage !== "signed"}
          variant="secondary"
          full
        >
          <SealCheck size={16} weight="regular" />
          {stage === "verifying" ? "Verifying" : "Verify"}
        </Button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  truncate,
}: {
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-3 py-0.5">
      <span className="w-16 shrink-0 font-mono text-[11px] uppercase tracking-wide text-muted">
        {label}
      </span>
      <span
        className={`text-xs text-ink ${mono ? "font-mono" : ""} ${
          truncate ? "truncate" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function CheckDraw({ drawn, reduce }: { drawn: boolean; reduce: boolean }) {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden>
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
        animate={{ pathLength: drawn ? 1 : 0 }}
        transition={reduce ? { duration: 0 } : { duration: 0.5, ease: "easeOut" }}
      />
    </svg>
  );
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
