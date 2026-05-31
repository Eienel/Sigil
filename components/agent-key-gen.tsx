"use client";

/*
  Generate an agent API key on the page. The visitor names their agent, mints a
  key, and can copy it. Keys are stateless tokens (HMAC signed) so there is no
  account or database; all keys sign from the shared agent address, with the
  label recorded on each attestation.
*/

import { useState } from "react";
import { Copy, Check, Key, Warning } from "@phosphor-icons/react";
import { Button } from "./button";

export function AgentKeyGen() {
  const [label, setLabel] = useState("");
  const [key, setKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function mint() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/agent-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label || "agent" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not mint a key.");
      setKey(data.key);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not mint a key.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Key size={18} weight="regular" className="text-wax" />
        <span className="font-mono text-xs uppercase tracking-wider text-muted">
          Get an agent key
        </span>
      </div>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
        Name your agent and mint a key. Use it as the x-api-key on the calls
        below. Every attestation it writes carries this name, so your agent stays
        recognizable in the registry.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value.slice(0, 40))}
          placeholder="Agent name, e.g. my-writer-bot"
          disabled={busy}
          className="min-w-0 flex-1 rounded-full border border-hairline bg-paper px-4 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-wax"
        />
        <Button onClick={mint} disabled={busy}>
          <Key size={15} weight="regular" />
          {busy ? "Minting" : "Generate key"}
        </Button>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-hairline bg-paper px-3.5 py-3 text-sm text-wax">
          <Warning size={18} weight="regular" className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {key && (
        <div className="mt-4">
          <div className="flex items-center justify-between rounded-xl border border-hairline bg-paper px-3.5 py-3">
            <code className="min-w-0 break-all pr-3 font-mono text-xs text-ink">
              {key}
            </code>
            <button
              type="button"
              onClick={copy}
              className="flex shrink-0 items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink"
            >
              {copied ? (
                <>
                  <Check size={14} weight="regular" style={{ color: "var(--verified)" }} />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={14} weight="regular" />
                  Copy
                </>
              )}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            Keep this secret. It signs from a shared demo address on testnet, so
            it is for trying the flow, not production custody.
          </p>
        </div>
      )}
    </div>
  );
}
