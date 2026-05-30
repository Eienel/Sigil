/**
 * Tatum Sui RPC client. EVERY on chain read and transaction submission in
 * Sigil goes through Tatum, never a direct fullnode. This is a deliberate
 * architecture choice for the hackathon (Best Use of Tatum Tools) and is the
 * single chokepoint for all Sui JSON-RPC traffic.
 *
 * Auth: the Tatum API key is sent in the `x-api-key` header.
 * Gateways:
 *   testnet  https://sui-testnet.gateway.tatum.io
 *   mainnet  https://sui-mainnet.gateway.tatum.io
 *
 * The gateway speaks standard Sui JSON-RPC, so this works with @mysten/sui
 * builders (we serialize a tx to bytes and submit via sui_executeTransactionBlock).
 */
import { blake2b } from "@noble/hashes/blake2b";
import { toBase58 } from "@mysten/sui/utils";

export function getTatumRpcUrl(): string {
  if (process.env.SUI_RPC_URL) return process.env.SUI_RPC_URL;
  const net = process.env.SUI_NETWORK === "mainnet" ? "mainnet" : "testnet";
  return `https://sui-${net}.gateway.tatum.io`;
}

function getApiKey(): string {
  const key = process.env.TATUM_API_KEY;
  if (!key) {
    throw new TatumError(
      "TATUM_API_KEY is not set. Add it to .env.local. All Sui RPC goes through Tatum."
    );
  }
  return key;
}

export class TatumError extends Error {
  constructor(
    message: string,
    public code?: number
  ) {
    super(message);
    this.name = "TatumError";
  }
}

let rpcId = 0;

// Tatum's free plan allows ~3 requests/second. We serialize calls through a
// promise chain and space them out so multi call flows (publish, create,
// verify) do not trip the 429 limiter. Tunable via TATUM_MIN_INTERVAL_MS.
const MIN_INTERVAL_MS = Number(process.env.TATUM_MIN_INTERVAL_MS ?? 350);
let gate: Promise<void> = Promise.resolve();
let lastCallAt = 0;

function throttle(): Promise<void> {
  // Chain onto the previous call so only one request is in flight at a time
  // and successive calls are spaced by at least MIN_INTERVAL_MS.
  const turn = gate.then(async () => {
    const wait = lastCallAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCallAt = Date.now();
  });
  // Keep the gate from rejecting the chain if a turn throws.
  gate = turn.catch(() => {});
  return turn;
}

/**
 * Single entry point for all Sui JSON-RPC calls, routed through Tatum.
 * Throttled to respect the plan rate limit, with a bounded retry on 429.
 */
export async function suiRpc<T = unknown>(
  method: string,
  params: unknown[] = []
): Promise<T> {
  let attempt = 0;
  // up to 4 tries on rate limiting, with backoff
  for (;;) {
    await throttle();
    const res = await fetch(getTatumRpcUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": getApiKey(),
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: ++rpcId,
        method,
        params,
      }),
    });

    if (res.status === 429 && attempt < 4) {
      attempt++;
      const backoff = 500 * 2 ** attempt; // 1s, 2s, 4s, 8s
      await new Promise((r) => setTimeout(r, backoff));
      continue;
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new TatumError(
        `Tatum RPC HTTP ${res.status} for ${method}. ${text}`.trim(),
        res.status
      );
    }

    const json = (await res.json()) as {
      result?: T;
      error?: { code: number; message: string };
    };
    if (json.error) {
      throw new TatumError(
        `Tatum RPC error for ${method}: ${json.error.message}`,
        json.error.code
      );
    }
    return json.result as T;
  }
}

// --- Typed helpers over the raw RPC, all via Tatum ---

export type SuiBalance = {
  coinType: string;
  coinObjectCount: number;
  totalBalance: string;
  lockedBalance: Record<string, string>;
};

export function getBalance(
  owner: string,
  coinType = "0x2::sui::SUI"
): Promise<SuiBalance> {
  return suiRpc<SuiBalance>("suix_getBalance", [owner, coinType]);
}

export type SuiSystemStateSummary = {
  epoch: string;
  protocolVersion: string;
  referenceGasPrice: string;
};

