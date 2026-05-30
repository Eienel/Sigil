# Sigil

A verifiable provenance layer on Sui where both people and AI agents leave a
tamper proof mark on the content they create.

> Re-read this file at the start of every session. Update the PROGRESS section
> after every phase. This is how context survives across sessions.

---

## HOW TO WORK
- Work in the phases listed at the bottom, in order. After each phase, run the
  stated check and report the result before moving on. Do not skip ahead.
- First action (done): create CLAUDE.md in the repo root containing this entire
  brief, plus a running PROGRESS section updated after every phase.
- Before writing any Walrus or Tatum code, fetch and confirm the current API
  paths, auth headers, and response shapes from docs.wal.app and docs.tatum.io.
  Do not assume from memory. If you cannot browse, say so and ask for doc
  snippets.
- When you hit something only the user can do (accounts, keys, funding, a
  runtime error you cannot resolve), STOP and ask in plain terms. Expect a back
  and forth. Do not invent fake keys or stub past a blocker silently.
- Build and test on Sui TESTNET the entire time. Switch to mainnet only in the
  final phase, so we do not burn WAL tokens while debugging.

## CONCEPT
A signer (a person via wallet, or an AI agent via API key) submits content. The
app stores it on Walrus, then writes an on chain attestation on Sui that
records: signer identity, Walrus blob ID, sha256 of the content, a declared
provenance type (0 human-made, 1 AI-generated, 2 AI-assisted), a timestamp, and
an optional label. Anyone can verify a file or a Sigil ID: the app reads the on
chain record and the stored blob, recomputes sha256, and reports authentic,
tampered, or not found, with the signer, time, and provenance type.

## STACK
Next.js App Router, Tailwind v4, Motion (import from "motion/react"), Phosphor
icons, next/font. Sui via @mysten/dapp-kit and @mysten/sui. Deploy target
Vercel.

## ARCHITECTURE
- Walrus over HTTP. Store by PUT to a public publisher with an epochs param,
  which returns a blob ID. Read by GET from a public aggregator by blob ID.
  Handle both the newly created and already certified response branches. Public
  publishers cap uploads around 10 MiB, enforce and message that.
- Sui RPC strictly through Tatum. Testnet
  https://sui-testnet.gateway.tatum.io during development, mainnet
  https://sui-mainnet.gateway.tatum.io at the end, Tatum API key in the header.
  Every on chain read and tx submission goes through Tatum. Make this obvious in
  code and README.
- Move module "sigil": an Attestation object plus a create function storing
  signer, walrus_blob_id, sha256_hex, provenance_type (u8), timestamp_ms,
  label, and emitting an AttestationCreated event for indexing. Keep it minimal.
  Provide publish scripts for testnet then mainnet.
- Human flow: connect wallet, build a programmable transaction calling the
  create function, sign with the wallet, submit via Tatum RPC.
- Agent flow: /api/sign accepts content or a precomputed sha256 plus an agent
  API key and provenance type, stores to Walrus, writes the attestation with a
  server side agent keypair via Tatum RPC, returns blob ID, tx digest, object
  ID, and a verify URL. Map each agent API key to one Sui address.
- /api/verify accepts a file or Sigil ID. Primary check is recomputed sha256
  versus the on chain sha256. Also fetch the stored blob and confirm it is
  retrievable. Return the verdict plus signer, time, provenance type.

## VERIFY LOGIC
Primary tamper check is sha256 of the submitted file compared to the sha256
stored on chain. Do not rely on re-deriving the Walrus blob ID, that needs their
encoding and is the hard path. sha256 compare is the source of truth.

## ENV VARS
TATUM_API_KEY, SUI_NETWORK, SUI_RPC_URL, WALRUS_PUBLISHER_URL,
WALRUS_AGGREGATOR_URL, SIGIL_PACKAGE_ID, AGENT_PRIVATE_KEY (server only).

## PAGES
- Hero landing: left aligned or split, one line idea statement, a live inline
  demo that signs a sample and verifies it, the wax seal signet motif, two lanes
  For people and For agents. Not centered over a dark mesh.
