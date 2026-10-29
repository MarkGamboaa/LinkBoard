import React, { useState } from "react";
import { getFaviconUrl } from "./utils/linkPreview";

export default function LinkCard({
  category = "UI/UX",
  links = [],
  onDelete,
  onAddLink,
  onDeleteLink,
  onReorderLinks,
  onEditLink,
  headerAction = null,
  footerAction = null,
  ownerLabel = null,
  onOpen,
  expanded = false,
  hideHeader = false,
  searchQuery = "",
  isOwner = false,
  isAddingLink = false,
  isDeletingLink = false,
  isPublic = false,
  onTogglePublic = null,
  isReadOnly = false,
  userEmail = null
}) {
  const [draggedLinkIndex, setDraggedLinkIndex] = useState(null);
  const [slidingLinks, setSlidingLinks] = useState(new Set());
  // Each link is about 64px tall, gap is 16px (gap-4)
  // 3 links: 3*64 = 192px, 2 gaps: 2*16 = 32px, total = 224px
  // Add a little extra for padding/borders if needed
  const maxLinkAreaHeight = 224;
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const boardMatches = normalizedQuery && category.toLowerCase().includes(normalizedQuery);
  const visibleLinks = (Array.isArray(links) ? links : [])
    .map((link, index) => ({ link, index }))
    .filter(({ link }) => !normalizedQuery || boardMatches || [
      link.title,
      link.siteTitle,
      link.description,
      link.url,
      link.note,
      ...(link.tags || []),
    ].some((value) => String(value || "").toLowerCase().includes(normalizedQuery)));

  // Function to determine if a color is dark or light
  const isColorDark = (color) => {
    // Handle hex colors
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness < 128;
    }
    // Handle rgb/rgba colors
    if (color.startsWith('rgb')) {
      const rgb = color.match(/\d+/g);
      if (rgb && rgb.length >= 3) {
        const r = parseInt(rgb[0]);
        const g = parseInt(rgb[1]);
        const b = parseInt(rgb[2]);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness < 128;
      }
    }
    // Default to dark for unknown colors
    return true;
  };

  // Function to get link styling based on background color
  const getLinkStyle = (backgroundColor) => {
    const isDark = isColorDark(backgroundColor);
    return isDark 
      ? "text-white" 
      : "text-black";
  };

  // Link drag and drop handlers
  const handleLinkDragStart = (e, index) => {
    setDraggedLinkIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
  };

  const handleLinkDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleLinkDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedLinkIndex === null || draggedLinkIndex === dropIndex) {
      setDraggedLinkIndex(null);
      return;
    }

    const newLinks = [...links];
    const draggedLink = newLinks[draggedLinkIndex];
    newLinks.splice(draggedLinkIndex, 1);
    newLinks.splice(dropIndex, 0, draggedLink);
    
    // Add sliding animation to all affected links
    const affectedIndices = new Set();
    if (draggedLinkIndex < dropIndex) {
      // Moving forward - animate links in between
      for (let i = draggedLinkIndex; i <= dropIndex; i++) {
        affectedIndices.add(i);
      }
    } else {
      // Moving backward - animate links in between
      for (let i = dropIndex; i <= draggedLinkIndex; i++) {
        affectedIndices.add(i);
      }
    }
    
    setSlidingLinks(affectedIndices);
    
    // Call parent function to update links
    onReorderLinks(newLinks);
    
    setDraggedLinkIndex(null);
    
    // Remove sliding animation after animation completes
    setTimeout(() => {
      setSlidingLinks(new Set());
    }, 400);
  };

  return (
    <div
      className={`${expanded ? 'w-full p-0' : 'bg-white rounded-xl shadow-lg p-4 w-80 card-hover card-enter'} flex flex-col items-center relative ${onOpen && !expanded ? 'cursor-pointer' : ''}`}
      onClick={(event) => {
        if (onOpen && !expanded && !event.target.closest('a, button')) onOpen();
      }}
    >
      {/* Category and Delete */}
      {!hideHeader && <div className="w-full flex justify-between items-start mb-4">
        <div className="flex min-w-0 flex-1 flex-col pr-2">
          {onOpen && !expanded ? (
            <button type="button" onClick={onOpen} className="w-full min-w-0 whitespace-normal break-words [overflow-wrap:anywhere] text-left text-lg font-bold text-blue-700 hover:underline">{category}</button>
          ) : <span className="min-w-0 whitespace-normal break-words [overflow-wrap:anywhere] text-lg font-bold text-blue-700">{category}</span>}
          {(ownerLabel || userEmail) && (
            <span className="text-xs text-gray-500 mt-1">by {ownerLabel || userEmail}</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {headerAction}
          {/* Public/Private Toggle */}
          {!isReadOnly && isOwner && onTogglePublic && (
            <button
              onClick={(e) => {
                console.log('Toggle button clicked!', { isPublic, category });
                e.preventDefault();
                e.stopPropagation();
                onTogglePublic();
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                isPublic 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={isPublic ? 'Make Private' : 'Make Public'}
            >
              {isPublic ? 'Public' : 'Private'}
            </button>
          )}
        </div>
      </div>}
      {/* Links List */}
      {visibleLinks.length > 0 && (
        <div
          className={`flex flex-col gap-4 w-full mb-8 ${visibleLinks.length > 3 ? 'link-list-scroll overflow-y-auto' : ''}`}
          style={visibleLinks.length > 3 ? { maxHeight: maxLinkAreaHeight } : {}}
        >
          {visibleLinks.map(({ link, index: idx }) => (
            <div 
              key={link._id || idx}
              draggable={!isReadOnly && !normalizedQuery}
              onDragStart={!isReadOnly && !normalizedQuery ? (e) => handleLinkDragStart(e, idx) : undefined}
              onDragOver={!isReadOnly && !normalizedQuery ? handleLinkDragOver : undefined}
              onDrop={!isReadOnly && !normalizedQuery ? (e) => handleLinkDrop(e, idx) : undefined}
              className={`draggable-link relative group ${draggedLinkIndex === idx ? 'dragging' : ''} ${slidingLinks.has(idx) ? 'sliding' : ''}`}
            >
              <div
                className={`relative overflow-hidden rounded-lg ${isColorDark(link.color || '#181f29') ? '' : 'border'}`}
                style={{ background: link.color || '#181f29', borderColor: 'rgba(0, 0, 0, 0.16)' }}
              >
                {link.previewImageUrl && (
                  <a href={link.url} target="_blank" rel="noopener noreferrer" tabIndex={-1}>
                    <img src={link.previewImageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="w-full aspect-[16/8] object-cover" />
                  </a>
                )}
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-3 py-2 w-full block no-underline hover:opacity-90 transition-opacity duration-150 pr-8 ${getLinkStyle(link.color || '#181f29')}`}
                >
                  <span className="flex items-center gap-2 font-semibold truncate">
                    {(link.faviconUrl || getFaviconUrl(link.url)) && <img src={link.faviconUrl || getFaviconUrl(link.url)} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.display = 'none'; }} className="w-4 h-4 rounded-sm shrink-0" />}
                    <span className="truncate">{link.siteTitle || link.title}</span>
                  </span>
                  {link.siteTitle && link.siteTitle !== link.title && <span className="text-xs opacity-80 truncate block">Saved as: {link.title}</span>}
                  <span className="text-xs truncate block">{link.url}</span>
              {expanded && link.description && <span className="text-xs mt-1 line-clamp-2 block">{link.description}</span>}
                </a>
                {expanded && (link.note || link.tags?.length > 0) && (
                  <div className={`px-3 pb-3 ${isColorDark(link.color || '#181f29') ? 'text-white/85' : 'text-gray-800'}`}>
                    {link.note && <p className="text-xs leading-relaxed">{link.note}</p>}
                    {link.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {link.tags.map((tag) => <span key={tag} className="rounded-full bg-white/90 text-indigo-700 px-2 py-0.5 text-[11px]">#{tag}</span>)}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {expanded && !isReadOnly && onEditLink && (
                <button
                  type="button"
                  onClick={(event) => { event.stopPropagation(); onEditLink(idx); }}
                  className="absolute top-2 right-9 flex h-6 w-6 items-center justify-center rounded bg-white/90 text-gray-700 shadow transition-opacity hover:bg-white md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
                  title="Edit link"
                  aria-label={`Edit ${link.title || 'link'}`}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 2.65 2.65M4 20l4.2-.9L19.5 7.8a1.875 1.875 0 0 0-2.65-2.65L5.55 16.45 4 20Z" />
                  </svg>
                </button>
              )}
              {expanded && !isReadOnly && (
                <button
                  type="button"
                  onClick={(event) => { event.stopPropagation(); onDeleteLink && onDeleteLink(idx); }}
                  disabled={isDeletingLink}
                  className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-gray-900 shadow transition-opacity hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
                  title="Delete link"
                  aria-label={`Delete ${link.title || 'link'}`}
                >
                  {isDeletingLink ? (
                    <span className="enhanced-button-spinner w-3 h-3"></span>
                  ) : (
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 11v6m4-6v6M5.5 7l.8 13h11.4l.8-13M9 7V4h6v3" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {normalizedQuery && visibleLinks.length === 0 && <p className="text-xs text-gray-500 mb-6">No matching links in this board.</p>}
      {/* Add Link Button */}
      {!isReadOnly && (
        <button
          onClick={onAddLink}
          disabled={isAddingLink}
          className={`bg-[#4632e6] hover:bg-[#3620b7] text-white font-semibold rounded-full px-5 py-1 flex items-center gap-2 text-m shadow-md transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed button-press ${isAddingLink ? 'enhanced-button-loading' : ''}`}
        >
          {isAddingLink ? (
            <>
              <span className="enhanced-button-spinner w-3 h-3"></span>
              Adding...
            </>
          ) : (
            <>
              Add Link <span className="text-2xl">＋</span>
            </>
          )}
        </button>
      )}
      {footerAction}
    </div>
  );
}
