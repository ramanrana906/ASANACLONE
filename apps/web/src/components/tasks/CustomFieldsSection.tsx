import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "@phosphor-icons/react";
import type { CustomField, CustomFieldValueData, TaskProjectRef } from "@asanaClone/shared";
import { setCustomFieldValues } from "../../lib/customFields";

interface FieldControlProps {
  field: CustomField;
  value: CustomFieldValueData;
  onChange: (value: CustomFieldValueData) => void;
}

function optionColor(field: CustomField, label: string): string {
  return field.options?.find((option) => option.label === label)?.color ?? "var(--border)";
}

function TextFieldControl({ field, value, onChange }: FieldControlProps) {
  const [text, setText] = useState(typeof value === "string" ? value : "");
  return (
    <label className="task-custom-field">
      <span className="task-custom-field__name">{field.name}</span>
      <input
        className="task-custom-field__text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => {
          if (text !== (value ?? "")) onChange(text);
        }}
      />
    </label>
  );
}

function NumberFieldControl({ field, value, onChange }: FieldControlProps) {
  const [text, setText] = useState(typeof value === "number" ? String(value) : "");
  return (
    <label className="task-custom-field">
      <span className="task-custom-field__name">{field.name}</span>
      <input
        type="number"
        className="task-custom-field__text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => {
          const num = text.trim() === "" ? null : Number(text);
          if (num !== value) onChange(num);
        }}
      />
    </label>
  );
}

function SingleSelectFieldControl({ field, value, onChange }: FieldControlProps) {
  const current = typeof value === "string" ? value : "";
  return (
    <label className="task-custom-field">
      <span className="task-custom-field__name">{field.name}</span>
      <span className="task-custom-field__select-row">
        {current && (
          <span
            className="task-custom-field__pill"
            style={{ background: optionColor(field, current) }}
          >
            {current}
          </span>
        )}
        <select value={current} onChange={(event) => onChange(event.target.value || null)}>
          <option value="">—</option>
          {(field.options ?? []).map((option) => (
            <option key={option.label} value={option.label}>
              {option.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

function MultiSelectFieldControl({ field, value, onChange }: FieldControlProps) {
  const current = Array.isArray(value) ? value : [];
  const remaining = (field.options ?? []).filter((option) => !current.includes(option.label));

  return (
    <label className="task-custom-field">
      <span className="task-custom-field__name">{field.name}</span>
      <span className="task-custom-field__select-row task-custom-field__select-row--wrap">
        {current.map((label) => (
          <span
            className="task-custom-field__pill"
            key={label}
            style={{ background: optionColor(field, label) }}
          >
            {label}
            <button
              type="button"
              onClick={() => onChange(current.filter((entry) => entry !== label))}
              aria-label={`Remove ${label}`}
            >
              <X size={9} weight="bold" />
            </button>
          </span>
        ))}
        {remaining.length > 0 && (
          <select
            value=""
            onChange={(event) => {
              if (event.target.value) onChange([...current, event.target.value]);
            }}
          >
            <option value="">+ Add</option>
            {remaining.map((option) => (
              <option key={option.label} value={option.label}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </span>
    </label>
  );
}

function CustomFieldControl(props: FieldControlProps) {
  switch (props.field.type) {
    case "text":
      return <TextFieldControl {...props} />;
    case "number":
      return <NumberFieldControl {...props} />;
    case "single_select":
      return <SingleSelectFieldControl {...props} />;
    case "multi_select":
      return <MultiSelectFieldControl {...props} />;
  }
}

interface CustomFieldsSectionProps {
  taskId: number;
  projects: TaskProjectRef[];
}

export function CustomFieldsSection({ taskId, projects }: CustomFieldsSectionProps) {
  const queryClient = useQueryClient();

  const setValueMutation = useMutation({
    mutationFn: ({
      projectId,
      customFieldId,
      value,
    }: {
      projectId: number;
      customFieldId: number;
      value: CustomFieldValueData;
    }) => setCustomFieldValues(taskId, { projectId, values: [{ customFieldId, value }] }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", taskId] }),
  });

  const projectsWithFields = projects.filter((project) => project.customFields.length > 0);
  if (projectsWithFields.length === 0) return null;

  return (
    <div className="task-panel__row task-panel__row--custom-fields">
      <span className="task-panel__row-label">Fields</span>
      <div className="task-custom-fields">
        {projectsWithFields.map((project) => (
          <div className="task-custom-fields__group" key={project.projectId}>
            {projectsWithFields.length > 1 && (
              <span className="task-custom-fields__project">{project.projectName}</span>
            )}
            {project.customFields.map((entry) => (
              <CustomFieldControl
                key={entry.field.id}
                field={entry.field}
                value={entry.value}
                onChange={(value) =>
                  setValueMutation.mutate({
                    projectId: project.projectId,
                    customFieldId: entry.field.id,
                    value,
                  })
                }
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
