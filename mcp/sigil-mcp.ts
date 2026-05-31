/**
 * Sigil MCP server.
 *
 * Exposes Sigil's provenance actions as MCP tools so an AI agent can sign and
 * verify content through the same HTTP API the rest of the app uses. This keeps
 * the architecture honest: the MCP server is a thin client over /api/sign and
 * /api/verify, which in turn store on Walrus and write to Sui through Tatum.
 *
 * Tools:
 *   sigil_sign    store content on Walrus and write an on chain attestation
 *   sigil_verify  check a file's text or a Sigil ID against the chain
 *
 * Config via env:
 *   SIGIL_BASE_URL   the Sigil deployment origin (default http://localhost:3000)
 *   SIGIL_AGENT_KEY  the agent API key, required for sigil_sign
 *
 * Run: npm run mcp   (stdio transport, for an MCP client like Claude Desktop)
 */
import "../lib/load-env";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE_URL = (
  process.env.SIGIL_BASE_URL || "http://localhost:3000"
).replace(/\/$/, "");
// Accept either a dedicated MCP var or the server side agent key.
const AGENT_KEY = process.env.SIGIL_AGENT_KEY || process.env.AGENT_API_KEY || "";

const server = new McpServer({
  name: "sigil",
  version: "1.0.0",
});

const PROVENANCE_DESC =
  "Provenance type: 0 human made, 1 AI generated, 2 AI assisted.";

server.registerTool(
  "sigil_sign",
  {
    title: "Sign content with Sigil",
    description:
      "Store text content on Walrus and write a tamper proof attestation on Sui through Tatum, signed by the agent address. Returns the Walrus blob id, sha256, transaction digest, Sigil object id, and a verify URL.",
    inputSchema: {
      content: z.string().describe("The text content to attest."),
      provenanceType: z
        .number()
        .int()
        .min(0)
        .max(2)
        .optional()
        .describe(PROVENANCE_DESC + " Defaults to 1."),
      label: z
        .string()
        .max(200)
        .optional()
        .describe("Optional short label for the attestation."),
    },
  },
  async ({ content, provenanceType, label }) => {
    if (!AGENT_KEY) {
      return errorResult(
        "No agent API key configured. Set SIGIL_AGENT_KEY for the MCP server."
      );
    }
    try {
      const res = await fetch(`${BASE_URL}/api/sign`, {
        method: "POST",
        headers: {
          "x-api-key": AGENT_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          provenanceType: provenanceType ?? 1,
          label: label ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) return errorResult(data.error ?? `HTTP ${res.status}`);
      return jsonResult(data);
    } catch (e) {
      return errorResult(toMessage(e));
    }
  }
);

server.registerTool(
  "sigil_verify",
  {
    title: "Verify with Sigil",
    description:
      "Check provenance. Provide a Sigil ID to look up an attestation, and/or text content to recompute its sha256 and compare against the chain. Returns a verdict of authentic, tampered, or not found, with the signer, time, and provenance type.",
    inputSchema: {
      sigilId: z
        .string()
        .optional()
        .describe("The Sigil attestation object id, 0x followed by 64 hex."),
      content: z
        .string()
        .optional()
        .describe(
          "Text content to verify. Its sha256 is compared to the on chain record."
        ),
    },
  },
  async ({ sigilId, content }) => {
    if (!sigilId && content == null) {
      return errorResult("Provide a sigilId or content to verify.");
    }
    try {
      const form = new FormData();
      if (sigilId) form.set("sigilId", sigilId);
      if (content != null) {
        // Send the text as a file part so the API hashes the exact bytes.
        form.set("file", new Blob([content]), "content.txt");
      }
      const res = await fetch(`${BASE_URL}/api/verify`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) return errorResult(data.error ?? `HTTP ${res.status}`);
      return jsonResult(data);
    } catch (e) {
      return errorResult(toMessage(e));
    }
  }
);

function jsonResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function errorResult(message: string) {
  return {
    isError: true,
    content: [{ type: "text" as const, text: message }],
  };
}

function toMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Unknown error.";
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr is safe for logs; stdout is the MCP channel.
  console.error(`Sigil MCP server ready. Base URL ${BASE_URL}.`);
}

main().catch((e) => {
  console.error("Sigil MCP server failed to start:", e);
  process.exit(1);
});
