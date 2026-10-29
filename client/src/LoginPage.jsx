import React, { useState } from "react";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';
import LinkBoardLogo from "./assets/linkboard-mark.svg";

export default function LoginPage({ onBack, onSignup, onLogin, continueWithBoardCopy = false }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetNotice, setResetNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResetNotice("");
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (onLogin) onLogin(userCredential.user);
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const resetEmail = email.trim();
    setError("");
    setResetNotice("");
    if (!resetEmail) {
      setError("Enter your email above first.");
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetNotice("Password reset request submitted. Check your inbox for a reset link.");
    } catch (resetError) {
      if (resetError.code === 'auth/user-not-found') {
        setResetNotice("Password reset request submitted. Check your inbox for a reset link.");
      } else {
        setError(resetError.message || "Could not send a reset email right now. Please try again.");
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ffff] to-[#6ba3ec] flex items-center justify-center px-2 sm:px-4">
      <div className="absolute top-4 left-2 sm:top-8 sm:left-8 z-10">
        <button className="btn btn-ghost btn-sm sm:btn-md" onClick={onBack}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
          <span className="hidden sm:inline">Back</span>
        </button>
      </div>
      <div className="flex flex-col items-center w-full max-w-xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-10 w-full flex flex-col items-center relative">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <img src={LinkBoardLogo} alt="LinkBoard Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">Log in</h2>
          {continueWithBoardCopy && <p className="mb-4 text-center text-sm text-gray-600">Log in and we’ll add that public board to your private boards.</p>}
          {/* ...existing code... */}
          <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm mb-1" htmlFor="email">Your email</label>
              <input id="email" type="email" placeholder="Your email" className="input input-bordered w-full input-enhanced enhanced-focus" value={email} onChange={e => { setEmail(e.target.value); setError(""); setResetNotice(""); }} />
            </div>
            <div className="relative">
              <div className="mb-1 flex items-center justify-between gap-2">
                <label className="block text-sm" htmlFor="password">Your password</label>
                <button type="button" className="text-sm text-primary underline disabled:opacity-60" onClick={handlePasswordReset} disabled={resetLoading}>
                  {resetLoading ? 'Sending...' : 'Forgot password?'}
                </button>
              </div>
              <div className="relative">
                <input id="password" autoComplete="current-password" type={showPassword ? "text" : "password"} placeholder="Your password" className="password-input-no-native-reveal input input-bordered w-full pr-12 input-enhanced enhanced-focus" value={password} onChange={e => setPassword(e.target.value)} />
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded bg-transparent p-1 text-gray-500 hover:bg-transparent active:bg-transparent hover:text-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.2 9.5 6.1a1.8 1.8 0 0 1 0 1.8 12 12 0 0 1-3.1 3.5M6.2 6.2A13 13 0 0 0 2.5 11a1.8 1.8 0 0 0 0 1.8A10.8 10.8 0 0 0 12 19c.8 0 1.6-.1 2.3-.3" />
                    </svg>
                  ) : (
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
                      <circle cx="12" cy="12" r="2.5" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {resetNotice && <p className="text-sm text-green-700" role="status">{resetNotice}</p>}
            <button type="submit" className={`btn btn-primary w-full text-lg mt-2 button-press ${loading ? 'enhanced-button-loading' : ''}`} disabled={loading}>
              {loading ? (
                <>
                  <span className="enhanced-button-spinner w-4 h-4"></span>
                  Logging in...
                </>
              ) : (
                "Log In"
              )}
            </button>
            {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
            <p className="text-center text-gray-500 mt-4 text-sm">
              Don't have an account?{' '}
              <button className="underline text-primary" type="button" onClick={onSignup}>Sign up</button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
