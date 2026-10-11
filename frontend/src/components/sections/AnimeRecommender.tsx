import { Bot, Database, ExternalLink, Github, MessageSquareText, Search } from "lucide-react";

import { SectionHeading } from "@/components/layout/SectionHeading";
import { ParallaxGlow } from "@/components/motion/Parallax";
import { Reveal } from "@/components/motion/Reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** Demo en vivo (proyecto ~/anime-recommender, servido en anime.edqs.online). */
const DEMO_URL = "https://anime.edqs.online";
const REPO_URL = "https://github.com/Elvis-David-Quinteros-Siles/anime-recommender-llmops";

const STEPS = [
  { icon: MessageSquareText, text: "Describes en lenguaje natural qué te apetece ver, en español o inglés." },
  { icon: Search, text: "Tu consulta se convierte en embeddings y se buscan los animes más parecidos en ChromaDB." },
  { icon: Database, text: "Esos títulos, con su sinopsis y géneros, se pasan como contexto al modelo." },
  { icon: Bot, text: "El LLM (Groq) elige tres y explica por qué encajan contigo, sin inventar títulos." },
] as const;

const EXAMPLES = [
  "anime ligero con ambientación escolar",
  "dark fantasy with strong action",
  "algo emotivo sobre música y amistad",
] as const;

const STACK = ["RAG", "LangChain", "Groq", "ChromaDB", "Sentence-Transformers", "Streamlit", "Docker", "Kubernetes"];

/**
 * Demo en vivo del recomendador de anime: explica el pipeline RAG y enlaza
 * a la app desplegada y al repositorio.
 */
export function AnimeRecommender() {
  return (
    <section id="anime" aria-label="Demo de recomendador con LLM" className="relative scroll-mt-20 overflow-hidden bg-surface/30">
      <ParallaxGlow tone="success" className="-right-40 top-1/4" speed={0.3} />
      <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <SectionHeading
          eyebrow="lab · llmops"
          title="Anime Recommender: RAG en producción"
          description="Pídele una recomendación como se la pedirías a un amigo. Combina búsqueda semántica sobre un catálogo de anime con un LLM que razona sobre los resultados, todo contenerizado y desplegado detrás de Nginx."
        />

        <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <Reveal>
            <Card className="flex h-full flex-col p-6">
              <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-accent">cómo funciona</p>
              <ol className="space-y-4">
                {STEPS.map(({ icon: Icon, text }, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted">
                    <Icon className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                    {text}
                  </li>
                ))}
              </ol>

              <div className="mt-auto flex flex-wrap gap-1.5 pt-6">
                {STACK.map((tech) => (
                  <Badge key={tech}>{tech}</Badge>
                ))}
              </div>
            </Card>
          </Reveal>

          <Reveal delay={0.08}>
            <Card className="flex h-full flex-col p-6">
              <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-violet">pruébalo con</p>
              <ul className="space-y-2">
                {EXAMPLES.map((example) => (
                  <li
                    key={example}
                    className="rounded-lg border border-line-strong px-3 py-2 font-mono text-sm text-ink"
                  >
                    “{example}”
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                La primera consulta puede tardar unos segundos mientras el modelo de embeddings se carga.
              </p>
              <div className="mt-auto flex flex-wrap gap-3 pt-6">
                <Button asChild>
                  <a href={DEMO_URL} target="_blank" rel="noreferrer">
                    <ExternalLink aria-hidden="true" />
                    Abrir demo
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href={REPO_URL} target="_blank" rel="noreferrer">
                    <Github aria-hidden="true" />
                    Ver código
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
