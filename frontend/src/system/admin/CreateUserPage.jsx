import React, { useState } from 'react';
import axios from 'axios';
import {
    User, Mail, Eye, EyeOff, ChevronDown, UserPlus, Shield, ArrowLeft, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { permissionTabs, getSafePermissions } from '../constants';

const CreateUserPage = ({ onBack }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        username: '',
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        user_type: 'student',
        permissions: getSafePermissions()
    });

    const handlePermissionChange = (tab, action, subTab = null) => {
        setFormData(prev => {
            const newPerms = JSON.parse(JSON.stringify(prev.permissions));
            if (subTab) {
                if (!newPerms[tab]) newPerms[tab] = {};
                if (!newPerms[tab][subTab]) newPerms[tab][subTab] = { view: false, create: false, edit: false, delete: false };
                newPerms[tab][subTab][action] = !newPerms[tab][subTab][action];
            } else {
                if (!newPerms[tab]) newPerms[tab] = { view: false, create: false, edit: false, delete: false };
                newPerms[tab][action] = !newPerms[tab][action];
            }
            return { ...prev, permissions: newPerms };
        });
    };

    const toggleAllPermissions = (tab, subTab = null) => {
        setFormData(prev => {
            const newPerms = JSON.parse(JSON.stringify(prev.permissions));
            if (subTab) {
                if (!newPerms[tab]) newPerms[tab] = {};
                if (!newPerms[tab][subTab]) newPerms[tab][subTab] = { view: false, create: false, edit: false, delete: false };
                const target = newPerms[tab][subTab];
                const allTrue = ['view', 'create', 'edit', 'delete'].every(action => target[action]);
                ['view', 'create', 'edit', 'delete'].forEach(action => {
                    newPerms[tab][subTab][action] = !allTrue;
                });
            } else {
                const tabConfig = permissionTabs.find(t => t.id === tab);
                if (tabConfig && tabConfig.subs) {
                    if (!newPerms[tab]) newPerms[tab] = {};
                    const allSubsTrue = tabConfig.subs.every(sub => {
                        const target = newPerms[tab][sub.id] || {};
                        return ['view', 'create', 'edit', 'delete'].every(action => target[action]);
                    });
                    tabConfig.subs.forEach(sub => {
                        if (!newPerms[tab][sub.id]) newPerms[tab][sub.id] = { view: false, create: false, edit: false, delete: false };
                        ['view', 'create', 'edit', 'delete'].forEach(action => {
                            newPerms[tab][sub.id][action] = !allSubsTrue;
                        });
                    });
                } else {
                    if (!newPerms[tab]) newPerms[tab] = { view: false, create: false, edit: false, delete: false };
                    const allTrue = ['view', 'create', 'edit', 'delete'].every(action => newPerms[tab][action]);
                    ['view', 'create', 'edit', 'delete'].forEach(action => {
                        newPerms[tab][action] = !allTrue;
                    });
                }
            }
            return { ...prev, permissions: newPerms };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            const apiUrl = getApiUrl();
            const response = await axios.post(`${apiUrl}/api/register/`, formData);
            if (response.data) {
                setSuccessMessage(`User "${formData.username}" created successfully!`);
                setTimeout(() => {
                    onBack();
                }, 1500);
            }
        } catch (err) {
            console.error("Failed to create user", err);
            setError(err.response?.data?.error || err.response?.data?.username?.[0] || "Failed to create user");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in zoom-in duration-500">
            <div className={`p-10 rounded-[5px] border shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                <div className="flex items-center gap-6 mb-10">
                    <button onClick={onBack} className={`p-3 rounded-[5px] transition-all hover:scale-110 active:scale-95 ${isDarkMode ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-900 shadow-sm border border-slate-200/50'}`}>
                        <ArrowLeft size={20} strokeWidth={3} />
                    </button>
                    <div>
                        <h2 className="text-3xl font-black uppercase tracking-tight">Create <span className="text-orange-500">New User</span></h2>
                        <p className={`text-sm font-medium opacity-50 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Configure account credentials and granular access control.</p>
                    </div>
                </div>

                {successMessage && (
                    <div className="mb-8 p-6 rounded-[5px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center gap-4 font-bold uppercase tracking-widest text-xs animate-in zoom-in">
                        <ShieldCheck size={24} />
                        {successMessage}
                    </div>
                )}

                {error && (
                    <div className="mb-8 p-6 rounded-[5px] bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-4 font-bold uppercase tracking-widest text-xs animate-in zoom-in">
                        <ShieldCheck size={24} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-8">
                        <div className="space-y-6">
                            <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-3">
                                <User size={20} className="text-orange-500" />
                                Account Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">First Name</label>
                                    <input type="text" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                        style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                        className={`w-full p-4 rounded-[5px] border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 
                                            ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-400'}`}
                                        placeholder="First Name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Last Name</label>
                                    <input type="text" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                        style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                        className={`w-full p-4 rounded-[5px] border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 
                                            ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-400'}`}
                                        placeholder="Last Name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Username</label>
                                    <input required type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })}
                                        style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                        className={`w-full p-4 rounded-[5px] border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 
                                            ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-400'}
                                            autofill:transition-colors autofill:duration-5000000`}
                                        placeholder="admin_atanu"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Email</label>
                                    <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                        className={`w-full p-4 rounded-[5px] border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 
                                            ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-400'}
                                            autofill:transition-colors autofill:duration-5000000`}
                                        placeholder="atanu@example.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Password</label>
                                    <div className="relative">
                                        <input
                                            required
                                            type={showPassword ? "text" : "password"}
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                            style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                            className={`w-full p-4 pr-12 rounded-[5px] border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 
                                                ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-400'}
                                                autofill:transition-colors autofill:duration-5000000`}
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className={`absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-[5px] transition-all hover:scale-110 active:scale-95 ${isDarkMode ? 'text-slate-500 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-200'}`}
                                        >
                                            {showPassword ? <EyeOff size={18} strokeWidth={2.5} /> : <Eye size={18} strokeWidth={2.5} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Role</label>
                                    <div className="relative">
                                        <select value={formData.user_type} onChange={e => setFormData({ ...formData, user_type: e.target.value })}
                                            style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                            className={`w-full p-4 pr-12 rounded-[5px] border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 appearance-none 
                                                ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'} 
                                                [&>option]:bg-slate-900 [&>option]:text-white cursor-pointer`}
                                        >
                                            <option value="student">Student</option>
                                            <option value="parent">Parent</option>
                                            <option value="staff">Staff</option>
                                            <option value="admin">Admin</option>
                                            <option value="superadmin">Super Admin</option>
                                        </select>
                                        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button disabled={isLoading} type="submit" className="w-full py-5 bg-orange-600 hover:bg-orange-700 text-white rounded-[5px] font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-600/30 transition-all active:scale-95 flex items-center justify-center gap-3">
                            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <> <UserPlus size={18} /> <span>Create Account</span> </>}
                        </button>
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-3">
                            <Shield size={20} className="text-orange-500" />
                            Module Access Control
                        </h3>

                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                            {permissionTabs.map((tab) => (
                                <div key={tab.id} className={`p-6 rounded-[5px] border transition-all ${isDarkMode ? 'bg-white/2 border-white/5' : 'bg-slate-100/30 border-slate-200/60 shadow-sm hover:bg-white'}`}>
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-black uppercase tracking-widest opacity-80">{tab.label}</span>
                                            <button
                                                type="button"
                                                onClick={() => toggleAllPermissions(tab.id)}
                                                className={`px-3 py-1 rounded-[5px] text-[9px] font-black uppercase tracking-widest transition-all hover:scale-110 active:scale-95 cursor-pointer ${['view', 'create', 'edit', 'delete'].every(a => formData.permissions[tab.id]?.[a])
                                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                                    : isDarkMode ? 'bg-white/5 text-slate-400 hover:text-white' : 'bg-slate-200 text-slate-600'
                                                    }`}
                                            >
                                                ALL
                                            </button>
                                        </div>
                                        <div className={`px-3 py-1 rounded-[5px] text-[9px] font-black uppercase tracking-widest ${formData.permissions[tab.id]?.view ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                            {formData.permissions[tab.id]?.view ? 'Enabled' : 'Disabled'}
                                        </div>
                                    </div>

                                    {!tab.subs && (
                                        <div className="grid grid-cols-4 gap-2 mb-6">
                                            {['view', 'create', 'edit', 'delete'].map((action) => (
                                                <button
                                                    key={action}
                                                    type="button"
                                                    onClick={() => handlePermissionChange(tab.id, action)}
                                                    className={`py-2 rounded-[5px] text-[9px] font-black uppercase tracking-widest transition-all border cursor-pointer hover:scale-105 active:scale-95 ${formData.permissions[tab.id]?.[action]
                                                        ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20 font-black'
                                                        : isDarkMode ? 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                                                        }`}
                                                >
                                                    {action}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {tab.subs && (
                                        <div className={`pt-6 border-t ${isDarkMode ? 'border-white/5' : 'border-slate-100'} space-y-6`}>
                                            {tab.subs.map(sub => (
                                                <div key={sub.id} className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-1">{sub.label}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleAllPermissions(tab.id, sub.id)}
                                                                className={`px-2 py-0.5 rounded-[5px] text-[8px] font-black uppercase tracking-widest transition-all hover:scale-110 active:scale-95 cursor-pointer ${['view', 'create', 'edit', 'delete'].every(a => formData.permissions[tab.id]?.[sub.id]?.[a])
                                                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                                                    : isDarkMode ? 'bg-white/5 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500'
                                                                    }`}
                                                            >
                                                                ALL
                                                            </button>
                                                        </div>
                                                        {formData.permissions[tab.id]?.[sub.id]?.view && (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {['view', 'create', 'edit', 'delete'].map((action) => (
                                                            <button
                                                                key={action}
                                                                type="button"
                                                                onClick={() => handlePermissionChange(tab.id, action, sub.id)}
                                                                className={`py-1.5 rounded-[5px] text-[8px] font-black uppercase tracking-widest transition-all border cursor-pointer hover:scale-105 active:scale-95 ${formData.permissions[tab.id]?.[sub.id]?.[action]
                                                                    ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20 font-black'
                                                                    : isDarkMode ? 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-100'
                                                                    }`}
                                                            >
                                                                {action}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateUserPage;
