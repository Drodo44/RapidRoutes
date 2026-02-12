// pages/index.js - RapidRoutes Home
// Redirects authenticated users to premium dashboard
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import supabase from '../utils/supabaseClient';

const ROOT_BOOT_TIMEOUT_MS = 8000;

function withTimeout(promise, timeoutMs, timeoutMessage) {
  let timeoutId;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    }),
  ]).finally(() => {
    clearTimeout(timeoutId);
  });
}

export default function IndexPage() {
  const router = useRouter();
  const bootStartRef = useRef(Date.now());
  const [bootError, setBootError] = useState(null);

  useEffect(() => {
    let mounted = true;
    bootStartRef.current = Date.now();

    const logBoot = (step, extra = {}) => {
      console.log('[boot]', {
        step,
        elapsedMs: Date.now() - bootStartRef.current,
        pathname: '/',
        ...extra,
      });
    };

    const checkAuthAndRedirect = async () => {
      try {
        logBoot('boot:start');
        logBoot('boot:supabaseClientReady', { ready: !!supabase });

        if (!supabase) {
          if (mounted) {
            logBoot('boot:routeDecision', { decision: 'redirect:/login', reason: 'no-supabase' });
            router.replace('/login').catch(() => {});
          }
          return;
        }

        logBoot('boot:getSession:start');
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          ROOT_BOOT_TIMEOUT_MS,
          'SESSION_TIMEOUT'
        );
        logBoot('boot:getSession:done', { hasSession: !!session });

        if (!mounted) return;

        const target = session ? '/dashboard' : '/login';
        logBoot('boot:routeDecision', { decision: `redirect:${target}`, hasSession: !!session });
        await router.replace(target);
        logBoot('boot:done', { loading: false, hasSession: !!session });
      } catch (error) {
        const reason = error?.message || 'UNKNOWN_BOOT_ERROR';
        logBoot('boot:getSession:error', { error: reason });

        if (!mounted) return;

        try {
          logBoot('boot:routeDecision', { decision: 'redirect:/login', reason });
          await router.replace('/login');
          logBoot('boot:done', { loading: false, hasSession: false, fallback: true });
        } catch {
          setBootError('Unable to load app. Please retry.');
          logBoot('boot:done', { loading: false, hasSession: false, fallback: false });
        }
      }
    };

    checkAuthAndRedirect();
    return () => {
      mounted = false;
    };
  }, [router]);

  if (bootError) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg, #000)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '15px',
            color: 'var(--text-secondary, #A3A3A3)',
            fontFamily: 'Inter, sans-serif',
            marginBottom: '12px',
          }}>
            {bootError}
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              border: '1px solid #374151',
              borderRadius: '8px',
              padding: '8px 14px',
              background: '#111827',
              color: '#E5E7EB',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show loading while redirecting
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg, #000)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
        <div style={{
          fontSize: '15px',
          color: 'var(--text-secondary, #A3A3A3)',
          fontFamily: 'Inter, sans-serif',
        }}>
          Loading RapidRoutes...
        </div>
      </div>
    </div>
  );
}
