import { useEffect } from "react";
import { useLocation } from "react-router";

import { About } from "@/components/sections/About";
import { Architecture } from "@/components/sections/Architecture";
import { Certifications } from "@/components/sections/Certifications";
import { Contact } from "@/components/sections/Contact";
import { Education } from "@/components/sections/Education";
import { Experience } from "@/components/sections/Experience";
import { Hero } from "@/components/sections/Hero";
import { Projects } from "@/components/sections/Projects";
import { Showcase } from "@/components/sections/Showcase";
import { Skills } from "@/components/sections/Skills";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function Home() {
  useDocumentTitle();
  const { hash } = useLocation();

  // Al llegar con /#seccion (desde otra ruta), desplaza hasta el ancla
  useEffect(() => {
    if (!hash) {
      return;
    }
    const el = document.getElementById(hash.slice(1));
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [hash]);

  return (
    <>
      <Hero />
      <Showcase />
      <About />
      <Skills />
      <Experience />
      <Projects />
      <Architecture />
      <Certifications />
      <Education />
      <Contact />
    </>
  );
}
