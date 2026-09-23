import type { NextFunction, Request, Response } from "express";
import { verifySession } from "./jwt.js";

const SESSION_COOKIE = "session";

export { SESSION_COOKIE };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/** Rejects a signed-out visitor with a structured 401 rather than leaking
 * behaviour differences between "no session" and "bad session". */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    return res.status(401).json({ error: { code: "NOT_AUTHENTICATED", message: "Sign in required" } });
  }
  const session = verifySession(token);
  if (!session) {
    return res
      .status(401)
      .json({ error: { code: "SESSION_EXPIRED", message: "Session expired or invalid, please sign in again" } });
  }
  req.userId = session.userId;
  next();
}
