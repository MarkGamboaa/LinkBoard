import React, { useState, useEffect } from "react";
import LinkCard from "./LinkCard";
import Masonry from "react-masonry-css";
import { getUserProfileFromFirestore } from "./firebase";

export default function DashboardPage({ onLogout, user: initialUser, onProfile }) {
  const [user, setUser] = useState(initialUser);
  const [userProfile, setUserProfile] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [boards, setBoards] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [addLinkModal, setAddLinkModal] = useState({ open: false, boardIdx: null });
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkColor, setNewLinkColor] = useState("#181f29");
  const [loading, setLoading] = useState(true);
  const [draggedBoardIndex, setDraggedBoardIndex] = useState(null);
  const [slidingBoards, setSlidingBoards] = useState(new Set());

  // Dynamically set columns based on number of boards
  const maxCols = 4;
  const colCount = Math.min(boards.length, maxCols) || 1;
  const breakpointColumnsObj = {
    default: colCount,
    1280: Math.min(boards.length, 4) || 1,
    1024: Math.min(boards.length, 3) || 1,
    768: Math.min(boards.length, 2) || 1,
    500: 1
  };

  // Fetch user profile and boards
  useEffect(() => {
    fetchUserProfile();
    fetchBoards();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const result = await getUserProfileFromFirestore(user.uid);
      if (result.success) {
        setUserProfile(result.data);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  // Helper function to get user's first name
  const getUserFirstName = () => {
    if (userProfile?.firstName) {
      return userProfile.firstName;
    }
    if (user?.displayName) {
      return user.displayName.split(' ')[0];
    }
    return 'User';
  };

  const fetchBoards = async () => {
    try {
      console.log('Fetching boards for user:', user.uid);
      const response = await fetch(`http://localhost:3001/api/boards?userId=${user.uid}`);
      console.log('Fetch boards response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched boards data:', data);
      setBoards(data);
    } catch (error) {
      console.error('Error fetching boards:', error);
    } finally {
      setLoading(false);
    }
  };

  // Board drag and drop handlers
  const handleBoardDragStart = (e, index) => {
    setDraggedBoardIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
  };

  const handleBoardDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleBoardDrop = async (e, dropIndex) => {
    e.preventDefault();
    if (draggedBoardIndex === null || draggedBoardIndex === dropIndex) {
      setDraggedBoardIndex(null);
      return;
    }

    const newBoards = [...boards];
    const draggedBoard = newBoards[draggedBoardIndex];
    newBoards.splice(draggedBoardIndex, 1);
    newBoards.splice(dropIndex, 0, draggedBoard);
    
    // Add sliding animation to all affected boards
    const affectedIndices = new Set();
    if (draggedBoardIndex < dropIndex) {
      // Moving forward - animate boards in between
      for (let i = draggedBoardIndex; i <= dropIndex; i++) {
        affectedIndices.add(i);
      }
    } else {
      // Moving backward - animate boards in between
      for (let i = dropIndex; i <= draggedBoardIndex; i++) {
        affectedIndices.add(i);
      }
    }
    
    setSlidingBoards(affectedIndices);
    setBoards(newBoards);
    setDraggedBoardIndex(null);

    // Remove sliding animation after animation completes
    setTimeout(() => {
      setSlidingBoards(new Set());
    }, 400);

    // Update order in backend
    try {
      const updatePromises = newBoards.map((board, index) => 
        fetch(`http://localhost:3001/api/boards/${board._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...board, order: index })
        })
      );
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error updating board order:', error);
    }
  };

  // Delete board handler
  const handleDeleteBoard = async (idx) => {
    try {
      const boardToDelete = boards[idx];
      await fetch(`http://localhost:3001/api/boards/${boardToDelete._id}`, {
        method: 'DELETE'
      });
      setBoards(boards => boards.filter((_, i) => i !== idx));
    } catch (error) {
      console.error('Error deleting board:', error);
    }
  };

  // Add link handler
  const handleAddLink = (idx) => {
    setAddLinkModal({ open: true, boardIdx: idx });
    setNewLinkTitle("");
    setNewLinkUrl("");
    setNewLinkColor("#181f29");
  };

  // Confirm add link
  const handleConfirmAddLink = async () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) return;
    
    try {
      console.log('Creating board with title:', newLinkTitle);
      let url = newLinkUrl.trim();
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }

      const boardToUpdate = boards[addLinkModal.boardIdx];
      const updatedLinks = [...(boardToUpdate.links || []), { title: newLinkTitle, url, color: newLinkColor }];
      
      const updateData = { ...boardToUpdate, links: updatedLinks };
      console.log('Sending board update data:', updateData);
      
      const response = await fetch(`http://localhost:3001/api/boards/${boardToUpdate._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const updatedBoard = await response.json();
        console.log('Created board:', updatedBoard);
        setBoards(boards => boards.map((board, i) => 
          i === addLinkModal.boardIdx ? updatedBoard : board
        ));
      } else {
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error adding link:', error);
    } finally {
      setAddLinkModal({ open: false, boardIdx: null });
      setNewLinkTitle("");
      setNewLinkUrl("");
      setNewLinkColor("#181f29");
    }
  };

  // Delete link handler
  const handleDeleteLink = async (boardIdx, linkIdx) => {
    try {
      const boardToUpdate = boards[boardIdx];
      const updatedLinks = boardToUpdate.links.filter((_, lIdx) => lIdx !== linkIdx);
      
      const response = await fetch(`http://localhost:3001/api/boards/${boardToUpdate._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...boardToUpdate, links: updatedLinks })
      });

      if (response.ok) {
        const updatedBoard = await response.json();
        setBoards(boards => boards.map((board, i) => 
          i === boardIdx ? updatedBoard : board
        ));
      }
    } catch (error) {
      console.error('Error deleting link:', error);
    }
  };

  // Reorder links handler
  const handleReorderLinks = async (boardIdx, newLinks) => {
    try {
      const boardToUpdate = boards[boardIdx];
      
      const response = await fetch(`http://localhost:3001/api/boards/${boardToUpdate._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...boardToUpdate, links: newLinks })
      });

      if (response.ok) {
        const updatedBoard = await response.json();
        setBoards(boards => boards.map((board, i) => 
          i === boardIdx ? updatedBoard : board
        ));
      }
    } catch (error) {
      console.error('Error reordering links:', error);
    }
  };

  // Add board handler
  const handleAddBoard = async () => {
    if (!newBoardTitle.trim()) return;
    
    try {
      console.log('Creating board with title:', newBoardTitle);
      const boardData = { 
        title: newBoardTitle, 
        links: [],
        userId: user.uid,
        userEmail: user.email
      };
      console.log('Sending board data:', boardData);
      
      const response = await fetch('http://localhost:3001/api/boards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(boardData)
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const newBoard = await response.json();
        console.log('Created board:', newBoard);
        setBoards([...boards, newBoard]);
        setNewBoardTitle("");
        setModalOpen(false);
      } else {
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error adding board:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#e3efff] to-[#b3d0f7] flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e3efff] to-[#b3d0f7] flex flex-col">
      <header className="flex flex-row justify-between items-center p-4 sm:p-6 gap-2 sm:gap-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">LinkBoard</h1>
        {/* Desktop menu */}
        <div className="hidden sm:flex gap-4 items-center">
          <button className="btn btn-sm btn-ghost" onClick={onProfile}>
            <svg className="inline-block w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Hi, {getUserFirstName()}
          </button>
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
              <button className="px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2" onClick={onProfile}>
                <svg className="inline-block w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Hi, {getUserFirstName()}
              </button>
              <button className="px-4 py-2 text-left hover:bg-gray-100" onClick={onLogout}>Logout <span className="ml-1">→</span></button>
            </div>
          )}
        </div>
      </header>
      {/* Render ProfilePage if needed, else main dashboard */}
      {user && user.showProfile ? (
        <ProfilePage user={user} onBack={() => setUser(u => ({ ...u, showProfile: false }))} onUserUpdate={setUser} />
      ) : (
      <main className="flex-1 flex flex-col items-center justify-start">
        <div className="bg-white bg-opacity-60 rounded-xl sm:rounded-2xl shadow-xl w-full sm:w-[95vw] h-[calc(100vh-120px)] sm:h-[calc(100vh-115px)] max-w-full sm:max-w-[1800px] max-h-full sm:max-h-[900px] flex flex-col justify-center items-center p-2 sm:p-8 mt-0 mx-2 sm:mx-0 overflow-hidden">
          {/* Boards List */}
                      <Masonry
              breakpointCols={breakpointColumnsObj}
              className="my-masonry-grid w-full mb-4 max-h-[80vh] overflow-y-auto overflow-x-hidden"
              columnClassName="my-masonry-grid_column"
            >
            {boards.map((board, idx) => (
              <div
                key={board._id || idx}
                draggable
                onDragStart={(e) => handleBoardDragStart(e, idx)}
                onDragOver={handleBoardDragOver}
                onDrop={(e) => handleBoardDrop(e, idx)}
                className={`draggable-board relative ${draggedBoardIndex === idx ? 'dragging' : ''} ${slidingBoards.has(idx) ? 'sliding' : ''}`}
              >
                <LinkCard
                  category={board.title}
                  links={board.links || []}
                  onDelete={() => handleDeleteBoard(idx)}
                  onAddLink={() => handleAddLink(idx)}
                  onDeleteLink={linkIdx => handleDeleteLink(idx, linkIdx)}
                  onReorderLinks={(newLinks) => handleReorderLinks(idx, newLinks)}
                />
              </div>
            ))}
          </Masonry>
          {/* Add Board Button */}
          <button
            className="btn btn-primary mt-auto self-end flex items-center gap-2"
            onClick={() => setModalOpen(true)}
          >
            Add Board <span className="text-xl">＋</span>
          </button>
        </div>
        {/* Modal for new board */}
        {modalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-50">
            <div className="bg-white rounded-lg p-6 shadow-lg flex flex-col gap-4 min-w-[300px]">
              <h2 className="text-lg font-bold">Create New Board</h2>
              <input
                className="input input-bordered bg-white/60 backdrop-blur placeholder:text-gray-500"
                placeholder="Board Title"
                value={newBoardTitle}
                onChange={e => setNewBoardTitle(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={handleAddBoard}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Modal for adding a link */}
        {addLinkModal.open && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-50">
            <div className="bg-white rounded-lg p-6 shadow-lg flex flex-col gap-4 min-w-[300px]">
              <h2 className="text-lg font-bold">Add Link</h2>
              <input
                className="input input-bordered bg-white/60 backdrop-blur placeholder:text-gray-500"
                placeholder="Link Title"
                value={newLinkTitle}
                onChange={e => setNewLinkTitle(e.target.value)}
                autoFocus
              />
              <input
                className="input input-bordered bg-white/60 backdrop-blur placeholder:text-gray-500"
                placeholder="URL (www.example.com)"
                value={newLinkUrl}
                onChange={e => setNewLinkUrl(e.target.value)}
              />
              <div className="flex flex-col gap-2">
                <label className="font-medium text-sm">Pick Link Color:</label>
                <input
                  type="color"
                  value={newLinkColor}
                  onChange={e => setNewLinkColor(e.target.value)}
                  className="w-12 h-8 p-0 border-none bg-transparent cursor-pointer"
                  style={{ background: 'none' }}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button className="btn btn-ghost" onClick={() => setAddLinkModal({ open: false, boardIdx: null })}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={handleConfirmAddLink}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      )}
    </div>
  );
}
  
