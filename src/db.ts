import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { Database } from "bun:sqlite";

export type UserRole = "user" | "admin";

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface UserWithPassword extends User {
  password_hash: string;
}

const databasePath = process.env.DATABASE_PATH ?? "./data/auth.sqlite";
mkdirSync(dirname(databasePath), { recursive: true });

export const db = new Database(databasePath, { strict: true });

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

export function findUserByEmail(email: string): UserWithPassword | null {
  return db
    .query<UserWithPassword, [string]>(
      "SELECT id, email, name, password_hash, role, created_at FROM users WHERE email = ?",
    )
    .get(email);
}

export function findUserById(id: number): UserWithPassword | null {
  return db
    .query<UserWithPassword, [number]>(
      "SELECT id, email, name, password_hash, role, created_at FROM users WHERE id = ?",
    )
    .get(id);
}

export function createUser(
  email: string,
  name: string,
  passwordHash: string,
): User {
  const result = db
    .query(
      "INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?) RETURNING id, email, name, role, created_at",
    )
    .get(email, name, passwordHash);

  if (!result) {
    throw new Error("User was not created");
  }

  return result as User;
}
