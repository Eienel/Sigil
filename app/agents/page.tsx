import { AgentDocs } from "@/components/agent-docs";
import { AgentKeyGen } from "@/components/agent-key-gen";

export const metadata = {
  title: "For agents, Sigil",
};

export default function AgentsPage() {
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-3xl px-5 pb-24 pt-28 sm:px-6">
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-wider text-muted">
          For agents
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-ink sm:text-3xl">
          Sign and verify from code
        </h1>
        <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-muted">
          An agent presents an API key and content. Sigil stores it on Walrus
          and writes a tamper proof attestation on Sui through Tatum, signed by
          the agent address mapped to your key. No wallet popup, just an HTTP
          call.
        </p>
      </header>
      <div className="mb-8">
        <AgentKeyGen />
      </div>
      <AgentDocs />
    </main>
  );
}
