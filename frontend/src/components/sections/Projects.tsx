import { ArrowUpRight, Star } from "lucide-react";
import { Link } from "react-router";

import { SectionHeading } from "@/components/layout/SectionHeading";
import { ProjectCover } from "@/components/ProjectCover";
import { Parallax, ParallaxGlow, ParallaxWatermark } from "@/components/motion/Parallax";
import { Reveal } from "@/components/motion/Reveal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useProjects } from "@/hooks/usePortfolioData";
import { showcaseImage } from "@/lib/utils";

export function Projects() {
  const { data: projects } = useProjects();
  const sorted = [...projects].sort((a, b) => a.display_order - b.display_order);

  return (
    <section
      id="projects"
      aria-label="Proyectos"
      className="relative scroll-mt-20 overflow-hidden bg-surface/30"
    >
      <ParallaxWatermark text="04" />
      <ParallaxGlow tone="accent" className="-left-40 top-1/4" speed={0.25} />
      <ParallaxGlow tone="violet" className="-right-40 bottom-0" speed={0.35} />
      <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <SectionHeading
          eyebrow="04 · proyectos"
          title="Proyectos destacados"
          description="Sistemas reales con problema, solución y resultado. Cada uno tiene su historia técnica completa."
        />

        <div className="grid gap-6 md:grid-cols-2">
          {sorted.map((project, i) => (
            <Reveal key={project.id} delay={(i % 2) * 0.08}>
              <Parallax speed={i % 2 === 0 ? 0.06 : -0.06} className="h-full">
                <Link
                  to={`/projects/${project.slug}`}
                  className="group block h-full rounded-xl2 focus-visible:outline-2"
                  aria-label={`Ver detalle del proyecto ${project.title}`}
                >
                  <Card className="h-full overflow-hidden transition-[border-color,transform,box-shadow] duration-300 motion-safe:group-hover:-translate-y-1 group-hover:shadow-[0_12px_40px_-16px_rgb(34_211_238/0.25)]">
                    <ProjectCover
                      title={project.title}
                      imageUrl={project.image_url ?? showcaseImage(project.slug)}
                    />
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-semibold text-ink transition-colors group-hover:text-accent">
                          {project.title}
                        </h3>
                        <span className="flex items-center gap-2">
                          {project.featured && (
                            <Badge variant="violet">
                              <Star className="size-3" aria-hidden="true" />
                              destacado
                            </Badge>
                          )}
                          <ArrowUpRight
                            className="size-4 shrink-0 text-faint transition-all group-hover:translate-x-0.5 group-hover:text-accent"
                            aria-hidden="true"
                          />
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-muted">{project.summary}</p>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {project.stack.slice(0, 6).map((tech) => (
                          <Badge key={tech}>{tech}</Badge>
                        ))}
                        {project.stack.length > 6 && (
                          <Badge variant="accent">+{project.stack.length - 6}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </Parallax>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
