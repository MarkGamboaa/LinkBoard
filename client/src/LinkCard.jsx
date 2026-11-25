import { useState } from "react";
import { getDomain, getFaviconUrl, getOwnFaviconUrl, getVideoEmbed, getYouTubeThumbnail, readShowDomains } from "./utils/linkPreview";
import { matchBoard } from "./utils/search";

const COMPACT_LIMIT = 5;
const VIEW_KEY = "linkboard:link-view";

const readView = () => {
  try { return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid"; } catch { return "grid"; }
};


export function Favicon({ link, size = 16 }) {
  // Try the stored icon, then the site's own /favicon.ico, then Google (which shows a globe for sites it hasn't indexed).
  const sources = [link.faviconUrl, getOwnFaviconUrl(link.url), getFaviconUrl(link.url)].filter(Boolean);
  const [step, setStep] = useState(0);
  const src = sources[step];
  const letter = (getDomain(link.url) || link.title || "?").charAt(0).toUpperCase();
  const box = { width: size, height: size };

  if (!src) {
    return (
      <span aria-hidden="true" style={{ ...box, fontSize: Math.round(size * 0.6) }} className="grid shrink-0 place-items-center rounded bg-base-300 font-semibold text-slate">
        {letter}
      </span>
    );
  }
  return (
    <img src={src} alt="" style={box} loading="lazy" referrerPolicy="no-referrer" onError={() => setStep((n) => n + 1)} className="shrink-0 rounded-sm object-contain" />
  );
}

function PreviewImage({ link }) {
  const [failed, setFailed] = useState(false);
  const embed = getVideoEmbed(link.url);
  if (embed) {
    // Clicks pass through to the card's link, so the player reads as a still cover.
    return (
      <iframe
        src={embed.src}
        title={embed.title}
        loading="lazy"
        tabIndex={-1}
        aria-hidden="true"
        scrolling="no"
        // Instagram's embed starts with a ~56px profile header; shift it out of view so the photo shows.
        className={`pointer-events-none w-full border-0 ${embed.site === "instagram" ? "-mt-14 h-[calc(100%+3.5rem)]" : "h-full"}`}
      />
    );
  }
  const src = link.previewImageUrl || getYouTubeThumbnail(link.url);
  if (!src || failed) {
    return (
      <div className="grid h-full place-items-center">
        <Favicon link={link} size={32} />
      </div>
    );
  }
  return (
    <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-full w-full object-cover" />
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

function LinkActions({ link, onEdit, onDelete }) {
  const name = link.title || link.siteTitle || "link";
  return (
    <div className="flex shrink-0 items-center">
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
  sharedWith = 0,
}) {
  const [draggedLinkIndex, setDraggedLinkIndex] = useState(null);
  const [view, setView] = useState(readView);
  const showDomains = readShowDomains(); // read each render so the dashboard's profile sync shows up

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
    />
  ) : null);

  const title = (link) => link.title || link.siteTitle || getDomain(link.url);

  const compactRow = ({ link, index }) => (
    <li key={link._id || index} {...dragProps(index)} className={`draggable-link border-t border-hairline ${draggedLinkIndex === index ? "dragging" : ""}`}>
      <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex min-h-9 items-center gap-2.5 px-5 py-1.5 no-underline transition-colors hover:bg-surface">
        <Favicon link={link} />
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-base-content">{title(link)}</span>
        {showDomains && <span className="max-w-[45%] shrink-0 truncate text-[13px] tabular-nums text-steel">{getDomain(link.url)}</span>}
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

  const footerRow = "flex w-full items-center gap-2 border-t border-hairline px-5 py-2.5 text-left text-sm transition-colors hover:bg-surface";

  return (
    <div
      className={`card-enter flex ${className} flex-col overflow-hidden rounded-[14px] border border-hairline-strong bg-card shadow-[0_6px_18px_-10px_rgb(70_50_230/0.35)] ${onOpen ? "card-hover cursor-pointer" : ""}`}
      onClick={(event) => {
        if (onOpen && !event.target.closest("a, button, input, label, [popover]")) onOpen();
      }}
    >
      {!hideHeader && (
        <div className="flex items-start gap-2.5 px-5 pb-3 pt-4">
          <div className="min-w-0 flex-1">
            {/* A heading per board lets screen-reader users jump between boards. */}
            <h2 className="break-words text-2xl font-extrabold leading-tight tracking-[-0.02em] text-base-content [overflow-wrap:anywhere]">
              {onOpen ? (
                <button type="button" onClick={onOpen} className="text-left hover:underline">{category}</button>
              ) : category}
            </h2>
            {(ownerLabel || userEmail) && <p className="mt-0.5 text-xs text-steel">by {ownerLabel || userEmail}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2 pt-1">
            {sharedWith > 0 && (
              // Collaborators on this board: a people icon and count, so shared boards stand out at a glance.
              <span className="inline-flex min-h-7 items-center gap-1 rounded-full border-[1.5px] border-primary px-2 text-xs font-bold text-primary" title={`Shared with ${sharedWith} ${sharedWith === 1 ? "person" : "people"}`}>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span aria-hidden="true">{sharedWith}</span>
                <span className="sr-only">Shared with {sharedWith} {sharedWith === 1 ? "person" : "people"}</span>
              </span>
            )}
            {headerAction}
            {!isReadOnly && isOwner && onTogglePublic && (
              <button
                type="button"
                onClick={onTogglePublic}
                className={`min-h-7 rounded-full border-[1.5px] px-2.5 text-xs font-bold transition-colors ${isPublic ? "border-success text-success hover:bg-success/10" : "border-hairline-strong text-slate hover:border-primary hover:text-primary"}`}
                aria-label={isPublic ? `${category} is public. Make it private` : `${category} is private. Make it public`}
              >
                {isPublic ? "Public" : "Private"}
              </button>
            )}
          </div>
          {/* Size, not weight, carries the count: one light numeral in the logo blue. */}
          <span className="shrink-0 text-2xl font-light leading-tight tabular-nums text-blue" aria-hidden="true">{links.length}</span>
          <span className="sr-only">{links.length} {links.length === 1 ? "link" : "links"}</span>
        </div>
      )}
      {shownLinks.length > 0 && <ul className="flex flex-col">{shownLinks.map(compactRow)}</ul>}
      {isFiltering && visibleLinks.length === 0 && <p className="border-t border-hairline px-5 py-3 text-sm text-steel">No matching links in this board.</p>}
      {!isFiltering && visibleLinks.length === 0 && !isReadOnly && <p className="border-t border-hairline px-5 py-3 text-sm text-steel">No links yet.</p>}
      {hiddenCount > 0 && (
        <button type="button" onClick={onOpen} className={`${footerRow} font-semibold text-link`}>
          View all {visibleLinks.length} links
        </button>
      )}
      {!isReadOnly && onAddLink && (
        <button type="button" onClick={onAddLink} disabled={isAddingLink} className={`${footerRow} font-bold text-primary disabled:opacity-60`}>
          <span aria-hidden="true">+</span> {isAddingLink ? "Adding…" : "Add link"}
        </button>
      )}
      {footerAction}
    </div>
  );
}
