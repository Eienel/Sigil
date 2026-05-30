"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { WaxSeal } from "./wax-seal";
import { ThemeToggle } from "./theme-toggle";
import { Proximity } from "./proximity";

const LINKS = [
  { href: "/app", label: "Sign" },
  { href: "/verify", label: "Verify" },
  { href: "/agents", label: "For agents" },
  { href: "/registry", label: "Registry" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-paper/85 backdrop-blur-md glass">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Sigil home">
          <WaxSeal size={28} />
          <span className="font-mono text-[15px] font-medium tracking-tight text-ink">
            Sigil
          </span>
        </Link>

        <Proximity className="hidden items-center gap-1 sm:flex">
          {LINKS.map((l) => (
            <NavLink
              key={l.href}
              href={l.href}
              label={l.label}
              active={pathname === l.href}
            />
          ))}
        </Proximity>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/app"
            className="rounded-full bg-wax px-4 py-2 text-sm font-medium transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{ color: "var(--bg)" }}
          >
            Open app
          </Link>
        </div>
      </nav>
    </header>
  );
}

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className="group relative px-3 py-2 text-sm text-muted transition-colors hover:text-ink"
    >
      <span className={active ? "text-ink" : undefined}>{label}</span>
      {/* underline wipe */}
      <span className="pointer-events-none absolute inset-x-3 bottom-1.5 h-px overflow-hidden">
        <motion.span
          className="block h-full origin-left bg-wax"
          initial={false}
          animate={{ scaleX: active ? 1 : 0 }}
          whileHover={{ scaleX: 1 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        />
      </span>
    </Link>
  );
}
