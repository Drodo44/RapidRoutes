// pages/signup.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import supabase from '../utils/supabaseClient';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedRole, setSelectedRole] = useState('Apprentice');
  const [accountType, setAccountType] = useState('member'); // 'member' or 'broker'
  const [teamName, setTeamName] = useState('');
  const [teams, setTeams] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(true);

  useEffect(() => {
    // Skip on server-side (supabase is null during SSR)
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard');
    });

    // Load available teams
    fetchTeams();
  }, [router]);


  async function fetchTeams() {
    try {
      const response = await fetch('/api/teams');
      const data = await response.json();
      if (data.teams) {
        setTeams(data.teams);
        // Auto-select first team if available
        if (data.teams.length > 0) {
          setSelectedTeam(data.teams[0].organization_id);
        }
      }
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoadingTeams(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');

    // Validate based on account type
    if (accountType === 'member' && !selectedTeam) {
      setErr('Please select a team to join');
      return;
    }

    if (accountType === 'broker' && !teamName.trim()) {
      setErr('Please enter a team name');
      return;
    }

    setBusy(true);
    try {
      // 1. Create the auth account
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email,
        password: pw
      });

      if (signupError) throw signupError;

      if (!authData.user) {
        throw new Error('Account creation failed - no user returned');
      }

      // 2. Setup profile based on account type
      if (accountType === 'broker') {
        // Create new broker with their own team
        const response = await fetch('/api/teams/create-broker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: authData.user.id,
            teamName: teamName.trim()
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to create broker account');
        }
      } else {
        // Join existing team as Apprentice/Support
        const response = await fetch('/api/teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: authData.user.id,
            organizationId: selectedTeam,
            role: selectedRole
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to join team');
        }
      }

      // Success! Redirect to pending approval page
      router.replace('/pending-approval');
    } catch (e) {
      setErr(e.message || 'Signup failed');
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    fontSize: '14px',
    color: '#F1F5F9',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    outline: 'none'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: '#CBD5E1',
    marginBottom: '6px'
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        padding: '32px',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img
            src="/logo.png"
            alt="RapidRoutes"
            style={{
              height: '240px',
              width: 'auto',
              margin: '0 auto 16px auto',
              display: 'block',
              borderRadius: '50%',
              border: '2px solid #06B6D4',
              boxShadow: '0 0 30px rgba(6, 182, 212, 0.3)'
            }}
          />
          <h2 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#F1F5F9',
            marginTop: '12px',
            marginBottom: '8px'
          }}>
            Create Account
          </h2>
          <p style={{ fontSize: '14px', color: '#94A3B8' }}>
            Join RapidRoutes today
          </p>
        </div>

        <form onSubmit={onSubmit}>
          {/* Account Type Selection */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>I am a...</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setAccountType('member')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: `2px solid ${accountType === 'member' ? '#06B6D4' : 'rgba(255, 255, 255, 0.1)'}`,
                  backgroundColor: accountType === 'member' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                  color: accountType === 'member' ? '#06B6D4' : '#94A3B8',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  transition: 'all 0.15s'
                }}
              >
                👥 Team Member
              </button>
              <button
                type="button"
                onClick={() => setAccountType('broker')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: `2px solid ${accountType === 'broker' ? '#06B6D4' : 'rgba(255, 255, 255, 0.1)'}`,
                  backgroundColor: accountType === 'broker' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                  color: accountType === 'broker' ? '#06B6D4' : '#94A3B8',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  transition: 'all 0.15s'
                }}
              >
                🏢 New Broker
              </button>
            </div>
            <p style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
              {accountType === 'member'
                ? 'Join an existing broker\'s team as Apprentice or Support'
                : 'Create your own team and manage lanes independently'}
            </p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              onFocus={(e) => {
                e.target.style.borderColor = '#06B6D4';
                e.target.style.boxShadow = '0 0 0 3px rgba(6, 182, 212, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              required
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              style={inputStyle}
              onFocus={(e) => {
                e.target.style.borderColor = '#06B6D4';
                e.target.style.boxShadow = '0 0 0 3px rgba(6, 182, 212, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {accountType === 'broker' ? (
            // Broker setup: Team name
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Team Name</label>
              <input
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g., Connellan Logistics"
                style={inputStyle}
                onFocus={(e) => {
                  e.target.style.borderColor = '#06B6D4';
                  e.target.style.boxShadow = '0 0 0 3px rgba(6, 182, 212, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <p style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                Your team name will be visible to members who join
              </p>
            </div>
          ) : (
            // Team member setup: Team + Role selection
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Select Broker Team</label>
                {loadingTeams ? (
                  <div style={{ padding: '10px', color: '#94A3B8', fontSize: '13px' }}>
                    Loading teams...
                  </div>
                ) : teams.length === 0 ? (
                  <div style={{ padding: '10px', color: '#94A3B8', fontSize: '13px' }}>
                    No teams available. Contact your administrator.
                  </div>
                ) : (
                  <select
                    required
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {teams.map(team => (
                      <option key={team.organization_id} value={team.organization_id} style={{ background: '#1f2937' }}>
                        {team.broker_name} ({team.broker_email})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Your Role</label>
                <select
                  required
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="Apprentice" style={{ background: '#1f2937' }}>Apprentice (View Only)</option>
                  <option value="Support" style={{ background: '#1f2937' }}>Support (Full Access)</option>
                </select>
                <p style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                  {selectedRole === 'Apprentice'
                    ? '📖 Apprentices can view lanes and data but cannot create or edit'
                    : '✏️ Support can create lanes, generate CSVs, and manage team data'}
                </p>
              </div>
            </>
          )}

          {err && (
            <div style={{
              padding: '12px',
              background: 'rgba(247, 90, 104, 0.1)',
              border: '1px solid rgba(247, 90, 104, 0.5)',
              borderRadius: '8px',
              marginBottom: '16px',
              color: '#F75A68',
              fontSize: '13px',
              textAlign: 'center'
            }}>
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || (accountType === 'member' && (loadingTeams || teams.length === 0))}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#FFFFFF',
              background: '#06B6D4',
              border: 'none',
              borderRadius: '8px',
              cursor: busy ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)',
              opacity: busy ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!busy) {
                e.target.style.background = '#22D3EE';
                e.target.style.boxShadow = '0 0 30px rgba(6, 182, 212, 0.5)';
                e.target.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#06B6D4';
              e.target.style.boxShadow = '0 0 20px rgba(6, 182, 212, 0.3)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            {busy ? 'Creating account...' : accountType === 'broker' ? 'Create Broker Account' : 'Join Team'}
          </button>
        </form>

        <p style={{
          fontSize: '13px',
          color: '#94A3B8',
          textAlign: 'center',
          marginTop: '20px'
        }}>
          Already have an account?{' '}
          <a
            href="/login"
            style={{
              color: '#06B6D4',
              textDecoration: 'none',
              fontWeight: 500
            }}
            onMouseEnter={(e) => e.target.style.color = '#22D3EE'}
            onMouseLeave={(e) => e.target.style.color = '#06B6D4'}
          >
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
