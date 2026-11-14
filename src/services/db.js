import { supabase, isSupabaseConfigured } from './supabase';
import { generateToken, calculateEventStats } from '../utils/formatting';
import { normalizeName, normalizePlayerNo } from '../utils/normalize';
import { INITIAL_CLUB_MEMBERS } from '../data/initialClubMembers';

const STORAGE_KEY_EVENTS = 'teamreg_events_v2';
const STORAGE_KEY_TEAMS = 'teamreg_teams_v2';
const STORAGE_KEY_REGISTRATIONS = 'teamreg_registrations_v2';
const STORAGE_KEY_ADMIN_SESSION = 'teamreg_admin_session';
const STORAGE_KEY_CLUB_MEMBERS = 'teamreg_club_members_v1';

const INITIAL_DEMO_DATA = {
  events: [
    {
      id: 'demo-event-01',
      topic: 'Khmer Team One Cup 2026',
      event_time: 'Saturday, November 14, 2026 - 07:30 PM',
      location: 'Phnom Penh Premier Turf, Pitch 1',
      registration_token: 'champ2026',
      status: 'OPEN',
      cover_image_url: '/images/club-pitch.jpg',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'demo-event-02',
      topic: 'Friendly Night League Match',
      event_time: 'Sunday, December 20, 2026 - 06:00 PM',
      location: 'National Sports Complex, Court B',
      registration_token: 'summer2026',
      status: 'CLOSED',
      cover_image_url: '/images/team-blue.jpg',
      created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
  ],
  teams: [
    {
      id: 'demo-team-1a',
      event_id: 'demo-event-01',
      team_letter: 'A',
      team_name: 'Blue Warriors',
      captain_name: 'Panha Reach',
      team_color: '#2563EB',
      logo_url: '/images/team-blue.jpg',
      created_at: new Date().toISOString(),
    },
    {
      id: 'demo-team-1b',
      event_id: 'demo-event-01',
      team_letter: 'B',
      team_name: 'Crimson Phoenix',
      captain_name: 'Srun',
      team_color: '#DC2626',
      logo_url: '/images/team-red.jpg',
      created_at: new Date().toISOString(),
    },
    {
      id: 'demo-team-1c',
      event_id: 'demo-event-01',
      team_letter: 'C',
      team_name: 'Emerald United',
      captain_name: 'Pato',
      team_color: '#16A34A',
      logo_url: '/logo.jpg',
      created_at: new Date().toISOString(),
    },
    {
      id: 'demo-team-2a',
      event_id: 'demo-event-02',
      team_letter: 'A',
      team_name: 'Titan Force',
      captain_name: 'Munyreak',
      team_color: '#2563EB',
      logo_url: '/images/team-blue.jpg',
      created_at: new Date().toISOString(),
    },
    {
      id: 'demo-team-2b',
      event_id: 'demo-event-02',
      team_letter: 'B',
      team_name: 'Red Dragons',
      captain_name: 'Chan',
      team_color: '#DC2626',
      logo_url: '/images/team-red.jpg',
      created_at: new Date().toISOString(),
    },
    {
      id: 'demo-team-2c',
      event_id: 'demo-event-02',
      team_letter: 'C',
      team_name: 'Khmer One Reserve',
      captain_name: 'Vuth',
      team_color: '#16A34A',
      logo_url: '/logo.jpg',
      created_at: new Date().toISOString(),
    },
  ],
  registrations: [
    {
      id: 'reg-01',
      event_id: 'demo-event-01',
      team_letter: 'A',
      name: 'Panha Reach',
      normalized_name: 'panha reach',
      player_no: '404',
      player_no_norm: '404',
      number_of_players: 1,
      avatar_url: '',
      created_at: new Date(Date.now() - 86400000 * 1.5).toISOString(),
    },
    {
      id: 'reg-02',
      event_id: 'demo-event-01',
      team_letter: 'A',
      name: 'Sovearcha',
      normalized_name: 'sovearcha',
      player_no: '7',
      player_no_norm: '7',
      number_of_players: 1,
      avatar_url: '',
      created_at: new Date(Date.now() - 86400000 * 1.2).toISOString(),
    },
    {
      id: 'reg-03',
      event_id: 'demo-event-01',
      team_letter: 'B',
      name: 'Srun',
      normalized_name: 'srun',
      player_no: '88',
      player_no_norm: '88',
      number_of_players: 1,
      avatar_url: '',
      created_at: new Date(Date.now() - 86400000 * 1.1).toISOString(),
    },
    {
      id: 'reg-04',
      event_id: 'demo-event-01',
      team_letter: 'B',
      name: 'Narith',
      normalized_name: 'narith',
      player_no: '11',
      player_no_norm: '11',
      number_of_players: 1,
      avatar_url: '',
      created_at: new Date(Date.now() - 86400000 * 0.8).toISOString(),
    },
    {
      id: 'reg-05',
      event_id: 'demo-event-01',
      team_letter: 'C',
      name: 'Pato',
      normalized_name: 'pato',
      player_no: '10',
      player_no_norm: '10',
      number_of_players: 1,
      avatar_url: '',
      created_at: new Date(Date.now() - 86400000 * 0.4).toISOString(),
    },
    {
      id: 'reg-06',
      event_id: 'demo-event-01',
      team_letter: 'C',
      name: 'Hong',
      normalized_name: 'hong',
      player_no: '67',
      player_no_norm: '67',
      number_of_players: 1,
      avatar_url: '',
      created_at: new Date(Date.now() - 86400000 * 0.2).toISOString(),
    },
  ],
};

function initLocalStorage() {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem(STORAGE_KEY_EVENTS)) {
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(INITIAL_DEMO_DATA.events));
  }
  if (!localStorage.getItem(STORAGE_KEY_TEAMS)) {
    localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(INITIAL_DEMO_DATA.teams));
  }
  if (!localStorage.getItem(STORAGE_KEY_REGISTRATIONS)) {
    localStorage.setItem(STORAGE_KEY_REGISTRATIONS, JSON.stringify(INITIAL_DEMO_DATA.registrations));
  }
  if (!localStorage.getItem(STORAGE_KEY_CLUB_MEMBERS)) {
    localStorage.setItem(STORAGE_KEY_CLUB_MEMBERS, JSON.stringify(INITIAL_CLUB_MEMBERS));
  }
}

