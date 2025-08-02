import React, { useState, useEffect } from "react";
import LinkCard from "./LinkCard";
import Masonry from "react-masonry-css";
import LoadingSpinner from "./components/LoadingSpinner.jsx";

export default function PublicBoardPage({ onLogin, onSignup, onBackToDashboard, isLoggedIn = false }) {
  const [publicBoards, setPublicBoards] = useState([]);
  const [loading, setLoading] = useState(true);

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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/boards/public`);
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

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading public boards..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e3efff] to-[#b3d0f7] flex flex-col">
      <div className="max-w-[1800px] mx-auto w-full">
        <header className="flex flex-row justify-between items-center p-4 sm:p-6 gap-2 sm:gap-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">LinkBoard</h1>
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
          <div className="bg-white bg-opacity-60 rounded-xl sm:rounded-2xl shadow-xl w-full h-[calc(100vh-120px)] sm:h-[calc(100vh-115px)] max-h-full sm:max-h-[900px] flex flex-col justify-start items-center p-1 sm:p-8 pt-4 overflow-y-auto">
            {publicBoards.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <h2 className="text-2xl font-bold text-gray-700 mb-4">No Public Boards Available</h2>
                <p className="text-gray-600 mb-6">Be the first to share your link board with the community!</p>
                <div className="flex gap-4">
                  {isLoggedIn ? (
                    <button className="btn btn-primary" onClick={onBackToDashboard}>
                      Go to Your Dashboard
                    </button>
                  ) : (
                    <>
                      <button className="btn btn-primary" onClick={onSignup}>
                        Create Your Board
                      </button>
                      <button className="btn btn-ghost" onClick={onLogin}>
                        Login to View Private Boards
                      </button>
                    </>
                  )}
                </div>
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
                  className="my-masonry-grid w-full mb-4 overflow-y-auto overflow-x-hidden"
                  columnClassName="my-masonry-grid_column"
                >
                  {publicBoards.map((board, idx) => (
                    <div key={board._id || idx} className="draggable-board relative">
                      <LinkCard
                        category={board.title}
                        links={board.links || []}
                        isReadOnly={true}
                        isPublic={true}
                        userEmail={board.userEmail}
                      />
                    </div>
                  ))}
                </Masonry>
                
                {/* Call to Action */}
                <div className="mt-auto self-center text-center">
                  {isLoggedIn ? (
                    <>
                      <div className="flex gap-4 justify-center">
                        <button className="btn btn-primary" onClick={onBackToDashboard}>
                          Go to Your Dashboard
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex gap-4 justify-center">
                        <button className="btn btn-primary" onClick={onSignup}>
                          Create Your Board
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
} 