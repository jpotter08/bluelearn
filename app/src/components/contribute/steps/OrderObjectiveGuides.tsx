import { useEffect, useState } from "react";
import {
  GripVertical,
  Info,
  Layers,
  ListOrdered,
  Milestone,
} from "lucide-react";
import { StepperActionHeader } from "@/components/contribute/StepperActionHeader";
import { Combobox } from "@/components/ui/combobox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import guidesData from "@/data/guides.json";

// Map for O(1) guide lookup
const guidesMap = new Map(guidesData.map((g) => [g.slug, g]));

// Filter out the guides we mocked as selected from the previous step
const MOCK_SELECTED_SLUGS = [
  "arithmetic-introduction",
  "algebra-how-to-express-equations",
  "calculus-introduction",
  "vectors-introduction",
  "mechanics-how-to-apply-newtons-laws",
];

const selectedGuidesList = guidesData.filter((g) =>
  MOCK_SELECTED_SLUGS.includes(g.slug)
);

type PropTypes = {
  Stepper: any;
};

type WalkthroughNode = {
  slug: string;
  title: string;
  summary: string;
  level: number;
};

// Compute transitive prerequisites for a given target guide to generate the Walkthrough DAG
const computeWalkthrough = (targetSlug: string): Array<WalkthroughNode> => {
  // 1. Find all nodes in the transitive prerequisite closure
  const closure = new Set<string>();
  const queue = [targetSlug];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (!closure.has(current)) {
      closure.add(current);
      const guide = guidesMap.get(current);
      if (guide) {
        for (const prereq of guide.prerequisites) {
          queue.push(prereq);
        }
      }
    }
  }

  // 2. Compute levels for each node in the closure based on longest path depth
  const memo: Record<string, number> = {};

  const getLevel = (slug: string): number => {
    if (slug in memo) return memo[slug];

    const guide = guidesMap.get(slug);
    if (!guide || guide.prerequisites.length === 0) {
      memo[slug] = 1;
      return 1;
    }

    const prereqsInClosure = guide.prerequisites.filter((p) => closure.has(p));
    if (prereqsInClosure.length === 0) {
      memo[slug] = 1;
      return 1;
    }

    const maxPrereqLevel = Math.max(...prereqsInClosure.map(getLevel));
    memo[slug] = maxPrereqLevel + 1;
    return maxPrereqLevel + 1;
  };

  const result: Array<WalkthroughNode> = [];
  for (const slug of closure) {
    const guide = guidesMap.get(slug);
    if (guide) {
      result.push({
        slug,
        title: guide.title,
        summary: guide.summary,
        level: getLevel(slug),
      });
    }
  }

  return result;
};

