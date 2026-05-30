/**
 * Sigil domain helpers shared by the human flow, the agent flow, and scripts.
 *
 * Builds the `sigil::sigil::create` transaction and parses Attestation data.
 * Submission always goes through Tatum (see lib/tatum.ts).
 */
import { Transaction } from "@mysten/sui/transactions";

// 0 human made, 1 AI generated, 2 AI assisted.
export const PROVENANCE = {
  HUMAN: 0,
  AI: 1,
  ASSISTED: 2,
} as const;

export type ProvenanceType = 0 | 1 | 2;

export const PROVENANCE_LABEL: Record<ProvenanceType, string> = {
  0: "Human made",
  1: "AI generated",
  2: "AI assisted",
};

// The shared on chain Clock lives at 0x6 with initialSharedVersion 1.
const CLOCK_OBJECT_ID = "0x6";
const CLOCK_INITIAL_SHARED_VERSION = 1;

export function getPackageId(): string {
  const id =
    process.env.SIGIL_PACKAGE_ID || process.env.NEXT_PUBLIC_SIGIL_PACKAGE_ID;
  if (!id) {
    throw new Error(
      "SIGIL_PACKAGE_ID is not set. Publish the Move package first."
    );
  }
  return id;
}

export type CreateParams = {
  walrusBlobId: string;
  sha256Hex: string;
  provenanceType: ProvenanceType;
  label?: string;
};

/**
 * Build the programmable transaction that calls sigil::create. The caller sets
 * sender, gas and signs. We reference the Clock as a shared object directly so
 * the tx can be built offline (no client round trip needed for 0x6).
 */
export function buildCreateTransaction(params: CreateParams): Transaction {
  const pkg = getPackageId();
  const tx = new Transaction();
  tx.moveCall({
    target: `${pkg}::sigil::create`,
    arguments: [
      tx.pure.string(params.walrusBlobId),
      tx.pure.string(params.sha256Hex),
      tx.pure.u8(params.provenanceType),
      tx.pure.string(params.label ?? ""),
      tx.sharedObjectRef({
        objectId: CLOCK_OBJECT_ID,
        initialSharedVersion: CLOCK_INITIAL_SHARED_VERSION,
        mutable: false,
      }),
    ],
  });
  return tx;
}

export type AttestationFields = {
  signer: string;
  walrus_blob_id: string;
  sha256_hex: string;
  provenance_type: number;
  timestamp_ms: string;
  label: string;
};

export type Attestation = {
  objectId: string;
  signer: string;
  walrusBlobId: string;
  sha256Hex: string;
  provenanceType: ProvenanceType;
  timestampMs: number;
  label: string;
};

/** Normalize the Move struct fields from sui_getObject into our shape. */
export function parseAttestationContent(
  objectId: string,
  fields: AttestationFields
): Attestation {
  return {
    objectId,
    signer: fields.signer,
    walrusBlobId: fields.walrus_blob_id,
    sha256Hex: fields.sha256_hex,
    provenanceType: Number(fields.provenance_type) as ProvenanceType,
    timestampMs: Number(fields.timestamp_ms),
    label: fields.label,
  };
}

/** The fully qualified type of the AttestationCreated event, for queries. */
export function attestationCreatedEventType(): string {
  return `${getPackageId()}::sigil::AttestationCreated`;
}

/** The fully qualified Attestation struct type. */
export function attestationStructType(): string {
  return `${getPackageId()}::sigil::Attestation`;
}
