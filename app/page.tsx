import Link from "next/link";
import { Feather, Robot, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { InlineDemo } from "@/components/inline-demo";
import { Reveal } from "@/components/reveal";
import { ButtonLink } from "@/components/button";
import { HeroCodeArt } from "@/components/hero-code-art";
import { AsciiConverter } from "@/components/ascii-converter";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-5">
      {/* Hero, split layout, left aligned */}
      <section className="relative grid min-h-[calc(100dvh-4rem)] items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-0">
        <HeroCodeArt />
        <div>
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-3 py-1 font-mono text-xs text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-wax" />
              Stored on Walrus, attested on Sui
            </span>
          </Reveal>

          <Reveal delay={0.05}>
            <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Leave a tamper proof mark on everything you create.
            </h1>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
              Sigil stamps content with a verifiable seal. People sign with a
              wallet, agents sign with a key. Anyone can check whether a file is
              authentic, tampered, or unknown.
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <ButtonLink
                href="/app"
                size="lg"
                className="w-full sm:w-auto"
                hoverLabel={
                  <>
                    Press your seal
                    <ArrowRight size={16} weight="regular" />
                  </>
                }
              >
                Sign something
                <ArrowRight size={16} weight="regular" />
              </ButtonLink>
              <ButtonLink
                href="/verify"
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
                hoverLabel="Check authenticity"
              >
                Verify a file
              </ButtonLink>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.2}>
          <InlineDemo />
        </Reveal>
      </section>

      {/* Two lanes */}
      <section className="grid gap-4 pb-16 sm:grid-cols-2">
        <Lane
          href="/app"
          icon={<Feather size={22} weight="regular" />}
          eyebrow="For people"
          title="Sign with your wallet"
          body="Connect, drop a file, choose a provenance type, and press your seal. The attestation lands on chain with your address."
        />
        <Lane
          href="/agents"
          icon={<Robot size={22} weight="regular" />}
          eyebrow="For agents"
          title="Sign with an API key"
          body="One endpoint stores to Walrus and writes the attestation with a server side key. Each key maps to one Sui address."
        />
      </section>

      {/* Compact image to ASCII tool, last thing on the page */}
      <section className="border-t border-hairline py-10 pb-24">
        <Reveal>
          <AsciiConverter />
        </Reveal>
      </section>
    </main>
  );
}

function Lane({
  href,
  icon,
  eyebrow,
  title,
  body,
}: {
  href: string;
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-hairline bg-surface p-6 transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline text-wax">
          {icon}
        </span>
        <span className="font-mono text-xs uppercase tracking-wider text-muted">
          {eyebrow}
        </span>
      </div>
      <h3 className="mt-4 text-xl font-medium text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
      <span className="mt-4 flex items-center gap-1.5 text-sm font-medium text-wax">
        Open
        <ArrowRight
          size={15}
          weight="regular"
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </span>
    </Link>
  );
}
