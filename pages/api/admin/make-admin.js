// pages/api/admin/make-admin.js
import supabaseAdmin from "@/lib/supabaseAdmin";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const { error } = await adminSupabase.rpc('make_admin', { email });
    
    if (error) throw error;
    
    return res.status(200).json({ 
      success: true, 
      message: `User ${email} has been made an admin`
    });
  } catch (error) {
    console.error('Error making admin:', error);
    return res.status(500).json({ 
      error: 'Failed to set admin role',
      details: error.message
    });
  }
}
