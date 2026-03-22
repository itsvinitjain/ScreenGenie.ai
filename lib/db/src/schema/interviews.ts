import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { candidatesTable } from "./candidates";

export const interviewsTable = pgTable("interviews", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").notNull().references(() => candidatesTable.id),
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: text("status").notNull().default("SCHEDULED"),
  attempts: integer("attempts").notNull().default(0),
  transcript: text("transcript"),
  feedback: text("feedback"),
  voiceGender: text("voice_gender").notNull().default("female"),
  experienceLevel: text("experience_level").notNull().default("medium"),
  questions: text("questions").array().notNull().default(sql`'{}'::text[]`),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  codingEnabled: boolean("coding_enabled").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInterviewSchema = createInsertSchema(interviewsTable).omit({ id: true, createdAt: true });
export type InsertInterview = z.infer<typeof insertInterviewSchema>;
export type Interview = typeof interviewsTable.$inferSelect;
