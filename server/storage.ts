import { type User, type InsertUser, type Deployment, type InsertDeployment, type DeploymentLog, type InsertDeploymentLog } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getDeployment(id: string): Promise<Deployment | undefined>;
  createDeployment(deployment: InsertDeployment): Promise<Deployment>;
  updateDeployment(id: string, updates: Partial<InsertDeployment>): Promise<Deployment | undefined>;
  getDeploymentsByUser(githubUsername: string): Promise<Deployment[]>;
  createDeploymentLog(log: InsertDeploymentLog): Promise<DeploymentLog>;
  getDeploymentLogs(deploymentId: string): Promise<DeploymentLog[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private deployments: Map<string, Deployment>;
  private deploymentLogs: Map<string, DeploymentLog>;

  constructor() {
    this.users = new Map();
    this.deployments = new Map();
    this.deploymentLogs = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getDeployment(id: string): Promise<Deployment | undefined> {
    return this.deployments.get(id);
  }

  async createDeployment(insertDeployment: InsertDeployment): Promise<Deployment> {
    const id = randomUUID();
    const now = new Date();
    const deployment: Deployment = { 
      ...insertDeployment,
      status: insertDeployment.status || 'pending',
      branchName: insertDeployment.branchName || null,
      githubToken: insertDeployment.githubToken || null,
      message: insertDeployment.message || null,
      workflowUrl: insertDeployment.workflowUrl || null,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.deployments.set(id, deployment);
    return deployment;
  }

  async updateDeployment(id: string, updates: Partial<InsertDeployment>): Promise<Deployment | undefined> {
    const deployment = this.deployments.get(id);
    if (!deployment) return undefined;
    
    const updatedDeployment: Deployment = {
      ...deployment,
      ...updates,
      updatedAt: new Date()
    };
    this.deployments.set(id, updatedDeployment);
    return updatedDeployment;
  }

  async getDeploymentsByUser(githubUsername: string): Promise<Deployment[]> {
    return Array.from(this.deployments.values()).filter(
      (deployment) => deployment.githubUsername === githubUsername,
    );
  }

  async createDeploymentLog(insertLog: InsertDeploymentLog): Promise<DeploymentLog> {
    const id = randomUUID();
    const log: DeploymentLog = {
      ...insertLog,
      id,
      timestamp: new Date()
    };
    this.deploymentLogs.set(id, log);
    return log;
  }

  async getDeploymentLogs(deploymentId: string): Promise<DeploymentLog[]> {
    return Array.from(this.deploymentLogs.values())
      .filter((log) => log.deploymentId === deploymentId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}

export const storage = new MemStorage();