- App: connect wallet, drag and drop, provenance type selector, sign, then a
  certificate view with a wax seal press animation.
- Verify: drop a file or paste a Sigil ID, show authentic, tampered, or not
  found with signer, time, provenance type, blob ID, and a tx link.
- For agents: a copyable code snippet and endpoint docs.
- Registry: a feed of recent attestations read from Sui events via Tatum.

## DESIGN SYSTEM
Aesthetic: ink, paper, wax seal. Colors: ink #15120E, paper #F6F2EA, surface
#FCFAF4, hairline #E4DDCF, muted #6A6358, single accent sealing wax #7C2D2D,
verified only green #2E6049. Dark mode bg #0E0C09, text #F1ECE1, accent #A23A3A.
Fonts: system San Francisco first, Geist fallback, Geist Mono for hashes and
IDs. Motion: spring physics only, around stiffness 100 damping 20, a wax seal
press on sign, an underline wipe on links, a sliding indicator on tabs, an SVG
line draw on the verify check, staggered reveals. Human signature renders as a
filled wax seal, agent as an engraved outline seal, same accent.

## HARD CONSTRAINTS
- No em dashes in any UI copy. No italics. No buzzwords.
- No emojis. Phosphor icons only, one stroke width globally.
- No AI purple or blue gradients, no decorative gradients, no mesh blobs. A
  faint paper texture is the only allowed gradient.
- Respect prefers-reduced-motion and give reduced transparency fallbacks.
- Full interaction states: loading skeletons, empty states, inline errors.
- Mobile first, min-h-[100dvh] for full height sections, contained max width.
- Animate transform and opacity only. Isolate perpetual motion in client leaf
  components.

## WHEN TO STOP AND ASK
- Right before Phase 0 ends: user provides the Tatum API key and a funded
  testnet Sui address.
- Before any mainnet step: user provides a mainnet wallet funded with SUI and
  WAL.
- Before the agent flow: user confirms how to generate the agent keypair.
- Any unresolved runtime error: show the exact error and what was tried.

## BUILD PHASES, each ends in a check
0. Repo scaffold, CLAUDE.md, env template, design tokens, fonts, app shell.
   Check: app runs and the hero renders with correct fonts and colors.
1. Walrus client utility. Check: a script stores one blob and reads it back,
   printing the blob ID and confirming the content matches.
2. Tatum Sui RPC client utility. Check: a script reads chain data through Tatum
   and prints a result, proving the key and endpoint work.
3. Move module written and published to testnet. Check: a script calls create
   and reads the resulting object and event back through Tatum.
4. Human sign flow end to end on testnet. Check: connect a wallet, sign a file,
   and see a certificate with a real tx digest.
5. Verify flow. Check: an unaltered file shows authentic, an altered file shows
   tampered, an unknown one shows not found.
6. Agent flow, /api/sign and /api/verify with an agent keypair. Check: a curl
   request signs content and returns a working verify URL.
7. Optional MCP wrapper exposing sign and verify as tools. Do this last.
8. Polish, dark mode, responsive, deploy to Vercel, publish the module to
   mainnet, smoke test on mainnet, write the README covering exactly how Walrus
   and Tatum are used, the provenance model, how to run, and the contract
   address.

---

## HACKATHON CONTEXT (Tatum x Walrus on Sui)
- Source: https://tatum.io/tatum-x-walrus-hackathon
- Theme: "Store. Build. Ship." Use Walrus decentralized storage on Sui, powered
  by Tatum. Walrus integration is mandatory core functionality.
- Required: Tatum API key, Tatum Sui RPC nodes, Walrus storage. Optional bonus:
  Tatum MCP server for AI features (maps to our Phase 7).
- Judging: Walrus + Tatum Integration 30%, Technical Quality 30%, Creativity
  20%, Presentation 20%. Bonus for social sharing tagging @Tatum_io,
  @WalrusFoundation, @SuiNetwork.
- Prizes: $2,000 total. Special: Best Walrus Integration +$200, Best Use of
  Tatum Tools +$200.
