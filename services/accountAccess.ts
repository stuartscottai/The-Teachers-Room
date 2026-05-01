import { AccountType, SchoolRole, User, UserSchoolAccess } from '../types';
import { supabase } from './supabase';

export const AUTH_PROMPT_EVENT = 'teachers-room:auth-prompt';
export const EMAIL_CONFIRMATION_EVENT = 'teachers-room:email-confirmation';

export type AuthPromptKind = 'signup-free' | 'login' | 'upgrade-ai';

export interface AuthPromptDetail {
  kind: AuthPromptKind;
  title?: string;
  message?: string;
}

export interface EmailConfirmationDetail {
  email: string;
  reason?: 'new-signup' | 'existing-signup';
}

export interface UserEntitlements {
  accountType: AccountType;
  canUseAi: boolean;
  schoolAccess: UserSchoolAccess | null;
}

export interface SchoolCentreSummary {
  id: string;
  name: string;
  teacherSeatLimit: number;
  teacherCount: number;
  createdAt: string;
}

export interface SchoolTeacherSpotSummary {
  teacherSpotLimit: number;
  teacherCount: number;
  spotsRemaining: number;
}

export interface SchoolTeacherSummary {
  userId: string;
  fullName: string;
  email: string | null;
  role: SchoolRole;
  status: 'active' | 'inactive' | 'pending';
  isOwner: boolean;
  joinedAt: string;
  totalGamesCreated: number;
  totalGamePlays: number;
  totalPlayEvents: number;
  totalAiGenerations: number;
  lastPlayedAt: string | null;
  lastGeneratedAt: string | null;
  lastGameCreatedAt: string | null;
  lastActivityAt: string | null;
}

export interface SchoolTeacherPlayEvent {
  eventId: string;
  playedAt: string;
  playerUserId: string;
  playerName: string;
  gameId: string | null;
  gameTitle: string;
  gameOwnerUserId: string | null;
  gameOwnerName: string | null;
}

export interface SchoolJoinRequestSummary {
  userId: string;
  fullName: string;
  email: string | null;
  requestedAt: string;
}

export interface MyPendingSchoolJoinRequest {
  schoolId: string;
  schoolName: string;
  requestedAt: string;
}

export interface SchoolInviteSummary {
  id: string;
  schoolId: string;
  email: string;
  token: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
}

export interface MyProfileGameStats {
  gamesCreated: number;
  createdPlaycount: number;
  gamesPlayed: number;
  aiGens: number;
  lastGameCreatedAt: string | null;
  lastPlayedAt: string | null;
  lastGeneratedAt: string | null;
  lastActivityAt: string | null;
}

type InviteRecord = {
  id: string | null;
  token: string | null;
  expiresAt: string | null;
};

export interface UpgradeToSchoolPayload {
  schoolName: string;
  teacherSeatLimit?: number;
}

export interface ChangeMyPlanPayload {
  targetAccountType: AccountType;
  schoolName?: string;
  teacherSeatLimit?: number;
}

export interface CreateTeacherInvitePayload {
  schoolId: string;
  schoolName: string;
  email: string;
}

export interface CreateTeacherInviteResult {
  error: Error | null;
  emailError: Error | null;
}

export interface ResendTeacherInvitePayload {
  inviteId: string;
  schoolId: string;
  schoolName: string;
  email: string;
}

export interface SchoolJoinCodeResult {
  code: string | null;
  error: Error | null;
}

const ACCOUNT_TYPES: AccountType[] = ['free', 'teacher', 'school'];

const DEFAULT_ENTITLEMENTS: UserEntitlements = {
  accountType: 'free',
  canUseAi: false,
  schoolAccess: null
};

const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export const normalizeAccountType = (value: unknown): AccountType => {
  const normalized = asText(value).toLowerCase();
  if (ACCOUNT_TYPES.includes(normalized as AccountType)) {
    return normalized as AccountType;
  }
  return 'free';
};

const asSchoolRole = (value: unknown): SchoolRole => {
  const normalized = asText(value).toLowerCase();
  return normalized === 'admin' ? 'admin' : 'teacher';
};

const asMembershipStatus = (value: unknown): 'active' | 'inactive' | 'pending' => {
  const normalized = asText(value).toLowerCase();
  if (normalized === 'pending') return 'pending';
  if (normalized === 'inactive') return 'inactive';
  return 'active';
};

const optionalText = (value: unknown) => {
  const text = asText(value);
  return text.length ? text : null;
};

const isMissingRpcError = (error: unknown, functionName: string) => {
  if (!error || typeof error !== 'object') return false;
  const code = String((error as any).code || '');
  const message = String((error as any).message || '').toLowerCase();
  const details = String((error as any).details || '').toLowerCase();
  const hint = String((error as any).hint || '').toLowerCase();
  const functionNameLower = functionName.toLowerCase();

  return (
    code === 'PGRST202' ||
    message.includes(functionNameLower) ||
    details.includes(functionNameLower) ||
    hint.includes(functionNameLower) ||
    message.includes('does not exist')
  );
};

