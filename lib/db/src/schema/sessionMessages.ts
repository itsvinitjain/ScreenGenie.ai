import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sessionsTable } from "./sessions";

export const sessionMessagesTable = pgTable("session_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => sessionsTable.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["interviewer", "candidate", "code"] }).notNull(),
  content: text("content").notNull(),
  questionNumber: integer("question_number"),
  timeAllotted: integer("time_allotted"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertSessionMessageSchema = createInsertSchema(sessionMessagesTable).omit({ id: true, createdAt: true });
export type InsertSessionMessage = z.infer<typeof insertSessionMessageSchema>;
export type SessionMessage = typeof sessionMessagesTable.$inferSelect;
