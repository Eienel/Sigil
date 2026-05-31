"use client";

import { useState } from "react";
import { Copy, Check, Terminal } from "@phosphor-icons/react";

const SIGN_CURL = `curl -X POST https://YOUR_APP/api/sign \\
  -H "x-api-key: YOUR_AGENT_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "A report my agent just wrote.",
    "provenanceType": 1,
    "label": "weekly summary"
  }'`;

// Windows PowerShell aliases curl to Invoke-WebRequest, which rejects -X/-H/-d
// and the bash line continuation. Call curl.exe and keep it on one line.
const SIGN_CURL_WIN = `curl.exe -X POST "https://YOUR_APP/api/sign" -H "x-api-key: YOUR_AGENT_KEY" -H "Content-Type: application/json" -d "{\\"content\\":\\"A report my agent just wrote.\\",\\"provenanceType\\":1,\\"label\\":\\"weekly summary\\"}"`;

const SIGN_POWERSHELL = `$body = @{
  content        = "A report my agent just wrote."
  provenanceType = 1
  label          = "weekly summary"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://YOUR_APP/api/sign" \`
  -Method Post \`
  -Headers @{ "x-api-key" = "YOUR_AGENT_KEY" } \`
  -ContentType "application/json" \`
  -Body $body`;

const SIGN_RESPONSE = `{
  "blobId": "xEigi5zMrOOj59HL8upysFsHhrOWFRO3ImjfmZRJ1Pc",
  "sha256": "fddd6cc4...114968c",
  "digest": "8Jk2T3Wt...kmvP",
  "objectId": "0xbf93ae06...874f",
  "signer": "0x9a8215f6...b405d",
  "provenanceType": 1,
  "verifyUrl": "https://YOUR_APP/verify?id=0xbf93ae06...874f"
}`;

const SIGN_FILE = `curl -X POST https://YOUR_APP/api/sign \\
  -H "x-api-key: YOUR_AGENT_KEY" \\
  -F "file=@output.png" \\
  -F "provenanceType=1" \\
  -F "label=generated image"`;

const VERIFY_CURL = `# Verify by Sigil ID
curl -X POST https://YOUR_APP/api/verify \\
  -F "sigilId=0xbf93ae06...874f"

# Or verify a file by recomputing its sha256
curl -X POST https://YOUR_APP/api/verify \\
  -F "file=@output.png"`;

const JS_SNIPPET = `const res = await fetch("https://YOUR_APP/api/sign", {
  method: "POST",
  headers: {
    "x-api-key": process.env.SIGIL_AGENT_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    content: text,
    provenanceType: 1, // 0 human, 1 AI generated, 2 AI assisted
    label: "model output",
  }),
});
const { objectId, verifyUrl } = await res.json();`;

export function AgentDocs() {
  return (
    <div className="space-y-8">
      <Endpoint
        method="POST"
        path="/api/sign"
        desc="Store content on Walrus and write an attestation signed by your agent address. Authenticate with x-api-key or Authorization: Bearer."
      />

      <TabbedBlock
        title="Sign text"
        tabs={[
          { label: "curl", code: SIGN_CURL },
          { label: "Windows curl", code: SIGN_CURL_WIN },
          { label: "PowerShell", code: SIGN_POWERSHELL },
          { label: "JavaScript", code: JS_SNIPPET },
        ]}
      />
      <Block title="Response" code={SIGN_RESPONSE} />
      <Block title="Sign a file" code={SIGN_FILE} />

      <div className="rounded-xl border border-hairline bg-surface p-4">
        <p className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">
          Provenance types
        </p>
        <ul className="space-y-1 text-sm text-ink">
          <li>
            <span className="font-mono text-muted">0</span> Human made
          </li>
          <li>
            <span className="font-mono text-muted">1</span> AI generated
          </li>
          <li>
            <span className="font-mono text-muted">2</span> AI assisted
          </li>
        </ul>
      </div>

      <Endpoint
        method="POST"
        path="/api/verify"
        desc="Check a file or a Sigil ID. Returns authentic, tampered, or not found, with the signer, time, and provenance type."
      />
      <Block title="Verify" code={VERIFY_CURL} />

      <p className="text-sm text-muted">
        Replace YOUR_APP with this deployment origin and YOUR_AGENT_KEY with the
        key issued to your agent. The agent key maps to one Sui address, so every
        attestation it writes is attributable to that signer. On Windows
        PowerShell, use the Windows curl or PowerShell tab, since the plain curl
        examples are written for macOS and Linux.
      </p>
    </div>
  );
}

function Endpoint({
  method,
  path,
  desc,
}: {
  method: string;
  path: string;
  desc: string;
}) {
  return (
    <div className="border-l-2 border-wax pl-4">
      <div className="flex items-center gap-2">
        <span className="rounded bg-wax px-2 py-0.5 font-mono text-xs font-medium" style={{ color: "var(--bg)" }}>
          {method}
        </span>
        <span className="font-mono text-sm text-ink">{path}</span>
      </div>
      <p className="mt-1.5 max-w-prose text-sm text-muted">{desc}</p>
    </div>
  );
}

function Block({ title, code }: { title: string; code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard not available, ignore
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-surface">
      <div className="flex items-center justify-between border-b border-hairline px-4 py-2">
        <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-muted">
          <Terminal size={14} weight="regular" />
          {title}
        </span>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink"
          aria-label={`Copy ${title}`}
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
      <pre className="overflow-x-auto px-4 py-3.5 [-webkit-overflow-scrolling:touch]">
        <code className="font-mono text-xs leading-relaxed text-ink sm:text-[13px]">
          {code}
        </code>
      </pre>
    </div>
  );
}

function TabbedBlock({
  title,
  tabs,
}: {
  title: string;
  tabs: { label: string; code: string }[];
}) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const code = tabs[active].code;

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard not available, ignore
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-surface">
      <div className="flex items-center justify-between border-b border-hairline px-4 py-2">
        <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-muted">
          <Terminal size={14} weight="regular" />
          {title}
        </span>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink"
          aria-label={`Copy ${title}`}
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
      {/* Tab strip */}
      <div className="flex flex-wrap gap-1 border-b border-hairline px-2 py-1.5">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            type="button"
            onClick={() => setActive(i)}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
              i === active
                ? "bg-paper font-medium text-ink"
                : "text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <pre className="overflow-x-auto px-4 py-3.5 [-webkit-overflow-scrolling:touch]">
        <code className="font-mono text-xs leading-relaxed text-ink sm:text-[13px]">
          {code}
        </code>
      </pre>
    </div>
  );
}
