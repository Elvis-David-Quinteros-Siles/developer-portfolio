import type {
  ArchitectureTopic,
  Certification,
  Education,
  Experience,
  Post,
  Profile,
  Project,
  SkillCategory,
} from "@/types/api";

/**
 * Contenido estático local, espejo del seed de la base de datos.
 * Si la API no responde, la web renderiza este contenido: NUNCA se ve rota.
 */

export const fallbackProfile: Profile = {
  id: "fallback-profile",
  full_name: "Elvis Quinteros",
  headline: "Backend Engineer · Software Architect · DevOps",
  bio: "Ingeniero de software enfocado en sistemas backend distribuidos, arquitectura limpia y plataformas cloud-native. Diseño y construyo servicios en Go y Python que escalan, se observan y se despliegan solos. Me obsesiona la calidad: contratos claros, tests que dan confianza y pipelines que no mienten.",
  photo_url: null,
  cv_url: "/cv.pdf",
  github_url: "https://github.com/elvisquinteros",
  linkedin_url: "https://www.linkedin.com/in/elvisquinteros",
  email: "dquinteros630@gmail.com",
  location: "La Paz, Bolivia",
  philosophy:
    "El software bien diseñado es el que se puede cambiar con confianza. La arquitectura no es un diagrama: es la suma de decisiones que hacen que el próximo cambio sea barato. Automatiza lo repetitivo, mide lo importante y deja el código mejor de lo que lo encontraste.",
};

