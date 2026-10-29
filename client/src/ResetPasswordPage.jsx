import { useState } from 'react';
import { supabase } from './supabase';
import { validatePassword } from './auth';
import LinkBoardLogo from './assets/linkboard-mark.svg';

export default function ResetPasswordPage({ onLogin }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (password !== confirmation) {
      setError('Passwords do not match.');
      return;
    }
    const validation = validatePassword(password);
    if (!validation.valid) {
      setError(validation.message);
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSuccess('Your password has been updated. You can now log in.');
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-[#6ba3ec] flex items-center justify-center px-4">
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-xl p-8 sm:p-10 w-full max-w-xl">
        <img src={LinkBoardLogo} alt="LinkBoard" className="w-16 h-16 mx-auto mb-4 object-contain" />
        <h1 className="text-2xl font-bold text-center mb-6">Set a new password</h1>
        <label className="block text-sm mb-1" htmlFor="new-password">New password</label>
        <input id="new-password" type="password" autoComplete="new-password" required className="input input-bordered w-full mb-4" value={password} onChange={(event) => setPassword(event.target.value)} />
        <label className="block text-sm mb-1" htmlFor="confirm-password">Confirm new password</label>
        <input id="confirm-password" type="password" autoComplete="new-password" required className="input input-bordered w-full" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
        {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}
        {success && <p className="mt-4 text-sm text-green-700" role="status">{success}</p>}
        <button type="submit" disabled={loading} className="btn btn-primary w-full mt-6">{loading ? 'Updating...' : 'Update password'}</button>
        {success && <button type="button" onClick={onLogin} className="btn btn-ghost w-full mt-2">Back to log in</button>}
      </form>
    </div>
  );
}
