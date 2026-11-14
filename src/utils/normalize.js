/**
 * Utility functions for name and player number normalization and duplicate comparison
 */

/**
 * Normalizes a participant name for duplicate checking:
 * 1. Trims leading and trailing spaces
 * 2. Replaces consecutive spaces with a single space
 * 3. Converts to lowercase for case-insensitive comparison
 * 
 * Example: "  John   DOE  " -> "john doe"
 */
export function normalizeName(name) {
  if (!name || typeof name !== 'string') return '';
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Normalizes a player number:
 * Trims spaces, strips leading zeroes if purely numeric (e.g. "07" -> "7")
 */
export function normalizePlayerNo(playerNo) {
  if (playerNo === undefined || playerNo === null) return '';
  const str = String(playerNo).trim();
  const num = parseInt(str, 10);
  if (!isNaN(num) && String(num) === str.replace(/^0+/, '')) {
    return String(num);
  }
  return str.toLowerCase();
}

/**
 * Checks if a candidate name is already registered for this event
 */
export function isDuplicateName(candidateName, existingRegistrations = [], excludeId = null) {
  const norm = normalizeName(candidateName);
  if (!norm) return false;

  return existingRegistrations.some(reg => {
    if (excludeId && reg.id === excludeId) return false;
    const existingNorm = reg.normalized_name || normalizeName(reg.name);
    return existingNorm === norm;
  });
}

/**
 * Checks if a candidate player number is already taken in this event
 */
export function isDuplicatePlayerNo(candidateNo, existingRegistrations = [], excludeId = null) {
  const norm = normalizePlayerNo(candidateNo);
  if (!norm) return false;

  return existingRegistrations.some(reg => {
    if (excludeId && reg.id === excludeId) return false;
    const existingNorm = reg.player_no_norm || normalizePlayerNo(reg.player_no);
    return existingNorm === norm;
  });
}

/**
 * Formats a name to title case for presentation
 */
export function formatNameDisplay(name) {
  if (!name) return '';
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
