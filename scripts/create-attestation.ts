/**
 * Call sigil::create through Tatum, then read the resulting Attestation object
 * and the AttestationCreated event back through Tatum.
 *
 * End to end: stores real content on Walrus, then attests it on chain.
 *
 * Run: npm run sigil:create
 */
import "../lib/load-env";
import { createHash } from "node:crypto";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import {
  executeAndWait,
  getReferenceGasPrice,
  getCoins,
  suiRpc,
  getTatumRpcUrl,
} from "../lib/tatum";
import {
  buildCreateTransaction,
  parseAttestationContent,
  attestationStructType,
  attestationCreatedEventType,
  PROVENANCE,
  type AttestationFields,
} from "../lib/sigil";
import { storeBlob } from "../lib/walrus";

async function main() {
  const sk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!sk) throw new Error("DEPLOYER_PRIVATE_KEY missing in .env.local");
  const keypair = Ed25519Keypair.fromSecretKey(sk);
  const sender = keypair.getPublicKey().toSuiAddress();

  console.log("Signer:     ", sender);
  console.log("RPC (Tatum):", getTatumRpcUrl());
  console.log("Package:    ", process.env.SIGIL_PACKAGE_ID);
  console.log("");

  // 1) Real content -> Walrus -> sha256.
  const content = `Sigil attestation check. ${new Date().toISOString()}`;
  const sha256Hex = createHash("sha256").update(content).digest("hex");
  console.log("Storing content on Walrus ...");
  const stored = await storeBlob(content, 1);
  console.log("  blobId:", stored.blobId);
  console.log("  sha256:", sha256Hex);
  console.log("");

  // 2) Build the create tx.
  const tx = buildCreateTransaction({
    walrusBlobId: stored.blobId,
    sha256Hex,
    provenanceType: PROVENANCE.HUMAN,
    label: "attestation check",
  });
  tx.setSender(sender);
  tx.setGasPrice(BigInt(await getReferenceGasPrice()));
  tx.setGasBudget(20_000_000n);
  const coins = await getCoins(sender);
  if (!coins.data.length) throw new Error("No gas coins.");
  tx.setGasPayment(
    coins.data.map((c) => ({
      objectId: c.coinObjectId,
      version: c.version,
      digest: c.digest,
    }))
  );

  // 3) Sign and submit through Tatum.
  const bytes = await tx.build();
  const { signature } = await keypair.signTransaction(bytes);
  console.log("Submitting create tx through Tatum ...");
  const result = await executeAndWait(bytes, signature, { timeoutMs: 45_000 });
  console.log("  digest:", result.digest);
  console.log("  status:", result.effects?.status?.status);
  if (result.effects?.status?.status !== "success") {
    throw new Error("create failed: " + result.effects?.status?.error);
  }

  // 4) Find the created Attestation object id.
  const created = result.objectChanges?.find(
    (c) => c.type === "created" && c.objectType === attestationStructType()
  );
  const objectId = created?.objectId;
  if (!objectId) throw new Error("No created Attestation in objectChanges.");
  console.log("  Attestation object:", objectId);
  console.log("");

  // 5) Read the object back through Tatum.
  console.log("Reading Attestation object back through Tatum ...");
  const obj = await suiRpc<{
    data?: { content?: { fields?: AttestationFields } };
  }>("sui_getObject", [
    objectId,
    { showContent: true, showOwner: true, showType: true },
  ]);
  const fields = obj.data?.content?.fields;
  if (!fields) throw new Error("Could not read Attestation fields.");
  const att = parseAttestationContent(objectId, fields);
  console.log("  signer:        ", att.signer);
  console.log("  walrusBlobId:  ", att.walrusBlobId);
  console.log("  sha256Hex:     ", att.sha256Hex);
  console.log("  provenanceType:", att.provenanceType);
  console.log("  timestampMs:   ", att.timestampMs);
  console.log("  label:         ", att.label);
  console.log("");

  // 6) Read the emitted event back through Tatum.
  console.log("Querying AttestationCreated events through Tatum ...");
  const events = await suiRpc<{
    data: Array<{ type: string; parsedJson: unknown }>;
  }>("suix_queryEvents", [
    { MoveEventType: attestationCreatedEventType() },
    null,
    5,
    true,
  ]);
  console.log("  recent events:", events.data.length);
  const mine = events.data.find(
    (e) => (e.parsedJson as { sha256_hex?: string })?.sha256_hex === sha256Hex
  );
  console.log("  found our event:", Boolean(mine));
  console.log("");

  // Verify the round trip is internally consistent.
  const ok =
    att.sha256Hex === sha256Hex &&
    att.walrusBlobId === stored.blobId &&
    Boolean(mine);
  if (ok) {
    console.log("PASS: created, read object and event back through Tatum.");
  } else {
    console.error("FAIL: data mismatch on read back.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("ERROR:", e.message ?? e);
  process.exit(1);
});
