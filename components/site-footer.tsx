import Link from "next/link";
import { GithubLogo } from "@phosphor-icons/react/dist/ssr";
import { WaxSeal } from "./wax-seal";

const REPO_URL = "https://github.com/Eienel/Sigil";

/*
  A quiet footer. The wax seal mark, the one line idea, and a small link to the
  source repo. Underline-wipe on the repo link to match the nav.
*/
export function SiteFooter() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm sm:flex-row sm:px-6">
        <div className="flex items-center gap-2.5 text-muted">
          <WaxSeal size={22} />
          <span className="font-mono text-ink">Sigil</span>
          <span className="hidden sm:inline">
            Stored on Walrus, attested on Sui.
          </span>
        </div>

        <Link
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-1.5 text-muted transition-colors hover:text-ink"
        >
          <GithubLogo size={16} weight="regular" />
          <span className="relative">
            View source
            <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-200 group-hover:scale-x-100" />
          </span>
        </Link>
      </div>
    </footer>
  );
}
