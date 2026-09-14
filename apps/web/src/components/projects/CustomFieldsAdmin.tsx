import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "@phosphor-icons/react";
import type { CustomFieldOption, CustomFieldType } from "@asanaClone/shared";
import {
  createCustomField,
  deleteCustomField,
  listCustomFields,
  updateCustomField,
} from "../../lib/customFields";
import { ConfirmIconButton } from "../common/ConfirmIconButton";

interface CustomFieldsAdminProps {
  projectId: number;
}

const TYPE_LABEL: Record<CustomFieldType, string> = {
  single_select: "Single select",
  multi_select: "Multi select",
  text: "Text",
  number: "Number",
};

const DEFAULT_COLORS = [
  "#4c9aff",
  "#36b37e",
  "#8777d9",
  "#ffab00",
  "#ff6b9d",
  "#00b8ab",
  "#fa5a46",
  "#6554c0",
];

function FieldNameEditor({ name, onRename }: { name: string; onRename: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);

  function commit() {
    setEditing(false);
    const trimmed = value.trim();
    if (trimmed && trimmed !== name) {
      onRename(trimmed);
    } else {
      setValue(name);
    }
  }

  if (editing) {
    return (
      <input
        className="custom-field-admin__name-input"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") {
            setValue(name);
            setEditing(false);
          }
        }}
        autoFocus
      />
    );
  }

  return (
    <button type="button" className="custom-field-admin__name" onClick={() => setEditing(true)}>
      {name}
    </button>
  );
}

function OptionsEditor({
  options,
  onChange,
}: {
  options: CustomFieldOption[];
  onChange: (options: CustomFieldOption[]) => void;
}) {
  const [label, setLabel] = useState("");

  function addOption(event: FormEvent) {
    event.preventDefault();
    if (!label.trim()) return;
    const color = DEFAULT_COLORS[options.length % DEFAULT_COLORS.length];
    onChange([...options, { label: label.trim(), color }]);
    setLabel("");
  }

  return (
    <div className="custom-field-admin__options">
      {options.map((option) => (
        <span
          key={option.label}
          className="custom-field-admin__option"
          style={{ background: option.color }}
        >
          {option.label}
          <button
            type="button"
            onClick={() => onChange(options.filter((o) => o.label !== option.label))}
            aria-label={`Remove ${option.label}`}
          >
            <X size={9} weight="bold" />
          </button>
        </span>
      ))}
      <form className="custom-field-admin__add-option" onSubmit={addOption}>
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Add option"
        />
      </form>
    </div>
  );
}

export function CustomFieldsAdmin({ projectId }: CustomFieldsAdminProps) {
  const queryClient = useQueryClient();
  const queryKey = ["projects", projectId, "custom-fields"];
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<CustomFieldType>("single_select");

  const fieldsQuery = useQuery({ queryKey, queryFn: () => listCustomFields(projectId) });
  const fields = fieldsQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      createCustomField(projectId, {
        name: name.trim(),
        type,
        options:
          type === "single_select" || type === "multi_select"
            ? [{ label: "Option 1", color: DEFAULT_COLORS[0] }]
            : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setName("");
      setCreating(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: { id: number; name?: string; options?: CustomFieldOption[] }) =>
      updateCustomField(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCustomField(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate();
  }

  return (
    <section className="settings-section">
      <h3>Custom fields</h3>
      {fields.length > 0 && (
        <ul className="custom-field-admin__list">
          {fields.map((field) => (
            <li key={field.id} className="custom-field-admin__item">
              <div className="custom-field-admin__item-header">
                <FieldNameEditor
                  name={field.name}
                  onRename={(name) => updateMutation.mutate({ id: field.id, name })}
                />
                <span className="custom-field-admin__type">{TYPE_LABEL[field.type]}</span>
                <ConfirmIconButton
                  icon={<X size={13} weight="bold" />}
                  label={`Delete ${field.name}`}
                  onConfirm={() => deleteMutation.mutate(field.id)}
                />
              </div>
              {(field.type === "single_select" || field.type === "multi_select") && (
                <OptionsEditor
                  options={field.options ?? []}
                  onChange={(options) => updateMutation.mutate({ id: field.id, options })}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {creating ? (
        <form className="custom-field-admin__create-form" onSubmit={handleCreate}>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Field name"
            autoFocus
          />
          <select value={type} onChange={(event) => setType(event.target.value as CustomFieldType)}>
            <option value="single_select">Single select</option>
            <option value="multi_select">Multi select</option>
            <option value="text">Text</option>
            <option value="number">Number</option>
          </select>
          <button type="submit" disabled={createMutation.isPending || !name.trim()}>
            Add
          </button>
          <button type="button" onClick={() => setCreating(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <button type="button" onClick={() => setCreating(true)}>
          <Plus size={13} weight="bold" style={{ marginRight: 4, verticalAlign: -2 }} />
          Add custom field
        </button>
      )}
    </section>
  );
}
