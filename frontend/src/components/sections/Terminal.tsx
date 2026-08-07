import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router";

import { useProfile, useProjects, useSkillCategories } from "@/hooks/usePortfolioData";

interface TermLine {
  kind: "cmd" | "out" | "ok" | "err";
  text: string;
}

const SCRIPT: TermLine[] = [
  { kind: "cmd", text: "docker compose up -d --build" },
  { kind: "ok", text: "✔ nginx · gateway · go-api · graphql-api — healthy (8/8)" },
  { kind: "cmd", text: "kubectl get pods -n portfolio" },
  { kind: "out", text: "gateway-7d4f9b    1/1   Running   0   2m" },
  { kind: "out", text: "go-api-5c77d8     1/1   Running   0   2m" },
  { kind: "cmd", text: "curl -s localhost/api/v1/healthz" },
  { kind: "ok", text: '{"status":"ok","request_id":"9f3ac1"}' },
];

const TYPE_MS = 38;
const CMD_PAUSE_MS = 500;
const OUT_PAUSE_MS = 320;
const LOOP_PAUSE_MS = 4200;

const PROMPT = "elvis@portfolio:~$";

const HELP: TermLine[] = [
  { kind: "out", text: "comandos disponibles:" },
  { kind: "out", text: "  help           esta ayuda" },
  { kind: "out", text: "  whoami         quién está detrás de esto" },
  { kind: "out", text: "  skills         top tecnologías" },
  { kind: "out", text: "  projects       lista de proyectos" },
  { kind: "out", text: "  open <slug>    abre el detalle de un proyecto" },
  { kind: "out", text: "  contact        ir al formulario de contacto" },
  { kind: "out", text: "  cv             descargar el CV en PDF" },
  { kind: "out", text: "  clear          limpiar la pantalla" },
];

function levelBar(level: number): string {
  return "▮".repeat(level) + "▯".repeat(Math.max(0, 5 - level));
}

/**
 * Terminal del hero: reproduce un guion typewriter (docker/k8s) hasta que el
 * visitante interactúa; entonces se convierte en una terminal real con
 * comandos, historial (↑/↓) y navegación. Respeta prefers-reduced-motion.
 */
