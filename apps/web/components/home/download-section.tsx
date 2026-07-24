"use client";

import { Download, Apple, Monitor, HardDrive } from "lucide-react";
import { Reveal } from "../shared/reveal";
import { Button } from "@vault/ui/components/button";

const PLATFORMS = [
  {
    name: "Windows",
    icon: HardDrive,
    version: "v0.1.0",

    url: "#"
  },
  {
    name: "macOS",
    icon: Apple,
    version: "v0.1.0", //make this coming soon
    url: "#"
  },
  {
    name: "Linux",
    icon: Monitor,
    version: "v0.1.0",

    url: "#"
  }
];

export function DownloadSection() {
  return (
    <Reveal className="py-28">
      <section id="download" className="container-shelf">
        <div className="section-eyebrow">
          <div className="eyebrow-line" />
          <span className="eyebrow-text">Download</span>
        </div>

        <div className="mb-16 text-center">
          <h2 className="mb-4 font-bold text-[clamp(2.5rem,5vw,4rem)] leading-[1.05] tracking-[-0.04em]">
            Get Vault for your platform
          </h2>

          <p className="font-light text-[15px] text-muted-foreground">
            Native applications optimized for each operating system.
            <br />
            <span className="text-[13px]">Open source, MIT licensed.</span>
          </p>
        </div>

        <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-3">
          {PLATFORMS.map((platform) => {
            const Icon = platform.icon;

            return (
              <div
                key={platform.name}
                className="flex flex-col items-center rounded-2xl border border-border bg-card p-6 transition-colors hover:bg-card-hover"
              >
                <div className="mb-4 flex size-16 items-center justify-center rounded-xl border border-primary/15 bg-primary/8">
                  <Icon className="size-8 text-primary" />
                </div>

                <h3 className="mb-2 text-lg font-semibold text-foreground">{platform.name}</h3>


                <Button
                  nativeButton={false}
                  className="h-auto flex-1 rounded-xl px-7 py-3 text-sm hover:-translate-y-0.5 hover:shadow-[0_8px_30px_color-mix(in_srgb,var(--color-primary)_25%,transparent)] hover:brightness-110"
                  render={(props) => (
                    <a {...props} href={platform.url} target="_blank" rel="noopener noreferrer">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </a>
                  )}
                />
              </div>
            );
          })}
        </div>
      </section>
    </Reveal>
  );
}
