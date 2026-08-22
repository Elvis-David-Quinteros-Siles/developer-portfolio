import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { type ReactNode, useRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Sistema de parallax por scroll (sutil, tipo Linear/Stripe): cada capa se
 * desplaza a una velocidad distinta mientras cruza el viewport, lo que crea
 * profundidad sin secuestrar el scroll.
 *
 * - Solo anima `transform` (compositor) → sin reflow.
 * - Respeta `prefers-reduced-motion`: se renderiza estático.
 * - `speed` > 0 → la capa "va más lenta" que el scroll (fondo, lejos).
 *   `speed` < 0 → "va más rápida" (primer plano, cerca). Rango útil ±0.4.
 */

interface ParallaxProps {
  children: ReactNode;
  className?: string;
  /** Velocidad relativa. 0.1 ≈ 30px de recorrido total; 0.3 ≈ 90px. */
  speed?: number;
}

const TRAVEL_PX = 300;

export function Parallax({ children, className, speed = 0.15 }: ParallaxProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const distance = speed * TRAVEL_PX;
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}

type Tone = "accent" | "violet" | "success";

const TONE_BG: Record<Tone, string> = {
  accent: "bg-accent/10",
  violet: "bg-violet/10",
  success: "bg-success/10",
};

interface ParallaxGlowProps {
  tone?: Tone;
  /** Clases de posición/tamaño (absolute ya viene puesto). */
  className?: string;
  speed?: number;
}

/**
 * Resplandor decorativo de fondo con parallax. El padre debe ser
 * `relative overflow-hidden`. Se marca aria-hidden.
 */
export function ParallaxGlow({ tone = "accent", className, speed = 0.3 }: ParallaxGlowProps) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <Parallax
        speed={speed}
        className={cn(
          "absolute h-80 w-[36rem] rounded-full blur-[120px]",
          TONE_BG[tone],
          className,
        )}
      >
        <span className="sr-only" />
      </Parallax>
    </div>
  );
}

interface ParallaxWatermarkProps {
  /** Texto grande en mono (p.ej. "03"). */
  text: string;
  className?: string;
}

/**
 * Número de sección gigante en marca de agua; se mueve más lento que el
 * contenido para anclar la sensación de profundidad en todas las secciones.
 */
export function ParallaxWatermark({ text, className }: ParallaxWatermarkProps) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <Parallax
        speed={0.35}
        className={cn(
          "absolute -top-6 right-3 select-none font-mono text-[11rem] font-bold leading-none tracking-tighter text-ink/[0.035] sm:text-[16rem] lg:right-8",
          className,
        )}
      >
        {text}
      </Parallax>
    </div>
  );
}
