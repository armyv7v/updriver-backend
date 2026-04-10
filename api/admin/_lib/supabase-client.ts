// api/admin/_lib/supabase-client.ts - Cliente de Supabase para admin
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder_key";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "placeholder_key";

// Log missing env vars
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_ANON_KEY) {
  console.warn("⚠️ Missing Supabase environment variables");
}

// Cliente admin (con permisos totales)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// Cliente público (permisos limitados)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