initLocalStorage();

function getSessionTokenOrThrow() {
  const token = localStorage.getItem(STORAGE_KEY_ADMIN_SESSION);
  if (!token) {
    throw new Error('Admin session expired. Please sign in again.');
  }
  return token;
}

function handleSupabaseRpcError(error) {
  if (error?.code === '42501' || (error?.message || '').toLowerCase().includes('unauthorized')) {
    localStorage.removeItem(STORAGE_KEY_ADMIN_SESSION);
  }
  throw new Error(error?.message || 'Database request failed');
}

export const db = {
  isLiveSupabase: isSupabaseConfigured,

  getSessionToken() {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(STORAGE_KEY_ADMIN_SESSION) || '';
  },

  /**
   * Admin Authentication
   */
  async verifyAdminCode(code) {
    const trimmed = (code || '').trim();
    if (!trimmed) {
      return { success: false, error: 'Please enter the admin access code.' };
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.rpc('verify_admin_code', { input_code: trimmed });
        if (error) throw error;
        if (data && data.success) {
          localStorage.setItem(STORAGE_KEY_ADMIN_SESSION, data.token);
          return { success: true, token: data.token };
        }
        return { success: false, error: data?.error || 'Invalid access code.' };
      } catch (err) {
        console.error('Supabase auth error:', err);
        return { success: false, error: err.message || 'Authentication failed.' };
      }
    } else {
      if (trimmed === 'REACH701631') {
        const token = 'local_session_' + generateToken(32);
        localStorage.setItem(STORAGE_KEY_ADMIN_SESSION, token);
        return { success: true, token };
      }
      return { success: false, error: 'Invalid access code. Please try again.' };
    }
  },

  async checkAdminAuth() {
    const token = localStorage.getItem(STORAGE_KEY_ADMIN_SESSION);
    if (!token) return false;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.rpc('validate_admin_session', { session_token: token });
        if (error || !data) {
          localStorage.removeItem(STORAGE_KEY_ADMIN_SESSION);
          return false;
        }
        return true;
      } catch {
        return false;
      }
    } else {
      return token.startsWith('local_session_');
    }
  },

  async logoutAdmin() {
    const token = localStorage.getItem(STORAGE_KEY_ADMIN_SESSION);
    localStorage.removeItem(STORAGE_KEY_ADMIN_SESSION);

    if (isSupabaseConfigured && token) {
      try {
        await supabase.rpc('admin_logout_session', { p_session_token: token });
      } catch {
        // Ignore network errors during logout cleanup
      }
    }
  },

  /**
   * Fetch all events (Server-side authenticated RPC in Supabase mode)
   */
  async getEvents() {
    if (isSupabaseConfigured) {
      const sessionToken = getSessionTokenOrThrow();
      const { data, error } = await supabase.rpc('admin_get_events', {
        p_session_token: sessionToken,
      });

      if (error) handleSupabaseRpcError(error);

      const events = Array.isArray(data) ? data : [];
      return events.map((event) => ({
        ...event,
        teams: event.teams || [],
        registrations: event.registrations || [],
        stats: calculateEventStats(event.registrations || []),
      }));
    } else {
      initLocalStorage();
      const events = JSON.parse(localStorage.getItem(STORAGE_KEY_EVENTS) || '[]');
      const teams = JSON.parse(localStorage.getItem(STORAGE_KEY_TEAMS) || '[]');
      const registrations = JSON.parse(localStorage.getItem(STORAGE_KEY_REGISTRATIONS) || '[]');

      return events
        .map((event) => {
          const eventTeams = teams
            .filter((t) => t.event_id === event.id)
            .sort((a, b) => a.team_letter.localeCompare(b.team_letter));
          const eventRegs = registrations
            .filter((r) => r.event_id === event.id)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          const stats = calculateEventStats(eventRegs);
          return {
            ...event,
            cover_image_url: event.cover_image_url || '',
            teams: eventTeams,
            registrations: eventRegs,
            stats,
          };
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  },

  async getEventById(id) {
    if (isSupabaseConfigured) {
      const sessionToken = getSessionTokenOrThrow();
      const { data, error } = await supabase.rpc('admin_get_event_by_id', {
        p_session_token: sessionToken,
        p_event_id: id,
      });

      if (error) handleSupabaseRpcError(error);
      if (!data) return null;

      return {
        ...data,
        teams: data.teams || [],
        registrations: data.registrations || [],
        stats: calculateEventStats(data.registrations || []),
      };
    } else {
      initLocalStorage();
      const events = JSON.parse(localStorage.getItem(STORAGE_KEY_EVENTS) || '[]');
      const teams = JSON.parse(localStorage.getItem(STORAGE_KEY_TEAMS) || '[]');
      const registrations = JSON.parse(localStorage.getItem(STORAGE_KEY_REGISTRATIONS) || '[]');

      const event = events.find((e) => e.id === id);
      if (!event) return null;

      const eventTeams = teams
        .filter((t) => t.event_id === event.id)
        .sort((a, b) => a.team_letter.localeCompare(b.team_letter));
      const eventRegs = registrations
        .filter((r) => r.event_id === event.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const stats = calculateEventStats(eventRegs);

      return {
        ...event,
        cover_image_url: event.cover_image_url || '',
        teams: eventTeams,
        registrations: eventRegs,
        stats,
      };
    }
  },

  /**
   * Public Event lookup scoped strictly by registration_token
   */
  async getEventByToken(token) {
    if (!token) return null;

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('get_public_event_by_token', {
        p_token: token,
      });

      if (error || !data) return null;
      return {
        ...data,
        teams: data.teams || [],
        registrations: data.registrations || [],
      };
    } else {
      initLocalStorage();
      const events = JSON.parse(localStorage.getItem(STORAGE_KEY_EVENTS) || '[]');
      const teams = JSON.parse(localStorage.getItem(STORAGE_KEY_TEAMS) || '[]');
      const registrations = JSON.parse(localStorage.getItem(STORAGE_KEY_REGISTRATIONS) || '[]');

      const event = events.find((e) => e.registration_token === token);
      if (!event) return null;

      const eventTeams = teams
        .filter((t) => t.event_id === event.id)
        .sort((a, b) => a.team_letter.localeCompare(b.team_letter));
      const eventRegs = registrations
        .filter((r) => r.event_id === event.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return {
        ...event,
        cover_image_url: event.cover_image_url || '',
        teams: eventTeams,
        registrations: eventRegs,
      };
    }
  },

  async createEvent({ topic, event_time, location, cover_image_url = '', teams }) {
    const registration_token = generateToken(10);

    if (isSupabaseConfigured) {
      const sessionToken = getSessionTokenOrThrow();
      const payloadTeams = teams.map((t) => ({
        team_letter: t.team_letter,
        team_name: t.team_name || `Team ${t.team_letter}`,
        captain_name: t.captain_name || 'Captain',
        team_color: t.team_color || '#2563EB',
        logo_url: t.logo_url || '',
      }));

      const { data, error } = await supabase.rpc('admin_create_event', {
        p_session_token: sessionToken,
        p_topic: topic,
        p_event_time: event_time,
        p_location: location,
        p_registration_token: registration_token,
        p_cover_image_url: cover_image_url || '',
        p_teams: payloadTeams,
      });

      if (error) handleSupabaseRpcError(error);
      return {
        ...data,
        stats: calculateEventStats(data?.registrations || []),
      };
    } else {
      initLocalStorage();
      const events = JSON.parse(localStorage.getItem(STORAGE_KEY_EVENTS) || '[]');
      const allTeams = JSON.parse(localStorage.getItem(STORAGE_KEY_TEAMS) || '[]');

      const newId = 'evt_' + generateToken(12);
      const newEvent = {
        id: newId,
        topic,
        event_time,
        location,
        registration_token,
        status: 'OPEN',
        cover_image_url: cover_image_url || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const newTeams = teams.map((t) => ({
        id: 'team_' + generateToken(12),
        event_id: newId,
        team_letter: t.team_letter,
        team_name: t.team_name || `Team ${t.team_letter}`,
        captain_name: t.captain_name || 'Captain',
        team_color: t.team_color || '#2563EB',
        logo_url: t.logo_url || '',
        created_at: new Date().toISOString(),
      }));

      events.unshift(newEvent);
      allTeams.push(...newTeams);

      localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
      localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(allTeams));

      return {
        ...newEvent,
        teams: newTeams,
        registrations: [],
        stats: calculateEventStats([]),
      };
    }
  },

  async updateEvent(id, { topic, event_time, location, cover_image_url = '', teams }) {
    if (isSupabaseConfigured) {
      const sessionToken = getSessionTokenOrThrow();
      const payloadTeams = (teams || []).map((t) => ({
        team_letter: t.team_letter,
        team_name: t.team_name || `Team ${t.team_letter}`,
        captain_name: t.captain_name || 'Captain',
        team_color: t.team_color || '#2563EB',
        logo_url: t.logo_url || '',
      }));

      const { data, error } = await supabase.rpc('admin_update_event', {
        p_session_token: sessionToken,
        p_event_id: id,
        p_topic: topic,
        p_event_time: event_time,
        p_location: location,
        p_cover_image_url: cover_image_url ?? '',
        p_teams: payloadTeams,
      });

      if (error) handleSupabaseRpcError(error);
      return {
        ...data,
        stats: calculateEventStats(data?.registrations || []),
      };
    } else {
      initLocalStorage();
      const events = JSON.parse(localStorage.getItem(STORAGE_KEY_EVENTS) || '[]');
      const allTeams = JSON.parse(localStorage.getItem(STORAGE_KEY_TEAMS) || '[]');

      const index = events.findIndex((e) => e.id === id);
      if (index === -1) throw new Error('Event not found');

      events[index] = {
        ...events[index],
        topic,
        event_time,
        location,
        cover_image_url: cover_image_url ?? events[index].cover_image_url ?? '',
        updated_at: new Date().toISOString(),
      };

      if (teams && teams.length > 0) {
        teams.forEach((incoming) => {
          const tmIndex = allTeams.findIndex(
            (t) =>
              t.id === incoming.id ||
              (t.event_id === id && t.team_letter === incoming.team_letter)
          );
          if (tmIndex !== -1) {
            allTeams[tmIndex] = {
              ...allTeams[tmIndex],
              team_name: incoming.team_name,
              captain_name: incoming.captain_name,
              team_color: incoming.team_color,
              logo_url: incoming.logo_url ?? allTeams[tmIndex].logo_url ?? '',
            };
          } else {
            allTeams.push({
              id: 'team_' + generateToken(12),
              event_id: id,
              team_letter: incoming.team_letter,
              team_name: incoming.team_name || `Team ${incoming.team_letter}`,
              captain_name: incoming.captain_name || 'Captain',
              team_color: incoming.team_color || '#2563EB',
              logo_url: incoming.logo_url || '',
              created_at: new Date().toISOString(),
            });
          }
        });
      }

      localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
      localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(allTeams));

      return this.getEventById(id);
    }
  },

  async setEventStatus(id, newStatus) {
    if (!['OPEN', 'CLOSED'].includes(newStatus)) {
      throw new Error('Invalid status. Must be OPEN or CLOSED');
    }

    if (isSupabaseConfigured) {
      const sessionToken = getSessionTokenOrThrow();
      const { error } = await supabase.rpc('admin_set_event_status', {
        p_session_token: sessionToken,
        p_event_id: id,
        p_status: newStatus,
      });

      if (error) handleSupabaseRpcError(error);
      return true;
    } else {
      initLocalStorage();
      const events = JSON.parse(localStorage.getItem(STORAGE_KEY_EVENTS) || '[]');
      const index = events.findIndex((e) => e.id === id);
      if (index === -1) throw new Error('Event not found');

      events[index].status = newStatus;
      events[index].updated_at = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
      return true;
    }
  },

  async deleteEvent(id) {
    if (isSupabaseConfigured) {
      const sessionToken = getSessionTokenOrThrow();
      const { error } = await supabase.rpc('admin_delete_event', {
        p_session_token: sessionToken,
        p_event_id: id,
      });
      if (error) handleSupabaseRpcError(error);
      return true;
    } else {
      initLocalStorage();
      let events = JSON.parse(localStorage.getItem(STORAGE_KEY_EVENTS) || '[]');
      let teams = JSON.parse(localStorage.getItem(STORAGE_KEY_TEAMS) || '[]');
      let registrations = JSON.parse(localStorage.getItem(STORAGE_KEY_REGISTRATIONS) || '[]');

      events = events.filter((e) => e.id !== id);
      teams = teams.filter((t) => t.event_id !== id);
      registrations = registrations.filter((r) => r.event_id !== id);

      localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
      localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(teams));
      localStorage.setItem(STORAGE_KEY_REGISTRATIONS, JSON.stringify(registrations));
      return true;
    }
  },

  /**
   * Submit Member Registration
   */
  async submitRegistration({ token, team_letter, name, player_no, avatar_url = '' }) {
    const rawName = (name || '').trim();
    if (!rawName) {
      return { success: false, error: 'Name is required.' };
    }

    const rawPlayerNo = String(player_no || '').trim();
    if (!rawPlayerNo) {
      return { success: false, error: 'Player Number is required.' };
    }

    if (!['A', 'B', 'C'].includes(team_letter)) {
      return { success: false, error: 'Please select a valid team (Team A, Team B, or Team C).' };
    }

    const normName = normalizeName(rawName);
    const normPlayerNo = normalizePlayerNo(rawPlayerNo);

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.rpc('submit_member_registration', {
          p_token: token,
          p_team_letter: team_letter,
          p_name: rawName,
          p_player_no: rawPlayerNo,
          p_avatar_url: avatar_url || '',
        });

        if (error) throw error;
        return data;
      } catch (err) {
        console.error('Registration submission error:', err);
        return { success: false, error: err.message || 'Failed to submit registration.' };
      }
    } else {
      initLocalStorage();
      const events = JSON.parse(localStorage.getItem(STORAGE_KEY_EVENTS) || '[]');
      const registrations = JSON.parse(localStorage.getItem(STORAGE_KEY_REGISTRATIONS) || '[]');

      const event = events.find((e) => e.registration_token === token);
      if (!event) {
        return { success: false, error: 'Event not found. Please check your registration link.' };
      }

      if (event.status !== 'OPEN') {
        return { success: false, error: 'Registration is currently closed. Please contact the administrator.' };
      }

      const duplicateName = registrations.some(
        (r) => r.event_id === event.id && r.normalized_name === normName
      );
      if (duplicateName) {
        return {
          success: false,
          error: 'This name is already registered for this event. Duplicate registrations are not allowed.',
        };
      }

      const duplicateNo = registrations.some(
        (r) => r.event_id === event.id && (r.player_no_norm || normalizePlayerNo(r.player_no)) === normPlayerNo
      );
      if (duplicateNo) {
        return {
          success: false,
          error: `Player Number #${rawPlayerNo} is already taken for this event. Please choose another number.`,
        };
      }

      const newRegistration = {
        id: 'reg_' + generateToken(12),
        event_id: event.id,
        team_letter,
        name: rawName,
        normalized_name: normName,
        player_no: rawPlayerNo,
        player_no_norm: normPlayerNo,
        number_of_players: 1,
        avatar_url: avatar_url || '',
        created_at: new Date().toISOString(),
      };

      registrations.push(newRegistration);
      localStorage.setItem(STORAGE_KEY_REGISTRATIONS, JSON.stringify(registrations));

      return {
        success: true,
        registration_id: newRegistration.id,
        event_topic: event.topic,
        name: rawName,
        team_letter,
        player_no: rawPlayerNo,
        avatar_url: newRegistration.avatar_url,
        number_of_players: 1,
        created_at: newRegistration.created_at,
      };
    }
  },

  async deleteRegistration(id) {
    if (isSupabaseConfigured) {
      const sessionToken = getSessionTokenOrThrow();
      const { error } = await supabase.rpc('admin_delete_registration', {
        p_session_token: sessionToken,
        p_registration_id: id,
      });
      if (error) handleSupabaseRpcError(error);
      return true;
    } else {
      initLocalStorage();
      let registrations = JSON.parse(localStorage.getItem(STORAGE_KEY_REGISTRATIONS) || '[]');
      registrations = registrations.filter((r) => r.id !== id);
      localStorage.setItem(STORAGE_KEY_REGISTRATIONS, JSON.stringify(registrations));
      return true;
    }
  },

  async updateRegistration(id, { name, team_letter, player_no, avatar_url = null }) {
    const rawName = (name || '').trim();
    const rawPlayerNo = String(player_no || '').trim();
    const normName = normalizeName(rawName);
    const normPlayerNo = normalizePlayerNo(rawPlayerNo);

    if (isSupabaseConfigured) {
      const sessionToken = getSessionTokenOrThrow();
      const { data, error } = await supabase.rpc('admin_update_registration', {
        p_session_token: sessionToken,
        p_registration_id: id,
        p_name: rawName,
        p_team_letter: team_letter,
        p_player_no: rawPlayerNo,
        p_avatar_url: avatar_url,
      });

      if (error) handleSupabaseRpcError(error);
      return data;
    } else {
      initLocalStorage();
      const registrations = JSON.parse(localStorage.getItem(STORAGE_KEY_REGISTRATIONS) || '[]');
      const index = registrations.findIndex((r) => r.id === id);
      if (index === -1) throw new Error('Registration not found');

      const eventId = registrations[index].event_id;
      const dupName = registrations.some(
        (r) => r.id !== id && r.event_id === eventId && r.normalized_name === normName
      );
      if (dupName) {
        throw new Error('Another player in this event already uses that name.');
      }

      const dupNo = registrations.some(
        (r) =>
          r.id !== id &&
          r.event_id === eventId &&
          (r.player_no_norm || normalizePlayerNo(r.player_no)) === normPlayerNo
      );
      if (dupNo) {
        throw new Error(`Player Number #${rawPlayerNo} is already taken in this event.`);
      }

      registrations[index] = {
        ...registrations[index],
        name: rawName,
        normalized_name: normName,
        team_letter,
        player_no: rawPlayerNo,
        player_no_norm: normPlayerNo,
        avatar_url: avatar_url !== null ? avatar_url : registrations[index].avatar_url || '',
      };

      localStorage.setItem(STORAGE_KEY_REGISTRATIONS, JSON.stringify(registrations));
      return registrations[index];
    }
  },

  async getDashboardOverview() {
    const events = await this.getEvents();

    let totalRegistrations = 0;
    let totalPlayers = 0;
    let teamAPlayers = 0;
    let teamBPlayers = 0;
    let teamCPlayers = 0;
    let openEventsCount = 0;
    let closedEventsCount = 0;
    const recentActivity = [];

    for (const evt of events) {
      if (evt.status === 'OPEN') {
        openEventsCount += 1;
      } else {
        closedEventsCount += 1;
      }

      if (evt.stats) {
        totalRegistrations += evt.stats.totalRegistrations;
        totalPlayers += evt.stats.totalPlayers;
        teamAPlayers += evt.stats.teamAPlayers;
        teamBPlayers += evt.stats.teamBPlayers;
        teamCPlayers += evt.stats.teamCPlayers;
      }

      const teamsMap = {};
      (evt.teams || []).forEach((tm) => {
        teamsMap[tm.team_letter] = tm;
      });

      (evt.registrations || []).forEach((reg) => {
        recentActivity.push({
          ...reg,
          event_id: evt.id,
          event_topic: evt.topic,
          team_name: teamsMap[reg.team_letter]?.team_name || `Team ${reg.team_letter}`,
          team_color: teamsMap[reg.team_letter]?.team_color || '#2563EB',
        });
      });
    }

    recentActivity.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return {
      totalEvents: events.length,
      totalRegistrations,
      totalPlayers,
      teamAPlayers,
      teamBPlayers,
      teamCPlayers,
      openEventsCount,
      closedEventsCount,
      events,
      recentActivity: recentActivity.slice(0, 8),
    };
  },

  // --- CLUB MEMBERS DIRECTORY (Team Members List CRUD + Profile Images) ---

  async getClubMembers() {
    if (isSupabaseConfigured) {
      const sessionToken = getSessionTokenOrThrow();
      const { data, error } = await supabase.rpc('admin_get_club_members', {
        p_session_token: sessionToken,
      });

      if (error) handleSupabaseRpcError(error);
      return Array.isArray(data) ? data : [];
    } else {
      initLocalStorage();
      const members = JSON.parse(localStorage.getItem(STORAGE_KEY_CLUB_MEMBERS) || '[]');
      return members;
    }
  },

  async createClubMember(payload) {
    const jersey_name = (payload.jersey_name || '').trim();
    if (!jersey_name) throw new Error('Jersey / Player name is required');

    const full_name = (payload.full_name || jersey_name).trim();
    const jersey_number = String(payload.jersey_number || '').trim();
    const position = (payload.position || '').trim();
    const phone = (payload.phone || '').trim();
    const telegram_status = payload.telegram_status === 'NOT_JOINED' ? 'NOT_JOINED' : 'JOINED';
    const uniform_status = payload.uniform_status === 'NOT_YET' ? 'NOT_YET' : 'RECEIVED';
    const avatar_url = payload.avatar_url || '';
    const notes = (payload.notes || '').trim();

    if (isSupabaseConfigured) {
      const sessionToken = getSessionTokenOrThrow();
      const { data, error } = await supabase.rpc('admin_create_club_member', {
        p_session_token: sessionToken,
        p_jersey_name: jersey_name,
        p_full_name: full_name,
        p_jersey_number: jersey_number,
        p_position: position,
        p_phone: phone,
        p_telegram_status: telegram_status,
        p_uniform_status: uniform_status,
        p_avatar_url: avatar_url,
        p_notes: notes,
      });

      if (error) handleSupabaseRpcError(error);
      return data;
    } else {
      initLocalStorage();
      const members = JSON.parse(localStorage.getItem(STORAGE_KEY_CLUB_MEMBERS) || '[]');
      const normName = normalizeName(jersey_name);
      const duplicate = members.some((m) => normalizeName(m.jersey_name) === normName);
      if (duplicate) {
        throw new Error(`Member "${jersey_name}" already exists in the team directory.`);
      }

      const newMember = {
        id: `member-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        jersey_name,
        full_name,
        jersey_number,
        position,
        phone,
        telegram_status,
        uniform_status,
        avatar_url,
        notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      members.push(newMember);
      localStorage.setItem(STORAGE_KEY_CLUB_MEMBERS, JSON.stringify(members));
      return newMember;
    }
  },

  async updateClubMember(id, payload) {
    const jersey_name = (payload.jersey_name || '').trim();
    if (!jersey_name) throw new Error('Jersey / Player name is required');

    const full_name = (payload.full_name || jersey_name).trim();
    const jersey_number = String(payload.jersey_number || '').trim();
    const position = (payload.position || '').trim();
    const phone = (payload.phone || '').trim();
    const telegram_status = payload.telegram_status === 'NOT_JOINED' ? 'NOT_JOINED' : 'JOINED';
    const uniform_status = payload.uniform_status === 'NOT_YET' ? 'NOT_YET' : 'RECEIVED';
    const avatar_url = payload.avatar_url ?? '';
    const notes = (payload.notes || '').trim();

    if (isSupabaseConfigured) {
      const sessionToken = getSessionTokenOrThrow();
      const { data, error } = await supabase.rpc('admin_update_club_member', {
        p_session_token: sessionToken,
        p_member_id: id,
        p_jersey_name: jersey_name,
        p_full_name: full_name,
        p_jersey_number: jersey_number,
        p_position: position,
        p_phone: phone,
        p_telegram_status: telegram_status,
        p_uniform_status: uniform_status,
        p_avatar_url: avatar_url,
        p_notes: notes,
      });

      if (error) handleSupabaseRpcError(error);
      return data;
    } else {
      initLocalStorage();
      const members = JSON.parse(localStorage.getItem(STORAGE_KEY_CLUB_MEMBERS) || '[]');
      const idx = members.findIndex((m) => m.id === id);
      if (idx === -1) throw new Error('Member not found');

      const normName = normalizeName(jersey_name);
      const duplicate = members.some(
        (m) => m.id !== id && normalizeName(m.jersey_name) === normName
      );
      if (duplicate) {
        throw new Error(`Another member already uses "${jersey_name}".`);
      }

      members[idx] = {
        ...members[idx],
        jersey_name,
        full_name,
        jersey_number,
        position,
        phone,
        telegram_status,
        uniform_status,
        avatar_url,
        notes,
        updated_at: new Date().toISOString(),
      };

      localStorage.setItem(STORAGE_KEY_CLUB_MEMBERS, JSON.stringify(members));
      return members[idx];
    }
  },

  async deleteClubMember(id) {
    if (isSupabaseConfigured) {
      const sessionToken = getSessionTokenOrThrow();
      const { error } = await supabase.rpc('admin_delete_club_member', {
        p_session_token: sessionToken,
        p_member_id: id,
      });

      if (error) handleSupabaseRpcError(error);
      return true;
    } else {
      initLocalStorage();
      const members = JSON.parse(localStorage.getItem(STORAGE_KEY_CLUB_MEMBERS) || '[]');
      const updated = members.filter((m) => m.id !== id);
      localStorage.setItem(STORAGE_KEY_CLUB_MEMBERS, JSON.stringify(updated));
      return true;
    }
  },

  async importClubMembers(rows = []) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('No member rows found in the uploaded file.');
    }

    const existing = await this.getClubMembers();
    const existingByName = new Map();
    existing.forEach((m) => {
      existingByName.set(normalizeName(m.jersey_name), m);
    });

    let created = 0;
    let updated = 0;

    for (const row of rows) {
      const cleanName = (row.jersey_name || '').trim();
      if (!cleanName) continue;

      const key = normalizeName(cleanName);
      const match = existingByName.get(key);

      if (match) {
        await this.updateClubMember(match.id, {
          ...match,
          jersey_name: cleanName,
          full_name: (row.full_name || match.full_name || cleanName).trim(),
          jersey_number: row.jersey_number ?? match.jersey_number ?? '',
          position: row.position || match.position || '',
          phone: row.phone || match.phone || '',
          telegram_status: row.telegram_status || match.telegram_status || 'JOINED',
          uniform_status: row.uniform_status || match.uniform_status || 'RECEIVED',
          notes: row.notes || match.notes || '',
          avatar_url: match.avatar_url || '',
        });
        updated += 1;
      } else {
        const added = await this.createClubMember(row);
        existingByName.set(key, added);
        created += 1;
      }
    }

    const latest = await this.getClubMembers();
    return { created, updated, members: latest };
  },
};
