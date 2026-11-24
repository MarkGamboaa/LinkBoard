const text = (value) => String(value || '').toLowerCase();

// query: already trimmed + lowercased.
export function linkMatches(link, query) {
  if (!query) return true;
  return [link.title, link.siteTitle, link.description, link.url, link.note, ...(link.tags || [])]
    .some((value) => text(value).includes(query));
}

// Returns the board's matching links with their original index (needed for edit/delete/reorder),
// or null when the board should be hidden. A board whose title matches shows all of its links.
export function matchBoard(board, query) {
  const links = (board.links || []).map((link, index) => ({ link, index }));
  if (!query || text(board.title).includes(query)) return links;
  const matches = links.filter(({ link }) => linkMatches(link, query));
  return matches.length ? matches : null;
}
