"use client";

import { motion } from "motion/react";
import { Reveal } from "../shared/reveal";
import { Button } from "@vault/ui/components/button";
import { Download, Monitor, Apple, Terminal, Bell } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Platform {
  name: string;
  icon: typeof Monitor;
  version: string;
  status: "available" | "soon";
  href?: string;
}

const VERSION = "0.1.0";
const RELEASE_TAG = `v${VERSION}`;

const PLATFORMS: Platform[] = [
  {
    name: "Windows",
    icon: Monitor,
    version: RELEASE_TAG,
    status: "available",
    href: `https://github.com/Kendrick-Oppong/vault/releases/download/${RELEASE_TAG}/Vault-${VERSION}-Windows-Setup.exe`
  },
  {
    name: "Linux",
    icon: Terminal,
    version: RELEASE_TAG,
    status: "available",
    href: `https://github.com/Kendrick-Oppong/vault/releases/download/${RELEASE_TAG}/Vault-${VERSION}-Linux-Installer.AppImage`
  },
  {
    name: "macOS",
    icon: Apple,
    version: RELEASE_TAG,
    status: "soon"
  }
];

function PlatformCard({ platform, index }: Readonly<{ platform: Platform; index: number }>) {
  const Icon = platform.icon;
  const isSoon = platform.status === "soon";

  return (
    <motion.div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border p-8 backdrop-blur-sm transition-colors ${
        isSoon
          ? "border-dashed border-border/70 bg-card/30"
          : "border-border bg-card/60 hover:border-primary/30"
      }`}
      initial={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ once: true, margin: "-80px" }}
      whileHover={isSoon ? undefined : { y: -3 }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`flex size-14 shrink-0 items-center justify-center rounded-2xl border ${
            isSoon ? "border-border bg-muted/10" : "border-primary/25 bg-primary/8"
          }`}
        >
          <Icon
            className={isSoon ? "size-7 text-muted-foreground" : "size-7 text-primary"}
            strokeWidth={1.75}
          />
        </span>
        <span
          className={`pt-1 font-mono text-[10px] tracking-tight ${
            isSoon ? "text-muted-foreground/70" : "text-primary/60"
          }`}
        >
          {isSoon ? "// coming soon" : `// ${platform.version}`}
        </span>
      </div>

      <h3 className="mt-6 font-bold text-2xl text-foreground">{platform.name}</h3>
      <p className="mt-1.5 text-muted-foreground text-sm">
        {isSoon ? "Universal build, in progress." : "Native build for this platform."}
      </p>

      <div className="mt-8">
        {isSoon ? (
          <Button
            className="h-10 w-full cursor-not-allowed text-base font-semibold opacity-60"
            disabled
            nativeButton
          >
            <Bell className="mr-2 h-4 w-4" />
            Soon
          </Button>
        ) : (
          <Button
            className="h-10 w-full text-base font-semibold transition-transform hover:scale-[1.02]"
            nativeButton={false}
            render={(props) => (
              <a {...props} href={platform.href} rel="noopener noreferrer" target="_blank">
                <Download className="mr-2 h-4 w-4" />
                Download
              </a>
            )}
          />
        )}
      </div>

      <div
        className={`mt-6 h-px w-full bg-gradient-to-r to-transparent ${
          isSoon ? "from-border" : "from-primary/40 via-primary/10"
        }`}
      />
    </motion.div>
  );
}

export function DownloadSection() {
  return (
    <Reveal className="py-32">
      <section className="container-shelf" id="download">
        <div className="mb-20 text-center">
          <div className="section-eyebrow mx-auto mb-5 w-fit">
            <div className="eyebrow-line" />
            <span className="eyebrow-text">Download</span>
          </div>
          <h2 className="mb-6 font-bold text-4xl tracking-tight md:text-5xl lg:text-6xl">
            Download for your
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {" "}
              platform
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground text-xl">
            Native applications optimized for each operating system. No installation required.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {PLATFORMS.map((platform, i) => (
            <PlatformCard index={i} key={platform.name} platform={platform} />
          ))}
        </div>

        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-muted/50 px-4 py-2 font-mono text-muted-foreground text-xs">
            <span className="size-2 rounded-full bg-success" />
            <span>64-bit processor</span>
          </div>
        </motion.div>
      </section>
    </Reveal>
  );
}
