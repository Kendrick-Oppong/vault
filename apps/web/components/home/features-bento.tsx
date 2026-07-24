"use client";

import { motion } from "motion/react";
import { Reveal } from "../shared/reveal";
import { Zap, ShieldCheck, Globe, Layers, Cpu, Play } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Feature {
  icon: typeof Zap;
  title: string;
  description: string;
  tag: string;
  span: string;
}


const FEATURES: Feature[] = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "Powered by yt-dlp with automatic updates, so it always keeps pace with the latest sites and formats.",
    tag: "1000+ sites",
    span: "lg:col-span-2 lg:row-span-2"
  },
  {
    icon: Cpu,
    title: "FFmpeg Processing",
    description: "Format conversion, metadata embedding, and subtitle extraction, built in.",
    tag: "all-in-one",
    span: "lg:col-span-2"
  },
  {
    icon: Globe,
    title: "Cross-Platform",
    description: "Native apps for Windows, macOS, and Linux.",
    tag: "everywhere",
    span: "lg:col-span-1"
  },
  {
    icon: ShieldCheck,
    title: "Privacy First",
    description: "No telemetry, no account. Everything stays on your machine.",
    tag: "zero tracking",
    span: "lg:col-span-1"
  },
  {
    icon: Play,
    title: "Playlist Support",
    description: "Queue entire playlists with configurable batch limits.",
    tag: "batch downloads",
    span: "lg:col-span-2"
  },
  {
    icon: Layers,
    title: "Modern Experience",
    description: "Dark mode, keyboard shortcuts, and library organization out of the box.",
    tag: "beautiful UI",
    span: "lg:col-span-2"
  }
];

const SITES = [
  "youtube.com",
  "vimeo.com",
  "twitch.tv",
  "soundcloud.com",
  "tiktok.com",
  "dailymotion.com",
  "instagram.com",
  "reddit.com"
];

// ─── Site marquee (hero card signature) ────────────────────────────────────────

function SiteMarquee() {
  const loop = [...SITES, ...SITES];
  return (
    <div className="mt-auto overflow-hidden border-border border-t pt-4">
      <motion.div
        animate={{ x: ["0%", "-50%"] }}
        className="flex w-max gap-2"
        transition={{ duration: 22, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
      >
        {loop.map((site, i) => (
          <span
            className="shrink-0 rounded-full border border-border bg-background/40 px-2.5 py-1 font-mono text-[10px] text-muted-foreground"
            key={`${site}-${i}`}
          >
            {site}
          </span>
        ))}
      </motion.div>
    </div>
  );
}


function FeatureCard({ feature, index }: Readonly<{ feature: Feature; index: number }>) {
  const Icon = feature.icon;
  const isHero = index === 0;

  return (
    <motion.div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-sm transition-colors hover:border-primary/30 ${feature.span}`}
      initial={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ once: true, margin: "-80px" }}
      whileHover={{ y: -3 }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      {/* Ambient corner glow on hover */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-hover:from-primary/[0.06]" />

      <div className="relative flex items-start justify-between gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/8">
          <Icon
            className={isHero ? "size-6 text-primary" : "size-5 text-primary"}
            strokeWidth={1.75}
          />
        </span>
        <span className="pt-1 text-right font-mono text-[10px] text-primary/60 tracking-tight">
          {feature.tag}
        </span>
      </div>

      <h3
        className={`relative mt-5 font-semibold text-foreground ${isHero ? "text-2xl" : "text-lg"}`}
      >
        {feature.title}
      </h3>
      <p
        className={`relative mt-2 text-muted-foreground leading-relaxed ${isHero ? "text-[15px]" : "text-sm"}`}
      >
        {feature.description}
      </p>

      {isHero && (
        <div className="relative mt-6 flex flex-1 flex-col justify-end">
          <SiteMarquee />
        </div>
      )}

      <div className="relative mt-5 h-px w-full bg-gradient-to-r from-primary/40 via-primary/10 to-transparent" />
    </motion.div>
  );
}


export function FeaturesBento() {
  return (
    <Reveal className="py-32">
      <section className="container-shelf" id="features">
        <div className="mb-20 text-center">
          <div className="section-eyebrow mx-auto mb-5 w-fit">
            <div className="eyebrow-line" />
            <span className="eyebrow-text">Features</span>
          </div>
          <h2 className="mb-6 font-bold text-4xl tracking-tight md:text-5xl lg:text-6xl">
            Built for
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {" "}
              power users
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground text-xl">
            Every feature designed with intention. No bloat, no compromises.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-flow-dense lg:auto-rows-[190px] lg:grid-cols-4">
          {FEATURES.map((feature, i) => (
            <FeatureCard feature={feature} index={i} key={feature.title} />
          ))}
        </div>
      </section>
    </Reveal>
  );
}
