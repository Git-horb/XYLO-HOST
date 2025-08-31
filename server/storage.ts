import { type User, type InsertUser, type Deployment, type InsertDeployment } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getDeployment(id: string): Promise<Deployment | undefined>;
  createDeployment(deployment: InsertDeployment): Promise<Deployment>;
  getDeploymentsByUser(githubUsername: string): Promise<Deployment[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private deployments: Map<string, Deployment>;

  constructor() {
    this.users = new Map();
    this.deployments = new Map();
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
    const deployment: Deployment = { 
      ...insertDeployment, 
      id,
      createdAt: new Date()
    };
    this.deployments.set(id, deployment);
    return deployment;
  }

  async getDeploymentsByUser(githubUsername: string): Promise<Deployment[]> {
    return Array.from(this.deployments.values()).filter(
      (deployment) => deployment.githubUsername === githubUsername,
    );
  }
}

export const storage = new MemStorage();
