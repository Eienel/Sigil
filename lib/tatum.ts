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

/**
 * Single entry point for all Sui JSON-RPC calls, routed through Tatum.
 */
export async function suiRpc<T = unknown>(
  method: string,
  params: unknown[] = []
): Promise<T> {
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
