import BrandLogo from "./BrandLogo";
import LinkCard from "./LinkCard";

const previewBoards = [
    {
        title: "Social Media",
        links: [
            { title: "Facebook", url: "https://www.facebook.com/" },
            { title: "Instagram", url: "https://www.instagram.com/" },
            { title: "YouTube", url: "https://www.youtube.com/" },
        ],
    },
    {
        title: "UI/UX",
        links: [
            { title: "Figma Todo List Template", url: "https://www.figma.com/" },
        ],
    },
];

const publicBadge = <span className="rounded-md border border-success/30 bg-success/10 px-2 py-0.5 text-xs font-medium text-success">Public</span>;

export default function LandingPage({ onSignup, onLogin, onPublic }) {
    return (
        <div className="min-h-screen">
            <div className="w-full max-w-[1600px] mx-auto">
                {/* Navbar */}
                <div className="navbar bg-transparent px-4 sm:px-8 pt-6 flex justify-between">
                    <BrandLogo markClassName="h-9 w-9" textClassName="text-3xl" />
                    <div className="flex gap-2">
                        <button className="btn btn-ghost" onClick={onLogin}>Login</button>
                        <button className="btn btn-primary" onClick={onSignup}>Sign Up</button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex min-h-[calc(100vh-5rem)] flex-col lg:flex-row items-center justify-center px-4 py-8 sm:px-8 lg:px-24 gap-10">
                    {/* Left Section */}
                    <div className="w-full max-w-xl flex flex-col items-center lg:items-start text-center lg:text-left">
                        <h1 className="mb-6 text-5xl font-bold leading-[1.08] tracking-[-0.03em] text-balance md:text-6xl">
                            With <span className="text-primary">LinkBoard</span><br />Increase your<br />Productivity
                        </h1>
                        <p className="mb-8 max-w-[52ch] text-lg text-charcoal">
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
                                <LinkCard category={board.title} links={board.links} isReadOnly headerAction={publicBadge} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
