// api/admin/users/list.ts - Listar todos los usuarios
import { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseAdmin } from "../_lib/supabase-client";
import { verifyAdminToken } from "../_lib/auth-middleware";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Handle preflight OPTIONS requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const adminId = verifyAdminToken(req);
  if (!adminId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Obtener página y límite
    const page = parseInt((req.query.page as string) || "1");
    const limit = parseInt((req.query.limit as string) || "10");
    const offset = (page - 1) * limit;

    // Obtener usuarios con resumen de licencias
    const { data: users, error } = await supabaseAdmin
      .from("user_license_summary")
      .select("*")
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // Contar total
    const { count } = await supabaseAdmin
      .from("user_license_summary")
      .select("*", { count: "exact", head: true });

    res.status(200).json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}