- Dates: Build May 23 to Jun 6. SUBMISSION DEADLINE Jun 6, 17:00 UTC. Results
  Jun 7. Today is 2026-05-30, so roughly one week of runway.
- Submission needs: GitHub repo, 2 to 3 minute demo video, Google Form.
- Implication: lean hard on making the Walrus + Tatum usage obvious and
  well documented. The MCP wrapper (Phase 7) and clean README matter for the
  bonus categories and presentation score.

## PROGRESS

### Phase 0 - Repo scaffold (DONE, awaiting credentials to fully close)
- Created CLAUDE.md with full brief + this PROGRESS section.
- Confirmed network access to docs.wal.app and docs.tatum.io (both 200).
- Environment: Node v22.22.2, npm 10.9.7.
- Scaffolded Next.js 15 (App Router) + Tailwind v4 + Motion + Phosphor +
  @mysten/dapp-kit + @mysten/sui + Geist fonts. tsx for scripts.
- Design tokens in app/globals.css: exact ink/paper/wax/verified palette,
  light + dark vars, paper-texture radial (only allowed gradient), reduced
  motion + reduced transparency fallbacks, Tailwind v4 @utility helpers.
- Components: WaxSeal (filled human / engraved agent variants), SiteNav
  (underline-wipe + sliding indicator), Reveal (staggered spring), InlineDemo
  (real Web Crypto sha256, seal press, SVG check line draw).
- Pages: hero landing (split, left aligned, live demo, two lanes), plus
  stubs for /app /verify /agents /registry.
- NOTE: design-taste-2 skill is NOT installed in this environment. Proceeding
  against the brief's explicit design system as the contract. Flagged to user.
- Verified: `npm run build` passes, all 8 routes prerender. Dev server serves
  hero; CSS contains all palette tokens + geist. Screenshot confirms layout,
  fonts, colors. Phase 0 check PASSED.
- BLOCKER to fully close Phase 0: need Tatum API key + funded testnet Sui
  address from user (the stated Phase 0 end gate, also feeds Phase 1/2).

### Phase 0 close-out (DONE)
- Tatum API key stored in .env.local (testnet + mainnet vars). Auth = x-api-key.
- Deployer keypair generated locally (user funded it). Decision: user funds,
  agent gets a SEPARATE dedicated key generated at Phase 6.
- Deployer testnet address 0xee01a5dce15c4eb0edf08cf428e0957ac8ab4f749b5092837cb7988dac3342de
  funded with 1 testnet SUI, confirmed via Tatum suix_getBalance.
- Secrets live only in .env.local (gitignored, mode 600). DEPLOYER_PRIVATE_KEY,
  TATUM_API_KEY, WALRUS_* set.

### Phase 1 - Walrus client (DONE)
- Confirmed API from docs.wal.app: PUT /v1/blobs?epochs=<n>, read blobId from
  newlyCreated.blobObject.blobId OR alreadyCertified.blobId; GET /v1/blobs/<id>.
- Public testnet endpoints (verified live): publisher.walrus-testnet.walrus.space,
  aggregator.walrus-testnet.walrus.space.
- lib/walrus.ts: storeBlob (both branches), readBlob/readBlobText, 10 MiB cap
  with clear error, typed errors.
- Check PASSED: scripts/walrus-test.ts stored a blob and read it back, content
  + sha256 matched. (last blobId _QJKrmEn91ak9KbI2pJasx5YzGRjaowulk1v_q2BLJ4)

### Phase 2 - Tatum Sui RPC client (DONE)
- Confirmed from docs/search: x-api-key header, standard Sui JSON-RPC over
  sui-{testnet,mainnet}.gateway.tatum.io.
- lib/tatum.ts: suiRpc single chokepoint + typed helpers (getBalance,
  getChainIdentifier, getLatestSuiSystemState, getReferenceGasPrice, getObject,
  getCoins, queryEvents). lib/load-env.ts loads .env.local for standalone
  scripts.
- NOTE: Tatum's pool does not serve suix_getLatestSuiSystemState (returns
  "Method not found"). The Phase 2 check relies on sui_getChainIdentifier +
  suix_getReferenceGasPrice + suix_getBalance and treats system state as best
  effort / skipped.
