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
        state: "Private",
        sharedWith: 2,
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
    {
        title: "Weekend reading",
        state: "Private",
        links: [
            { title: "Longreads", url: "https://longreads.com/" },
            { title: "The Verge", url: "https://www.theverge.com/" },
            { title: "Aeon essays", url: "https://aeon.co/" },
        ],
    },
];

// Where each sample board lands: at the label's corners, offset from the label itself so each overlaps it
// by a fixed amount at any width. Below 1360px there's no room to scatter them on one screen, so they're hidden.
const scatter = [
    "min-[1360px]:absolute min-[1360px]:-left-[256px] min-[1360px]:-top-[150px] min-[1360px]:-rotate-6",
    "min-[1360px]:absolute min-[1360px]:-right-[256px] min-[1360px]:-top-[128px] min-[1360px]:rotate-[5deg]",
    "min-[1360px]:absolute min-[1360px]:-left-[240px] min-[1360px]:-bottom-[132px] min-[1360px]:rotate-[4deg]",
    "min-[1360px]:absolute min-[1360px]:-right-[250px] min-[1360px]:-bottom-[146px] min-[1360px]:-rotate-3",
];

const pillStyles = {
    Public: "border-success text-success",
    Private: "border-hairline-strong text-slate",
};

const statePill = (state) => (
    <span className={`inline-flex min-h-7 items-center rounded-full border-[1.5px] px-2.5 text-xs font-bold ${pillStyles[state]}`}>{state}</span>
);

export default function LandingPage({ onSignup, onLogin, onPublic }) {
    return (
        // The whole page is the notebook's indigo cover: nav, then the label with the hook amid scattered sample sheets.
        <div className="cover-band flex min-h-dvh flex-col px-4 sm:px-10 min-[1360px]:h-dvh min-[1360px]:overflow-hidden">
            <header className="mx-auto flex w-full max-w-[1360px] items-center justify-between py-4">
                <BrandLogo markClassName="h-9 w-9" textClassName="text-2xl sm:text-3xl" />
                <nav className="flex items-center gap-2" aria-label="Account">
                    <button type="button" className="btn btn-ghost" onClick={onLogin}>Log in</button>
                    <button type="button" className="btn border-0 bg-white font-bold text-primary shadow-none hover:bg-white/90" onClick={onSignup}>Sign up</button>
                </nav>
            </header>

            <main className="grid min-h-0 flex-1 place-items-center py-6">
                {/* The label is the anchor: sample boards are positioned against it, not the window. */}
                <div className="landing-stage relative mx-auto w-full max-w-3xl">
                    <div className="relative z-10 rounded-[18px] bg-white px-6 py-10 text-center text-base-content shadow-[0_24px_60px_-20px_rgb(10_10_60/0.6)] sm:px-12">
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

                    {/* Illustration only: inert keeps the sample links from being clicked, focused or tabbed to.
                        z-20 lays the boards over the label's corners, where it has no content. */}
                    <div inert aria-hidden="true" className="hidden min-[1360px]:contents">
                        {sampleBoards.map((board, index) => (
                            <div key={board.title} className={`relative z-20 w-full select-none min-[1360px]:w-[320px] ${scatter[index]}`}>
                                <LinkCard category={board.title} links={board.links} isReadOnly className="w-full" headerAction={statePill(board.state)} sharedWith={board.sharedWith} />
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