export const fallbackSkillCategories: SkillCategory[] = [
  {
    id: "cat-backend",
    name: "Backend",
    slug: "backend",
    display_order: 1,
    skills: [
      {
        id: "sk-go",
        name: "Go",
        icon: "simple-icons:go",
        level: 5,
        years: 5,
        description: "APIs REST de alto rendimiento, concurrencia con goroutines, gRPC y workers.",
        display_order: 1,
      },
      {
        id: "sk-python",
        name: "Python / Django",
        icon: "simple-icons:django",
        level: 5,
        years: 7,
        description: "Django + DRF/Graphene, Celery, tareas asíncronas y modelado de dominio.",
        display_order: 2,
      },
      {
        id: "sk-node",
        name: "Node.js",
        icon: "simple-icons:nodedotjs",
        level: 4,
        years: 5,
        description: "Servicios HTTP y tooling; TypeScript end-to-end.",
        display_order: 3,
      },
      {
        id: "sk-graphql",
        name: "GraphQL",
        icon: "simple-icons:graphql",
        level: 4,
        years: 4,
        description: "Esquemas, DataLoader, paginación cursor y federación básica.",
        display_order: 4,
      },
    ],
  },
  {
    id: "cat-frontend",
    name: "Frontend",
    slug: "frontend",
    display_order: 2,
    skills: [
      {
        id: "sk-react",
        name: "React",
        icon: "simple-icons:react",
        level: 4,
        years: 5,
        description: "SPAs con React 19, TanStack Query, estados globales ligeros.",
        display_order: 1,
      },
      {
        id: "sk-ts",
        name: "TypeScript",
        icon: "simple-icons:typescript",
        level: 4,
        years: 5,
        description: "Tipado estricto, genéricos y contratos compartidos con el backend.",
        display_order: 2,
      },
      {
        id: "sk-tailwind",
        name: "TailwindCSS",
        icon: "simple-icons:tailwindcss",
        level: 4,
        years: 3,
        description: "Design systems utilitarios con tokens CSS.",
        display_order: 3,
      },
    ],
  },
  {
    id: "cat-db",
    name: "Bases de datos",
    slug: "databases",
    display_order: 3,
    skills: [
      {
        id: "sk-postgres",
        name: "PostgreSQL",
        icon: "simple-icons:postgresql",
        level: 5,
        years: 7,
        description: "Modelado, índices parciales, particionado, tuning de queries y CDC.",
        display_order: 1,
      },
      {
        id: "sk-redis",
        name: "Redis",
        icon: "simple-icons:redis",
        level: 4,
        years: 5,
        description: "Cache, rate limiting, colas y pub/sub.",
        display_order: 2,
      },
      {
        id: "sk-mongo",
        name: "MongoDB",
        icon: "simple-icons:mongodb",
        level: 3,
        years: 3,
        description: "Documentos, agregaciones y réplicas.",
        display_order: 3,
      },
    ],
  },
  {
    id: "cat-cloud",
    name: "Cloud",
    slug: "cloud",
    display_order: 4,
    skills: [
      {
        id: "sk-aws",
        name: "AWS",
        icon: "simple-icons:amazonwebservices",
        level: 4,
        years: 4,
        description: "ECS/EKS, RDS, S3, CloudFront, IAM y redes VPC.",
        display_order: 1,
      },
      {
        id: "sk-gcp",
        name: "Google Cloud",
        icon: "simple-icons:googlecloud",
        level: 3,
        years: 2,
        description: "Cloud Run, GKE y Pub/Sub.",
        display_order: 2,
      },
      {
        id: "sk-terraform",
        name: "Terraform",
        icon: "simple-icons:terraform",
        level: 4,
        years: 3,
        description: "Infraestructura como código, módulos reutilizables y workspaces.",
        display_order: 3,
      },
    ],
  },
  {
    id: "cat-devops",
    name: "DevOps",
    slug: "devops",
    display_order: 5,
    skills: [
      {
        id: "sk-docker",
        name: "Docker",
        icon: "simple-icons:docker",
        level: 5,
        years: 6,
        description: "Imágenes multi-stage mínimas, compose multi-red y hardening.",
        display_order: 1,
      },
      {
        id: "sk-k8s",
        name: "Kubernetes",
        icon: "simple-icons:kubernetes",
        level: 4,
        years: 4,
        description: "Deployments, HPA, operators, Helm y GitOps con ArgoCD.",
        display_order: 2,
      },
      {
        id: "sk-cicd",
        name: "CI/CD",
        icon: "simple-icons:githubactions",
        level: 5,
        years: 5,
        description: "GitHub Actions, pipelines con quality gates y despliegue continuo.",
        display_order: 3,
      },
      {
        id: "sk-observability",
        name: "Observabilidad",
        icon: "simple-icons:grafana",
        level: 4,
        years: 4,
        description: "Prometheus, Grafana, Loki y OpenTelemetry (trazas distribuidas).",
        display_order: 4,
      },
    ],
  },
  {
    id: "cat-arch",
    name: "Arquitectura",
    slug: "architecture",
    display_order: 6,
    skills: [
      {
        id: "sk-clean",
        name: "Clean Architecture",
        icon: "lucide:layers",
        level: 5,
        years: 5,
        description: "Dominios aislados de frameworks; dependencias apuntando hacia adentro.",
        display_order: 1,
      },
      {
        id: "sk-ddd",
        name: "DDD",
        icon: "lucide:shapes",
        level: 4,
        years: 4,
        description: "Bounded contexts, agregados y lenguaje ubicuo.",
        display_order: 2,
      },
      {
        id: "sk-events",
        name: "Event-Driven",
        icon: "lucide:radio",
        level: 4,
        years: 4,
        description: "Colas, outbox pattern, idempotencia y consistencia eventual.",
        display_order: 3,
      },
      {
        id: "sk-micro",
        name: "Microservicios",
        icon: "lucide:boxes",
        level: 4,
        years: 4,
        description: "Contratos entre servicios, API gateways y resiliencia.",
        display_order: 4,
      },
    ],
  },
];

