"use client";

import Link from "next/link";
import { Badge } from "@vault/ui/components/badge";
import { Button } from "@vault/ui/components/button";
import { Reveal } from "../shared/reveal";
import { Download, Github } from "lucide-react";

export function CtaSection() {
  return (
    <Reveal>
      <section className="relative overflow-hidden border-t border-border px-8 py-32 text-center">
        {/* Glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_100%,color-mix(in_srgb,var(--color-primary)_7%,transparent)_0%,transparent_70%)]"
        />

        <div className="relative z-10">
          <Badge
            className="gap-2 rounded-full border-primary/18 bg-primary/6 px-4 py-1.5 text-[11.5px] uppercase tracking-wider text-primary hover:bg-primary/6"
            variant="outline"
          >
            Free · Open Source · MIT License
          </Badge>

          <h2 className="mx-auto mt-8 mb-4 max-w-xl font-bold text-[clamp(2.5rem,5vw,4rem)] leading-[1.05] tracking-[-0.04em]">
            Start downloading in
            <br />
            <span className="text-primary">seconds.</span>
          </h2>

          <p className="mb-10 font-light text-[15px] text-muted-foreground">
            Download Vault for your platform. No setup required.
            <br />
            <span className="text-[13px]">Built with Electron, yt-dlp, and FFmpeg.</span>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              nativeButton={false}
              className="h-auto rounded-xl px-7 py-3 text-sm hover:-translate-y-0.5 hover:brightness-110"
              render={(props) => (
                <Link {...props} href="#download">
                  <Download className="mr-2 h-4 w-4" />
                  Download Vault
                </Link>
              )}
            />

            <Button
              nativeButton={false}
              variant="outline"
              className="h-auto rounded-xl px-7 py-3 text-sm hover:-translate-y-0.5"
              render={(props) => (
                <Link
                  {...props}
                  href="https://github.com/Kendrick-Oppong/vault"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="mr-2 h-4 w-4" />
                  View on GitHub
                </Link>
              )}
            />
          </div>
        </div>
      </section>
    </Reveal>
  );
}
