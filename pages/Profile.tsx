
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { User, Mail, Save, Lock, CheckCircle, AlertCircle, Database, RefreshCw, Edit2, X } from 'lucide-react';
import { syncPublicGameState } from '../utils/gameUtils';
import { Avatar } from '../components/Avatar';
import { ALOHE_AVATAR_URLS } from '../data/avatars';

const AVATAR_OPTIONS: Array<string | null> = [null, ...ALOHE_AVATAR_URLS];

export const Profile: React.FC = () => {
    const { user, updateUserProfile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fullName, setFullName] = useState(user?.name || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
    const [syncMessage, setSyncMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [selectedAvatar, setSelectedAvatar] = useState<string | null>(user?.avatar || null);
    const [isAvatarSaving, setIsAvatarSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setFullName(user.name);
            setSelectedAvatar(user.avatar || null);
        }
    }, [user]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            // Update Name
            if (fullName !== user?.name) {
                const { error } = await updateUserProfile({ name: fullName });
                if (error) throw error;
            }

            // Update Password if provided
            if (password) {
                if (password !== confirmPassword) throw new Error("Passwords do not match");
                const { error } = await supabase.auth.updateUser({ password: password });
                if (error) throw error;
            }

            setMessage({ type: 'success', text: "Profile updated successfully!" });
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
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col md:flex-row items-center gap-8">
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
                            Teacher Account
                        </div>
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
