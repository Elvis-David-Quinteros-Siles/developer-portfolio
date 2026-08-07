import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function NotFound() {
  useDocumentTitle("404");

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pb-32 pt-44 text-center sm:px-6">
      <pre
        aria-hidden="true"
        className="font-mono text-sm leading-relaxed text-accent/70"
      >{`HTTP/1.1 404 Not Found
content-type: application/problem+json

{ "title": "Not Found", "status": 404 }`}</pre>
      <h1 className="mt-8 text-3xl font-bold tracking-tight text-ink">Página no encontrada</h1>
      <p className="mt-3 max-w-md text-muted">
        La ruta que buscas no existe en este servidor. Ni siquiera el gateway sabe qué hacer con
        ella.
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
