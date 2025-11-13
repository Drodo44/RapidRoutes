// pages/api/teams.js
// API for listing available teams and managing team signup

import { adminSupabase } from '@/lib/supabaseAdmin';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // Get all teams (brokers who are team owners)
      const { data: teams, error } = await adminSupabase
        .from('profiles')
        .select('id, email, organization_id, role, team_role')
        .eq('role', 'Broker')
        .eq('team_role', 'owner')
        .eq('status', 'approved')
        .order('email', { ascending: true });

      if (error) throw error;

      // Format for dropdown display
      const formattedTeams = teams.map(broker => ({
        organization_id: broker.organization_id,
        broker_name: broker.email.split('@')[0], // Use email prefix as name
        broker_email: broker.email,
        broker_id: broker.id
      }));

      return res.status(200).json({ teams: formattedTeams });
    }

    if (req.method === 'POST') {
      // Join a team (set organization_id and team_role for new user)
      const { userId, organizationId, role } = req.body;

      if (!userId || !organizationId || !role) {
        return res.status(400).json({ error: 'userId, organizationId, and role are required' });
      }

      // Validate role
      const validRoles = ['Apprentice', 'Support'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ 
          error: 'Only Apprentice and Support roles can join teams. Brokers must be created by admins.' 
        });
      }

      // Verify the organization exists
      const { data: org, error: orgError } = await adminSupabase
        .from('profiles')
        .select('id, role, team_role')
        .eq('organization_id', organizationId)
        .eq('role', 'Broker')
        .eq('team_role', 'owner')
        .single();

      if (orgError || !org) {
        return res.status(404).json({ error: 'Team not found or invalid' });
      }

      // Update the user's profile
      const { data: updatedProfile, error: updateError } = await adminSupabase
        .from('profiles')
        .update({
          organization_id: organizationId,
          team_role: 'member',
          role: role,
          status: 'approved', // Auto-approve team members
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) throw updateError;

      return res.status(200).json({ 
        success: true, 
        profile: updatedProfile,
        message: `Successfully joined team as ${role}`
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Teams API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
