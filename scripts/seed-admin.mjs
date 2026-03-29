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
  console.log("--- ADMINISTRATION SEEDING INITIATED ---");
  let createdAuthUser = null;

  try {
    console.log("[1/3] Validating overarching admin credential: ethanops360@gmail.com");
    
    // 1. Create Auth Identity
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: "ethanops360@gmail.com",
      password: "#Temp2026",
      email_confirm: true,
      user_metadata: { full_name: "Ethan Administrator" }
    });

    if (authError) {
      if(authError.message.includes("already been registered") || authError.message.includes("already registered")) {
        console.log(">>> Admin account already exists in Auth. Synchronizing state...");
        
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) throw new Error(`ListUsers failed: ${listError.message}`);
        
        const existingUser = users.find(u => u.email === "ethanops360@gmail.com");
        if (existingUser) {
          console.log(`>>> Existing user ID: ${existingUser.id}. Resetting credential...`);
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password: "#Temp2026" });
          createdAuthUser = existingUser;
        } else {
          throw new Error("User reported as registered but not found in user list.");
        }
      } else {
        throw new Error(`Auth creation failed: ${authError.message}`);
      }
    } else {
      console.log(">>> Auth identity created successfully.");
      createdAuthUser = authData.user;
    }

    // 2. Data Propagation
    console.log("[2/3] Propagating RBAC profiles and branch associations...");
    await updateProfile(createdAuthUser.id);

    console.log("[3/3] FINALIZING...");
    console.log("SUCCESS: Production Administrator account is fully provisioned and secured.");

  } catch (error) {
    console.error("!!! CRITICAL SEEDING FAILURE !!!");
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
}

async function updateProfile(userId) {
  if(!userId) throw new Error("No User ID provided for profile update.");

  try {
    // Branch synchronization
    console.log(">>> Checking for existing operational branches...");
    let { data: branchData } = await supabaseAdmin.from("branches").select("id").limit(1).single();
    
    if(!branchData) {
      console.log(">>> DATABASE WARNING: No branches detected. Provisioning HQ Control Center...");
      const { data: newBranch, error: branchError } = await supabaseAdmin.from("branches").insert({
        name: "Headquarters",
        location: "Global Control Center",
        type: "Main"
      }).select("id").single();

      if (branchError) throw new Error(`Branch provisioning failed: ${branchError.message}`);
      branchData = newBranch;
      console.log(`>>> HQ Provisioned successfully with ID: ${branchData.id}`);
    } else {
      console.log(`>>> Operational branch found: ${branchData.id}`);
    }

    // RBAC Injection
    console.log(">>> Injecting Admin RBAC rules and profile permissions...");
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        email: "ethanops360@gmail.com",
        full_name: "Ethan Administrator",
        role: "Admin/Owner",
        branch_id: branchData.id
      });

    if (profileError) throw new Error(`Profile RBAC injection failed: ${profileError.message}`);
    
    console.log(">>> Profile rights synchronized and authorized.");

  } catch (err) {
    console.error(">>> Profile update stage failed.");
    throw err;
  }
}

seedAdmin()
