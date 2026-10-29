import React, { useEffect, useState } from 'react';
import BrandLogo from './BrandLogo';
import { apiFetch } from './auth';
import { getApiUrl } from './utils/api';

export default function BoardInvitePage({ token, user, onLogin, onSignup, onSwitchAccount, onAccepted }) {
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadInvite = async () => {
      try {
        const response = await fetch(getApiUrl(`/api/invites/${encodeURIComponent(token)}`), { cache: 'no-store' });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'This invite is unavailable.');
        if (!cancelled) setInvite(result);
      } catch (requestError) {
        if (!cancelled) setError(requestError.message || 'Could not load the invite.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadInvite();
    return () => { cancelled = true; };
  }, [token]);

  const acceptInvite = async () => {
    setAccepting(true);
    setError('');
    try {
      const response = await apiFetch(`/api/invites/${encodeURIComponent(token)}/accept`, { method: 'POST' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not accept this invite.');
      onAccepted();
    } catch (requestError) {
      setError(requestError.message || 'Could not accept this invite.');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#e3efff] to-[#b3d0f7] p-4">
      <section className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg flex flex-col gap-4">
        <h1><BrandLogo textClassName="text-2xl" /></h1>
        {loading ? <p>Loading invite…</p> : invite ? (
          <>
            <h2 className="text-xl font-semibold">You’re invited to collaborate</h2>
            <p className="text-gray-700"><strong>{invite.ownerName}</strong> invited you to join <strong>{invite.boardTitle}</strong> and collaborate on its links.</p>
            {user ? (
              <>
                <p className="text-sm text-gray-600">Signed in as <strong>{user.email || 'an account without an email'}</strong>. You can join this board.</p>
                <button className="btn btn-primary self-start" onClick={acceptInvite} disabled={accepting}>
                  {accepting ? 'Joining…' : 'Join board'}
                </button>
                <button className="btn btn-ghost self-start" onClick={onSwitchAccount}>Use another account</button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600">Sign in or create an account to join this board.</p>
                <div className="flex gap-3">
                  <button className="btn btn-primary" onClick={onLogin}>Sign in</button>
                  <button className="btn btn-ghost" onClick={onSignup}>Create account</button>
                </div>
              </>
            )}
          </>
        ) : <p className="text-red-600">{error || 'This invite is unavailable.'}</p>}
        {error && invite && <p className="text-sm text-red-600" role="alert">{error}</p>}
      </section>
    </main>
  );
}
