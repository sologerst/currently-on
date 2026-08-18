/** Catalog scores may be /10 (TMDb) or already /5. */
export function starsOutOfFive(rating?: number) {
  if (!rating || rating <= 0) return 0;
  const n = rating > 5 ? rating / 2 : rating;
  return Math.round(n * 10) / 10;
}

export function ratingLabel(rating?: number) {
  const n = starsOutOfFive(rating);
  if (!n) return null;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
