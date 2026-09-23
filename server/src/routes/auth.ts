import { Router } from "express";
import { z } from "zod";
import { User } from "../models/User.js";
import { hashPassword, verifyPassword } from "../auth/hash.js";
import { signSession } from "../auth/jwt.js";
import { SESSION_COOKIE, requireAuth } from "../auth/middleware.js";
import { env } from "../config/env.js";

export const authRouter = Router();

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// Frontend and backend are deployed on different domains (e.g. Vercel +
// Render), which makes every API call a cross-site request from the
// cookie's point of view. SameSite=Lax cookies are withheld on cross-site
// fetch/XHR (only same-site or top-level navigation), so the session cookie
// would silently stop being sent — hence SameSite=None (which requires
// Secure) in production, and Lax locally where frontend/backend share the
// "localhost" registrable domain across ports.
const cookieOptions = {
  httpOnly: true,
  sameSite: (env.isProduction ? "none" : "lax") as "none" | "lax",
  secure: env.isProduction,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

authRouter.post("/register", async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0].message } });
  }
  const { email, password } = parsed.data;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ error: { code: "EMAIL_TAKEN", message: "An account with that email already exists" } });
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({ email: email.toLowerCase(), passwordHash });

  const token = signSession({ userId: user.id });
  res.cookie(SESSION_COOKIE, token, cookieOptions);
  res.status(201).json({ user: { id: user.id, email: user.email } });
});

authRouter.post("/login", async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0].message } });
  }
  const { email, password } = parsed.data;

  const user = await User.findOne({ email: email.toLowerCase() });
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !valid) {
    return res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
  }

  const token = signSession({ userId: user.id });
  res.cookie(SESSION_COOKIE, token, cookieOptions);
  res.json({ user: { id: user.id, email: user.email } });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: cookieOptions.sameSite, secure: cookieOptions.secure });
  res.status(204).send();
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    return res.status(401).json({ error: { code: "NOT_AUTHENTICATED", message: "Sign in required" } });
  }
  res.json({ user: { id: user.id, email: user.email } });
});
