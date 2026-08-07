import { ArrowLeft, TerminalSquare } from "lucide-react";
import { Link, useLocation } from "react-router";

import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function NotFound() {
  useDocumentTitle("404");
  const { pathname } = useLocation();

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 pb-32 pt-40 sm:px-6">
      <div className="w-full overflow-hidden rounded-xl2 border border-line-strong bg-[#0c0c14]/95 shadow-2xl">
        <div className="flex items-center gap-1.5 border-b border-line px-4 py-3">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" aria-hidden="true" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" aria-hidden="true" />
          <span className="size-2.5 rounded-full bg-[#28c840]" aria-hidden="true" />
          <span className="ml-3 font-mono text-xs text-faint">elvis@platform ~ zsh</span>
        </div>
        <div className="space-y-1.5 p-5 font-mono text-[0.8rem] leading-relaxed">
          <p className="break-all">
            <span className="text-violet">❯ </span>
            <span className="text-ink">curl -i {pathname}</span>
          </p>
          <p className="text-muted">HTTP/1.1 404 Not Found</p>
          <p className="text-muted">content-type: application/problem+json</p>
          <p className="text-danger">404: route not found — try &apos;help&apos;</p>
          <p className="pt-2">
            <span className="text-violet">❯ </span>
            <span className="animate-blink text-accent" aria-hidden="true">
              ▍
            </span>
          </p>
        </div>
      </div>

      <h1 className="mt-10 text-center text-3xl font-bold tracking-tight text-ink">
        Página no encontrada
      </h1>
      <p className="mt-3 max-w-md text-center text-muted">
        Esta ruta no existe en el servidor — ni siquiera el gateway sabe qué hacer con ella.
      </p>
      <p className="mt-2 flex items-center gap-1.5 text-center font-mono text-xs text-faint">
        <TerminalSquare className="size-3.5 text-accent" aria-hidden="true" />
        pista: la terminal de la portada acepta comandos de verdad
      </p>
      <Button asChild className="mt-8">
        <Link to="/">
          <ArrowLeft aria-hidden="true" />
          Volver al inicio
        </Link>
      </Button>
    </div>
  );
}
