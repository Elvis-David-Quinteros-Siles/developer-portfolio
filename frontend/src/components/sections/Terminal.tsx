import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

interface TermLine {
  kind: "cmd" | "out" | "ok";
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

/** Terminal animada tipo typewriter con comandos docker/k8s. */
export function Terminal() {
  const reduced = useReducedMotion();
  const [lineIdx, setLineIdx] = useState(0);
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    if (reduced) return;

    const line = SCRIPT[lineIdx];
    let timer: ReturnType<typeof setTimeout>;

    if (!line) {
      // Fin del guion: pausa larga y reinicio
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
  }, [reduced, lineIdx, charCount]);

  const visible: { line: TermLine; partial: boolean }[] = reduced
    ? SCRIPT.map((line) => ({ line, partial: false }))
    : SCRIPT.slice(0, lineIdx + 1)
        .filter((l): l is TermLine => Boolean(l))
        .map((line, i) => ({ line, partial: i === lineIdx }));

  return (
    <div
      role="img"
      aria-label="Terminal con comandos de Docker y Kubernetes desplegando esta plataforma"
      className="glow-accent w-full overflow-hidden rounded-xl2 border border-line-strong bg-[#0c0c14]/95 shadow-2xl"
    >
      <div className="flex items-center gap-1.5 border-b border-line px-4 py-3">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" aria-hidden="true" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" aria-hidden="true" />
        <span className="size-2.5 rounded-full bg-[#28c840]" aria-hidden="true" />
        <span className="ml-3 font-mono text-xs text-faint">elvis@platform ~ zsh</span>
      </div>
      <div className="min-h-56 space-y-1.5 p-4 font-mono text-[0.8rem] leading-relaxed">
        {visible.map(({ line, partial }, i) => {
          const text =
            partial && line.kind === "cmd" && !reduced ? line.text.slice(0, charCount) : line.text;
          return (
            <p key={i} className="whitespace-pre-wrap break-all">
              {line.kind === "cmd" ? (
                <>
                  <span className="text-violet">❯ </span>
                  <span className="text-ink">{text}</span>
                  {partial && !reduced && (
                    <span className="animate-blink text-accent" aria-hidden="true">
                      ▍
                    </span>
                  )}
                </>
              ) : (
                <span className={line.kind === "ok" ? "text-success" : "text-muted"}>{text}</span>
              )}
            </p>
          );
        })}
      </div>
    </div>
  );
}
