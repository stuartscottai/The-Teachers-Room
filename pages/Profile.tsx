
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { User, Mail, Save, Lock, CheckCircle, AlertCircle, Database, RefreshCw } from 'lucide-react';
import { syncPublicGameState } from '../utils/gameUtils';

export const Profile: React.FC = () => {
    const { user, updateUserProfile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fullName, setFullName] = useState(user?.name || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
    const [syncMessage, setSyncMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        if (user) setFullName(user.name);
    }, [user]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            // Update Name
            if (fullName !== user?.name) {
                const { error } = await updateUserProfile(fullName);
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
        
        const result = await syncPublicGameState(user.id, user.name);
        
        if (result.success) {
            setSyncMessage({ type: 'success', text: `Successfully synced ${result.count} games.` });
        } else {
            setSyncMessage({ type: 'error', text: `Sync failed: ${result.error}` });
        }
        setIsSyncing(false);
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
                         <img 
                            src={user.avatar} 
                            alt={user.name} 
                            crossOrigin="anonymous"
                            className="w-32 h-32 rounded-full border-4 border-slate-100 shadow-md object-cover bg-slate-100" 
                        />
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

            </div>
        </div>
    );
};
