import { z } from "zod";

export const boardSchema = z.object({
  id: z.number(),
  title: z.string().min(1, "title is required"),
  createdAt: z.string(),
});

export type Board = z.infer<typeof boardSchema>;

export const createBoardSchema = boardSchema.pick({ title: true });
export type CreateBoardInput = z.infer<typeof createBoardSchema>;
