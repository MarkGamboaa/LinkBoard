// Never more columns than boards, so one or two boards stay a readable width instead of leaving empty columns.
export const masonryColumns = (count) => ({
  default: Math.min(count, 4) || 1,
  1400: Math.min(count, 3) || 1,
  1100: Math.min(count, 2) || 1,
  640: 1,
});