const parseSchoolAccess = (row: any): UserSchoolAccess | null => {
  const schoolId = optionalText(row?.school_id);
  const schoolName = optionalText(row?.school_name);
  const roleRaw = optionalText(row?.school_role);
  if (!schoolId || !schoolName || !roleRaw) return null;

  return {
    schoolId,
    schoolName,
    role: asSchoolRole(roleRaw)
  };
};

export const dispatchAuthPrompt = (detail: AuthPromptDetail) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(AUTH_PROMPT_EVENT, { detail }));
};

export const dispatchEmailConfirmationPrompt = (detail: EmailConfirmationDetail) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EMAIL_CONFIRMATION_EVENT, { detail }));
};

export const promptSignupForFree = (message?: string) => {
  dispatchAuthPrompt({
    kind: 'signup-free',
    title: 'Create A Free Teacher Account',
    message: message || 'The Teacher Plan is currently free during early access. Sign up to continue.'
  });
};

export const promptUpgradeForAi = (message?: string) => {
  dispatchAuthPrompt({
    kind: 'upgrade-ai',
    title: 'Activate Teacher Plan',
    message: message || 'AI generation is included with the Teacher Plan, which is currently free during early access.'
  });
};

export const isSchoolAdmin = (user: User | null) =>
  Boolean(user?.accountType === 'school' && user.schoolAccess?.role === 'admin');

export const ensureProfileRow = async (params: {
  userId: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  accountType?: AccountType;
}) => {
  const profilePayload: Record<string, any> = {
    id: params.userId,
    full_name: params.fullName || null,
    avatar_url: params.avatarUrl || null
  };
  if (params.accountType) {
    profilePayload.account_type = params.accountType;
  }

  const { error } = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' });
  if (!error) return;

  // Fallback for legacy profiles without account_type column.
  await supabase
    .from('profiles')
    .upsert(
      {
        id: params.userId,
        full_name: params.fullName || null,
        avatar_url: params.avatarUrl || null
      },
      { onConflict: 'id' }
    );
};

export const claimPendingSchoolInvites = async () => {
  // Uses a SQL RPC if installed. Safe to ignore in environments without the function.
  try {
    await supabase.rpc('claim_my_school_invites');
  } catch {
    // Ignore if RPC is unavailable in a partially-migrated environment.
  }
};

const getEntitlementsViaRpc = async (): Promise<UserEntitlements | null> => {
  const { data, error } = await supabase.rpc('get_my_entitlements');
  if (error || !data) return null;

  const first = Array.isArray(data) ? data[0] : data;
  if (!first) return null;

  const accountType = normalizeAccountType(first.account_type);
  const canUseAi =
    typeof first.can_use_ai === 'boolean' ? first.can_use_ai : accountType === 'teacher' || accountType === 'school';

  return {
    accountType,
    canUseAi,
    schoolAccess: parseSchoolAccess(first)
  };
};

const getEntitlementsFallback = async (userId: string): Promise<UserEntitlements> => {
  let accountType: AccountType = 'free';

  let profileRow: any = null;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('account_type')
      .eq('id', userId)
      .maybeSingle();
    profileRow = data;
  } catch {
    profileRow = null;
  }

  if (profileRow && typeof profileRow === 'object') {
    accountType = normalizeAccountType((profileRow as any).account_type);
  }

  let schoolAccess: UserSchoolAccess | null = null;
  let hasActiveSchoolSeat = false;

  if (accountType === 'school') {
    let membershipRow: any = null;
    try {
      const { data } = await supabase
        .from('school_memberships')
        .select('school_id, role, status, schools(name)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('role', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      membershipRow = data;
    } catch {
      membershipRow = null;
    }

    const schoolId = optionalText((membershipRow as any)?.school_id);
    const schoolName = optionalText((membershipRow as any)?.schools?.name);
    const schoolRole = optionalText((membershipRow as any)?.role);

    if (schoolId && schoolName && schoolRole) {
      schoolAccess = {
        schoolId,
        schoolName,
        role: asSchoolRole(schoolRole)
      };

      try {
        const { data: centres } = await supabase
          .from('school_centres')
          .select('id')
          .eq('school_id', schoolId);
        const centreIds = (centres || []).map((row: any) => optionalText(row?.id)).filter(Boolean) as string[];

        if (centreIds.length) {
          const { data: activeSeat } = await supabase
            .from('centre_memberships')
            .select('id')
            .eq('user_id', userId)
            .eq('status', 'active')
            .in('centre_id', centreIds)
            .limit(1)
            .maybeSingle();
          hasActiveSchoolSeat = Boolean(activeSeat);
        }
      } catch {
        hasActiveSchoolSeat = false;
      }
    }
  }

  return {
    accountType,
    canUseAi: accountType === 'teacher' || (accountType === 'school' && hasActiveSchoolSeat),
    schoolAccess
  };
};

export const getMyEntitlements = async (userId: string): Promise<UserEntitlements> => {
  if (!userId) return DEFAULT_ENTITLEMENTS;

  const fromRpc = await getEntitlementsViaRpc();
  if (fromRpc) return fromRpc;

  return getEntitlementsFallback(userId);
};

