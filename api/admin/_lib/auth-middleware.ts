// api/admin/_lib/auth-middleware.ts - Verificar token de admin
import { VercelRequest } from "@vercel/node";
import * as jwt from "jsonwebtoken";

export function verifyAdminToken(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(
      token,
      process.env.ADMIN_JWT_SECRET || "admin_secret"
    ) as { sub: string; email: string; role: string };

    return decoded.sub;
  } catch (error) {
    return null;
  }
}
