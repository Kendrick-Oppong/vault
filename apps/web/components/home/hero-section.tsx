"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { Button } from "@vault/ui/components/button";
import { Download, Github } from "lucide-react";

const STATS = [
  { value: "1000+", label: "Sites supported" },
  { value: "Zero", label: "Telemetry" }
];

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5">
      {/* Background */}
      <div className="absolute inset-0 bg-background">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.4, 0.25] }}
          className="-translate-x-1/2 absolute top-1/3 left-1/2 size-[420px] rounded-full bg-primary/20 blur-3xl"
          transition={{ duration: 9, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
        <motion.div
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.12, 0.25, 0.12] }}
          className="-translate-x-1/2 absolute bottom-1/4 left-1/2 size-96 rounded-full bg-primary/15 blur-3xl"
          transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
      </div>

      {/* Canvas dot-grid texture */}
      <div
        className="absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
        style={{
          backgroundImage:
            "radial-gradient(color-mix(in srgb, var(--color-border) 60%, transparent) 1px, transparent 1px)",
          backgroundSize: "26px 26px"
        }}
      />

      {/* Content */}
      <div className="container-shelf relative z-10">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              className="size-2 rounded-full bg-primary"
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            />
            <span className="font-mono font-medium text-primary text-sm tracking-wide">
              v0.1.0 · now available
            </span>
          </motion.div>

          <motion.h1
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 font-bold text-5xl leading-tight tracking-tight md:text-6xl lg:text-7xl"
            initial={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="text-foreground">Download</span>{" "}
            <motion.span
              animate={{ backgroundPosition: ["0% 50%", "200% 50%"] }}
              className="bg-gradient-to-r from-primary via-primary/50 to-primary bg-clip-text text-transparent"
              style={{ backgroundSize: "200% 100%" }}
              transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            >
              anything.
            </motion.span>
            <br />
            <span className="text-4xl text-muted-foreground md:text-5xl lg:text-6xl">
              Anywhere.
            </span>
          </motion.h1>

          <motion.p
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 max-w-lg text-lg text-muted-foreground leading-relaxed md:text-xl"
            initial={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Download videos and audio from supported sites with a clean desktop interface powered by
            yt-dlp and FFmpeg.
          </motion.p>

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 flex flex-col gap-4 sm:flex-row"
            initial={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Button
              className="h-13 rounded-full px-8 text-base font-semibold shadow-primary/20 shadow-lg transition-transform hover:scale-105"
              nativeButton={false}
              render={(props) => (
                <Link {...props} href="#download">
                  <Download className="mr-2 h-5 w-5" />
                  Download Vault
                </Link>
              )}
              size="lg"
            />
            <Button
              className="h-14 px-8 rounded-full text-base font-semibold transition-transform hover:scale-105"
              nativeButton={false}
              render={(props) => (
                <Link
                  {...props}
                  href="https://github.com/Kendrick-Oppong/vault"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <Github className="mr-2 h-5 w-5" />
                  View on GitHub
                </Link>
              )}
              size="lg"
              variant="outline"
            />
          </motion.div>

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="mt-14 flex items-center gap-8 border-border/50 border-t pt-8"
            initial={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            {STATS.map((stat, i) => (
              <div className="flex items-center gap-8" key={stat.label}>
                {i > 0 && <span className="h-8 w-px bg-border" />}
                <div className="text-center">
                  <div className="font-bold font-mono text-foreground text-2xl">{stat.value}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ opacity: 1 }}
        className="-translate-x-1/2 absolute bottom-8 left-1/2"
        initial={{ opacity: 0 }}
        transition={{ delay: 1.2, duration: 1 }}
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          className="flex h-10 w-6 justify-center rounded-full border-2 border-border/50 pt-2"
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
        >
          <div className="h-2 w-1 rounded-full bg-primary/50" />
        </motion.div>
      </motion.div>
    </section>
  );
}
