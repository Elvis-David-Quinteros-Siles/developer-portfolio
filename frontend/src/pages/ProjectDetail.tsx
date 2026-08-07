import {
  ArrowLeft,
  CircleAlert,
  ExternalLink,
  Github,
  Lightbulb,
  PlayCircle,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { Link, useParams } from "react-router";

import { ProjectCover } from "@/components/ProjectCover";
import { Reveal } from "@/components/motion/Reveal";
import { SystemDiagram } from "@/components/sections/SystemDiagram";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useProject } from "@/hooks/usePortfolioData";

function StoryCard({
  icon: Icon,
  title,
  text,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  tone: "danger" | "accent" | "success";
}) {
  const tones = {
    danger: "border-danger/30 text-danger",
    accent: "border-accent/30 text-accent",
    success: "border-success/30 text-success",
  } as const;

  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <span
            className={`flex size-9 items-center justify-center rounded-lg border bg-raised ${tones[tone]}`}
          >
            <Icon className="size-4.5" aria-hidden="true" />
          </span>
          <h2 className="font-semibold text-ink">{title}</h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted">{text}</p>
      </CardContent>
    </Card>
  );
}

export default function ProjectDetail() {
  const { slug = "" } = useParams();
  const { data: project, isLoading } = useProject(slug);
  useDocumentTitle(project?.title ?? "Proyecto");

  if (isLoading && !project) {
    return (
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-32 sm:px-6" aria-busy="true">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="mt-6 h-72 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-40 text-center sm:px-6">
        <p className="font-mono text-sm text-accent">404</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">Proyecto no encontrado</h1>
        <p className="mt-3 text-muted">El proyecto «{slug}» no existe o fue retirado.</p>
        <Button asChild variant="outline" className="mt-8">
          <Link to="/#projects">
            <ArrowLeft aria-hidden="true" />
            Volver a proyectos
          </Link>
        </Button>
      </div>
    );
  }

  const gallery = [...(project.images ?? [])].sort((a, b) => a.display_order - b.display_order);
  const isThisPlatform = project.slug === "portfolio-microservices";

  return (
    <article className="mx-auto max-w-5xl px-4 pb-24 pt-28 sm:px-6">
      <Reveal>
        <Link
          to="/#projects"
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Proyectos
        </Link>

        <header className="mt-6">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              {project.title}
            </h1>
            {project.featured && <Badge variant="violet">destacado</Badge>}
          </div>
          <p className="mt-3 max-w-3xl leading-relaxed text-muted">{project.summary}</p>

          <div className="mt-5 flex flex-wrap gap-1.5">
            {project.stack.map((tech) => (
              <Badge key={tech}>{tech}</Badge>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {project.github_url && (
              <Button asChild variant="outline">
                <a href={project.github_url} target="_blank" rel="noopener noreferrer">
                  <Github aria-hidden="true" />
                  Código
                </a>
              </Button>
            )}
            {project.demo_url && (
              <Button asChild variant="outline">
                <a href={project.demo_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink aria-hidden="true" />
                  Demo
                </a>
              </Button>
            )}
            {project.video_url && (
              <Button asChild variant="outline">
                <a href={project.video_url} target="_blank" rel="noopener noreferrer">
                  <PlayCircle aria-hidden="true" />
                  Video
                </a>
              </Button>
            )}
          </div>
        </header>
      </Reveal>

      <Reveal className="mt-10">
        <div className="group overflow-hidden rounded-xl2 border border-line">
          <ProjectCover title={project.title} imageUrl={project.image_url} className="rounded-none border-b-0" />
        </div>
      </Reveal>

      <Reveal className="mt-12">
        <p className="max-w-3xl leading-relaxed text-muted">{project.description}</p>
      </Reveal>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        <Reveal delay={0}>
          <StoryCard icon={CircleAlert} tone="danger" title="Problema" text={project.problem} />
        </Reveal>
        <Reveal delay={0.08}>
          <StoryCard icon={Lightbulb} tone="accent" title="Solución" text={project.solution} />
        </Reveal>
        <Reveal delay={0.16}>
          <StoryCard icon={Trophy} tone="success" title="Resultado" text={project.outcome} />
        </Reveal>
      </div>

      <Reveal className="mt-14">
        <h2 className="mb-5 text-xl font-semibold text-ink">Arquitectura</h2>
        {project.architecture_diagram_url ? (
          <figure className="overflow-hidden rounded-xl2 border border-line bg-surface/60">
            <img
              src={project.architecture_diagram_url}
              alt={`Diagrama de arquitectura de ${project.title}`}
              loading="lazy"
              decoding="async"
              className="w-full"
            />
          </figure>
        ) : isThisPlatform ? (
          <SystemDiagram />
        ) : (
          <p className="rounded-xl2 border border-dashed border-line p-6 font-mono text-sm text-faint">
            // diagrama en preparación — el código en GitHub incluye la documentación de
            arquitectura
          </p>
        )}
      </Reveal>

      {gallery.length > 0 && (
        <Reveal className="mt-14">
          <h2 className="mb-5 text-xl font-semibold text-ink">Capturas</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {gallery.map((image) => (
              <figure key={image.id} className="overflow-hidden rounded-xl2 border border-line">
                <img
                  src={image.url}
                  alt={image.caption || `Captura de ${project.title}`}
                  loading="lazy"
                  decoding="async"
                  className="aspect-video w-full object-cover"
                />
                {image.caption && (
                  <figcaption className="border-t border-line bg-surface/60 px-4 py-2 text-xs text-muted">
                    {image.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </Reveal>
      )}
    </article>
  );
}
