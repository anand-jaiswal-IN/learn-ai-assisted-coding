import { Router } from "express";
import {
  authenticate,
  createToken,
  hashPassword,
  requireRole,
  verifyPassword,
  type AuthenticatedRequest,
} from "./auth.ts";
import {
  createUser,
  findUserByEmail,
  findUserById,
  type User,
} from "./db.ts";

const router = Router();

const publicUser = (user: User) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  createdAt: user.created_at,
});

router.post("/auth/register", async (request, response, next) => {
  const { email, name, password } = request.body as {
    email?: unknown;
    name?: unknown;
    password?: unknown;
  };

  if (
    typeof email !== "string" ||
    typeof name !== "string" ||
    typeof password !== "string"
  ) {
    response.status(400).json({ error: "email, name, and password are required" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
    trimmedName.length < 1 ||
    trimmedName.length > 100 ||
    password.length < 8 ||
    password.length > 72
  ) {
    response.status(400).json({
      error:
        "Provide a valid email, a name between 1 and 100 characters, and a password between 8 and 72 characters",
    });
    return;
  }

  if (findUserByEmail(normalizedEmail)) {
    response.status(409).json({ error: "An account with that email already exists" });
    return;
  }

  try {
    const user = createUser(
      normalizedEmail,
      trimmedName,
      await hashPassword(password),
    );
    response.status(201).json({ user: publicUser(user), token: createToken(user) });
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      response.status(409).json({ error: "An account with that email already exists" });
      return;
    }
    next(error);
  }
});

router.post("/auth/login", async (request, response) => {
  const { email, password } = request.body as {
    email?: unknown;
    password?: unknown;
  };
  if (typeof email !== "string" || typeof password !== "string") {
    response.status(400).json({ error: "email and password are required" });
    return;
  }

  const user = findUserByEmail(email.trim().toLowerCase());
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    response.status(401).json({ error: "Invalid email or password" });
    return;
  }

  response.json({ user: publicUser(user), token: createToken(user) });
});

router.get("/users/me", authenticate, (request: AuthenticatedRequest, response) => {
  response.json({ user: publicUser(request.user!) });
});

router.get(
  "/admin/users/:id",
  authenticate,
  requireRole("admin"),
  (request, response, next) => {
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id < 1) {
      response.status(400).json({ error: "User id must be a positive integer" });
      return;
    }

    const user = findUserById(id);
    if (!user) {
      response.status(404).json({ error: "User not found" });
      return;
    }

    response.json({ user: publicUser(user) });
  },
);

export default router;
