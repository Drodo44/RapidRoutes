import { adminSupabase } from '../../../utils/supabaseAdminClient.js';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // First delete from profiles table
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('Error deleting user profile:', profileError);
      return res.status(500).json({ error: 'Failed to delete user profile' });
    }

    // Then delete from auth.users (this requires service role key)
    const { error: authError } = await adminSupabase.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Error deleting auth user:', authError);
      // Profile is already deleted, so we'll consider this a partial success
      return res.status(200).json({ 
        message: 'User profile deleted, but auth deletion failed. User may need manual cleanup.',
        warning: true 
      });
    }

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
