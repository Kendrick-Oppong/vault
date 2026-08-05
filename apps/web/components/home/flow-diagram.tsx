"use client";

import { motion } from "motion/react";
import { Reveal } from "../shared/reveal";
import { Link2, SlidersHorizontal, Cpu, FolderCheck, Download } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Stage {
  icon: typeof Link2;
  index: string;
  detail: string;
  title: string;
  tag: string;
}

// ─── Data ──────────────────────────────────────────────────────────────────────

const STAGES: Stage[] = [
  {
    icon: Link2,
    index: "01",
    detail: "Paste a link or search — clipboard URLs are detected automatically.",
    title: "Paste or Search",
    tag: "source"
  },
  {
    icon: SlidersHorizontal,
    index: "02",
    detail: "One-click presets, or fine-tune container, codec, and bitrate.",
    title: "Choose Format",
    tag: "config"
  },
  {
    icon: Cpu,
    index: "03",
    detail: "Downloads run concurrently while metadata, subs, and SponsorBlock apply.",
    title: "Queue & Process",
    tag: "live progress"
  },
  {
    icon: FolderCheck,
    index: "04",
    detail: "Lands in your library, ready to stream in the built-in player.",
    title: "Save & Play",
    tag: "output"
  }
];

// ─── Node (circle on the spine) ────────────────────────────────────────────────

function StageNode({ stage }: Readonly<{ stage: Stage }>) {
  const Icon = stage.icon;
  return (
    <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-background shadow-sm">
      <span className="absolute inset-0 rounded-full bg-primary/8" />
      <Icon className="relative size-4.5 text-primary" strokeWidth={1.75} />
    </span>
  );
}

// ─── Card ──────────────────────────────────────────────────────────────────────

function StageCard({ stage, align }: Readonly<{ stage: Stage; align: "left" | "right" }>) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border border-border bg-card/70 p-5 backdrop-blur-sm transition-colors hover:border-primary/30 ${
        align === "right" ? "md:text-right" : ""
      }`}
    >
      <div className={`flex items-center gap-2 ${align === "right" ? "md:flex-row-reverse" : ""}`}>
        <span className="font-mono text-[9px] text-muted-foreground/60 tracking-widest">
          {stage.index}
        </span>
        <span className="h-px flex-1 bg-border" />
        <span className="font-mono text-[9px] text-primary/60">{stage.tag}</span>
      </div>
      <h3 className="mt-3 font-semibold text-foreground text-base">{stage.title}</h3>
      <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed">{stage.detail}</p>
    </div>
  );
}

// ─── Timeline ──────────────────────────────────────────────────────────────────

function FlowTimeline() {
  return (
    <div className="relative py-4">
      {/* Spine */}
      <div className="absolute top-0 bottom-0 left-6 w-px bg-border md:left-1/2" />

      {/* Traveling pulse along the spine */}
      <motion.div
        animate={{ top: ["2%", "98%"] }}
        className="-translate-x-1/2 absolute left-6 size-2 rounded-full bg-primary shadow-[0_0_10px_var(--color-primary)] md:left-1/2"
        transition={{ duration: 5, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
      />

      <div className="flex flex-col gap-10 md:gap-6">
        {STAGES.map((stage, i) => {
          const align = i % 2 === 0 ? "left" : "right";
          return (
            <motion.div
              className={`relative flex items-start gap-5 md:items-center ${
                align === "right" ? "md:flex-row-reverse" : ""
              }`}
              initial={{ opacity: 0, y: 24 }}
              key={stage.index}
              transition={{ duration: 0.5, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true, margin: "-60px" }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              {/* Node — pinned to spine */}
              <div className="z-10 md:absolute md:left-1/2 md:-translate-x-1/2">
                <StageNode stage={stage} />
              </div>

              {/* Card */}
              <div className="min-w-0 flex-1 pl-1 md:w-1/2 md:flex-none md:pl-0">
                <div className={align === "right" ? "md:pl-10" : "md:pr-10"}>
                  <StageCard align={align} stage={stage} />
                </div>
              </div>

              {/* Spacer for the opposite column on desktop */}
              <div className="hidden md:block md:w-1/2" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function FlowDiagram() {
  return (
    <Reveal className="py-28">
      <section className="container-shelf" id="how-it-works">
        <div className="mb-14 text-center">
          <div className="section-eyebrow mx-auto mb-5 w-fit">
            <div className="eyebrow-line" />
            <span className="eyebrow-text">How it works</span>
          </div>
          <h2 className="mb-4 font-bold text-4xl tracking-tight md:text-5xl lg:text-6xl">
            One link in,
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {" "}
              one file out
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground text-xl">
            No command line to learn. Vault runs the pipeline for you.
          </p>
        </div>

        <div className="mx-auto max-w-3xl">
          <FlowTimeline />
        </div>

        <motion.div
          className="mt-14 text-center"
          initial={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <a
            href="#download"
            className="inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/10 px-6 py-3 transition-all hover:border-primary/40 hover:bg-primary/15"
          >
            <Download className="size-5 text-primary" />
            <span className="font-medium text-primary">Ready to start? Download Vault now</span>
          </a>
        </motion.div>
      </section>
    </Reveal>
  );
}
