/**
 * Verify flow. Two ways in:
 *   - by Sigil ID (the Attestation object id), optionally with a file to check
 *   - by file alone, which we hash and look up via the AttestationCreated events
 *
 * The primary tamper check is sha256: the recomputed hash of the submitted file
 * versus the sha256 stored on chain. We also fetch the stored Walrus blob to
 * confirm it is retrievable. Re-deriving the Walrus blob id is deliberately not
 * used, sha256 is the source of truth (see CLAUDE.md VERIFY LOGIC).
 *
 * Verdicts: "authentic" | "tampered" | "not_found".
 */
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { suiRpc } from "@/lib/tatum";
import {
  parseAttestationContent,
  attestationStructType,
  attestationCreatedEventType,
  type AttestationFields,
} from "@/lib/sigil";
import { readBlob, WalrusError } from "@/lib/walrus";

export const runtime = "nodejs";

type Verdict = "authentic" | "tampered" | "not_found";

type AttestationOut = {
  objectId: string;
  signer: string;
  walrusBlobId: string;
  sha256Hex: string;
  provenanceType: number;
  timestampMs: number;
  label: string;
};

async function getAttestationById(
  objectId: string
): Promise<AttestationOut | null> {
  const obj = await suiRpc<{
    data?: { objectId?: string; type?: string; content?: { fields?: AttestationFields } };
    error?: unknown;
  }>("sui_getObject", [
    objectId,
    { showContent: true, showOwner: true, showType: true },
  ]);
  const fields = obj.data?.content?.fields;
  if (!fields || obj.data?.type !== attestationStructType()) return null;
  return parseAttestationContent(objectId, fields);
}

// Look up an attestation by content hash via the emitted events. Returns the
// most recent match.
async function findAttestationByHash(
  sha256Hex: string
): Promise<AttestationOut | null> {
  const events = await suiRpc<{
    data: Array<{ parsedJson?: Record<string, unknown> }>;
  }>("suix_queryEvents", [
    { MoveEventType: attestationCreatedEventType() },
    null,
    50,
    true,
  ]);
  const match = events.data.find(
    (e) => (e.parsedJson?.sha256_hex as string) === sha256Hex
  );
  if (!match?.parsedJson) return null;
  const j = match.parsedJson;
  return {
    objectId: String(j.attestation_id),
    signer: String(j.signer),
    walrusBlobId: String(j.walrus_blob_id),
    sha256Hex: String(j.sha256_hex),
    provenanceType: Number(j.provenance_type),
    timestampMs: Number(j.timestamp_ms),
    label: String(j.label ?? ""),
  };
}

async function blobRetrievable(blobId: string): Promise<boolean> {
  try {
    await readBlob(blobId);
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const sigilId = String(form.get("sigilId") ?? "").trim();
    const file = form.get("file");

    let submittedHash: string | null = null;
    if (file instanceof File) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      submittedHash = createHash("sha256").update(bytes).digest("hex");
    }

    if (!sigilId && !submittedHash) {
      return NextResponse.json(
        { error: "Provide a Sigil ID or a file to verify." },
        { status: 400 }
      );
    }

    // Resolve the attestation: by id if given, else by content hash.
    let attestation: AttestationOut | null = null;
    if (sigilId) {
      if (!/^0x[0-9a-fA-F]{64}$/.test(sigilId)) {
        return NextResponse.json(
          { error: "That does not look like a Sigil ID." },
          { status: 400 }
        );
      }
      attestation = await getAttestationById(sigilId);
    } else if (submittedHash) {
      attestation = await findAttestationByHash(submittedHash);
    }

    if (!attestation) {
      return NextResponse.json({ verdict: "not_found" as Verdict });
    }

    // Confirm the stored blob is retrievable from Walrus.
    const blobAvailable = await blobRetrievable(attestation.walrusBlobId);

    // Primary tamper check: submitted file hash versus on chain hash.
    // If only a Sigil ID was given (no file), we report the record as authentic
    // by record, with hashMatch null to signal no file was compared.
    let verdict: Verdict;
    let hashMatch: boolean | null = null;
    if (submittedHash) {
      hashMatch = submittedHash === attestation.sha256Hex;
      verdict = hashMatch ? "authentic" : "tampered";
    } else {
      verdict = "authentic";
    }

    return NextResponse.json({
      verdict,
      hashMatch,
      submittedHash,
      blobAvailable,
      attestation,
    });
  } catch (e) {
    const message =
      e instanceof WalrusError
        ? e.message
        : e instanceof Error
          ? e.message
          : "Could not complete verification.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
