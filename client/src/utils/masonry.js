// Never more columns than boards, so one or two boards stay a readable width instead of leaving empty columns.
export const masonryColumns = (count) => ({
  default: Math.min(count, 4) || 1,
  1400: Math.min(count, 3) || 1,
  1100: Math.min(count, 2) || 1,
  640: 1,
});

// The board area is sized to its columns (about 380px each) and centred, so the heading and
// New board button line up with the first and last board however many boards there are.
export const boardAreaWidth = (count) => {
  const columns = Math.min(count, 4) || 1;
  return `${columns * 380 + (columns - 1) * 16}px`;
};