export const listSchoolCentres = async (schoolId: string): Promise<SchoolCentreSummary[]> => {
  if (!schoolId) return [];

  const { data: centres, error } = await supabase
    .from('school_centres')
    .select('id, name, teacher_seat_limit, created_at')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: true });

  if (error || !centres?.length) return [];

  const centreIds = centres.map((row: any) => row.id).filter(Boolean);
  let memberships: any[] = [];
  try {
    const { data } = await supabase
      .from('centre_memberships')
      .select('centre_id')
      .eq('status', 'active')
      .in('centre_id', centreIds);
    memberships = data || [];
  } catch {
    memberships = [];
  }

  const counts = new Map<string, number>();
  (memberships || []).forEach((row: any) => {
    const centreId = optionalText(row?.centre_id);
    if (!centreId) return;
    counts.set(centreId, (counts.get(centreId) || 0) + 1);
  });

  return centres.map((row: any) => ({
    id: row.id,
    name: row.name || 'Untitled Centre',
    teacherSeatLimit: Number(row.teacher_seat_limit || 0),
    teacherCount: counts.get(row.id) || 0,
    createdAt: row.created_at || new Date().toISOString()
  }));
};

const resolvePrimarySchoolCentre = async (schoolId: string): Promise<SchoolCentreSummary | null> => {
  const centres = await listSchoolCentres(schoolId);
  return centres.length ? centres[0] : null;
};

export const getSchoolTeacherSpotSummary = async (schoolId: string): Promise<SchoolTeacherSpotSummary> => {
  if (!schoolId) {
    return {
      teacherSpotLimit: 0,
      teacherCount: 0,
      spotsRemaining: 0
    };
  }

  const rpcResult = await supabase.rpc('get_school_teacher_spot_summary', { p_school_id: schoolId });
  if (!rpcResult.error && rpcResult.data) {
    const first = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
    const teacherSpotLimit = Math.max(0, Number((first as any)?.teacher_spot_limit || 0));
    const teacherCount = Math.max(0, Number((first as any)?.teacher_count || 0));
    return {
      teacherSpotLimit,
      teacherCount,
      spotsRemaining: Math.max(0, teacherSpotLimit - teacherCount)
    };
  }

  const primaryCentre = await resolvePrimarySchoolCentre(schoolId);
  const teacherSpotLimit = Number(primaryCentre?.teacherSeatLimit || 0);
  const teacherCount = Number(primaryCentre?.teacherCount || 0);
  return {
    teacherSpotLimit,
    teacherCount,
    spotsRemaining: Math.max(0, teacherSpotLimit - teacherCount)
  };
};

export const changeSchoolTeacherSpots = async (payload: {
  schoolId: string;
  delta: number;
}): Promise<{ error: Error | null; summary?: SchoolTeacherSpotSummary }> => {
  const delta = Number.isFinite(payload.delta) ? Math.round(payload.delta) : 0;
  if (!payload.schoolId || delta === 0) {
    return { error: new Error('A non-zero spot change is required.') };
  }

  const rpcResult = await supabase.rpc('change_school_teacher_spots', {
    p_school_id: payload.schoolId,
    p_delta: delta
  });
  if (!rpcResult.error && rpcResult.data) {
    const first = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
    const teacherSpotLimit = Math.max(0, Number((first as any)?.teacher_spot_limit || 0));
    const teacherCount = Math.max(0, Number((first as any)?.teacher_count || 0));
    return {
      error: null,
      summary: {
        teacherSpotLimit,
        teacherCount,
        spotsRemaining: Math.max(0, teacherSpotLimit - teacherCount)
      }
    };
  }

  const primaryCentre = await resolvePrimarySchoolCentre(payload.schoolId);
  if (!primaryCentre) {
    return { error: new Error('No teacher spot configuration found for this school.') };
  }

  const nextLimit = primaryCentre.teacherSeatLimit + delta;
  if (nextLimit < 1) {
    return { error: new Error('Teacher spots must be at least 1.') };
  }
  if (nextLimit < primaryCentre.teacherCount) {
    return { error: new Error('Cannot set teacher spots below your current active teacher count.') };
  }

  const { error: updateError } = await supabase
    .from('school_centres')
    .update({ teacher_seat_limit: nextLimit })
    .eq('id', primaryCentre.id);

  if (updateError) {
    return { error: new Error(getErrorMessage(updateError, 'Could not update teacher spots.')) };
  }

  return {
    error: null,
    summary: {
      teacherSpotLimit: nextLimit,
      teacherCount: primaryCentre.teacherCount,
      spotsRemaining: Math.max(0, nextLimit - primaryCentre.teacherCount)
    }
  };
};

export const createSchoolCentre = async (payload: {
  schoolId: string;
  name: string;
  teacherSeatLimit: number;
}) => {
  const seatLimit = Number.isFinite(payload.teacherSeatLimit) ? Math.max(1, Math.round(payload.teacherSeatLimit)) : 1;
  return supabase.from('school_centres').insert({
    school_id: payload.schoolId,
    name: payload.name.trim(),
    teacher_seat_limit: seatLimit
  });
};

