// pages/api/teams/remove-member.js
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, memberId } = req.body;

    if (!userId || !memberId) {
      return res.status(400).json({ error: 'User ID and member ID are required' });
    }

    // Verify user is team owner
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('team_role, organization_id, role')
      .eq('id', userId)
      .single();

    if (profile?.team_role !== 'owner' && profile?.role !== 'Admin') {
      return res.status(403).json({ error: 'Only team owners can remove members' });
    }

    // Verify member is in the same organization
    const { data: memberProfile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, team_role')
      .eq('id', memberId)
      .single();

    if (!memberProfile) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (memberProfile.team_role === 'owner') {
      return res.status(403).json({ error: 'Cannot remove team owner' });
    }

    if (memberProfile.organization_id !== profile.organization_id && profile.role !== 'Admin') {
      return res.status(403).json({ error: 'Member not in your team' });
    }

    // Remove member (set to inactive or delete)
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        status: 'inactive',
        organization_id: null,
        team_role: null
      })
      .eq('id', memberId);

    if (updateError) {
      console.error('Error removing member:', updateError);
      return res.status(500).json({ error: 'Failed to remove member' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Unexpected error in remove-member:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
