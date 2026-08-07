import { useQuery } from "@apollo/client";
import { useMemo, useState } from "react";

import { SectionHeading } from "@/components/layout/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fallbackPosts } from "@/content/fallback";
import { PostCard } from "@/features/blog/PostCard";
import { POSTS_QUERY } from "@/features/blog/queries";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cn } from "@/lib/utils";
import type { PostConnection, PostSummary } from "@/types/api";

const PAGE_SIZE = 9;

interface PostsData {
  posts: PostConnection;
}

interface PostsVars {
  first: number;
  after: string | null;
  tag: string | null;
}

export default function Blog() {
  useDocumentTitle("Blog");
  const [tag, setTag] = useState<string | null>(null);

  const { data, loading, error, fetchMore } = useQuery<PostsData, PostsVars>(POSTS_QUERY, {
    variables: { first: PAGE_SIZE, after: null, tag },
  });

  const live = data?.posts;
  const usingFallback = !live && Boolean(error);

  const posts: PostSummary[] = useMemo(() => {
    if (live) return live.edges.map((edge) => edge.node);
    if (usingFallback) {
      return tag ? fallbackPosts.filter((p) => p.tags.includes(tag)) : fallbackPosts;
    }
    return [];
  }, [live, usingFallback, tag]);

  const allTags = useMemo(() => {
    const source = live ? live.edges.map((e) => e.node) : fallbackPosts;
    return [...new Set(source.flatMap((p) => p.tags))].sort();
  }, [live]);

  const hasNextPage = live?.pageInfo.hasNextPage ?? false;

  const loadMore = () => {
    if (!live?.pageInfo.endCursor) return;
    void fetchMore({
      variables: { after: live.pageInfo.endCursor },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return {
          posts: {
            ...fetchMoreResult.posts,
            edges: [...prev.posts.edges, ...fetchMoreResult.posts.edges],
          },
        };
      },
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-28 sm:px-6">
      <SectionHeading
        eyebrow="~/blog"
        title="Blog técnico"
        description="Notas de ingeniería: arquitectura, backend y operaciones. Escritas desde producción, no desde la teoría."
      />

      <Reveal className="mb-10 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTag(null)}
          aria-pressed={tag === null}
          className={cn(
            "rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors",
            tag === null
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-line text-muted hover:text-ink",
          )}
        >
          todos
        </button>
        {allTags.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTag(t === tag ? null : t)}
            aria-pressed={tag === t}
            className={cn(
              "rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors",
              tag === t
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-line text-muted hover:text-ink",
            )}
          >
            #{t}
          </button>
        ))}
      </Reveal>

      {loading && posts.length === 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <p className="rounded-xl2 border border-dashed border-line p-10 text-center font-mono text-sm text-faint">
          // no hay artículos {tag ? `con el tag #${tag}` : "publicados"} todavía
        </p>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, i) => (
              <Reveal key={post.id} delay={Math.min((i % 3) * 0.07, 0.2)}>
                <PostCard post={post} />
              </Reveal>
            ))}
          </div>

          {hasNextPage && (
            <div className="mt-12 text-center">
              <Button variant="outline" onClick={loadMore} disabled={loading}>
                {loading ? "Cargando…" : "Cargar más artículos"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
