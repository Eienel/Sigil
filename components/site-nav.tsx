"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { List, X } from "@phosphor-icons/react";
import { WaxSeal } from "./wax-seal";
import { ThemeToggle } from "./theme-toggle";
import { Proximity } from "./proximity";
import { ButtonLink } from "./button";

const LINKS = [
  { href: "/app", label: "Sign" },
  { href: "/verify", label: "Verify" },
  { href: "/agents", label: "For agents" },
  { href: "/registry", label: "Registry" },
];

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close the mobile menu on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile sheet is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-paper/85 backdrop-blur-md glass">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-5">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="Sigil home"
        >
          <WaxSeal size={28} />
          <span className="font-mono text-[15px] font-medium tracking-tight text-ink">
            Sigil
          </span>
        </Link>

        {/* Desktop links with proximity hover */}
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
          <ButtonLink href="/app" size="sm" className="hidden sm:inline-flex">
            Open app
          </ButtonLink>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline text-ink transition-colors hover:bg-surface sm:hidden"
          >
            {open ? (
              <X size={18} weight="regular" />
            ) : (
              <List size={18} weight="regular" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile sheet, portaled to body so the header backdrop-filter does not
          trap it in the wrong compositing layer (which made it see-through). */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-x-0 bottom-0 top-16 z-30 sm:hidden"
                style={{ backgroundColor: "var(--bg)" }}
              >
            <motion.ul
              className="flex flex-col gap-1 px-4 py-4"
              initial="hidden"
              animate="show"
              variants={{
                show: { transition: { staggerChildren: 0.04 } },
              }}
            >
              {LINKS.map((l) => {
                const active = pathname === l.href;
                return (
                  <motion.li
                    key={l.href}
                    variants={{
                      hidden: { opacity: 0, y: 8 },
                      show: { opacity: 1, y: 0, transition: SPRING },
                    }}
                  >
                    <Link
                      href={l.href}
                      className={`flex items-center justify-between rounded-xl border px-4 py-4 text-base ${
                        active
                          ? "border-hairline bg-surface text-ink"
                          : "border-transparent text-muted"
                      }`}
                    >
                      {l.label}
                      {active && <span className="h-2 w-2 rounded-full bg-wax" />}
                    </Link>
                  </motion.li>
                );
              })}
              <motion.li
                className="mt-2"
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  show: { opacity: 1, y: 0, transition: SPRING },
                }}
              >
                <ButtonLink href="/app" size="lg" full>
                  Open app
                </ButtonLink>
              </motion.li>
            </motion.ul>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
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
