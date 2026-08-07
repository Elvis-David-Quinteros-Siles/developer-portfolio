// One-off: genera public/og.png (1200×630) coherente con el design system.
// Uso: npm run og  (requiere devDependency `sharp`)
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const W = 1200;
const H = 630;

const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
      <path d="M 44 0 H 0 V 44" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
    </pattern>
    <radialGradient id="glow" cx="50%" cy="0%" r="85%">
      <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.16"/>
      <stop offset="55%" stop-color="#22d3ee" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#22d3ee" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#22d3ee"/>
      <stop offset="1" stop-color="#a78bfa"/>
    </linearGradient>
    <radialGradient id="fade" cx="50%" cy="35%" r="80%">
      <stop offset="0%" stop-color="#0a0a0f" stop-opacity="0"/>
      <stop offset="100%" stop-color="#0a0a0f" stop-opacity="0.9"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="#0a0a0f"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <rect width="${W}" height="${H}" fill="url(#fade)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- logo eq -->
  <rect x="92" y="96" width="72" height="72" rx="16" fill="rgba(34,211,238,0.08)" stroke="url(#accent)" stroke-width="2"/>
  <text x="128" y="144" text-anchor="middle" font-family="Consolas, 'Courier New', monospace" font-size="34" font-weight="700" fill="#22d3ee">eq</text>

  <!-- nombre -->
  <text x="92" y="330" font-family="'Segoe UI', Arial, sans-serif" font-size="88" font-weight="700" fill="#e4e4e7" letter-spacing="-2">Elvis Quinteros</text>

  <!-- headline -->
  <text x="92" y="402" font-family="Consolas, 'Courier New', monospace" font-size="34" fill="#22d3ee">Backend Engineer · Software Architect · DevOps</text>

  <!-- chips de stack -->
  <g font-family="Consolas, 'Courier New', monospace" font-size="22" fill="#a1a1aa">
    <rect x="92" y="452" width="70" height="42" rx="9" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)"/>
    <text x="127" y="480" text-anchor="middle">Go</text>
    <rect x="176" y="452" width="112" height="42" rx="9" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)"/>
    <text x="232" y="480" text-anchor="middle">Django</text>
    <rect x="302" y="452" width="160" height="42" rx="9" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)"/>
    <text x="382" y="480" text-anchor="middle">PostgreSQL</text>
    <rect x="476" y="452" width="176" height="42" rx="9" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)"/>
    <text x="564" y="480" text-anchor="middle">Kubernetes</text>
    <rect x="666" y="452" width="112" height="42" rx="9" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)"/>
    <text x="722" y="480" text-anchor="middle">Docker</text>
  </g>

  <!-- url -->
  <text x="92" y="566" font-family="Consolas, 'Courier New', monospace" font-size="24" fill="#6b6b76">elvisquinteros.dev</text>

  <!-- barra de acento inferior -->
  <rect x="0" y="${H - 6}" width="${W}" height="6" fill="url(#accent)"/>
</svg>`;

const out = join(root, "public", "og.png");
await sharp(Buffer.from(svg), { density: 96 }).png().toFile(out);
console.log("OK →", out);
