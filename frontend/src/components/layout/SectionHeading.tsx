import { Parallax } from "@/components/motion/Parallax";
import { Reveal } from "@/components/motion/Reveal";

interface SectionHeadingProps {
  /** Etiqueta técnica en mono, p.ej. "02 · skills". */
  eyebrow: string;
  title: string;
  description?: string;
}

export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <Parallax speed={-0.06} className="relative mb-12 max-w-2xl">
      <Reveal>
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-accent">{eyebrow}</p>
        <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h2>
        {description && <p className="mt-3 leading-relaxed text-muted">{description}</p>}
      </Reveal>
    </Parallax>
  );
}
