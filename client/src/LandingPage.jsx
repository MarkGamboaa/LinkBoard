import BrandLogo from "./BrandLogo";

const previewBoards = [
    {
        title: "Social Media",
        links: [
            { title: "Facebook", url: "https://www.facebook.com/", color: "#4338ca", icon: "f" },
            { title: "Instagram", url: "https://www.instagram.com/", color: "#e1306c", icon: "◎" },
            { title: "YouTube", url: "https://www.youtube.com/", color: "#e62117", icon: "▶" },
        ],
    },
    {
        title: "UI/UX",
        links: [
            { title: "Figma Todo List Template", url: "https://www.figma.com/", color: "#181f29", icon: "F" },
        ],
    },
];

function PreviewBoard({ title, links }) {
    return (
        <div className="bg-white rounded-xl shadow-lg p-4 w-80 max-w-full flex flex-col items-center">
            <div className="w-full flex justify-between items-start mb-4">
                <span className="min-w-0 break-words text-lg font-bold text-blue-700">{title}</span>
                <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">Public</span>
            </div>
            <div className="flex flex-col gap-4 w-full mb-8">
                {links.map((link) => (
                    <div
                        key={link.title}
                        className="w-full overflow-hidden rounded-lg border border-black/15 px-3 py-2"
                        style={{ backgroundColor: link.color, color: "white" }}
                    >
                        <span className="flex items-center gap-2 truncate font-semibold">
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-white/20 text-[10px] font-bold" aria-hidden="true">{link.icon}</span>
                            <span className="truncate">{link.title}</span>
                        </span>
                        <span className="block truncate text-xs opacity-90">{link.url}</span>
                    </div>
                ))}
            </div>
            <button type="button" className="btn btn-primary min-h-0 h-10 rounded-full px-5" tabIndex={-1} aria-hidden="true">
                Add Link
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-4 w-4 shrink-0">
                    <path d="M12 5v14M5 12h14" />
                </svg>
            </button>
        </div>
    );
}

export default function LandingPage({ onSignup, onLogin, onPublic }) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#ffff] to-[#6ba3ec]">
            <div className="w-full max-w-[1600px] mx-auto">
                {/* Navbar */}
                <div className="navbar bg-transparent px-4 sm:px-8 pt-6 flex justify-between">
                    <a><BrandLogo markClassName="h-9 w-9" textClassName="text-3xl" /></a>
                    <div className="flex gap-2">
                        <button className="btn btn-ghost" onClick={onLogin}>Login</button>
                        <button className="btn btn-primary" onClick={onSignup}>Sign Up</button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex min-h-[calc(100vh-5rem)] flex-col lg:flex-row items-center justify-center px-4 py-8 sm:px-8 lg:px-24 gap-10">
                    {/* Left Section */}
                    <div className="w-full max-w-xl flex flex-col items-center lg:items-start text-center lg:text-left">
                        <h1 className="text-5xl md:text-6xl font-black leading-tight mb-4">
                            With <BrandLogo showMark={false} textClassName="text-[1em]" weightClassName="font-black" /><br />Increase your<br />Productivity
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
                    <div className="flex flex-col gap-4 mt-8 lg:mt-0 lg:ml-12 w-full lg:w-auto items-center">
                        {previewBoards.map((board, index) => (
                            <div key={board.title} className={index === 1 ? "lg:ml-12" : ""}>
                                <PreviewBoard {...board} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
