/**
 * Agent sign endpoint.
 *
 * An AI agent (or any server side caller) presents an API key and content, and
 * receives an on chain attestation. The content is stored on Walrus, the
 * sha256 is computed server side, and the attestation is written with the
 * server side agent keypair through Tatum.
 *
 * Auth: send the API key as `x-api-key` or `Authorization: Bearer <key>`.
 *
 * Accepts either:
 *   - multipart/form-data with a `file` field, or
 *   - application/json with `{ content }` (a string) or `{ sha256, blobId }`
 *     if the caller has already stored the content on Walrus.
 *
 * Common fields: provenanceType (0 human, 1 AI, 2 AI assisted), label.
 * Returns: { blobId, sha256, digest, objectId, verifyUrl, signer }.
 */
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { resolveAgent, AgentAuthError } from "@/lib/agent-auth";
import { agentSignAndSubmit } from "@/lib/agent-sign";
import { storeBlob, WALRUS_MAX_BYTES, WalrusError } from "@/lib/walrus";
import type { ProvenanceType } from "@/lib/sigil";

export const runtime = "nodejs";

function getApiKey(req: NextRequest): string | null {
  const header = req.headers.get("x-api-key");
  if (header) return header;
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return null;
}

function verifyUrlFor(req: NextRequest, objectId: string | null): string {
  const origin = req.nextUrl.origin;
  return objectId ? `${origin}/verify?id=${objectId}` : `${origin}/verify`;
}

export async function POST(req: NextRequest) {
  try {
    // 1) Authenticate the agent, resolving its keypair and address.
    const { keypair, address, keyLabel } = resolveAgent(getApiKey(req));

    // 2) Gather content, provenance and label from JSON or multipart.
    const contentType = req.headers.get("content-type") ?? "";
    let bytes: Uint8Array | null = null;
    let providedSha: string | null = null;
    let providedBlobId: string | null = null;
    let provenanceType: ProvenanceType = 1; // default AI generated for agents
    let label = "";
    let epochs = 5;

    if (contentType.includes("application/json")) {
      const body = (await req.json()) as {
        content?: string;
        sha256?: string;
        blobId?: string;
        provenanceType?: number;
        label?: string;
        epochs?: number;
      };
      if (typeof body.provenanceType === "number")
        provenanceType = body.provenanceType as ProvenanceType;
      label = (body.label ?? "").slice(0, 200);
      epochs = clampEpochs(body.epochs);
      if (typeof body.content === "string") {
        bytes = new TextEncoder().encode(body.content);
      } else if (body.sha256 && body.blobId) {
        // Caller already stored on Walrus and computed the hash.
        providedSha = body.sha256.toLowerCase();
        providedBlobId = body.blobId;
      } else {
        return NextResponse.json(
          { error: "Provide content, or both sha256 and blobId." },
          { status: 400 }
        );
      }
    } else {
      const form = await req.formData();
      const file = form.get("file");
      const pt = form.get("provenanceType");
      if (pt != null) provenanceType = Number(pt) as ProvenanceType;
      label = String(form.get("label") ?? "").slice(0, 200);
      epochs = clampEpochs(Number(form.get("epochs")));
      if (file instanceof File) {
        bytes = new Uint8Array(await file.arrayBuffer());
      } else {
        return NextResponse.json(
          { error: "No file provided." },
          { status: 400 }
        );
      }
    }

    if (![0, 1, 2].includes(provenanceType)) {
      return NextResponse.json(
        { error: "Invalid provenance type." },
        { status: 400 }
      );
    }

    // 3) Store on Walrus and compute sha256 (unless caller provided both).
    let blobId: string;
    let sha256: string;
    if (bytes) {
      if (bytes.byteLength > WALRUS_MAX_BYTES) {
        return NextResponse.json(
          {
            error: `Content is over the ~10 MiB public Walrus limit.`,
          },
          { status: 413 }
        );
      }
      sha256 = createHash("sha256").update(bytes).digest("hex");
      const stored = await storeBlob(bytes, epochs);
      blobId = stored.blobId;
    } else {
      blobId = providedBlobId as string;
      sha256 = providedSha as string;
      if (!/^[0-9a-f]{64}$/.test(sha256)) {
        return NextResponse.json(
          { error: "sha256 must be 64 lowercase hex characters." },
          { status: 400 }
        );
      }
    }

    // The key label identifies the signing agent; the request label describes
    // this specific content. Keep both so the signer stays recognizable in the
    // registry: "<agent>: <content label>", falling back to whichever exists.
    const finalLabel = (
      keyLabel && label
        ? `${keyLabel}: ${label}`
        : label || keyLabel || ""
    ).slice(0, 200);

    // 4) Sign with the agent keypair and submit through Tatum.
    const { digest, objectId } = await agentSignAndSubmit(keypair, {
      walrusBlobId: blobId,
      sha256Hex: sha256,
      provenanceType,
      label: finalLabel,
    });

    return NextResponse.json({
      blobId,
      sha256,
      digest,
      objectId,
      signer: address,
      provenanceType,
      verifyUrl: verifyUrlFor(req, objectId),
    });
  } catch (e) {
    if (e instanceof AgentAuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    const message =
      e instanceof WalrusError
        ? e.message
        : e instanceof Error
          ? e.message
          : "Could not sign the content.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function clampEpochs(n: number | undefined): number {
  if (!n || Number.isNaN(n)) return 5;
  return Math.max(1, Math.min(53, Math.floor(n)));
}
