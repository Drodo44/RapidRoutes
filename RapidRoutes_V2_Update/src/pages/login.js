// File: src/pages/login.js
// RapidRoutes 2.0 - Login Page
// Visual: Centered glass panel on animated background with 240px logo

import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import { getBrowserSupabase } from '@/lib/supabaseClient';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const supabase = getBrowserSupabase();
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (authError) {
                setError(authError.message);
                return;
            }

            if (data?.user) {
                router.push('/command-center');
            }
        } catch (err) {
            setError('An unexpected error occurred');
            console.error('[Login] Error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Head>
                <title>Login | RapidRoutes</title>
                <meta name="description" content="Sign in to RapidRoutes - Your freight brokerage command center" />
            </Head>

            {/* Animated Background */}
            <div className="background" />

            {/* Login Container */}
            <div style={styles.container}>
                {/* Login Card */}
                <div className="glass-panel" style={styles.card}>
                    {/* Logo - CRITICAL: Exactly 240px width */}
                    <div style={styles.logoContainer}>
                        <Image
                            src="/logo.png"
                            alt="RapidRoutes"
                            width={240}
                            height={60}
                            priority
                            style={{ objectFit: 'contain' }}
                        />
                    </div>

                    {/* Welcome Text */}
                    <div style={styles.header}>
                        <h1 style={styles.title}>Welcome Back</h1>
                        <p style={styles.subtitle}>Sign in to your command center</p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div style={styles.errorBox}>
                            <span style={styles.errorText}>{error}</span>
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleLogin} style={styles.form}>
                        <div style={styles.inputGroup}>
                            <label className="label" htmlFor="email">Email Address</label>
                            <input
                                id="email"
                                type="email"
                                className="input"
                                placeholder="you@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>

                        <div style={styles.inputGroup}>
                            <label className="label" htmlFor="password">Password</label>
                            <input
                                id="password"
                                type="password"
                                className="input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            style={styles.submitBtn}
                            disabled={loading}
                        >
                            {loading ? (
                                <span style={styles.loadingText}>
                                    <LoadingSpinner />
                                    Signing in...
                                </span>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    {/* Footer Links */}
                    <div style={styles.footer}>
                        <a href="/forgot-password" style={styles.link}>
                            Forgot password?
                        </a>
                    </div>
                </div>

                {/* Version Badge */}
                <div style={styles.version}>
                    RapidRoutes v2.0
                </div>
            </div>
        </>
    );
}

// Loading Spinner Component
function LoadingSpinner() {
    return (
        <svg
            style={styles.spinner}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
        >
            <circle
                style={{ opacity: 0.25 }}
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            />
            <path
                style={{ opacity: 0.75 }}
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
        </svg>
    );
}

// Inline styles for login page - USING CSS VARIABLES
const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
    },
    card: {
        width: '100%',
        maxWidth: '420px',
        padding: '40px',
    },
    logoContainer: {
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '32px',
    },
    header: {
        textAlign: 'center',
        marginBottom: '32px',
    },
    title: {
        fontSize: '1.5rem',
        fontWeight: '600',
        color: 'var(--text-primary, #FFFFFF)',
        marginBottom: '8px',
    },
    subtitle: {
        fontSize: '0.875rem',
        color: 'var(--text-secondary, #A3A3A3)',
    },
    errorBox: {
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: 'var(--radius-md, 12px)',
        padding: '12px 16px',
        marginBottom: '24px',
    },
    errorText: {
        color: 'var(--error, #EF4444)',
        fontSize: '0.875rem',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
    },
    submitBtn: {
        width: '100%',
        marginTop: '8px',
    },
    loadingText: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    spinner: {
        width: '20px',
        height: '20px',
        animation: 'spin 1s linear infinite',
    },
    footer: {
        textAlign: 'center',
        marginTop: '24px',
    },
    link: {
        color: 'var(--primary, #3B82F6)',
        textDecoration: 'none',
        fontSize: '0.875rem',
    },
    version: {
        marginTop: '24px',
        fontSize: '0.75rem',
        color: 'var(--text-tertiary, #525252)',
    },
};

// Add keyframes for spinner if not in globals
if (typeof document !== 'undefined') {
    const styleSheet = document.styleSheets[0];
    try {
        styleSheet?.insertRule(`
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `, styleSheet.cssRules?.length || 0);
    } catch (e) {
        // Rule might already exist
    }
}
