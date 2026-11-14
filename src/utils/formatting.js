/**
 * Utility functions for date formatting, token generation, and statistical calculations
 */

/**
 * Generates a clean, URL-safe random alphanumeric token
 * Example: 'x7k9m2p4qt'
 */
export function generateToken(length = 10) {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  const cryptoObj = window.crypto || window.msCrypto;
  
  if (cryptoObj && cryptoObj.getRandomValues) {
    const values = new Uint8Array(length);
    cryptoObj.getRandomValues(values);
    for (let i = 0; i < length; i++) {
      result += chars[values[i] % chars.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return result;
}

/**
 * Formats ISO date/time string to human-readable format
 */
export function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

/**
 * Formats a short date
 */
export function formatShortDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Computes registration and player counts for an event or list of registrations.
 * NOTE: Each registration record represents ONE player with their individual Player Number (key number).
 * Total Players = Total registered players count.
 */
export function calculateEventStats(registrations = []) {
  const totalRegistrations = registrations.length;
  const totalPlayers = registrations.length;

  let teamAPlayers = 0;
  let teamBPlayers = 0;
  let teamCPlayers = 0;

  for (const reg of registrations) {
    if (reg.team_letter === 'A') {
      teamAPlayers += 1;
    } else if (reg.team_letter === 'B') {
      teamBPlayers += 1;
    } else if (reg.team_letter === 'C') {
      teamCPlayers += 1;
    }
  }

  return {
    totalRegistrations,
    totalPlayers,
    teamAPlayers,
    teamBPlayers,
    teamCPlayers,
    teamARegistrations: teamAPlayers,
    teamBRegistrations: teamBPlayers,
    teamCRegistrations: teamCPlayers,
  };
}

/**
 * Helper to build the full public registration URL
 */
export function getRegistrationUrl(token) {
  const baseUrl = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${baseUrl}/register/${token}`;
}
