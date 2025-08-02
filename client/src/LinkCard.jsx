import React, { useState } from "react";

export default function LinkCard({
  category = "UI/UX",
  links = [],
  onDelete,
  onAddLink,
  onDeleteLink,
  onReorderLinks,
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

  // Function to get delete button styling based on background color
  const getDeleteButtonStyle = (backgroundColor) => {
    const isDark = isColorDark(backgroundColor);
    return isDark 
      ? "text-white hover:text-gray-300" 
      : "text-black hover:text-gray-700";
  };

  // Function to get link styling based on background color
  const getLinkStyle = (backgroundColor) => {
    const isDark = isColorDark(backgroundColor);
    return isDark 
      ? "text-white" 
      : "text-black border border-gray-300";
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
    <div className="bg-white rounded-xl shadow-lg p-4 w-80 flex flex-col items-center relative card-hover card-enter">
      {/* Category and Delete */}
      <div className="w-full flex justify-between items-center mb-4">
        <div className="flex flex-col">
          <span className="text-blue-700 font-bold text-lg">{category}</span>
          {userEmail && (
            <span className="text-xs text-gray-500 mt-1">by {userEmail}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Public/Private Toggle */}
          {!isReadOnly && onTogglePublic && (
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
          {/* Delete Button */}
          {!isReadOnly && (
            <button onClick={onDelete} className="text-red-500 hover:text-red-700 text-xl font-bold" title="Delete Board">
              &#10005;
            </button>
          )}
        </div>
      </div>
      {/* Links List */}
      {Array.isArray(links) && links.length > 0 && (
        <div
          className={`flex flex-col gap-4 w-full mb-8 ${links.length > 3 ? 'overflow-y-auto' : ''}`}
          style={links.length > 3 ? { maxHeight: maxLinkAreaHeight } : {}}
        >
          {links.map((link, idx) => (
            <div 
              key={idx} 
              draggable={!isReadOnly}
              onDragStart={!isReadOnly ? (e) => handleLinkDragStart(e, idx) : undefined}
              onDragOver={!isReadOnly ? handleLinkDragOver : undefined}
              onDrop={!isReadOnly ? (e) => handleLinkDrop(e, idx) : undefined}
              className={`draggable-link relative group ${draggedLinkIndex === idx ? 'dragging' : ''} ${slidingLinks.has(idx) ? 'sliding' : ''}`}
            >
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ background: link.color || '#181f29' }}
                className={`rounded-lg px-3 py-2 w-full block no-underline hover:opacity-90 transition-opacity duration-150 pr-8 ${getLinkStyle(link.color || '#181f29')}`}
              >
                <span className="font-semibold truncate block">{link.title}</span>
                <span className="text-xs truncate block">{link.url}</span>
              </a>
              {!isReadOnly && (
                <button
                  onClick={() => onDeleteLink && onDeleteLink(idx)}
                  disabled={isDeletingLink}
                  className={`absolute top-2 right-2 text-lg font-bold bg-transparent border-none p-0 m-0 cursor-pointer opacity-80 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed ${getDeleteButtonStyle(link.color || '#181f29')}`}
                  title="Delete Link"
                  tabIndex={-1}
                >
                  {isDeletingLink ? (
                    <span className="enhanced-button-spinner w-3 h-3"></span>
                  ) : (
                    <span>&#10005;</span>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
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
    </div>
  );
} 