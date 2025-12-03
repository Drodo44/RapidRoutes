// Diagnostic endpoint to check what auth values are being returned
import { getAuthFromRequest } from '@/lib/auth';
import { getUserOrganizationId } from '@/lib/organizationHelper';

export default async function handler(req, res) {
  try {
    console.log('[debugAuth] Testing authentication flow');
    console.log('[debugAuth] Request headers:', Object.keys(req.headers));
    console.log('[debugAuth] Authorization header present:', !!req.headers.authorization);
    
    const auth = await getAuthFromRequest(req, res);
    
    if (!auth || !auth.user) {
      return res.status(200).json({
        success: false,
        message: 'No auth returned',
        auth: auth,
        headers: {
          hasAuth: !!req.headers.authorization,
          authStart: req.headers.authorization?.substring(0, 20)
        }
      });
    }
    
    const userId = auth.user?.id || auth.userId || auth.id;
    const userOrgId = await getUserOrganizationId(userId);
    const isAdmin = auth.profile?.role === 'Admin' || auth.user?.role === 'Admin';
    
    return res.status(200).json({
      success: true,
      userId,
      userEmail: auth.user?.email,
      userRole: auth.profile?.role,
      isAdmin,
      userOrgId,
      profileData: auth.profile,
      fullAuth: {
        hasUser: !!auth.user,
        hasProfile: !!auth.profile,
        userKeys: auth.user ? Object.keys(auth.user) : [],
        profileKeys: auth.profile ? Object.keys(auth.profile) : []
      }
    });
    
  } catch (error) {
    console.error('[debugAuth] Error:', error);
    return res.status(200).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}
