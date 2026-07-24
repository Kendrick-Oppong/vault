import { Zap, ShieldCheck, Globe, Layers, Cpu, Play } from "lucide-react";
import { Reveal } from "../shared/reveal";

const FEATURES = [
  {
    num: "01",
    Icon: Zap,
    title: "yt-dlp Powered",
    body: "Updated frequently with support for 1000+ sites. Always stays current with the latest platform changes.",
  },
  {
    num: "02",
    Icon: Cpu,
    title: "FFmpeg Integration",
    body: "Format conversion, metadata embedding, subtitle extraction — all handled seamlessly by FFmpeg.",
  },
  {
    num: "03",
    Icon: Globe,
    title: "Cross-Platform",
    body: "Native Windows, macOS, and Linux apps. Optimized for each platform with consistent experience.",
  },
  {
    num: "04",
    Icon: ShieldCheck,
    title: "Privacy First",
    body: "No telemetry, no tracking, no account required. Your data stays local on your machine.",
  },
  {
    num: "05",
    Icon: Play,
    title: "Playlist Support",
    body: "Download entire playlists with configurable limits. Smart queue management handles large batches.",
  },
  {
    num: "06",
    Icon: Layers,
    title: "Modern UI",
    body: "Dark mode, keyboard shortcuts, queue management, and library organization in a clean interface.",
  },
];

function FeatureCard({
  feature,
  className,
}: Readonly<{
  feature: (typeof FEATURES)[0];
  className?: string;
}>) {
  const { num, Icon, title, body } = feature;
  return (
    <div
      className={`bg-card p-5 transition-colors hover:bg-card-hover ${className ?? ""}`}
    >
      <div className="mb-8 flex items-start justify-between">
        <span className="font-bold text-[11px] text-primary/50 uppercase tracking-[0.15em]">
          {num}
        </span>
        <div className="flex size-9 items-center justify-center rounded-xl border border-primary/15 bg-primary/8">
          <Icon className="size-4 text-primary" />
        </div>
      </div>
      <h3 className="mb-3 font-bold text-[1.1rem] text-foreground tracking-[-0.02em]">
        {title}
      </h3>
      <p className="font-light text-[12.5px] text-muted-foreground leading-[1.7]">
        {body}
      </p>
    </div>
  );
}

export function FeaturesBento() {
  const [first, second, ...rest] = FEATURES;

  return (
    <Reveal className="py-28">
      <div className="container-shelf">
        <div className="section-eyebrow">
          <div className="eyebrow-line" />
          <span className="eyebrow-text">Features</span>
        </div>

        <div className="mb-16 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="font-bold text-[clamp(1.9rem,8vw,3.2rem)] leading-[1.08] tracking-[-0.035em]">
            Built for power users.
            <br />
            <span className="text-muted-foreground/60">
              Simple enough for everyone.
            </span>
          </h2>

          <p className="max-w-sm font-light text-[13.5px] text-muted-foreground leading-[1.8]">
            Vault combines the power of yt-dlp and FFmpeg with a modern,
            intuitive interface. No command line required.
          </p>
        </div>

        {/* Mobile + Tablet */}
        <div className="overflow-hidden rounded-2xl border border-border bg-border lg:hidden">
          <div className="grid grid-cols-1 gap-px sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <FeatureCard feature={feature} key={feature.num} />
            ))}
          </div>
        </div>

        {/* Desktop Bento */}
        <div className="hidden lg:block">
          {/* First row */}
          <div className="mb-px grid grid-cols-3 gap-px overflow-hidden rounded-t-2xl border border-border bg-border">
            <FeatureCard className="col-span-2" feature={first} />
            <FeatureCard className="col-span-1" feature={second} />
          </div>

          {/* Second row */}
          <div className="mb-px grid grid-cols-3 gap-px overflow-hidden border border-border border-t-0 bg-border">
            {rest.slice(0, 3).map((feature) => (
              <FeatureCard feature={feature} key={feature.num} />
            ))}
          </div>

          {/* Third row */}
          <div className="overflow-hidden rounded-b-2xl border border-border border-t-0">
            <FeatureCard feature={rest[3]} />
          </div>
        </div>
      </div>
    </Reveal>
  );
}
