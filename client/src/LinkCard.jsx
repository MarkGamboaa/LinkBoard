import React from "react";

export default function LinkCard({
  category = "UI/UX",
  links = [],
  onDelete,
  onAddLink,
  onDeleteLink
}) {
  // Each link is about 64px tall, gap is 16px (gap-4)
  // 3 links: 3*64 = 192px, 2 gaps: 2*16 = 32px, total = 224px
  // Add a little extra for padding/borders if needed
  const maxLinkAreaHeight = 224;

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 w-80 flex flex-col items-center relative">
      {/* Category and Delete */}
      <div className="w-full flex justify-between items-center mb-4">
        <span className="text-blue-700 font-bold text-lg">{category}</span>
        <button onClick={onDelete} className="text-red-500 hover:text-red-700 text-xl font-bold" title="Delete Board">
          &#10005;
        </button>
      </div>
      {/* Links List */}
      {Array.isArray(links) && links.length > 0 && (
        <div
          className={`flex flex-col gap-4 w-full mb-8 ${links.length > 3 ? 'overflow-y-auto' : ''}`}
          style={links.length > 3 ? { maxHeight: maxLinkAreaHeight } : {}}
        >
          {links.map((link, idx) => (
            <div key={idx} className="relative group">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ background: link.color || '#181f29' }}
                className="rounded-lg px-3 py-2 w-full block text-white no-underline hover:opacity-90 transition-opacity duration-150 pr-8"
              >
                <span className="font-semibold truncate block">{link.title}</span>
                <span className="text-xs truncate block">{link.url}</span>
              </a>
              <button
                onClick={() => onDeleteLink && onDeleteLink(idx)}
                className="absolute top-2 right-2 text-red-300 hover:text-red-600 text-lg font-bold bg-transparent border-none p-0 m-0 cursor-pointer opacity-80 group-hover:opacity-100"
                title="Delete Link"
                tabIndex={-1}
              >
                &#10005;
              </button>
            </div>
          ))}
        </div>
      )}
      {/* Add Link Button */}
      <button
        onClick={onAddLink}
        className="bg-[#4632e6] hover:bg-[#3620b7] text-white font-semibold rounded-full px-8 py-3 flex items-center gap-2 text-lg shadow-md transition-colors duration-150"
      >
        Add Link <span className="text-2xl">＋</span>
      </button>
    </div>
  );
} 