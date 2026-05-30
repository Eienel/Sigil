/**
 * Produce the inputs for a Sui publish transaction from a locally compiled
 * Move package, without the network bound `--dump-bytecode-as-base64` path.
 *
 * `sui move build --dump-bytecode-as-base64` insists on its own network
 * connection (to fetch the chain id) and cannot send Tatum's x-api-key header,
 * so we keep build time fully local: run `sui move build`, then read the
 * compiled module bytes and the dependency package ids ourselves.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

// System package object ids that a Sui Move package links against. These are
// the implicit framework dependencies (MoveStdlib, Sui, SuiSystem, Bridge).
const SYSTEM_DEPENDENCIES = [
  "0x0000000000000000000000000000000000000000000000000000000000000001",
  "0x0000000000000000000000000000000000000000000000000000000000000002",
  "0x0000000000000000000000000000000000000000000000000000000000000003",
  "0x000000000000000000000000000000000000000000000000000000000000000b",
];

export type BuiltPackage = { modules: string[]; dependencies: string[] };

export function buildPackage(packageDir: string): BuiltPackage {
  const dir = resolve(packageDir);

  // Compile locally. This is fully offline once git deps are cached.
  execFileSync("sui", ["move", "build", "--path", dir], {
    stdio: "inherit",
  });

  // Read the package's own compiled modules (top level *.mv only, not deps).
  const modulesDir = join(dir, "build", "sigil", "bytecode_modules");
  const modules = readdirSync(modulesDir)
    .filter((f) => f.endsWith(".mv"))
    .sort()
    .map((f) => readFileSync(join(modulesDir, f)).toString("base64"));

  if (!modules.length) {
    throw new Error(`No compiled modules found in ${modulesDir}`);
  }

  return { modules, dependencies: SYSTEM_DEPENDENCIES };
}
