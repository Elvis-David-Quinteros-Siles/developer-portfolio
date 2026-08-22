import { motion, useReducedMotion, useScroll, useTransform, type Variants } from "framer-motion";
import { ArrowRight, FileDown, Github, Linkedin, MapPin } from "lucide-react";
import { useRef, useState } from "react";

import { Terminal } from "@/components/sections/Terminal";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/usePortfolioData";
import { initials } from "@/lib/utils";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] },
  },
};

export function Hero() {
  const { data: profile } = useProfile();
  const [photoFailed, setPhotoFailed] = useState(false);

  // Parallax por capas al hacer scroll: el fondo se aleja, el texto sube y se
  // desvanece, la terminal queda "más cerca" y baja levemente. Solo transform.
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const gridY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const glowY = useTransform(scrollYProgress, [0, 1], [0, 260]);
  const glowScale = useTransform(scrollYProgress, [0, 1], [1, 1.35]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -110]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const terminalY = useTransform(scrollYProgress, [0, 1], [0, 70]);
  const terminalScale = useTransform(scrollYProgress, [0, 1], [1, 0.96]);

  return (
    <section
      ref={sectionRef}
      id="hero"
      aria-label="Presentación"
      className="relative overflow-hidden"
    >
      <motion.div
        className="bg-blueprint absolute inset-0"
        style={reduced ? undefined : { y: gridY }}
        aria-hidden="true"
      />
      <motion.div
        className="absolute -top-40 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]"
        style={reduced ? undefined : { y: glowY, scale: glowScale }}
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-32 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28 lg:pt-40">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          style={reduced ? undefined : { y: copyY, opacity: copyOpacity }}
        >
          <motion.div variants={item} className="mb-7 flex items-center gap-4">
            <span className="rounded-full bg-gradient-to-br from-accent to-violet p-[2px]">
              <span className="flex size-16 items-center justify-center rounded-full bg-surface font-mono text-lg font-bold text-accent">
                {profile.photo_url && !photoFailed ? (
                  <img
                    src={profile.photo_url}
                    alt={`Foto de ${profile.full_name}`}
                    className="size-full rounded-full object-cover"
                    loading="eager"
                    onError={() => setPhotoFailed(true)}
                  />
                ) : (
                  initials(profile.full_name)
                )}
              </span>
            </span>
            <p className="flex items-center gap-1.5 font-mono text-xs text-muted">
              <MapPin className="size-3.5 text-accent" aria-hidden="true" />
              {profile.location}
              <span className="mx-1 text-faint">·</span>
              <span className="relative flex size-2" aria-hidden="true">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/60" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              disponible
            </p>
          </motion.div>

          <motion.h1
            variants={item}
            className="text-4xl font-bold tracking-tight text-ink sm:text-6xl"
          >
            {profile.full_name}
          </motion.h1>

          <motion.p variants={item} className="mt-4 font-mono text-base text-accent sm:text-lg">
            {profile.headline
              .split("·")
              .map((part) => part.trim())
              .join(" · ")}
          </motion.p>

          <motion.p variants={item} className="mt-6 max-w-xl leading-relaxed text-muted">
            {profile.bio}
          </motion.p>

          <motion.div variants={item} className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <a href="/cv.pdf" download>
                <FileDown aria-hidden="true" />
                Descargar CV
              </a>
            </Button>
            {profile.github_url && (
              <Button asChild variant="outline" size="lg">
                <a href={profile.github_url} target="_blank" rel="noopener noreferrer">
                  <Github aria-hidden="true" />
                  GitHub
                </a>
              </Button>
            )}
            {profile.linkedin_url && (
              <Button asChild variant="outline" size="lg">
                <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer">
                  <Linkedin aria-hidden="true" />
                  LinkedIn
                </a>
              </Button>
            )}
            <Button asChild variant="ghost" size="lg">
              <a href="#contact">
                Contacto
                <ArrowRight aria-hidden="true" />
              </a>
            </Button>
          </motion.div>
        </motion.div>

        <motion.div style={reduced ? undefined : { y: terminalY, scale: terminalScale }}>
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.35, ease: [0.21, 0.47, 0.32, 0.98] }}
          >
            <Terminal />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
