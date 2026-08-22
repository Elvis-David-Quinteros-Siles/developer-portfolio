import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { Link } from "react-router";

import { Badge } from "@/components/ui/badge";
import { cn, initials } from "@/lib/utils";

/**
 * Port de `hero-parallax` (Aceternity UI) adaptado al stack del proyecto:
 * - framer-motion en lugar de `motion/react` (misma API, ya instalada).
 * - react-router `Link` para rutas internas; `<a>` para externas.
 * - Sin `next/image`: las tarjetas pueden llevar `thumbnail` o pintar un
 *   tile generado con los tokens del sistema (gradiente + iniciales).
 * - `prefers-reduced-motion`: sin scroll-jacking; se renderiza una grilla
 *   estática y compacta.
 */

export type ParallaxTone = "accent" | "violet" | "success";

export interface ParallaxItem {
  id: string;
  title: string;
  /** Etiqueta técnica en mono, p.ej. "proyecto" o "patrón". */
  kind: string;
  href: string;
  description?: string;
  tags?: string[];
  thumbnail?: string | null;
  tone?: ParallaxTone;
}

interface HeroParallaxProps {
  items: ParallaxItem[];
  header: ReactNode;
  className?: string;
}

const springConfig = { stiffness: 300, damping: 30, bounce: 100 };

export function HeroParallax({ items, header, className }: HeroParallaxProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const translateX = useSpring(useTransform(scrollYProgress, [0, 1], [0, 1000]), springConfig);
  const translateXReverse = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, -1000]),
    springConfig,
  );
  const rotateX = useSpring(useTransform(scrollYProgress, [0, 0.2], [15, 0]), springConfig);
  const opacity = useSpring(useTransform(scrollYProgress, [0, 0.2], [0.2, 1]), springConfig);
  const rotateZ = useSpring(useTransform(scrollYProgress, [0, 0.2], [20, 0]), springConfig);
  const translateY = useSpring(useTransform(scrollYProgress, [0, 0.2], [-700, 500]), springConfig);

  if (reduced) {
    return (
      <div className={cn("relative mx-auto max-w-6xl px-4 py-24 sm:px-6", className)}>
        {header}
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {items.slice(0, 6).map((item) => (
            <li key={item.id}>
              <ParallaxCard item={item} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const firstRow = items.slice(0, 5);
  const secondRow = items.slice(5, 10);
  const thirdRow = items.slice(10, 15);

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex h-[300vh] flex-col self-auto overflow-hidden pb-40 pt-12 antialiased sm:pt-16 [perspective:1000px] [transform-style:preserve-3d]",
        className,
      )}
    >
      {header}
      <motion.div style={{ rotateX, rotateZ, translateY, opacity }}>
        <motion.div className="mb-10 flex flex-row-reverse space-x-8 space-x-reverse sm:mb-20 sm:space-x-20">
          {firstRow.map((item) => (
            <ParallaxCard key={item.id} item={item} translate={translateX} />
          ))}
        </motion.div>
        <motion.div className="mb-10 flex flex-row space-x-8 sm:mb-20 sm:space-x-20">
          {secondRow.map((item) => (
            <ParallaxCard key={item.id} item={item} translate={translateXReverse} />
          ))}
        </motion.div>
        <motion.div className="flex flex-row-reverse space-x-8 space-x-reverse sm:space-x-20">
          {thirdRow.map((item) => (
            <ParallaxCard key={item.id} item={item} translate={translateX} />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}

const TONE_STYLES: Record<ParallaxTone, { glow: string; text: string; badge: ParallaxTone }> = {
  accent: {
    glow: "from-accent/25 via-accent/5",
    text: "text-accent",
    badge: "accent",
  },
  violet: {
    glow: "from-violet/25 via-violet/5",
    text: "text-violet",
    badge: "violet",
  },
  success: {
    glow: "from-success/25 via-success/5",
    text: "text-success",
    badge: "success",
  },
};

function ParallaxCard({
  item,
  translate,
}: {
  item: ParallaxItem;
  translate?: MotionValue<number>;
}) {
  const tone = TONE_STYLES[item.tone ?? "accent"];
  const external = /^https?:\/\//.test(item.href);
  const label = `${item.kind}: ${item.title}`;
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = Boolean(item.thumbnail) && !imgFailed;

  const surface = (
    <>
      {showImage ? (
        <img
          src={item.thumbnail ?? undefined}
          onError={() => setImgFailed(true)}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover object-center transition-transform duration-500 group-hover/card:scale-[1.04]"
        />
      ) : (
        <div
          aria-hidden="true"
          className={cn("bg-blueprint absolute inset-0 bg-gradient-to-br to-bg", tone.glow)}
        >
          <span
            className={cn(
              "absolute right-5 top-4 font-mono text-7xl font-bold tracking-tighter opacity-[0.12] sm:text-8xl",
              tone.text,
            )}
          >
            {initials(item.title.replace(/[^\p{L}\p{N}\s]/gu, " "))}
          </span>
        </div>
      )}

      {/* Velo inferior: garantiza contraste del texto sobre imagen o gradiente */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-bg/95 via-bg/40 to-transparent"
      />

      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
        <p className={cn("mb-2 font-mono text-[0.7rem] uppercase tracking-[0.2em]", tone.text)}>
          {item.kind}
        </p>
        <h3 className="flex items-start justify-between gap-3 text-lg font-semibold leading-snug text-ink sm:text-xl">
          <span>{item.title}</span>
          <ArrowUpRight
            aria-hidden="true"
            className="mt-1 size-4 shrink-0 text-faint transition-all duration-300 group-hover/card:translate-x-0.5 group-hover/card:-translate-y-0.5 group-hover/card:text-ink"
          />
        </h3>
        {item.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{item.description}</p>
        )}
        {item.tags && item.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant={tone.badge}>
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </>
  );

  const linkClass =
    "group/card relative block size-full overflow-hidden rounded-xl2 border border-line bg-surface shadow-[0_1px_0_0_rgb(255_255_255/0.04)_inset] transition-[border-color,box-shadow] duration-300 hover:border-line-strong hover:shadow-[0_24px_60px_-24px_rgb(34_211_238/0.35)] focus-visible:outline-2 focus-visible:outline-offset-4";

  const link = external ? (
    <a
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={linkClass}
    >
      {surface}
    </a>
  ) : (
    <Link to={item.href} aria-label={label} className={linkClass}>
      {surface}
    </Link>
  );

  if (!translate) {
    return <div className="aspect-[4/3] w-full">{link}</div>;
  }

  return (
    <motion.div
      style={{ x: translate }}
      whileHover={{ y: -20 }}
      className="relative h-64 w-[18rem] shrink-0 sm:h-80 sm:w-[26rem] lg:h-96 lg:w-[30rem]"
    >
      {link}
    </motion.div>
  );
}