- RATE LIMIT: the Tatum free plan caps at ~3 requests/second (429 otherwise).
  suiRpc now serializes calls through a promise gate spaced by
  TATUM_MIN_INTERVAL_MS (default 350ms) and retries 429 with backoff. This is
  essential for the multi call publish/create/verify flows.
- Check PASSED: scripts/tatum-test.ts read chain id 4c78adac, reference gas
  price 1000, deployer balance 1 SUI, all through Tatum.

### Phase 3 - Move module published to testnet (DONE)
- Installed sui CLI 1.58.2 (prebuilt linux binary, /usr/local/bin/sui). The Sui
  framework is an implicit system dependency in this toolchain, so Move.toml has
  an empty [dependencies] block.
- move/sigil/sources/sigil.move: Attestation { signer, walrus_blob_id,
  sha256_hex, provenance_type u8, timestamp_ms, label } + create() (validates
  provenance 0/1/2, uses 0x6 Clock for timestamp, emits AttestationCreated,
  transfers object to signer) + read accessors. public fun (not entry) so PTBs
  can call it; self_transfer lint allowed intentionally.
- BUILD/PUBLISH PATH: `sui move build --dump-bytecode-as-base64` insists on its
  own network connection (to fetch chain id) and cannot send Tatum's x-api-key
  header. So scripts/build-package.ts compiles locally with `sui move build`,
  then reads build/sigil/bytecode_modules/sigil.mv as base64 and uses the four
  implicit framework dep ids (0x1,0x2,0x3,0xb). The publish TX is built with
  @mysten/sui and submitted through Tatum via executeAndWait. Build stays local,
  every on chain write stays on Tatum.
- Published to TESTNET through Tatum. Package id:
  0x66b4329479630cbdf74303cb5da63ad6bc185e20869ae9bdccd6bb5b63a666a2
  (publish tx 3EXuDzFZ5YC4KmWixPCAqe6GbrdLwuWXYeKJqhYnNHXL). Saved to .env.local
  as SIGIL_PACKAGE_ID + NEXT_PUBLIC_SIGIL_PACKAGE_ID.
- lib/sigil.ts: buildCreateTransaction (refs 0x6 as sharedObjectRef so it builds
  offline), parseAttestationContent, event/struct type helpers, PROVENANCE enum.
- Check PASSED: scripts/create-attestation.ts stored content on Walrus
  (blob B-ctfxBNUjphntI-EGDkSHS5degFKtoHP87WYHt42G0), called create through Tatum
  (tx 66qKDGukS6CnWsjvXn9sPrJi5G8uWfd7JwAkYDDbixmn, success), object
  0x22c8605b13fc52488b494b0a65b526d8bce2101dfba52f23d3b4d735089188a5, read the
  object AND the AttestationCreated event back through Tatum, all fields match.

### Phase 4 - Human sign flow (DONE, awaiting one live wallet click)
- ARCHITECTURE: wallet only signs; all RPC stays on Tatum. Two routes:
  - POST /api/store-and-prepare: takes file + sender + provenanceType + label,
    stores the file on Walrus, computes sha256 server side (bound to the exact
    bytes), builds a fully resolved create tx (gas price + gas coins read via
    Tatum in lib/server-sui.ts), returns { blobId, sha256, txBytes(base64) }.
  - POST /api/submit: takes { txBytes, signature } from the wallet, submits
    through Tatum via executeAndWait, returns { digest, objectId }.
- UI: components/sign-flow.tsx (client). ConnectButton gate, drag-drop dropzone,
  3 way provenance selector with sliding layoutId indicator, optional label,
  seal-press flow, then a certificate view (wax seal press animation, file,
  sha256, blob, Sigil ID, tx digest, links to /verify and suiscan). Uses
  useSignTransaction + useCurrentAccount from dapp-kit.
