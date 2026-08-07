import { Clock } from "lucide-react";
import { Link } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { PostSummary } from "@/types/api";

export function PostCard({ post }: { post: PostSummary }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group block h-full rounded-xl2"
      aria-label={`Leer el artículo ${post.title}`}
    >
      <Card className="flex h-full flex-col overflow-hidden">
        {post.coverUrl ? (
          <img
            src={post.coverUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="aspect-[2/1] w-full border-b border-line object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="bg-blueprint flex aspect-[2/1] w-full items-center justify-center border-b border-line bg-gradient-to-br from-raised via-surface to-bg"
          >
            <span className="font-mono text-sm text-accent/70">
              ~/blog/{post.slug.slice(0, 24)}
            </span>
          </div>
        )}
        <CardContent className="flex flex-1 flex-col p-6">
          <div className="flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="accent">
                #{tag}
              </Badge>
            ))}
          </div>
          <h2 className="mt-3 text-lg font-semibold leading-snug text-ink transition-colors group-hover:text-accent">
            {post.title}
          </h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{post.excerpt}</p>
          <p className="mt-4 flex items-center gap-2 font-mono text-xs text-faint">
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
            <span aria-hidden="true">·</span>
            <Clock className="size-3" aria-hidden="true" />
            {post.readingMinutes} min de lectura
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
