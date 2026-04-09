// api/admin/_lib/supabase-client.ts - Cliente de Supabase para admin
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Cliente admin (con permisos totales)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// Cliente público (permisos limitados)
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
