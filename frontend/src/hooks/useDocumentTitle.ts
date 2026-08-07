import { useEffect } from "react";

const BASE_TITLE = "Elvis Quinteros — Backend Engineer · Software Architect · DevOps";

/** Actualiza document.title por ruta; restaura el título base al desmontar. */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · Elvis Quinteros` : BASE_TITLE;
    return () => {
      document.title = BASE_TITLE;
    };
  }, [title]);
}
