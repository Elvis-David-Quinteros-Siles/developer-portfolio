import { Download, ExternalLink, QrCode, ScanLine, Smartphone } from "lucide-react";

import { SectionHeading } from "@/components/layout/SectionHeading";
import { ParallaxGlow } from "@/components/motion/Parallax";
import { Reveal } from "@/components/motion/Reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** Visor AR de la tarjeta de prueba (proyecto ~/holo, servido en holo.edqs.online). */
const HOLO_VIEWER_URL = "https://holo.edqs.online/c/elvis";
const HOLO_QR_URL = "/holo/holo-qr.svg";
const HOLO_CARD_URL = "/holo/holo-tarjeta.webp";

const STEPS = [
  { icon: QrCode, text: "Escanea el QR con la cámara del teléfono." },
  { icon: Smartphone, text: "Se abre el visor: pulsa «Ver en AR» y acepta la cámara." },
  { icon: ScanLine, text: "Apunta a la tarjeta de la derecha y aparezco en 3D." },
] as const;

const STACK = ["WebAR", "MindAR", "Three.js", "React", "WebXR", "IA por voz"];

/**
 * Demo en vivo de Holo: el QR abre el visor AR en el teléfono y la tarjeta,
 * mostrada en esta misma pantalla, es el marcador que la cámara reconoce.
 */
export function HoloAR() {
  return (
    <section id="holo" aria-label="Demo de realidad aumentada" className="relative scroll-mt-20 overflow-hidden">
      <ParallaxGlow tone="violet" className="-left-40 top-1/3" speed={0.3} />
      <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <SectionHeading
          eyebrow="lab · realidad aumentada"
          title="Holo: tarjeta de presentación en AR"
          description="Pruébalo ahora: escanea el QR con tu teléfono y apunta la cámara a la tarjeta. Aparezco en 3D sobre ella, te saludo y respondo por voz sobre mi experiencia y mis proyectos."
        />

        <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <Reveal>
            <Card className="flex h-full flex-col p-6">
              <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-accent">1 · abre el visor</p>
              <a
                href={HOLO_VIEWER_URL}
                target="_blank"
                rel="noreferrer"
                className="mx-auto block w-full max-w-[240px] rounded-xl bg-white p-3 shadow-[0_0_40px_-12px_rgb(34_211_238/0.5)]"
                aria-label="Código QR: abre el visor de realidad aumentada"
              >
                <img src={HOLO_QR_URL} alt="Código QR que abre holo.edqs.online/c/elvis" className="block w-full" width={240} height={240} />
              </a>

              <ol className="mt-6 space-y-3">
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
              <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-violet">2 · escanea la tarjeta</p>
              <div className="flex flex-1 items-center">
                <img
                  src={HOLO_CARD_URL}
                  alt="Tarjeta marcador de Holo: apunta aquí la cámara del teléfono"
                  className="w-full rounded-lg border border-line-strong"
                  width={1200}
                  height={756}
                  loading="lazy"
                />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                ¿Estás en el teléfono? Abre el visor aquí y apunta a la tarjeta en otra pantalla o impresa.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button asChild>
                  <a href={HOLO_VIEWER_URL} target="_blank" rel="noreferrer">
                    <ExternalLink aria-hidden="true" />
                    Abrir visor AR
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href={HOLO_CARD_URL} download="holo-tarjeta.webp">
                    <Download aria-hidden="true" />
                    Descargar tarjeta
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