export const OrderObjectiveGuides = ({ Stepper }: PropTypes) => {
  const [targetSlug, setTargetSlug] = useState<string>(
    "mechanics-how-to-apply-newtons-laws"
  );
  const [curatedSequence, setCuratedSequence] = useState<Array<string>>([]);

  const targetGuide = guidesMap.get(targetSlug);

  // Compute walkthrough nodes for the target
  const walkthroughNodes = computeWalkthrough(targetSlug);

  // Sync initial curated sequence when target guide changes
  useEffect(() => {
    const nodes = computeWalkthrough(targetSlug);
    // Seed with all prerequisites (excluding the target guide itself) sorted by levels
    const initialPrereqs = nodes
      .filter((n) => n.slug !== targetSlug)
      .sort((a, b) => a.level - b.level)
      .map((n) => n.slug);

    setCuratedSequence(initialPrereqs);
  }, [targetSlug]);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    setCuratedSequence((prev) => {
      const newList = [...prev];
      const draggedItem = newList[draggedIndex];
      newList.splice(draggedIndex, 1);
      newList.splice(index, 0, draggedItem);
      return newList;
    });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Toggle selection of guide in the walkthrough
  const handleToggleGuide = (slug: string, checked: boolean) => {
    if (checked) {
      setCuratedSequence((prev) => [...prev, slug]);
    } else {
      setCuratedSequence((prev) => prev.filter((s) => s !== slug));
    }
  };

  // Group walkthrough nodes by level for display
  const groupedLevels = walkthroughNodes.reduce(
    (acc, node) => {
      if (!acc[node.level]) {
        acc[node.level] = [];
      }
      acc[node.level]?.push(node);
      return acc;
    },
    {} as Record<number, Array<WalkthroughNode> | undefined>
  );

  const sortedLevels = Object.keys(groupedLevels)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <Stepper.Content step="objective-ordering">
      <StepperActionHeader title={"Order Guides"} Stepper={Stepper} />

      <FieldGroup className="space-y-6">
        {/* Dropdown: Pick Target Guide */}
        <Field className="max-w-md space-y-2">
          <FieldLabel className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
            Target Guide
          </FieldLabel>
          <Combobox
            items={selectedGuidesList.map((g) => ({
              value: g.slug,
              label: g.title,
              description: g.summary,
            }))}
            value={targetSlug}
            onValueChange={(val) => setTargetSlug(val)}
          />
          <FieldDescription>
            Select which guide represents the final endpoint (target) of this
            objective.
          </FieldDescription>
        </Field>

        <div className="grid h-[calc(100vh-450px)] min-h-[350px] w-full grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
          {/* Left Pane: Curated Sequence (5 cols) */}
          <Card className="flex h-full max-h-full flex-col overflow-hidden rounded-lg border border-border bg-card/35 shadow-none backdrop-blur-sm lg:col-span-5">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center gap-2 text-primary">
                <ListOrdered className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-semibold">
                  Curated Linear Sequence
                </CardTitle>
              </div>
              <CardDescription>
                Build the sequential learning path by ordering selected guides.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4">
              {curatedSequence.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                  <Info className="mb-2 h-8 w-8 text-muted-foreground opacity-50" />
                  <p className="text-sm font-medium">
                    No prerequisite guides selected.
                  </p>
                  <p className="mt-1 max-w-[250px] text-xs text-muted-foreground/80">
                    Select prerequisite guides from the walkthrough on the right
                    to add them to your curated sequence.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {curatedSequence.map((slug, index) => {
                  const guide = guidesMap.get(slug);
                  if (!guide) return null;

                  const isDragging = index === draggedIndex;

                  return (
                    <div
                      key={slug}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center justify-between gap-3 rounded-lg border p-3 shadow-sm transition-all select-none ${
                        isDragging
                          ? "cursor-grabbing border-primary/50 bg-primary/5 opacity-40"
                          : "cursor-grab border-border bg-background hover:border-primary/30"
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="shrink-0 text-muted-foreground/60 hover:text-foreground">
                          <GripVertical className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-semibold text-primary">
                              {index + 1}
                            </span>
                            <h4 className="truncate text-sm font-medium text-foreground">
                              {guide.title}
                            </h4>
                          </div>
                          <p className="mt-0.5 ml-8 truncate text-xs text-muted-foreground">
                            {guide.summary}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 border-none text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleToggleGuide(slug, false)}
                        title="Remove from Sequence"
                      >
                        <span className="text-lg leading-none">&times;</span>
                      </Button>
                    </div>
                  );
                })}

                {/* Automatically Pinned Target Guide */}
                {targetGuide && (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-primary bg-primary/5 p-3 shadow-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-xs font-semibold text-primary-foreground">
                          {curatedSequence.length + 1}
                        </span>
                        <h4 className="truncate text-sm font-semibold text-foreground">
                          {targetGuide.title}
                        </h4>
                      </div>
                      <p className="mt-0.5 ml-7 truncate text-xs text-muted-foreground">
                        {targetGuide.summary}
                      </p>
                    </div>
                    <div className="shrink-0 rounded bg-primary px-2 py-1 font-mono text-[10px] font-semibold tracking-wider text-primary-foreground uppercase">
                      Goal Target
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right Pane: Generated Walkthrough by Level (7 cols) */}
          <Card className="flex h-full max-h-full flex-col overflow-hidden rounded-lg border border-border bg-muted/10 shadow-none lg:col-span-7">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Layers className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-semibold text-foreground">
                  Generated Walkthrough
                </CardTitle>
              </div>
              <CardDescription>
                Select guides from the target's computed prerequisite DAG to
                include in your curation.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-6 overflow-y-auto p-4">
              {sortedLevels.map((level) => (
                <div key={level} className="space-y-3">
                  <div className="flex items-center gap-2 border-b pb-1">
                    <Milestone className="h-4 w-4 text-primary" />
                    <span className="font-mono text-xs font-bold tracking-wider text-muted-foreground uppercase">
                      Level {level}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {groupedLevels[level]?.map((node) => {
                      const isTarget = node.slug === targetSlug;
                      const isChecked =
                        isTarget || curatedSequence.includes(node.slug);

                      return (
                        <div
                          key={node.slug}
                          className="flex items-start gap-3 rounded-lg border border-border bg-background p-3 shadow-sm transition-all hover:bg-muted/30"
                        >
                          <div className="pt-0.5">
                            <Checkbox
                              checked={isChecked}
                              disabled={isTarget}
                              onCheckedChange={(checked) =>
                                handleToggleGuide(node.slug, checked === true)
                              }
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="flex items-center gap-2 text-sm font-medium text-foreground">
                              {node.title}
                              {isTarget && (
                                <span className="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-primary uppercase">
                                  Target
                                </span>
                              )}
                            </h4>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {node.summary}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </FieldGroup>
    </Stepper.Content>
  );
};
