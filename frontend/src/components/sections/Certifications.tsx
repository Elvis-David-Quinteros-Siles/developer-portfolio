import { Award, ExternalLink } from "lucide-react";

import { SectionHeading } from "@/components/layout/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useCertifications } from "@/hooks/usePortfolioData";
import { formatMonth } from "@/lib/utils";

export function Certifications() {
  const { data: certifications } = useCertifications();

  return (
    <section id="certifications" aria-label="Certificaciones" className="scroll-mt-20 bg-surface/30">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <SectionHeading
          eyebrow="06 · credenciales"
          title="Certificaciones"
          description="Validación externa de lo que practico a diario."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {certifications.map((cert, i) => (
            <Reveal key={cert.id} delay={(i % 2) * 0.08}>
              <Card className="h-full">
                <CardContent className="flex h-full gap-4 p-5">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/25 to-violet/25 text-accent ring-1 ring-accent/30">
                    {cert.badge_url ? (
                      <img
                        src={cert.badge_url}
                        alt=""
                        loading="lazy"
                        className="size-8 object-contain"
                      />
                    ) : (
                      <Award className="size-6" aria-hidden="true" />
                    )}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <h3 className="font-semibold leading-snug text-ink">{cert.name}</h3>
                    <p className="mt-1 text-sm text-muted">{cert.issuer}</p>
                    <p className="mt-2 font-mono text-xs text-faint">
                      {formatMonth(cert.issue_date)}
                      {cert.expires_at
                        ? ` → ${formatMonth(cert.expires_at)}`
                        : " · sin vencimiento"}
                    </p>
                    <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                      <Badge className="max-w-full truncate">{cert.credential_id}</Badge>
                      {cert.credential_url && (
                        <a
                          href={cert.credential_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center gap-1 text-xs text-accent hover:underline"
                        >
                          Verificar
                          <ExternalLink className="size-3" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