const getTeacherDirectoryViaRpc = async (schoolId: string): Promise<SchoolTeacherSummary[] | null> => {
  const { data, error } = await supabase.rpc('get_school_teacher_directory', { p_school_id: schoolId });
  if (error || !data) return null;

  return (Array.isArray(data) ? data : [data])
    .map((row: any) => ({
      userId: row.user_id,
      fullName: row.full_name || 'Teacher',
      email: optionalText(row.email),
      role: asSchoolRole(row.role),
      status: asMembershipStatus(row.status),
      isOwner: Boolean(row.is_owner),
      joinedAt: row.joined_at || row.created_at || new Date().toISOString(),
      totalGamesCreated: Math.max(0, Number(row.total_games_created || 0)),
      totalGamePlays: Math.max(0, Number(row.total_game_plays || 0)),
      totalPlayEvents: Math.max(0, Number(row.total_play_events || 0)),
      totalAiGenerations: Math.max(0, Number(row.total_ai_generations || 0)),
      lastPlayedAt: optionalText(row.last_played_at),
      lastGeneratedAt: optionalText(row.last_generated_at),
      lastGameCreatedAt: optionalText(row.last_game_created_at),
      lastActivityAt: optionalText(row.last_activity_at)
    }));
};

const getTeacherDirectoryFallback = async (schoolId: string): Promise<SchoolTeacherSummary[]> => {
  const { data: memberships, error } = await supabase
    .from('school_memberships')
    .select('user_id, role, status, created_at')
    .eq('school_id', schoolId)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (error || !memberships?.length) return [];

  let ownerUserId: string | null = null;
  let centreIds: string[] = [];
  try {
    const { data: schoolRow } = await supabase
      .from('schools')
      .select('owner_user_id')
      .eq('id', schoolId)
      .maybeSingle();
    ownerUserId = optionalText((schoolRow as any)?.owner_user_id);
  } catch {
    ownerUserId = null;
  }

  try {
    const { data: schoolCentres } = await supabase
      .from('school_centres')
      .select('id')
      .eq('school_id', schoolId);
    centreIds = (schoolCentres || [])
      .map((row: any) => optionalText(row?.id))
      .filter((id: string | null): id is string => Boolean(id));
  } catch {
    centreIds = [];
  }

  const userIds = memberships.map((row: any) => row.user_id).filter(Boolean);

  let profiles: any[] = [];
  try {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);
    profiles = data || [];
  } catch {
    profiles = [];
  }

  const profileById = new Map<string, any>((profiles || []).map((row: any) => [row.id, row]));
  const activeSeatUserIds = new Set<string>();

  if (centreIds.length && userIds.length) {
    try {
      const { data: activeSeatRows } = await supabase
        .from('centre_memberships')
        .select('user_id')
        .in('centre_id', centreIds)
        .in('user_id', userIds)
        .eq('status', 'active');

      (activeSeatRows || []).forEach((row: any) => {
        const rowUserId = optionalText(row?.user_id);
        if (rowUserId) activeSeatUserIds.add(rowUserId);
      });
    } catch {
      // Ignore fallback seat lookup errors and default to inactive.
    }
  }

  return memberships.map((row: any) => {
    const profile = profileById.get(row.user_id);
    const rowUserId = optionalText(row?.user_id) || '';
    return {
      userId: row.user_id,
      fullName: profile?.full_name || 'Teacher',
      email: null,
      role: asSchoolRole(row.role),
      status: activeSeatUserIds.has(rowUserId) ? 'active' : 'inactive',
      isOwner: ownerUserId === row.user_id,
      joinedAt: row.created_at || new Date().toISOString(),
      totalGamesCreated: 0,
      totalGamePlays: 0,
      totalPlayEvents: 0,
      totalAiGenerations: 0,
      lastPlayedAt: null,
      lastGeneratedAt: null,
      lastGameCreatedAt: null,
      lastActivityAt: row.created_at || new Date().toISOString()
    } as SchoolTeacherSummary;
  });
};

export const listSchoolTeachers = async (schoolId: string) => {
  if (!schoolId) return [];

  const fromRpc = await getTeacherDirectoryViaRpc(schoolId);
  if (fromRpc) return fromRpc;

  return getTeacherDirectoryFallback(schoolId);
};

export const listSchoolTeacherPlayEvents = async (payload: {
  schoolId: string;
  userId: string;
  limit?: number;
}): Promise<{ events: SchoolTeacherPlayEvent[]; error: Error | null }> => {
  if (!payload.schoolId || !payload.userId) {
    return { events: [], error: new Error('Missing school or teacher id.') };
  }

  const limit = Math.max(1, Math.min(500, Math.round(Number(payload.limit) || 100)));
  const rpcResult = await supabase.rpc('list_school_teacher_play_events', {
    p_school_id: payload.schoolId,
    p_user_id: payload.userId,
    p_limit: limit
  });

  if (rpcResult.error) {
    if (isMissingRpcError(rpcResult.error, 'list_school_teacher_play_events')) {
      return {
        events: [],
        error: new Error(
          'Teacher play analytics are not enabled yet. Run the latest account_access.sql migration.'
        )
      };
    }

    return {
      events: [],
      error: new Error(getErrorMessage(rpcResult.error, 'Could not load teacher play events.'))
    };
  }

  const rows = Array.isArray(rpcResult.data) ? rpcResult.data : rpcResult.data ? [rpcResult.data] : [];
  return {
    events: rows.map((row: any) => ({
      eventId: String(row.event_id ?? ''),
      playedAt: row.played_at || new Date().toISOString(),
      playerUserId: row.player_user_id || payload.userId,
      playerName: row.player_name || 'Teacher',
      gameId: optionalText(row.game_id),
      gameTitle: row.game_title || 'Untitled Game',
      gameOwnerUserId: optionalText(row.game_owner_user_id),
      gameOwnerName: optionalText(row.game_owner_name)
    })),
    error: null
  };
};

