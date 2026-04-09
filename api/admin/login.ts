// api/admin/login.ts - Login para admin
import { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { supabaseAdmin } from "./_lib/supabase-client";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { setupCors } from "../_lib/cors-middleware";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Setup CORS and handle preflight
  if (setupCors(req, res)) {
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
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
    const token = jwt.sign(
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
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}