export const fallbackProjects: Project[] = [
  {
    id: "prj-1",
    slug: "portfolio-microservices",
    title: "Portfolio Microservices Platform",
    summary:
      "Este mismo sitio: plataforma de microservicios con Nginx, gateway propio, API REST en Go, GraphQL en Django y pipeline asíncrono con Celery.",
    description:
      "Plataforma completa que sirve este portfolio. Un edge Nginx enruta hacia una SPA React y un gateway que aplica rate limiting con Redis, request-id y CORS antes de delegar en dos backends: Go (REST, lectura) y Django (GraphQL, dueño del esquema). El contacto viaja Cliente → Nginx → Gateway → Go → Django → PostgreSQL con notificación asíncrona vía Celery.",
    problem:
      "Los portfolios estáticos no demuestran ingeniería real: sin contratos entre servicios, sin observabilidad, sin decisiones de arquitectura que defender.",
    solution:
      "Arquitectura de microservicios con contratos congelados (CONTRACTS.md), un único dueño del esquema (ADR-0003), redes Docker segmentadas (edge/internal/data), health checks en cada contenedor y logs JSON con request-id propagado extremo a extremo.",
    outcome:
      "Un sistema reproducible con `docker compose up`: 8 contenedores orquestados, seguridad por segmentación de red y una demo tangible de Clean Architecture aplicada a algo real.",
    stack: ["Go", "Django", "GraphQL", "PostgreSQL", "Redis", "Celery", "Nginx", "Docker"],
    image_url: null,
    architecture_diagram_url: null,
    github_url: "https://github.com/elvisquinteros/portfolio",
    demo_url: "/",
    video_url: null,
    featured: true,
    display_order: 1,
    images: [],
  },
  {
    id: "prj-2",
    slug: "event-driven-orders",
    title: "Event-Driven Order System",
    summary:
      "Sistema de pedidos event-driven con outbox pattern, idempotencia y saga de compensación sobre RabbitMQ.",
    description:
      "Backend de pedidos para e-commerce donde cada cambio de estado emite eventos de dominio. Outbox pattern con relay para publicación atómica, consumidores idempotentes y una saga coreografiada para pagos y stock con compensaciones automáticas.",
    problem:
      "Los pedidos se procesaban de forma síncrona: un fallo en pagos bloqueaba todo el flujo y dejaba estados inconsistentes entre servicios.",
    solution:
      "Eventos de dominio con outbox pattern (publicación atómica con la transacción), consumidores idempotentes por event-id y saga de compensación para revertir stock/pago ante fallos parciales.",
    outcome:
      "Cero pedidos perdidos en pruebas de caos (kill -9 de consumidores), throughput 6x frente al flujo síncrono y trazabilidad completa por correlation-id.",
    stack: ["Go", "RabbitMQ", "PostgreSQL", "Docker", "OpenTelemetry"],
    image_url: null,
    architecture_diagram_url: null,
    github_url: "https://github.com/elvisquinteros/event-driven-orders",
    demo_url: null,
    video_url: null,
    featured: true,
    display_order: 2,
    images: [],
  },
  {
    id: "prj-3",
    slug: "k8s-gitops-platform",
    title: "K8s GitOps Platform",
    summary:
      "Plataforma interna de despliegue sobre Kubernetes con ArgoCD, Helm y previews efímeros por pull request.",
    description:
      "Plataforma de developer experience: cada PR levanta un entorno efímero con su propia URL, y el paso a producción es un merge. ArgoCD sincroniza el estado deseado desde Git; Helm parametriza por entorno; sealed-secrets gestiona credenciales.",
    problem:
      "Los despliegues manuales con kubectl generaban drift entre entornos y nadie sabía qué versión estaba realmente en producción.",
    solution:
      "GitOps puro: Git como única fuente de verdad, ArgoCD con auto-sync y self-heal, charts Helm versionados y entornos preview efímeros creados/destruidos por webhook de PR.",
    outcome:
      "Lead time de despliegue de 45 min a 3 min, rollbacks en un click (git revert) y drift eliminado por reconciliación continua.",
    stack: ["Kubernetes", "ArgoCD", "Helm", "GitHub Actions", "Terraform"],
    image_url: null,
    architecture_diagram_url: null,
    github_url: "https://github.com/elvisquinteros/k8s-gitops-platform",
    demo_url: null,
    video_url: null,
    featured: true,
    display_order: 3,
    images: [],
  },
  {
    id: "prj-4",
    slug: "observability-stack",
    title: "Observability Stack",
    summary:
      "Stack de observabilidad unificado: métricas, logs y trazas correlacionados con OpenTelemetry, Prometheus, Loki y Tempo.",
    description:
      "Plataforma de observabilidad para microservicios: instrumentación OpenTelemetry en Go y Python, colector central, métricas RED por servicio, logs estructurados correlacionados por trace-id y dashboards Grafana como código.",
    problem:
      "Debugging a ciegas: logs dispersos por contenedor, sin correlación entre un pico de latencia y la request que lo causó.",
    solution:
      "OpenTelemetry SDK + colector como pipeline único: trazas a Tempo, métricas a Prometheus, logs a Loki, todo correlacionado por trace-id y exemplars. Dashboards y alertas versionados en Git.",
    outcome:
      "MTTR reducido de horas a minutos: de una alerta a la traza exacta en dos clicks. Alertas por SLO en lugar de por síntoma.",
    stack: ["OpenTelemetry", "Prometheus", "Grafana", "Loki", "Tempo", "Kubernetes"],
    image_url: null,
    architecture_diagram_url: null,
    github_url: "https://github.com/elvisquinteros/observability-stack",
    demo_url: null,
    video_url: null,
    featured: false,
    display_order: 4,
    images: [],
  },
];

