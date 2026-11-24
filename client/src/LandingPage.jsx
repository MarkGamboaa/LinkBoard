import BrandLogo from "./BrandLogo";
import LinkCard from "./LinkCard";

// Sample content only: shown to explain the product, never saved anywhere.
const sampleBoards = [
    {
        title: "Trip to Kyoto",
        state: "Public",
        links: [
            { title: "Japan Rail Pass", url: "https://japanrailpass.net/" },
            { title: "Fushimi Inari guide", url: "https://www.japan-guide.com/e/e3915.html" },
            { title: "Kyoto bus map", url: "https://www.kyoto-travel.jp/" },
        ],
    },
    {
        title: "Job hunt",
        state: "Shared",
        links: [
            { title: "LinkedIn Jobs", url: "https://www.linkedin.com/jobs/" },
            { title: "Portfolio", url: "https://github.com/" },
            { title: "Interview prep", url: "https://www.techinterviewhandbook.org/" },
        ],
    },
    {
        title: "Learning React",
        state: "Private",
        links: [
            { title: "React docs", url: "https://react.dev/" },
            { title: "MDN Web Docs", url: "https://developer.mozilla.org/" },
            { title: "Josh Comeau", url: "https://www.joshwcomeau.com/" },
        ],
    },
];

const pillStyles = {
    Public: "border-success text-success",
    Shared: "border-primary text-primary",
    Private: "border-hairline-strong text-slate",
};

const statePill = (state) => (
    <span className={`inline-flex min-h-7 items-center rounded-full border-[1.5px] px-2.5 text-xs font-bold ${pillStyles[state]}`}>{state}</span>
);

const sharingWays = [
    { title: "Make a board public", detail: "Anyone can browse it on Public boards, signed in or not." },
    { title: "Let people copy it", detail: "Visitors can copy a public board into their own account and make it theirs." },
    { title: "Invite collaborators", detail: "Send an invite link; everyone who joins edits the same board with you." },
];

export default function LandingPage({ onSignup, onLogin, onPublic }) {
    return (
        <div className="min-h-screen">
            {/* The notebook's cover: nav and the label with the hook sit on the indigo field. */}
            <section className="cover-band px-4 pb-40 sm:px-10 sm:pb-44">
                <header className="mx-auto flex max-w-[1360px] items-center justify-between py-4">
                    <BrandLogo markClassName="h-9 w-9" textClassName="text-2xl sm:text-3xl" />
                    <nav className="flex items-center gap-2" aria-label="Account">
                        <button type="button" className="btn btn-ghost" onClick={onLogin}>Log in</button>
                        <button type="button" className="btn border-0 bg-white font-bold text-primary shadow-none hover:bg-white/90" onClick={onSignup}>Sign up</button>
                    </nav>
                </header>

                <div className="relative mx-auto mt-6 max-w-3xl rounded-[18px] bg-white px-6 py-10 text-center text-base-content shadow-[0_18px_40px_-18px_rgb(10_10_60/0.55)] sm:mt-10 sm:px-12">
                    {/* Dashed inset edge: the label stuck on the cover. */}
                    <span aria-hidden="true" className="pointer-events-none absolute inset-2.5 rounded-xl border-[1.5px] border-dashed border-hairline-strong" />
                    <h1 className="relative text-[2.5rem] font-black leading-[1.06] tracking-[-0.035em] text-balance sm:text-5xl lg:text-[3.5rem]">
                        Every link worth keeping, on a board worth sharing.
                    </h1>
                    <p className="relative mx-auto mt-5 max-w-xl text-lg leading-relaxed text-slate">
                        Group links into boards, find any of them by search, and share a board publicly, as a copy, or with people who can edit it with you.
                    </p>
                    <div className="relative mt-7 flex flex-wrap items-center justify-center gap-3">
                        <button type="button" className="btn btn-primary btn-lg font-bold" onClick={onSignup}>Create your first board</button>
                        <button type="button" className="btn btn-lg border-0 bg-transparent font-bold text-primary shadow-none hover:bg-surface" onClick={onPublic}>Browse public boards</button>
                    </div>
                </div>
            </section>

            {/* The sheets inside the cover, overlapping its bottom edge. */}
            {/* relative z-10: the cover's full-bleed clip-path makes its own layer, which would otherwise paint over these. */}
            <section className="relative z-10 -mt-28 px-4 sm:-mt-32 sm:px-10" aria-labelledby="samples-caption">
                <div className="mx-auto grid max-w-[1188px] grid-cols-1 items-start gap-4 md:grid-cols-3 md:gap-5">
                    {sampleBoards.map((board) => (
                        <LinkCard key={board.title} category={board.title} links={board.links} isReadOnly className="w-full" headerAction={statePill(board.state)} />
                    ))}
                </div>
                <p id="samples-caption" className="mt-4 text-center text-sm text-steel">Sample boards. Yours start empty or from a template.</p>
            </section>

            {/* Below the fold: the three real ways to share, set as one ruled sheet. */}
            <section className="px-4 pb-20 pt-16 sm:px-10" aria-labelledby="sharing-title">
                <div className="sheet mx-auto max-w-3xl">
                    <h2 id="sharing-title" className="px-6 pb-4 pt-6 text-2xl font-extrabold tracking-[-0.02em] sm:px-8 sm:text-3xl">Three ways to share a board</h2>
                    <ul>
                        {sharingWays.map((way, index) => (
                            <li key={way.title} className="flex items-baseline gap-4 border-t border-hairline px-6 py-4 sm:px-8">
                                <span aria-hidden="true" className="w-6 shrink-0 text-2xl font-light tabular-nums text-blue">{index + 1}</span>
                                <span className="min-w-0">
                                    <span className="block font-bold text-base-content">{way.title}</span>
                                    <span className="block text-slate">{way.detail}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                    <button type="button" onClick={onSignup} className="flex w-full items-center gap-2 border-t border-hairline px-6 py-4 text-left font-bold text-primary transition-colors hover:bg-surface sm:px-8">
                        <span aria-hidden="true">+</span> Create your first board
                    </button>
                </div>
            </section>
        </div>
    );
}
