import React, { useState, useEffect, useRef } from "react";
import BrandLogo from "./BrandLogo";
import Masonry from "react-masonry-css";
import { boardAreaWidth, masonryColumns } from "./utils/masonry";
import LinkCard, { Favicon } from "./LinkCard";
import LoadingSpinner from "./components/LoadingSpinner.jsx";
import Modal from "./components/Modal.jsx";
import { apiFetch, getUserProfile } from "./firebase";
import { BOARD_TEMPLATES } from "./data/boardTemplates";
import { fetchLinkPreview, getDomain, normalizeUrl } from "./utils/linkPreview";
import { matchBoard } from "./utils/search";

const UNDO_DELAY_MS = 6000;

export default function DashboardPage({ onLogout, user: initialUser, onProfile, onPublic, pendingBoardCopyId = null, onPendingBoardCopyHandled }) {
  const [userProfile, setUserProfile] = useState(null);
  const [userProfileLoading, setUserProfileLoading] = useState(true);
  const [boards, setBoards] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [newBoardTemplateId, setNewBoardTemplateId] = useState('blank');
  const [createBoardError, setCreateBoardError] = useState("");
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [addLinkModal, setAddLinkModal] = useState({ open: false, boardIdx: null, linkIdx: null });
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkTags, setNewLinkTags] = useState("");
  const [newLinkNote, setNewLinkNote] = useState("");
  // Page details looked up while the link form is open; reused on save so the page is fetched once.
  const [linkPreview, setLinkPreview] = useState({ url: null, status: 'idle', data: {} });
  const titleTouched = useRef(false);
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
  // Deleted links wait here for UNDO_DELAY_MS before the server delete runs, so Undo restores the same link.
  const [pendingDeletes, setPendingDeletes] = useState([]);
  const deleteTimers = useRef(new Map());
  const [draggedBoardIndex, setDraggedBoardIndex] = useState(null);
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

  // Fetch user profile and boards. A new account's profile can still be saving
  // when Firebase first routes it to the dashboard, so retry a brief 404.
  useEffect(() => {
    let cancelled = false;
    const loadUserProfile = async () => {
      try {
        for (let attempt = 0; attempt < 12; attempt += 1) {
          const result = await getUserProfile();
          if (result.success) {
            if (!cancelled) setUserProfile(result.data);
            return;
          }
          if (result.message !== 'User profile not found' || attempt === 11) return;
          await new Promise((resolve) => window.setTimeout(resolve, 250));
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      } finally {
        if (!cancelled) setUserProfileLoading(false);
      }
    };

    loadUserProfile();
    fetchBoards();
    return () => { cancelled = true; };
  }, [initialUser?.uid]);

  useEffect(() => {
    if (!pendingBoardCopyId || loading || handledBoardCopies.current.has(pendingBoardCopyId)) return;
    handledBoardCopies.current.add(pendingBoardCopyId);
    onPendingBoardCopyHandled?.();

    const copyPendingBoard = async () => {
      try {
        const response = await apiFetch(`/api/boards/${encodeURIComponent(pendingBoardCopyId)}/copy`, { method: 'POST' });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Could not copy this board. Please try again.');
        setBoards((current) => [...current, result]);
        window.showToast?.(`Copied as “${result.title}” to your private boards.`, 'success');
      } catch (error) {
        window.showToast?.(error.message || 'Could not copy this board. Please try again.', 'error');
      }
    };
    copyPendingBoard();
  }, [pendingBoardCopyId, loading]);

  // Show the nickname in the dashboard greeting without exposing a real name.
  const getUserNickname = () => {
    if (userProfileLoading) return '…';
    return userProfile?.nickname || 'User';
  };

  const fetchBoards = async () => {
    try {
      const response = await apiFetch('/api/boards');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      setBoards(await response.json());
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

  const handleBoardDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedBoardIndex !== null && draggedBoardIndex !== dropIndex) moveBoard(draggedBoardIndex, dropIndex);
    setDraggedBoardIndex(null);
  };

  const moveBoard = async (from, to) => {
    const newBoards = [...boards];
    const [moved] = newBoards.splice(from, 1);
    newBoards.splice(to, 0, moved);
    setBoards(newBoards);

    // Save only the order, and only for owned boards that moved; sending the whole board rewrote every link.
    try {
      const responses = await Promise.all(newBoards
        .map((board, index) => ({ board, index }))
        .filter(({ board, index }) => board.isOwner && board.order !== index)
        .map(({ board, index }) => apiFetch(`/api/boards/${board._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: index }),
        })));
      if (responses.some((response) => !response.ok)) throw new Error('Could not save the new board order.');
      setBoards((current) => current.map((board, index) => board.isOwner ? { ...board, order: index } : board));
    } catch (error) {
      console.error('Error updating board order:', error);
      window.showToast?.('Could not save the new board order. Please try again.', 'error');
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
      setBoards((current) => current.map((item) => item._id === board._id ? { ...result, ownerName: result.ownerName || item.ownerName, members: item.members } : item));
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
    setNewLinkTags("");
    setNewLinkNote("");
    setAddLinkError("");
    setLinkPreview({ url: null, status: 'idle', data: {} });
    titleTouched.current = false;
  };

  const handleEditLink = (boardIdx, linkIdx) => {
    const link = boards[boardIdx]?.links?.[linkIdx];
    if (!link) return;
    setAddLinkModal({ open: true, boardIdx, linkIdx });
    setNewLinkTitle(link.title || "");
    setNewLinkUrl(link.url || "");
    setNewLinkTags((link.tags || []).join(', '));
    setNewLinkNote(link.note || "");
    setAddLinkError("");
    setLinkPreview({ url: null, status: 'idle', data: {} });
    titleTouched.current = true; // keep the title they already chose
  };

  const editingLinkUrl = addLinkModal.linkIdx === null ? null : boards[addLinkModal.boardIdx]?.links?.[addLinkModal.linkIdx]?.url ?? null;

  // Quick add: a pasted or typed URL is looked up after a short pause, and fills the title unless the user wrote one.
  useEffect(() => {
    if (!addLinkModal.open) return undefined;
    const url = normalizeUrl(newLinkUrl);
    if (!url || url === editingLinkUrl) {
      setLinkPreview({ url: null, status: 'idle', data: {} });
      return undefined;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLinkPreview({ url, status: 'loading', data: {} });
      const data = await fetchLinkPreview(url);
      if (cancelled) return;
      setLinkPreview({ url, status: 'done', data });
      if (!titleTouched.current) setNewLinkTitle(data.siteTitle || getDomain(url));
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [newLinkUrl, addLinkModal.open, editingLinkUrl]);

  // Applies a change to one board's links without touching anything else in it.
  const updateBoardLinks = (boardId, update) => {
    setBoards((current) => current.map((board) => (
      board._id === boardId ? { ...board, links: update(board.links || []) } : board
    )));
  };

  const readError = async (response, fallback) => {
    const result = await response.json().catch(() => ({}));
    return result.error || fallback;
  };

  const handleConfirmAddLink = async () => {
    const url = normalizeUrl(newLinkUrl);
    if (!url) {
      setAddLinkError("Enter a web address, like example.com.");
      return;
    }

    setSavingLink(true);
    setAddingLinkLoading(true);
    setAddLinkError("");
    try {
      const board = boards[addLinkModal.boardIdx];
      if (!board) throw new Error('Could not find this board. Refresh the page and try again.');
      const previousLink = addLinkModal.linkIdx === null ? null : board.links?.[addLinkModal.linkIdx];
      const urlChanged = previousLink?.url !== url;
      // Links saved while the preview service was unavailable have no favicon; re-check them on save.
      const needsLookup = urlChanged || !previousLink?.faviconUrl;
      // New or changed URL: replace all preview metadata so an old site's preview never lingers.
      const preview = !needsLookup ? {} : linkPreview.url === url && linkPreview.status === 'done' ? linkPreview.data : await fetchLinkPreview(url);
      const fields = {
        title: newLinkTitle.trim() || preview.siteTitle || previousLink?.title || getDomain(url),
        url,
        tags: [...new Set(newLinkTags.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean))],
        note: newLinkNote.trim(),
      };
      if (urlChanged) {
        Object.assign(fields, {
          siteTitle: preview.siteTitle ?? null,
          description: preview.description ?? null,
          previewImageUrl: preview.previewImageUrl ?? null,
          faviconUrl: preview.faviconUrl ?? null,
        });
      } else {
        // Same URL: only fill in what the lookup found, so an empty or rate-limited lookup never wipes saved details.
        for (const key of ['siteTitle', 'description', 'previewImageUrl', 'faviconUrl']) {
          if (preview[key]) fields[key] = preview[key];
        }
      }

      const response = await apiFetch(
        previousLink ? `/api/boards/${board._id}/links/${previousLink._id}` : `/api/boards/${board._id}/links`,
        { method: previousLink ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) },
      );
      if (!response.ok) throw new Error(await readError(response, `Could not save the link (HTTP ${response.status})`));
      const saved = await response.json();

      updateBoardLinks(board._id, (links) => (previousLink
        ? links.map((link) => (link._id === saved._id ? saved : link))
        : [...links, saved]));
      setAddLinkModal({ open: false, boardIdx: null, linkIdx: null });
      setNewLinkTitle("");
      setNewLinkUrl("");
      setNewLinkTags("");
      setNewLinkNote("");
    } catch (error) {
      console.error('Error saving link:', error);
      setAddLinkError(error.message || 'Could not save the link. Check your connection and try again.');
    } finally {
      setSavingLink(false);
      setAddingLinkLoading(false);
    }
  };

  const restoreLinks = (boardId, entries) => {
    updateBoardLinks(boardId, (links) => {
      const restored = [...links];
      [...entries].sort((a, b) => a.index - b.index).forEach(({ link, index }) => {
        if (!restored.some((item) => item._id === link._id)) restored.splice(Math.min(index, restored.length), 0, link);
      });
      return restored;
    });
  };

  const commitDelete = async (entry) => {
    deleteTimers.current.delete(entry.link._id);
    setPendingDeletes((current) => current.filter((item) => item.link._id !== entry.link._id));
    try {
      const response = await apiFetch(`/api/boards/${entry.boardId}/links/${entry.link._id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await readError(response, `HTTP ${response.status}`));
      updateBoardLinks(entry.boardId, (links) => links.filter((item) => item._id !== entry.link._id));
    } catch (error) {
      console.error('Error deleting link:', error);
      restoreLinks(entry.boardId, [entry]);
      window.showToast?.(`Could not delete “${entry.link.title}”. It has been put back.`, 'error');
    }
  };

  const handleDeleteLink = (boardIdx, linkIdx) => {
    const board = boards[boardIdx];
    const link = board?.links?.[linkIdx];
    if (!link || deleteTimers.current.has(link._id)) return;
    const entry = { boardId: board._id, link, index: linkIdx };
    updateBoardLinks(board._id, (links) => links.filter((item) => item._id !== link._id));
    setPendingDeletes((current) => [...current, entry]);
    deleteTimers.current.set(link._id, window.setTimeout(() => commitDelete(entry), UNDO_DELAY_MS));
  };

  const undoDeletes = (boardId) => {
    const entries = pendingDeletes.filter((entry) => entry.boardId === boardId);
    entries.forEach(({ link }) => {
      window.clearTimeout(deleteTimers.current.get(link._id));
      deleteTimers.current.delete(link._id);
    });
    setPendingDeletes((current) => current.filter((entry) => entry.boardId !== boardId));
    restoreLinks(boardId, entries);
  };

  // Leaving the dashboard (e.g. to Profile) finishes pending deletes now instead of dropping them.
  // shortcut: closing the tab inside the undo window keeps the link (safe direction); add a keepalive delete if that matters.
  const pendingRef = useRef(pendingDeletes);
  pendingRef.current = pendingDeletes;
  useEffect(() => () => {
    pendingRef.current.forEach((entry) => {
      window.clearTimeout(deleteTimers.current.get(entry.link._id));
      apiFetch(`/api/boards/${entry.boardId}/links/${entry.link._id}`, { method: 'DELETE' }).catch(() => {});
    });
  }, []);

  const handleReorderLinks = async (boardIdx, newLinks) => {
    const board = boards[boardIdx];
    if (!board) return;
    const previousLinks = board.links || [];
    updateBoardLinks(board._id, () => newLinks); // show the new order immediately
    try {
      const response = await apiFetch(`/api/boards/${board._id}/links/order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: newLinks.map((link) => link._id) }),
      });
      if (!response.ok) {
        const message = await readError(response, 'Could not save the new link order. Please try again.');
        if (response.status === 409) fetchBoards(); // a collaborator changed the board: load their version
        else updateBoardLinks(board._id, () => previousLinks);
        window.showToast?.(message, 'error');
      }
    } catch (error) {
      console.error('Error reordering links:', error);
      updateBoardLinks(board._id, () => previousLinks);
      window.showToast?.('Could not save the new link order. Please try again.', 'error');
    }
  };

  // Toggle public/private handler
  // "/" jumps to search, unless the user is typing somewhere or a dialog is open.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return;
      if (event.target.closest?.('input, textarea, select, [contenteditable="true"]') || document.querySelector('dialog[open]')) return;
      const search = document.getElementById('board-link-search');
      if (!search) return;
      event.preventDefault();
      search.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Visibility flips on screen immediately; the save runs in the background and is undone only if it fails.
  const visibilityRequests = useRef(new Map());
  // Saves for one board run one after another: sent in parallel, a slow earlier save could land last
  // and leave the server on the opposite of what the screen shows.
  const visibilityQueue = useRef(new Map());
  // Latest intended visibility per board: rapid clicks can land before a re-render, so they read this, not the render.
  const visibilityIntent = useRef(new Map());
  const handleTogglePublic = (boardIdx) => {
    const board = boards[boardIdx];
    if (!board) return;
    const isPublic = !(visibilityIntent.current.get(board._id) ?? board.isPublic);
    visibilityIntent.current.set(board._id, isPublic);
    const request = (visibilityRequests.current.get(board._id) || 0) + 1;
    visibilityRequests.current.set(board._id, request);
    setBoards((current) => current.map((item) => (item._id === board._id ? { ...item, isPublic } : item)));
    const save = async () => {
      try {
        const response = await apiFetch(`/api/boards/${board._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPublic }),
        });
        if (!response.ok) throw new Error(await readError(response, `HTTP ${response.status}`));
      } catch (error) {
        console.error('Error toggling public/private:', error);
        // A newer click already decided the state; only the latest request may roll back.
        if (visibilityRequests.current.get(board._id) !== request) return;
        visibilityIntent.current.set(board._id, !isPublic);
        setBoards((current) => current.map((item) => (item._id === board._id ? { ...item, isPublic: !isPublic } : item)));
        window.showToast?.('Could not change board visibility. Please try again.', 'error');
      }
    };
    const queued = (visibilityQueue.current.get(board._id) || Promise.resolve()).then(save);
    visibilityQueue.current.set(board._id, queued);
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
  const isFiltering = Boolean(normalizedSearch);
  const visibleBoards = boards
    .map((board, index) => ({ board, index, matches: matchBoard(board, normalizedSearch) }))
    .filter(({ matches }) => matches !== null);
  const matchingLinkCount = visibleBoards.reduce((total, { matches }) => total + matches.length, 0);

  const selectedBoard = boards.find((board) => board._id === selectedBoardId) || null;
  const selectedBoardIndex = selectedBoard ? boards.findIndex((board) => board._id === selectedBoard._id) : -1;
  const selectedBoardTemplate = BOARD_TEMPLATES.find((item) => item.id === newBoardTemplateId) || BOARD_TEMPLATES[0];

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading your boards…" />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="w-full">
        <header className="cover-band flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-10 sm:py-4">
          <BrandLogo />
          <div className="order-last flex w-full min-w-0 items-center gap-3 sm:order-none sm:w-auto sm:max-w-2xl sm:flex-1">
            <label className="sr-only" htmlFor="board-link-search">Search boards and links</label>
            <div className="relative min-w-0 flex-1">
              <input
                id="board-link-search"
                type="search"
                className={`band-search input w-full ${searchQuery ? '' : 'sm:pr-10'}`}
                placeholder="Search boards and links…"
                aria-keyshortcuts="/"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              {!searchQuery && (
                <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-white/40 px-1.5 text-xs text-white/85 sm:block" aria-hidden="true">/</kbd>
              )}
            </div>
          </div>
          {/* Desktop menu */}
          <div className="ml-auto hidden items-center gap-1 sm:flex">
            <button className="btn btn-sm btn-ghost" onClick={onPublic}>
              <svg className="inline-block w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              Public Boards
            </button>
            <button className="btn btn-sm btn-ghost" onClick={onProfile}>
              <svg className="inline-block w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Hi, {getUserNickname()}
            </button>
            <button className={`btn btn-sm btn-ghost ${logoutLoading ? 'enhanced-button-loading' : ''}`} onClick={handleLogout} disabled={logoutLoading}>
              {logoutLoading ? (
                <>
                  <span className="enhanced-button-spinner w-3 h-3"></span>
                  Logging out…
                </>
              ) : (
                <>
                  Logout <span className="ml-1">→</span>
                </>
              )}
            </button>
          </div>
          {/* Mobile menu */}
          <div className="relative ml-auto flex items-center sm:hidden">
            <button className="btn btn-sm btn-ghost" popoverTarget="dashboard-menu" style={{ anchorName: '--dashboard-menu' }} aria-label="Menu">
              <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {/* Native popover: Esc and outside clicks close it. */}
              <div id="dashboard-menu" popover="auto" className="popover-menu" style={{ positionAnchor: '--dashboard-menu' }}>
                <button className="px-4 py-2 text-left hover:bg-base-200 flex items-center gap-2" onClick={onPublic}>
                  <svg className="inline-block w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                  Public Boards
                </button>
                <button className="px-4 py-2 text-left hover:bg-base-200 flex items-center gap-2" onClick={onProfile}>
                  <svg className="inline-block w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Hi, {getUserNickname()}
                </button>
                <button className={`px-4 py-2 text-left hover:bg-base-200 ${logoutLoading ? 'enhanced-button-loading' : ''}`} onClick={handleLogout} disabled={logoutLoading}>
                  {logoutLoading ? (
                    <>
                      <span className="enhanced-button-spinner w-3 h-3"></span>
                      Logging out…
                    </>
                  ) : (
                    <>
                      Logout <span className="ml-1">→</span>
                    </>
                  )}
                </button>
              </div>
          </div>
        </header>
        <main className="flex-1">
          <div className="mx-auto w-full px-4 pb-12 pt-8 sm:px-10" style={{ maxWidth: `calc(${boardAreaWidth(boards.length)} + 5rem)` }}>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <h1 className="whitespace-nowrap text-3xl font-extrabold tracking-[-0.03em] text-base-content sm:text-4xl">Your boards</h1>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              {isFiltering && (
                <button type="button" className="btn btn-ghost font-semibold text-link hover:bg-surface" onClick={() => setSearchQuery('')}>
                  Clear search
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary shrink-0 font-bold"
                onClick={() => {
                  setModalOpen(true);
                  setNewBoardTemplateId('blank');
                  setNewBoardTitle('');
                  setCreateBoardError('');
                }}
              >
                <span aria-hidden="true">+</span> New board
              </button>
            </div>
          </div>
          {/* Always mounted so screen readers hear the result count change as the user types;
              only the no-results message is shown on screen. */}
          <p role="status" className={isFiltering && visibleBoards.length === 0 ? 'py-12 text-center text-slate' : 'sr-only'}>
            {!isFiltering ? '' : visibleBoards.length === 0
              ? `No boards or links match “${searchQuery.trim()}”.`
              : `${matchingLinkCount} ${matchingLinkCount === 1 ? 'link' : 'links'} in ${visibleBoards.length} ${visibleBoards.length === 1 ? 'board' : 'boards'}`}
          </p>
          {/* Boards List */}
          <Masonry breakpointCols={masonryColumns(boards.length)} className="board-grid mb-4" columnClassName="board-grid-column">
            {visibleBoards.map(({ board, index: idx }) => (
              <div
                key={board._id || idx}
                draggable={!isFiltering && board.isOwner === true}
                onDragStart={!isFiltering && board.isOwner === true ? (e) => handleBoardDragStart(e, idx) : undefined}
                onDragOver={!isFiltering && board.isOwner === true ? handleBoardDragOver : undefined}
                onDrop={!isFiltering && board.isOwner === true ? (e) => handleBoardDrop(e, idx) : undefined}
                className={`draggable-board relative ${draggedBoardIndex === idx ? 'dragging' : ''}`}
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
                  isPublic={board.isPublic || false}
                  onTogglePublic={board.isOwner === false ? null : () => handleTogglePublic(idx)}
                  isReadOnly={false}
                  className="w-full"
                  sharedWith={board.members?.length || 0}
                />
              </div>
            ))}
          </Masonry>

        </div>
        {selectedBoard && (
          <Modal
            onClose={() => { setSelectedBoardId(null); setEditingBoardTitle(false); }}
            labelledBy="selected-board-title"
            className="max-w-3xl p-4 sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {editingBoardTitle ? (
                  <form
                    className="flex flex-wrap gap-2"
                    onSubmit={(event) => { event.preventDefault(); handleSaveBoardTitle(selectedBoard); }}
                  >
                    <label htmlFor="board-title-draft" className="sr-only">Board name</label>
                    <input
                      id="board-title-draft"
                      className="input input-bordered min-w-[180px] flex-1"
                      value={boardTitleDraft}
                      maxLength={100}
                      onChange={(event) => setBoardTitleDraft(event.target.value)}
                      onKeyDown={(event) => {
                        // Esc cancels the rename instead of closing the whole board.
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          setEditingBoardTitle(false);
                          setBoardTitleDraft(selectedBoard.title);
                        }
                      }}
                      autoFocus
                    />
                    <button type="submit" className="btn btn-primary btn-sm" disabled={savingBoard}>
                      {savingBoard ? 'Saving…' : 'Save'}
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEditingBoardTitle(false); setBoardTitleDraft(selectedBoard.title); }}>Cancel</button>
                  </form>
                ) : null}
                <h1 id="selected-board-title" className={editingBoardTitle ? 'sr-only' : 'break-words text-2xl font-bold text-base-content'}>{selectedBoard.title}</h1>
                <p className="mt-1 text-sm text-steel">{selectedBoard.links?.length || 0} saved {(selectedBoard.links?.length || 0) === 1 ? 'link' : 'links'}</p>
                {!selectedBoard.isOwner && selectedBoard.ownerName && (
                  <p className="mt-1 text-sm text-steel">Owned by <span className="font-medium text-charcoal">{selectedBoard.ownerName}</span></p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
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
                      className="btn btn-ghost btn-square btn-sm text-charcoal"
                      onClick={() => { setBoardTitleDraft(selectedBoard.title); setEditingBoardTitle(true); setBoardActionError(''); }}
                      aria-label="Rename board"
                      title="Rename board"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 2.65 2.65M4 20l4.2-.9L19.5 7.8a1.875 1.875 0 0 0-2.65-2.65L5.55 16.45 4 20Z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-square btn-sm text-error hover:bg-error/10"
                      onClick={() => { setBoardDeleteTarget(selectedBoard); setBoardDeleteError(''); }}
                      aria-label="Delete board"
                      title="Delete board"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 11v6m4-6v6M5.5 7l.8 13h11.4l.8-13M9 7V4h6v3" />
                      </svg>
                    </button>
                  </>
                )}
                {!selectedBoard.isOwner && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm border-error/30 text-error hover:border-error/30 hover:bg-error/10"
                    onClick={() => { setLeaveBoardTarget(selectedBoard); setLeaveBoardError(''); }}
                  >
                    Leave board
                  </button>
                )}
                <button type="button" className="btn btn-ghost btn-square btn-sm" onClick={() => setSelectedBoardId(null)} aria-label="Close board" title="Close">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5">
                    <path d="m6 6 12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>
            </div>
            {boardActionError && <p className="mb-3 text-sm text-error" role="alert">{boardActionError}</p>}
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
              onReorderLinks={pendingDeletes.some((entry) => entry.boardId === selectedBoard._id) ? undefined : (newLinks) => handleReorderLinks(selectedBoardIndex, newLinks)}
              isAddingLink={addingLinkLoading && addLinkModal.boardIdx === selectedBoardIndex}
            />
            {(() => {
              const pending = pendingDeletes.filter((entry) => entry.boardId === selectedBoard._id);
              if (!pending.length) return null;
              return (
                // Keyed by count so each new delete remounts it and moves focus to Undo (the deleted row's button is gone).
                <div key={pending.length} role="status" className="sticky bottom-0 mt-4 flex items-center justify-between gap-3 rounded-lg bg-base-content px-4 py-3 text-sm text-base-100 shadow-lg">
                  <span className="min-w-0 truncate">
                    {pending.length === 1 ? `Deleted “${pending[0].link.title}”` : `Deleted ${pending.length} links`}
                  </span>
                  <button type="button" autoFocus className="shrink-0 rounded px-2 py-1 font-semibold underline-offset-2 hover:underline" onClick={() => undoDeletes(selectedBoard._id)}>
                    Undo
                  </button>
                </div>
              );
            })()}
          </Modal>
        )}
        {boardDeleteTarget && (
          <Modal
            alert
            onClose={() => setBoardDeleteTarget(null)}
            dismissible={!deletingBoard}
            labelledBy="delete-board-title"
            describedBy="delete-board-description"
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error/10 text-error">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3l-7.5-13.1a2 2 0 0 0-3.4 0Z" />
                </svg>
              </div>
              <div>
                <h1 id="delete-board-title" className="text-lg font-bold text-base-content">Delete this board?</h1>
                <p id="delete-board-description" className="mt-1 text-sm text-slate">
                  <span className="font-semibold text-base-content">{boardDeleteTarget.title}</span> and its {boardDeleteTarget.links?.length || 0} {(boardDeleteTarget.links?.length || 0) === 1 ? 'link' : 'links'} will be permanently deleted.
                </p>
              </div>
            </div>
            {boardDeleteError && <p className="mb-3 text-sm text-error" role="alert">{boardDeleteError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setBoardDeleteTarget(null)} disabled={deletingBoard} autoFocus>Cancel</button>
              <button type="button" className="btn btn-error" onClick={() => handleDeleteBoard(boardDeleteTarget)} disabled={deletingBoard}>
                {deletingBoard ? 'Deleting…' : 'Delete board'}
              </button>
            </div>
          </Modal>
        )}
        {leaveBoardTarget && (
          <Modal
            alert
            onClose={() => setLeaveBoardTarget(null)}
            dismissible={!leavingBoard}
            labelledBy="leave-board-title"
            describedBy="leave-board-description"
          >
            <h1 id="leave-board-title" className="text-lg font-bold text-base-content">Leave this shared board?</h1>
            <p id="leave-board-description" className="mt-2 text-sm text-slate">
              You will lose access to <span className="font-semibold text-base-content">{leaveBoardTarget.title}</span>. The board and its links will remain available to the owner and other collaborators.
            </p>
            {leaveBoardError && <p className="mt-3 text-sm text-error" role="alert">{leaveBoardError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setLeaveBoardTarget(null)} disabled={leavingBoard} autoFocus>Cancel</button>
              <button type="button" className="btn btn-error" onClick={() => handleLeaveBoard(leaveBoardTarget)} disabled={leavingBoard}>
                {leavingBoard ? 'Leaving…' : 'Leave board'}
              </button>
            </div>
          </Modal>
        )}
        {modalOpen && (
          <Modal onClose={() => setModalOpen(false)} dismissible={!creatingBoard} labelledBy="create-board-title">
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => { event.preventDefault(); handleAddBoard(); }}
            >
              <h1 id="create-board-title" className="text-lg font-bold">Create a board</h1>
              <div>
                <label htmlFor="board-template" className="text-sm font-medium">Start from a template</label>
                <select
                  id="board-template"
                  className="select select-bordered mt-1 w-full"
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
                <p className="mt-1 text-xs text-steel">{selectedBoardTemplate.description}</p>
              </div>
              <div className="flex justify-center rounded-xl bg-base-200 p-3" aria-label={`${selectedBoardTemplate.title} template preview`}>
                <LinkCard
                  category={newBoardTitle.trim() || (newBoardTemplateId === 'blank' ? 'Your board' : selectedBoardTemplate.title)}
                  links={selectedBoardTemplate.links}
                  isReadOnly
                />
              </div>
              <div>
                <label htmlFor="new-board-title" className="text-sm font-medium">Board name</label>
                <input
                  id="new-board-title"
                  className="input input-bordered mt-1 w-full"
                  placeholder="e.g. Weekend reading"
                  value={newBoardTitle}
                  maxLength={100}
                  required
                  onChange={(event) => {
                    setNewBoardTitle(event.target.value);
                    setCreateBoardError('');
                  }}
                  autoFocus
                />
              </div>
              {createBoardError && <p className="text-sm text-error" role="alert">{createBoardError}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)} disabled={creatingBoard}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creatingBoard || !newBoardTitle.trim()}>
                  {creatingBoard ? 'Creating…' : 'Create board'}
                </button>
              </div>
            </form>
          </Modal>
        )}
        {addLinkModal.open && (
          <Modal
            onClose={() => setAddLinkModal({ open: false, boardIdx: null, linkIdx: null })}
            dismissible={!savingLink}
            labelledBy="link-form-title"
            className="max-w-lg"
          >
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => { event.preventDefault(); handleConfirmAddLink(); }}
            >
              <h1 id="link-form-title" className="text-lg font-bold">{addLinkModal.linkIdx === null ? 'Add a link' : 'Edit link'}</h1>
              <div>
                <label htmlFor="link-url" className="text-sm font-medium">URL</label>
                <input
                  id="link-url"
                  className="input input-bordered mt-1 w-full"
                  placeholder="Paste a link, like example.com"
                  inputMode="url"
                  autoComplete="url"
                  spellCheck={false}
                  value={newLinkUrl}
                  required
                  aria-describedby="link-url-status"
                  onChange={(event) => {
                    setNewLinkUrl(event.target.value);
                    setAddLinkError('');
                  }}
                  autoFocus
                />
                {/* Reserved height keeps the form from jumping while details load. */}
                <p id="link-url-status" className="mt-1.5 flex min-h-5 items-center gap-2 text-sm text-steel" aria-live="polite">
                  {linkPreview.status === 'loading' && (
                    <>
                      <span className="enhanced-button-spinner h-3 w-3" aria-hidden="true" />
                      Looking up the page…
                    </>
                  )}
                  {linkPreview.status === 'done' && (linkPreview.data.siteTitle ? (
                    <>
                      <Favicon link={{ url: linkPreview.url, faviconUrl: linkPreview.data.faviconUrl }} />
                      <span className="truncate">Found “{linkPreview.data.siteTitle}”</span>
                    </>
                  ) : 'No page details found. You can still save the link.')}
                </p>
              </div>
              <div>
                <label htmlFor="link-title" className="flex items-baseline justify-between gap-2 text-sm font-medium">
                  <span>Title</span>
                  <span className="font-normal text-steel">Optional, filled in from the page</span>
                </label>
                <input
                  id="link-title"
                  className="input input-bordered mt-1 w-full"
                  value={newLinkTitle}
                  onChange={(event) => {
                    titleTouched.current = true;
                    setNewLinkTitle(event.target.value);
                    setAddLinkError('');
                  }}
                />
              </div>
              <div>
                <label htmlFor="link-tags" className="flex items-baseline justify-between gap-2 text-sm font-medium">
                  <span>Tags</span>
                  <span className="font-normal text-steel">Optional, separated by commas</span>
                </label>
                <input
                  id="link-tags"
                  className="input input-bordered mt-1 w-full"
                  placeholder="e.g. learning, frontend"
                  value={newLinkTags}
                  onChange={(event) => {
                    setNewLinkTags(event.target.value);
                    setAddLinkError('');
                  }}
                />
              </div>
              <div>
                <label htmlFor="link-note" className="flex items-baseline justify-between gap-2 text-sm font-medium">
                  <span>Note</span>
                  <span className="font-normal text-steel">Optional</span>
                </label>
                <textarea
                  id="link-note"
                  className="textarea textarea-bordered mt-1 w-full"
                  placeholder="Why are you saving this link?"
                  value={newLinkNote}
                  onChange={(event) => {
                    setNewLinkNote(event.target.value);
                    setAddLinkError('');
                  }}
                  rows={2}
                />
              </div>
              {addLinkError && <p className="text-sm text-error" role="alert">{addLinkError}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-ghost" onClick={() => setAddLinkModal({ open: false, boardIdx: null, linkIdx: null })} disabled={savingLink}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingLink || !newLinkUrl.trim()}>
                  {savingLink ? 'Saving…' : addLinkModal.linkIdx === null ? 'Add link' : 'Save'}
                </button>
              </div>
            </form>
          </Modal>
        )}
        {inviteBoard && (
          <Modal onClose={() => setInviteBoard(null)} labelledBy="share-board-title">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <h1 id="share-board-title" className="min-w-0 break-words text-lg font-bold">Share “{inviteBoard.title}”</h1>
                <button type="button" className="btn btn-ghost btn-square btn-sm -mr-2 -mt-1" onClick={() => setInviteBoard(null)} aria-label="Close share dialog" title="Close">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5">
                    <path d="m6 6 12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-slate">Anyone with this link can join within 7 days. After joining, they keep access until they leave or you remove them.</p>
              {inviteLink && (
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
                    className="absolute right-1 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-charcoal transition-colors hover:bg-base-200"
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
              )}
              {inviteNotice && (
                <p className={`rounded-lg px-3 py-2 text-sm ${inviteNotice.success ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`} role="status">
                  {inviteNotice.message}
                </p>
              )}
              {inviteBoard.members?.length > 0 && (
                <div>
                  <h2 className="mb-2 text-sm font-semibold">Collaborators</h2>
                  <ul className="flex flex-col gap-2">
                    {inviteBoard.members.map((member) => (
                      <li key={member.userUid} className="flex items-center justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <span className="block truncate font-medium text-base-content">{member.nickname || 'Collaborator'}</span>
                          <span className="block truncate text-xs text-steel">{member.email}</span>
                        </div>
                        <button
                          type="button"
                          className="shrink-0 text-error hover:underline"
                          onClick={() => {
                            setMemberRemovalTarget({ board: inviteBoard, member });
                            setMemberRemovalError('');
                          }}
                          aria-label={`Remove ${member.nickname || member.email}`}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {inviteError && <p className="text-sm text-error" role="alert">{inviteError}</p>}
              <button type="button" className="btn btn-primary w-full" onClick={handleCreateInvite} disabled={creatingInvite}>
                {creatingInvite ? 'Creating…' : 'Create invite link'}
              </button>
            </div>
          </Modal>
        )}
        {memberRemovalTarget && (
          <Modal
            alert
            onClose={() => setMemberRemovalTarget(null)}
            dismissible={!removingMember}
            labelledBy="remove-collaborator-title"
            describedBy="remove-collaborator-description"
          >
            <h1 id="remove-collaborator-title" className="text-lg font-bold text-base-content">Remove collaborator?</h1>
            <p id="remove-collaborator-description" className="mt-2 text-sm text-slate">
              {memberRemovalTarget.member.nickname || 'This collaborator'} will lose access to “{memberRemovalTarget.board.title}”.
            </p>
            <p className="mt-1 text-sm text-steel">{memberRemovalTarget.member.email}</p>
            {memberRemovalError && <p className="mt-3 text-sm text-error" role="alert">{memberRemovalError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="btn btn-ghost" onClick={() => setMemberRemovalTarget(null)} disabled={removingMember} autoFocus>
                Cancel
              </button>
              <button type="button" className="btn btn-error" onClick={handleRemoveMember} disabled={removingMember}>
                {removingMember ? 'Removing…' : 'Remove collaborator'}
              </button>
            </div>
          </Modal>
        )}
      </main>
      </div>
    </div>
  );
}
  
