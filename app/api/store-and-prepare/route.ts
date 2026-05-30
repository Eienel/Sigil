/**
 * Human sign flow, step 1.
 *
 * Accepts the file, stores it on Walrus, computes the sha256 server side, and
 * builds a fully resolved `create` transaction for the connected wallet to
 * sign. Gas is resolved through Tatum inside buildCreateTxBytes.
 *
 * Returns: { blobId, sha256, txBytes (base64), provenanceType, label }
 */
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { storeBlob, WALRUS_MAX_BYTES, WalrusError } from "@/lib/walrus";
import { buildCreateTxBytes } from "@/lib/server-sui";
import type { ProvenanceType } from "@/lib/sigil";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const sender = String(form.get("sender") ?? "");
    const provenanceType = Number(
      form.get("provenanceType") ?? 0
    ) as ProvenanceType;
    const label = String(form.get("label") ?? "").slice(0, 200);
    const epochs = Math.max(1, Math.min(53, Number(form.get("epochs") ?? 5)));

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    if (!/^0x[0-9a-fA-F]{64}$/.test(sender)) {
      return NextResponse.json(
        { error: "A connected wallet address is required." },
        { status: 400 }
      );
    }
    if (![0, 1, 2].includes(provenanceType)) {
      return NextResponse.json(
        { error: "Invalid provenance type." },
        { status: 400 }
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.byteLength > WALRUS_MAX_BYTES) {
      return NextResponse.json(
        {
          error: `File is ${(bytes.byteLength / 1024 / 1024).toFixed(
            1
          )} MiB. The public Walrus publisher caps uploads at about 10 MiB.`,
        },
        { status: 413 }
      );
    }

    // sha256 is computed server side so it is bound to the exact stored bytes.
    const sha256 = createHash("sha256").update(bytes).digest("hex");

    // Store on Walrus first, so the attestation always points at a real blob.
    const stored = await storeBlob(bytes, epochs);

    // Build the transaction the wallet will sign. Gas resolved via Tatum.
    const txBytes = await buildCreateTxBytes(sender, {
      walrusBlobId: stored.blobId,
      sha256Hex: sha256,
      provenanceType,
      label,
    });

    return NextResponse.json({
      blobId: stored.blobId,
      sha256,
      txBytes,
      provenanceType,
      label,
      fileName: file.name,
      size: bytes.byteLength,
    });
  } catch (e) {
    const message =
      e instanceof WalrusError
        ? e.message
        : e instanceof Error
          ? e.message
          : "Could not prepare the attestation.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
