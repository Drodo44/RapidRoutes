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
      
      // Success! Redirect to login
      router.replace('/login?message=Account created! Please sign in.');
    } catch (e) {
      setErr(e.message || 'Signup failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: 'var(--bg-primary)',
      backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.08) 0%, transparent 50%)'
    }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '0 var(--space-4)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <img 
              src="/rapidroutes-logo.png" 
              alt="RapidRoutes logo" 
              className="mx-auto mb-8 h-40 w-40 rounded-full ring-2 ring-cyan-400 drop-shadow-lg transition-transform duration-300 hover:scale-105"
              style={{
                height: '160px',
                width: '160px',
                margin: '0 auto 32px auto',
                borderRadius: '50%',
                border: '2px solid #06b6d4',
                boxShadow: '0 10px 25px rgba(6, 182, 212, 0.3)',
                transition: 'transform 0.3s ease',
                display: 'block'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            />
          </div>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: 700, 
            marginBottom: 'var(--space-2)',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.02em'
          }}>
            RapidRoutes
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Create your account</p>
        </div>
        <form
          onSubmit={onSubmit}
          className="card"
          style={{ padding: 'var(--space-6)' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Account Type Selection */}
            <div>
              <label className="form-label">I am a...</label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  type="button"
                  onClick={() => setAccountType('member')}
                  style={{
                    flex: 1,
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${accountType === 'member' ? 'var(--primary)' : 'var(--border-default)'}`,
                    backgroundColor: accountType === 'member' ? 'var(--primary-light)' : 'transparent',
                    color: accountType === 'member' ? 'var(--primary)' : 'var(--text-secondary)',
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
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${accountType === 'broker' ? 'var(--primary)' : 'var(--border-default)'}`,
                    backgroundColor: accountType === 'broker' ? 'var(--primary-light)' : 'transparent',
                    color: accountType === 'broker' ? 'var(--primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    transition: 'all 0.15s'
                  }}
                >
                  🏢 New Broker
                </button>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
                {accountType === 'member' 
                  ? 'Join an existing broker\'s team as Apprentice or Support' 
                  : 'Create your own team and manage lanes independently'}
              </p>
            </div>
            
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Password</label>
              <input
                type="password"
                required
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className="form-input"
              />
            </div>
            
            {accountType === 'broker' ? (
              // Broker setup: Team name
              <div>
                <label className="form-label">Team Name</label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g., Connellan Logistics, Smith Freight"
                  className="form-input"
                />
                <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
                  Your team name will be visible to members who join your team
                </p>
              </div>
            ) : (
              // Team member setup: Team + Role selection
              <>
                {/* Team Selection */}
                <div>
              <label className="form-label">Select Broker Team</label>
              {loadingTeams ? (
                <div style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  Loading teams...
                </div>
              ) : teams.length === 0 ? (
                <div style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  No teams available. Contact your administrator.
                </div>
              ) : (
                <select
                  required
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="form-input"
                  style={{ cursor: 'pointer' }}
                >
                  {teams.map(team => (
                    <option key={team.organization_id} value={team.organization_id}>
                      {team.broker_name} ({team.broker_email})
                    </option>
                  ))}
                </select>
              )}
            </div>
            
            {/* Role Selection */}
            <div>
              <label className="form-label">Your Role</label>
              <select
                required
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="form-input"
                style={{ cursor: 'pointer' }}
              >
                <option value="Apprentice">Apprentice (View Only)</option>
                <option value="Support">Support (Full Access)</option>
              </select>
              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
                {selectedRole === 'Apprentice' 
                  ? '📖 Apprentices can view lanes and data but cannot create or edit' 
                  : '✏️ Support can create lanes, generate CSVs, and manage team data'}
              </p>
            </div>
            </>
            )}
            
            {err && <p style={{ fontSize: '12px', color: 'var(--danger)' }}>{err}</p>}
            <button
              type="submit"
              disabled={busy || (accountType === 'member' && (loadingTeams || teams.length === 0))}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              {busy ? 'Creating account…' : accountType === 'broker' ? 'Create Broker Account' : 'Join Team'}
            </button>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
              Already have an account?{' '}
              <a style={{ color: 'var(--primary)', textDecoration: 'none' }} href="/login">
                Sign in
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
