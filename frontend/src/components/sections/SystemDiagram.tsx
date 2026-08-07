import { useId } from "react";

interface NodeProps {
  x: number;
  y: number;
  w?: number;
  h?: number;
  title: string;
  subtitle: string;
  accent?: boolean;
}

function DiagramNode({ x, y, w = 130, h = 56, title, subtitle, accent = false }: NodeProps) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={10}
        fill="var(--color-surface)"
        stroke={accent ? "rgb(34 211 238 / 0.5)" : "var(--color-line-strong)"}
        strokeWidth={1}
      />
      <text
        x={x + w / 2}
        y={y + 24}
        textAnchor="middle"
        fill="var(--color-ink)"
        fontSize={13}
        fontWeight={600}
        fontFamily="var(--font-mono)"
      >
        {title}
      </text>
      <text
        x={x + w / 2}
        y={y + 42}
        textAnchor="middle"
        fill="var(--color-faint)"
        fontSize={10}
        fontFamily="var(--font-mono)"
      >
        {subtitle}
      </text>
    </g>
  );
}

interface EdgeProps {
  d: string;
  label?: string;
  lx?: number;
  ly?: number;
  animated?: boolean;
  markerId: string;
}

function DiagramEdge({ d, label, lx, ly, animated = true, markerId }: EdgeProps) {
  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={animated ? "rgb(34 211 238 / 0.55)" : "rgb(167 139 250 / 0.45)"}
        strokeWidth={1.5}
        strokeDasharray="6 6"
        className={animated ? "animate-flow" : undefined}
        markerEnd={`url(#${markerId})`}
      />
      {label && lx !== undefined && ly !== undefined && (
        <text
          x={lx}
          y={ly}
          textAnchor="middle"
          fill="var(--color-muted)"
          fontSize={9.5}
          fontFamily="var(--font-mono)"
        >
          {label}
        </text>
      )}
    </g>
  );
}

/**
 * Diagrama SVG animado de la propia plataforma del portfolio:
 * Cliente → Nginx → Gateway → (Go REST | Django GraphQL) → PostgreSQL,
 * con Redis/Celery para el pipeline asíncrono. Ver docs/CONTRACTS.md §1-2, §6.
 */
export function SystemDiagram() {
  const id = useId();
  const markerId = `arrow-${id}`;

  return (
    <figure className="overflow-x-auto rounded-xl2 border border-line bg-[#0c0c14]/80 p-4 sm:p-6">
      <svg
        viewBox="0 0 960 330"
        role="img"
        aria-labelledby={`${id}-title ${id}-desc`}
        className="min-w-[720px]"
      >
        <title id={`${id}-title`}>Arquitectura de esta plataforma</title>
        <desc id={`${id}-desc`}>
          El cliente entra por Nginx, que enruta al gateway. El gateway aplica rate limiting y envía
          REST a la API Go y GraphQL a Django. El contacto viaja de Go a Django mediante una
          mutation interna, Django persiste en PostgreSQL y encola notificaciones en Redis para
          Celery.
        </desc>

        <defs>
          <marker
            id={markerId}
            viewBox="0 0 10 10"
            refX={9}
            refY={5}
            markerWidth={7}
            markerHeight={7}
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 9 5 L 0 9 z" fill="rgb(34 211 238 / 0.7)" />
          </marker>
        </defs>

        {/* Flujo principal */}
        <DiagramEdge markerId={markerId} d="M 120 165 H 158" label="https" lx={139} ly={155} />
        <DiagramEdge markerId={markerId} d="M 288 165 H 326" label="proxy" lx={307} ly={155} />
        <DiagramEdge
          markerId={markerId}
          d="M 466 150 C 500 120, 500 108, 528 95"
          label="/api/v1"
          lx={496}
          ly={108}
        />
        <DiagramEdge
          markerId={markerId}
          d="M 466 180 C 500 210, 500 222, 528 235"
          label="/graphql"
          lx={496}
          ly={232}
        />
        <DiagramEdge
          markerId={markerId}
          d="M 605 123 V 205"
          label="mutation interna"
          lx={676}
          ly={168}
        />
        <DiagramEdge
          markerId={markerId}
          d="M 680 80 C 740 85, 760 120, 776 148"
          label="SQL (ro)"
          lx={748}
          ly={100}
        />
        <DiagramEdge
          markerId={markerId}
          d="M 680 250 C 740 245, 760 210, 776 182"
          label="SQL (rw)"
          lx={748}
          ly={238}
        />
        <DiagramEdge
          markerId={markerId}
          animated={false}
          d="M 680 262 C 730 275, 750 285, 788 290"
          label="colas"
          lx={738}
          ly={297}
        />

        {/* Nodos */}
        <DiagramNode x={10} y={137} w={110} title="Cliente" subtitle="navegador" />
        <DiagramNode x={158} y={137} title="Nginx" subtitle="edge :80" accent />
        <DiagramNode x={326} y={137} w={140} title="Gateway" subtitle="rate-limit · CORS" accent />
        <DiagramNode x={528} y={52} w={152} title="Go API" subtitle="REST · lectura" />
        <DiagramNode x={528} y={222} w={152} title="Django" subtitle="GraphQL · escritor" />
        <DiagramNode x={776} y={137} w={150} title="PostgreSQL" subtitle="db portfolio" accent />
        <DiagramNode x={788} y={268} w={138} h={48} title="Redis · Celery" subtitle="async jobs" />
      </svg>
      <figcaption className="mt-3 font-mono text-xs text-faint">
        Este mismo sitio: solo Nginx expone puerto; redes segmentadas edge / internal / data. Django
        es el único escritor del esquema (ADR-0003).
      </figcaption>
    </figure>
  );
}
