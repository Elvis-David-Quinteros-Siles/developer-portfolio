import {
  ExternalLink,
  FolderTree,
  Github,
  Heart,
  ImageUp,
  KeyRound,
  Mail,
  PenLine,
  Timer,
  UserRound,
} from "lucide-react";

import { SectionHeading } from "@/components/layout/SectionHeading";
import { ParallaxGlow } from "@/components/motion/Parallax";
import { Reveal } from "@/components/motion/Reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** App en producción (proyecto ~/drf-nextjs-blog, servido en blog.edqs.online). */
const APP_URL = "https://blog.edqs.online";
const REPO_URL = "https://github.com/Elvis-David-Quinteros-Siles/drf-nextjs-blog";

const MODULES = [
  { icon: KeyRound, text: "Registro con activación por correo, login con JWT y segundo factor por OTP." },
  { icon: PenLine, text: "Editor enriquecido para crear y editar posts, con borradores y publicación." },
  { icon: FolderTree, text: "Categorías, búsqueda y encabezados navegables dentro de cada post." },
  { icon: Heart, text: "Likes y analíticas de vistas e interacciones por post y por categoría." },
  { icon: UserRound, text: "Perfiles públicos con foto, banner, biografía y redes sociales." },
  { icon: ImageUp, text: "Subida directa de imágenes a MinIO con URLs firmadas de corta duración." },
  { icon: Mail, text: "Newsletter y formulario de contacto." },
  { icon: Timer, text: "Tareas programadas con Celery y Celery Beat sobre Redis." },
] as const;

const FLOW = [
  "nginx (TLS) → nginx del blog",
  "blog.edqs.online      → Next.js 15 (SSR + API routes)",
  "/drf-nextjs-blog/...  → MinIO (URLs firmadas)",
  "api.blog.edqs.online  → Django REST (Uvicorn)",
  "Celery worker + beat  → Redis",
  "Django                → PostgreSQL (red dedicada)",
] as const;

const STACK = ["Django REST", "Next.js", "Redux", "Tailwind", "Celery", "Redis", "PostgreSQL", "MinIO", "Docker"];

/**
 * Plataforma de blog full stack en producción: funcionalidades, arquitectura
 * de despliegue y enlaces a la app y al repositorio.
 */
export function BlogPlatform() {
  return (
    <section id="blog-app" aria-label="Plataforma de blog full stack" className="relative scroll-mt-20 overflow-hidden bg-surface/30">
      <ParallaxGlow tone="violet" className="-right-40 top-1/3" speed={0.3} />
      <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <SectionHeading
          eyebrow="lab · full-stack"
          title="Blog full stack: Django REST + Next.js"
          description="Plataforma de publicación con autenticación completa, editor de posts, perfiles y analíticas. API en Django REST Framework, frontend en Next.js e imágenes en MinIO, desplegada con Docker detrás de Nginx."
        />

        <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <Reveal>
            <Card className="flex h-full flex-col p-6">
              <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-accent">funcionalidades</p>
              <ul className="grid gap-3 sm:grid-cols-2">
                {MODULES.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex gap-3 text-sm leading-relaxed text-muted">
                    <Icon className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                    {text}
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex flex-wrap gap-1.5 pt-6">
                {STACK.map((tech) => (
                  <Badge key={tech}>{tech}</Badge>
                ))}
              </div>
            </Card>
          </Reveal>

          <Reveal delay={0.08}>
            <Card className="flex h-full flex-col p-6">
              <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-violet">arquitectura</p>
              <pre className="overflow-x-auto rounded-lg border border-line-strong p-4 font-mono text-xs leading-relaxed text-ink">
                {FLOW.join("\n")}
              </pre>
              <p className="mt-6 text-sm leading-relaxed text-muted">
                PostgreSQL y MinIO son compartidos con otros proyectos del servidor; el blog solo ve su base y su
                bucket, con un usuario propio en cada uno.
              </p>
              <div className="mt-auto flex flex-wrap gap-3 pt-6">
                <Button asChild>
                  <a href={APP_URL} target="_blank" rel="noreferrer">
                    <ExternalLink aria-hidden="true" />
                    Abrir app
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href={REPO_URL} target="_blank" rel="noreferrer">
                    <Github aria-hidden="true" />
                    Código
                  </a>
                </Button>
              </div>
            </Card>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
