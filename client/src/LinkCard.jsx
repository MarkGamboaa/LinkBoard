import { useRef, useState } from "react";
import { getDomain, getFaviconUrl } from "./utils/linkPreview";
import { matchBoard } from "./utils/search";

const COMPACT_LIMIT = 5;
const VIEW_KEY = "linkboard:link-view";

const readView = () => {
  try { return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid"; } catch { return "grid"; }
};

export function Favicon({ link, size = 16 }) {
  const [failed, setFailed] = useState(false);
  const src = link.faviconUrl || getFaviconUrl(link.url);
  const letter = (getDomain(link.url) || link.title || "?").charAt(0).toUpperCase();
  const box = { width: size, height: size };

  if (!src || failed) {
    return (
      <span aria-hidden="true" style={{ ...box, fontSize: Math.round(size * 0.6) }} className="grid shrink-0 place-items-center rounded bg-base-300 font-semibold text-slate">
        {letter}
      </span>
    );
  }
  return (
    <img src={src} alt="" style={box} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="shrink-0 rounded-sm object-contain" />
  );
}

function PreviewImage({ link }) {
  const [failed, setFailed] = useState(false);
  if (!link.previewImageUrl || failed) {
    return (
      <div className="grid h-full place-items-center">
        <Favicon link={link} size={32} />
      </div>
    );
  }
  return (
    <img src={link.previewImageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-full w-full object-cover" />
  );
}

function Tags({ tags }) {
  if (!tags?.length) return null;
  return (
    <ul className="flex flex-wrap gap-1" aria-label="Tags">
      {tags.map((tag) => (
        <li key={tag} className="rounded bg-base-200 px-1.5 py-0.5 text-xs text-slate">#{tag}</li>
      ))}
    </ul>
  );
}

const iconButton = "flex h-8 w-8 items-center justify-center rounded-md text-steel transition-colors hover:bg-base-200 hover:text-base-content disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Keyboard- and touch-friendly reordering, alongside mouse drag. A plain button group in a native
 * popover (not an ARIA menu): Tab moves between the four actions, Esc or an outside click closes it.
 */
export function MoveMenu({ id, label, index, count, onMove }) {
  const popover = useRef(null);
  if (count < 2) return null;
  const popoverId = `move-${id}`;
  const actions = [
    ["Move to top", 0, index > 0],
    ["Move up", index - 1, index > 0],
    ["Move down", index + 1, index < count - 1],
    ["Move to bottom", count - 1, index < count - 1],
  ];
  return (
    <>
      <button
        type="button"
        popoverTarget={popoverId}
        className={iconButton}
        style={{ anchorName: `--${popoverId}` }}
        aria-label={`Move ${label}`}
        title="Move"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M8 4v16M8 4 4.5 7.5M8 4l3.5 3.5M16 20V4m0 16-3.5-3.5M16 20l3.5-3.5" />
        </svg>
      </button>
      <div id={popoverId} ref={popover} popover="auto" className="move-menu" style={{ positionAnchor: `--${popoverId}` }} aria-label={`Move ${label}`}>
        {actions.map(([text, to, enabled]) => (
          <button
            key={text}
            type="button"
            disabled={!enabled}
            onClick={() => {
              // Close first: hiding returns focus to the trigger, which then travels with the moved row.
              popover.current?.hidePopover();
              onMove(index, to);
            }}
          >
            {text}
          </button>
        ))}
      </div>
    </>
  );
}

function LinkActions({ link, onEdit, onDelete, move }) {
  const name = link.title || link.siteTitle || "link";
  return (
    <div className="flex shrink-0 items-center">
      {move}
      {onEdit && (
        <button type="button" onClick={onEdit} className={iconButton} aria-label={`Edit ${name}`} title="Edit link">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 2.65 2.65M4 20l4.2-.9L19.5 7.8a1.875 1.875 0 0 0-2.65-2.65L5.55 16.45 4 20Z" />
          </svg>
        </button>
      )}
      {onDelete && (
        <button type="button" onClick={onDelete} className={`${iconButton} hover:text-error`} aria-label={`Delete ${name}`} title="Delete link">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 11v6m4-6v6M5.5 7l.8 13h11.4l.8-13M9 7V4h6v3" />
          </svg>
        </button>
      )}
    </div>
  );
}

function ViewToggle({ view, onChange }) {
  const options = [
    { value: "grid", label: "Grid", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" /> },
    { value: "list", label: "List", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /> },
  ];
  return (
    <fieldset className="flex rounded-lg border border-hairline-strong p-0.5">
      <legend className="sr-only">Link layout</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className="flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium text-slate transition-colors hover:text-base-content has-[:checked]:bg-base-300 has-[:checked]:text-base-content has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary"
        >
          <input type="radio" name="link-layout" value={option.value} checked={view === option.value} onChange={() => onChange(option.value)} className="sr-only" />
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">{option.icon}</svg>
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}

export default function LinkCard({
  category = "",
  links = [],
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
  isPublic = false,
  onTogglePublic = null,
  isReadOnly = false,
  userEmail = null,
  className = "w-80 max-w-full",
}) {
  const [draggedLinkIndex, setDraggedLinkIndex] = useState(null);
  const [view, setView] = useState(readView);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const isFiltering = Boolean(normalizedQuery);
  const visibleLinks = matchBoard({ title: category, links: Array.isArray(links) ? links : [] }, normalizedQuery) || [];
  // Compact board cards show a preview of the board; the full list lives in the board view.
  const shownLinks = !expanded && onOpen ? visibleLinks.slice(0, COMPACT_LIMIT) : visibleLinks;
  const hiddenCount = visibleLinks.length - shownLinks.length;
  const canDrag = !isReadOnly && !isFiltering && Boolean(onReorderLinks);

  const changeView = (next) => {
    setView(next);
    try { localStorage.setItem(VIEW_KEY, next); } catch { /* storage blocked: choice lasts this visit */ }
  };

  const dragProps = (index) => canDrag ? {
    draggable: true,
    onDragStart: (event) => {
      setDraggedLinkIndex(index);
      event.dataTransfer.effectAllowed = "move";
    },
    onDragOver: (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    },
    onDrop: (event) => {
      event.preventDefault();
      if (draggedLinkIndex !== null && draggedLinkIndex !== index) {
        moveLink(draggedLinkIndex, index);
      }
      setDraggedLinkIndex(null);
    },
    onDragEnd: () => setDraggedLinkIndex(null),
  } : {};

  const moveLink = (from, to) => {
    const reordered = [...links];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    onReorderLinks(reordered);
  };

  const actionsFor = (link, index) => (expanded && !isReadOnly ? (
    <LinkActions
      link={link}
      onEdit={onEditLink ? () => onEditLink(index) : null}
      onDelete={onDeleteLink ? () => onDeleteLink(index) : null}
      move={canDrag ? <MoveMenu id={link._id} label={link.title || "link"} index={index} count={links.length} onMove={moveLink} /> : null}
    />
  ) : null);

  const title = (link) => link.title || link.siteTitle || getDomain(link.url);

  const compactRow = ({ link, index }) => (
    <li key={link._id || index} {...dragProps(index)} className={`draggable-link ${draggedLinkIndex === index ? "dragging" : ""}`}>
      <a href={link.url} target="_blank" rel="noopener noreferrer" className="-mx-2 flex items-center gap-2.5 rounded-md px-2 py-1.5 no-underline transition-colors hover:bg-base-200">
        <Favicon link={link} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-base-content">{title(link)}</span>
        <span className="max-w-[40%] shrink-0 truncate text-xs text-steel">{getDomain(link.url)}</span>
      </a>
    </li>
  );

  const listRow = ({ link, index }) => (
    <li key={link._id || index} {...dragProps(index)} className={`draggable-link flex items-center gap-3 border-b border-hairline py-2 last:border-b-0 ${draggedLinkIndex === index ? "dragging" : ""}`}>
      <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-3 rounded-md py-1 no-underline">
        <Favicon link={link} size={20} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-base-content">{title(link)}</span>
          <span className="block truncate text-sm text-steel">
            {getDomain(link.url)}
            {(link.note || link.description) && <span className="text-slate"> · {link.note || link.description}</span>}
          </span>
        </span>
      </a>
      <div className="hidden md:block"><Tags tags={link.tags} /></div>
      {actionsFor(link, index)}
    </li>
  );

  const gridCard = ({ link, index }) => (
    <li key={link._id || index} {...dragProps(index)} className={`draggable-link card-hover flex flex-col overflow-hidden rounded-xl border border-hairline bg-card ${draggedLinkIndex === index ? "dragging" : ""}`}>
      <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex flex-1 flex-col no-underline">
        <div className="aspect-[1.91/1] overflow-hidden border-b border-hairline bg-base-200">
          <PreviewImage link={link} />
        </div>
        <div className="flex flex-col gap-1 p-3 pb-2">
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-steel">
            <Favicon link={link} size={14} />
            <span className="truncate">{getDomain(link.url)}</span>
          </span>
          <span className="line-clamp-2 font-medium leading-snug text-base-content">{title(link)}</span>
          {link.description && <span className="line-clamp-2 text-sm text-slate">{link.description}</span>}
          {link.note && <span className="line-clamp-3 text-sm text-charcoal">{link.note}</span>}
        </div>
      </a>
      {(link.tags?.length > 0 || actionsFor(link, index)) && (
        <div className="flex items-end justify-between gap-2 px-3 pb-2">
          <Tags tags={link.tags} />
          <span className="ml-auto">{actionsFor(link, index)}</span>
        </div>
      )}
    </li>
  );

  const addButton = !isReadOnly && onAddLink && (
    <button
      type="button"
      onClick={onAddLink}
      disabled={isAddingLink}
      className={expanded ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm -mx-2 justify-start gap-2 font-medium text-slate hover:text-base-content"}
    >
      {isAddingLink ? (
        <span className="enhanced-button-spinner h-3 w-3" aria-hidden="true" />
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
          <path d="M12 5v14M5 12h14" />
        </svg>
      )}
      {isAddingLink ? "Adding…" : "Add link"}
    </button>
  );

  if (expanded) {
    return (
      <div className="flex w-full flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          {visibleLinks.length > 0 ? <ViewToggle view={view} onChange={changeView} /> : <span />}
          {addButton}
        </div>
        {visibleLinks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-hairline-strong px-4 py-10 text-center text-sm text-steel">
            {isFiltering ? "No links in this board match your search." : "No links yet. Add the first one to start this board."}
          </p>
        ) : view === "grid" ? (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">{visibleLinks.map(gridCard)}</ul>
        ) : (
          <ul className="flex flex-col">{visibleLinks.map(listRow)}</ul>
        )}
      </div>
    );
  }

  return (
    <div
      className={`card-enter flex ${className} flex-col rounded-xl border border-hairline bg-card p-4 ${onOpen ? "card-hover cursor-pointer" : ""}`}
      onClick={(event) => {
        if (onOpen && !event.target.closest("a, button, input, label, [popover]")) onOpen();
      }}
    >
      {!hideHeader && (
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-col">
            {/* A heading per board lets screen-reader users jump between boards. */}
            <h2 className="min-w-0 break-words text-base font-semibold text-base-content [overflow-wrap:anywhere]">
              {onOpen ? (
                <button type="button" onClick={onOpen} className="text-left hover:underline">{category}</button>
              ) : category}
            </h2>
            {(ownerLabel || userEmail) && <span className="mt-0.5 text-xs text-steel">by {ownerLabel || userEmail}</span>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerAction}
            {!isReadOnly && isOwner && onTogglePublic && (
              <button
                type="button"
                onClick={onTogglePublic}
                className={`min-h-7 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${isPublic ? "border-success/30 bg-success/10 text-success hover:bg-success/15" : "border-hairline-strong text-slate hover:bg-base-200"}`}
                aria-label={isPublic ? `${category} is public. Make it private` : `${category} is private. Make it public`}
              >
                {isPublic ? "Public" : "Private"}
              </button>
            )}
          </div>
        </div>
      )}
      {shownLinks.length > 0 && <ul className="mb-2 flex flex-col">{shownLinks.map(compactRow)}</ul>}
      {isFiltering && visibleLinks.length === 0 && <p className="mb-2 text-xs text-steel">No matching links in this board.</p>}
      {!isFiltering && visibleLinks.length === 0 && !isReadOnly && <p className="mb-2 text-sm text-steel">No links yet.</p>}
      {hiddenCount > 0 && (
        <button type="button" onClick={onOpen} className="mb-1 self-start text-sm font-medium text-link hover:underline">
          View all {visibleLinks.length} links
        </button>
      )}
      {addButton}
      {footerAction}
    </div>
  );
}
