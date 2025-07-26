import React, { useState } from "react";
import logout from "./assets/logout-arrow.svg";
import profile from "./assets/profile.svg";
import deleteIcon from "./assets/delete.svg";


export default function Dashboard() {
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('board'); // 'board' or 'link'
  const [boardTitle, setBoardTitle] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkColor, setLinkColor] = useState("bg-neutral-800");
  const [boards, setBoards] = useState([]);
  const [selectedBoardIdx, setSelectedBoardIdx] = useState(null);
  const handleClose = () => {
    setShowModal(false);
    setBoardTitle("");
    setLinkTitle("");
    setLinkUrl("");
    setLinkColor("bg-neutral-800");
    setSelectedBoardIdx(null);
    setModalType('board');
  };
  const handleCreateBoard = (e) => {
    e.preventDefault();
    if (boardTitle.trim()) {
      setBoards(prev => [...prev, { title: boardTitle, links: [] }]);
    }
    handleClose();
  };
  const handleCreateLink = (e) => {
    e.preventDefault();
    if (linkTitle.trim() && linkUrl.trim() && selectedBoardIdx !== null) {
      let url = linkUrl.trim();
      // If starts with www., prepend https://
      if (/^www\./i.test(url)) {
        url = 'https://' + url;
      }
      setBoards(prev => prev.map((b, i) => i === selectedBoardIdx ? { ...b, links: [...b.links, { name: linkTitle, url: url, color: linkColor }] } : b));
    }
    handleClose();
  };

  const handleDeleteLink = (boardIdx, linkIdx) => {
    setBoards(prev => prev.map((b, i) =>
      i === boardIdx ? { ...b, links: b.links.filter((_, lidx) => lidx !== linkIdx) } : b
    ));
  };
  const handleDelete = (idx) => {
    setBoards(prev => prev.filter((_, i) => i !== idx));
  };
  const openAddLinkModal = (idx) => {
    setSelectedBoardIdx(idx);
    setModalType('link');
    setShowModal(true);
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-100 to-blue-200 p-6 md:p-12">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <span className="text-3xl md:text-4xl font-extrabold text-blue-700">LinkBoard</span>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 bg-white shadow px-4 py-2 rounded-md font-medium text-gray-700 hover:bg-gray-100 transition">
            <img src={profile} alt="profile" className="object-contain w-4 h-4" />
            Hi, Mark
          </button>
          <button className="flex items-center gap-2 bg-white shadow px-4 py-2 rounded-md font-medium text-gray-700 hover:bg-gray-100 transition">
            Logout
            <img src={logout} alt="logout" className="object-contain w-4 h-4" />
          </button>
        </div>
      </div>
      {/* Main Board Area */}
      <div className="rounded-2xl bg-white bg-opacity-70 shadow-xl p-4 md:p-8 w-full h-[90vh] md:h-[76vh] flex flex-col relative mx-auto" style={{boxShadow: '5px 4px 10px 0 rgba(0,0,0,0.3)'}}>
        {/* Board content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-start">
            {boards.map((board, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl px-8 py-4 w-[400px] h-[380px] relative flex flex-col"
                style={{
                  boxShadow: '0 8px 32px 0 rgba(30,41,59,0.18), 0 1.5px 8px 0 rgba(30,41,59,0.10)'
                }}
              >
              <div className="flex justify-between items-start mb-3">
                <span className="font-bold text-blue-700 text-xl">{board.title}</span>
                <button onClick={() => handleDelete(idx)} className="hover:scale-110 transition">
                  <img src={deleteIcon} alt="delete" className="w-5 h-5" />
                </button>
              </div>
              <div className="relative mb-6">
                <div
                  className="flex flex-col gap-3 pr-1 custom-scrollbar"
                  style={{
                    overflowY: board.links && board.links.length > 3 ? 'auto' : 'visible',
                    maxHeight: board.links && board.links.length > 3 ? '216px' : 'none',
                    minHeight: '32px',
                    overflowX: 'hidden'
                  }}
                >
      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #2563eb;
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #2563eb transparent;
        }
      `}</style>
                  {board.links && board.links.map((link, lidx) => (
                    <div key={lidx} className="relative group">
                      <a
                        href={link.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`rounded-xl px-4 py-2 font-semibold text-white text-left shadow transition hover:brightness-110 flex flex-col ${link.color}`}
                        style={{ minWidth: 0, wordBreak: 'break-word' }}
                      >
                        <span className="truncate text-base md:text-lg font-bold leading-tight mb-1">{link.name || link}</span>
                        <span className="truncate text-xs md:text-sm font-normal opacity-80 leading-tight">{link.url}</span>
                      </a>
                      <button
                        onClick={() => handleDeleteLink(idx, lidx)}
                        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-white text-lg font-bold p-0 hover:scale-110 transition"
                        title="Delete Link"
                        style={{lineHeight: 1, background: 'none', boxShadow: 'none', border: 'none'}}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-center">
                <button
                  className="flex items-center gap-2 bg-blue-700 text-white px-6 py-2 rounded-xl font-semibold text-base shadow hover:bg-blue-800 transition"
                  onClick={() => openAddLinkModal(idx)}
                >
                  Add Link
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v8m-4-4h8"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
        {/* End of board content grid */}
      </div>
      {/* Fixed Add Board button */}
      <button
        className="z-50 flex items-center gap-2 bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow hover:bg-blue-800 transition"
        style={{position: 'absolute', bottom: '32px', right: '32px'}}
        onClick={() => setShowModal(true)}
      >
        Add Board
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v8m-4-4h8"/></svg>
      </button>
        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-5 w-[340px] max-w-full relative animate-fadeIn">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-blue-700 text-base">
                  {modalType === 'board' ? 'Board Title' : 'Add Link'}
                </span>
                <button onClick={handleClose} className="text-gray-500 hover:text-black text-lg font-bold">&times;</button>
              </div>
              {modalType === 'board' ? (
                <form onSubmit={handleCreateBoard}>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm"
                    placeholder="Enter board title"
                    value={boardTitle}
                    onChange={e => setBoardTitle(e.target.value)}
                    required
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow hover:bg-blue-800 transition"
                    >
                      Create Board
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v8m-4-4h8"/></svg>
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleCreateLink} autoComplete="off" noValidate>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm"
                    placeholder="Enter link name (e.g. Facebook, GitHub, Youtube)"
                    value={linkTitle}
                    onChange={e => setLinkTitle(e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm"
                    placeholder="Enter link URL (e.g. https://facebook.com or www.facebook.com)"
                    value={linkUrl}
                    onChange={e => setLinkUrl(e.target.value)}
                    required
                    pattern=".*"
                  />
                  <div className="flex gap-2 mb-4">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        className="accent-blue-700"
                        name="linkColor"
                        value="bg-blue-700"
                        checked={linkColor === 'bg-blue-700'}
                        onChange={e => setLinkColor(e.target.value)}
                      />
                      <span className="w-5 h-5 rounded bg-blue-700 inline-block"></span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        className="accent-neutral-800"
                        name="linkColor"
                        value="bg-neutral-800"
                        checked={linkColor === 'bg-neutral-800'}
                        onChange={e => setLinkColor(e.target.value)}
                      />
                      <span className="w-5 h-5 rounded bg-neutral-800 inline-block"></span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        className="accent-red-500"
                        name="linkColor"
                        value="bg-red-500"
                        checked={linkColor === 'bg-red-500'}
                        onChange={e => setLinkColor(e.target.value)}
                      />
                      <span className="w-5 h-5 rounded bg-red-500 inline-block"></span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        className="accent-blue-400"
                        name="linkColor"
                        value="bg-blue-400"
                        checked={linkColor === 'bg-blue-400'}
                        onChange={e => setLinkColor(e.target.value)}
                      />
                      <span className="w-5 h-5 rounded bg-blue-400 inline-block"></span>
                    </label>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow hover:bg-blue-800 transition"
                    >
                      Add Link
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v8m-4-4h8"/></svg>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
