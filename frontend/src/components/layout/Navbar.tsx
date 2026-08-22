import { AnimatePresence, motion, useScroll } from "framer-motion";
import { FileDown, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui";

const NAV_LINKS = [
  { to: "/#about", label: "Sobre mí" },
  { to: "/#skills", label: "Tecnologías" },
  { to: "/#experience", label: "Experiencia" },
  { to: "/#projects", label: "Proyectos" },
  { to: "/#architecture", label: "Arquitectura" },
  { to: "/blog", label: "Blog" },
  { to: "/#contact", label: "Contacto" },
] as const;

export function Navbar() {
  const { mobileMenuOpen, setMobileMenuOpen, toggleMobileMenu } = useUiStore();
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { scrollYProgress } = useScroll();

  const isActive = (to: string) => to === "/blog" && location.pathname.startsWith("/blog");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Cierra el menú móvil al navegar
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.hash, setMobileMenuOpen]);

  // Escape cierra el menú móvil y devuelve el foco al botón que lo abrió
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen, setMobileMenuOpen]);

  return (
    <header
      className={cn(
        "glass fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300",
        scrolled ? "border-line" : "border-transparent",
      )}
    >
      <nav
        aria-label="Navegación principal"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6"
      >
        <Link
          to="/"
          className="group flex items-center gap-2 font-mono text-sm font-semibold tracking-tight"
          aria-label="Elvis Quinteros — inicio"
        >
          <span className="flex size-8 items-center justify-center rounded-lg border border-accent/40 bg-accent/10 text-accent transition-shadow group-hover:glow-accent">
            eq
          </span>
          <span className="hidden text-muted transition-colors group-hover:text-ink sm:inline">
            elvis<span className="text-accent">.</span>quinteros
          </span>
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                aria-current={isActive(link.to) ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm transition-colors hover:text-ink",
                  isActive(link.to) ? "text-accent" : "text-muted",
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
            <a href="/cv.pdf" download aria-label="Descargar CV en PDF">
              <FileDown aria-hidden="true" />
              CV
            </a>
          </Button>
          <Button
            ref={menuButtonRef}
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
            onClick={toggleMobileMenu}
          >
            {mobileMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </Button>
        </div>
      </nav>

      {/* Progreso de lectura: sigue el scroll 1:1 (no es animación decorativa) */}
      <motion.div
        aria-hidden="true"
        style={{ scaleX: scrollYProgress }}
        className="absolute inset-x-0 top-16 h-0.5 origin-left bg-gradient-to-r from-accent to-violet"
      />

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            id="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden border-t border-line lg:hidden"
          >
            <ul className="space-y-1 px-4 py-4">
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    aria-current={isActive(link.to) ? "page" : undefined}
                    className={cn(
                      "block rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-raised hover:text-ink",
                      isActive(link.to) ? "text-accent" : "text-muted",
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href="/cv.pdf"
                  download
                  className="block rounded-lg px-3 py-2.5 text-sm text-accent transition-colors hover:bg-raised"
                >
                  Descargar CV
                </a>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
