// api/admin/licenses/generate.ts - Generar código de licencia
import { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { supabaseAdmin } from "../_lib/supabase-client";
import { verifyAdminToken } from "../_lib/auth-middleware";
import { v4 as uuidv4 } from "uuid";

const GenerateLicenseSchema = z.object({
  userId: z.string().uuid(),
  expiresInDays: z.number().int().positive().default(30),
});

// Generar código en formato XXXX-XXXX-XXXX-XXXX
function generateLicenseCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (i < 3) code += "-";
  }
  return code;
}

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

  const adminId = verifyAdminToken(req);
  if (!adminId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const body = GenerateLicenseSchema.parse(req.body);

    // Verificar que el usuario existe
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", body.userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Obtener email del admin
    const { data: admin, error: adminError } = await supabaseAdmin
      .from("admins")
      .select("email")
      .eq("id", adminId)
      .single();

    if (adminError || !admin) {
      return res.status(500).json({ error: "Admin not found" });
    }

    // Generar código único
    let code = generateLicenseCode();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const { data: existing } = await supabaseAdmin
        .from("license_codes")
        .select("id")
        .eq("code", code)
        .single();

      if (!existing) {
        isUnique = true;
      } else {
        code = generateLicenseCode();
        attempts++;
      }
    }

    if (!isUnique) {
      return res.status(500).json({ error: "Failed to generate unique code" });
    }

    // Crear código de licencia
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + body.expiresInDays);

    const { data: licenseCode, error } = await supabaseAdmin
      .from("license_codes")
      .insert({
        code,
        user_id: body.userId,
        generated_by: admin.email,
        expires_at: expiresAt.toISOString(),
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log en audit
    await supabaseAdmin.from("audit_logs").insert({
      admin_id: adminId,
      action: "generate_license",
      entity_type: "license_code",
      entity_id: licenseCode.id,
      changes: {
        code,
        userId: body.userId,
        expiresInDays: body.expiresInDays,
      },
    });

    res.status(201).json({
      success: true,
      licenseCode: {
        id: licenseCode.id,
        code: licenseCode.code,
        userId: licenseCode.user_id,
        expiresAt: licenseCode.expires_at,
        status: licenseCode.status,
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
