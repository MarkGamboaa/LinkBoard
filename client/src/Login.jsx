

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "./firebase";
import logo from "./assets/logo.svg";


export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Show notification if redirected from signup
  React.useEffect(() => {
    const msg = window.localStorage.getItem("signupSuccess");
    if (msg) {
      setSuccess(msg);
      window.localStorage.removeItem("signupSuccess");
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-blue-100 to-blue-200">
        <button
        className="absolute top-10 left-20 text-gray-600 hover:text-black text-base font-medium flex items-center gap-2 z-10"
        onClick={() => navigate("/")}
      >
        <span className="text-xl">&#8592;</span> Back
      </button>
        <div className="relative w-full bg-white rounded-2xl shadow-lg p-4 xs:p-6 sm:p-10 sm:px-20 flex flex-col items-center max-w-full xs:max-w-md sm:max-w-2xl mx-10 sm:mx-0 px-10 pb-10">


 
        <h2 className="text-2xl font-bold text-center mb-2">Log in</h2>

        {/* Success message */}
        {success && (
          <div className="w-full bg-green-100 text-green-700 px-4 py-2 rounded mb-4 text-center text-sm">
            {success}
          </div>
        )}
        {/* Error message */}
        {error && (
          <div className="w-full bg-red-100 text-red-700 px-4 py-2 rounded mb-4 text-center text-sm">
            {error}
          </div>
        )}


        {/* Email/password form */}
        <form className="w-full flex flex-col gap-4" onSubmit={handleLogin}>
          <div>
            <label htmlFor="email" className="block text-gray-600 text-sm mb-1">Your email</label>
            <input
              id="email"
              type="email"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Enter your email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="relative">
            <label htmlFor="password" className="block text-gray-600 text-sm mb-1">Your password</label>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 pr-16"
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute right-3 top-8 text-gray-400 hover:text-gray-600 text-sm flex items-center"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-.274.857-.676 1.664-1.186 2.393M15.54 15.54A5.978 5.978 0 0112 17c-4.478 0-8.268-2.943-9.542-7a9.956 9.956 0 012.042-3.362"/></svg>
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <button type="submit" className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full py-3 text-lg transition">Log In</button>
          <div className="w-full flex justify-center mt-4">
            <span className="text-gray-500 text-sm">Don't have an account?{' '}
              <Link to="/signup" className="text-blue-700 underline hover:text-blue-900">Sign up</Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
