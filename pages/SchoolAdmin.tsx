import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ban, Building2, CheckCircle2, ChevronDown, Clock3, Copy, Gamepad2, KeyRound, Mail, Minus, Plus, RefreshCw, Shield, Trash2, Users, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  approveSchoolJoinRequest,
  changeSchoolTeacherSpots,
  createTeacherInvite,
  getSchoolJoinCode,
  getSchoolTeacherSpotSummary,
  isSchoolAdmin,
  listSchoolJoinRequests,
  listSchoolInvites,
  listSchoolTeachers,
  promptSignupForFree,
  regenerateSchoolJoinCode,
  rejectSchoolJoinRequest,
  resendTeacherInvite,
  removeSchoolTeacher,
  setSchoolMemberActivity,
  setSchoolTeacherRole,
  revokeTeacherInvite,
  SchoolJoinRequestSummary,
  SchoolInviteSummary,
  SchoolTeacherSpotSummary,
  SchoolTeacherSummary
} from '../services/accountAccess';
import { resolveSchoolLogoForSchool } from '../utils/schoolLogoStorage';

type Feedback = { type: 'success' | 'error'; text: string } | null;

export const SchoolAdmin: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [teacherSpots, setTeacherSpots] = useState<SchoolTeacherSpotSummary | null>(null);
  const [teachers, setTeachers] = useState<SchoolTeacherSummary[]>([]);
  const [joinRequests, setJoinRequests] = useState<SchoolJoinRequestSummary[]>([]);
  const [invites, setInvites] = useState<SchoolInviteSummary[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [spotChangeCount, setSpotChangeCount] = useState(1);
  const [changingSpots, setChangingSpots] = useState(false);

  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);
  const [schoolCode, setSchoolCode] = useState<string | null>(null);
  const [regeneratingCode, setRegeneratingCode] = useState(false);
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null);
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<string | null>(null);
  const [updatingActivityUserId, setUpdatingActivityUserId] = useState<string | null>(null);
  const [schoolLogoUrl, setSchoolLogoUrl] = useState<string | null>(null);
  const [isLoadingSchoolLogo, setIsLoadingSchoolLogo] = useState(false);
  const schoolLogoUrlRef = useRef<string | null>(null);
  const [openActionsForUserId, setOpenActionsForUserId] = useState<string | null>(null);

  const schoolId = user?.schoolAccess?.schoolId || '';
  const schoolName = user?.schoolAccess?.schoolName || 'School';
  const canManageSchool = isSchoolAdmin(user);

  const pendingInvites = useMemo(() => invites.filter((invite) => invite.status === 'pending'), [invites]);
  const maxRemovableSpots = useMemo(() => {
    if (!teacherSpots) return 0;
    return Math.max(0, teacherSpots.teacherSpotLimit - teacherSpots.teacherCount);
  }, [teacherSpots]);

  const loadAdminData = useCallback(async (options?: { keepFeedback?: boolean }) => {
    if (!schoolId || !canManageSchool) return;
    setLoadingData(true);
    if (!options?.keepFeedback) {
      setFeedback(null);
    }

    try {
      const [nextSpots, nextTeachers, nextInvites, nextJoinRequests, joinCodeResult] = await Promise.all([
        getSchoolTeacherSpotSummary(schoolId),
        listSchoolTeachers(schoolId),
        listSchoolInvites(schoolId),
        listSchoolJoinRequests(schoolId),
        getSchoolJoinCode(schoolId)
      ]);
      setTeacherSpots(nextSpots);
      setTeachers(nextTeachers);
      setInvites(nextInvites);
      setJoinRequests(nextJoinRequests);
      setSchoolCode(joinCodeResult.code);
    } catch (error) {
      console.error('Failed to load school admin data:', error);
      setFeedback({ type: 'error', text: 'Could not load school admin data.' });
    } finally {
      setLoadingData(false);
    }
  }, [canManageSchool, schoolId]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  useEffect(() => {
    schoolLogoUrlRef.current = schoolLogoUrl;
  }, [schoolLogoUrl]);

  useEffect(() => {
    return () => {
      const current = schoolLogoUrlRef.current;
      if (current && current.startsWith('blob:')) {
        URL.revokeObjectURL(current);
      }
    };
  }, []);

  useEffect(() => {
    if (!schoolId || !canManageSchool) {
      setSchoolLogoUrl(null);
      setIsLoadingSchoolLogo(false);
      return;
    }

    let active = true;
    const loadSchoolLogo = async () => {
      setIsLoadingSchoolLogo(true);
      try {
        const result = await resolveSchoolLogoForSchool(schoolId);
        if (!active) return;
        setSchoolLogoUrl((prev) => {
          if (prev && prev.startsWith('blob:') && prev !== result.signedUrl) {
            URL.revokeObjectURL(prev);
          }
          return result.signedUrl;
        });
      } catch (error) {
        if (!active) return;
        console.warn('Failed to load school logo:', error);
        setSchoolLogoUrl((prev) => {
          if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
          return null;
        });
      } finally {
        if (active) setIsLoadingSchoolLogo(false);
      }
    };

    void loadSchoolLogo();
    return () => {
      active = false;
    };
  }, [schoolId, canManageSchool]);

  const showError = (message: string) => setFeedback({ type: 'error', text: message });
  const showSuccess = (message: string) => setFeedback({ type: 'success', text: message });

  const handleCopySchoolCode = async () => {
    if (!schoolCode) {
      showError('School code is not available yet.');
      return;
    }

    try {
      await navigator.clipboard.writeText(schoolCode);
      showSuccess('School code copied.');
    } catch {
      showError('Could not copy school code.');
    }
  };

  const handleRegenerateSchoolCode = async () => {
    if (!schoolId) return;
    const confirmed = window.confirm('Regenerate school code? Existing code will stop working for new signups.');
    if (!confirmed) return;

    setRegeneratingCode(true);
    const result = await regenerateSchoolJoinCode(schoolId);
    setRegeneratingCode(false);

    if (result.error) {
      showError(result.error.message || 'Could not regenerate school code.');
      return;
    }

    setSchoolCode(result.code);
    showSuccess('School code regenerated.');
  };

  const handleAdjustTeacherSpots = async (direction: 'add' | 'remove') => {
    if (!schoolId || !teacherSpots) return;
    const units = Math.max(1, Math.round(Number(spotChangeCount) || 1));
    const delta = direction === 'add' ? units : -units;

    if (direction === 'remove' && units > maxRemovableSpots) {
      showError(`You can remove up to ${maxRemovableSpots} spot${maxRemovableSpots === 1 ? '' : 's'} right now.`);
      return;
    }

    setChangingSpots(true);
    const { error, summary } = await changeSchoolTeacherSpots({ schoolId, delta });
    setChangingSpots(false);

    if (error) {
      showError(error.message || 'Could not update teacher spots.');
      return;
    }

    if (summary) {
      setTeacherSpots(summary);
    } else {
      await loadAdminData();
    }
    showSuccess(direction === 'add' ? 'Teacher spots added.' : 'Teacher spots removed.');
  };

  const handleInviteTeacher = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!schoolId) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      showError('Enter a teacher email.');
      return;
    }
    if (teacherSpots && teacherSpots.spotsRemaining <= 0) {
      showError('No available teacher spots. Add spots before sending more invites.');
      return;
    }

    setSendingInvite(true);
    const { error, emailError } = await createTeacherInvite({
      schoolId,
      schoolName,
      email
    });
    setSendingInvite(false);

    if (error) {
      showError(error.message || 'Could not send invite.');
      return;
    }

    setInviteEmail('');
    if (emailError) showError(emailError.message || 'Invite saved, but a warning occurred.');
    else showSuccess('Invite saved. Copy invite message and send it manually.');
    await loadAdminData({ keepFeedback: true });
  };

  const handleRevokeInvite = async (inviteId: string) => {
    const { error } = await revokeTeacherInvite(inviteId);
    if (error) {
      showError(error.message || 'Could not revoke invite.');
      return;
    }
    showSuccess('Invite revoked.');
    await loadAdminData({ keepFeedback: true });
  };

  const handleResendInvite = async (invite: SchoolInviteSummary) => {
    if (!schoolId) return;
    setResendingInviteId(invite.id);
    const { error, emailError } = await resendTeacherInvite({
      inviteId: invite.id,
      schoolId,
      schoolName,
      email: invite.email
    });
    setResendingInviteId(null);

    if (error) {
      showError(error.message || 'Could not re-send invite.');
      return;
    }

    if (emailError) showError(emailError.message || 'Invite updated with a warning.');
    else showSuccess('Invite expiry updated.');

    await loadAdminData({ keepFeedback: true });
  };

  const handleApproveJoinRequest = async (request: SchoolJoinRequestSummary) => {
    if (!schoolId) return;
    setApprovingUserId(request.userId);
    const { error } = await approveSchoolJoinRequest({ schoolId, userId: request.userId });
    setApprovingUserId(null);

    if (error) {
      showError(error.message || 'Could not approve request.');
      return;
    }

    showSuccess(`${request.fullName} approved.`);
    await loadAdminData({ keepFeedback: true });
  };

  const handleRejectJoinRequest = async (request: SchoolJoinRequestSummary) => {
    if (!schoolId) return;
    setRejectingUserId(request.userId);
    const { error } = await rejectSchoolJoinRequest({ schoolId, userId: request.userId });
    setRejectingUserId(null);

    if (error) {
      showError(error.message || 'Could not reject request.');
      return;
    }

    showSuccess(`${request.fullName} rejected.`);
    await loadAdminData({ keepFeedback: true });
  };

  const handleRemoveTeacher = async (teacherUserId: string) => {
    if (!schoolId) return;
    const confirmed = window.confirm('Remove this teacher from the school account?');
    if (!confirmed) return;

    const { error } = await removeSchoolTeacher({ schoolId, userId: teacherUserId });
    if (error) {
      showError(error.message || 'Could not remove teacher.');
      return;
    }
    showSuccess('Teacher removed.');
    await loadAdminData({ keepFeedback: true });
  };

  const handleSetTeacherRole = async (teacher: SchoolTeacherSummary, nextRole: 'admin' | 'teacher') => {
    if (!schoolId || teacher.role === nextRole) return;

    if (nextRole === 'teacher') {
      const confirmed = window.confirm(`Remove admin access for ${teacher.fullName}?`);
      if (!confirmed) return;
    }

    setUpdatingRoleUserId(teacher.userId);
    const { error } = await setSchoolTeacherRole({
      schoolId,
      userId: teacher.userId,
      role: nextRole
    });
    setUpdatingRoleUserId(null);

    if (error) {
      showError(error.message || 'Could not update role.');
      return;
    }

    showSuccess(
      nextRole === 'admin'
        ? `${teacher.fullName} now has admin access.`
        : `${teacher.fullName} is now a teacher member.`
    );
    await loadAdminData({ keepFeedback: true });
  };

  const handleSetMemberActivity = async (teacher: SchoolTeacherSummary, nextIsActive: boolean) => {
    if (!schoolId) return;
    if ((teacher.status === 'active') === nextIsActive) return;

    if (nextIsActive && teacherSpots && teacherSpots.spotsRemaining <= 0) {
      showError('No available teacher spots. Add spots before re-activating this member.');
      return;
    }

    if (!nextIsActive) {
      const confirmed = window.confirm(
        `Set ${teacher.fullName} to inactive? They will no longer use a teacher spot or AI generation until re-activated.`
      );
      if (!confirmed) return;
    }

    setUpdatingActivityUserId(teacher.userId);
    const { error } = await setSchoolMemberActivity({
      schoolId,
      userId: teacher.userId,
      isActive: nextIsActive
    });
    setUpdatingActivityUserId(null);

    if (error) {
      showError(error.message || 'Could not update member activity.');
      return;
    }

    showSuccess(
      nextIsActive
        ? `${teacher.fullName} is now active.`
        : `${teacher.fullName} is now inactive.`
    );
    await loadAdminData({ keepFeedback: true });
  };

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return 'No activity yet';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'No activity yet';
    return parsed.toLocaleString();
  };

  const handleViewTeacherGames = (teacher: SchoolTeacherSummary) => {
    navigate('/games', {
      state: {
        view: 'community',
        creatorFilter: { id: teacher.userId, name: teacher.fullName || 'Teacher' }
      }
    });
  };

  const toggleActionsMenu = (userId: string) => {
    setOpenActionsForUserId((current) => (current === userId ? null : userId));
  };

  const closeActionsMenu = () => {
    setOpenActionsForUserId(null);
  };

  const renderUsageBadges = (teacher: SchoolTeacherSummary) => (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
      <span
        className="rounded-full bg-slate-100 px-2 py-0.5 cursor-help"
        title="This is the total number of games created by the user."
      >
        games created: <span className="font-bold text-slate-800">{teacher.totalGamesCreated}</span>
      </span>
      <span
        className="rounded-full bg-slate-100 px-2 py-0.5 cursor-help"
        title="This is the total number of times the user's created games have been played."
      >
        Created Playcount: <span className="font-bold text-slate-800">{teacher.totalGamePlays}</span>
      </span>
      <span
        className="rounded-full bg-slate-100 px-2 py-0.5 cursor-help"
        title="This is the total number of game sessions started by this user."
      >
        Games played: <span className="font-bold text-slate-800">{teacher.totalPlayEvents}</span>
      </span>
      <span
        className="rounded-full bg-slate-100 px-2 py-0.5 cursor-help"
        title="This is the total number of successful AI generations by this user."
      >
        AI Gens: <span className="font-bold text-slate-800">{teacher.totalAiGenerations}</span>
      </span>
    </div>
  );

  const renderTeacherActions = (teacher: SchoolTeacherSummary) => (
    <>
      <button
        type="button"
        onClick={() => {
          closeActionsMenu();
          handleViewTeacherGames(teacher);
        }}
        className="w-full text-left inline-flex items-center rounded-md px-2.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50"
      >
        <Gamepad2 size={13} className="mr-1.5" />
        View Games
      </button>

      {teacher.status === 'active' ? (
        <button
          type="button"
          disabled={updatingActivityUserId === teacher.userId}
          onClick={() => {
            closeActionsMenu();
            void handleSetMemberActivity(teacher, false);
          }}
          className="w-full text-left inline-flex items-center rounded-md px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <Ban size={13} className="mr-1.5" />
          {updatingActivityUserId === teacher.userId ? 'Updating...' : 'Set Inactive'}
        </button>
      ) : (
        <button
          type="button"
          disabled={updatingActivityUserId === teacher.userId}
          onClick={() => {
            closeActionsMenu();
            void handleSetMemberActivity(teacher, true);
          }}
          className="w-full text-left inline-flex items-center rounded-md px-2.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
        >
          <CheckCircle2 size={13} className="mr-1.5" />
          {updatingActivityUserId === teacher.userId ? 'Updating...' : 'Set Active'}
        </button>
      )}

      {teacher.role === 'teacher' && (
        <button
          type="button"
          disabled={updatingRoleUserId === teacher.userId}
          onClick={() => {
            closeActionsMenu();
            void handleSetTeacherRole(teacher, 'admin');
          }}
          className="w-full text-left inline-flex items-center rounded-md px-2.5 py-2 text-xs font-bold text-sky-700 hover:bg-sky-50 disabled:opacity-60"
        >
          <Shield size={13} className="mr-1.5" />
          {updatingRoleUserId === teacher.userId ? 'Updating...' : 'Grant Admin'}
        </button>
      )}

      {teacher.role === 'admin' && !teacher.isOwner && (
        <button
          type="button"
          disabled={updatingRoleUserId === teacher.userId}
          onClick={() => {
            closeActionsMenu();
            void handleSetTeacherRole(teacher, 'teacher');
          }}
          className="w-full text-left inline-flex items-center rounded-md px-2.5 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50 disabled:opacity-60"
        >
          <Shield size={13} className="mr-1.5" />
          {updatingRoleUserId === teacher.userId ? 'Updating...' : 'Remove Admin'}
        </button>
      )}

      {!teacher.isOwner && (
        <button
          type="button"
          onClick={() => {
            closeActionsMenu();
            void handleRemoveTeacher(teacher.userId);
          }}
          className="w-full text-left inline-flex items-center rounded-md px-2.5 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
          title="Remove teacher"
        >
          <Trash2 size={13} className="mr-1.5" />
          Remove Teacher
        </button>
      )}
    </>
  );

  useEffect(() => {
    if (!openActionsForUserId) return;

    const handleDocumentClick = () => {
      setOpenActionsForUserId(null);
    };

    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [openActionsForUserId]);

  const copyInviteMessage = async (invite: SchoolInviteSummary) => {
    const message = [
      `You have been invited to join ${schoolName}'s affiliate school account at theteachersroom.app`,
      `Sign up with this email (recommended): ${invite.email}`,
      schoolCode ? `School code: ${schoolCode}` : 'Ask your school admin for the school code.',
      'After sign up, your account will be pending until approved by a school admin.'
    ].join('\n');
    try {
      await navigator.clipboard.writeText(message);
      showSuccess('Invite message copied.');
    } catch {
      showError('Could not copy invite text.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-8 max-w-xl w-full text-center">
          <h1 className="font-display text-2xl font-bold text-slate-800 mb-2">School Admin Access</h1>
          <p className="text-slate-500 mb-6">Create a free account first, then upgrade to a School plan to manage teachers.</p>
          <button
            type="button"
            onClick={() => promptSignupForFree('Create a free account to continue.')}
            className="px-6 py-3 rounded-xl bg-brand-blue text-white font-bold hover:bg-sky-600 transition-colors"
          >
            Sign Up Free
          </button>
        </div>
      </div>
    );
  }

  if (!canManageSchool) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-8 max-w-xl w-full">
          <div className="flex items-center gap-2 text-amber-700 font-bold mb-2">
            <Shield size={18} /> Access Restricted
          </div>
          <p className="text-slate-600">
            This page is available to School Admin users only. If your account should have access, ask your school owner to grant admin rights.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide font-bold text-brand-blue bg-sky-50 px-3 py-1 rounded-full mb-3">
                <Building2 size={14} /> School Admin
              </div>
              <h1 className="font-display text-3xl font-bold text-slate-800">{schoolName}</h1>
              <p className="text-slate-500 text-sm mt-1">Manage teacher spots, school code, approvals, invites, and your teacher list.</p>
            </div>
            <div className="flex items-center gap-4">
              {schoolLogoUrl ? (
                <img
                  src={schoolLogoUrl}
                  alt={`${schoolName} logo`}
                  className="h-16 w-auto max-w-[180px] object-contain"
                />
              ) : (
                <div className="text-slate-400" aria-hidden={isLoadingSchoolLogo}>
                  <Building2 size={30} />
                </div>
              )}
            </div>
          </div>
        </div>

        {feedback && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              feedback.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {feedback.text}
          </div>
        )}

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <KeyRound size={18} /> School Join Code
          </h2>
          <p className="text-sm text-slate-500 mb-3">
            Teachers can enter this code during sign up. Their access stays pending until you approve it.
          </p>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 mb-3">
            <p className="text-xs uppercase tracking-wide font-bold text-slate-500 mb-1">Current Code</p>
            <p className="font-mono text-xl font-bold text-slate-800 tracking-wide">{schoolCode || 'Not set'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleCopySchoolCode()}
              className="inline-flex items-center px-3 py-2 rounded-lg bg-brand-blue/10 text-brand-blue text-sm font-bold hover:bg-brand-blue/20"
            >
              <Copy size={14} className="mr-2" /> Copy Code
            </button>
            <button
              type="button"
              onClick={() => void handleRegenerateSchoolCode()}
              disabled={regeneratingCode}
              className="inline-flex items-center px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-bold hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw size={14} className={`mr-2 ${regeneratingCode ? 'animate-spin' : ''}`} />
              {regeneratingCode ? 'Regenerating...' : 'Regenerate Code'}
            </button>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Clock3 size={18} /> Pending Teacher Approvals
          </h2>
          <div className="space-y-3">
            {joinRequests.map((request) => (
              <div key={request.userId} className="rounded-xl border border-slate-200 px-4 py-3">
                <div className="font-semibold text-slate-800">{request.fullName}</div>
                <div className="text-xs text-slate-500" title={request.userId}>
                  {request.email || 'Email unavailable'}
                </div>
                <div className="text-xs text-slate-500 mb-3">
                  Requested: {new Date(request.requestedAt).toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleApproveJoinRequest(request)}
                    disabled={approvingUserId === request.userId}
                    className="inline-flex items-center text-xs font-bold px-3 py-1.5 rounded bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-60"
                  >
                    <CheckCircle2 size={13} className="mr-1.5" />
                    {approvingUserId === request.userId ? 'Approving...' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRejectJoinRequest(request)}
                    disabled={rejectingUserId === request.userId}
                    className="inline-flex items-center text-xs font-bold px-3 py-1.5 rounded bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-60"
                  >
                    <XCircle size={13} className="mr-1.5" />
                    {rejectingUserId === request.userId ? 'Rejecting...' : 'Reject'}
                  </button>
                </div>
              </div>
            ))}
            {!joinRequests.length && <p className="text-sm text-slate-500">No pending join requests.</p>}
          </div>
        </section>

        <div className="grid lg:grid-cols-2 gap-6">
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Users size={18} /> Teacher Spots
            </h2>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-wide font-bold text-slate-500">Active</p>
                <p className="text-lg font-bold text-slate-800">{teacherSpots?.teacherCount ?? 0}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-wide font-bold text-slate-500">Total Spots</p>
                <p className="text-lg font-bold text-slate-800">{teacherSpots?.teacherSpotLimit ?? 0}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-wide font-bold text-slate-500">Available</p>
                <p className="text-lg font-bold text-slate-800">{teacherSpots?.spotsRemaining ?? 0}</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-[140px_1fr_1fr] gap-3 items-center">
              <input
                type="number"
                min={1}
                value={spotChangeCount}
                onChange={(event) => setSpotChangeCount(Math.max(1, Number(event.target.value) || 1))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-blue"
              />
              <button
                type="button"
                disabled={changingSpots || !teacherSpots}
                onClick={() => void handleAdjustTeacherSpots('add')}
                className="rounded-lg bg-brand-blue text-white font-bold px-4 py-2 hover:bg-sky-600 disabled:opacity-70"
              >
                <Plus size={14} className="inline mr-1" /> Add Spots
              </button>
              <button
                type="button"
                disabled={changingSpots || !teacherSpots || maxRemovableSpots < 1}
                onClick={() => void handleAdjustTeacherSpots('remove')}
                className="rounded-lg border border-slate-300 text-slate-700 font-bold px-4 py-2 hover:bg-slate-50 disabled:opacity-60"
              >
                <Minus size={14} className="inline mr-1" /> Remove Spots
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              You can remove up to {maxRemovableSpots} spot{maxRemovableSpots === 1 ? '' : 's'} without affecting active teachers.
            </p>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Mail size={18} /> Teacher Invites (Manual Send)
            </h2>
            <p className="text-sm text-slate-500 mb-3">
              Save invite records, then copy the message and send it via your own email.
            </p>

            <form onSubmit={handleInviteTeacher} className="grid gap-3 mb-5">
              <input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="teacher@school.edu"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-blue"
              />
              <button
                type="submit"
                disabled={sendingInvite}
                className="rounded-lg bg-brand-blue text-white font-bold px-4 py-2 hover:bg-sky-600 disabled:opacity-70"
              >
                Save Invite
              </button>
            </form>

            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {pendingInvites.map((invite) => (
                <div key={invite.id} className="rounded-xl border border-slate-200 px-4 py-3">
                  <div className="text-sm font-semibold text-slate-800">{invite.email}</div>
                  <div className="text-xs text-slate-500 mb-3">
                    Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleResendInvite(invite)}
                      disabled={resendingInviteId === invite.id}
                      className="text-xs font-bold px-3 py-1.5 rounded bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20 disabled:opacity-60"
                    >
                      {resendingInviteId === invite.id ? 'Updating...' : 'Extend 7 Days'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyInviteMessage(invite)}
                      className="text-xs font-bold px-3 py-1.5 rounded bg-sky-50 text-sky-700 hover:bg-sky-100"
                    >
                      Copy Invite Message
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRevokeInvite(invite.id)}
                      className="text-xs font-bold px-3 py-1.5 rounded bg-red-50 text-red-700 hover:bg-red-100"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
              {!pendingInvites.length && <p className="text-sm text-slate-500">No pending invites.</p>}
            </div>
          </section>
        </div>

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Users size={18} /> Teachers
          </h2>

          {loadingData ? (
            <div className="flex items-center text-slate-500 text-sm">
              <RefreshCw size={15} className="animate-spin mr-2" /> Loading teacher directory...
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {teachers.map((teacher) => (
                  <article key={teacher.userId} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800">{teacher.fullName}</div>
                        <div className="text-xs text-slate-500 break-all">{teacher.email || teacher.userId}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                            {teacher.role}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              teacher.status === 'active'
                                ? 'bg-green-50 text-green-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {teacher.status}
                          </span>
                          {teacher.isOwner && (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                              Owner
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleActionsMenu(teacher.userId);
                          }}
                          className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Actions
                          <ChevronDown
                            size={13}
                            className={`ml-1.5 transition-transform ${
                              openActionsForUserId === teacher.userId ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        {openActionsForUserId === teacher.userId && (
                          <div
                            className="absolute right-0 top-full mt-1 z-20 w-52 max-w-[calc(100vw-6rem)] rounded-xl border border-slate-200 bg-white shadow-lg p-1.5 space-y-1"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {renderTeacherActions(teacher)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3">{renderUsageBadges(teacher)}</div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Last Seen: {formatDateTime(teacher.lastActivityAt)}
                    </div>
                  </article>
                ))}
                {!teachers.length && <p className="text-sm text-slate-500 py-1">No teachers assigned yet.</p>}
              </div>

              <div className="hidden md:block overflow-visible">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="py-2 pr-4">Teacher</th>
                      <th className="py-2 pr-4">Usage Activity</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map((teacher) => (
                      <tr key={teacher.userId} className="border-t border-slate-100">
                        <td className="py-3 pr-4">
                          <div className="font-semibold text-slate-800">{teacher.fullName}</div>
                          <div className="text-xs text-slate-500">{teacher.email || teacher.userId}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                              {teacher.role}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                teacher.status === 'active'
                                  ? 'bg-green-50 text-green-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {teacher.status}
                            </span>
                            {teacher.isOwner && (
                              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                                Owner
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          {renderUsageBadges(teacher)}
                          <div className="text-[11px] text-slate-500 mt-1">
                            Last Seen: {formatDateTime(teacher.lastActivityAt)}
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="relative inline-block">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleActionsMenu(teacher.userId);
                              }}
                              className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                            >
                              Actions
                              <ChevronDown size={13} className="ml-1.5" />
                            </button>
                            {openActionsForUserId === teacher.userId && (
                              <div
                                className="absolute right-0 top-full mt-1 z-20 w-52 rounded-xl border border-slate-200 bg-white shadow-lg p-1.5 space-y-1"
                                onClick={(event) => event.stopPropagation()}
                              >
                                {renderTeacherActions(teacher)}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!teachers.length && <p className="text-sm text-slate-500 py-3">No teachers assigned yet.</p>}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

