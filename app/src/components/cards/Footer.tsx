import { CardFooter } from "@/components/ui/card";
import { FooterStats } from "@/components/cards/FooterStats";

type Data = {
  stats?: Array<{ label: string; data: number }>;
  actionBtns?: React.ReactNode;
};

type PropTypes = {
  data: Data;
};

export const Footer = ({ data }: PropTypes) => {
  return (
    <CardFooter className="flex flex-wrap items-center justify-between border-t p-0">
      <div className="flex flex-wrap items-center">
        {data.stats?.map((g: { label: string; data: number }) => {
          return <FooterStats key={g.label} label={g.label} data={g.data} />;
        })}
      </div>
      {data.actionBtns && <div className="pr-4">{data.actionBtns}</div>}
    </CardFooter>
  );
};
