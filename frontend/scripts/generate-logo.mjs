// Genera los assets de marca desde brand/logo-source.png.
// Uso: npm run logo  (requiere devDependency `sharp`)
//
// El original es un PNG cuadrado con el fondo oscuro horneado. De ahí salen el
// isotipo (navbar, favicons, tarjeta OpenGraph) y el lockup completo (pie).
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "brand", "logo-source.png");
const PUB = join(root, "public");

/** Fondo horneado en el PNG original. */
const BAKED = [3, 7, 21];
/** `--color-bg` del design system (#0a0a0f). */
const SITE_BG = { r: 10, g: 10, b: 15, alpha: 1 };
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

// Recortes medidos sobre el original de 1254×1254.
const CROP_MARK = { left: 425, top: 255, width: 419, height: 316 };
const CROP_LOCKUP = { left: 169, top: 255, width: 931, height: 707 };

/**
 * Devuelve el recorte con fondo transparente.
 *
 * El logo es color sobre negro, así que ya viene premultiplicado: se recupera el
 * alfa tratando el canal más brillante como cobertura y se des-premultiplica el
 * color. Conserva el degradado y no deja halo, a diferencia de un recorte por
 * umbral. Válido porque el arte está pensado sobre fondo oscuro.
 */
async function toTransparent(buffer) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(info.width * info.height * 4); // inicializado a 0 = transparente
  for (let i = 0, o = 0; i < data.length; i += info.channels, o += 4) {
    const r = Math.max(0, data[i] - BAKED[0]);
    const g = Math.max(0, data[i + 1] - BAKED[1]);
    const b = Math.max(0, data[i + 2] - BAKED[2]);
    const m = Math.max(r, g, b);
    if (m <= 6) continue; // fondo: se queda transparente
    const s = 255 / m;
    out[o] = Math.min(255, Math.round(r * s));
    out[o + 1] = Math.min(255, Math.round(g * s));
    out[o + 2] = Math.min(255, Math.round(b * s));
    out[o + 3] = m;
  }

  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

/** Encaja el arte en un lienzo cuadrado, con margen y fondo opcionales. */
function square(buffer, size, pad, background) {
  return sharp(buffer)
    .resize(size - pad * 2, size - pad * 2, { fit: "contain", background: CLEAR })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: background ?? CLEAR })
    .flatten(background ? { background } : false)
    .png({ compressionLevel: 9 });
}

const mark = await sharp(await toTransparent(await sharp(SRC).extract(CROP_MARK).toBuffer()))
  .trim()
  .toBuffer();

const lockup = await sharp(await toTransparent(await sharp(SRC).extract(CROP_LOCKUP).toBuffer()))
  .trim()
  .toBuffer();

const written = [];

// Isotipo transparente: navbar (se sirve a 32 px; 256 da nitidez en hidpi) y
// fuente del isotipo que generate-og.mjs compone en la tarjeta de compartir.
written.push(["logo-mark.png", await square(mark, 256, 0).toFile(join(PUB, "logo-mark.png"))]);

// Favicon y apple-touch con fondo opaco: ni las pestañas ni la pantalla de
// inicio de iOS tratan bien la transparencia.
written.push(["favicon.png", await square(mark, 64, 5, SITE_BG).toFile(join(PUB, "favicon.png"))]);
written.push([
  "apple-touch-icon.png",
  await square(mark, 180, 25, SITE_BG).toFile(join(PUB, "apple-touch-icon.png")),
]);

// Lockup completo transparente: pie de página.
written.push([
  "logo-edqs.png",
  await sharp(lockup).resize({ width: 640 }).png({ compressionLevel: 9 }).toFile(join(PUB, "logo-edqs.png")),
]);

for (const [name, info] of written) {
  console.log(`OK → public/${name}  ${info.width}×${info.height}  ${Math.round(info.size / 1024)} KB`);
}
console.log("\nRecuerda regenerar la tarjeta OpenGraph si cambió el isotipo: npm run og");
