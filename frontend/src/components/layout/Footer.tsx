import { Github, Linkedin, Mail } from "lucide-react";
import { Link } from "react-router";

import { useProfile } from "@/hooks/usePortfolioData";

const APP_NAME = import.meta.env.VITE_APP_NAME ?? "Portfolio";

export function Footer() {
  const { data: profile } = useProfile();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-surface/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 py-10 sm:px-6 md:flex-row">
        <div className="flex flex-col items-center gap-4 text-center md:items-start md:text-left">
          <img
            src="/logo-edqs.png"
            alt="EDQS Technologies"
            width={220}
            height={167}
            className="h-auto w-[220px] opacity-90 transition-opacity hover:opacity-100"
          />
          <div>
            <p className="font-mono text-sm text-muted">
              © {year} {profile.full_name} — {APP_NAME}
            </p>
            <p className="mt-1 text-xs text-faint">
              React · Go · Django · GraphQL · PostgreSQL · Docker — diseñado y construido desde cero
            </p>
          </div>
        </div>

        <nav aria-label="Enlaces del pie">
          <ul className="flex items-center gap-4">
            <li>
              <Link to="/blog" className="text-sm text-muted transition-colors hover:text-accent">
                Blog
              </Link>
            </li>
            {profile.github_url && (
              <li>
                <a
                  href={profile.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  className="text-muted transition-colors hover:text-accent"
                >
                  <Github className="size-5" aria-hidden="true" />
                </a>
              </li>
            )}
            {profile.linkedin_url && (
              <li>
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="text-muted transition-colors hover:text-accent"
                >
                  <Linkedin className="size-5" aria-hidden="true" />
                </a>
              </li>
            )}
            <li>
              <a
                href={`mailto:${profile.email}`}
                aria-label="Enviar email"
                className="text-muted transition-colors hover:text-accent"
              >
                <Mail className="size-5" aria-hidden="true" />
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
