"use client";

import { Menu, X, MoveUpRight, Download } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { VaultLogo } from "./vault-logo";

const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works", external:false },
  { label: "Features", href: "#features", external:false },
  {
    label: "GitHub",
    href: "https://github.com/Kendrick-Oppong/vault",
    external: true
  }
] as const;

export function Header() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="fixed top-0 right-0 left-0 z-50">
        <nav className="flex h-14 items-center justify-between bg-background/80 px-5 backdrop-blur-xl">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-foreground no-underline"
          >
            <VaultLogo className="h-6 w-6 text-primary" />
            <span>Vault</span>
          </Link>

          {/* Desktop navigation */}
          <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-0.5 md:flex">
            {NAV_LINKS.map(({ label, href, external }) =>
              external ? (
                <Link
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whitespace-nowrap rounded-full border border-transparent px-3.5 py-1.5 font-medium text-[13px] text-muted-foreground no-underline transition-all hover:border-border hover:text-foreground"
                >
                  {label}
                </Link>
              ) : (
                <a
                  key={label}
                  href={href}
                  className="whitespace-nowrap rounded-full border border-transparent px-3.5 py-1.5 font-medium text-[13px] text-muted-foreground no-underline transition-all hover:border-border hover:text-foreground"
                >
                  {label}
                </a>
              )
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <a
              href="#download"
              className="hidden whitespace-nowrap rounded-full bg-primary px-4 py-1.5 font-semibold text-[12.5px] text-primary-foreground tracking-[0.01em] no-underline transition-all hover:brightness-110 md:flex"
            >
              Download
            </a>

            <button
              type="button"
              aria-controls="mobile-nav"
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground md:hidden"
              onClick={() => setOpen((v) => !v)}
            >
              <AnimatePresence initial={false} mode="wait">
                {open ? (
                  <motion.span
                    key="close"
                    initial={{ opacity: 0, rotate: 45 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: -45 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X className="size-4" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="open"
                    initial={{ opacity: 0, rotate: -45 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 45 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Menu className="size-4" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </nav>

        {/* Bottom border */}
        <div className="relative h-px w-full">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-border-strong to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
          <div
            aria-hidden
            className="absolute top-0 left-1/2 h-24 w-96 -translate-x-1/2 rounded-full opacity-20"
            style={{
              background:
                "radial-gradient(ellipse at top, var(--color-primary) 0%, transparent 70%)"
            }}
          />
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-nav"
            className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-background pt-15 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <nav className="flex flex-1 flex-col items-center justify-center gap-1 px-5">
              {NAV_LINKS.map(({ label, href, external }, i) => (
                <motion.div
                  key={label}
                  className="w-full"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.05 + i * 0.06,
                    duration: 0.35,
                    ease: [0.16, 1, 0.3, 1]
                  }}
                >
                  {external ? (
                    <Link
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-between rounded-2xl border border-transparent p-3 font-semibold text-base tracking-[-0.02em] no-underline transition-all hover:border-border hover:bg-card"
                    >
                      {label}
                      <MoveUpRight size={18} />
                    </Link>
                  ) : (
                    <a
                      href={href}
                      onClick={() => setOpen(false)}
                      className="flex w-full items-center justify-between rounded-2xl border border-transparent p-3 font-semibold text-base tracking-[-0.02em] no-underline transition-all hover:border-border hover:bg-card"
                    >
                      {label}
                      <MoveUpRight size={18} />
                    </a>
                  )}
                </motion.div>
              ))}
            </nav>

            <motion.div
              className="border-t border-border p-5"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.3,
                duration: 0.35,
                ease: [0.16, 1, 0.3, 1]
              }}
            >
              <a
                href="#download"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-semibold text-[14px] text-primary-foreground tracking-[0.01em] no-underline transition-all hover:brightness-110"
              >
                <Download className="size-4" />
                Download Vault
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
