// api/_lib/cors-middleware.ts - Middleware CORS
import { VercelRequest, VercelResponse } from "@vercel/node";

export function setupCors(req: VercelRequest, res: VercelResponse): void {
  const origin = req.headers.origin || "*";
  const allowedOrigins = [
    "https://updriver-admin.vercel.app",
    "https://updriver-admin-*.vercel.app", // Preview deployments
    "http://localhost:3000",
    "http://localhost:3001",
  ];

  // Check if origin matches allowed origins
  const isAllowed =
    origin === "*" ||
    allowedOrigins.includes(origin) ||
    (origin.includes("updriver-admin") && origin.includes("vercel.app")) ||
    origin.startsWith("http://localhost");

  if (isAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
}
