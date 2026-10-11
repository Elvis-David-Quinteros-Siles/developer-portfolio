import {
  ArrowLeftRight,
  ChartColumn,
  ClipboardList,
  ExternalLink,
  Mail,
  Package,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Warehouse,
} from "lucide-react";
import { Link } from "react-router";

import { SectionHeading } from "@/components/layout/SectionHeading";
import { ParallaxGlow } from "@/components/motion/Parallax";
import { Reveal } from "@/components/motion/Reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** App en producción (proyecto ~/stocknova, servido en stocknova.edqs.online). */
const APP_URL = "https://stocknova.edqs.online";
/** Cuenta pública con rol "Demo": la API bloquea toda escritura (middleware ReadOnlyDemo). */
const DEMO_EMAIL = "demo@edqs.online";
const DEMO_PASSWORD = "demo-stocknova";

const MODULES = [
  { icon: Package, text: "Productos con precios por tipo de cliente, imágenes e importación desde Excel." },
  { icon: Warehouse, text: "Stock por almacén y sucursal, con umbrales y estado de existencias." },
  { icon: ShoppingCart, text: "Ventas, cotizaciones, pagos parciales, compras y devoluciones." },
  { icon: Truck, text: "Transferencias entre almacenes con control de salida y entrada." },
  { icon: ArrowLeftRight, text: "Conversión entre unidades de medida de un mismo producto." },
  { icon: ClipboardList, text: "Kardex por producto y exportación de reportes a Excel y PDF." },
  { icon: ChartColumn, text: "Dashboard con KPIs de ventas, compras y pagos pendientes." },
  { icon: ShieldCheck, text: "Autenticación JWT con roles y permisos granulares por módulo." },
] as const;

const FLOW = [
  "nginx (TLS) → contenedor frontend",
  "/        → SPA Vue 3 + Vuetify",
  "/api     → Laravel 11 (php-fpm) + worker de colas",
  "/storage → MinIO (imágenes, S3-compatible)",
  "Laravel  → PostgreSQL 16 (red dedicada)",
] as const;

const STACK = ["Laravel 11", "Vue 3", "Vuetify", "PostgreSQL", "MinIO", "JWT", "Docker", "GitLab CI"];

/**
 * Sistema de inventario en producción: módulos de negocio, arquitectura de
 * despliegue y acceso a la app.
 */
export function StockNova() {
  return (
    <section id="stocknova" aria-label="Sistema de inventario Stocknova" className="relative scroll-mt-20 overflow-hidden">
      <ParallaxGlow tone="accent" className="-left-40 top-1/3" speed={0.3} />
      <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <SectionHeading
          eyebrow="lab · full-stack"
          title="Stocknova: inventario multi-almacén"
          description="Sistema de gestión de inventario y ventas para negocios con varias sucursales. API REST en Laravel, panel en Vue y almacenamiento de objetos en MinIO, desplegado con Docker detrás de Nginx."
        />

        <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <Reveal>
            <Card className="flex h-full flex-col p-6">
              <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-accent">módulos</p>
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
              <p className="mt-6 mb-2 font-mono text-xs uppercase tracking-[0.2em] text-violet">cuenta demo · solo lectura</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg border border-line-strong p-4 font-mono text-sm">
                <dt className="text-muted">usuario</dt>
                <dd className="text-ink select-all">{DEMO_EMAIL}</dd>
                <dt className="text-muted">clave</dt>
                <dd className="text-ink select-all">{DEMO_PASSWORD}</dd>
              </dl>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Puedes recorrer todos los módulos; las operaciones de escritura están bloqueadas en la API.
              </p>
              <div className="mt-auto flex flex-wrap gap-3 pt-6">
                <Button asChild>
                  <a href={APP_URL} target="_blank" rel="noreferrer">
                    <ExternalLink aria-hidden="true" />
                    Abrir app
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/#contact">
                    <Mail aria-hidden="true" />
                    Contactar
                  </Link>
                </Button>
              </div>
            </Card>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
