// api/admin/licenses/list.ts - Listar licencias de un usuario
import { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { supabaseAdmin } from "../_lib/supabase-client";
import { verifyAdminToken } from "../_lib/auth-middleware";
import { setupCors } from "../../_lib/cors-middleware";

const ListLicensesSchema = z.object({
  userId: z.string().uuid(),
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Setup CORS and handle preflight
  if (setupCors(req, res)) {
    return;
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const adminId = verifyAdminToken(req);
  if (!adminId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { userId } = ListLicensesSchema.parse(req.query);

    // Obtener códigos de licencia del usuario
    const { data: licenseCodes, error } = await supabaseAdmin
      .from("license_codes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Obtener licencias activas del usuario
    const { data: activeLicenses } = await supabaseAdmin
      .from("active_licenses")
      .select("*")
      .eq("user_id", userId)
      .order("activated_at", { ascending: false });

    res.status(200).json({
      success: true,
      userId,
      licenseCodes: licenseCodes || [],
      activeLicenses: activeLicenses || [],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}