export function Terminal() {
  const reduced = useReducedMotion();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: projects } = useProjects();
  const { data: skillCategories } = useSkillCategories();

  // Modo demo (typewriter)
  const [lineIdx, setLineIdx] = useState(0);
  const [charCount, setCharCount] = useState(0);

  // Modo interactivo
  const [interactive, setInteractive] = useState(false);
  const [entries, setEntries] = useState<TermLine[]>([]);
  const [value, setValue] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histPos, setHistPos] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Typewriter: corre solo mientras nadie ha interactuado
  useEffect(() => {
    if (reduced || interactive) return;

    const line = SCRIPT[lineIdx];
    let timer: ReturnType<typeof setTimeout>;

    if (!line) {
      timer = setTimeout(() => {
        setLineIdx(0);
        setCharCount(0);
      }, LOOP_PAUSE_MS);
    } else if (line.kind === "cmd" && charCount < line.text.length) {
      timer = setTimeout(() => setCharCount((c) => c + 1), TYPE_MS);
    } else {
      timer = setTimeout(
        () => {
          setLineIdx((i) => i + 1);
          setCharCount(0);
        },
        line.kind === "cmd" ? CMD_PAUSE_MS : OUT_PAUSE_MS,
      );
    }

    return () => clearTimeout(timer);
  }, [reduced, interactive, lineIdx, charCount]);

  // Autoscroll al fondo cuando crece el log
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries, lineIdx, charCount, interactive]);

  const activate = () => {
    if (!interactive) {
      setInteractive(true);
      setEntries([
        { kind: "ok", text: "modo interactivo activado — escribe 'help' para ver los comandos" },
      ]);
    }
    inputRef.current?.focus();
  };

  const run = (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;

    setCmdHistory((h) => [...h, cmd]);
    setHistPos(null);

    const [name = "", ...args] = cmd.split(/\s+/);
    const lower = name.toLowerCase();

    if (lower === "clear") {
      setEntries([]);
      return;
    }

    const output: TermLine[] = [{ kind: "cmd", text: cmd }];

    switch (lower) {
      case "help":
        output.push(...HELP);
        break;

      case "whoami":
        output.push(
          { kind: "ok", text: profile.full_name },
          { kind: "out", text: profile.headline },
          { kind: "out", text: `📍 ${profile.location} · ${profile.email}` },
          { kind: "out", text: profile.philosophy },
        );
        break;

      case "skills": {
        const top = skillCategories
          .flatMap((c) => c.skills)
          .filter((s) => s.level >= 4)
          .sort((a, b) => b.level - a.level || b.years - a.years)
          .slice(0, 8);
        output.push(
          ...top.map(
            (s): TermLine => ({
              kind: "out",
              text: `${s.name.padEnd(18)} ${levelBar(s.level)}  ${s.years} años`,
            }),
          ),
          { kind: "ok", text: "→ lista completa en la sección Tecnologías" },
        );
        break;
      }

      case "projects":
        output.push(
          ...projects.map(
            (p): TermLine => ({ kind: "out", text: `${p.slug.padEnd(26)} ${p.title}` }),
          ),
          { kind: "ok", text: "→ usa: open <slug>" },
        );
        break;

      case "open": {
        const slug = args[0];
        if (!slug) {
          output.push({ kind: "err", text: "uso: open <slug> — mira 'projects' para los slugs" });
        } else if (projects.some((p) => p.slug === slug)) {
          output.push({ kind: "ok", text: `abriendo /projects/${slug} …` });
          setEntries((prev) => [...prev, ...output]);
          void navigate(`/projects/${slug}`);
          return;
        } else {
          output.push({ kind: "err", text: `proyecto no encontrado: ${slug} — prueba 'projects'` });
        }
        break;
      }

      case "contact":
        output.push({ kind: "ok", text: "desplazando al formulario de contacto…" });
        document.getElementById("contact")?.scrollIntoView({
          behavior: reduced ? "auto" : "smooth",
          block: "start",
        });
        break;

      case "cv": {
        output.push({ kind: "ok", text: "descargando cv.pdf…" });
        const a = document.createElement("a");
        a.href = "/cv.pdf";
        a.download = "";
        a.click();
        break;
      }

      default:
        output.push({ kind: "err", text: `comando no encontrado: ${name} — prueba 'help'` });
    }

    setEntries((prev) => [...prev, ...output]);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      run(value);
      setValue("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const pos = histPos === null ? cmdHistory.length - 1 : Math.max(0, histPos - 1);
      setHistPos(pos);
      setValue(cmdHistory[pos] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histPos === null) return;
      const pos = histPos + 1;
      if (pos >= cmdHistory.length) {
        setHistPos(null);
        setValue("");
      } else {
        setHistPos(pos);
        setValue(cmdHistory[pos] ?? "");
      }
    }
  };

  // Líneas del guion demo (completas si ya es interactivo o reduced-motion)
  const demoLines: { line: TermLine; partial: boolean }[] =
    reduced || interactive
      ? (interactive ? SCRIPT.slice(0, lineIdx + 1) : SCRIPT)
          .filter((l): l is TermLine => Boolean(l))
          .map((line) => ({ line, partial: false }))
      : SCRIPT.slice(0, lineIdx + 1)
          .filter((l): l is TermLine => Boolean(l))
          .map((line, i) => ({ line, partial: i === lineIdx }));

  const renderLine = ({ line, partial }: { line: TermLine; partial: boolean }, key: number) => {
    const text =
      partial && line.kind === "cmd" && !reduced ? line.text.slice(0, charCount) : line.text;
    return (
      <p key={key} className="whitespace-pre-wrap break-all">
        {line.kind === "cmd" ? (
          <>
            <span className="text-violet">❯ </span>
            <span className="text-ink">{text}</span>
            {partial && !reduced && !interactive && (
              <span className="animate-blink text-accent" aria-hidden="true">
                ▍
              </span>
            )}
          </>
        ) : (
          <span
            className={
              line.kind === "ok"
                ? "text-success"
                : line.kind === "err"
                  ? "text-danger"
                  : "text-muted"
            }
          >
            {text}
          </span>
        )}
      </p>
    );
  };

  return (
    <section
      aria-label="Terminal interactiva: haz click o pulsa Tab hasta el campo de comandos y escribe 'help'"
      className="glow-accent w-full overflow-hidden rounded-xl2 border border-line-strong bg-[#0c0c14]/95 shadow-2xl"
      onClick={activate}
    >
      <div className="flex items-center gap-1.5 border-b border-line px-4 py-3">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" aria-hidden="true" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" aria-hidden="true" />
        <span className="size-2.5 rounded-full bg-[#28c840]" aria-hidden="true" />
        <span className="ml-3 font-mono text-xs text-faint">elvis@platform ~ zsh</span>
        {!interactive && (
          <span className="ml-auto hidden font-mono text-[0.65rem] text-faint sm:inline">
            click para interactuar
          </span>
        )}
      </div>

      <div
        ref={scrollRef}
        className="h-60 space-y-1.5 overflow-y-auto p-4 font-mono text-[0.8rem] leading-relaxed sm:h-64"
      >
        <div aria-live={interactive ? "polite" : "off"}>
          {demoLines.map(renderLine)}
          {interactive &&
            entries.map((line, i) => renderLine({ line, partial: false }, i + SCRIPT.length))}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="terminal-input" className="shrink-0 text-accent">
            {PROMPT}
          </label>
          <input
            id="terminal-input"
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={activate}
            aria-label="Entrada de comandos de la terminal. Escribe help y pulsa Enter para ver los comandos disponibles"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="send"
            placeholder={interactive ? "" : "escribe 'help'…"}
            className="min-w-0 flex-1 border-none bg-transparent p-0 font-mono text-[0.8rem] text-ink caret-accent outline-none placeholder:text-faint focus:outline-none focus-visible:outline-none"
          />
        </div>
      </div>
    </section>
  );
}
