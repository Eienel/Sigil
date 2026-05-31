import { Suspense } from "react";
import { VerifyFlow } from "@/components/verify-flow";
import { BackHome } from "@/components/back-home";

export const metadata = {
  title: "Verify, Sigil",
};

export default function VerifyPage() {
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-2xl px-5 pb-24 pt-28 sm:px-6">
      <header className="mb-8">
        <BackHome />
        <p className="font-mono text-xs uppercase tracking-wider text-muted">
          Check provenance
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-ink sm:text-3xl">
          Verify a file or a Sigil ID
        </h1>
        <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-muted">
          Drop the file to recompute its sha256 and compare it against the
          record on Sui, read through Tatum. Or paste a Sigil ID to look up the
          attestation directly.
        </p>
      </header>
      <Suspense>
        <VerifyFlow />
      </Suspense>
    </main>
  );
}
