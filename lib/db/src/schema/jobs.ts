import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  hrId: integer("hr_id").notNull().references(() => usersTable.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  skills: text("skills").notNull(),
  status: text("status").notNull().default("OPEN"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertJobSchema = createInsertSchema(jobsTable).omit({ id: true, createdAt: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;
