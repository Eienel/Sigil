"use client";

import { Fragment } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  UploadSimple,
  Database,
  Stamp,
  SealCheck,
  ArrowRight,
} from "@phosphor-icons/react";

/*
  How it works. A four step flow shown as a horizontal map on desktop and a
  vertical map on mobile. Transform and opacity only, spring stagger, single
  stroke weight, no gradients. The connector arrows rotate to point down on
  mobile and right on desktop.
*/
const STEPS = [
  {
    icon: UploadSimple,
    label: "Submit content",
    body: "A person signs with a wallet. An agent signs with a key.",
  },
  {
    icon: Database,
    label: "Store on Walrus",
    body: "The file is uploaded to Walrus, which returns a blob ID.",
  },
  {
    icon: Stamp,
    label: "Attest on Sui",
    body: "The sha256, signer, and provenance type are written on chain through Tatum.",
  },
  {
    icon: SealCheck,
    label: "Verify anytime",
    body: "Recompute the sha256 and compare. Authentic, tampered, or not found.",
  },
];

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };

export function FlowMap() {
  const reduce = useReducedMotion();

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-wider text-muted">
        How it works
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        From content to proof
      </h2>

      <ol className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-2">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <Fragment key={step.label}>
              <motion.li
                className="flex flex-1 flex-col rounded-2xl border border-hairline bg-surface p-5"
                initial={reduce ? false : { opacity: 0, y: 14 }}
                whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ ...SPRING, delay: i * 0.08 }}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-hairline text-wax">
                    <Icon size={20} weight="regular" />
                  </span>
                  <span className="font-mono text-xs text-muted">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-medium text-ink">
                  {step.label}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {step.body}
                </p>
              </motion.li>

              {/* Connector arrow: down between stacked cards on mobile, right
                  between cards on desktop. Omitted after the last step. */}
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className="flex shrink-0 items-center justify-center self-center py-1 text-hairline lg:px-0.5 lg:py-0"
                >
                  <ArrowRight
                    size={18}
                    weight="regular"
                    className="rotate-90 lg:rotate-0"
                  />
                </span>
              )}
            </Fragment>
          );
        })}
      </ol>
    </div>
  );
}
