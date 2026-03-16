import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { candidatesTable } from "./candidates";

export const interviewsTable = pgTable("interviews", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").notNull().references(() => candidatesTable.id),
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: text("status").notNull().default("SCHEDULED"),
  attempts: integer("attempts").notNull().default(0),
  transcript: text("transcript"),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInterviewSchema = createInsertSchema(interviewsTable).omit({ id: true, createdAt: true });
export type InsertInterview = z.infer<typeof insertInterviewSchema>;
export type Interview = typeof interviewsTable.$inferSelect;
