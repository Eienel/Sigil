/**
 * Agent authentication for the agent sign flow.
 *
 * Model: shared signer, many keys. Anyone can mint an API key, but every key
 * signs from the one funded agent address (AGENT_PRIVATE_KEY), so we only fund
 * a single address while the platform still behaves as multi tenant. Each key
 * carries a label that is recorded on the attestation, so signers stay
 * distinguishable in the registry.
 *
 * Keys are stateless. We have no database and serverless instances are
 * ephemeral, so a key is a self describing token signed with an HMAC secret:
 *
 *   sk_sigil_<base64url(payload)>_<base64url(hmac)>
 *
 * The payload encodes { label, issuedAt }. We verify a key by recomputing the
 * HMAC, no storage required. The legacy single demo key (AGENT_API_KEY) is
 * still accepted for backwards compatibility.
 */
import { createHmac, timingSafeEqual as nodeTimingSafeEqual } from "node:crypto";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

export class AgentAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentAuthError";
  }
}

const PREFIX = "sk_sigil_";

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function getHmacSecret(): string {
  // Falls back to the agent private key so there is always a server side
  // secret; set AGENT_KEY_SECRET to rotate independently.
  const s = process.env.AGENT_KEY_SECRET || process.env.AGENT_PRIVATE_KEY;
  if (!s) {
    throw new AgentAuthError("Agent key issuance is not configured.");
  }
  return s;
}

function sign(payloadB64: string): string {
  return b64url(createHmac("sha256", getHmacSecret()).update(payloadB64).digest());
}

export type AgentKeyInfo = { label: string; issuedAt: number };

/** Mint a new stateless agent API key carrying a label. */
export function issueAgentKey(label: string): string {
  const clean = (label || "agent").slice(0, 40).replace(/[^\w .\-]/g, "");
  const payload: AgentKeyInfo = { label: clean, issuedAt: Date.now() };
  const payloadB64 = b64url(Buffer.from(JSON.stringify(payload)));
  // Delimit payload and signature with a dot, which never appears in base64url.
  return `${PREFIX}${payloadB64}.${sign(payloadB64)}`;
}

/** Verify a minted key and return its info, or null if it is not one of ours. */
function verifyMintedKey(apiKey: string): AgentKeyInfo | null {
  if (!apiKey.startsWith(PREFIX)) return null;
  const rest = apiKey.slice(PREFIX.length);
  const sep = rest.indexOf(".");
  if (sep <= 0) return null;
  const payloadB64 = rest.slice(0, sep);
  const sig = rest.slice(sep + 1);
  const expected = sign(payloadB64);
  // Constant time compare of equal length buffers.
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !nodeTimingSafeEqual(a, b)) return null;
  try {
    const info = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    ) as AgentKeyInfo;
    if (typeof info.label !== "string") return null;
    return info;
  } catch {
    return null;
  }
}

export type ResolvedAgent = {
  keypair: Ed25519Keypair;
  address: string;
  keyLabel: string | null;
};

/**
 * Resolve the signing keypair for a presented API key. Accepts any key we
 * minted (verified by HMAC) and the legacy demo key. All keys map to the one
 * funded agent address; the key label is returned so it can be recorded.
 */
export function resolveAgent(apiKey: string | null | undefined): ResolvedAgent {
  const secret = process.env.AGENT_PRIVATE_KEY;
  if (!secret) {
    throw new AgentAuthError("Agent signing is not configured on this server.");
  }
  if (!apiKey) {
    throw new AgentAuthError("Missing agent API key.");
  }

  let keyLabel: string | null = null;

  const minted = verifyMintedKey(apiKey);
  if (minted) {
    keyLabel = minted.label;
  } else {
    // Legacy single demo key.
    const legacy = process.env.AGENT_API_KEY;
    if (!legacy || !constantTimeEqual(apiKey, legacy)) {
      throw new AgentAuthError("Invalid agent API key.");
    }
  }

  const keypair = Ed25519Keypair.fromSecretKey(secret);
  return { keypair, address: keypair.getPublicKey().toSuiAddress(), keyLabel };
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return nodeTimingSafeEqual(ab, bb);
}
