

import curveLine from "./assets/curve-line.svg";
import sideImg from "./assets/side-img.svg";
import playBtn from "./assets/Play.svg";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-100 to-blue-200 flex flex-col overflow-hidden">

      {/* Nav */}
      <div className="flex justify-between items-center px-6 md:px-16 lg:px-30 pt-6 md:pt-10">
        <span className="text-3xl font-extrabold text-blue-700">LinkBoard</span>
        <div className="space-x-4">
          <Link to="/login">
            <button className="text-black font-medium">Login</button>
          </Link>
          <Link to="/signup">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold ml-2 hover:bg-blue-700 transition">Sign Up</button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col lg:flex-row items-center justify-center px-4 md:px-12 lg:px-30 py-6 md:py-8 gap-8 md:gap-12 w-full">
        {/* Left Side */}
        <div className="w-full max-w-xl mb-10 lg:mb-0 text-center lg:text-left flex flex-col items-center lg:items-start">
          {/* Mobile Image on Top */}
          <div className="lg:hidden mb-6 w-full flex justify-center">
            <img src={sideImg} alt="Side visual" className="object-contain w-70 h-70 md:w-60 md:h-60" />
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-black leading-tight mb-4">
            With <span className="text-blue-700">LinkBoard </span><br className="hidden md:block" />Increase your <br className="hidden md:block" />Productivity
          </h1>
          <img src={curveLine} alt={"Curve line"} className="mb-8 w-48 md:w-64 lg:w-80 h-6 md:h-8 object-contain mx-auto lg:mx-0" />
          <p className="text-sm md:text-base text-black mb-8">
            can create customizable boards to organize your favorite tools, articles, videos, and anything else worth saving all in one clean dashboard.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 justify-center lg:justify-start">
            <Link to="/signup" className="w-full sm:w-auto">
              <button className="px-6 md:px-8 py-3 md:py-4 bg-blue-600 text-white rounded-full font-semibold text-base md:text-lg shadow hover:bg-blue-700 transition w-full sm:w-auto">Get Started</button>
            </Link>
            <button className="flex items-center gap-2 px-6 md:px-6 py-3 md:py-4 bg-white border border-gray-300 text-black rounded-full font-semibold text-base md:text-lg shadow hover:bg-gray-100 transition w-full sm:w-auto">
              <span className="w-6 h-6 flex items-center justify-center">
                <img src={playBtn} alt="Play" className="w-5 h-6" />
              </span>
              View Public Boards
            </button>
          </div>
        </div>

        {/* Right Side Image (hidden on mobile) */}
        <div className="flex-1 items-center justify-center w-full hidden lg:flex">
          <img src={sideImg} alt="Side visual" className="object-contain w-120 h-120 md:w-80 md:h-80 lg:w-[500px] lg:h-[500px]" />
        </div>

      </div>
    </div>
  );
}
