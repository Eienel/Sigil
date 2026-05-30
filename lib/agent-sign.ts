/**
 * Server side agent signing. The agent keypair lives only on the server. We
 * build the create transaction, resolve gas through Tatum, sign with the agent
 * key, and submit through Tatum. Every on chain interaction stays on the Tatum
 * path, same as the human flow, only the signer differs.
 */
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { getReferenceGasPrice, getCoins, executeAndWait } from "./tatum";
import {
  buildCreateTransaction,
  attestationStructType,
  type CreateParams,
} from "./sigil";

const CREATE_GAS_BUDGET = 20_000_000n; // 0.02 SUI

export type AgentSignResult = {
  digest: string;
  objectId: string | null;
};

/**
 * Build, sign (with the agent keypair) and submit a create transaction through
 * Tatum. Returns the tx digest and the created Attestation object id.
 */
export async function agentSignAndSubmit(
  keypair: Ed25519Keypair,
  params: CreateParams
): Promise<AgentSignResult> {
  const sender = keypair.getPublicKey().toSuiAddress();

  const tx = buildCreateTransaction(params);
  tx.setSender(sender);
  tx.setGasPrice(BigInt(await getReferenceGasPrice()));
  tx.setGasBudget(CREATE_GAS_BUDGET);

  const coins = await getCoins(sender);
  if (!coins.data.length) {
    throw new Error(
      "The agent address has no SUI to pay gas. Fund it with testnet SUI."
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
  const { signature } = await keypair.signTransaction(bytes);
  const result = await executeAndWait(bytes, signature, { timeoutMs: 45_000 });

  if (result.effects?.status?.status !== "success") {
    throw new Error(
      "Agent transaction failed on chain: " +
        (result.effects?.status?.error ?? "unknown")
    );
  }

  const created = result.objectChanges?.find(
    (c) => c.type === "created" && c.objectType === attestationStructType()
  );
  return { digest: result.digest, objectId: created?.objectId ?? null };
}