export const listSchoolInvites = async (schoolId: string): Promise<SchoolInviteSummary[]> => {
  if (!schoolId) return [];

  const { data, error } = await supabase
    .from('centre_invites')
    .select('id, school_id, email, token, status, created_at, expires_at, accepted_at')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });

  if (error || !data?.length) return [];

  return data.map((row: any) => ({
    id: row.id,
    schoolId: row.school_id,
    email: row.email,
    token: row.token,
    status: row.status || 'pending',
    createdAt: row.created_at || new Date().toISOString(),
    expiresAt: row.expires_at || new Date().toISOString(),
    acceptedAt: optionalText(row.accepted_at)
  }));
};

export const getMyProfileGameStats = async (userId: string): Promise<MyProfileGameStats> => {
  const empty: MyProfileGameStats = {
    gamesCreated: 0,
    createdPlaycount: 0,
    gamesPlayed: 0,
    aiGens: 0,
    lastGameCreatedAt: null,
    lastPlayedAt: null,
    lastGeneratedAt: null,
    lastActivityAt: null
  };
  if (!userId) return empty;

  let gamesCreated = 0;
  let createdPlaycount = 0;
  let lastGameCreatedAt: string | null = null;

  try {
    const gamesResult = await supabase
      .from('saved_games')
      .select('play_count, created_at')
      .eq('user_id', userId);

    if (!gamesResult.error && Array.isArray(gamesResult.data)) {
      gamesCreated = gamesResult.data.length;
      createdPlaycount = gamesResult.data.reduce((sum: number, row: any) => {
        return sum + Math.max(0, Number(row?.play_count || 0));
      }, 0);

      lastGameCreatedAt = gamesResult.data
        .map((row: any) => optionalText(row?.created_at))
        .filter((value: string | null): value is string => Boolean(value))
        .sort()
        .slice(-1)[0] || null;
    }
  } catch {
    // Keep default zeros for partially migrated environments.
  }

  let gamesPlayed = 0;
  let lastPlayedAt: string | null = null;

  try {
    const countResult = await supabase
      .from('game_play_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (!countResult.error && typeof countResult.count === 'number') {
      gamesPlayed = Math.max(0, countResult.count);
    }

    const lastPlayedResult = await supabase
      .from('game_play_events')
      .select('played_at')
      .eq('user_id', userId)
      .order('played_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastPlayedResult.error) {
      lastPlayedAt = optionalText((lastPlayedResult.data as any)?.played_at);
    }
  } catch {
    // Keep default values if play-events table/functionality is not present.
  }

  let aiGens = 0;
  let lastGeneratedAt: string | null = null;
  try {
    const rpcResult = await supabase.rpc('get_my_ai_generation_stats');
    if (!rpcResult.error) {
      const first = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
      aiGens = Math.max(0, Number((first as any)?.total_ai_generations || 0));
      lastGeneratedAt = optionalText((first as any)?.last_generated_at);
    } else if (isMissingRpcError(rpcResult.error, 'get_my_ai_generation_stats')) {
      aiGens = 0;
      lastGeneratedAt = null;
    }
  } catch {
    aiGens = 0;
    lastGeneratedAt = null;
  }

  const candidateDates = [lastGameCreatedAt, lastPlayedAt, lastGeneratedAt].filter(
    (value): value is string => Boolean(value)
  );
  const lastActivityAt = candidateDates.length ? candidateDates.sort().slice(-1)[0] : null;

  return {
    gamesCreated,
    createdPlaycount,
    gamesPlayed,
    aiGens,
    lastGameCreatedAt,
    lastPlayedAt,
    lastGeneratedAt,
    lastActivityAt
  };
};

export const getSchoolJoinCode = async (schoolId: string): Promise<SchoolJoinCodeResult> => {
  if (!schoolId) return { code: null, error: new Error('Missing school id.') };

  const rpcResult = await supabase.rpc('get_school_join_code', { p_school_id: schoolId });
  if (!rpcResult.error) {
    const first = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
    return { code: optionalText((first as any)?.join_code) || optionalText(first), error: null };
  }

  const fallback = await supabase
    .from('schools')
    .select('join_code')
    .eq('id', schoolId)
    .maybeSingle();
  if (fallback.error) {
    return {
      code: null,
      error: new Error(getErrorMessage(fallback.error, 'Could not load school code.'))
    };
  }

  return {
    code: optionalText((fallback.data as any)?.join_code),
    error: null
  };
};

