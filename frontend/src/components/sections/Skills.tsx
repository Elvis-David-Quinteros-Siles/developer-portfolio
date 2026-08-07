import {
  Activity,
  Atom,
  Boxes,
  Braces,
  Cloud,
  Code2,
  Container,
  Database,
  Hexagon,
  Layers,
  Leaf,
  Palette,
  Radio,
  Shapes,
  Share2,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { SectionHeading } from "@/components/layout/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSkillCategories } from "@/hooks/usePortfolioData";
import { cn } from "@/lib/utils";
import type { Skill } from "@/types/api";

/** Mapa de slugs de icono (DATABASE.md: `simple-icons:go`, `lucide:layers`…) a lucide. */
const ICON_MAP: Record<string, LucideIcon> = {
  go: Zap,
  django: Code2,
  python: Code2,
  nodedotjs: Hexagon,
  graphql: Share2,
  react: Atom,
  typescript: Braces,
  tailwindcss: Palette,
  postgresql: Database,
  redis: Database,
  mongodb: Leaf,
  amazonwebservices: Cloud,
  googlecloud: Cloud,
  terraform: Layers,
  docker: Container,
  kubernetes: Boxes,
  githubactions: Workflow,
  grafana: Activity,
  layers: Layers,
  shapes: Shapes,
  radio: Radio,
  boxes: Boxes,
};

function skillIcon(iconSlug: string): LucideIcon {
  const key = iconSlug.split(":").pop() ?? "";
  return ICON_MAP[key] ?? Code2;
}

function LevelDots({ level, name }: { level: number; name: string }) {
  return (
    <div
      role="meter"
      aria-valuemin={1}
      aria-valuemax={5}
      aria-valuenow={level}
      aria-label={`Nivel de ${name}: ${level} de 5`}
      className="flex items-center gap-1"
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cn(
            "h-1.5 w-4 rounded-full transition-colors",
            i < level ? "bg-gradient-to-r from-accent to-accent/70" : "bg-raised",
          )}
        />
      ))}
    </div>
  );
}

function SkillCard({ skill, index }: { skill: Skill; index: number }) {
  const Icon = skillIcon(skill.icon);
  return (
    <Reveal delay={Math.min(index * 0.05, 0.3)}>
      <Card className="h-full">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg border border-line bg-raised text-accent">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-semibold leading-tight text-ink">{skill.name}</h3>
                <p className="mt-0.5 font-mono text-[0.7rem] text-faint">
                  {skill.years} {skill.years === 1 ? "año" : "años"}
                </p>
              </div>
            </div>
            <LevelDots level={skill.level} name={skill.name} />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">{skill.description}</p>
        </CardContent>
      </Card>
    </Reveal>
  );
}

export function Skills() {
  const { data: categories } = useSkillCategories();
  const sorted = [...categories].sort((a, b) => a.display_order - b.display_order);
  const first = sorted[0];

  if (!first) return null;

  return (
    <section id="skills" aria-label="Tecnologías" className="scroll-mt-20 bg-surface/30">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <SectionHeading
          eyebrow="02 · stack"
          title="Tecnologías"
          description="Herramientas que uso a diario, con nivel real y años de experiencia — sin inflar."
        />

        <Tabs defaultValue={first.slug}>
          <Reveal>
            <TabsList aria-label="Categorías de tecnologías">
              {sorted.map((cat) => (
                <TabsTrigger key={cat.slug} value={cat.slug}>
                  {cat.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Reveal>

          {sorted.map((cat) => (
            <TabsContent key={cat.slug} value={cat.slug}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...cat.skills]
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((skill, i) => (
                    <SkillCard key={skill.id} skill={skill} index={i} />
                  ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
