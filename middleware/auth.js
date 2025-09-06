// middleware/auth.js
import { getUserAndProfile } from '../utils/getUserProfile';

/**
 * Verify user is authenticated and optionally check for specific role
 */
export async function authenticateUser(context, requiredRole = null) {
  try {
    const { user, profile } = await getUserAndProfile();

    if (!user || profile?.status !== 'approved') {
      return {
        redirect: {
          destination: '/login',
          permanent: false,
        },
      };
    }

    if (requiredRole && profile.role !== requiredRole) {
      return {
        redirect: {
          destination: '/unauthorized',
          permanent: false,
        },
      };
    }

    // Pass user data to the page via props
    return {
      props: {
        user,
        profile,
      },
    };
  } catch (error) {
    console.error('Auth middleware error:', error);
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }
}

/**
 * API route middleware to validate auth and optionally check role
 */
export async function validateApiAuth(req, res, requiredRole = null) {
  try {
    const { user, profile } = await getUserAndProfile();

    if (!user || profile?.status !== 'approved') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (requiredRole && profile.role !== requiredRole) {
      return res.status(403).json({ error: `${requiredRole} access required` });
    }

    return { user, profile };
  } catch (error) {
    console.error('API auth error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}
