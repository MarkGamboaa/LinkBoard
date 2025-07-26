import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-blue-100 to-blue-200">
        <button
        className="absolute top-10 left-20 text-gray-600 hover:text-black text-base font-medium flex items-center gap-2 z-10"
        onClick={() => navigate("/")}
      >
        <span className="text-xl">&#8592;</span> Back
      </button>
        <div className="relative w-full bg-white rounded-2xl shadow-lg p-4 xs:p-6 sm:p-10 sm:px-20 flex flex-col items-center max-w-full xs:max-w-md sm:max-w-2xl mx-10 sm:mx-0 px-10 pb-10">

        {/* Avatar placeholder */}
        <div className="w-12 h-12 rounded-full bg-gray-200 mb-6 mt-6" />
        <h2 className="text-2xl font-bold text-center mb-2">Log in</h2>
        <p className="text-gray-500 text-center text-sm mb-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-blue-700 underline hover:text-blue-900">Sign up</Link>
        </p>

        {/* Social logins */}
        <button className="flex items-center w-full border border-gray-400 rounded-full py-3 px-4 mb-6 hover:bg-gray-50 transition">
          <span className="mr-3 text-xl">

            {/* Google icon */}
            <svg width="24" height="24" viewBox="0 0 24 24"><g><path fill="#4285F4" d="M23.654 12.277c0-.885-.08-1.733-.229-2.553H12v4.825h6.635c-.287 1.548-1.152 2.86-2.457 3.74v3.104h3.977c2.33-2.15 3.666-5.32 3.666-9.116z"/><path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.946-2.91l-3.977-3.104c-1.104.74-2.51 1.18-3.969 1.18-3.053 0-5.64-2.06-6.565-4.824H1.357v3.13A11.997 11.997 0 0012 24z"/><path fill="#FBBC05" d="M5.435 14.342A7.19 7.19 0 014.818 12c0-.81.14-1.598.388-2.342V6.527H1.357A11.997 11.997 0 000 12c0 1.885.453 3.67 1.357 5.473l4.078-3.13z"/><path fill="#EA4335" d="M12 4.77c1.76 0 3.34.605 4.584 1.793l3.418-3.418C17.96 1.07 15.24 0 12 0A11.997 11.997 0 001.357 6.527l4.078 3.13C6.36 6.83 8.947 4.77 12 4.77z"/></g></svg>
          </span>
          <span className="flex-1 text-gray-700 font-medium text-base text-center">Log in with Google</span>
        </button>

        {/* Divider */}
        <div className="flex items-center w-full mb-6">
          <hr className="flex-1 border-gray-300" />
          <span className="mx-3 text-gray-400 font-medium">OR</span>
          <hr className="flex-1 border-gray-300" />
        </div>

        {/* Email/password form */}
        <form className="w-full flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="block text-gray-600 text-sm mb-1">Your email</label>
            <input
              id="email"
              type="email"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Enter your email"
              autoComplete="email"
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
        </form>
      </div>
    </div>
  );
}
