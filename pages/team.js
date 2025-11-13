// pages/team.js
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';

export default function TeamManagementPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [teamName, setTeamName] = useState('');
  const [originalTeamName, setOriginalTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [saving, setSaving] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!loading && profile) {
      loadTeamData();
      checkPendingRequest();
    }
  }, [loading, profile]);

  async function loadTeamData() {
    if (!profile?.organization_id) return;

    // Load team name
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('team_name, email')
      .eq('organization_id', profile.organization_id)
      .eq('team_role', 'owner')
      .single();

    if (ownerProfile?.team_name) {
      setTeamName(ownerProfile.team_name);
      setOriginalTeamName(ownerProfile.team_name);
    }

    // Load team members (only if broker/owner)
    if (profile.team_role === 'owner' || profile.role === 'Admin') {
      const { data: members } = await supabase
        .from('profiles')
        .select('id, email, role, team_role, created_at, status')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: true });

      setTeamMembers(members || []);
    }
  }

  async function checkPendingRequest() {
    if (profile?.role === 'Apprentice' || profile?.role === 'Support') {
      const { data } = await supabase
        .from('promotion_requests')
        .select('*')
        .eq('user_id', profile.id)
        .eq('status', 'pending')
        .single();

      setPendingRequest(data);
    }
  }

  async function handleSaveTeamName() {
    if (!teamName.trim()) {
      setMessage({ type: 'error', text: 'Team name cannot be empty' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/teams/update-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamName: teamName.trim() })
      });

      const result = await response.json();

      if (response.ok) {
        setOriginalTeamName(teamName.trim());
        setMessage({ type: 'success', text: 'Team name updated successfully!' });
      } else {
        throw new Error(result.error || 'Failed to update team name');
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleRequestPromotion() {
    setRequesting(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/promotions/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestedTeamName: teamName.trim() || `${profile.email.split('@')[0]}'s Team`
        })
      });

      const result = await response.json();

      if (response.ok) {
        setPendingRequest(result.request);
        setMessage({ type: 'success', text: 'Promotion request submitted! Admin will review it shortly.' });
      } else {
        throw new Error(result.error || 'Failed to submit promotion request');
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setRequesting(false);
    }
  }

  async function handleRemoveMember(memberId) {
    if (!confirm('Are you sure you want to remove this team member?')) return;

    try {
      const response = await fetch('/api/teams/remove-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId })
      });

      if (response.ok) {
        setTeamMembers(teamMembers.filter(m => m.id !== memberId));
        setMessage({ type: 'success', text: 'Team member removed' });
      } else {
        const result = await response.json();
        throw new Error(result.error || 'Failed to remove member');
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  }

  if (loading) {
    return <div className="container" style={{ padding: 'var(--space-8)' }}>Loading...</div>;
  }

  if (!profile) {
    router.push('/login');
    return null;
  }

  const isOwner = profile.team_role === 'owner';
  const canRequestPromotion = (profile.role === 'Apprentice' || profile.role === 'Support') && !pendingRequest;

  return (
    <>
      <Head>
        <title>Team Management | RapidRoutes</title>
      </Head>

      <div className="container" style={{ padding: 'var(--space-8)', maxWidth: '1200px' }}>
        {/* Header */}
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: 700, 
            marginBottom: 'var(--space-2)',
            color: 'var(--text-primary)'
          }}>
            Team Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {isOwner ? 'Manage your team settings and members' : 'View your team information'}
          </p>
        </div>

        {/* Message Banner */}
        {message.text && (
          <div style={{
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: message.type === 'error' ? 'var(--danger-light)' : 'var(--success-light)',
            border: `1px solid ${message.type === 'error' ? 'var(--danger)' : 'var(--success)'}`,
            color: message.type === 'error' ? 'var(--danger)' : 'var(--success)',
            fontSize: '13px'
          }}>
            {message.text}
          </div>
        )}

        {/* Team Name Section */}
        <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-6)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: 'var(--space-4)', color: 'var(--text-primary)' }}>
            Team Information
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label className="form-label">Team Name</label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  disabled={!isOwner}
                  placeholder={isOwner ? "Enter your team name" : "No team name set"}
                  className="form-input"
                  style={{ flex: 1 }}
                />
                {isOwner && (
                  <button
                    onClick={handleSaveTeamName}
                    disabled={saving || teamName.trim() === originalTeamName}
                    className="btn btn-primary"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                )}
              </div>
              {!isOwner && (
                <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
                  Only team owners can change the team name
                </p>
              )}
            </div>

            <div>
              <label className="form-label">Your Role</label>
              <div style={{
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-default)',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-primary)'
              }}>
                {profile.role} {profile.team_role === 'owner' && '(Team Owner)'}
              </div>
            </div>
          </div>
        </div>

        {/* Promotion Request Section (for Apprentice/Support) */}
        {canRequestPromotion && (
          <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-6)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: 'var(--space-4)', color: 'var(--text-primary)' }}>
              Career Advancement
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              Ready to become a broker? Request a promotion to create your own team and manage lanes independently.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Your future team name"
                className="form-input"
                style={{ flex: 1 }}
              />
              <button
                onClick={handleRequestPromotion}
                disabled={requesting || !teamName.trim()}
                className="btn"
                style={{
                  backgroundColor: 'var(--success)',
                  color: 'white',
                  border: 'none'
                }}
              >
                {requesting ? 'Submitting...' : '🚀 Request Promotion'}
              </button>
            </div>
          </div>
        )}

        {/* Pending Request Status */}
        {pendingRequest && (
          <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-6)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: 'var(--space-4)', color: 'var(--text-primary)' }}>
              Promotion Request Status
            </h2>
            <div style={{
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--warning-light)',
              border: '1px solid var(--warning)',
              fontSize: '13px'
            }}>
              <div style={{ fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--warning)' }}>
                ⏳ Pending Admin Review
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>
                Requested Team Name: <strong>{pendingRequest.requested_team_name}</strong>
              </div>
              <div style={{ color: 'var(--text-tertiary)', fontSize: '11px', marginTop: 'var(--space-1)' }}>
                Submitted {new Date(pendingRequest.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        )}

        {/* Team Members Section (for owners) */}
        {isOwner && teamMembers.length > 0 && (
          <div className="card" style={{ padding: 'var(--space-6)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: 'var(--space-4)', color: 'var(--text-primary)' }}>
              Team Members ({teamMembers.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {teamMembers.map(member => (
                <div
                  key={member.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 'var(--space-4)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-default)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text-primary)' }}>
                      {member.email}
                      {member.team_role === 'owner' && <span style={{ color: 'var(--primary)', marginLeft: 'var(--space-2)' }}>(You)</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                      {member.role} • Joined {new Date(member.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {member.team_role !== 'owner' && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="btn"
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid var(--danger)',
                        color: 'var(--danger)',
                        fontSize: '12px',
                        padding: 'var(--space-2) var(--space-3)'
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
