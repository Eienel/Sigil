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

### Pending blockers / asks
- (Phase 0 end) Tatum API key + funded testnet Sui address.
- (Phase 6) How to generate the agent keypair.
- (Phase 8) Mainnet wallet funded with SUI and WAL.
