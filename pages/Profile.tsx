
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { User, Mail, Save, Lock, CheckCircle, AlertCircle, Terminal, Server, Key, Info, Zap } from 'lucide-react';
import { DevSettings } from '../types';

export const Profile: React.FC = () => {
    const { user, updateUserProfile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fullName, setFullName] = useState(user?.name || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
    const [devMessage, setDevMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    // Dev Settings State
    const [devSettings, setDevSettings] = useState<DevSettings>({
        useExternalApi: false,
        externalEndpoint: '',
        apiSecret: ''
    });

    useEffect(() => {
        if (user) setFullName(user.name);
        // Load Dev Settings
        try {
            const saved = localStorage.getItem('ttr_dev_settings');
            if (saved) {
                setDevSettings(JSON.parse(saved));
            } else {
                // Auto-suggest Vercel URL if on Vercel and no settings saved
                if (window.location.hostname.includes('vercel.app')) {
                    setDevSettings(prev => ({
                        ...prev,
                        externalEndpoint: `https://${window.location.hostname}/api/generate`
                    }));
                }
            }
        } catch(e) {}
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

    const handleSaveDevSettings = (e: React.MouseEvent) => {
        e.preventDefault();
        try {
            localStorage.setItem('ttr_dev_settings', JSON.stringify(devSettings));
            setDevMessage({ type: 'success', text: "Dev settings saved to browser!" });
            setTimeout(() => setDevMessage(null), 3000);
        } catch (e) {
            setDevMessage({ type: 'error', text: "Failed to save settings." });
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
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col md:flex-row items-center gap-8">
                    <div className="relative group">
                         <img 
                            src={user.avatar} 
                            alt={user.name} 
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

                {/* DEVELOPER SETTINGS SECTION (Separate Card) */}
                <div className="bg-slate-800 rounded-2xl shadow-lg border border-slate-700 overflow-hidden text-slate-200">
                    <div className="px-8 py-6 border-b border-slate-700 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center">
                                <Terminal size={20} className="mr-2 text-brand-yellow" /> Developer / API Settings
                            </h2>
                            <p className="text-slate-400 text-sm">Configure how the app connects to AI services.</p>
                        </div>
                    </div>
                    
                    <div className="p-8 space-y-6">
                        {devMessage && (
                            <div className={`p-3 rounded-lg text-sm font-bold flex items-center ${devMessage.type === 'success' ? 'bg-green-900/50 text-green-300 border border-green-800' : 'bg-red-900/50 text-red-300 border border-red-800'}`}>
                                {devMessage.text}
                            </div>
                        )}

                        <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                            <span className="text-sm font-bold text-slate-300">Connection Mode</span>
                            <div className="flex items-center bg-slate-700 rounded-full p-1">
                                <button 
                                    type="button"
                                    onClick={() => setDevSettings({...devSettings, useExternalApi: false})}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${!devSettings.useExternalApi ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Internal SDK (Dev)
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setDevSettings({...devSettings, useExternalApi: true})}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${devSettings.useExternalApi ? 'bg-brand-yellow text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                                >
                                    External API (Prod)
                                </button>
                            </div>
                        </div>
                        
                        <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-800/50 flex items-start gap-3">
                            <Info className="text-blue-400 mt-0.5 shrink-0" size={16} />
                            <div className="text-xs text-blue-200 leading-relaxed">
                                {devSettings.useExternalApi ? (
                                    <p>Requests are sent to the <strong>External Endpoint</strong> below. This protects your API Key by keeping it on the server (Vercel). Recommended for production.</p>
                                ) : (
                                    <p>Requests use the <strong>Browser SDK</strong> with your local environment key. Best for local development (StackBlitz/AI Studio).</p>
                                )}
                            </div>
                        </div>
                        
                        <div className={`space-y-6 transition-all duration-300 ${devSettings.useExternalApi ? 'opacity-100' : 'opacity-50 pointer-events-none grayscale'}`}>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">External Endpoint URL</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Server className="h-5 w-5 text-slate-500" />
                                    </div>
                                    <input
                                        type="text"
                                        value={devSettings.externalEndpoint}
                                        onChange={(e) => setDevSettings({...devSettings, externalEndpoint: e.target.value})}
                                        placeholder="https://your-app.vercel.app/api/generate"
                                        className="block w-full pl-10 pr-3 py-3 border border-slate-600 rounded-lg bg-slate-900 text-white placeholder-slate-600 sm:text-sm outline-none font-mono focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">API Secret / Token (Optional)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Key className="h-5 w-5 text-slate-500" />
                                    </div>
                                    <input
                                        type="password"
                                        value={devSettings.apiSecret || ''}
                                        onChange={(e) => setDevSettings({...devSettings, apiSecret: e.target.value})}
                                        placeholder="sk-..."
                                        className="block w-full pl-10 pr-3 py-3 border border-slate-600 rounded-lg bg-slate-900 text-white placeholder-slate-600 sm:text-sm outline-none font-mono focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-700 flex justify-end">
                             <button
                                onClick={handleSaveDevSettings}
                                className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-bold rounded-xl shadow-md text-slate-900 bg-brand-yellow hover:bg-yellow-300 focus:outline-none transition-colors"
                            >
                                <Zap className="mr-2 h-4 w-4" /> Save Configuration
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
