import type { ComponentProps } from "react";
import { AREAS } from "@/config/areas";
import { TextField } from "./TextField";

type AreaFieldProps = Omit<ComponentProps<typeof TextField>, "list" | "type">;

/**
 * An area text field that suggests known areas through a native <datalist>:
 * the phone's own suggestion list, no JavaScript. Any area can still be typed;
 * the server stores known ones under their official name (domain/areas.ts).
 */
export function AreaField(props: AreaFieldProps) {
  const listId = `${props.id}-areas`;
  return (
    <>
      <TextField {...props} list={listId} />
      <datalist id={listId}>
        {AREAS.map((area) => (
          <option key={area.name} value={area.name} />
        ))}
      </datalist>
    </>
  );
}
