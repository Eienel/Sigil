import { RegistryFeed } from "@/components/registry-feed";

export const metadata = {
  title: "Registry, Sigil",
};

export default function RegistryPage() {
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-3xl px-5 pb-24 pt-28 sm:px-6">
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-wider text-muted">
          Recent activity
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-ink sm:text-3xl">
          The registry
        </h1>
        <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-muted">
          A live feed of recent attestations, read from Sui events through
          Tatum. Every entry points at content stored on Walrus.
        </p>
      </header>
      <RegistryFeed />
    </main>
  );
}
