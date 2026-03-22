import { pgTable, serial, text, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { interviewsTable } from "./interviews";

export const sessionsTable = pgTable("sessions", {
  id: serial("id").primaryKey(),
  interviewId: integer("interview_id").notNull().references(() => interviewsTable.id, { onDelete: "cascade" }),
  candidateName: text("candidate_name").notNull(),
  status: text("status").notNull().default("active"),
  currentStrictness: integer("current_strictness").notNull().default(5),
  questionsAsked: integer("questions_asked").notNull().default(0),
  overallScore: integer("overall_score"),
  feedback: text("feedback"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  tabSwitchCount: integer("tab_switch_count").notNull().default(0),
  focusLostCount: integer("focus_lost_count").notNull().default(0),
  idVerified: boolean("id_verified").notNull().default(false),
  idVerificationData: jsonb("id_verification_data"),
  proctoringFlags: jsonb("proctoring_flags").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertSessionSchema = createInsertSchema(sessionsTable).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  endedAt: true,
  overallScore: true,
  feedback: true,
});
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessionsTable.$inferSelect;
