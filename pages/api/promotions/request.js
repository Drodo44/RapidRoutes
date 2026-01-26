// pages/api/promotions/request.js
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, requestedTeamName } = req.body;

    if (!userId || !requestedTeamName || !requestedTeamName.trim()) {
      return res.status(400).json({ error: 'User ID and team name are required' });
    }

    // Verify user is Apprentice or Support
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, email, organization_id')
      .eq('id', userId)
      .single();

    if (!['Apprentice', 'Support'].includes(profile?.role)) {
      return res.status(403).json({ error: 'Only Apprentice or Support can request promotion' });
    }

    // Check for existing pending request
    const { data: existing } = await supabaseAdmin
      .from('promotion_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single();

    if (existing) {
      return res.status(400).json({ error: 'You already have a pending promotion request' });
    }

    // Create promotion request
    const { data: request, error: insertError } = await supabaseAdmin
      .from('promotion_requests')
      .insert({
        user_id: userId,
        user_email: profile.email,
        user_current_role: profile.role,
        current_organization_id: profile.organization_id,
        requested_team_name: requestedTeamName.trim(),
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating promotion request:', insertError);
      return res.status(500).json({ error: 'Failed to create promotion request' });
    }

    return res.status(200).json({ 
      success: true, 
      request,
      message: 'Promotion request submitted successfully' 
    });
  } catch (error) {
    console.error('Unexpected error in promotion request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
