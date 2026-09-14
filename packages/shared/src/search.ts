import { z } from "zod";

export const searchTaskResultSchema = z.object({
  id: z.number(),
  title: z.string(),
  completed: z.boolean(),
  projectId: z.number(),
  projectName: z.string(),
});
export type SearchTaskResult = z.infer<typeof searchTaskResultSchema>;

export const searchProjectResultSchema = z.object({
  id: z.number(),
  name: z.string(),
});
export type SearchProjectResult = z.infer<typeof searchProjectResultSchema>;

export const searchResultsSchema = z.object({
  projects: z.array(searchProjectResultSchema),
  tasks: z.array(searchTaskResultSchema),
});
export type SearchResults = z.infer<typeof searchResultsSchema>;
