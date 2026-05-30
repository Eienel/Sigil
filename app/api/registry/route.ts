/**
 * Registry feed. Reads recent AttestationCreated events from Sui through Tatum
 * and returns them newest first for the registry page.
 */
import { NextResponse } from "next/server";
import { queryEvents } from "@/lib/tatum";
import { attestationCreatedEventType } from "@/lib/sigil";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RawEvent = {
  id?: { txDigest?: string; eventSeq?: string };
  timestampMs?: string;
  parsedJson?: Record<string, unknown>;
};

export async function GET() {
  try {
    const res = (await queryEvents(attestationCreatedEventType(), 30, true)) as {
      data: RawEvent[];
    };

    const items = (res.data ?? []).map((e) => {
      const j = e.parsedJson ?? {};
      return {
        objectId: String(j.attestation_id ?? ""),
        signer: String(j.signer ?? ""),
        walrusBlobId: String(j.walrus_blob_id ?? ""),
        sha256Hex: String(j.sha256_hex ?? ""),
        provenanceType: Number(j.provenance_type ?? 0),
        timestampMs: Number(j.timestamp_ms ?? e.timestampMs ?? 0),
        label: String(j.label ?? ""),
        txDigest: e.id?.txDigest ?? "",
      };
    });

    return NextResponse.json({ items });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not read the registry.";
    return NextResponse.json({ error: message, items: [] }, { status: 500 });
  }
}
