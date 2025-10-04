// pages/pending-approval.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import supabase from '../utils/supabaseClient';

export default function PendingApprovalPage() {
  const router = useRouter();

  useEffect(() => {
    const checkStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', session.user.id)
        .single();

      if (profile?.status === 'approved') {
        router.replace('/dashboard');
      } else if (profile?.status === 'rejected') {
        await supabase.auth.signOut();
        router.replace('/login');
      }
    };

    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds
    checkStatus(); // Check immediately

    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-md w-full mx-4">
        <div className="text-center">
          <img src="/logo.png" alt="RapidRoutes Logo" className="h-16 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-4">
            Account Pending Approval
          </h1>
          <div className="rounded-lg p-6 mb-4" style={{ background: 'var(--surface)', borderColor: 'var(--border-default)' }}>
            <div className="animate-pulse flex justify-center mb-4">
              <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
              Your account is currently under review. You will receive access once an administrator approves your account.
            </p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              This page will automatically update when your account is approved.
            </p>
          </div>
          <button
            onClick={() => supabase.auth.signOut().then(() => router.replace('/login'))}
            className="text-sm text-gray-400 hover:text-gray-300"
          >
            ← Back to login
          </button>
        </div>
      </div>
    </div>
  );
}
