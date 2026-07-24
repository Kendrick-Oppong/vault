"use client";

import { motion } from "motion/react";
import { Reveal } from "../shared/reveal";
import { Link2, SlidersHorizontal, Cpu, FolderCheck, Download, ArrowRight } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Stage {
  icon: typeof Link2;
  index: string;
  command: string;
  title: string;
  tag: string;
  x: number;
  y: number;
}

// ─── Layout ────────────────────────────────────────────────────────────────────

const CARD_W = 200;
const CARD_H = 124;
const CANVAS_W = 960;
const CANVAS_H = 250;

const STAGES: Stage[] = [
  {
    icon: Link2,
    index: "01",
    command: "vault fetch <url>",
    title: "Paste URL",
    tag: "source",
    x: 15,
    y: 70
  },
  {
    icon: SlidersHorizontal,
    index: "02",
    command: "vault --format mp4",
    title: "Choose Format",
    tag: "config",
    x: 260,
    y: 15
  },
  {
    icon: Cpu,
    index: "03",
    command: "vault run",
    title: "Process",
    tag: "encode",
    x: 505,
    y: 70
  },
  {
    icon: FolderCheck,
    index: "04",
    command: "vault save",
    title: "Save",
    tag: "output",
    x: 750,
    y: 15
  }
];

function rightCenter(s: Stage) {
  return { x: s.x + CARD_W, y: s.y + CARD_H / 2 };
}
function leftCenter(s: Stage) {
  return { x: s.x, y: s.y + CARD_H / 2 };
}
function buildArrow(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = (to.x - from.x) / 2;
  return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
}

const EDGES = STAGES.slice(0, -1).map((s, i) =>
  buildArrow(rightCenter(s), leftCenter(STAGES[i + 1] as Stage))
);

// ─── Stage card ───────────────────────────────────────────────────────────────

function StageCard({ stage, index }: Readonly<{ stage: Stage; index: number }>) {
  const Icon = stage.icon;

  return (
    <motion.div
      className="absolute flex flex-col overflow-hidden rounded-2xl border border-border bg-card/70 px-4 pt-3.5 pb-3 backdrop-blur-sm transition-colors hover:border-primary/30"
      initial={{ opacity: 0, y: 12 }}
      style={{ left: stage.x, top: stage.y, width: CARD_W, height: CARD_H }}
      transition={{ delay: index * 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ once: true, margin: "-60px" }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start justify-between">
        <span className="flex size-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/8">
          <Icon className="size-4 text-primary" strokeWidth={1.75} />
        </span>
        <div className="flex flex-col items-end gap-1">
          <span className="font-mono text-[9px] text-muted-foreground/60 tracking-widest">
            {stage.index}
          </span>
          <span className="font-mono text-[9px] text-primary/60">{stage.tag}</span>
        </div>
      </div>

      <h3 className="mt-2.5 font-semibold text-[13.5px] text-foreground leading-tight">
        {stage.title}
      </h3>
      <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
        <span className="text-muted-foreground/50">$ </span>
        {stage.command}
      </p>

      <div className="mt-auto h-px w-full bg-gradient-to-r from-primary/40 via-primary/10 to-transparent" />
    </motion.div>
  );
}

// ─── Canvas ───────────────────────────────────────────────────────────────────

function FlowCanvas() {
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex justify-center px-4 py-8">
        <div
          className="relative shrink-0 rounded-xl"
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            backgroundImage:
              "radial-gradient(color-mix(in srgb, var(--color-border) 55%, transparent) 1px, transparent 1px)",
            backgroundSize: "18px 18px"
          }}
        >
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            focusable="false"
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          >
            <defs>
              <marker
                id="flowArrow"
                markerHeight="7"
                markerWidth="7"
                orient="auto-start-reverse"
                refX="7"
                refY="4"
                viewBox="0 0 8 8"
              >
                <path className="fill-primary/70" d="M0,0 L8,4 L0,8 Z" />
              </marker>
            </defs>

            {EDGES.map((d, i) => (
              <g key={`edge-${i}`}>
                <path
                  className="stroke-border"
                  d={d}
                  fill="none"
                  strokeDasharray="4 4"
                  strokeWidth="1.25"
                />
                <path
                  className="stroke-primary/60"
                  d={d}
                  fill="none"
                  markerEnd="url(#flowArrow)"
                  strokeWidth="1.25"
                />
                <motion.circle
                  animate={{ offsetDistance: ["0%", "100%"] }}
                  className="fill-primary"
                  r="3"
                  style={{ offsetPath: `path("${d}")` }}
                  transition={{
                    duration: 2.2,
                    ease: "linear",
                    repeat: Number.POSITIVE_INFINITY,
                    delay: i * 0.5
                  }}
                />
              </g>
            ))}
          </svg>

          {STAGES.map((stage, i) => (
            <StageCard index={i} key={stage.index} stage={stage} />
          ))}
        </div>
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
            No config screens, no command line to learn. Vault runs the pipeline for you.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card/60 shadow-lg backdrop-blur-sm">
          <FlowCanvas />
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
