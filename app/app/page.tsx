import { SignFlow } from "@/components/sign-flow";

export const metadata = {
  title: "Sign with your wallet, Sigil",
};

export default function AppPage() {
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-2xl px-5 pb-24 pt-28 sm:px-6">
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-wider text-muted">
          For people
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-ink sm:text-3xl">
          Sign with your wallet
        </h1>
        <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-muted">
          Drop a file, choose how it was made, and press your seal. The content
          is stored on Walrus and a tamper proof attestation is written on Sui
          through Tatum.
        </p>
      </header>
      <SignFlow />
    </main>
  );
}
