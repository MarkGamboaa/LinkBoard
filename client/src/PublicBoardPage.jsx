import React, { useState, useEffect } from "react";
import BrandLogo from "./BrandLogo";
import Masonry from "react-masonry-css";
import { boardAreaWidth, masonryColumns } from "./utils/masonry";
import LinkCard from "./LinkCard";
import LoadingSpinner from "./components/LoadingSpinner.jsx";
import { apiFetch, auth } from "./firebase";
import { getApiUrl } from "./utils/api";

export default function PublicBoardPage({ onLogin, onSignup, onBackToDashboard, onRequireLoginToCopy, isLoggedIn = false }) {
  const [publicBoards, setPublicBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copyingBoardId, setCopyingBoardId] = useState(null);
  const [copiedBoardIds, setCopiedBoardIds] = useState(() => new Set());

  // Fetch public boards
  useEffect(() => {
    fetchPublicBoards();
  }, []);


  const fetchPublicBoards = async () => {
    try {
      const headers = {};
      if (auth.currentUser) {
        headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
      }
      const response = await fetch(getApiUrl('/api/boards/public'), { headers, cache: 'no-store' });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setPublicBoards(data);
    } catch (error) {
      console.error('Error fetching public boards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUseBoard = async (board) => {
    if (!isLoggedIn) {
      onRequireLoginToCopy?.(board._id);
      return;
    }
    if (copyingBoardId) return;

    setCopyingBoardId(board._id);
    try {
      const response = await apiFetch(`/api/boards/${encodeURIComponent(board._id)}/copy`, { method: 'POST' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const routeMissing = response.status === 404 && String(result.message || '').startsWith('Route POST:');
        throw new Error(routeMissing
          ? 'The API server does not have the board-copy route yet. Restart or redeploy the server, then try again.'
          : result.error || result.message || 'Could not copy this board. Please try again.');
      }
      setCopiedBoardIds((current) => new Set(current).add(board._id));
      if (result.title !== board.title) {
        const renameResponse = await apiFetch(`/api/boards/${encodeURIComponent(result._id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: board.title }),
        });
        if (!renameResponse.ok) {
          window.showToast?.(`Board copied, but could not remove “(copy)” from its title.`, 'error');
          return;
        }
      }
      window.showToast?.(`Copied as “${board.title}” to your private boards.`, 'success');
    } catch (error) {
      window.showToast?.(error.message || 'Could not copy this board. Please try again.', 'error');
    } finally {
      setCopyingBoardId(null);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading public boards…" />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="max-w-[1800px] mx-auto w-full">
        <header className="cover-band flex items-center justify-between gap-2 px-4 py-3 sm:px-10 sm:py-4">
          <BrandLogo />
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Account">
            {!isLoggedIn && (
              <>
                <button type="button" className="btn btn-sm btn-ghost" onClick={onLogin}>Log in</button>
                <button type="button" className="btn btn-sm border-0 bg-white font-bold text-primary shadow-none hover:bg-white/90" onClick={onSignup}>Sign up</button>
              </>
            )}
          </nav>
        </header>

        {/* Back sits under the logo, aligned with it; it returns to the dashboard when signed in, otherwise to the landing page. */}
        {/* Three columns keep the heading centred on the page while sharing a row with Back. */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pt-4 sm:px-10">
          <button type="button" className="btn btn-sm -ml-3 justify-self-start border-0 bg-transparent font-semibold text-primary shadow-none hover:bg-surface" onClick={onBackToDashboard}>
            <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            {isLoggedIn ? 'Back to dashboard' : 'Back'}
          </button>
          {publicBoards.length > 0 && (
            <h1 className="text-center text-2xl font-bold tracking-[-0.01em] text-charcoal sm:text-3xl">Discover Public Link Boards</h1>
          )}
        </div>
        <main className="flex-1 flex flex-col items-center justify-start px-2 sm:px-6">
          <div className="flex w-full flex-col items-center p-1 pb-12 pt-4 sm:p-8">
            {publicBoards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <h1 className="text-2xl font-bold text-charcoal mb-4">No Public Boards Available</h1>
                <p className="text-slate mb-6">Be the first to share your link board with the community!</p>
                {!isLoggedIn && (
                  <div className="flex gap-4">
                    <button className="btn btn-primary" onClick={onSignup}>Create Your Board</button>
                    <button className="btn btn-ghost" onClick={onLogin}>Login to View Private Boards</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Public Boards List */}
                <div className="mx-auto w-full" style={{ maxWidth: boardAreaWidth(publicBoards.length) }}>
                <Masonry breakpointCols={masonryColumns(publicBoards.length)} className="board-grid mb-4" columnClassName="board-grid-column">
                  {publicBoards.map((board, idx) => (
                    <div key={board._id || idx} className="draggable-board relative">
                      <LinkCard
                        category={board.title}
                        links={board.links || []}
                        isReadOnly={true}
                        className="w-full"
                        isPublic={true}
                        ownerLabel={board.ownerNickname}
                        headerAction={board.isOwner ? (
                          <span className="inline-flex items-center rounded-full bg-base-200 px-3 py-1 text-xs font-medium text-slate">
                            Your board
                          </span>
                        ) : (
                          <button
                            type="button"
                            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 p-0 text-[0px] leading-none align-middle transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${copiedBoardIds.has(board._id) ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary hover:bg-primary/15'}`}
                            onClick={() => handleUseBoard(board)}
                            disabled={copyingBoardId !== null || copiedBoardIds.has(board._id)}
                            title={copyingBoardId === board._id ? 'Copying board' : copiedBoardIds.has(board._id) ? 'Board added to your boards' : isLoggedIn ? 'Copy this board to your boards' : 'Sign in to copy this board'}
                            aria-label={copyingBoardId === board._id ? 'Copying board' : copiedBoardIds.has(board._id) ? 'Board added to your boards' : isLoggedIn ? 'Copy this board to your boards' : 'Sign in to copy this board'}
                          >
                            {copyingBoardId === board._id ? (
                              <span className="loading loading-spinner loading-xs" aria-hidden="true" />
                            ) : copiedBoardIds.has(board._id) ? (
                              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" />
                              </svg>
                            ) : (
                              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                                <rect x="8" y="8" width="12" height="12" rx="2" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
                              </svg>
                            )}
                            {copyingBoardId === board._id
                              ? 'Copying…'
                              : copiedBoardIds.has(board._id)
                                ? 'Added to your boards'
                                : isLoggedIn ? 'Use this board' : 'Sign in to use this board'}
                          </button>
                        )}
                      />
                    </div>
                  ))}
                </Masonry>
                </div>
                
                {/* Call to Action */}
                {!isLoggedIn && (
                  <div className="mt-auto self-center text-center">
                    <button className="btn btn-primary" onClick={onSignup}>Create Your Board</button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