export const fallbackExperience: Experience[] = [
  {
    id: "exp-1",
    company: "TechCorp Global",
    role: "Senior Backend Engineer / Architect",
    location: "Remoto",
    start_date: "2022-03-01",
    end_date: null,
    description:
      "Diseño de la plataforma de servicios core: definición de contratos, revisión de arquitectura y mentoring técnico del equipo backend.",
    achievements: [
      "Lideré la migración de un monolito Django a servicios Go/Django con contratos versionados; despliegues de semanales a diarios.",
      "Diseñé el API gateway interno (rate limiting distribuido con Redis) que hoy atiende 40M requests/día.",
      "Implanté trazabilidad OpenTelemetry extremo a extremo: MTTR de incidentes -70%.",
    ],
    tech: ["Go", "Django", "PostgreSQL", "Redis", "Kubernetes", "OpenTelemetry"],
    display_order: 1,
  },
  {
    id: "exp-2",
    company: "DataFlow Solutions",
    role: "Backend Engineer",
    location: "La Paz, Bolivia",
    start_date: "2019-06-01",
    end_date: "2022-02-28",
    description:
      "Desarrollo de pipelines de datos y APIs para clientes fintech, con foco en fiabilidad y auditoría.",
    achievements: [
      "Construí un motor de conciliación bancaria event-driven que procesa 2M transacciones/noche.",
      "Reduje el p95 de la API principal de 800ms a 120ms (índices parciales + cache Redis).",
      "Introduje CI/CD con quality gates: cobertura mínima, análisis estático y despliegue azul/verde.",
    ],
    tech: ["Python", "Celery", "RabbitMQ", "PostgreSQL", "Docker", "AWS"],
    display_order: 2,
  },
  {
    id: "exp-3",
    company: "StartupLab",
    role: "Full-Stack Developer",
    location: "La Paz, Bolivia",
    start_date: "2017-01-01",
    end_date: "2019-05-31",
    description:
      "Primer empleo formal: desarrollo de productos web para startups del programa de aceleración.",
    achievements: [
      "Entregué 6 MVPs en producción con Django y React.",
      "Automaticé el aprovisionamiento de entornos con Docker Compose, reduciendo el onboarding de días a horas.",
    ],
    tech: ["Django", "React", "PostgreSQL", "Docker"],
    display_order: 3,
  },
];

export const fallbackCertifications: Certification[] = [
  {
    id: "cert-1",
    name: "Certified Kubernetes Administrator (CKA)",
    issuer: "Cloud Native Computing Foundation",
    issue_date: "2024-05-10",
    expires_at: "2027-05-10",
    credential_id: "CKA-2024-018342",
    credential_url: "https://training.linuxfoundation.org/certification/verify",
    badge_url: null,
  },
  {
    id: "cert-2",
    name: "AWS Certified Solutions Architect – Associate",
    issuer: "Amazon Web Services",
    issue_date: "2023-09-22",
    expires_at: "2026-09-22",
    credential_id: "AWS-SAA-C03-77291",
    credential_url: "https://aws.amazon.com/verification",
    badge_url: null,
  },
  {
    id: "cert-3",
    name: "HashiCorp Certified: Terraform Associate",
    issuer: "HashiCorp",
    issue_date: "2023-03-15",
    expires_at: "2025-03-15",
    credential_id: "HC-TA-003-55810",
    credential_url: "https://www.credly.com",
    badge_url: null,
  },
  {
    id: "cert-4",
    name: "Professional Scrum Master I (PSM I)",
    issuer: "Scrum.org",
    issue_date: "2021-11-02",
    expires_at: null,
    credential_id: "PSM-I-482913",
    credential_url: "https://www.scrum.org/certificates",
    badge_url: null,
  },
];

export const fallbackEducation: Education[] = [
  {
    id: "edu-1",
    institution: "Universidad Mayor de San Andrés",
    degree: "Licenciatura",
    field: "Ingeniería de Sistemas",
    start_date: "2012-02-01",
    end_date: "2017-11-30",
    description:
      "Énfasis en ingeniería de software y sistemas distribuidos. Proyecto de grado: plataforma de telemetría IoT con arquitectura orientada a eventos.",
  },
  {
    id: "edu-2",
    institution: "Universidad Católica Boliviana",
    degree: "Diplomado",
    field: "Arquitectura de Software y Cloud Computing",
    start_date: "2020-03-01",
    end_date: "2020-12-15",
    description:
      "Patrones de arquitectura distribuida, diseño dirigido por el dominio y despliegue en plataformas cloud.",
  },
];

