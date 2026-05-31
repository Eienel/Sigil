/**
 * Mint an agent API key. Stateless: the key is an HMAC-signed token carrying a
 * label, verified later without any database. All minted keys sign from the
 * shared funded agent address; the label keeps signers distinguishable.
 *
 * Body (optional): { label }
 * Returns: { key, label }
 */
import { NextRequest, NextResponse } from "next/server";
import { issueAgentKey, AgentAuthError } from "@/lib/agent-auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    let label = "agent";
    try {
      const body = (await req.json()) as { label?: string };
      if (body?.label && typeof body.label === "string") label = body.label;
    } catch {
      // no body is fine, use the default label
    }
    const key = issueAgentKey(label);
    const clean = label.slice(0, 40).replace(/[^\w .\-]/g, "");
    return NextResponse.json({ key, label: clean });
  } catch (e) {
    const message =
      e instanceof AgentAuthError
        ? e.message
        : e instanceof Error
          ? e.message
          : "Could not mint a key.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