- VERIFIED SERVER PATH END TO END: prepared a real file (stored on Walrus blob
  xEigi5zMrOOj59HL8upysFsHhrOWFRO3ImjfmZRJ1Pc), signed the exact returned bytes
  with the deployer key to simulate the wallet, posted to /api/submit -> HTTP
  200, tx 8Jk2T3WtNRtHYutt4hfVPwYsXhzuZAbSongERk76kmvP, attestation object
  0xbf93ae06bf73be3722ab50ac93a4a89b1662b82c791838142897070b4178874f. The wallet
  signs identical bytes, so the only unproven step is the browser popup itself.
- npm run build passes, /api/store-and-prepare + /api/submit registered.
- TODO for user: connect a browser wallet (Slush/Sui Wallet) on testnet at /app
  and approve one signature to confirm the popup + certificate render live.

### Phase 5 - Verify flow (DONE)
- POST /api/verify accepts a Sigil ID and/or a file. Resolves the attestation
  by object id (sui_getObject) or, file-only, by content hash via
  suix_queryEvents over AttestationCreated. All reads through Tatum. Also fetches
  the Walrus blob to confirm retrievability (blobAvailable). Primary tamper check
  is recomputed sha256 vs on-chain sha256. Verdicts: authentic / tampered /
  not_found.
- UI: components/verify-flow.tsx (client) with file dropzone + Sigil ID input,
  loading skeleton, SVG check line-draw on authentic, signer/time/provenance/
  blob/sha256/Sigil ID rows, suiscan link. /verify?id=0x... deep link from the
  certificate auto-runs the lookup (wrapped in Suspense for useSearchParams).
- Check PASSED, all three verdicts self-verified against the real Phase 4
  attestation 0xbf93ae06...874f (blob xEigi5z..., sha256 fddd6cc4...968c):
  authentic (recovered the blob from Walrus, sha256 matched, hashMatch true),
  tampered (random file -> hashMatch false), not_found (unknown id).

### Phase 6 - Agent flow (DONE, awaiting agent address funding)
- Generated the SEPARATE dedicated agent keypair (distinct from the deployer)
  plus a demo agent API key. Both server only in .env.local (AGENT_PRIVATE_KEY,
  AGENT_API_KEY). Agent testnet address:
  0x9a8215f6d644e72c4b9227ab1f33960943c31b64cb1a40885e2b6bb9c0eb405d
- POST /api/sign: auth via x-api-key or Authorization: Bearer. Accepts JSON
  { content } or { sha256, blobId }, or multipart file. Stores on Walrus,
  computes sha256 server side, signs with the agent keypair, submits via Tatum
  (lib/agent-sign.ts). Returns blobId, sha256, digest, objectId, signer,
  verifyUrl. Default provenanceType 1 (AI generated) for agents.
- lib/agent-auth.ts: maps API key -> agent keypair with constant time compare.
- UI: /agents page now renders components/agent-docs.tsx (copyable curl + JS
  snippets, endpoint docs, provenance table).
- Check PARTIAL: auth rejection verified (no key -> 401 Missing, wrong key ->
  401 Invalid). Valid key path stores on Walrus + builds tx + reaches signing,
  then stops at "agent address has no SUI to pay gas" because the agent address
  is not yet funded. Full success requires funding the address above.

### Phase 7 - MCP wrapper (DONE)
- mcp/sigil-mcp.ts: an MCP server (stdio) exposing two tools, sigil_sign and
  sigil_verify, built on @modelcontextprotocol/sdk 1.21 + zod. It is a thin
  client over /api/sign and /api/verify, so all Walrus + Tatum logic stays in
  one place and the MCP path reuses the agent API key.
- Config: SIGIL_BASE_URL (default http://localhost:3000), SIGIL_AGENT_KEY
  (falls back to AGENT_API_KEY). Run with: npm run mcp.
- Check PASSED (startup): server boots over stdio and logs "Sigil MCP server
  ready" to stderr (stdout reserved for the MCP channel). Full tool round trip
  pends the agent address funding, same blocker as Phase 6.

### Pending blockers / asks
- (Phase 4) User to do one live wallet sign at /app on testnet (popup only).
- (Phase 6) Fund the agent address 0x9a8215f6...b405d with testnet SUI so
  /api/sign can complete a real attestation.
- (Phase 8) Mainnet wallet funded with SUI and WAL.
