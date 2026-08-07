import { GraduationCap } from "lucide-react";

import { SectionHeading } from "@/components/layout/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";
import { useEducation } from "@/hooks/usePortfolioData";
import { formatMonth } from "@/lib/utils";

export function Education() {
  const { data: education } = useEducation();

  return (
    <section id="education" aria-label="Educación" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <SectionHeading
          eyebrow="07 · formación"
          title="Educación"
          description="Base académica y formación continua."
        />

        <ol className="relative ml-3 space-y-10 border-l border-line pl-8 sm:ml-6">
          {education.map((edu, i) => (
            <Reveal as="li" key={edu.id} delay={i * 0.08} className="relative">
              <span
                aria-hidden="true"
                className="absolute -left-[2.55rem] top-1 flex size-6 items-center justify-center rounded-full border border-violet/40 bg-bg text-violet sm:-left-[2.58rem]"
              >
                <GraduationCap className="size-3.5" />
              </span>
              <p className="font-mono text-xs text-violet">
                {formatMonth(edu.start_date)} — {formatMonth(edu.end_date)}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-ink">
                {edu.degree} · {edu.field}
              </h3>
              <p className="mt-0.5 text-sm text-muted">{edu.institution}</p>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{edu.description}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
