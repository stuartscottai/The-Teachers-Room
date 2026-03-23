import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { User, Mail, Save, Lock, CheckCircle, AlertCircle, Database, RefreshCw, Edit2, X, Building2, ImagePlus, Trash2 } from 'lucide-react';
import { syncPublicGameState } from '../utils/gameUtils';
import { Avatar } from '../components/Avatar';
import { ALOHE_AVATAR_URLS } from '../data/avatars';
import { cancelMyAccount, getMyPendingSchoolJoinRequest, getMyProfileGameStats, MyProfileGameStats, requestSchoolJoinWithCode } from '../services/accountAccess';
import { removeSchoolLogoForSchool, resolveSchoolLogoForSchool, uploadSchoolLogoForSchool } from '../utils/schoolLogoStorage';

const AVATAR_OPTIONS: Array<string | null> = [null, ...ALOHE_AVATAR_URLS];

export const Profile: React.FC = () => {
    const { user, updateUserProfile, refreshUserAccess, logout } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fullName, setFullName] = useState(user?.name || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
    const [syncMessage, setSyncMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [selectedAvatar, setSelectedAvatar] = useState<string | null>(user?.avatar || null);
    const [isAvatarSaving, setIsAvatarSaving] = useState(false);
    const [schoolLogoPath, setSchoolLogoPath] = useState<string | null>(null);
    const [schoolLogoUrl, setSchoolLogoUrl] = useState<string | null>(null);
    const [isLoadingSchoolLogo, setIsLoadingSchoolLogo] = useState(false);
    const [isSavingSchoolLogo, setIsSavingSchoolLogo] = useState(false);
    const [isCancellingAccount, setIsCancellingAccount] = useState(false);
    const [schoolJoinCodeInput, setSchoolJoinCodeInput] = useState('');
    const [pendingSchoolJoinRequest, setPendingSchoolJoinRequest] = useState<{ schoolName: string; requestedAt: string } | null>(null);
    const [isLoadingSchoolJoinRequest, setIsLoadingSchoolJoinRequest] = useState(false);
    const [isSubmittingSchoolJoinRequest, setIsSubmittingSchoolJoinRequest] = useState(false);
    const [isLoadingProfileGameStats, setIsLoadingProfileGameStats] = useState(false);
    const [profileGameStats, setProfileGameStats] = useState<MyProfileGameStats>({
        gamesCreated: 0,
        createdPlaycount: 0,
        gamesPlayed: 0,
        aiGens: 0,
        lastGameCreatedAt: null,
        lastPlayedAt: null,
        lastGeneratedAt: null,
        lastActivityAt: null
    });
    const schoolLogoInputRef = useRef<HTMLInputElement | null>(null);
    const schoolLogoUrlRef = useRef<string | null>(null);

    const replaceSchoolLogoUrl = (nextUrl: string | null) => {
        setSchoolLogoUrl((prev) => {
            if (prev && prev.startsWith('blob:') && prev !== nextUrl) {
                URL.revokeObjectURL(prev);
            }
            return nextUrl;
        });
    };

    const accountLabel =
        user?.accountType === 'school'
            ? `School Account (${user.schoolAccess?.role === 'admin' ? 'Admin' : 'Teacher'})`
            : user?.accountType === 'teacher'
                ? 'Teacher Account'
                : 'Free Account';
    const showSchoolHeroLogo = user?.accountType === 'school' && Boolean(user.schoolAccess);

    useEffect(() => {
        if (user) {
            setFullName(user.name);
            setSelectedAvatar(user.avatar || null);
        }
    }, [user]);

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
        const schoolId = user?.schoolAccess?.schoolId;
        if (user?.accountType !== 'school' || !schoolId) {
            setSchoolLogoPath(null);
            replaceSchoolLogoUrl(null);
            setIsLoadingSchoolLogo(false);
            return;
        }

        let active = true;
        const loadSchoolLogo = async () => {
            setIsLoadingSchoolLogo(true);
            try {
                const result = await resolveSchoolLogoForSchool(schoolId);
                if (!active) return;
                setSchoolLogoPath(result.path);
                replaceSchoolLogoUrl(result.signedUrl);
            } catch (error) {
                if (!active) return;
                console.warn('Failed to load school logo:', error);
                setSchoolLogoPath(null);
                replaceSchoolLogoUrl(null);
            } finally {
                if (active) setIsLoadingSchoolLogo(false);
            }
        };

        void loadSchoolLogo();
        return () => {
            active = false;
        };
    }, [user?.accountType, user?.schoolAccess?.schoolId]);

    useEffect(() => {
        const userId = user?.id;
        if (!userId || user?.accountType === 'school') {
            setPendingSchoolJoinRequest(null);
            setIsLoadingSchoolJoinRequest(false);
            return;
        }

        let active = true;
        const loadPendingSchoolJoinRequest = async () => {
            setIsLoadingSchoolJoinRequest(true);
            const { request, error } = await getMyPendingSchoolJoinRequest(userId);
            if (!active) return;
            if (error) {
                console.warn('Failed to load pending school affiliation request:', error);
            }
            if (request) {
                setPendingSchoolJoinRequest({
                    schoolName: request.schoolName,
                    requestedAt: request.requestedAt
                });
            } else {
                setPendingSchoolJoinRequest(null);
            }
            setIsLoadingSchoolJoinRequest(false);
        };

        void loadPendingSchoolJoinRequest();
        return () => {
            active = false;
        };
    }, [user?.id, user?.accountType]);

    useEffect(() => {
        const userId = user?.id;
        if (!userId) {
            setProfileGameStats({
                gamesCreated: 0,
                createdPlaycount: 0,
                gamesPlayed: 0,
                aiGens: 0,
                lastGameCreatedAt: null,
                lastPlayedAt: null,
                lastGeneratedAt: null,
                lastActivityAt: null
            });
            setIsLoadingProfileGameStats(false);
            return;
        }

        let active = true;
        const loadProfileGameStats = async () => {
            setIsLoadingProfileGameStats(true);
            const stats = await getMyProfileGameStats(userId);
            if (!active) return;
            setProfileGameStats(stats);
            setIsLoadingProfileGameStats(false);
        };

        void loadProfileGameStats();
        return () => {
            active = false;
        };
    }, [user?.id]);

    const getErrorMessage = (error: unknown, fallback: string) => {
        if (error && typeof error === 'object' && 'message' in error) {
            return String((error as any).message || fallback);
        }
        return fallback;
    };

    const formatDateTime = (value: string | null | undefined) => {
        if (!value) return 'No activity yet';
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return 'No activity yet';
        return parsed.toLocaleString();
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const nextFullName = fullName.trim();
            const hasNameChange = nextFullName !== (user?.name || '');
            const hasPasswordChange = Boolean(currentPassword || password || confirmPassword);

            if (hasPasswordChange) {
                if (!password || !confirmPassword) {
                    throw new Error('Enter and confirm your new password.');
                }
                if (password !== confirmPassword) throw new Error("Passwords do not match");
                if (password.length < 8) throw new Error('Password must be at least 8 characters long.');
                if (!currentPassword) throw new Error('Enter your current password to change it.');

                const { error: verifyPasswordError } = await supabase.auth.signInWithPassword({
                    email: user.email,
                    password: currentPassword
                });
                if (verifyPasswordError) {
                    throw new Error('Your current password is incorrect.');
                }

                const { error } = await supabase.auth.updateUser({
                    password
                });
                if (error) throw error;
            }

            if (hasNameChange) {
                const { error } = await updateUserProfile({ name: nextFullName });
                if (error) throw error;
            }

            if (!hasNameChange && !hasPasswordChange) {
                setMessage({ type: 'success', text: 'No changes to save.' });
                return;
            }

            const successText = hasNameChange && hasPasswordChange
                ? 'Profile and password updated successfully!'
                : hasPasswordChange
                    ? 'Password updated successfully!'
                    : 'Profile updated successfully!';

            setMessage({ type: 'success', text: successText });
            setCurrentPassword('');
            setPassword('');
            setConfirmPassword('');
        } catch (error: any) {
             setMessage({ type: 'error', text: error.message || "Failed to update profile" });
        } finally {
            setLoading(false);
        }
    };

    const handleSyncGames = async () => {
        if (!user) return;
        setIsSyncing(true);
        setSyncMessage(null);
        
        const result = await syncPublicGameState(user.id, user.name, user.avatar);
        
        if (result.success) {
            setSyncMessage({ type: 'success', text: `Successfully synced ${result.count} games.` });
        } else {
            setSyncMessage({ type: 'error', text: `Sync failed: ${result.error}` });
        }
        setIsSyncing(false);
    };

    const openAvatarPicker = () => {
        setSelectedAvatar(user?.avatar || null);
        setShowAvatarPicker(true);
    };

    const closeAvatarPicker = () => {
        setSelectedAvatar(user?.avatar || null);
        setShowAvatarPicker(false);
    };

    const handleAvatarSave = async () => {
        if (!user) return;
        setIsAvatarSaving(true);
        setMessage(null);

        const { error } = await updateUserProfile({ avatarUrl: selectedAvatar });
        if (error) {
            setMessage({ type: 'error', text: error.message || 'Failed to update avatar' });
        } else {
            setMessage({ type: 'success', text: 'Avatar updated successfully!' });
            setShowAvatarPicker(false);
        }
        setIsAvatarSaving(false);
    };

    const handleCancelAccount = async () => {
        const firstConfirm = window.confirm('Cancel your account? This action is permanent.');
        if (!firstConfirm) return;
        const secondConfirm = window.confirm('This will permanently delete your account data and cannot be undone. Continue?');
        if (!secondConfirm) return;

        setMessage(null);
        setIsCancellingAccount(true);
        const { error } = await cancelMyAccount();
        setIsCancellingAccount(false);

        if (error) {
            setMessage({ type: 'error', text: error.message || 'Could not cancel account.' });
            return;
        }

        await Promise.resolve(logout() as any);
    };

    const handleSchoolLogoUploadFromAdmin = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        event.target.value = '';
        if (!file) return;

        if (!user || user.accountType !== 'school' || user.schoolAccess?.role !== 'admin') return;
        const schoolId = user.schoolAccess?.schoolId;
        if (!schoolId) return;

        setMessage(null);
        setIsSavingSchoolLogo(true);
        try {
            const uploaded = await uploadSchoolLogoForSchool({ schoolId, file });
            setSchoolLogoPath(uploaded.path);
            replaceSchoolLogoUrl(uploaded.signedUrl);
            setMessage({ type: 'success', text: 'School logo updated.' });
        } catch (logoError) {
            setMessage({ type: 'error', text: getErrorMessage(logoError, 'Could not upload school logo.') });
        } finally {
            setIsSavingSchoolLogo(false);
        }
    };

    const handleRemoveSchoolLogo = async () => {
        if (!user || user.accountType !== 'school' || user.schoolAccess?.role !== 'admin') return;
        const schoolId = user.schoolAccess?.schoolId;
        if (!schoolId) return;

        setMessage(null);
        setIsSavingSchoolLogo(true);
        try {
            await removeSchoolLogoForSchool(schoolId);
            setSchoolLogoPath(null);
            replaceSchoolLogoUrl(null);
            setMessage({ type: 'success', text: 'School logo removed.' });
        } catch (logoError) {
            setMessage({ type: 'error', text: getErrorMessage(logoError, 'Could not remove school logo.') });
        } finally {
            setIsSavingSchoolLogo(false);
        }
    };

    const handleRequestSchoolAffiliation = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!user || user.accountType === 'school') return;

        const code = schoolJoinCodeInput.trim().toUpperCase();
        if (!code) {
            setMessage({ type: 'error', text: 'Please enter a school code.' });
            return;
        }

        setMessage(null);
        setIsSubmittingSchoolJoinRequest(true);
        const result = await requestSchoolJoinWithCode(code);
        setIsSubmittingSchoolJoinRequest(false);

        if (result.error) {
            setMessage({ type: 'error', text: result.error.message || 'Could not submit school request.' });
            return;
        }

        setSchoolJoinCodeInput('');
        await refreshUserAccess();
        const pendingLookup = await getMyPendingSchoolJoinRequest(user.id);
        if (pendingLookup.request) {
            setPendingSchoolJoinRequest({
                schoolName: pendingLookup.request.schoolName,
                requestedAt: pendingLookup.request.requestedAt
            });
            setMessage({
                type: 'success',
                text: `School request sent to ${pendingLookup.request.schoolName}. Awaiting admin approval.`
            });
        } else {
            setMessage({ type: 'success', text: 'School request sent. Awaiting admin approval.' });
        }
    };

    if (!user) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-xl shadow-lg text-center">
                <p className="text-slate-600 mb-4">Please log in to view your profile.</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
                {/* Header / Avatar */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                    <div className={`flex flex-col items-center gap-8 ${showSchoolHeroLogo ? 'lg:flex-row lg:items-center lg:justify-between' : 'md:flex-row'}`}>
                        <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="relative group">
                            <Avatar
                                name={user.name}
                                src={user.avatar}
                                className="w-32 h-32 border-4 border-slate-100 shadow-md"
                                textClassName="text-3xl"
                            />
                            <button
                                type="button"
                                onClick={openAvatarPicker}
                                className="absolute bottom-2 right-2 bg-white text-slate-600 border border-slate-200 rounded-full p-2 shadow-sm hover:bg-slate-50 transition-colors"
                                aria-label="Edit avatar"
                                title="Edit avatar"
                            >
                                <Edit2 size={16} />
                            </button>
                        </div>
                        <div className="text-center md:text-left">
                            <h1 className="text-3xl font-display font-bold text-slate-800">{user.name}</h1>
                            <div className="flex items-center justify-center md:justify-start text-slate-500 mt-2">
                                <Mail size={16} className="mr-2" />
                                <span>{user.email}</span>
                            </div>
                             <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brand-yellow/20 text-yellow-800 border border-brand-yellow/30">
                                {accountLabel}
                            </div>
                            {showSchoolHeroLogo && (
                                <div className="mt-3">
                                    <p className="text-sm font-semibold text-slate-700">{user.schoolAccess?.schoolName}</p>
                                    <p className="text-xs text-slate-500">
                                        {isLoadingSchoolLogo ? 'Loading school logo...' : 'School member'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                        {showSchoolHeroLogo && (
                            <div className="flex items-center justify-center lg:justify-end">
                                {schoolLogoUrl ? (
                                    <img
                                        src={schoolLogoUrl}
                                        alt={`${user.schoolAccess?.schoolName || 'School'} logo`}
                                        className="h-24 md:h-28 w-auto max-w-[220px] object-contain"
                                        onError={() => replaceSchoolLogoUrl(null)}
                                    />
                                ) : (
                                    <Building2 size={48} className="text-slate-400" />
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ACTIVITY STATS */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100">
                        <h2 className="text-xl font-bold text-slate-800">My Activity</h2>
                        <p className="text-slate-500 text-sm">Quick overview of your game activity.</p>
                    </div>
                    <div className="p-8">
                        {isLoadingProfileGameStats ? (
                            <p className="text-sm text-slate-500">Loading activity stats...</p>
                        ) : (
                            <>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                                    <span
                                        className="rounded-full bg-slate-100 px-2.5 py-1 cursor-help"
                                        title="This is the total number of games created by your account."
                                    >
                                        games created: <span className="font-bold text-slate-800">{profileGameStats.gamesCreated}</span>
                                    </span>
                                    <span
                                        className="rounded-full bg-slate-100 px-2.5 py-1 cursor-help"
                                        title="This is the total number of times your created games have been played."
                                    >
                                        Created Playcount: <span className="font-bold text-slate-800">{profileGameStats.createdPlaycount}</span>
                                    </span>
                                    <span
                                        className="rounded-full bg-slate-100 px-2.5 py-1 cursor-help"
                                        title="This is the total number of game sessions started by your account."
                                    >
                                        Games played: <span className="font-bold text-slate-800">{profileGameStats.gamesPlayed}</span>
                                    </span>
                                    <span
                                        className="rounded-full bg-slate-100 px-2.5 py-1 cursor-help"
                                        title="This is the total number of successful AI generations by your account."
                                    >
                                        AI Gens: <span className="font-bold text-slate-800">{profileGameStats.aiGens}</span>
                                    </span>
                                </div>
                                <p className="mt-3 text-xs text-slate-500">
                                    Last Seen: {formatDateTime(profileGameStats.lastActivityAt)}
                                </p>
                            </>
                        )}
                    </div>
                </div>

                {/* PLAN & UPGRADES */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100">
                        <h2 className="text-xl font-bold text-slate-800">Plan Management</h2>
                        <p className="text-slate-500 text-sm">View plan features and change your plan from one place.</p>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Current Plan</p>
                            <p className="font-bold text-slate-800 mt-1">{accountLabel}</p>
                            {user.accountType === 'free' && (
                                <p className="text-xs text-slate-500 mt-1">Manual creation is enabled. AI generation is locked.</p>
                            )}
                        </div>

                        <div className="rounded-xl border border-brand-yellow/40 bg-brand-yellow/10 p-4">
                            <h3 className="font-bold text-slate-800 mb-2">Change Plan</h3>
                            <p className="text-sm text-slate-600 mb-4">
                                Compare Free, Teacher, and School features, then switch plans (upgrades or downgrades) on one screen.
                            </p>
                            <Link
                                to="/change-plan"
                                className="inline-flex items-center px-5 py-2.5 rounded-lg font-bold text-white bg-brand-blue hover:bg-sky-600 transition-colors"
                            >
                                Change Plan
                            </Link>
                        </div>

                        {user.accountType !== 'school' && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <h3 className="font-bold text-slate-800 mb-2 flex items-center">
                                    <Building2 size={16} className="mr-2 text-slate-500" /> Join A School
                                </h3>
                                {isLoadingSchoolJoinRequest ? (
                                    <p className="text-sm text-slate-500">Checking school affiliation requests...</p>
                                ) : pendingSchoolJoinRequest ? (
                                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
                                        <p className="text-sm font-semibold text-amber-800">Request Pending</p>
                                        <p className="text-sm text-amber-700 mt-1">
                                            Your request to join <span className="font-semibold">{pendingSchoolJoinRequest.schoolName}</span> is awaiting admin approval.
                                        </p>
                                        <p className="text-xs text-amber-700/80 mt-1">
                                            Submitted: {new Date(pendingSchoolJoinRequest.requestedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleRequestSchoolAffiliation} className="space-y-3">
                                        <p className="text-sm text-slate-600">
                                            Have a school code? Enter it to request school affiliation.
                                        </p>
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <input
                                                type="text"
                                                value={schoolJoinCodeInput}
                                                onChange={(event) => setSchoolJoinCodeInput(event.target.value.toUpperCase())}
                                                placeholder="Enter school code"
                                                className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-brand-blue font-mono tracking-wide"
                                            />
                                            <button
                                                type="submit"
                                                disabled={isSubmittingSchoolJoinRequest}
                                                className={`px-4 py-2 rounded-lg font-bold text-white bg-brand-blue hover:bg-sky-600 transition-colors ${isSubmittingSchoolJoinRequest ? 'opacity-70 cursor-not-allowed' : ''}`}
                                            >
                                                {isSubmittingSchoolJoinRequest ? 'Requesting...' : 'Request Access'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )}

                        {user.accountType === 'school' && user.schoolAccess?.role === 'admin' && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <h3 className="font-bold text-slate-800 mb-2 flex items-center">
                                    <Building2 size={16} className="mr-2 text-slate-500" /> School Management
                                </h3>
                                <p className="text-sm text-slate-600 mb-3">
                                    Your account is already on the School plan.
                                </p>
                                <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3">
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">School Logo</p>
                                    <div className="mt-2 flex items-center gap-3">
                                        <div className="w-16 h-16 rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
                                            {schoolLogoUrl ? (
                                                <img
                                                    src={schoolLogoUrl}
                                                    alt="School logo"
                                                    className="w-full h-full object-contain"
                                                    onError={() => replaceSchoolLogoUrl(null)}
                                                />
                                            ) : (
                                                <Building2 size={20} className="text-slate-400" />
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {schoolLogoPath ? 'Logo is visible on every teacher profile in this school.' : 'No school logo uploaded yet.'}
                                        </div>
                                    </div>
                                    {user.schoolAccess?.role === 'admin' && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <input
                                                ref={schoolLogoInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleSchoolLogoUploadFromAdmin}
                                            />
                                            <button
                                                type="button"
                                                disabled={isSavingSchoolLogo}
                                                onClick={() => schoolLogoInputRef.current?.click()}
                                                className={`inline-flex items-center px-3 py-2 rounded-lg text-xs font-bold text-white bg-brand-blue hover:bg-sky-600 transition-colors ${isSavingSchoolLogo ? 'opacity-70 cursor-not-allowed' : ''}`}
                                            >
                                                <ImagePlus size={13} className="mr-1.5" />
                                                {schoolLogoPath ? 'Replace Logo' : 'Upload Logo'}
                                            </button>
                                            {schoolLogoPath && (
                                                <button
                                                    type="button"
                                                    disabled={isSavingSchoolLogo}
                                                    onClick={handleRemoveSchoolLogo}
                                                    className={`inline-flex items-center px-3 py-2 rounded-lg text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors ${isSavingSchoolLogo ? 'opacity-70 cursor-not-allowed' : ''}`}
                                                >
                                                    <Trash2 size={13} className="mr-1.5" />
                                                    Remove Logo
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {user.schoolAccess?.role === 'admin' ? (
                                    <Link
                                        to="/school-admin"
                                        className="inline-flex items-center px-4 py-2 rounded-lg font-bold text-white bg-brand-blue hover:bg-sky-600 transition-colors"
                                    >
                                        Open School Admin
                                    </Link>
                                ) : (
                                    <p className="text-xs text-slate-500">
                                        You are a school teacher member. Ask your school admin for management access.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Settings Form */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100">
                        <h2 className="text-xl font-bold text-slate-800">Profile Settings</h2>
                        <p className="text-slate-500 text-sm">Update your personal information and security preferences.</p>
                    </div>
                    
                    <div className="p-8">
                        {message && (
                            <div className={`mb-6 p-4 rounded-lg flex items-start ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {message.type === 'success' ? <CheckCircle className="mr-2 mt-0.5" size={18} /> : <AlertCircle className="mr-2 mt-0.5" size={18} />}
                                <span>{message.text}</span>
                            </div>
                        )}

                        <form onSubmit={handleUpdateProfile} className="space-y-8">
                            {/* Personal Info */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Personal Information</h3>
                                <div className="grid grid-cols-1 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <User className="h-5 w-5 text-slate-400" />
                                            </div>
                                            <input
                                                type="text"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-brand-blue focus:border-brand-blue sm:text-sm outline-none transition-colors"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Mail className="h-5 w-5 text-slate-400" />
                                            </div>
                                            <input
                                                type="email"
                                                value={user.email}
                                                disabled
                                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 sm:text-sm cursor-not-allowed outline-none"
                                            />
                                        </div>
                                        <p className="mt-1 text-xs text-slate-400">Email cannot be changed directly.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-8 space-y-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Security</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                     <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Lock className="h-5 w-5 text-slate-400" />
                                            </div>
                                            <input
                                                type="password"
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                placeholder="Required to change your password"
                                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-brand-blue focus:border-brand-blue sm:text-sm outline-none transition-colors"
                                            />
                                        </div>
                                        <p className="mt-1 text-xs text-slate-400">
                                            Enter your current password before setting a new one.
                                        </p>
                                    </div>
                                     <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Lock className="h-5 w-5 text-slate-400" />
                                            </div>
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Leave blank to keep current"
                                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-brand-blue focus:border-brand-blue sm:text-sm outline-none transition-colors"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Lock className="h-5 w-5 text-slate-400" />
                                            </div>
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="Confirm new password"
                                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-brand-blue focus:border-brand-blue sm:text-sm outline-none transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-sm text-white bg-brand-blue hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {loading ? 'Saving...' : <><Save className="mr-2 -ml-1 h-5 w-5" /> Save Profile</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* ACCOUNT CANCELLATION */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100">
                        <h2 className="text-xl font-bold text-slate-800">Account Cancellation</h2>
                        <p className="text-slate-500 text-sm">Permanently delete your account.</p>
                    </div>
                    <div className="p-8">
                        <p className="text-sm text-slate-600 mb-4">
                            Cancelling your account is permanent and cannot be undone. All saved games, worksheets, and account data will be permanently deleted.
                        </p>
                        <button
                            type="button"
                            onClick={handleCancelAccount}
                            disabled={isCancellingAccount}
                            className={`inline-flex items-center px-5 py-2.5 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700 transition-colors ${isCancellingAccount ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isCancellingAccount ? 'Cancelling...' : 'Cancel Account'}
                        </button>
                    </div>
                </div>

                {/* ACCOUNT MAINTENANCE SECTION */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 flex items-center">
                                <Database size={20} className="mr-2 text-slate-500" /> Maintenance
                            </h2>
                            <p className="text-slate-500 text-sm">Tools to manage your data consistency.</p>
                        </div>
                    </div>
                    <div className="p-8">
                        {syncMessage && (
                            <div className={`mb-4 p-3 rounded-lg text-sm font-bold flex items-center ${syncMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {syncMessage.text}
                            </div>
                        )}
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-slate-700">Sync Public Status</h3>
                                <p className="text-sm text-slate-500 max-w-sm">If your games aren't appearing in the Community tab despite being marked "Public", use this to force an update.</p>
                            </div>
                            <button 
                                onClick={handleSyncGames} 
                                disabled={isSyncing}
                                className={`px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <RefreshCw size={16} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`} /> 
                                {isSyncing ? 'Syncing...' : 'Run Sync'}
                            </button>
                        </div>
                    </div>
                </div>

                {showAvatarPicker && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-100 w-full max-w-5xl max-h-[85vh] flex flex-col">
                            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                                <div>
                                    <h2 className="text-xl font-bold">Choose an avatar</h2>
                                    <p className="text-sm text-slate-500">Pick one from the full Alohe collection.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeAvatarPicker}
                                    className="p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
                                    aria-label="Close avatar picker"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto">
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                                    {AVATAR_OPTIONS.map((avatarUrl) => {
                                        const isSelected = selectedAvatar === avatarUrl;
                                        const key = avatarUrl || 'initials';
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => setSelectedAvatar(avatarUrl)}
                                                className={`relative rounded-full p-1 transition-all ${isSelected ? 'ring-2 ring-brand-blue' : 'ring-1 ring-slate-200 hover:ring-slate-300'}`}
                                                aria-pressed={isSelected}
                                                aria-label={avatarUrl ? 'Select avatar' : 'Use initials'}
                                            >
                                                {avatarUrl ? (
                                                    <img
                                                        src={avatarUrl}
                                                        alt="Avatar option"
                                                        loading="lazy"
                                                        className="w-16 h-16 rounded-full object-cover bg-slate-100"
                                                    />
                                                ) : (
                                                    <Avatar
                                                        name={user.name}
                                                        src={null}
                                                        className="w-16 h-16"
                                                        textClassName="text-lg"
                                                        title="Use initials"
                                                    />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeAvatarPicker}
                                    className="px-4 py-2 rounded-lg font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAvatarSave}
                                    disabled={isAvatarSaving}
                                    className={`px-5 py-2 rounded-lg font-bold text-white bg-brand-blue hover:bg-sky-600 transition-colors ${isAvatarSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {isAvatarSaving ? 'Saving...' : 'Save Avatar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