export const fallbackArchitectureTopics: ArchitectureTopic[] = [
  {
    id: "arch-1",
    slug: "clean-architecture",
    title: "Clean Architecture",
    category: "patterns",
    description:
      "Dependencias apuntando hacia el dominio: el negocio no conoce frameworks, bases de datos ni transporte. Cambiar Postgres o HTTP es un detalle, no una crisis.",
    diagram_url: null,
    display_order: 1,
  },
  {
    id: "arch-2",
    slug: "ddd",
    title: "Domain-Driven Design",
    category: "patterns",
    description:
      "Bounded contexts con lenguaje ubicuo, agregados que protegen invariantes y un único escritor por tabla (ADR-0003) para que la consistencia sea razonable.",
    diagram_url: null,
    display_order: 2,
  },
  {
    id: "arch-3",
    slug: "hexagonal",
    title: "Hexagonal (Ports & Adapters)",
    category: "patterns",
    description:
      "El dominio expone puertos; HTTP, Postgres o Redis son adaptadores intercambiables. Testear el core no requiere levantar infraestructura.",
    diagram_url: null,
    display_order: 3,
  },
  {
    id: "arch-4",
    slug: "cqrs",
    title: "CQRS",
    category: "patterns",
    description:
      "Lecturas y escrituras con modelos separados: Go sirve queries optimizadas de solo lectura; Django es el único que muta el esquema. Este portfolio lo aplica literalmente.",
    diagram_url: null,
    display_order: 4,
  },
  {
    id: "arch-5",
    slug: "event-driven",
    title: "Event-Driven",
    category: "patterns",
    description:
      "Comunicación asíncrona con outbox pattern, consumidores idempotentes y colas (Redis/RabbitMQ). El contacto de este sitio encola su notificación en Celery.",
    diagram_url: null,
    display_order: 5,
  },
  {
    id: "arch-6",
    slug: "microservices",
    title: "Microservicios",
    category: "patterns",
    description:
      "Servicios pequeños con contratos congelados (CONTRACTS.md), gateway con rate limiting y redes segmentadas: edge, internal y data.",
    diagram_url: null,
    display_order: 6,
  },
  {
    id: "arch-7",
    slug: "docker",
    title: "Docker",
    category: "infra",
    description:
      "Imágenes multi-stage mínimas (distroless/alpine), usuarios sin privilegios, healthchecks y compose multi-red como entorno reproducible.",
    diagram_url: null,
    display_order: 7,
  },
  {
    id: "arch-8",
    slug: "kubernetes",
    title: "Kubernetes",
    category: "infra",
    description:
      "Deployments declarativos, probes de liveness/readiness, HPA y GitOps con ArgoCD: el cluster converge al estado declarado en Git.",
    diagram_url: null,
    display_order: 8,
  },
  {
    id: "arch-9",
    slug: "cicd",
    title: "CI/CD",
    category: "infra",
    description:
      "Pipelines con quality gates: lint, tests, análisis estático, build de imagen y despliegue continuo. Si el pipeline no pasa, no existe.",
    diagram_url: null,
    display_order: 9,
  },
  {
    id: "arch-10",
    slug: "observability",
    title: "Observabilidad",
    category: "observability",
    description:
      "Logs JSON estructurados, métricas RED y request-id propagado de Nginx a Postgres. No se opera lo que no se puede observar.",
    diagram_url: null,
    display_order: 10,
  },
];

