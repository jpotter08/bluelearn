import { useState } from "react";
import type { ComboboxItem } from "@/components/ui/combobox";
import { Combobox } from "@/components/ui/combobox";

type PropTypes = {
  id: string;
  items: Array<ComboboxItem>;
};

export function ComboboxMulti({ items }: PropTypes) {
  const [value, setValue] = useState<Array<string>>([]);

  return (
    <Combobox multiple items={items} value={value} onValueChange={setValue} />
  );
}
