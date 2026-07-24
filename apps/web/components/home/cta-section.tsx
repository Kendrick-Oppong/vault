"use client";

import { motion } from "motion/react";
import { Reveal } from "../shared/reveal";
import { Button } from "@vault/ui/components/button";
import { Download, Github, Sparkles } from "lucide-react";

export function CtaSection() {
  return (
    <Reveal>
      <section className="relative overflow-hidden border-t border-border py-32">
        {/* Animated background */}
        <div className="absolute inset-0 bg-background">
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{
              duration: 8,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut"
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl"
          />
        </div>

        <div className="relative container-shelf text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Free & Open Source</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight"
          >
            Ready to start
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60"> downloading?</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12"
          >
            Join users who trust Vault for their media downloads. Simple, powerful, and completely
            free.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              render={(props) => (
                <a {...props} href="#download">
                  <Download className="mr-2 h-5 w-5" />
                  Download Vault
                </a>
              )}
              nativeButton={false}
              size="lg"
              className="h-13 px-8 text-base font-semibold hover:scale-105 transition-transform"
            />
            <Button
              render={(props) => (
                <a
                  {...props}
                  href="https://github.com/Kendrick-Oppong/vault"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <Github className="mr-2 h-5 w-5" />
                  Star on GitHub
                </a>
              )}
              nativeButton={false}
              size="lg"
              variant="outline"
              className="h-14 px-8 text-base font-semibold hover:scale-105 transition-transform"
            />
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-16 flex flex-wrap justify-center gap-8"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-success" />
              </div>
              <span className="text-sm">No telemetry</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-success" />
              </div>
              <span className="text-sm">Regular updates</span>
            </div>
          </motion.div>
        </div>
      </section>
    </Reveal>
  );
}