export const regenerateSchoolJoinCode = async (schoolId: string): Promise<SchoolJoinCodeResult> => {
  if (!schoolId) return { code: null, error: new Error('Missing school id.') };
  const rpcResult = await supabase.rpc('regenerate_school_join_code', { p_school_id: schoolId });
  if (rpcResult.error) {
    return {
      code: null,
      error: new Error(getErrorMessage(rpcResult.error, 'Could not regenerate school code.'))
    };
  }

  const first = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
  return { code: optionalText((first as any)?.join_code) || optionalText(first), error: null };
};

export const requestSchoolJoinWithCode = async (
  joinCode: string
): Promise<{ error: Error | null; schoolName?: string | null }> => {
  const code = asText(joinCode).toUpperCase();
  if (!code) {
    return { error: new Error('School code is required.'), schoolName: null };
  }

  const rpcResult = await supabase.rpc('request_school_join_with_code', {
    p_join_code: code
  });
  if (rpcResult.error) {
    if (isMissingRpcError(rpcResult.error, 'request_school_join_with_code')) {
      return {
        error: new Error(
          'School-code requests are not enabled in Supabase yet. Run the latest account_access.sql migration first.'
        ),
        schoolName: null
      };
    }
    return {
      error: new Error(getErrorMessage(rpcResult.error, 'Could not submit school join request.')),
      schoolName: null
    };
  }

  const first = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
  return {
    error: null,
    schoolName: optionalText((first as any)?.school_name)
  };
};

export const listSchoolJoinRequests = async (schoolId: string): Promise<SchoolJoinRequestSummary[]> => {
  if (!schoolId) return [];

  const rpcResult = await supabase.rpc('list_school_join_requests', { p_school_id: schoolId });
  if (rpcResult.error) {
    console.warn('list_school_join_requests RPC failed, using fallback:', rpcResult.error);
    const fallback = await supabase
      .from('school_memberships')
      .select('user_id, created_at')
      .eq('school_id', schoolId)
      .eq('role', 'teacher')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (fallback.error || !fallback.data) return [];

    const userIds = fallback.data
      .map((row: any) => optionalText(row.user_id))
      .filter((id: string | null): id is string => Boolean(id));

    let profiles: any[] = [];
    if (userIds.length) {
      const profileResult = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      if (!profileResult.error && profileResult.data) {
        profiles = profileResult.data;
      }
    }

    const profileNameById = new Map<string, string>(
      (profiles || [])
        .map((row: any) => [String(row.id), optionalText(row.full_name)])
        .filter((entry): entry is [string, string] => Boolean(entry[0] && entry[1]))
    );

    return fallback.data.map((row: any) => ({
      userId: row.user_id,
      fullName: profileNameById.get(String(row.user_id)) || 'Teacher',
      email: null,
      requestedAt: row.created_at || new Date().toISOString()
    }));
  }
  if (!rpcResult.data) return [];

  const rows = Array.isArray(rpcResult.data) ? rpcResult.data : [rpcResult.data];
  return rows.map((row: any) => ({
    userId: row.user_id,
    fullName: row.full_name || 'Teacher',
    email: optionalText(row.email),
    requestedAt: row.requested_at || row.created_at || new Date().toISOString()
  }));
};

export const getMyPendingSchoolJoinRequest = async (
  userId: string
): Promise<{ request: MyPendingSchoolJoinRequest | null; error: Error | null }> => {
  if (!userId) return { request: null, error: null };

  const rpcResult = await supabase.rpc('get_my_pending_school_join_request');
  if (!rpcResult.error) {
    const first = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
    const schoolId = optionalText((first as any)?.school_id);
    const schoolName = optionalText((first as any)?.school_name);
    if (schoolId && schoolName) {
      return {
        request: {
          schoolId,
          schoolName,
          requestedAt: (first as any)?.requested_at || new Date().toISOString()
        },
        error: null
      };
    }
    return { request: null, error: null };
  }

  const { data, error } = await supabase
    .from('school_memberships')
    .select('school_id, created_at')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      request: null,
      error: new Error(getErrorMessage(rpcResult.error || error, 'Could not load pending school request.'))
    };
  }

  const schoolId = optionalText((data as any)?.school_id);
  if (!schoolId) return { request: null, error: null };

  return {
    request: {
      schoolId,
      schoolName: 'School',
      requestedAt: (data as any)?.created_at || new Date().toISOString()
    },
    error: null
  };
};

export const approveSchoolJoinRequest = async (payload: { schoolId: string; userId: string }) => {
  const rpcResult = await supabase.rpc('approve_school_join_request', {
    p_school_id: payload.schoolId,
    p_user_id: payload.userId
  });
  if (!rpcResult.error) return { error: null };
  return { error: new Error(getErrorMessage(rpcResult.error, 'Could not approve request.')) };
};

export const rejectSchoolJoinRequest = async (payload: { schoolId: string; userId: string }) => {
  const rpcResult = await supabase.rpc('reject_school_join_request', {
    p_school_id: payload.schoolId,
    p_user_id: payload.userId
  });
  if (!rpcResult.error) return { error: null };
  return { error: new Error(getErrorMessage(rpcResult.error, 'Could not reject request.')) };
};

