import React, { useState, useEffect } from "react";
import LinkCard from "./LinkCard";
import Masonry from "react-masonry-css";
import LoadingSpinner from "./components/LoadingSpinner.jsx";
import { apiFetch } from "./firebase";
import { getApiUrl } from "./utils/api";

export default function PublicBoardPage({ onLogin, onSignup, onBackToDashboard, onRequireLoginToCopy, isLoggedIn = false }) {
  const [publicBoards, setPublicBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copyingBoardId, setCopyingBoardId] = useState(null);
  const [copiedBoardIds, setCopiedBoardIds] = useState(() => new Set());

  // Dynamically set columns based on number of boards
  const maxCols = 4;
  const colCount = Math.min(publicBoards.length, maxCols) || 1;
  const breakpointColumnsObj = {
    default: colCount,
    1400: Math.min(publicBoards.length, 3) || 1,
    1100: Math.min(publicBoards.length, 2) || 1,
    768: 1
  };

  // Fetch public boards
  useEffect(() => {
    fetchPublicBoards();
  }, []);

  const fetchPublicBoards = async () => {
    try {
      console.log('Fetching public boards...');
      const response = await fetch(getApiUrl('/api/boards/public'), { cache: 'no-store' });
      console.log('Fetch public boards response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched public boards data:', data);
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
    return <LoadingSpinner fullScreen text="Loading public boards..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e3efff] to-[#b3d0f7] flex flex-col">
      <div className="max-w-[1800px] mx-auto w-full">
        <header className="flex flex-row justify-between items-center p-4 sm:p-6 gap-2 sm:gap-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary font-logo">LinkBoard</h1>
          {/* Desktop menu */}
          <div className="hidden sm:flex gap-4 items-center">
            {isLoggedIn ? (
              <button className="btn btn-sm btn-ghost" onClick={onBackToDashboard}>
                <svg className="inline-block w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Back to Dashboard
              </button>
            ) : (
              <>
                <button className="btn btn-sm btn-ghost" onClick={onLogin}>
                  Login
                </button>
                <button className="btn btn-sm btn-white shadow" onClick={onSignup}>
                  Sign Up
                </button>
              </>
            )}
          </div>
          {/* Mobile menu */}
          <div className="sm:hidden flex items-center gap-2">
            {isLoggedIn ? (
              <button className="btn btn-sm btn-ghost" onClick={onBackToDashboard}>
                <svg className="inline-block w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Back
              </button>
            ) : (
              <>
                <button className="btn btn-sm btn-ghost" onClick={onLogin}>
                  Login
                </button>
                <button className="btn btn-sm btn-white shadow" onClick={onSignup}>
                  Sign Up
                </button>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-start px-2 sm:px-6">
          <div className="w-full h-[calc(100vh-120px)] sm:h-[calc(100vh-115px)] max-h-full sm:max-h-[900px] flex flex-col justify-start items-center p-1 sm:p-8 pt-4 overflow-y-auto">
            {publicBoards.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <h2 className="text-2xl font-bold text-gray-700 mb-4">No Public Boards Available</h2>
                <p className="text-gray-600 mb-6">Be the first to share your link board with the community!</p>
                {!isLoggedIn && (
                  <div className="flex gap-4">
                    <button className="btn btn-primary" onClick={onSignup}>Create Your Board</button>
                    <button className="btn btn-ghost" onClick={onLogin}>Login to View Private Boards</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="w-full mb-6 text-center">
                  <h2 className="text-xl font-semibold text-gray-700 mb-2">
                    Discover Public Link Boards
                  </h2>
                </div>
                
                {/* Public Boards List */}
                <Masonry
                  breakpointCols={breakpointColumnsObj}
                  className="public-masonry-grid w-full mb-4 overflow-y-auto overflow-x-hidden"
                  columnClassName="public-masonry-grid_column"
                >
                  {publicBoards.map((board, idx) => (
                    <div key={board._id || idx} className="draggable-board relative">
                      <LinkCard
                        category={board.title}
                        links={board.links || []}
                        isReadOnly={true}
                        isPublic={true}
                        ownerLabel={board.ownerNickname}
                        headerAction={(
                          <button
                            type="button"
                            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 p-0 text-[0px] leading-none align-middle transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${copiedBoardIds.has(board._id) ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
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
