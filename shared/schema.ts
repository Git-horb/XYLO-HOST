import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const deployments = pgTable("deployments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  branchName: text("branch_name"),
  githubUsername: text("github_username").notNull(),
  repositoryName: text("repository_name").notNull(),
  status: text("status").notNull().default("pending"), // pending, running, success, failed
  message: text("message"),
  workflowUrl: text("workflow_url"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const deploymentLogs = pgTable("deployment_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deploymentId: varchar("deployment_id").notNull(),
  step: text("step").notNull(), // fork, branch, config, workflow, deploy
  status: text("status").notNull(), // pending, running, success, failed
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertDeploymentSchema = createInsertSchema(deployments).pick({
  sessionId: true,
  branchName: true,
  githubUsername: true,
  repositoryName: true,
  status: true,
  message: true,
  workflowUrl: true,
});

export const insertDeploymentLogSchema = createInsertSchema(deploymentLogs).pick({
  deploymentId: true,
  step: true,
  status: true,
  message: true,
});

export const deploymentRequestSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  branchName: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;
export type Deployment = typeof deployments.$inferSelect;
export type InsertDeploymentLog = z.infer<typeof insertDeploymentLogSchema>;
export type DeploymentLog = typeof deploymentLogs.$inferSelect;
export type DeploymentRequest = z.infer<typeof deploymentRequestSchema>;
