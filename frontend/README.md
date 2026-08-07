# frontend — SPA del portfolio

SPA React 19 servida por nginx-unprivileged en `:8080` (solo el nginx edge publica puerto; ver `docs/CONTRACTS.md`).

## Stack

- **React 19 + TypeScript + Vite 6** — build con `tsc -b && vite build`, alias `@/` → `src/`.
- **TailwindCSS v4** — design tokens propios en `src/index.css` (`@theme`): fondo `#0a0a0f`, acento cian eléctrico + violeta, texto zinc, bordes con transparencia.
- **shadcn/ui (estilo)** — componentes propios en `src/components/ui` (button, card, badge, tabs, input…), con Radix (`Slot`, `Tabs`) + CVA.
- **Framer Motion** — reveals on-scroll, stagger del hero, menú móvil; `MotionConfig reducedMotion="user"`.
- **React Router v7 (library mode)** — `/`, `/projects/:slug`, `/blog`, `/blog/:slug`, 404; rutas secundarias con `React.lazy`.
- **TanStack Query v5** — REST `/api/v1` (envelope `{data, meta}`) vía `src/lib/api.ts`.
- **Apollo Client** — blog vía `/graphql` (queries `posts`/`post`, paginación cursor).
- **Zustand** — estado UI global (menú móvil).
- **React Hook Form + Zod** — formulario de contacto (validaciones del contrato, honeypot, ReCaptcha opcional, manejo del 429).
- **@fontsource** — Inter Variable + JetBrains Mono self-hosted (sin CDNs externos), con preload de la fuente crítica.

## Datos y resiliencia

Todas las llamadas usan **rutas relativas** (`/api/v1`, `/graphql`): nginx hace proxy.
`src/content/fallback.ts` contiene el mismo dataset demo del seed; los hooks
(`src/hooks/usePortfolioData.ts`) lo usan como `placeholderData` y como resultado
si la API falla — la web **nunca se ve rota**, con o sin backend.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173 (proxy /api, /graphql → localhost:80)
npm run build      # typecheck (tsc -b) + build de producción
npm run lint       # ESLint flat config
npm run typecheck  # tsc --noEmit
```

## Docker

```bash
docker build -t portfolio-frontend --build-arg VITE_APP_NAME=Portfolio .
docker run --rm -p 8080:8080 portfolio-frontend
```

Multi-stage: `node:22-alpine` (npm ci + build) → `nginxinc/nginx-unprivileged:1.27-alpine`
con `nginx.conf` propio: SPA fallback a `index.html`, cache inmutable de `/assets`
(nombres con hash), gzip y healthcheck `wget /` (igual que el compose).

## SEO

Meta tags completos + OpenGraph + Twitter Card + JSON-LD (`Person`) en `index.html`
(`lang="es"`), `public/robots.txt`, `public/sitemap.xml`, canonical, títulos por
ruta (`useDocumentTitle`).

## Estructura

```
src/
├── components/
│   ├── ui/          # kit estilo shadcn
│   ├── layout/      # Navbar (glass), Footer, SectionHeading
│   ├── motion/      # Reveal (fade/slide on-scroll)
│   └── sections/    # Hero (terminal typewriter), About, Skills, Experience,
│                    # Projects, Architecture (+ SystemDiagram SVG animado),
│                    # Certifications, Education, Contact
├── features/blog/   # queries GraphQL + PostCard
├── pages/           # Home, ProjectDetail, Blog, BlogPost, NotFound
├── hooks/           # usePortfolioData (queries resilientes), useDocumentTitle
├── lib/             # api.ts (REST tipado), apollo.ts, queryClient.ts, utils.ts
├── content/         # fallback.ts (dataset espejo del seed)
├── store/           # ui.ts (Zustand)
└── types/           # tipos espejo de docs/DATABASE.md
```
