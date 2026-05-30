/**
 * Phase 2 check: read chain data through Tatum and print results, proving the
 * API key and the Tatum Sui RPC endpoint work. No direct fullnode is used.
 *
 * Run: npm run tatum:test
 */
import "../lib/load-env";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import {
  getTatumRpcUrl,
  getLatestSuiSystemState,
  getReferenceGasPrice,
  getBalance,
} from "../lib/tatum";

async function main() {
  console.log("Tatum Sui RPC:", getTatumRpcUrl());
  console.log("(all reads below are routed through Tatum, no direct fullnode)");
  console.log("");

  const state = await getLatestSuiSystemState();
  console.log("Latest system state:");
  console.log("  epoch:           ", state.epoch);
  console.log("  protocolVersion: ", state.protocolVersion);
  console.log("  referenceGasPrice:", state.referenceGasPrice);
  console.log("");

  const gas = await getReferenceGasPrice();
  console.log("Reference gas price:", gas);
  console.log("");

  // Derive the deployer address from the stored key and read its balance.
  const sk = process.env.DEPLOYER_PRIVATE_KEY;
  if (sk) {
    const addr = Ed25519Keypair.fromSecretKey(sk)
      .getPublicKey()
      .toSuiAddress();
    const bal = await getBalance(addr);
    console.log("Deployer address:", addr);
    console.log(
      "  balance:",
      bal.totalBalance,
      "mist (",
      Number(bal.totalBalance) / 1e9,
      "SUI )"
    );
    console.log("");
  }

  console.log("PASS: read chain data through Tatum successfully.");
}

main().catch((e) => {
  console.error("ERROR:", e.message ?? e);
  process.exit(1);
});
