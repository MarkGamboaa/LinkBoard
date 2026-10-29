import React, { useState } from "react";
import BrandLogo from "./BrandLogo";
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { auth, validatePassword, updateUserProfile } from './firebase';
import LinkBoardLogo from "./assets/linkboard-mark.svg";

export default function SignupPage({ onBack, onLogin, continueWithBoardCopy = false, inviteToken = null, pendingBoardCopyId = null }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const cleanNickname = nickname.trim();
    if (cleanNickname.length < 2 || cleanNickname.length > 24) {
      setError("Nickname must be between 2 and 24 characters");
      setLoading(false);
      return;
    }

    // Validate password
    const validation = validatePassword(password);
    if (!validation.valid) {
      setError(validation.message);
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      let verificationMessage = 'Account created. Check your inbox and verify your email to accept shared board invitations.';
      try {
        await sendEmailVerification(userCredential.user);
      } catch (verificationError) {
        console.warn('Could not send the email verification message:', verificationError);
        verificationMessage = 'Account created, but the verification email could not be sent. You can request another from an invitation page.';
      }
      await updateProfile(userCredential.user, { displayName: `${firstName} ${lastName}`.trim() });
      const profileResult = await updateUserProfile(firstName.trim(), lastName.trim(), cleanNickname);
      if (!profileResult.success) console.error('Failed to save profile:', profileResult.message);
      setSuccess(verificationMessage);
      setFirstName(""); setLastName(""); setNickname(""); setEmail(""); setPassword("");
    } catch (err) {
      setError(err.message);
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
      <div className="flex flex-col lg:flex-row items-center lg:items-stretch w-full max-w-5xl mx-auto min-h-[70vh]">
        {/* Left Section (h1 and p) */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center lg:items-end pr-0 text-center lg:text-right mb-8 lg:mb-0">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight mb-4">
                            Join <BrandLogo showMark={false} textClassName="text-[1em]" weightClassName="font-black" /> and<br />start organizing smarter
          </h1>
          <p className="text-base sm:text-lg text-gray-700 max-w-md">
            Sign up in seconds. Save links, create boards, and take control of your digital space all in one place.
          </p>
        </div>
        {/* Right Section (Signup Card) */}
        <div className="w-full lg:w-1/2 flex justify-center items-center">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-10 w-full max-w-md flex flex-col justify-center">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <img src={LinkBoardLogo} alt="LinkBoard Logo" className="w-full h-full object-contain" />
            </div>
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold">Create an account</h2>
            </div>
            {continueWithBoardCopy && <p className="-mt-4 mb-4 text-sm text-gray-600">Create your account and we’ll add that public board to your private boards.</p>}
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div>
                <input type="text" placeholder="Nickname" maxLength={24} className="input input-bordered w-full input-enhanced enhanced-focus" value={nickname} onChange={e => setNickname(e.target.value)} />
              </div>
              <input type="text" placeholder="First name" className="input input-bordered w-full input-enhanced enhanced-focus" value={firstName} onChange={e => setFirstName(e.target.value)} />
              <input type="text" placeholder="Last name" className="input input-bordered w-full input-enhanced enhanced-focus" value={lastName} onChange={e => setLastName(e.target.value)} />
              <input type="email" placeholder="Email" className="input input-bordered w-full input-enhanced enhanced-focus" value={email} onChange={e => setEmail(e.target.value)} />
              <div>
                <div className="relative">
                  <input autoComplete="new-password" type={showPassword ? 'text' : 'password'} placeholder="Password" className="password-input-no-native-reveal input input-bordered w-full pr-12 input-enhanced enhanced-focus" value={password} onChange={e => setPassword(e.target.value)} />
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setShowPassword((visible) => !visible)}
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
                <div className="text-xs text-gray-500 mt-1">
                  Must be at least 8 characters with 1 uppercase letter and 1 special character
                </div>
              </div>
              <button type="submit" className={`btn btn-primary w-full text-base sm:text-lg mt-2 button-press ${loading ? 'enhanced-button-loading' : ''}`} disabled={loading}>
                {loading ? (
                  <>
                    <span className="enhanced-button-spinner w-4 h-4"></span>
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </button>
              <div className="-mt-2 text-center">
                <button type="button" className="underline text-sm" onClick={onLogin}>log in instead</button>
              </div>
              {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
              {success && <div className="text-green-600 text-sm mt-2">{success}</div>}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
