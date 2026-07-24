"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { Badge } from "@vault/ui/components/badge";
import { Button } from "@vault/ui/components/button";
import { Download, Github } from "lucide-react";

const fadeUp = (delay: number) => ({
  initial: false,
  animate: { opacity: 1, y: 0 },
  transition: {
    duration: 0.8,
    delay,
    ease: [0.16, 1, 0.3, 1] as [number, number, number, number]
  }
});

function BadgePulse() {
  return (
    <motion.span
      animate={{
        boxShadow: [
          "0 0 0 0 color-mix(in srgb, var(--color-primary) 50%, transparent)",
          "0 0 0 6px transparent",
          "0 0 0 0 color-mix(in srgb, var(--color-primary) 50%, transparent)"
        ]
      }}
      className="inline-block size-1.5 shrink-0 rounded-full bg-primary"
      transition={{
        duration: 2,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut"
      }}
    />
  );
}

export function HeroSection() {
  return (
    <section className="relative flex flex-col items-center justify-center overflow-hidden px-5 pt-28 pb-20 text-center">
      {/* Radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 left-1/2 h-[600px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse,color-mix(in_srgb,var(--color-primary)_7%,transparent)_0%,transparent_60%)]"
      />
      {/* Grid */}
      <div
        aria-hidden
        className="mask-[radial-gradient(ellipse_70%_50%_at_50%_0%,black_0%,transparent_100%)] pointer-events-none absolute inset-0 bg-[linear-gradient(color-mix(in_srgb,var(--color-foreground)_3%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_srgb,var(--color-foreground)_2%,transparent)_1px,transparent_1px)]"
        style={{
          backgroundSize: "72px 72px"
        }}
      />

      <div className="relative z-10 flex flex-col items-center">
        <motion.h1
          {...fadeUp(0.08)}
          className="mt-8 mb-6 max-w-[860px] font-bold text-[clamp(3.2rem,7.5vw,6.2rem)] leading-none tracking-[-0.045em]"
        >
          Fast, modern
          <br />
          <span className="text-transparent [&]:[-webkit-text-stroke:1.5px_var(--hero-stroke)]">
            {"YouTube downloader"}
          </span>
          <br />
        </motion.h1>

        <motion.p
          {...fadeUp(0.16)}
          className="mb-10 max-w-[480px] text-balance font-medium text-[1.05rem] text-muted-foreground leading-[1.85]"
        >
          Download videos, audio, and playlists with ease. Built with Electron, yt-dlp & FFmpeg.
        </motion.p>

        <motion.div {...fadeUp(0.22)} className="flex flex-wrap items-center justify-center gap-3">
          <Button
            nativeButton={false}
            render={(props) => (
              <Link {...props} href="#download">
                <Download className="mr-2 h-4 w-4" />
                Download Vault
              </Link>
            )}
            className="h-auto flex-1 rounded-xl px-7 py-3 text-sm hover:-translate-y-0.5 hover:shadow-[0_8px_30px_color-mix(in_srgb,var(--color-primary)_25%,transparent)] hover:brightness-110"
          />
          <Button
            nativeButton={false}
            render={(props) => (
              <Link
                {...props}
                href="https://github.com/Kendrick-Oppong/vault"
                rel="noopener noreferrer"
                target="_blank"
              >
                <Github className="mr-2 h-4 w-4" />
                View on GitHub
              </Link>
            )}
            className="h-auto flex-1 rounded-xl border border-foreground/20! px-7 py-3 text-sm hover:-translate-y-0.5"
            variant="outline"
          />
        </motion.div>
      </div>
    </section>
  );
}
