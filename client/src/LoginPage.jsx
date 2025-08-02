import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";
import LinkBoardLogo from "./assets/linkboardlogo.svg";

export default function LoginPage({ onBack, onSignup, onLogin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (onLogin) onLogin(userCredential.user);
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
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
          {/* ...existing code... */}
          <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm mb-1" htmlFor="email">Your email</label>
              <input id="email" type="email" placeholder="Your email" className="input input-bordered w-full input-enhanced enhanced-focus" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="relative">
              <label className="block text-sm mb-1" htmlFor="password">Your password</label>
              <input id="password" type={showPassword ? "text" : "password"} placeholder="Your password" className="input input-bordered w-full pr-16 input-enhanced enhanced-focus" value={password} onChange={e => setPassword(e.target.value)} />
              <span className="absolute right-3 top-8 flex items-center text-gray-400 cursor-pointer select-none" onClick={() => setShowPassword(v => !v)}>
                {showPassword ? (
                  // Eye-off icon (Heroicons outline)
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.336-3.233.938-4.675" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.94 17.94A10.05 10.05 0 0012 19c-5.523 0-10-4.477-10-10 0-1.657.336-3.233.938-4.675" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.88 9.88a3 3 0 104.24 4.24" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" opacity="0.4" />
                  </svg>
                ) : (
                  // Eye icon
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </span>
            </div>
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
