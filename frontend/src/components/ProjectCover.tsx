import { useState } from "react";

import { cn, initials } from "@/lib/utils";

interface ProjectCoverProps {
  title: string;
  imageUrl: string | null;
  className?: string;
}

/**
 * Portada de proyecto: imagen real con lazy loading, o placeholder generado
 * (gradiente + iniciales en mono) si no hay imagen o falla la carga.
 */
export function ProjectCover({ title, imageUrl, className }: ProjectCoverProps) {
  const [failed, setFailed] = useState(false);
  const showImage = imageUrl && !failed;

  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-t-xl2 border-b border-line",
        className,
      )}
    >
      {showImage ? (
        <img
          src={imageUrl}
          alt={`Portada del proyecto ${title}`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div
          role="img"
          aria-label={`Portada generada del proyecto ${title}`}
          className="bg-blueprint flex size-full items-center justify-center bg-gradient-to-br from-raised via-surface to-bg"
        >
          <span
            aria-hidden="true"
            className="text-gradient font-mono text-6xl font-bold tracking-tight opacity-80 transition-transform duration-500 group-hover:scale-110"
          >
            {initials(title)}
          </span>
        </div>
      )}
    </div>
  );
}
