import React from "react";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const navigate = useNavigate();
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
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Create an account</h2>
            <a href="#" className="text-sm text-gray-700 underline hover:text-blue-700">log in instead</a>
          </div>
          <form className="space-y-3">
            <div>
              <label className="block text-gray-700 mb-1 text-sm font-medium">First name</label>
              <input type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="block text-gray-700 mb-1 text-sm font-medium">Last name</label>
              <input type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="block text-gray-700 mb-1 text-sm font-medium">Email</label>
              <input type="email" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="block text-gray-700 mb-1 text-sm font-medium">Password</label>
              <input type="password" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <button type="submit" className="w-full mt-4 py-3 rounded-full bg-blue-600 text-white font-semibold text-lg shadow hover:bg-blue-700 transition">Create and account</button>
          </form>
          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="mx-4 text-gray-400 font-medium">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <button className="w-full flex items-center justify-center gap-2 border border-gray-400 rounded-full py-3 text-base font-semibold hover:bg-gray-50 transition">
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-6 h-6" />
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}
