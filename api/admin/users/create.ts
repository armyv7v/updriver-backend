// api/admin/users/create.ts - Crear usuario nuevo
import { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { supabaseAdmin } from "../_lib/supabase-client";
import { verifyAdminToken } from "../_lib/auth-middleware";

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  plan: z.enum(["basic", "premium", "enterprise"]).default("basic"),
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Handle preflight OPTIONS requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Verificar token de admin
  const adminId = verifyAdminToken(req);
  if (!adminId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const body = CreateUserSchema.parse(req.body);

    // Crear usuario
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .insert({
        email: body.email,
        name: body.name,
        plan: body.plan,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes("duplicate")) {
        return res.status(400).json({ error: "Email already exists" });
      }
      throw error;
    }

    // Log en audit
    await supabaseAdmin.from("audit_logs").insert({
      admin_id: adminId,
      action: "create_user",
      entity_type: "user",
      entity_id: user.id,
      changes: { created: true },
    });

    res.status(201).json({
      success: true,
      user,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}
