import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Retardo en segundos (para stagger manual entre hermanos). */
  delay?: number;
  /** Desplazamiento vertical inicial en px. */
  y?: number;
  as?: "div" | "section" | "li";
}

/** Fade + slide al entrar en viewport. Respeta prefers-reduced-motion. */
export function Reveal({ children, className, delay = 0, y = 18, as = "div" }: RevealProps) {
  const reduced = useReducedMotion();
  const Comp = motion[as];

  return (
    <Comp
      className={className}
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </Comp>
  );
}