const parseInviteRecord = (value: any): InviteRecord => {
  const first = Array.isArray(value) ? value[0] : value;
  return {
    id: optionalText((first as any)?.id),
    token: optionalText((first as any)?.token),
    expiresAt: optionalText((first as any)?.expires_at)
  };
};

export const createTeacherInvite = async (
  payload: CreateTeacherInvitePayload
): Promise<CreateTeacherInviteResult> => {
  const cleanEmail = payload.email.trim().toLowerCase();
  const primaryCentre = await resolvePrimarySchoolCentre(payload.schoolId);
  const primaryCentreId = primaryCentre?.id || null;
  let inviteRecord: InviteRecord = { id: null, token: null, expiresAt: null };

  const schoolOnlyRpc = await supabase.rpc('create_school_invite', {
    p_school_id: payload.schoolId,
    p_email: cleanEmail
  });
  if (!schoolOnlyRpc.error) {
    inviteRecord = parseInviteRecord(schoolOnlyRpc.data);
  } else {
    if (!primaryCentreId) {
      return {
        error: new Error(getErrorMessage(schoolOnlyRpc.error, 'No teacher spot configuration found for this school.')),
        emailError: null
      };
    }

    const rpcResult = await supabase.rpc('create_school_invite', {
      p_school_id: payload.schoolId,
      p_centre_id: primaryCentreId,
      p_email: cleanEmail
    });
    if (!rpcResult.error) {
      inviteRecord = parseInviteRecord(rpcResult.data);
    } else {
      const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const token =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

      const { data, error } = await supabase
        .from('centre_invites')
        .insert({
          school_id: payload.schoolId,
          centre_id: primaryCentreId,
          email: cleanEmail,
          token,
          status: 'pending',
          expires_at: expiry
        })
        .select('id, token, expires_at')
        .single();

      if (error) {
        return {
          error: new Error(getErrorMessage(error, 'Could not create teacher invite.')),
          emailError: null
        };
      }

      inviteRecord = parseInviteRecord(data);
    }
  }

  return {
    error: null,
    emailError: null
  };
};

export const resendTeacherInvite = async (
  payload: ResendTeacherInvitePayload
): Promise<CreateTeacherInviteResult> => {
  const inviteId = asText(payload.inviteId);
  const schoolId = asText(payload.schoolId);
  if (!inviteId || !schoolId) {
    return {
      error: new Error('Missing invite details for re-send.'),
      emailError: null
    };
  }

  const nextExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('centre_invites')
    .update({ expires_at: nextExpiry })
    .eq('id', inviteId)
    .eq('school_id', schoolId)
    .eq('status', 'pending')
    .select('id, token, expires_at')
    .maybeSingle();

  if (error) {
    return {
      error: new Error(getErrorMessage(error, 'Could not update invite expiry.')),
      emailError: null
    };
  }

  if (!data) {
    return {
      error: new Error('Invite is no longer pending and cannot be re-sent.'),
      emailError: null
    };
  }

  return {
    error: null,
    emailError: null
  };
};

export const revokeTeacherInvite = async (inviteId: string) =>
  supabase
    .from('centre_invites')
    .update({ status: 'revoked' })
    .eq('id', inviteId);

export const assignTeacherToCentre = async (payload: { schoolId: string; userId: string; centreId: string }) => {
  const rpcResult = await supabase.rpc('assign_teacher_to_centre', {
    p_school_id: payload.schoolId,
    p_user_id: payload.userId,
    p_centre_id: payload.centreId
  });
  if (!rpcResult.error) return rpcResult;

  await supabase
    .from('centre_memberships')
    .update({ status: 'inactive' })
    .eq('user_id', payload.userId)
    .eq('status', 'active');

  return supabase.from('centre_memberships').upsert(
    {
      centre_id: payload.centreId,
      user_id: payload.userId,
      status: 'active'
    },
    { onConflict: 'centre_id,user_id' }
  );
};

