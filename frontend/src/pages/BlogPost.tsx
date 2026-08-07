import { useQuery } from "@apollo/client";
import { ArrowLeft, Clock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Link, useParams } from "react-router";
import remarkGfm from "remark-gfm";

import { Reveal } from "@/components/motion/Reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { findFallbackPost } from "@/content/fallback";
import { POST_QUERY } from "@/features/blog/queries";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatDate } from "@/lib/utils";
import type { Post } from "@/types/api";

interface PostData {
  post: Post | null;
}

export default function BlogPost() {
  const { slug = "" } = useParams();
  const { data, loading, error } = useQuery<PostData, { slug: string }>(POST_QUERY, {
    variables: { slug },
  });

  const post: Post | undefined =
    data?.post ?? (error || (!loading && !data?.post) ? findFallbackPost(slug) : undefined);

  useDocumentTitle(post?.title ?? "Blog");

  if (loading && !post) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-32 sm:px-6" aria-busy="true">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="mt-4 h-4 w-1/3" />
        <Skeleton className="mt-10 h-96 w-full" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-40 text-center sm:px-6">
        <p className="font-mono text-sm text-accent">404</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">Artículo no encontrado</h1>
        <p className="mt-3 text-muted">El artículo «{slug}» no existe o fue despublicado.</p>
        <Button asChild variant="outline" className="mt-8">
          <Link to="/blog">
            <ArrowLeft aria-hidden="true" />
            Volver al blog
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl px-4 pb-24 pt-28 sm:px-6">
      <Reveal>
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Blog
        </Link>

        <header className="mt-6">
          <div className="flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="accent">
                #{tag}
              </Badge>
            ))}
          </div>
          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
            {post.title}
          </h1>
          <p className="mt-4 flex items-center gap-2 font-mono text-xs text-faint">
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
            <span aria-hidden="true">·</span>
            <Clock className="size-3" aria-hidden="true" />
            {post.readingMinutes} min de lectura
          </p>
        </header>

        {post.coverUrl && (
          <img
            src={post.coverUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="mt-8 w-full rounded-xl2 border border-line object-cover"
          />
        )}

        <div className="prose prose-invert mt-10 max-w-none prose-headings:tracking-tight prose-h2:mt-10 prose-a:text-accent prose-blockquote:border-l-accent prose-blockquote:text-muted prose-strong:text-ink prose-code:rounded prose-code:bg-raised prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-[0.85em] prose-code:text-accent prose-code:before:content-none prose-code:after:content-none prose-pre:border prose-pre:border-line prose-pre:bg-[#0c0c14]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </div>
      </Reveal>
    </article>
  );
}
