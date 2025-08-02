export default function LandingPage({ onSignup, onLogin, onPublic }) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#ffff] to-[#6ba3ec]">
            <div className="w-full max-w-[1600px] mx-auto">
                {/* Navbar */}
                <div className="navbar bg-transparent px-4 sm:px-8 pt-6 flex justify-between">
                    <a className="text-3xl font-bold text-primary">LinkBoard</a>
                    <div className="flex gap-2">
                        <button className="btn btn-ghost" onClick={onPublic}>Public Boards</button>
                        <button className="btn btn-ghost" onClick={onLogin}>Login</button>
                        <button className="btn btn-primary" onClick={onSignup}>Sign Up</button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex flex-col lg:flex-row items-center lg:items-center justify-around px-4 sm:px-8 lg:px-24 mt-12
                gap-10">
                    {/* Left Section */}
                    <div className="w-full max-w-xl flex flex-col items-center lg:items-start text-center lg:text-left">
                        <h1 className="text-5xl md:text-6xl font-black leading-tight mb-4">
                            With <span className="text-primary">LinkBoard</span><br />Increase your<br />Productivity
                        </h1>
                        <div className="w-40 md:w-72 h-2 bg-transparent mb-6">
                            <svg width="100%" height="16" viewBox="0 0 320 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4 12C44 4 276 4 316 12" stroke="#1756E5" strokeWidth="4" strokeLinecap="round"/>
                            </svg>
                        </div>
                        <p className="mb-8 text-lg text-gray-700">
                            Create customizable boards and organize your favorite tools, articles, videos, and anything else worth saving all in one clean dashboard.
                        </p>
                        <div className="flex gap-4">
                            <button className="btn btn-primary text-lg px-8" onClick={onSignup}>Get Started</button>
                            <button className="btn btn-ghost text-lg flex items-center gap-2" onClick={onPublic}>
                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16"/></svg>
                                View Public Boards
                            </button>
                        </div>
                    </div>

                    {/* Right Section */}
                    <div className="flex flex-col gap-6 mt-8 lg:mt-0 lg:ml-12 w-full lg:w-auto items-center">
                        
                        {/* Social Media Card */}
                        <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-xs">
                            <div className="flex justify-between items-center mb-4">
                                <span className="font-bold text-lg text-primary">Social Media</span>
                                <button className="btn btn-ghost btn-xs text-error"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg></button>
                            </div>
                            <div className="flex flex-col gap-3 mb-4">
                                <button className="btn bg-primary text-white font-bold">FaceBook</button>
                                <button className="btn bg-neutral text-white font-bold">GitHub</button>
                                <button className="btn bg-error text-white font-bold">Youtube</button>
                            </div>
                            <div className="flex justify-center">
                                <button className="btn btn-primary items-center">Add Link <span className="ml-1">+</span></button>
                            </div>
                        </div>

                        {/* UI/UX Card */}
                        <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-xs lg:ml-12">
                            <div className="flex justify-between items-center mb-4">
                                <span className="font-bold text-lg text-primary">UI/UX</span>
                                <button className="btn btn-ghost btn-xs text-error"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg></button>
                            </div>
                            <div className="flex flex-col gap-3 mb-4">
                                <div className="btn bg-neutral text-white font-bold flex flex-col items-start h-auto py-2 px-4 text-left">
                                    <span>Figma Todo List Template</span>
                                    <span className="text-xs font-normal text-gray-200">www.figma.com/community/fi...</span>
                                </div>
                            </div>
                            <div className="flex justify-center">
                                <button className="btn btn-primary items-center">Add Link <span className="ml-1">+</span></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}