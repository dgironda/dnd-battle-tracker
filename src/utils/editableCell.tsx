import { DEVMODE } from "./devmode";

import { Dispatch, SetStateAction } from "react";

export const EditableCell = <T extends Record<string, any>>({
  entity,
  field,
  type = 'text',
  editingField,
  setEditingField,
  updateEntity
}: {
  entity: T;
  field: keyof T;
  type?: 'text' | 'number';
  editingField: string | null;
  setEditingField: Dispatch<SetStateAction<string | null>>;
  updateEntity: (entityId: string, field: keyof T, value: string | number | boolean) => void;
}) => {
  const fieldKey = `${entity.id}-${String(field)}`;
  const isEditing = editingField === fieldKey;
  const value = entity[field];

  if (isEditing && type === 'number') {
    return (
      <input
        type="number"
        value={value as number}
        onChange={(e) => updateEntity(entity.id, field, Number(e.target.value))}
        onBlur={() => setEditingField(null)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            setEditingField(null);
          }
        }}
        autoFocus
        className="editableCellNum"
      />
    );
  }

  if (isEditing && type === 'text') {
    return (
      <input
        type="text"
        value={value as string}
        onChange={(e) => updateEntity(entity.id, field, e.target.value)}
        onBlur={() => setEditingField(null)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            setEditingField(null);
          }
        }}
        autoFocus
        className="editableCellTxt"
      />
    );
  }

  return (
    <span
      onClick={() => setEditingField(fieldKey)}
      className="setEditingField"
      title="Click to edit"
    >
      {value}
      <span role="button" aria-label="Edit" className="edit">
        📝
      </span>
    </span>
  );
};
