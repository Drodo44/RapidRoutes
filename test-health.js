#!/usr/bin/env node

import { adminSupabase as supabase } from "./utils/supabaseClient.js";

async function testHealth() {
  console.log("🔍 Testing RapidRoutes application health...\n");

  // Test 1: Environment variables
  console.log("1. Environment Variables:");
  const requiredEnvVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY", 
    "SUPABASE_SERVICE_ROLE_KEY"
  ];
  
  const missingEnv = requiredEnvVars.filter(key => !process.env[key]);
  if (missingEnv.length === 0) {
    console.log("   ✅ All environment variables present");
  } else {
    console.log(`   ❌ Missing: ${missingEnv.join(", ")}`);
  }

  // Test 2: Database connection
  console.log("\n2. Database Connection:");
  try {
    const { data, error } = await supabase.from("cities").select("count", { count: "exact", head: true });
    if (error) throw error;
    console.log("   ✅ Database connection successful");
  } catch (error) {
    console.log(`   ❌ Database connection failed: ${error.message}`);
  }

  // Test 3: Check critical tables
  console.log("\n3. Critical Tables:");
  const criticalTables = ["cities", "lanes", "equipment_codes", "dat_maps"];
  
  for (const table of criticalTables) {
    try {
      const { data, error } = await supabase.from(table).select("*", { count: "exact", head: true });
      if (error) throw error;
      console.log(`   ✅ ${table} table accessible`);
    } catch (error) {
      console.log(`   ❌ ${table} table error: ${error.message}`);
    }
  }

  // Test 4: Check for lanes data
  console.log("\n4. Lane Data:");
  try {
    const { data, error } = await supabase
      .from("lanes")
      .select("*", { count: "exact" })
      .limit(1);
    
    if (error) throw error;
    console.log(`   ✅ Found ${data.length > 0 ? "active" : "no"} lanes in system`);
  } catch (error) {
    console.log(`   ❌ Lane data check failed: ${error.message}`);
  }

  // Test 5: Equipment codes
  console.log("\n5. Equipment Codes:");
  try {
    const { data, error } = await supabase
      .from("equipment_codes")
      .select("*", { count: "exact" })
      .limit(5);
    
    if (error) throw error;
    console.log(`   ✅ Equipment codes loaded (${data.length > 0 ? "available" : "none found"})`);
  } catch (error) {
    console.log(`   ❌ Equipment codes check failed: ${error.message}`);
  }

  // Test 6: Cities data
  console.log("\n6. Cities Data:");
  try {
    const { count, error } = await supabase
      .from("cities")
      .select("*", { count: "exact", head: true });
    
    if (error) throw error;
    console.log(`   ✅ Cities database loaded (${count} cities available)`);
  } catch (error) {
    console.log(`   ❌ Cities data check failed: ${error.message}`);
  }

  console.log("\n🏁 Health check complete!");
}

testHealth().catch(console.error);
