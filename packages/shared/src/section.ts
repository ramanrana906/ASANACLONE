import { z } from "zod";

export const sectionSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  name: z.string().min(1),
  position: z.number(),
  createdAt: z.string(),
});
export type Section = z.infer<typeof sectionSchema>;

export const createSectionSchema = z.object({
  name: z.string().min(1).max(200),
});
export type CreateSectionInput = z.infer<typeof createSectionSchema>;

export const updateSectionSchema = z.object({
  name: z.string().min(1).max(200),
});
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;

export const reorderSectionsSchema = z.object({
  sectionIds: z.array(z.number()).min(1),
});
export type ReorderSectionsInput = z.infer<typeof reorderSectionsSchema>;
