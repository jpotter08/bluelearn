import { ComboboxMulti } from "@/components/ComboboxMulti";
import { StepperActionHeader } from "@/components/contribute/StepperActionHeader";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import subjectsData from "@/data/subjects.json";
import guidesData from "@/data/guides.json";
import { Button } from "@/components/ui/button";

type PropTypes = {
  Stepper: any;
};

export const GuideDetails = ({ Stepper }: PropTypes) => {
  return (
    <Stepper.Content step="guide-details">
      <StepperActionHeader title={"Guide Details"} Stepper={Stepper} />

      <FieldGroup>
        <Field className="space-y-2">
          <FieldLabel className="font-mono text-[11px] tracking-[0.08em] uppercase">
            Title
          </FieldLabel>

          <Input
            id="title"
            type="text"
            autoComplete="Title"
            maxLength={50}
            placeholder="Choose a title. (Maximum 50 characters)."
            className="h-10 rounded-md"
            required
          />
        </Field>

        <Field className="space-y-2">
          <FieldLabel className="font-mono text-[11px] tracking-[0.08em] uppercase">
            Summary
          </FieldLabel>

          <textarea
            className="h-32 w-full min-w-0 resize-none rounded-md border border-input bg-input/20 p-2 text-sm transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-xs/relaxed file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-xs/relaxed dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
            rows={4}
            placeholder="Write a summary for your guide."
            required
          />
        </Field>

        <Field className="space-y-2">
          <FieldLabel className="font-mono text-[11px] tracking-[0.08em] uppercase">
            Subjects
          </FieldLabel>

          <ComboboxMulti
            id="subject-tags"
            items={subjectsData.map((s) => {
              return {
                value: s.slug,
                label: s.name,
                description: s.summary,
              };
            })}
          />
        </Field>

        <Field className="space-y-2">
          <FieldLabel className="font-mono text-[11px] tracking-[0.08em] uppercase">
            Prerequsite Guides
          </FieldLabel>

          <ComboboxMulti
            id="prereqs"
            items={guidesData.map((g) => {
              return {
                value: g.slug,
                label: g.title,
                description: g.summary,
              };
            })}
          />
        </Field>

        <Field className="space-y-2">
          <FieldLabel className="font-mono text-[11px] tracking-[0.08em] uppercase">
            Todo Prerequsite Guides
          </FieldLabel>

          <div className="flex items-center justify-between gap-4">
            <Input
              id="todo-prereqs"
              type="text"
              maxLength={50}
              placeholder="Enter title of missing guide. (Maximum 50 characters)."
              className="h-10 rounded-md"
            />
            <Button
              variant="ghost"
              size="icon"
              className="btn-sec h-10 w-24 rounded-md"
            >
              Add Guide
            </Button>
          </div>
        </Field>
      </FieldGroup>
    </Stepper.Content>
  );
};
