import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

// Shared placeholder for routes that are filled in later build phases.
export function PageStub({
  title,
  body,
  phase,
}: {
  title: string;
  body: string;
  phase: string;
}) {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-6xl flex-col justify-center px-5 py-16">
      <span className="font-mono text-xs uppercase tracking-wider text-muted">
        {phase}
      </span>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        {title}
      </h1>
      <p className="mt-4 max-w-md text-muted">{body}</p>
      <Link
        href="/"
        className="mt-8 flex w-fit items-center gap-2 text-sm font-medium text-wax"
      >
        <ArrowLeft size={15} weight="regular" />
        Back home
      </Link>
    </main>
  );
}