export const removeSchoolTeacher = async (payload: { schoolId: string; userId: string }) => {
  const rpcResult = await supabase.rpc('deactivate_school_teacher', {
    p_school_id: payload.schoolId,
    p_user_id: payload.userId
  });
  if (!rpcResult.error) return rpcResult;

  const { data: schoolCentres } = await supabase
    .from('school_centres')
    .select('id')
    .eq('school_id', payload.schoolId);

  const schoolCentreIds = (schoolCentres || []).map((row: any) => row.id).filter(Boolean);

  if (schoolCentreIds.length) {
    const centreDelete = await supabase
      .from('centre_memberships')
      .delete()
      .eq('user_id', payload.userId)
      .in('centre_id', schoolCentreIds);
    if (centreDelete.error) return centreDelete;
  }

  const membershipDelete = await supabase
    .from('school_memberships')
    .delete()
    .eq('school_id', payload.schoolId)
    .eq('user_id', payload.userId);
  if (membershipDelete.error) return membershipDelete;

  const { data: remainingActiveMembership } = await supabase
    .from('school_memberships')
    .select('id')
    .eq('user_id', payload.userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (!remainingActiveMembership) {
    await supabase
      .from('profiles')
      .upsert(
        {
          id: payload.userId,
          account_type: 'free'
        },
        { onConflict: 'id' }
      );
  }

  return { error: null };
};

export const setSchoolTeacherRole = async (payload: {
  schoolId: string;
  userId: string;
  role: SchoolRole;
}): Promise<{ error: Error | null }> => {
  const rpcResult = await supabase.rpc('set_school_member_role', {
    p_school_id: payload.schoolId,
    p_user_id: payload.userId,
    p_role: payload.role
  });
  if (!rpcResult.error) return { error: null };

  if (isMissingRpcError(rpcResult.error, 'set_school_member_role')) {
    return {
      error: new Error('Teacher admin role controls are not enabled yet. Run the latest account_access.sql migration.')
    };
  }

  return {
    error: new Error(getErrorMessage(rpcResult.error, 'Could not update school role.'))
  };
};

export const setSchoolMemberActivity = async (payload: {
  schoolId: string;
  userId: string;
  isActive: boolean;
}): Promise<{ error: Error | null }> => {
  const rpcResult = await supabase.rpc('set_school_member_activity', {
    p_school_id: payload.schoolId,
    p_user_id: payload.userId,
    p_is_active: payload.isActive
  });
  if (!rpcResult.error) return { error: null };

  if (isMissingRpcError(rpcResult.error, 'set_school_member_activity')) {
    return {
      error: new Error(
        'Member activity controls are not enabled yet. Run the latest account_access.sql migration.'
      )
    };
  }

  return {
    error: new Error(getErrorMessage(rpcResult.error, 'Could not update member activity.'))
  };
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message || fallback);
  }
  return fallback;
};

export const changeMyAccountPlan = async (
  payload: ChangeMyPlanPayload
): Promise<{ error: Error | null; accountType?: AccountType; schoolId?: string | null }> => {
  const targetAccountType = normalizeAccountType(payload.targetAccountType);
  const schoolName = targetAccountType === 'school' ? (payload.schoolName || '').trim() : null;
  const seatLimit = Number.isFinite(Number(payload.teacherSeatLimit))
    ? Math.max(1, Math.round(Number(payload.teacherSeatLimit)))
    : 10;

  const rpcResult = await supabase.rpc('change_my_account_plan', {
    p_target_account_type: targetAccountType,
    p_school_name: schoolName,
    p_teacher_seat_limit: seatLimit
  });

  if (rpcResult.error) {
    return {
      error: new Error(getErrorMessage(rpcResult.error, 'Failed to change account plan.')),
      accountType: targetAccountType
    };
  }

  const first = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
  const accountType = normalizeAccountType(
    (first as any)?.account_type || (first as any)?.result_account_type || targetAccountType
  );
  const schoolId = (first as any)?.school_id || (first as any)?.result_school_id || null;
  return { error: null, accountType, schoolId };
};

export const cancelMyAccount = async (): Promise<{ error: Error | null }> => {
  const rpcResult = await supabase.rpc('cancel_my_account');
  if (!rpcResult.error) return { error: null };

  return {
    error: new Error(getErrorMessage(rpcResult.error, 'Failed to cancel account.'))
  };
};

export const upgradeMyAccountToTeacher = async (): Promise<{ error: Error | null }> => {
  const rpcResult = await supabase.rpc('upgrade_my_account_to_teacher');
  if (!rpcResult.error) return { error: null };

  const { data: authData, error: authGetError } = await supabase.auth.getUser();
  if (authGetError || !authData?.user) {
    return { error: new Error(getErrorMessage(authGetError || rpcResult.error, 'Failed to upgrade account.')) };
  }

  const user = authData.user;
  const meta = {
    ...(user.user_metadata || {}),
    account_type: 'teacher'
  };

  const { error: authUpdateError } = await supabase.auth.updateUser({ data: meta });
  if (authUpdateError) {
    return { error: new Error(getErrorMessage(authUpdateError, 'Failed to upgrade account.')) };
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        full_name: user.user_metadata?.full_name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
        account_type: 'teacher'
      },
      { onConflict: 'id' }
    );

  if (profileError) {
    return { error: new Error(getErrorMessage(profileError, 'Failed to set teacher account type.')) };
  }

  return { error: null };
};

export const upgradeMyAccountToSchool = async (
  payload: UpgradeToSchoolPayload
): Promise<{ error: Error | null; schoolId?: string | null }> => {
  const schoolName = payload.schoolName.trim();
  const seatLimit = Number.isFinite(Number(payload.teacherSeatLimit))
    ? Math.max(1, Math.round(Number(payload.teacherSeatLimit)))
    : 10;

  const rpcResult = await supabase.rpc('upgrade_my_account_to_school', {
    p_school_name: schoolName,
    p_teacher_seat_limit: seatLimit
  });

  if (!rpcResult.error) {
    const first = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
    const schoolId = (first as any)?.school_id || (typeof first === 'string' ? first : null);
    return { error: null, schoolId };
  }

  return {
    error: new Error(getErrorMessage(rpcResult.error, 'Failed to upgrade account to School.')),
    schoolId: null
  };
};
