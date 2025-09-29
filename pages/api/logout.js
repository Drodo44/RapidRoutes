// pages/api/logout.js
import supabase from "../../utils/supabaseClient";
export default async function handler(_req, res) {
  await supabase.auth.signOut(); // no-op server-side but keeps route
  res.setHeader("Set-Cookie", [
    "sb-access-token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax",
    "sb-refresh-token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax"
  ]);
  res.writeHead(302, { Location: "/login" });
  res.end();
}
