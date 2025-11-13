// pages/api/teams/create-broker.js
import { adminSupabase as supabase } from '../../../utils/supabaseClient.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, teamName } = req.body;

    if (!userId || !teamName) {
      return res.status(400).json({ error: 'Missing userId or teamName' });
    }

    // Create broker profile with their user ID as organization_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .update({
        organization_id: userId, // Broker's user ID becomes their org ID
        team_role: 'owner',
        role: 'Broker',
        status: 'approved',
        team_name: teamName.trim()
      })
      .eq('id', userId)
      .select()
      .single();

    if (profileError) {
      console.error('Error creating broker profile:', profileError);
      return res.status(500).json({ error: 'Failed to create broker profile' });
    }

    return res.status(200).json({
      success: true,
      profile,
      message: `Broker account created with team: ${teamName}`
    });
  } catch (error) {
    console.error('Unexpected error in create-broker:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
