import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "./firebase";

export default function Signup() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // Optionally update profile with first/last name here
      // Show notification and redirect to login
      window.localStorage.setItem("signupSuccess", "Account created successfully! Please log in.");
      navigate("/login");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleSignup = async () => {
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
    <div className="relative min-h-screen flex flex-col md:flex-row items-center justify-center bg-gradient-to-br from-white via-blue-100 to-blue-200 px-2 md:px-8 py-8">
      {/* Back Button Top Left */}
      <button
        className="absolute top-10 left-20 text-gray-600 hover:text-black text-base font-medium flex items-center gap-2 z-10"
        onClick={() => navigate("/")}
      >
        <span className="text-xl">&#8592;</span> Back
      </button>
      {/* Left Side */}
      <div className="hidden md:flex flex-col flex-1 justify-center items-end">
        <h1 className="text-right text-3xl md:text-4xl lg:text-5xl font-bold text-black mb-4 max-w-lg leading-tight">
          Join <span className="text-blue-700">LinkBoard</span> and<br />
          start organizing<br />
          smarter
        </h1>
        <p className="text-right text-base text-black max-w-md">
          Sign up in seconds. Save links, create boards, and take control of your digital space all in one place.
        </p>
      </div>
      {/* Right Side (Form) */}
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10 w-full max-w-md md:max-w-lg lg:max-w-xl max-h-screen overflow-hidden">
          <div className="flex flex-col justify-between items-center mb-5">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center">Create an account</h2>
          </div>
          {error && (
            <div className="w-full bg-red-100 text-red-700 px-4 py-2 rounded mb-2 text-center text-sm">
              {error}
            </div>
          )}
          <form className="space-y-3" onSubmit={handleSignup}>
            <div>
              <label className="block text-gray-700 mb-1 text-sm font-medium">First name</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1 text-sm font-medium">Last name</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1 text-sm font-medium">Email</label>
              <input
                type="email"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1 text-sm font-medium">Password</label>
              <input
                type="password"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="w-full mt-4 py-3 rounded-full bg-blue-600 text-white font-semibold text-lg shadow hover:bg-blue-700 transition">Create account</button>
            <div className="w-full flex justify-center mt-2">
              <Link to="/login" className="text-sm text-gray-700 underline hover:text-blue-700">Login instead</Link>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
