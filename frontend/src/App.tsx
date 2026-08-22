import { ApolloProvider } from "@apollo/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation, useNavigationType } from "react-router";

import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { apolloClient } from "@/lib/apollo";
import { queryClient } from "@/lib/queryClient";
import Home from "@/pages/Home";

// Code splitting: las rutas secundarias se cargan bajo demanda
const ProjectDetail = lazy(() => import("@/pages/ProjectDetail"));
const Blog = lazy(() => import("@/pages/Blog"));
const BlogPost = lazy(() => import("@/pages/BlogPost"));
const NotFound = lazy(() => import("@/pages/NotFound"));

/**
 * Al navegar hacia una ruta nueva (PUSH), vuelve al inicio de la página.
 * En POP (atrás/adelante) no interviene: el navegador restaura el scroll.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (hash || navigationType === "POP") return;
    window.scrollTo(0, 0);
  }, [pathname, hash, navigationType]);

  return null;
}

function RouteFallback() {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-32 sm:px-6" aria-busy="true">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="mt-4 h-4 w-1/3" />
      <Skeleton className="mt-10 h-64 w-full" />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ApolloProvider client={apolloClient}>
        <MotionConfig reducedMotion="user">
          <BrowserRouter>
            <ScrollToTop />
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-bg"
            >
              Saltar al contenido
            </a>
            <Navbar />
            <main id="main">
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/projects/:slug" element={<ProjectDetail />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </main>
            <Footer />
          </BrowserRouter>
        </MotionConfig>
      </ApolloProvider>
    </QueryClientProvider>
  );
}
