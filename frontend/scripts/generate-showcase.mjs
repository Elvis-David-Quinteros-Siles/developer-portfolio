// One-off: descarga fotos de prueba (picsum.photos, seeds fijos → deterministas)
// para las tarjetas del showcase parallax y las guarda como WebP optimizado.
// Uso: npm run showcase   (requiere red + devDependency `sharp`)
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "showcase");

const W = 960;
const H = 640;

/** slug de la tarjeta → seed de picsum (elegidos por su tono/composición). */
const SLUGS = {
  // proyectos
  "portfolio-microservices": "circuit-nodes",
  "event-driven-orders": "night-harbor",
  "k8s-gitops-platform": "container-yard",
  "observability-stack": "observatory-sky",
  // arquitectura
  "clean-architecture": "concrete-lines",
  ddd: "map-lines",
  hexagonal: "honeycomb-glass",
  cqrs: "split-tunnel",
  "event-driven": "light-trails",
  microservices: "modular-blocks",
  docker: "cargo-port",
  kubernetes: "ship-helm",
  cicd: "conveyor",
  observability: "telescope",
  // stack
  backend: "server-room",
  frontend: "glass-facade",
  databases: "library-stacks",
  cloud: "clouds-above",
  devops: "control-room",
  architecture: "bridge-structure",
};

await mkdir(outDir, { recursive: true });

for (const [slug, seed] of Object.entries(SLUGS)) {
  const url = `https://picsum.photos/seed/${seed}/${W}/${H}`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    console.error(`✗ ${slug}: HTTP ${res.status}`);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const out = await sharp(buf)
    .resize(W, H, { fit: "cover" })
    // Ligero viraje frío para que las fotos convivan con el tema oscuro
    .modulate({ brightness: 0.85, saturation: 0.8 })
    .tint({ r: 190, g: 205, b: 235 })
    .webp({ quality: 74 })
    .toBuffer();
  await writeFile(join(outDir, `${slug}.webp`), out);
  console.log(`✓ ${slug}.webp (${(out.length / 1024).toFixed(0)} KB)`);
}
