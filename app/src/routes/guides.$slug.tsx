import { useMemo } from "react";
import {
  Link,
  createFileRoute,
  notFound,
  useLocation,
} from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { ChevronDown, ChevronUp, Flag, House, Pencil } from "lucide-react";

import type { SubjectReference } from "@/types/subjects";
import type { GuideReference, HydratedGuide } from "@/types/guides";

import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CollapsibleSection } from "@/components/CollapsibleSection";

import { buildBreadcrumbs } from "@/lib/breadcrumbs";
import { extractHeadings, formatDuration } from "@/lib/guideUtils";
import { getGuideBySlug, hydrateGuide } from "@/lib/getData";

import guides from "@/data/guides.json";
import subjects from "@/data/subjects.json";

import "katex/dist/katex.min.css";

export const Route = createFileRoute("/guides/$slug")({
  component: RouteComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();

  const breadcrumbOrigin = useLocation({
    select: (location) => location.state.breadcrumbOrigin,
  });

  const guide = getGuideBySlug(guides, slug);

  if (!guide) {
    throw notFound();
  }

  const hydratedGuide: HydratedGuide = hydrateGuide(guide, guides, subjects);

  const breadcrumbs = buildBreadcrumbs(hydratedGuide.title, breadcrumbOrigin);

  const headings = useMemo(
    () => extractHeadings(guide.content),
    [guide.content]
  );

  return (
    <div className="mx-auto h-[calc(100vh-70px)] max-w-[1280px] border-x bg-background">
      <section className="grid grid-cols-[320px_1fr] border-b">
        {/* SIDEBAR */}
        <aside className="h-[calc(100vh-70px)] overflow-y-auto border-r px-6 py-6">
          {/* Prerequisites */}
          <CollapsibleSection title={<p className="ml-auto">Prerequisites</p>}>
            <ul className="space-y-2">
              {hydratedGuide.prerequisites.map((prereq: GuideReference) => (
                <li
                  key={prereq.slug}
                  className="text-sm text-muted-foreground hover:text-foreground"
                  style={{
                    paddingLeft: 6,
                  }}
                >
                  <Link
                    to="/guides/$slug"
                    params={{ slug: prereq.slug }}
                    state={{
                      breadcrumbOrigin: {
                        type: "guide",
                        title: hydratedGuide.title,
                        path: `/guides/${slug}`,
                      },
                    }}
                  >
                    {prereq.title}
                  </Link>
                </li>
              ))}
            </ul>
          </CollapsibleSection>

          {/* TOC */}
          <CollapsibleSection
            title={<p className="ml-auto">Table of Contents</p>}
          >
            <ul className="space-y-2">
              {headings.map((h, idx) => (
                <li
                  key={idx}
                  className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
                  style={{
                    paddingLeft:
                      h.level === 1
                        ? 6
                        : h.level === 2
                          ? 12
                          : h.level === 3
                            ? 24
                            : 28,
                  }}
                >
                  {h.text}
                </li>
              ))}
            </ul>
          </CollapsibleSection>

          {/* Variants */}
          <CollapsibleSection title={<p className="ml-auto">Variants</p>}>
            <ul className="space-y-2"></ul>
          </CollapsibleSection>
        </aside>

        {/* MAIN */}
        <main className="h-[calc(100vh-70px)] min-w-0 overflow-y-auto px-10 py-8 lg:px-16">
          {/* Breadcrumbs */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <ul className="flex min-w-0 flex-nowrap items-center gap-2 text-xs tracking-[0.08em] text-muted-foreground uppercase">
              {breadcrumbs.map((crumb, idx) => (
                <li
                  key={`${crumb.label}-${idx}`}
                  className="mono-micro flex min-w-0 items-center gap-2"
                >
                  {crumb.path ? (
                    <Link
                      to={crumb.path}
                      className="flex min-w-0 items-center hover:text-foreground"
                      aria-label={crumb.label}
                    >
                      {idx === 0 ? (
                        <House className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <span className="max-w-[20ch] truncate">
                          {crumb.label}
                        </span>
                      )}
                    </Link>
                  ) : (
                    <span className="max-w-[20ch] truncate">{crumb.label}</span>
                  )}
                  {idx < breadcrumbs.length - 1 && (
                    <span className="shrink-0">/</span>
                  )}
                </li>
              ))}
            </ul>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="default" size="icon">
                <Pencil className="h-4 w-4" />
              </Button>

              <Button variant="outline">Open in Graph</Button>

              <Button variant="ghost" size="icon">
                <ChevronUp className="h-4 w-4" />
              </Button>

              <Button variant="ghost" size="icon">
                <ChevronDown className="h-4 w-4" />
              </Button>

              <Button variant="ghost" size="icon">
                <Flag className="h-4 w-4" />
              </Button>

              <select className="h-8 rounded-md border bg-background px-2 text-xs">
                <option>EN</option>
                <option>FR</option>
                <option>DE</option>
              </select>
            </div>
          </div>

          <Separator className="mb-8" />

          {/* Header */}
          <header className="mb-5">
            <h1 className="text-3xl font-bold tracking-[-0.04em]">
              {hydratedGuide.title}
            </h1>

            <div className="mono-micro mt-3">
              {hydratedGuide.author} | {guides[0].created_at} |{" "}
              {formatDuration(guide.duration)}
            </div>

            <div className="mt-4 flex gap-2">
              {hydratedGuide.tags.map((tag: SubjectReference) => (
                <Badge
                  key={tag.slug}
                  variant="outline"
                  className="mono-micro rounded-full border bg-badge tracking-[0.08em] text-badge-foreground"
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          </header>

          <Separator className="mb-8" />

          <article className="markdown">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {hydratedGuide.content}
            </ReactMarkdown>
          </article>
        </main>
      </section>
    </div>
  );
}
