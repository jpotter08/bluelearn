import { ChevronRight } from "lucide-react";
import { Fragment } from "react";

type FlowProps = {
  Stepper: any;
  children: React.ReactNode;
};

export function Flow({ Stepper, children }: FlowProps) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-6">
      <Stepper.List className="flex w-full items-center justify-center text-sm">
        <Stepper.Items>
          {(step: any, index: number) => (
            <Fragment key={step.id}>
              {index > 0 && (
                <ChevronRight className="mx-1 size-4 text-muted-foreground/50" />
              )}

              <Stepper.Item step={step.id}>
                <Stepper.Trigger className="rounded-md p-2 font-mono text-[12px] text-muted-foreground uppercase transition-colors hover:bg-muted data-[status=active]:font-bold data-[status=active]:text-brand-blue data-[status=previous]:text-foreground">
                  <Stepper.Title />
                </Stepper.Trigger>
              </Stepper.Item>
            </Fragment>
          )}
        </Stepper.Items>
      </Stepper.List>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
