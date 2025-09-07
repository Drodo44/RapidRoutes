import { adminSupabase } from '../../../utils/supabaseClient.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, role } = req.body;

  if (!userId || !role) {
    return res.status(400).json({ error: 'User ID and role are required' });
  }

  // Validate role
  const validRoles = ['Admin', 'Broker', 'Support', 'Apprentice'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    // Update the user's role in the profiles table
    const { data, error } = await adminSupabase
      .from('profiles')
      .update({ role: role })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user role:', error);
      return res.status(500).json({ error: 'Failed to update user role' });
    }

    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ message: 'User role updated successfully', user: data });
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
