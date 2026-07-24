"use client";

import { motion, useInView } from "motion/react";
import { type ReactNode, useRef } from "react";

interface RevealProps {
  amount?: number;
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function Reveal({
  children,
  delay = 0,
  className,
  amount = 0.1,
}: Readonly<RevealProps>) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount });

  return (
    <motion.div
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      className={className}
      initial={false}
      ref={ref}
      transition={{
        duration: 0.75,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