export const fallbackPosts: Post[] = [
  {
    id: "post-1",
    slug: "un-solo-escritor-por-tabla",
    title: "Un solo escritor por tabla: la regla que simplificó mi arquitectura",
    excerpt:
      "Go lee, Django escribe. Por qué darle la propiedad del esquema a un único servicio eliminó una clase entera de bugs de consistencia.",
    coverUrl: null,
    tags: ["arquitectura", "postgresql", "microservicios"],
    publishedAt: "2025-06-14T09:00:00Z",
    readingMinutes: 7,
    content: `## El problema

Cuando dos servicios escriben en la misma tabla, cada migración es una negociación
y cada bug de consistencia es una investigación forense. En este portfolio decidí
aplicar una regla radical: **cada tabla tiene exactamente un escritor**.

## La regla en la práctica

- **Django** es el dueño del esquema: migraciones, escrituras, validación de dominio.
- **Go** consume las tablas como sistema externo: repositorios de *solo lectura*.
- El formulario de contacto lo recibe Go... pero **delega la escritura a Django**
  vía una mutation GraphQL interna con \`X-Internal-Token\`.

\`\`\`text
Cliente → Nginx → Gateway → Go (valida) → Django (persiste) → PostgreSQL
\`\`\`

## Qué gané

1. Las migraciones tienen un único origen (Django ORM): cero drift de esquema.
2. Los invariantes de dominio viven en un solo lugar.
3. Razonar sobre consistencia es trivial: si la fila existe, la escribió Django.

## Qué perdí

Latencia: el hop Go→Django añade ~5ms y un modo de fallo (timeout de 5s → 503).
Lo acepto con gusto: es un modo de fallo *explícito* en lugar de una corrupción silenciosa.

> La consistencia no se debuggea. Se diseña.`,
  },
  {
    id: "post-2",
    slug: "rate-limiting-distribuido-redis",
    title: "Rate limiting distribuido con Redis: del algoritmo al gateway",
    excerpt:
      "Sliding window con Redis para proteger un formulario de contacto (y todo lo demás): implementación, trampas y cómo responder un 429 decente.",
    coverUrl: null,
    tags: ["go", "redis", "gateway"],
    publishedAt: "2025-04-02T09:00:00Z",
    readingMinutes: 9,
    content: `## Por qué en el gateway

El rate limiting pertenece al borde: cuando la request llega al servicio de negocio
ya pagaste el costo. En esta plataforma, el gateway consulta Redis **antes** de
enrutar a Go o Django.

## Sliding window en Redis

\`\`\`go
// pseudocódigo del middleware
key := "rl:" + clientIP + ":" + route
count, _ := redis.Incr(ctx, key)
if count == 1 {
    redis.Expire(ctx, key, window)
}
if count > limit {
    w.WriteHeader(429)
    w.Header().Set("Retry-After", strconv.Itoa(retryAfter))
    return
}
\`\`\`

Trampas reales:

- **INCR + EXPIRE no es atómico**: usa un script Lua o \`SET ... EX NX\`.
- El límite por IP muere detrás de un NAT corporativo: combina IP + ruta y sé generoso.
- Devuelve \`Retry-After\`: el frontend puede mostrar "intenta en 30s" en lugar de un error críptico.

## El 429 también es UX

El frontend de este sitio trata el 429 como estado de primera clase: mensaje claro,
sin perder lo que el usuario escribió. Un rate limit sin UX es solo un bug intermitente.`,
  },
  {
    id: "post-3",
    slug: "healthchecks-que-no-mienten",
    title: "Healthchecks que no mienten",
    excerpt:
      "Liveness no es readiness, y devolver 200 sin comprobar nada es peor que no tener healthcheck. Cómo están cableados los 8 contenedores de este sitio.",
    coverUrl: null,
    tags: ["docker", "devops", "observabilidad"],
    publishedAt: "2025-02-18T09:00:00Z",
    readingMinutes: 6,
    content: `## Liveness ≠ Readiness

- **Liveness** (\`/healthz\`): ¿el proceso está vivo? Si falla, reinicia.
- **Readiness** (\`/readyz\`): ¿puedo atender tráfico? Comprueba dependencias (DB, Redis).

Confundirlos produce reinicios en cascada: si liveness comprueba la base de datos,
una caída de Postgres reinicia *toda* la flota sin arreglar nada.

## En docker-compose

Cada servicio de esta plataforma declara su healthcheck, y \`depends_on\` usa
\`condition: service_healthy\`:

\`\`\`yaml
go-api:
  depends_on:
    graphql-api:
      condition: service_healthy  # garantiza esquema migrado
\`\`\`

Esto codifica el orden real de arranque: Go no arranca hasta que Django migró el
esquema, porque *Django es el dueño del esquema*.

## Regla de oro

Un healthcheck debe poder fallar. Si nunca has visto el tuyo en rojo,
probablemente no comprueba nada.`,
  },
];

/** Búsqueda local de un proyecto por slug (fallback del detalle). */
export function findFallbackProject(slug: string): Project | undefined {
  return fallbackProjects.find((p) => p.slug === slug);
}

/** Búsqueda local de un post por slug (fallback del blog). */
export function findFallbackPost(slug: string): Post | undefined {
  return fallbackPosts.find((p) => p.slug === slug);
}
