import { Compass, Quote, Target, Wrench } from "lucide-react";

import { SectionHeading } from "@/components/layout/SectionHeading";
import { Parallax, ParallaxGlow, ParallaxWatermark } from "@/components/motion/Parallax";
import { Reveal } from "@/components/motion/Reveal";
import { Card, CardContent } from "@/components/ui/card";
import { useProfile } from "@/hooks/usePortfolioData";

const PILLARS = [
  {
    icon: Wrench,
    title: "Especialidades",
    text: "APIs en Go y Python/Django, GraphQL, PostgreSQL, sistemas event-driven y plataformas Kubernetes con GitOps.",
  },
  {
    icon: Compass,
    title: "Cómo trabajo",
    text: "Contratos primero, decisiones documentadas en ADRs y pipelines que convierten cada merge en un despliegue aburrido (en el buen sentido).",
  },
  {
    icon: Target,
    title: "Objetivo",
    text: "Diseñar plataformas backend que un equipo pueda evolucionar sin miedo: observables, testeadas y con límites de dominio claros.",
  },
] as const;

export function About() {
  const { data: profile } = useProfile();

  return (
    <section id="about" aria-label="Sobre mí" className="relative scroll-mt-20 overflow-hidden">
      <ParallaxWatermark text="01" />
      <ParallaxGlow tone="violet" className="-left-40 top-1/3" speed={0.25} />
      <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <SectionHeading
          eyebrow="01 · sobre mí"
          title="Historia y filosofía"
          description="Más de ocho años convirtiendo problemas de negocio en sistemas backend que aguantan producción."
        />

        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal>
            <Parallax speed={0.05} className="space-y-5 leading-relaxed text-muted">
              <p>{profile.bio}</p>
              <p>
                Empecé entregando MVPs para startups y terminé diseñando plataformas: gateways con
                rate limiting, pipelines de eventos y clusters Kubernetes reconciliados desde Git.
                Cada etapa me dejó la misma lección: la arquitectura correcta es la que hace barato
                el próximo cambio.
              </p>
              <figure className="relative mt-8 rounded-xl2 border border-line bg-surface/60 p-6">
                <Quote className="absolute -top-3 left-6 size-6 text-accent" aria-hidden="true" />
                <blockquote className="italic leading-relaxed text-ink">
                  {profile.philosophy}
                </blockquote>
                <figcaption className="mt-3 font-mono text-xs text-faint">
                  — filosofía de trabajo
                </figcaption>
              </figure>
            </Parallax>
          </Reveal>

          <Parallax speed={-0.08} className="space-y-4">
            {PILLARS.map((pillar, i) => (
              <Reveal key={pillar.title} delay={i * 0.08}>
                <Card>
                  <CardContent className="flex gap-4 p-5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 text-accent">
                      <pillar.icon className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="font-semibold text-ink">{pillar.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted">{pillar.text}</p>
                    </div>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </Parallax>
        </div>
      </div>
    </section>
  );
}
