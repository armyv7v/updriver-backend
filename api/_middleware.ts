// api/_middleware.ts - Global middleware for all API routes
import { VercelRequest, VercelResponse } from "@vercel/node";

export default function middleware(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || "*";

  // Allow all Vercel deployments and localhost
  const isAllowed =
    origin.includes("updriver-admin") ||
    origin.startsWith("http://localhost") ||
    origin === "*";

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
  res.setHeader("Access-Control-Max-Age", "86400");

  // Handle preflight
  if (req.method === "OPTIONS") {
    res.status(200).end();
  }
}
