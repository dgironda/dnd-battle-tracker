import type { Dispatch, SetStateAction } from "react";
import { EditableCell } from "../utils/Utils";

/** The eight numbers under a roster entry's name, in the order a sheet has them. */
const STATS = ["str", "dex", "con", "int", "wis", "cha", "pp", "init"] as const;
type StatField = (typeof STATS)[number];

/**
 * A roster entry's ability scores, passive perception and initiative, each
 * editable in place. The Hero and Monster Managers show the same eight the
 * same way, and used to do it in two copies.
 */
export function AbilityStats<T extends { id: string } & Partial<Record<StatField, unknown>>>({
  entity,
  editingField,
  setEditingField,
  updateEntity,
}: {
  entity: T;
  editingField: string | null;
  setEditingField: Dispatch<SetStateAction<string | null>>;
  updateEntity: (entityId: string, field: keyof T, value: string | number) => void;
}) {
  return (
    <div className="heroStats">
      {STATS.map((stat) => (
        <span className="heroStat" key={stat}>
          <span className="heroStatLabel">{stat.toUpperCase()}</span>
          <EditableCell
            entity={entity}
            field={stat}
            type="number"
            editingField={editingField}
            setEditingField={setEditingField}
            updateEntity={updateEntity}
          />
        </span>
      ))}
    </div>
  );
}
