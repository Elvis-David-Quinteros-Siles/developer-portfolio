import { useMemo } from "react";

import { HeroParallax, type ParallaxItem } from "@/components/ui/hero-parallax";
import { useArchitectureTopics, useProjects, useSkillCategories } from "@/hooks/usePortfolioData";
import { showcaseImage } from "@/lib/utils";
import type { ArchitectureTopic } from "@/types/api";

const CATEGORY_KIND: Record<ArchitectureTopic["category"], string> = {
  patterns: "patrón",
  infra: "infraestructura",
  observability: "observabilidad",
};

/** Intercala varias listas (a1, b1, c1, a2, b2, …) hasta agotar todas. */
function interleave<T>(...lists: T[][]): T[] {
  const out: T[] = [];
  const max = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < max; i++) {
    for (const list of lists) {
      const v = list[i];
      if (v !== undefined) out.push(v);
    }
  }
  return out;
}

function ShowcaseHeader() {
  return (
    <div className="relative left-0 top-0 mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-28">
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-accent">00 · showcase</p>
      <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-5xl md:text-7xl">
        Sistemas que se pueden
        <br />
        <span className="text-gradient">levantar y defender</span>
      </h2>
      <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted md:mt-8 md:text-xl">
        Proyectos, patrones de arquitectura y el stack con el que los construyo. Cada tarjeta lleva
        a la historia técnica completa: problema, decisión y resultado.
      </p>
    </div>
  );
}

/**
 * Sección "showcase" con efecto parallax (Aceternity hero-parallax) que
 * cruza proyectos, arquitectura y stack. Va justo después del Hero para dar
 * un vistazo visual antes de las secciones detalladas.
 */
export function Showcase() {
  const { data: projects } = useProjects();
  const { data: topics } = useArchitectureTopics();
  const { data: skillCategories } = useSkillCategories();

  const items = useMemo<ParallaxItem[]>(() => {
    const projectItems: ParallaxItem[] = [...projects]
      .sort((a, b) => a.display_order - b.display_order)
      .map((p) => ({
        id: `project-${p.id}`,
        title: p.title,
        kind: "proyecto",
        href: `/projects/${p.slug}`,
        description: p.summary,
        tags: p.stack,
        thumbnail: p.image_url ?? showcaseImage(p.slug),
        tone: "accent",
      }));

    const topicItems: ParallaxItem[] = [...topics]
      .sort((a, b) => a.display_order - b.display_order)
      .map((t) => ({
        id: `topic-${t.id}`,
        title: t.title,
        kind: CATEGORY_KIND[t.category],
        href: "/#architecture",
        description: t.description,
        thumbnail: t.diagram_url ?? showcaseImage(t.slug),
        tone: "violet",
      }));

    const skillItems: ParallaxItem[] = [...skillCategories]
      .sort((a, b) => a.display_order - b.display_order)
      .map((c) => ({
        id: `skills-${c.id}`,
        title: c.name,
        kind: "stack",
        href: "/#skills",
        description: `${c.skills.length} tecnologías · nivel y años en la sección Stack`,
        tags: [...c.skills]
          .sort((a, b) => b.level - a.level)
          .slice(0, 4)
          .map((s) => s.name),
        thumbnail: showcaseImage(c.slug),
        tone: "success",
      }));

    return interleave(projectItems, topicItems, skillItems).slice(0, 15);
  }, [projects, topics, skillCategories]);

  if (items.length < 6) return null;

  return (
    <section id="showcase" aria-label="Showcase de proyectos, arquitectura y stack">
      <HeroParallax items={items} header={<ShowcaseHeader />} />
    </section>
  );
}
