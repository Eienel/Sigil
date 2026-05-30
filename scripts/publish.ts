/**
 * Publish the sigil Move package to Sui through Tatum.
 *
 * Compilation is local (scripts/build-package.ts reads the compiled bytecode),
 * but the publish TRANSACTION is built with @mysten/sui and submitted through
 * the Tatum RPC gateway, keeping every on chain write on the Tatum path.
 *
 * Run: npm run sigil:publish
 * Writes the package id into .env.local (SIGIL_PACKAGE_ID +
 * NEXT_PUBLIC_SIGIL_PACKAGE_ID).
 */
import "../lib/load-env";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import {
  executeAndWait,
  getReferenceGasPrice,
  getCoins,
  getTatumRpcUrl,
} from "../lib/tatum";
import { buildPackage } from "./build-package";

const PKG_DIR = resolve(process.cwd(), "move/sigil");

async function main() {
  const sk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!sk) throw new Error("DEPLOYER_PRIVATE_KEY missing in .env.local");
  const keypair = Ed25519Keypair.fromSecretKey(sk);
  const sender = keypair.getPublicKey().toSuiAddress();
  console.log("Deployer:   ", sender);
  console.log("RPC (Tatum):", getTatumRpcUrl());

  const { modules, dependencies } = buildPackage(PKG_DIR);
  console.log(`Built ${modules.length} module(s), ${dependencies.length} deps.`);

  // Build the publish transaction.
  const tx = new Transaction();
  const upgradeCap = tx.publish({ modules, dependencies });
  tx.transferObjects([upgradeCap], sender);
  tx.setSender(sender);

  // Gas: reference price + a generous budget, paid from the deployer's coins.
  tx.setGasPrice(BigInt(await getReferenceGasPrice()));
  tx.setGasBudget(500_000_000n); // 0.5 SUI budget for a publish

  const coins = await getCoins(sender);
  if (!coins.data.length) throw new Error("Deployer has no SUI coins for gas.");
  tx.setGasPayment(
    coins.data.map((c) => ({
      objectId: c.coinObjectId,
      version: c.version,
      digest: c.digest,
    }))
  );

  // Build offline (all inputs resolved), sign locally, submit through Tatum.
  const bytes = await tx.build();
  const { signature } = await keypair.signTransaction(bytes);

  console.log("Submitting publish tx through Tatum ...");
  const result = await executeAndWait(bytes, signature, { timeoutMs: 60_000 });

  console.log("Tx digest:", result.digest);
  const status = result.effects?.status?.status;
  console.log("Status:   ", status);
  if (status !== "success") {
    throw new Error(
      "Publish failed: " + (result.effects?.status?.error ?? "unknown status")
    );
  }

  const published = result.objectChanges?.find((c) => c.type === "published");
  const packageId = published?.packageId;
  if (!packageId) {
    throw new Error(
      "Published but no packageId in objectChanges. Digest: " + result.digest
    );
  }
  console.log("");
  console.log("PACKAGE ID:", packageId);

  saveEnv("SIGIL_PACKAGE_ID", packageId);
  saveEnv("NEXT_PUBLIC_SIGIL_PACKAGE_ID", packageId);
  console.log(
    "Saved SIGIL_PACKAGE_ID + NEXT_PUBLIC_SIGIL_PACKAGE_ID to .env.local"
  );
}

function saveEnv(key: string, value: string) {
  const path = resolve(process.cwd(), ".env.local");
  let env = existsSync(path) ? readFileSync(path, "utf8") : "";
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(env)) env = env.replace(re, `${key}=${value}`);
  else env += `\n${key}=${value}`;
  writeFileSync(path, env, { mode: 0o600 });
}

main().catch((e) => {
  console.error("ERROR:", e.message ?? e);
  process.exit(1);
});
