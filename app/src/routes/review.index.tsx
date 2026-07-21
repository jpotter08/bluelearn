import { createFileRoute } from "@tanstack/react-router";

import { Separator } from "@/components/ui/separator";
import { CaseCard } from "@/components/cards/CaseCard";

import { Route as ReviewCaseIdRoute } from "@/routes/review.$caseId";
import { getReviewQueue } from "@/lib/api/reveiws";

export const Route = createFileRoute("/review/")({
  loader: ({ abortController }) =>
    getReviewQueue({ signal: abortController.signal }),
  errorComponent: ReviewQueueError,
  component: RouteComponent,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1280px] border-x bg-background">
      <section className="border-b px-8 py-8 lg:px-16">
        <div className="mb-6">
          <h1 className="data-label text-[14px] tracking-[0.08em] text-muted-foreground uppercase">
            Review Queue
          </h1>
        </div>

        <Separator className="mb-4 bg-border" />

        {children}
      </section>
    </div>
  );
}

function ReviewQueueError() {
  return (
    <Shell>
      <p className="text-sm text-muted-foreground">
        Reveiw Queue could not be loaded. Try again shortly.
      </p>
    </Shell>
  );
}

function RouteComponent() {
  const reviewQueue = Route.useLoaderData();
  //  const hydratedObjectives: Array<HydratedObjective> = hydrateObjectives(
  //    guides,
  //    objectives
  //  );
  //  const allGuides: Array<Guide> = hydratedObjectives.flatMap((p) =>
  //    p.levels.map((l) => l.guide)
  //  );
  //
  //  const tabs = [
  //    {
  //      id: "guides",
  //      label: "Guides",
  //      content: <ReviewGrid type="guides" data={allGuides} />,
  //    },
  //    {
  //      id: "objectives",
  //      label: "Objectives",
  //      content: <ReviewGrid type="objectives" data={hydratedObjectives} />,
  //    },
  //  ];

  return (
    <Shell>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {reviewQueue.map((reviewCase: any, index: number) => {
          return (
            <CaseCard
              key={index}
              reviewCase={reviewCase}
              to={ReviewCaseIdRoute.to}
            />
          );
        })}
      </div>
    </Shell>
  );
}

type ReviewGridProps = {
  type: string;
  data: any;
};

// const ReviewGrid = ({ type, data }: ReviewGridProps) => {
//   if (type == "objectives") {
//     return (
//       <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
//         {data.map((objective: HydratedObjective, index: number) => {
//           const o = {
//             ...objective,
//           };
//           return (
//             <ObjectiveCard key={index} objective={o} to={ReviewCaseIdRoute.to} />
//           );
//         })}
//       </div>
//     );
//   } else if (type == "guides") {
//     return (
//       <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
//         {data.map((guide: Guide, index: number) => {
//           return (
//             <GuideCard key={index} guide={guide} to={ReviewCaseIdRoute.to} />
//           );
//         })}
//       </div>
//     );
//   }
// };
