/**
 * Walrus client. Storage runs over plain HTTP against a public publisher
 * (PUT to store) and a public aggregator (GET to read). This is the storage
 * half of Sigil. The on chain attestation half goes through Tatum (see
 * lib/tatum.ts).
 *
 * Store:  PUT  {publisher}/v1/blobs?epochs=<n>
 * Read:   GET  {aggregator}/v1/blobs/<blobId>
 *
 * The store response has two shapes we must handle:
 *   - newlyCreated.blobObject.blobId  (first time this content is stored)
 *   - alreadyCertified.blobId         (identical content already on Walrus)
 */

// Public Walrus testnet endpoints, confirmed against the live services.
const DEFAULT_PUBLISHER = "https://publisher.walrus-testnet.walrus.space";
const DEFAULT_AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space";

// Public publishers cap uploads around 10 MiB. Enforce and message it.
export const WALRUS_MAX_BYTES = 10 * 1024 * 1024;

export function getPublisherUrl(): string {
  return (process.env.WALRUS_PUBLISHER_URL || DEFAULT_PUBLISHER).replace(
    /\/$/,
    ""
  );
}

export function getAggregatorUrl(): string {
  return (process.env.WALRUS_AGGREGATOR_URL || DEFAULT_AGGREGATOR).replace(
    /\/$/,
    ""
  );
}

export type StoreResult = {
  blobId: string;
  // which response branch produced the id, useful for UI and debugging
  branch: "newlyCreated" | "alreadyCertified";
  // present only on newlyCreated
  objectId?: string;
  endEpoch?: number;
  size?: number;
};

export class WalrusError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = "WalrusError";
  }
}

/**
 * Store bytes on Walrus for `epochs` storage epochs. Returns the blob ID and
 * which branch produced it.
 */
export async function storeBlob(
  data: Uint8Array | ArrayBuffer | string,
  epochs = 1
): Promise<StoreResult> {
  const body =
    typeof data === "string" ? new TextEncoder().encode(data) : data;
  const byteLength =
    body instanceof Uint8Array ? body.byteLength : body.byteLength;

  if (byteLength > WALRUS_MAX_BYTES) {
    throw new WalrusError(
      `File is ${(byteLength / 1024 / 1024).toFixed(
        1
      )} MiB. Public Walrus publishers cap uploads at about 10 MiB. Use a smaller file.`
    );
  }

  const url = `${getPublisherUrl()}/v1/blobs?epochs=${epochs}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "PUT",
      body: body as BodyInit,
    });
  } catch (e) {
    throw new WalrusError(
      `Could not reach the Walrus publisher. ${(e as Error).message}`
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new WalrusError(
      `Walrus publisher returned ${res.status}. ${text}`.trim(),
      res.status
    );
  }

  const json = (await res.json()) as WalrusStoreResponse;
  return parseStoreResponse(json);
}

export function parseStoreResponse(json: WalrusStoreResponse): StoreResult {
  if (json.newlyCreated) {
    const o = json.newlyCreated.blobObject;
    return {
      blobId: o.blobId,
      branch: "newlyCreated",
      objectId: o.id,
      size: o.size,
      endEpoch: o.storage?.endEpoch,
    };
  }
  if (json.alreadyCertified) {
    return {
      blobId: json.alreadyCertified.blobId,
      branch: "alreadyCertified",
      endEpoch: json.alreadyCertified.endEpoch,
    };
  }
  throw new WalrusError(
    "Unexpected Walrus response, neither newlyCreated nor alreadyCertified present."
  );
}

/** Read a blob back from the aggregator as raw bytes. */
export async function readBlob(blobId: string): Promise<Uint8Array> {
  const url = `${getAggregatorUrl()}/v1/blobs/${encodeURIComponent(blobId)}`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    throw new WalrusError(
      `Could not reach the Walrus aggregator. ${(e as Error).message}`
    );
  }
  if (res.status === 404) {
    throw new WalrusError(`Blob ${blobId} not found on Walrus.`, 404);
  }
  if (!res.ok) {
    throw new WalrusError(
      `Walrus aggregator returned ${res.status}.`,
      res.status
    );
  }
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

/** Convenience: read a blob back as UTF-8 text. */
export async function readBlobText(blobId: string): Promise<string> {
  return new TextDecoder().decode(await readBlob(blobId));
}

// Response shapes from the Walrus publisher.
export type WalrusStoreResponse = {
  newlyCreated?: {
    blobObject: {
      id: string;
      blobId: string;
      size: number;
      encodingType?: string;
      certifiedEpoch?: number;
      storage?: { endEpoch?: number };
    };
  };
  alreadyCertified?: {
    blobId: string;
    endEpoch?: number;
    event?: unknown;
  };
};
