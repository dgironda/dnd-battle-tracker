import { Dispatch, SetStateAction, ReactNode } from "react";
import { useEffect, useState } from "react";

// The hero/monster/combatant action factories moved to ./entityActions so this
// file only exports a component (keeps React Fast Refresh working). Re-exported
// here so existing imports keep resolving.
export * from "./entityActions";

export const EditableCell = <T extends { id: string }>({
  entity,
  field,
  type = 'text',
  editingField,
  setEditingField,
  updateEntity,
  children
}: {
  entity: T;
  field: keyof T;
  type?: 'text' | 'number' | 'textarea';
  editingField: string | null;
  setEditingField: Dispatch<SetStateAction<string | null>>;
  updateEntity: (entityId: string, field: keyof T, value: string | number) => void;
  children?: ReactNode;
}) =>
{
  const entityId = entity.id;
  const fieldKey = `${entityId}-${String(field)}`;
  const isEditing = editingField === fieldKey;
  const currentValue = entity[field];

  const asText = (v: unknown) => (v === undefined || v === null ? "" : String(v));

  // Held as a string while editing so partial input ("", "-", "1.") survives
  // keystrokes instead of collapsing to 0 the way Number("") used to.
  const [inputValue, setInputValue] = useState<string>(() => asText(currentValue));

  useEffect(() =>
  {
    setInputValue(asText(currentValue));
  }, [currentValue]);

  const stopEditing = () => setEditingField(null);

  if (isEditing && type === 'number') {

    return (
      <input
        type="number"
        value={inputValue}
        onChange={(e) =>
        {
          const raw = e.target.value;
          setInputValue(raw);

          // Only commit once the field holds a complete number. An empty box or
          // a lone "-" is mid-edit, not a request to store zero.
          if (raw === "" || raw === "-") return;
          const parsed = Number(raw);
          if (!Number.isNaN(parsed)) {
            updateEntity(entityId, field, parsed);
          }
        }}
        onBlur={() =>
        {
          // Nothing usable typed — put the stored value back.
          if (inputValue === "" || inputValue === "-") {
            setInputValue(asText(currentValue));
          }
          stopEditing();
        }}
        onKeyDown={(e) =>
        {
          if (e.key === 'Enter' || e.key === 'Escape') {
            e.currentTarget.blur();
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
        value={inputValue}
        onChange={(e) =>
        {
          setInputValue(e.target.value);
          updateEntity(entityId, field, e.target.value);
        }}
        onBlur={stopEditing}
        onKeyDown={(e) =>
        {
          if (e.key === 'Enter' || e.key === 'Escape') {
            e.currentTarget.blur();
          }
        }}
        autoFocus
        className="editableCellTxt"
      />
    );
  }

  if (isEditing && type === 'textarea') {
    return (
      <textarea
        value={inputValue}
        onChange={(e) =>
        {
          setInputValue(e.target.value);
          updateEntity(entityId, field, e.target.value);
        }}
        onBlur={stopEditing}
        onKeyDown={(e) =>
        {
          if (e.key === 'Enter' && e.shiftKey) {
            // Allow Shift+Enter for new lines
            return;
          }
          if (e.key === 'Escape' || e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
        autoFocus
        className="editableCellTextarea"
        rows={4}
      />
    );
  }

  const isEmpty = currentValue === undefined || currentValue === null || currentValue === "";

  return (
    <button
      type="button"
      onClick={() => setEditingField(fieldKey)}
      className="setEditingField"
      title="Click to edit"
    >
      {isEmpty ? children : String(currentValue)}
      <span aria-hidden="true" className="edit">
        📝
      </span>
    </button>
  );
};
