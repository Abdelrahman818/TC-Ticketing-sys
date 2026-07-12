import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ticketStatusValues = ["todo", "in_progress", "in_review", "done"] as const;
export const ticketPriorityValues = ["low", "medium", "high", "urgent"] as const;

export const ticketsTable = pgTable("tickets", {
  id: serial("id").primaryKey(),
  creatorName: text("creator_name").notNull(),
  assignedTo: text("assigned_to").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status", { enum: ticketStatusValues }).notNull().default("todo"),
  priority: text("priority", { enum: ticketPriorityValues }).notNull().default("medium"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTicketSchema = createInsertSchema(ticketsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof ticketsTable.$inferSelect;
