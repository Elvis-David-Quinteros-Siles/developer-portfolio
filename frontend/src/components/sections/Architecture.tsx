import {
  Activity,
  Boxes,
  Container,
  GitBranch,
  Hexagon,
  Layers,
  Radio,
  Shapes,
  Ship,
  SplitSquareHorizontal,
  type LucideIcon,
} from "lucide-react";

import { SectionHeading } from "@/components/layout/SectionHeading";
import { Parallax, ParallaxGlow, ParallaxWatermark } from "@/components/motion/Parallax";
import { Reveal } from "@/components/motion/Reveal";
import { SystemDiagram } from "@/components/sections/SystemDiagram";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useArchitectureTopics } from "@/hooks/usePortfolioData";
import type { ArchitectureTopic } from "@/types/api";

const TOPIC_ICONS: Record<string, LucideIcon> = {
  "clean-architecture": Layers,
  ddd: Shapes,
  hexagonal: Hexagon,
  cqrs: SplitSquareHorizontal,
  "event-driven": Radio,
  microservices: Boxes,
  docker: Container,
  kubernetes: Ship,
  cicd: GitBranch,
  observability: Activity,
};

const CATEGORY_LABELS: Record<ArchitectureTopic["category"], string> = {
  patterns: "Patrones",
  infra: "Infraestructura",
  observability: "Observabilidad",
};

function TopicCard({ topic, index }: { topic: ArchitectureTopic; index: number }) {
  const Icon = TOPIC_ICONS[topic.slug] ?? Layers;
  return (
    <Reveal delay={Math.min(index * 0.05, 0.25)} className="h-full">
      <Parallax speed={(index % 3) * 0.03 - 0.03} className="h-full">
        <Card className="h-full">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent/20 to-violet/20 text-accent">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h4 className="font-semibold text-ink">{topic.title}</h4>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">{topic.description}</p>
          </CardContent>
        </Card>
      </Parallax>
    </Reveal>
  );
}

export function Architecture() {
  const { data: topics } = useArchitectureTopics();
  const sorted = [...topics].sort((a, b) => a.display_order - b.display_order);
  const categories = (["patterns", "infra", "observability"] as const).filter((cat) =>
    sorted.some((t) => t.category === cat),
  );

  return (
    <section
      id="architecture"
      aria-label="Arquitectura"
      className="relative scroll-mt-20 overflow-hidden"
    >
      <ParallaxWatermark text="05" />
      <ParallaxGlow tone="violet" className="-right-56 top-1/3" speed={0.3} />
      <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <SectionHeading
          eyebrow="05 · arquitectura"
          title="Arquitectura de software"
          description="No es teoría: este portfolio corre sobre estos principios. El diagrama de abajo es el sistema real que está sirviendo esta página."
        />

        <Reveal className="mb-14">
          <Parallax speed={0.05}>
            <SystemDiagram />
          </Parallax>
        </Reveal>

        <div className="space-y-12">
          {categories.map((category) => (
            <div key={category}>
              <Reveal className="mb-5 flex items-center gap-3">
                <Badge variant="accent">{CATEGORY_LABELS[category]}</Badge>
                <span className="h-px flex-1 bg-line" aria-hidden="true" />
              </Reveal>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sorted
                  .filter((t) => t.category === category)
                  .map((topic, i) => (
                    <TopicCard key={topic.id} topic={topic} index={i} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
