/**
 * Server side transaction building for the human sign flow.
 *
 * The browser wallet only signs. We build a fully resolved transaction here,
 * reading gas price and the signer's coins through Tatum, so every RPC stays
 * on the Tatum path. The wallet signs the exact bytes we return, and we submit
 * them back through Tatum.
 */
import { Transaction } from "@mysten/sui/transactions";
import { getReferenceGasPrice, getCoins } from "./tatum";
import { buildCreateTransaction, type CreateParams } from "./sigil";

const CREATE_GAS_BUDGET = 20_000_000n; // 0.02 SUI, generous for a single moveCall

/**
 * Build the create transaction for `sender`, resolving gas through Tatum, and
 * return the BCS transaction bytes as base64 for the wallet to sign.
 */
export async function buildCreateTxBytes(
  sender: string,
  params: CreateParams
): Promise<string> {
  const tx = buildCreateTransaction(params);
  tx.setSender(sender);
  tx.setGasPrice(BigInt(await getReferenceGasPrice()));
  tx.setGasBudget(CREATE_GAS_BUDGET);

  const coins = await getCoins(sender);
  if (!coins.data.length) {
    throw new Error(
      "This wallet has no SUI to pay gas. Fund it with testnet SUI and try again."
    );
  }
  tx.setGasPayment(
    coins.data.map((c) => ({
      objectId: c.coinObjectId,
      version: c.version,
      digest: c.digest,
    }))
  );

  const bytes = await tx.build();
  return Buffer.from(bytes).toString("base64");
}

/** Re-export so route handlers have one import surface. */
export { Transaction };
