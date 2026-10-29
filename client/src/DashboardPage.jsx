import React, { useState, useEffect, useRef } from "react";
import BrandLogo from "./BrandLogo";
import LinkCard from "./LinkCard";
import Masonry from "react-masonry-css";
import LoadingSpinner from "./components/LoadingSpinner.jsx";
import ProfilePage from "./ProfilePage.jsx";
import { apiFetch, getUserProfile } from "./firebase";
import { BOARD_TEMPLATES } from "./data/boardTemplates";
import { fetchLinkPreview } from "./utils/linkPreview";

const getTemplateLinkTextColor = (color) => {
  const hex = String(color || '#181f29').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return '#ffffff';
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;
  return brightness < 128 ? '#ffffff' : '#111827';
};

const removeGeneratedCopySuffix = async (board) => {
  const title = String(board?.title || '').replace(/\s+\(copy\)$/i, '').trim();
  if (!board?.isOwner || !title || title === board.title) return board;

  try {
    const response = await apiFetch(`/api/boards/${encodeURIComponent(board._id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Could not remove generated copy suffix from board ${board._id}:`, error);
    return board;
  }
};

export default function DashboardPage({ onLogout, user: initialUser, onProfile, onPublic, pendingBoardCopyId = null, onPendingBoardCopyHandled }) {
  const [user, setUser] = useState(initialUser);
  const [userProfile, setUserProfile] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [boards, setBoards] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [newBoardTemplateId, setNewBoardTemplateId] = useState('blank');
  const [createBoardError, setCreateBoardError] = useState("");
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [addLinkModal, setAddLinkModal] = useState({ open: false, boardIdx: null, linkIdx: null });
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkColor, setNewLinkColor] = useState("#181f29");
  const [newLinkTags, setNewLinkTags] = useState("");
  const [newLinkNote, setNewLinkNote] = useState("");
  const [addLinkError, setAddLinkError] = useState("");
  const [savingLink, setSavingLink] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteBoard, setInviteBoard] = useState(null);
  const [inviteLink, setInviteLink] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteNotice, setInviteNotice] = useState(null);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [memberRemovalTarget, setMemberRemovalTarget] = useState(null);
  const [memberRemovalError, setMemberRemovalError] = useState('');
  const [removingMember, setRemovingMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [addingLinkLoading, setAddingLinkLoading] = useState(false);
  const [deletingLinkLoading, setDeletingLinkLoading] = useState(false);
  const [draggedBoardIndex, setDraggedBoardIndex] = useState(null);
  const [slidingBoards, setSlidingBoards] = useState(new Set());
  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const [editingBoardTitle, setEditingBoardTitle] = useState(false);
  const [boardTitleDraft, setBoardTitleDraft] = useState('');
  const [savingBoard, setSavingBoard] = useState(false);
  const [boardActionError, setBoardActionError] = useState('');
  const [boardDeleteTarget, setBoardDeleteTarget] = useState(null);
  const [boardDeleteError, setBoardDeleteError] = useState('');
  const [deletingBoard, setDeletingBoard] = useState(false);
  const [leaveBoardTarget, setLeaveBoardTarget] = useState(null);
  const [leaveBoardError, setLeaveBoardError] = useState('');
  const [leavingBoard, setLeavingBoard] = useState(false);
  const handledBoardCopies = useRef(new Set());
  const boardViewportRef = useRef(null);
  const [hasBoardOverflow, setHasBoardOverflow] = useState(false);
  const [hasScrolledBoards, setHasScrolledBoards] = useState(false);

  // Dynamically set columns based on number of boards
  const maxCols = 4;
  const colCount = Math.min(boards.length, maxCols) || 1;
  const breakpointColumnsObj = {
    default: colCount,
    1400: Math.min(boards.length, 3) || 1,
    1100: Math.min(boards.length, 2) || 1,
    768: 1
  };

  // Fetch user profile and boards
  useEffect(() => {
    fetchUserProfile();
    fetchBoards();
  }, []);

  useEffect(() => {
    if (!pendingBoardCopyId || loading || handledBoardCopies.current.has(pendingBoardCopyId)) return;
    handledBoardCopies.current.add(pendingBoardCopyId);
    onPendingBoardCopyHandled?.();

    const copyPendingBoard = async () => {
      try {
        const response = await apiFetch(`/api/boards/${encodeURIComponent(pendingBoardCopyId)}/copy`, { method: 'POST' });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Could not copy this board. Please try again.');
        const cleanedResult = await removeGeneratedCopySuffix(result);
        result.title = cleanedResult.title;
        setBoards((current) => [...current, cleanedResult]);
        window.showToast?.(`Copied as “${result.title}” to your private boards.`, 'success');
      } catch (error) {
        window.showToast?.(error.message || 'Could not copy this board. Please try again.', 'error');
      }
    };
    copyPendingBoard();
  }, [pendingBoardCopyId, loading]);

  const fetchUserProfile = async () => {
    try {
      const result = await getUserProfile();
      if (result.success) {
        setUserProfile(result.data);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  // Show the nickname in the dashboard greeting without exposing a real name.
  const getUserNickname = () => {
    return userProfile?.nickname || 'User';
  };

  const fetchBoards = async () => {
    try {
      console.log('Fetching boards for user:', user.uid);
      const response = await apiFetch('/api/boards');
      console.log('Fetch boards response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched boards data:', data);
      const cleanedBoards = await Promise.all(data.map(removeGeneratedCopySuffix));
      setBoards(cleanedBoards);
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
        apiFetch(`/api/boards/${board._id}`, {
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
  const handleDeleteBoard = async (boardToDelete) => {
    if (!boardToDelete) return;
    setDeletingBoard(true);
    setBoardDeleteError('');
    try {
      const response = await apiFetch(`/api/boards/${boardToDelete._id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Could not delete this board. Please try again.');
      setBoards((current) => current.filter((board) => board._id !== boardToDelete._id));
      setSelectedBoardId(null);
      setBoardDeleteTarget(null);
    } catch (error) {
      console.error('Error deleting board:', error);
      setBoardDeleteError(error.message || 'Could not delete this board.');
    } finally {
      setDeletingBoard(false);
    }
  };

  const handleLeaveBoard = async (boardToLeave) => {
    if (!boardToLeave) return;
    setLeavingBoard(true);
    setLeaveBoardError('');
    try {
      const response = await apiFetch(`/api/boards/${encodeURIComponent(boardToLeave._id)}/leave`, { method: 'DELETE' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const apiMessage = result.error || result.message;
        if (response.status === 404 && (apiMessage === 'Not Found' || /route .* not found/i.test(result.message || ''))) {
          throw new Error('The API server has not loaded the leave-board route yet. Restart or redeploy the server, then try again.');
        }
        throw new Error(apiMessage || 'Could not leave this board. Please try again.');
      }
      setBoards((current) => current.filter((board) => board._id !== boardToLeave._id));
      setSelectedBoardId(null);
      setLeaveBoardTarget(null);
      window.showToast?.(`You left “${boardToLeave.title}”.`, 'success');
    } catch (error) {
      setLeaveBoardError(error.message || 'Could not leave this board.');
    } finally {
      setLeavingBoard(false);
    }
  };

  const handleSaveBoardTitle = async (board) => {
    const title = boardTitleDraft.trim();
    if (!title) {
      setBoardActionError('Enter a board name.');
      return;
    }
    setSavingBoard(true);
    setBoardActionError('');
    try {
      const response = await apiFetch(`/api/boards/${board._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not update this board.');
      setBoards((current) => current.map((item) => item._id === board._id ? { ...result, ownerName: result.ownerName || item.ownerName } : item));
      setEditingBoardTitle(false);
    } catch (error) {
      setBoardActionError(error.message || 'Could not update this board.');
    } finally {
      setSavingBoard(false);
    }
  };

  // Add link handler
  const handleAddLink = (idx) => {
    setAddLinkModal({ open: true, boardIdx: idx, linkIdx: null });
    setNewLinkTitle("");
    setNewLinkUrl("");
    setNewLinkColor("#181f29");
    setNewLinkTags("");
    setNewLinkNote("");
    setAddLinkError("");
  };

  const handleEditLink = (boardIdx, linkIdx) => {
    const link = boards[boardIdx]?.links?.[linkIdx];
    if (!link) return;
    setAddLinkModal({ open: true, boardIdx, linkIdx });
    setNewLinkTitle(link.title || "");
    setNewLinkUrl(link.url || "");
    setNewLinkColor(link.color || "#181f29");
    setNewLinkTags((link.tags || []).join(', '));
    setNewLinkNote(link.note || "");
    setAddLinkError("");
  };

  // Confirm add link
  const handleConfirmAddLink = async () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) {
      setAddLinkError("Enter both a link title and URL.");
      return;
    }

    setSavingLink(true);
    setAddingLinkLoading(true);
    setAddLinkError("");
    try {
      let url = newLinkUrl.trim();
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }

      const boardToUpdate = boards[addLinkModal.boardIdx];
      if (!boardToUpdate) throw new Error('Could not find this board. Refresh the page and try again.');
      const links = [...(boardToUpdate.links || [])];
      const previousLink = addLinkModal.linkIdx === null ? null : links[addLinkModal.linkIdx];
      const preview = previousLink?.url === url ? {} : await fetchLinkPreview(url);
      const tags = [...new Set(newLinkTags.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
      const updatedLink = {
        ...(previousLink || {}),
        title: newLinkTitle.trim(),
        url,
        color: newLinkColor,
        tags,
        note: newLinkNote.trim(),
        ...(preview.siteTitle ? preview : previousLink?.url === url ? {} : preview),
      };
      if (addLinkModal.linkIdx === null) links.push(updatedLink);
      else links[addLinkModal.linkIdx] = updatedLink;
      
      const response = await apiFetch(`/api/boards/${boardToUpdate._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ links })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || `Could not add link (HTTP ${response.status})`);
      }

      const savedLink = result.links?.[addLinkModal.linkIdx === null ? result.links.length - 1 : addLinkModal.linkIdx];
      const savedTags = Array.isArray(savedLink?.tags) ? savedLink.tags : [];
      const savedNote = typeof savedLink?.note === 'string' ? savedLink.note.trim() : '';
      if (!savedLink || JSON.stringify(savedTags) !== JSON.stringify(tags) || savedNote !== newLinkNote.trim()) {
        throw new Error('The API did not return the saved tags and note. Restart the server, then try saving again.');
      }

      setBoards(currentBoards => currentBoards.map((board, i) =>
        i === addLinkModal.boardIdx ? { ...result, ownerName: result.ownerName || board.ownerName } : board
      ));
      setAddLinkModal({ open: false, boardIdx: null, linkIdx: null });
      setNewLinkTitle("");
      setNewLinkUrl("");
      setNewLinkTags("");
      setNewLinkNote("");
    } catch (error) {
      console.error('Error adding link:', error);
      setAddLinkError(error.message || 'Could not add link. Check your connection and try again.');
    } finally {
      setSavingLink(false);
      setAddingLinkLoading(false);
    }
  };

  // Delete link handler
  const handleDeleteLink = async (boardIdx, linkIdx) => {
    setDeletingLinkLoading(true);
    try {
      const boardToUpdate = boards[boardIdx];
      const updatedLinks = boardToUpdate.links.filter((_, lIdx) => lIdx !== linkIdx);
      
      const response = await apiFetch(`/api/boards/${boardToUpdate._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ links: updatedLinks })
      });

      if (response.ok) {
        const updatedBoard = await response.json();
        setBoards(boards => boards.map((board, i) => 
          i === boardIdx ? { ...updatedBoard, ownerName: updatedBoard.ownerName || board.ownerName } : board
        ));
      }
    } catch (error) {
      console.error('Error deleting link:', error);
    } finally {
      setDeletingLinkLoading(false);
    }
  };

  // Reorder links handler
  const handleReorderLinks = async (boardIdx, newLinks) => {
    try {
      const boardToUpdate = boards[boardIdx];
      
      const response = await apiFetch(`/api/boards/${boardToUpdate._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ links: newLinks })
      });

      if (response.ok) {
        const updatedBoard = await response.json();
        setBoards(boards => boards.map((board, i) => 
          i === boardIdx ? { ...updatedBoard, ownerName: updatedBoard.ownerName || board.ownerName } : board
        ));
      }
    } catch (error) {
      console.error('Error reordering links:', error);
    }
  };

  // Toggle public/private handler
  const handleTogglePublic = async (boardIdx) => {
    try {
      const boardToUpdate = boards[boardIdx];
      const newIsPublic = !boardToUpdate.isPublic;
      
      const response = await apiFetch(`/api/boards/${boardToUpdate._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...boardToUpdate, isPublic: newIsPublic })
      });

      if (response.ok) {
        const updatedBoard = await response.json();
        setBoards(boards => boards.map((board, i) => 
          i === boardIdx ? { ...updatedBoard, ownerName: updatedBoard.ownerName || board.ownerName } : board
        ));
      } else {
        const errorText = await response.text();
        console.error('Toggle error response:', errorText);
      }
    } catch (error) {
      console.error('Error toggling public/private:', error);
    }
  };

  // Logout handler with loading state
  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await onLogout();
    } catch (error) {
      console.error('Error during logout:', error);
      setLogoutLoading(false);
    }
  };

  // Add board handler
  const handleAddBoard = async () => {
    if (!newBoardTitle.trim()) return;

    setCreatingBoard(true);
    setCreateBoardError("");
    try {
      const template = BOARD_TEMPLATES.find((item) => item.id === newBoardTemplateId) || BOARD_TEMPLATES[0];
      const boardData = { 
        title: newBoardTitle.trim(),
        links: template.links,
      };
      
      const response = await apiFetch('/api/boards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(boardData)
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || `Could not create board (HTTP ${response.status})`);
      }

      setBoards(currentBoards => [...currentBoards, result]);
      setNewBoardTitle("");
      setNewBoardTemplateId('blank');
      setModalOpen(false);
    } catch (error) {
      console.error('Error adding board:', error);
      setCreateBoardError(error.message || 'Could not create board. Check your connection and try again.');
    } finally {
      setCreatingBoard(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!inviteBoard) return;
    setCreatingInvite(true);
    setInviteError("");
    setInviteNotice(null);
    setInviteLink("");
    try {
      const response = await apiFetch(`/api/boards/${inviteBoard._id}/invites`, {
        method: 'POST',
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Could not create invite (HTTP ${response.status})`);
      const url = new URL('/invite', window.location.origin);
      url.searchParams.set('invite', result.token);
      setInviteLink(url.toString());
      setInviteNotice({ message: 'Invite link created. It expires in 7 days.', success: true });
    } catch (error) {
      setInviteError(error.message || 'Could not create invite. Try again.');
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleCopyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteNotice({ message: 'Invitation link copied.', success: true });
    } catch {
      const input = document.getElementById('invite-link');
      input?.focus();
      input?.select();
      setInviteNotice({ message: 'Select and copy the invitation link.', success: false });
    }
  };

  const handleRemoveMember = async () => {
    if (!memberRemovalTarget) return;
    const { board, member } = memberRemovalTarget;
    setRemovingMember(true);
    setMemberRemovalError('');
    try {
      const response = await apiFetch(`/api/boards/${board._id}/members/${encodeURIComponent(member.userUid)}`, { method: 'DELETE' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Could not remove member (HTTP ${response.status})`);
      setBoards((current) => current.map((item) => item._id === board._id
        ? { ...item, members: (item.members || []).filter((entry) => entry.userUid !== member.userUid) }
        : item));
      setInviteBoard((current) => current?._id === board._id
        ? { ...current, members: (current.members || []).filter((entry) => entry.userUid !== member.userUid) }
        : current);
      setMemberRemovalTarget(null);
    } catch (error) {
      setMemberRemovalError(error.message || 'Could not remove this collaborator.');
    } finally {
      setRemovingMember(false);
    }
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleBoards = boards.map((board, index) => ({ board, index })).filter(({ board }) => {
    if (!normalizedSearch || board.title.toLowerCase().includes(normalizedSearch)) return true;
    return (board.links || []).some((link) => [
      link.title,
      link.siteTitle,
      link.description,
      link.url,
      link.note,
      ...(link.tags || []),
    ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch)));
  });

  useEffect(() => {
    const viewport = boardViewportRef.current;
    const masonry = viewport?.querySelector('.dashboard-masonry-grid');
    if (!viewport || !masonry) {
      setHasBoardOverflow(false);
      return;
    }

    const updateOverflow = () => {
      setHasBoardOverflow(viewport.scrollHeight > viewport.clientHeight + 1);
      setHasScrolledBoards(viewport.scrollTop > 1);
    };
    const updateScroll = () => setHasScrolledBoards(viewport.scrollTop > 1);
    updateOverflow();
    updateScroll();
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(viewport);
    observer.observe(masonry);
    viewport.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', updateOverflow);

    return () => {
      observer.disconnect();
      viewport.removeEventListener('scroll', updateScroll);
      window.removeEventListener('resize', updateOverflow);
    };
  }, [visibleBoards.length]);
  const selectedBoard = boards.find((board) => board._id === selectedBoardId) || null;
  const selectedBoardIndex = selectedBoard ? boards.findIndex((board) => board._id === selectedBoard._id) : -1;
  const selectedBoardTemplate = BOARD_TEMPLATES.find((item) => item.id === newBoardTemplateId) || BOARD_TEMPLATES[0];

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading your boards..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e3efff] to-[#b3d0f7] flex flex-col">
      <div className="max-w-[1800px] mx-auto w-full">
        <header className="flex flex-row justify-between items-center p-4 sm:p-6 gap-2 sm:gap-0">
                      <h1><BrandLogo /></h1>
          {/* Desktop menu */}
          <div className="hidden sm:flex gap-4 items-center">
            <button className="btn btn-sm btn-ghost" onClick={onPublic}>
              <svg className="inline-block w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              Public Boards
            </button>
            <button className="btn btn-sm btn-ghost" onClick={onProfile}>
              <svg className="inline-block w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Hi, {getUserNickname()}
            </button>
            <button className={`btn btn-sm btn-white shadow ${logoutLoading ? 'enhanced-button-loading' : ''}`} onClick={handleLogout} disabled={logoutLoading}>
              {logoutLoading ? (
                <>
                  <span className="enhanced-button-spinner w-3 h-3"></span>
                  Logging out...
                </>
              ) : (
                <>
                  Logout <span className="ml-1">→</span>
                </>
              )}
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
                <button className="px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2" onClick={onPublic}>
                  <svg className="inline-block w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                  Public Boards
                </button>
                <button className="px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2" onClick={onProfile}>
                  <svg className="inline-block w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Hi, {getUserNickname()}
                </button>
                <button className={`px-4 py-2 text-left hover:bg-gray-100 ${logoutLoading ? 'enhanced-button-loading' : ''}`} onClick={handleLogout} disabled={logoutLoading}>
                  {logoutLoading ? (
                    <>
                      <span className="enhanced-button-spinner w-3 h-3"></span>
                      Logging out...
                    </>
                  ) : (
                    <>
                      Logout <span className="ml-1">→</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </header>
        {/* Render ProfilePage if needed, else main dashboard */}
        {user && user.showProfile ? (
          <ProfilePage user={user} onBack={() => setUser(u => ({ ...u, showProfile: false }))} onUserUpdate={setUser} />
        ) : (
        <main className="flex-1 flex flex-col items-center justify-start px-2 sm:px-6">
          <div ref={boardViewportRef} className={`w-full h-[calc(100vh-100px)] sm:h-[calc(100vh-80px)] max-h-full sm:max-h-[960px] flex flex-col justify-start items-center p-1 sm:p-8 pt-4 overflow-y-auto ${hasBoardOverflow ? 'dashboard-board-viewport-fade' : ''} ${hasScrolledBoards ? 'dashboard-board-top-fade' : ''}`}>
          <div className="w-full max-w-3xl mb-5 flex items-center justify-center gap-3">
            <label className="sr-only" htmlFor="board-link-search">Search boards and links</label>
            <input
              id="board-link-search"
              type="search"
              className="input input-bordered min-w-0 flex-1 bg-white"
              placeholder="Search boards, links, and tags..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            <button
              className="btn btn-primary flex shrink-0 items-center gap-2"
              onClick={() => {
                setModalOpen(true);
                setNewBoardTemplateId('blank');
                setNewBoardTitle('');
                setCreateBoardError('');
              }}
            >
              Add Board <span className="text-xl">+</span>
            </button>
          </div>
          {/* Boards List */}
                      <Masonry
              breakpointCols={breakpointColumnsObj}
              className="dashboard-masonry-grid w-full mb-4"
              columnClassName="dashboard-masonry-grid_column"
            >
            {visibleBoards.map(({ board, index: idx }) => (
              <div
                key={board._id || idx}
                draggable={!normalizedSearch && board.isOwner === true}
                onDragStart={!normalizedSearch && board.isOwner === true ? (e) => handleBoardDragStart(e, idx) : undefined}
                onDragOver={!normalizedSearch && board.isOwner === true ? handleBoardDragOver : undefined}
                onDrop={!normalizedSearch && board.isOwner === true ? (e) => handleBoardDrop(e, idx) : undefined}
                className={`draggable-board relative ${draggedBoardIndex === idx ? 'dragging' : ''} ${slidingBoards.has(idx) ? 'sliding' : ''}`}
              >
                <LinkCard
                  category={board.title}
                  links={board.links || []}
                  userEmail={!board.isOwner ? board.ownerName : undefined}
                  searchQuery={searchQuery}
                  isOwner={board.isOwner === true}
                  onOpen={() => {
                    setSelectedBoardId(board._id);
                    setEditingBoardTitle(false);
                    setBoardTitleDraft(board.title);
                    setBoardActionError('');
                  }}
                  onAddLink={() => handleAddLink(idx)}
                  onEditLink={(linkIdx) => handleEditLink(idx, linkIdx)}
                  onDeleteLink={linkIdx => handleDeleteLink(idx, linkIdx)}
                  onReorderLinks={(newLinks) => handleReorderLinks(idx, newLinks)}
                  isAddingLink={addingLinkLoading && addLinkModal.boardIdx === idx}
                  isDeletingLink={deletingLinkLoading}
                  isPublic={board.isPublic || false}
                  onTogglePublic={board.isOwner === false ? null : () => handleTogglePublic(idx)}
                  isReadOnly={false}
                />
              </div>
            ))}
          </Masonry>
          {normalizedSearch && visibleBoards.length === 0 && <p className="text-gray-600 py-8">No boards or links matched “{searchQuery}”.</p>}

        </div>
        {selectedBoard && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 backdrop-blur-sm p-3 sm:p-6"
            onClick={() => { setSelectedBoardId(null); setEditingBoardTitle(false); }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="selected-board-title"
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  {editingBoardTitle ? (
                    <div className="flex flex-wrap gap-2">
                      <input
                        id="selected-board-title"
                        className="input input-bordered flex-1 min-w-[180px]"
                        value={boardTitleDraft}
                        onChange={(event) => setBoardTitleDraft(event.target.value)}
                        autoFocus
                      />
                      <button className="btn btn-primary btn-sm" onClick={() => handleSaveBoardTitle(selectedBoard)} disabled={savingBoard}>
                        {savingBoard ? 'Saving…' : 'Save'}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditingBoardTitle(false); setBoardTitleDraft(selectedBoard.title); }}>Cancel</button>
                    </div>
                  ) : (
                    <h2 id="selected-board-title" className="text-2xl font-bold text-blue-700 break-words">{selectedBoard.title}</h2>
                  )}
                  <p className="text-sm text-gray-500 mt-1">{selectedBoard.links?.length || 0} saved {(selectedBoard.links?.length || 0) === 1 ? 'link' : 'links'}</p>
                  {!selectedBoard.isOwner && selectedBoard.ownerName && (
                    <p className="text-sm text-gray-500 mt-1">Owned by <span className="font-medium text-gray-700">{selectedBoard.ownerName}</span></p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {selectedBoard.isOwner && !editingBoardTitle && (
                    <>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setInviteBoard(selectedBoard);
                          setInviteLink('');
                          setInviteError('');
                          setInviteNotice(null);
                        }}
                      >Invite</button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-square btn-sm text-gray-700"
                        onClick={() => { setBoardTitleDraft(selectedBoard.title); setEditingBoardTitle(true); setBoardActionError(''); }}
                        aria-label="Edit board name"
                        title="Edit board name"
                      >
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 2.65 2.65M4 20l4.2-.9L19.5 7.8a1.875 1.875 0 0 0-2.65-2.65L5.55 16.45 4 20Z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-square btn-sm text-red-600 hover:bg-red-50"
                        onClick={() => { setBoardDeleteTarget(selectedBoard); setBoardDeleteError(''); }}
                        aria-label="Delete board"
                        title="Delete board"
                      >
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 11v6m4-6v6M5.5 7l.8 13h11.4l.8-13M9 7V4h6v3" />
                        </svg>
                      </button>
                    </>
                  )}
                  {!selectedBoard.isOwner && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50"
                      onClick={() => { setLeaveBoardTarget(selectedBoard); setLeaveBoardError(''); }}
                      title="Leave shared board"
                    >
                      Leave board
                    </button>
                  )}
                  <button className="btn btn-circle btn-ghost btn-sm" onClick={() => setSelectedBoardId(null)} aria-label="Close board">✕</button>
                </div>
              </div>
              {boardActionError && <p className="text-sm text-red-600 mb-3" role="alert">{boardActionError}</p>}
              <LinkCard
                category={selectedBoard.title}
                links={selectedBoard.links || []}
                expanded
                hideHeader
                isOwner={selectedBoard.isOwner === true}
                isReadOnly={false}
                onAddLink={() => handleAddLink(selectedBoardIndex)}
                onEditLink={(linkIdx) => handleEditLink(selectedBoardIndex, linkIdx)}
                onDeleteLink={(linkIdx) => handleDeleteLink(selectedBoardIndex, linkIdx)}
                onReorderLinks={(newLinks) => handleReorderLinks(selectedBoardIndex, newLinks)}
                isAddingLink={addingLinkLoading && addLinkModal.boardIdx === selectedBoardIndex}
                isDeletingLink={deletingLinkLoading}
              />
            </section>
          </div>
        )}
        {boardDeleteTarget && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4"
            onClick={() => { if (!deletingBoard) setBoardDeleteTarget(null); }}
          >
            <section
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-board-title"
              aria-describedby="delete-board-description"
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3l-7.5-13.1a2 2 0 0 0-3.4 0Z" />
                  </svg>
                </div>
                <div>
                  <h2 id="delete-board-title" className="text-lg font-bold text-gray-900">Delete this board?</h2>
                  <p id="delete-board-description" className="mt-1 text-sm text-gray-600">
                    <span className="font-semibold text-gray-800">{boardDeleteTarget.title}</span> and its {boardDeleteTarget.links?.length || 0} {(boardDeleteTarget.links?.length || 0) === 1 ? 'link' : 'links'} will be permanently deleted.
                  </p>
                </div>
              </div>
              {boardDeleteError && <p className="mb-3 text-sm text-red-600" role="alert">{boardDeleteError}</p>}
              <div className="flex justify-end gap-2">
                <button className="btn btn-ghost" onClick={() => setBoardDeleteTarget(null)} disabled={deletingBoard}>Cancel</button>
                <button className="btn btn-error" onClick={() => handleDeleteBoard(boardDeleteTarget)} disabled={deletingBoard}>
                  {deletingBoard ? 'Deleting…' : 'Delete board'}
                </button>
              </div>
            </section>
          </div>
        )}
        {leaveBoardTarget && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4"
            onClick={() => { if (!leavingBoard) setLeaveBoardTarget(null); }}
          >
            <section
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="leave-board-title"
              aria-describedby="leave-board-description"
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 id="leave-board-title" className="text-lg font-bold text-gray-900">Leave this shared board?</h2>
              <p id="leave-board-description" className="mt-2 text-sm text-gray-600">
                You will lose access to <span className="font-semibold text-gray-800">{leaveBoardTarget.title}</span>. The board and its links will remain available to the owner and other collaborators.
              </p>
              {leaveBoardError && <p className="mt-3 text-sm text-red-600" role="alert">{leaveBoardError}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <button className="btn btn-ghost" onClick={() => setLeaveBoardTarget(null)} disabled={leavingBoard}>Cancel</button>
                <button className="btn btn-error" onClick={() => handleLeaveBoard(leaveBoardTarget)} disabled={leavingBoard}>
                  {leavingBoard ? 'Leaving...' : 'Leave board'}
                </button>
              </div>
            </section>
          </div>
        )}
        {/* Modal for new board */}
        {modalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-50 p-4">
            <div className="bg-white rounded-lg p-6 shadow-lg flex flex-col gap-4 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-bold">Create New Board</h2>
              <div>
                <label htmlFor="board-template" className="text-sm font-medium">Start from a template</label>
                <select
                  id="board-template"
                  className="select select-bordered w-full mt-1"
                  value={newBoardTemplateId}
                  onChange={(event) => {
                    const template = BOARD_TEMPLATES.find((item) => item.id === event.target.value) || BOARD_TEMPLATES[0];
                    setNewBoardTemplateId(template.id);
                    setNewBoardTitle(template.id === 'blank' ? '' : template.title);
                    setCreateBoardError('');
                  }}
                >
                  {BOARD_TEMPLATES.map((template) => <option key={template.id} value={template.id}>{template.title}</option>)}
                </select>
                <p className="text-xs text-gray-500 mt-1">{selectedBoardTemplate.description}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3" aria-label={`${selectedBoardTemplate.title} template preview`}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Preview</p>
                <div className="rounded-lg bg-white p-3 shadow-sm">
                  <h3 className="mb-2 truncate text-sm font-bold text-blue-700">
                    {newBoardTitle.trim() || (newBoardTemplateId === 'blank' ? 'Your board' : selectedBoardTemplate.title)}
                  </h3>
                  {selectedBoardTemplate.links.length ? (
                    <div className="flex flex-col gap-2">
                      {selectedBoardTemplate.links.map((link) => (
                        <div
                          key={link.url}
                          className="min-w-0 rounded-md px-2.5 py-2"
                          style={{ background: link.color || '#181f29', color: getTemplateLinkTextColor(link.color) }}
                        >
                          <p className="truncate text-xs font-semibold">{link.title}</p>
                          <p className="truncate text-[10px] opacity-90">{link.url}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-md border border-dashed border-gray-300 px-3 py-4 text-center text-xs text-gray-400">Your links will appear here</p>
                  )}
                </div>
              </div>
              <input
                className="input input-bordered bg-white/60 backdrop-blur placeholder:text-gray-500 w-full"
                placeholder="Board Title"
                value={newBoardTitle}
                onChange={e => {
                  setNewBoardTitle(e.target.value);
                  setCreateBoardError("");
                }}
                autoFocus
              />
              {createBoardError && (
                <p className="text-sm text-red-600" role="alert">{createBoardError}</p>
              )}
              <div className="flex gap-2 justify-end">
                <button className="btn btn-ghost" onClick={() => setModalOpen(false)} disabled={creatingBoard}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={handleAddBoard}
                  disabled={creatingBoard || !newBoardTitle.trim()}
                >
                  {creatingBoard ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Modal for adding a link */}
        {addLinkModal.open && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-50 p-4">
            <div className="bg-white rounded-lg p-6 shadow-lg flex flex-col gap-4 w-full max-w-lg">
              <h2 className="text-lg font-bold">{addLinkModal.linkIdx === null ? 'Add Link' : 'Edit Link'}</h2>
              <input
                className="input input-bordered bg-white/60 backdrop-blur placeholder:text-gray-500 w-full"
                placeholder="Link Title"
                value={newLinkTitle}
                onChange={e => {
                  setNewLinkTitle(e.target.value);
                  setAddLinkError("");
                }}
                autoFocus
              />
              <label className="flex w-full flex-col gap-1 text-sm font-medium">
                <span className="flex w-full items-baseline justify-between gap-2">
                  <span>Tags</span>
                  <span className="text-right font-normal text-gray-500">(optional, separated by commas)</span>
                </span>
                <input
                  className="input input-bordered bg-white/60 backdrop-blur placeholder:text-gray-500 font-normal w-full"
                  placeholder="e.g. learning, frontend"
                  value={newLinkTags}
                  onChange={e => {
                    setNewLinkTags(e.target.value);
                    setAddLinkError("");
                  }}
                />
              </label>
              <label className="flex w-full flex-col gap-1 text-sm font-medium">
                <span className="flex w-full items-baseline justify-between gap-2">
                  <span>Description or note</span>
                  <span className="text-right font-normal text-gray-500">(optional)</span>
                </span>
                <textarea
                  className="textarea textarea-bordered bg-white/60 backdrop-blur placeholder:text-gray-500 font-normal w-full"
                  placeholder="Why are you saving this link?"
                  value={newLinkNote}
                  onChange={e => {
                    setNewLinkNote(e.target.value);
                    setAddLinkError("");
                  }}
                  rows={2}
                />
              </label>
              <input
                className="input input-bordered bg-white/60 backdrop-blur placeholder:text-gray-500 w-full"
                placeholder="URL (www.example.com)"
                value={newLinkUrl}
                onChange={e => {
                  setNewLinkUrl(e.target.value);
                  setAddLinkError("");
                }}
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
              {addLinkError && (
                <p className="text-sm text-red-600" role="alert">{addLinkError}</p>
              )}
              <div className="flex gap-2 justify-end">
                <button className="btn btn-ghost" onClick={() => setAddLinkModal({ open: false, boardIdx: null, linkIdx: null })} disabled={savingLink}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={handleConfirmAddLink}
                  disabled={savingLink || !newLinkTitle.trim() || !newLinkUrl.trim()}
                >
                  {savingLink ? 'Saving...' : addLinkModal.linkIdx === null ? 'Add' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
        {inviteBoard && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-50">
            <div className="bg-white rounded-lg p-6 shadow-lg flex flex-col gap-4 w-full max-w-md mx-4 relative">
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3"
                onClick={() => setInviteBoard(null)}
                aria-label="Close share dialog"
                title="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
              <h2 className="text-lg font-bold">Share “{inviteBoard.title}”</h2>
              
              <p className="text-sm text-gray-600">Anyone with this link can join within 7 days. After joining, they keep access until they leave or you remove them.</p>
              {inviteLink && (
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <input
                      id="invite-link"
                      aria-label="Invitation link"
                      className="input input-bordered h-10 w-full pr-12 text-xs"
                      readOnly
                      value={inviteLink}
                      onFocus={(event) => event.target.select()}
                    />
                    <button
                      type="button"
                      className="absolute right-1 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600"
                      onClick={handleCopyInviteLink}
                      aria-label="Copy invite link"
                      title="Copy invite link"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                        <rect x="8" y="8" width="12" height="12" rx="2" />
                        <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              {inviteNotice && (
                <p className={`rounded-lg px-3 py-2 text-sm ${inviteNotice.success ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-900'}`} role="status">
                  {inviteNotice.message}
                </p>
              )}
              {inviteBoard.members?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Collaborators</h3>
                  <ul className="flex flex-col gap-2">
                    {inviteBoard.members.map((member) => (
                      <li key={member.userUid} className="flex items-center justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <span className="block truncate font-medium text-gray-900">{member.nickname || 'Collaborator'}</span>
                          <span className="block truncate text-xs text-gray-500">{member.email}</span>
                        </div>
                        <button
                          className="shrink-0 text-red-600 hover:underline"
                          onClick={() => {
                            setMemberRemovalTarget({ board: inviteBoard, member });
                            setMemberRemovalError('');
                          }}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {inviteError && <p className="text-sm text-red-600" role="alert">{inviteError}</p>}
              <button className="btn btn-primary mt-auto w-full" onClick={handleCreateInvite} disabled={creatingInvite}>
                {creatingInvite ? 'Creating...' : 'Create invite link'}
              </button>
            </div>
          </div>
        )}
        {memberRemovalTarget && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 backdrop-blur-sm p-4">
            <section
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="remove-collaborator-title"
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            >
              <h2 id="remove-collaborator-title" className="text-lg font-bold text-gray-900">Remove collaborator?</h2>
              <p className="mt-2 text-sm text-gray-600">
                {memberRemovalTarget.member.nickname || 'This collaborator'} will lose access to “{memberRemovalTarget.board.title}”.
              </p>
              <p className="mt-1 text-sm text-gray-500">{memberRemovalTarget.member.email}</p>
              {memberRemovalError && <p className="mt-3 text-sm text-red-600" role="alert">{memberRemovalError}</p>}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setMemberRemovalTarget(null)}
                  disabled={removingMember}
                >
                  Cancel
                </button>
                <button type="button" className="btn btn-error" onClick={handleRemoveMember} disabled={removingMember}>
                  {removingMember ? 'Removing...' : 'Remove collaborator'}
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
      )}
      </div>
    </div>
  );
}
  
