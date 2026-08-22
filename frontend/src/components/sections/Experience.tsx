import { CheckCircle2 } from "lucide-react";

import { SectionHeading } from "@/components/layout/SectionHeading";
import { Parallax, ParallaxGlow, ParallaxWatermark } from "@/components/motion/Parallax";
import { Reveal } from "@/components/motion/Reveal";
import { Badge } from "@/components/ui/badge";
import { useExperience } from "@/hooks/usePortfolioData";
import { formatMonth } from "@/lib/utils";

export function Experience() {
  const { data: experience } = useExperience();
  const sorted = [...experience].sort((a, b) => a.display_order - b.display_order);

  return (
    <section
      id="experience"
      aria-label="Experiencia profesional"
      className="relative scroll-mt-20 overflow-hidden"
    >
      <ParallaxWatermark text="03" />
      <ParallaxGlow tone="success" className="-left-56 bottom-0" speed={0.2} />
      <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <SectionHeading
          eyebrow="03 · trayectoria"
          title="Experiencia"
          description="Roles, impacto medible y las tecnologías que lo hicieron posible."
        />

        <ol className="relative ml-3 space-y-12 border-l border-line pl-8 sm:ml-6">
          {sorted.map((exp, i) => (
            <Reveal as="li" key={exp.id} delay={i * 0.08} className="relative">
              <Parallax speed={i % 2 === 0 ? 0.04 : -0.04}>
                <span
                  aria-hidden="true"
                  className="absolute -left-[2.42rem] top-1.5 size-3.5 rounded-full border-2 border-accent bg-bg shadow-[0_0_12px_rgb(34_211_238/0.5)] sm:-left-[2.45rem]"
                />
                <p className="font-mono text-xs text-accent">
                  {formatMonth(exp.start_date)} — {formatMonth(exp.end_date)}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-ink">{exp.role}</h3>
                <p className="mt-0.5 text-sm text-muted">
                  {exp.company} <span className="text-faint">· {exp.location}</span>
                </p>
                <p className="mt-3 max-w-3xl leading-relaxed text-muted">{exp.description}</p>

                {exp.achievements.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {exp.achievements.map((achievement) => (
                      <li key={achievement} className="flex max-w-3xl gap-2.5 text-sm text-muted">
                        <CheckCircle2
                          className="mt-0.5 size-4 shrink-0 text-success"
                          aria-hidden="true"
                        />
                        <span className="leading-relaxed">{achievement}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {exp.tech.map((tech) => (
                    <Badge key={tech}>{tech}</Badge>
                  ))}
                </div>
              </Parallax>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
