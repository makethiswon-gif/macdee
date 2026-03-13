// Create a test user for Toss Payments billing testing
// Usage: node --env-file=.env.local scripts/create-test-user.js

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const email = "test@makethis1.com";
  const password = "1234";
  const name = "테스트";
  const specialty = "일반";
  const region = "서울";

  console.log(`Creating test user: ${email} / ${password}`);

  // 1. Check if user already exists
  const { data: existingLawyer } = await supabase
    .from("lawyers")
    .select("id, email, user_id")
    .eq("email", email)
    .single();

  if (existingLawyer) {
    console.log("Test user already exists, updating password...");
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      existingLawyer.user_id,
      { password }
    );
    if (updateError) {
      console.error("Failed to update password:", updateError.message);
    } else {
      console.log("Password updated successfully.");
    }
    console.log("Done! Login at https://www.makethis1.com/login");
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
    return;
  }

  // 2. Create auth user
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, specialty, region },
    });

  if (authError) {
    console.error("Failed to create auth user:", authError.message);
    return;
  }

  console.log("Auth user created:", authData.user.id);

  // 3. Create lawyer record
  const slug = `test-${Math.random().toString(36).substring(2, 6)}`;
  const { error: lawyerError } = await supabase.from("lawyers").insert({
    user_id: authData.user.id,
    name,
    email,
    slug,
    specialty: [specialty],
    region,
  });

  if (lawyerError) {
    console.error("Failed to create lawyer record:", lawyerError.message);
    await supabase.auth.admin.deleteUser(authData.user.id);
    return;
  }

  // 4. Create free trial subscription
  const { data: lawyerRecord } = await supabase
    .from("lawyers")
    .select("id")
    .eq("user_id", authData.user.id)
    .single();

  if (lawyerRecord) {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);

    await supabase.from("subscriptions").insert({
      lawyer_id: lawyerRecord.id,
      plan: "free",
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: trialEnd.toISOString(),
      uploads_limit: 10,
      amount: 0,
    });
  }

  console.log("\n✅ Test user created successfully!");
  console.log(`  Email: ${email}`);
  console.log(`  Password: ${password}`);
  console.log("  Login at: https://www.makethis1.com/login");
}

main().catch(console.error);
