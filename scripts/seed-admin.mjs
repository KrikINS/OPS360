import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

// Load local environment variables dynamically
dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase Service Key or URL in .env.local")
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function seedAdmin() {
  console.log("Seeding Overarching Admin Credential: ethanops360@gmail.com")
  
  // 1. Create Auth Identity
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: "ethanops360@gmail.com",
    password: "#Temp2026",
    email_confirm: true,
    user_metadata: { full_name: "Ethan Administrator" }
  })

  if (authError) {
     if(authError.message.includes("already been registered") || authError.message.includes("already registered")) {
        console.log("Admin account already exists in Auth. Resetting password and updating profiles table.")
        
        // Fetch users to find the ID
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = users.find(u => u.email === "ethanops360@gmail.com")

        if (existingUser) {
             await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password: "#Temp2026" })
             await updateProfile(existingUser.id)
             return;
        }
     } else {
        console.error("Error creating Admin Auth:", authError.message)
        process.exit(1)
     }
  } else {
     await updateProfile(authData?.user?.id)
  }
}

async function updateProfile(userId) {
     if(!userId) return;

     // Fetch the first available branch dynamically
     let { data: branchData } = await supabaseAdmin.from("branches").select("id").limit(1).single();
     if(!branchData) {
         console.log("No branches found in DB. Automatically seeding 'Headquarters' branch...");
         const { data: newBranch, error: branchError } = await supabaseAdmin.from("branches").insert({
             name: "Headquarters",
             location: "Global Control Center",
             type: "Main"
         }).select("id").single()

         if (branchError) {
            console.error("Failed to seed branch:", branchError.message);
            process.exit(1);
         }
         branchData = newBranch;
     }

     const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        email: "ethanops360@gmail.com",
        full_name: "Ethan Administrator",
        role: "admin",
        branch_id: branchData.id
      })

    if (profileError) {
      console.error("Error injecting Admin Profile Rights:", profileError.message)
      process.exit(1)
    }

    console.log("Success! Admin RBAC rules applied and account is ready.")
}

seedAdmin()
