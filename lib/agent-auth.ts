/**
 * Agent authentication for the agent sign flow.
 *
 * Each agent API key maps to one Sui address. In this build we run a single
 * dedicated agent keypair (AGENT_PRIVATE_KEY) behind one API key
 * (AGENT_API_KEY), both server only and never exposed to the browser. The
 * mapping is intentionally small and explicit; a production system would store
 * many keys in a database, but the shape here is the same: key in, address and
 * signer out.
 */
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

export class AgentAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentAuthError";
  }
}

/**
 * Resolve the agent keypair for a presented API key. Throws AgentAuthError if
 * the key is missing or does not match. Returns the keypair and its address.
 */
export function resolveAgent(apiKey: string | null | undefined): {
  keypair: Ed25519Keypair;
  address: string;
} {
  const expected = process.env.AGENT_API_KEY;
  const secret = process.env.AGENT_PRIVATE_KEY;

  if (!expected || !secret) {
    throw new AgentAuthError(
      "Agent signing is not configured on this server."
    );
  }
  if (!apiKey) {
    throw new AgentAuthError("Missing agent API key.");
  }
  // Constant time compare to avoid leaking the key by timing.
  if (!timingSafeEqual(apiKey, expected)) {
    throw new AgentAuthError("Invalid agent API key.");
  }

  const keypair = Ed25519Keypair.fromSecretKey(secret);
  return { keypair, address: keypair.getPublicKey().toSuiAddress() };
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
