import React, { useState } from "react";

export default function DashboardPage({ onLogout, user }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e3efff] to-[#b3d0f7] flex flex-col">
      <header className="flex flex-row justify-between items-center p-4 sm:p-6 gap-2 sm:gap-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">LinkBoard</h1>
        {/* Desktop menu */}
        <div className="hidden sm:flex gap-4 items-center">
          <span className="btn btn-sm btn-ghost">
            <svg className="inline-block w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Hi, {user?.displayName || user?.email?.split("@") [0] || "User"}
          </span>
          <button className="btn btn-sm btn-white shadow" onClick={onLogout}>
            Logout <span className="ml-1">→</span>
          </button>
        </div>
        {/* Mobile menu */}
        <div className="sm:hidden flex items-center relative">
          <button className="btn btn-sm btn-ghost" onClick={() => setMenuOpen(v => !v)} aria-label="Open menu">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 w-40 bg-white rounded-lg shadow-lg z-50 flex flex-col border border-gray-200">
              <span className="px-4 py-2 flex items-center gap-2">
                <svg className="inline-block w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {user?.displayName || user?.email?.split("@") [0] || "User"}
              </span>
              <button className="px-4 py-2 text-left hover:bg-gray-100" onClick={onLogout}>Logout <span className="ml-1">→</span></button>
            </div>
          )}
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-start">
        <div className="
        bg-white bg-opacity-60 rounded-xl sm:rounded-2xl shadow-xl w-full sm:w-[95vw] h-[calc(100vh-120px)] sm:h-[calc(100vh-115px)] max-w-full sm:max-w-[1800px] max-h-full sm:max-h-[900px] flex flex-col justify-center items-center p-2 sm:p-8 mt-0 mx-2 sm:mx-0">
          {/* Placeholder for boards */}
          <button className="btn btn-primary mt-auto self-end flex items-center gap-2">
            Add Board <span className="text-xl">＋</span>
          </button>
        </div>
      </main>
    </div>
  );
}
