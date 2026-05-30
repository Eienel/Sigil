/**
 * Human sign flow, step 2.
 *
 * Accepts the wallet's signature over the transaction bytes we built, submits
 * the signed transaction through Tatum, waits for it to land, and returns the
 * created Attestation object id and tx digest for the certificate view.
 *
 * Body: { txBytes (base64), signature (base64) }
 */
import { NextRequest, NextResponse } from "next/server";
import { fromBase64 } from "@mysten/sui/utils";
import { executeAndWait } from "@/lib/tatum";
import { attestationStructType } from "@/lib/sigil";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { txBytes, signature } = (await req.json()) as {
      txBytes?: string;
      signature?: string;
    };
    if (!txBytes || !signature) {
      return NextResponse.json(
        { error: "txBytes and signature are required." },
        { status: 400 }
      );
    }

    const bytes = fromBase64(txBytes);
    const result = await executeAndWait(bytes, signature, { timeoutMs: 45_000 });

    const status = result.effects?.status?.status;
    if (status !== "success") {
      return NextResponse.json(
        {
          error: "Transaction failed on chain: " + (result.effects?.status?.error ?? "unknown"),
          digest: result.digest,
        },
        { status: 502 }
      );
    }

    const created = result.objectChanges?.find(
      (c) => c.type === "created" && c.objectType === attestationStructType()
    );

    return NextResponse.json({
      digest: result.digest,
      objectId: created?.objectId ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not submit the transaction.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
