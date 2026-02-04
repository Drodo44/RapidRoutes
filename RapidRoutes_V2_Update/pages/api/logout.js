// pages/api/logout.js
import supabase from "../../utils/supabaseClient";

export default async function handler(_req, res) {
  try {
    await supabase.auth.signOut(); // no-op server-side but keeps route
    res.setHeader("Set-Cookie", [
      "sb-access-token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax",
      "sb-refresh-token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax"
    ]);
    res.writeHead(302, { Location: "/login" });
    res.end();
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ 
      error: 'Logout failed', 
      message: error.message 
    });
  }
}
