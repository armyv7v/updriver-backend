// api/admin/_lib/supabase-client.ts - Cliente de Supabase para admin
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
  console.error("Missing required Supabase environment variables");
  console.error("SUPABASE_URL:", supabaseUrl ? "✓" : "✗");
  console.error("SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceRoleKey ? "✓" : "✗");
  console.error("SUPABASE_ANON_KEY:", supabaseAnonKey ? "✓" : "✗");
}

// Cliente admin (con permisos totales)
export const supabaseAdmin = createClient(
  supabaseUrl || "",
  supabaseServiceRoleKey || ""
);

// Cliente público (permisos limitados)
export const supabase = createClient(
  supabaseUrl || "",
  supabaseAnonKey || ""
);
