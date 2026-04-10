// scripts/setup-admin.ts - Script para crear el admin inicial
import { createClient } from "@supabase/supabase-js";
import * as bcrypt from "bcryptjs";

const supabaseUrl = process.env.SUPABASE_URL || "https://svmkiswoewdcvzxgnone.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAdmin() {
  try {
    const email = "enderjpinar@gmail.com";
    const password = "admin2308";
    const name = "Ender Jpinar";

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert admin
    const { data, error } = await supabase
      .from("admins")
      .insert([
        {
          email,
          password_hash: passwordHash,
          name,
          role: "super_admin",
        },
      ])
      .select();

    if (error) {
      console.error("Error creating admin:", error);
      return;
    }

    console.log("✅ Admin created successfully:", data);
  } catch (error) {
    console.error("Error:", error);
  }
}

setupAdmin();
