/**
 * Phase 1 check: store one blob on Walrus and read it back, proving the
 * round trip and that content matches.
 *
 * Run: npm run walrus:test
 */
import "../lib/load-env";
import { createHash } from "node:crypto";
import {
  storeBlob,
  readBlob,
  getPublisherUrl,
  getAggregatorUrl,
} from "../lib/walrus";

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function main() {
  const content = `Sigil Phase 1 Walrus check. Stored at ${new Date().toISOString()}.`;
  const bytes = new TextEncoder().encode(content);

  console.log("Publisher: ", getPublisherUrl());
  console.log("Aggregator:", getAggregatorUrl());
  console.log("Content:   ", JSON.stringify(content));
  console.log("sha256:    ", sha256(bytes));
  console.log("");

  console.log("Storing on Walrus (epochs=1) ...");
  const stored = await storeBlob(bytes, 1);
  console.log("  branch:  ", stored.branch);
  console.log("  blobId:  ", stored.blobId);
  if (stored.objectId) console.log("  objectId:", stored.objectId);
  console.log("");

  console.log("Reading back from aggregator ...");
  const got = await readBlob(stored.blobId);
  const gotText = new TextDecoder().decode(got);
  console.log("  read:    ", JSON.stringify(gotText));
  console.log("  sha256:  ", sha256(got));
  console.log("");

  if (gotText === content && sha256(got) === sha256(bytes)) {
    console.log("PASS: content and sha256 match after the Walrus round trip.");
  } else {
    console.error("FAIL: content did not match after round trip.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("ERROR:", e.message ?? e);
  process.exit(1);
});
