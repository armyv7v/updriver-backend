// api/admin/login.ts - Login para admin
import { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.setHeader("Access-Control-Max-Age", "86400");

  // Handle preflight OPTIONS requests
  if (req.method === "OPTIONS") {
    return res.status(200).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { z } = await import("zod");
    const { createClient } = await import("@supabase/supabase-js");
    const bcrypt = await import("bcryptjs");
    const jwt = await import("jsonwebtoken");

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return res.status(500).json({ error: "Missing Supabase env vars" });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const LoginSchema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
    });

    const body = LoginSchema.parse(req.body);

    // Buscar admin en base de datos
    const { data: admin, error } = await supabaseAdmin
      .from("admins")
      .select("*")
      .eq("email", body.email)
      .single();

    if (error || !admin) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Verificar contraseña
    const passwordMatch = await bcrypt.compare(
      body.password,
      admin.password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generar JWT token
    const token = jwt.default.sign(
      {
        sub: admin.id,
        email: admin.email,
        role: admin.role,
      },
      process.env.ADMIN_JWT_SECRET || "admin_secret",
      { expiresIn: "7d" }
    );

    // Actualizar last_login
    await supabaseAdmin
      .from("admins")
      .update({ last_login: new Date().toISOString() })
      .eq("id", admin.id);

    res.status(200).json({
      success: true,
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error) {
    if (error && typeof error === "object" && "name" in error && error.name === "ZodError") {
      const zodError = error as { errors?: unknown };
      return res.status(400).json({ error: "Validation error", details: zodError.errors });
    }
    console.error("Login error:", error);
    const detail = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: "Internal server error", detail });
  }
}
