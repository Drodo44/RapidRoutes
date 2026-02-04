// pages/api/teams/update-name.js
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, teamName } = req.body;

    if (!userId || !teamName || !teamName.trim()) {
      return res.status(400).json({ error: 'User ID and team name are required' });
    }

    // Verify user is team owner
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('team_role, organization_id')
      .eq('id', userId)
      .single();

    if (profile?.team_role !== 'owner') {
      return res.status(403).json({ error: 'Only team owners can update team name' });
    }

    // Update team name
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ team_name: teamName.trim() })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating team name:', updateError);
      return res.status(500).json({ error: 'Failed to update team name' });
    }

    return res.status(200).json({ success: true, teamName: teamName.trim() });
  } catch (error) {
    console.error('Unexpected error in update-name:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
