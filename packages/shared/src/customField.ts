import { z } from "zod";

export const customFieldTypeSchema = z.enum(["single_select", "multi_select", "text", "number"]);
export type CustomFieldType = z.infer<typeof customFieldTypeSchema>;

export const customFieldOptionSchema = z.object({
  label: z.string().min(1),
  color: z.string().min(1),
});
export type CustomFieldOption = z.infer<typeof customFieldOptionSchema>;

export const customFieldSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  name: z.string().min(1),
  type: customFieldTypeSchema,
  options: z.array(customFieldOptionSchema).nullable(),
  createdAt: z.string(),
});
export type CustomField = z.infer<typeof customFieldSchema>;

export const createCustomFieldSchema = z.object({
  name: z.string().min(1).max(100),
  type: customFieldTypeSchema,
  options: z.array(customFieldOptionSchema).optional(),
});
export type CreateCustomFieldInput = z.infer<typeof createCustomFieldSchema>;

export const updateCustomFieldSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  options: z.array(customFieldOptionSchema).optional(),
});
export type UpdateCustomFieldInput = z.infer<typeof updateCustomFieldSchema>;

export const customFieldValueDataSchema = z.union([
  z.string(),
  z.array(z.string()),
  z.number(),
  z.null(),
]);
export type CustomFieldValueData = z.infer<typeof customFieldValueDataSchema>;

export const customFieldValueSchema = z.object({
  customFieldId: z.number(),
  value: customFieldValueDataSchema,
});
export type CustomFieldValue = z.infer<typeof customFieldValueSchema>;

// A field definition paired with this task's current value in one project.
export const taskCustomFieldSchema = z.object({
  field: customFieldSchema,
  value: customFieldValueDataSchema,
});
export type TaskCustomField = z.infer<typeof taskCustomFieldSchema>;

export const setCustomFieldValuesSchema = z.object({
  projectId: z.number(),
  values: z.array(customFieldValueSchema),
});
export type SetCustomFieldValuesInput = z.infer<typeof setCustomFieldValuesSchema>;