export function getLatestSuiSystemState(): Promise<SuiSystemStateSummary> {
  return suiRpc<SuiSystemStateSummary>("suix_getLatestSuiSystemState", []);
}

export function getReferenceGasPrice(): Promise<string> {
  return suiRpc<string>("suix_getReferenceGasPrice", []);
}

export function getChainIdentifier(): Promise<string> {
  return suiRpc<string>("sui_getChainIdentifier", []);
}

// --- Transaction submission through Tatum ---

/**
 * Compute the Sui transaction digest locally from built TransactionData bytes.
 *   digest = base58( blake2b256( "TransactionData::" || bytes ) )
 *
 * We compute it ourselves because the Tatum gateway's
 * sui_executeTransactionBlock returns a minimal response (often just the
 * digest, sometimes rejecting the WaitForLocalExecution request type). Knowing
 * the digest up front lets us submit, then poll sui_getTransactionBlock for the
 * full effects, object changes and events.
 */
export function computeTxDigest(txBytes: Uint8Array): string {
  const tag = new TextEncoder().encode("TransactionData::");
  const withTag = new Uint8Array(tag.length + txBytes.length);
  withTag.set(tag);
  withTag.set(txBytes, tag.length);
  return toBase58(blake2b(withTag, { dkLen: 32 }));
}

export type TxBlock = {
  digest: string;
  effects?: {
    status?: { status: string; error?: string };
  };
  objectChanges?: Array<{
    type: string;
    objectType?: string;
    objectId?: string;
    packageId?: string;
  }>;
  events?: Array<{ type: string; parsedJson?: unknown }>;
};

/**
 * Submit a signed transaction through Tatum and wait for it to land. Returns
 * the full transaction block with effects, object changes and events. This is
 * the single write path used by publish, the human flow and the agent flow.
 */
export async function executeAndWait(
  txBytes: Uint8Array,
  signature: string,
  { timeoutMs = 45_000, pollMs = 1_500 }: { timeoutMs?: number; pollMs?: number } = {}
): Promise<TxBlock> {
  const digest = computeTxDigest(txBytes);
  const txB64 = Buffer.from(txBytes).toString("base64");

  // Fire execution. Keep params lean: some gateway nodes reject extra options
  // or a request type with "Invalid params".
  try {
    await suiRpc("sui_executeTransactionBlock", [txB64, [signature]]);
  } catch (e) {
    const msg = (e as Error).message.toLowerCase();
    // An "already executed" style error means a prior attempt landed it.
    if (!msg.includes("already") && !msg.includes("executed")) throw e;
  }

  // Poll for effects by the locally computed digest.
  const deadline = Date.now() + timeoutMs;
  let lastErr: unknown;
  while (Date.now() < deadline) {
    try {
      const block = await suiRpc<TxBlock>("sui_getTransactionBlock", [
        digest,
        { showEffects: true, showObjectChanges: true, showEvents: true },
      ]);
      if (block && block.digest) return block;
    } catch (e) {
      lastErr = e; // not indexed yet, keep polling
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  throw new TatumError(
    `Transaction ${digest} did not appear within ${timeoutMs}ms. ${
      lastErr ? (lastErr as Error).message : ""
    }`.trim()
  );
}

/** Fetch an object with content + owner, used to read an Attestation. */
export function getObject(
  objectId: string,
  options: Record<string, boolean> = {
    showContent: true,
    showOwner: true,
    showType: true,
  }
): Promise<unknown> {
  return suiRpc("sui_getObject", [objectId, options]);
}

/** Coins owned by an address, used to pick a gas coin for the agent flow. */
export function getCoins(
  owner: string,
  coinType = "0x2::sui::SUI"
): Promise<{ data: Array<{ coinObjectId: string; balance: string; version: string; digest: string }> }> {
  return suiRpc("suix_getCoins", [owner, coinType]);
}

/** Query emitted events by type, used by the registry feed. */
export function queryEvents(
  eventType: string,
  limit = 20,
  descending = true
): Promise<{ data: unknown[]; nextCursor: unknown; hasNextPage: boolean }> {
  return suiRpc("suix_queryEvents", [
    { MoveEventType: eventType },
    null,
    limit,
    descending,
  ]);
}
