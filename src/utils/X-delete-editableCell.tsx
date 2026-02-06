import { Dispatch, SetStateAction, useState, useEffect } from "react";

const numericFields = [
  'hp','currHp','maxHp','ac',
  'str','dex','con','int','wis','cha','pp','init','tHp'
];

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
  updateEntity: (entityId: string, field: keyof T, value: string | number | boolean | string[]) => void;
}) => {
  const fieldKey = `${entity.id}-${String(field)}`;
  const isEditing = editingField === fieldKey;

  // Local state for input
  const [inputValue, setInputValue] = useState<string | number>(entity[field]);

  // Keep inputValue in sync with entity changes
  useEffect(() => {
    setInputValue(entity[field]);
  }, [entity, field]);

  const handleChange = (val: string) => {
    if (type === 'number') {
      const num = Number(val);
      if (!isNaN(num)) {
        setInputValue(num);
        updateEntity(entity.id, field, num);
      }
    } else {
      setInputValue(val);
      updateEntity(entity.id, field, val);
    }
  };

  if (isEditing) {
    if (type === 'number') {
      return (
        <input
          type="number"
          value={inputValue as number}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={() => setEditingField(null)}
          onKeyDown={(e) => { if (e.key === 'Enter') setEditingField(null); }}
          autoFocus
          className="editableCellNum"
        />
      );
    } else {
      return (
        <input
          type="text"
          value={inputValue as string}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={() => setEditingField(null)}
          onKeyDown={(e) => { if (e.key === 'Enter') setEditingField(null); }}
          autoFocus
          className="editableCellTxt"
        />
      );
    }
  }

  return (
    <span
      onClick={() => setEditingField(fieldKey)}
      className="setEditingField"
      title="Click to edit"
    >
      {inputValue}
      <span role="button" aria-label="Edit" className="edit">📝</span>
    </span>
  );
};
