import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    User, Mail, Eye, EyeOff, ChevronDown, UserPlus, Shield, ArrowLeft, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { permissionTabs } from '../constants';

const CreateUserPage = ({ onBack }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        user_type: 'student',
        permissions: {
            dashboard: { view: true, create: false, edit: false, delete: false },
            centre_mgmt: { view: false, create: false, edit: false, delete: false },
            section_mgmt: { view: false, create: false, edit: false, delete: false },
            test_mgmt: {
                view: false, create: false, edit: false, delete: false,
                test_create: { view: false, create: false, edit: false, delete: false },
                test_allotment: { view: false, create: false, edit: false, delete: false },
                test_responses: { view: false, create: false, edit: false, delete: false },
                test_result: { view: false, create: false, edit: false, delete: false }
            },
            question_bank: { view: false, create: false, edit: false, delete: false },
            admin_mgmt: {
                view: false, create: false, edit: false, delete: false,
                admin_system: { view: false, create: false, edit: false, delete: false },
                admin_student: { view: false, create: false, edit: false, delete: false },
                admin_parent: { view: false, create: false, edit: false, delete: false },
                admin_master_data: { view: false, create: false, edit: false, delete: false },
                settings: { view: false, create: false, edit: false, delete: false }
            },
        }
    });

    useEffect(() => {
        if (formData.user_type === 'superadmin') {
            const fullPermissions = JSON.parse(JSON.stringify(formData.permissions));
            Object.keys(fullPermissions).forEach(key => {
                Object.keys(fullPermissions[key]).forEach(action => {
                    if (typeof fullPermissions[key][action] === 'object') {
                        Object.keys(fullPermissions[key][action]).forEach(subAction => {
                            fullPermissions[key][action][subAction] = true;
                        });
                    } else {
                        fullPermissions[key][action] = true;
                    }
                });
            });
            setFormData(prev => ({ ...prev, permissions: fullPermissions }));
        }
    }, [formData.user_type]);

    const handlePermissionChange = (tab, action, subTab = null) => {
        if (formData.user_type === 'superadmin') return;

        setFormData(prev => {
            const newPerms = { ...prev.permissions };
            if (subTab) {
                newPerms[tab] = {
                    ...newPerms[tab],
                    [subTab]: {
                        ...newPerms[tab][subTab],
                        [action]: !newPerms[tab][subTab][action]
                    }
                };
            } else {
                newPerms[tab] = {
                    ...newPerms[tab],
                    [action]: !newPerms[tab][action]
                };
            }
            return { ...prev, permissions: newPerms };
        });
    };

    const toggleAllPermissions = (tab, subTab = null) => {
        if (formData.user_type === 'superadmin') return;

        setFormData(prev => {
            const newPerms = JSON.parse(JSON.stringify(prev.permissions));

            if (subTab) {
                const target = newPerms[tab][subTab];
                const allTrue = ['view', 'create', 'edit', 'delete'].every(action => target[action]);

                const subUpdate = {};
                ['view', 'create', 'edit', 'delete'].forEach(action => {
                    subUpdate[action] = !allTrue;
                });
                newPerms[tab][subTab] = subUpdate;
            } else {
                const tabConfig = permissionTabs.find(t => t.id === tab);
                if (tabConfig.subs) {
                    const allSubsTrue = tabConfig.subs.every(sub =>
                        ['view', 'create', 'edit', 'delete'].every(action => newPerms[tab][sub.id][action])
                    );

                    tabConfig.subs.forEach(sub => {
                        const subUpdate = {};
                        ['view', 'create', 'edit', 'delete'].forEach(action => {
                            subUpdate[action] = !allSubsTrue;
                        });
                        newPerms[tab][sub.id] = subUpdate;
                    });
                } else {
                    const target = newPerms[tab];
                    const allTrue = ['view', 'create', 'edit', 'delete'].every(action => target[action]);
                    const mainUpdate = {};
                    ['view', 'create', 'edit', 'delete'].forEach(action => {
                        mainUpdate[action] = !allTrue;
                    });
                    newPerms[tab] = mainUpdate;
                }
            }
            return { ...prev, permissions: newPerms };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const apiUrl = getApiUrl();
            await axios.post(`${apiUrl}/api/register/`, formData);
            setSuccessMessage('User account created successfully!');
            setTimeout(() => {
                setSuccessMessage('');
                onBack();
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create user');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className={`p-10 rounded-[2.5rem] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-100 border-slate-200 shadow-slate-200/50'}`}>
                <div className="flex items-center gap-6 mb-10">
                    <button onClick={onBack} className={`p-3 rounded-2xl transition-all hover:scale-110 active:scale-95 ${isDarkMode ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-900 shadow-sm border border-slate-200/50'}`}>
                        <ArrowLeft size={20} strokeWidth={3} />
                    </button>
                    <div>
                        <h2 className="text-3xl font-black uppercase tracking-tight">Create <span className="text-orange-500">New User</span></h2>
                        <p className={`text-sm font-medium opacity-50 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Configure account credentials and granular access control.</p>
                    </div>
                </div>

                {successMessage && (
                    <div className="mb-8 p-6 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center gap-4 font-bold uppercase tracking-widest text-xs animate-in zoom-in">
                        <ShieldCheck size={24} />
                        {successMessage}
                    </div>
                )}

                {error && (
                    <div className="mb-8 p-6 rounded-[2rem] bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-4 font-bold uppercase tracking-widest text-xs animate-in zoom-in">
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
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Username</label>
                                    <input required type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })}
                                        style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                        className={`w-full p-4 rounded-2xl border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 
                                            ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-400'}
                                            autofill:transition-colors autofill:duration-[5000000ms]`}
                                        placeholder="admin_atanu"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Email</label>
                                    <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                        className={`w-full p-4 rounded-2xl border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 
                                            ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-400'}
                                            autofill:transition-colors autofill:duration-[5000000ms]`}
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
                                            className={`w-full p-4 pr-12 rounded-2xl border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 
                                                ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-400'}
                                                autofill:transition-colors autofill:duration-[5000000ms]`}
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className={`absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-xl transition-all hover:scale-110 active:scale-95 ${isDarkMode ? 'text-slate-500 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-200'}`}
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
                                            className={`w-full p-4 pr-12 rounded-2xl border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 appearance-none 
                                                ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'} 
                                                [&>option]:bg-slate-900 [&>option]:text-white cursor-pointer`}
                                        >
                                            <option value="student">Student</option>
                                            <option value="parent">Parent</option>
                                            <option value="staff">Staff</option>
                                            <option value="admin">Admin</option>
                                            <option value="superadmin">Super Admin</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                            <ChevronDown size={18} strokeWidth={2.5} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-10">
                            <button disabled={isLoading} type="submit" className="w-full py-5 bg-orange-600 hover:bg-orange-700 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-sm shadow-2xl shadow-orange-600/30 transition-all active:scale-95 flex items-center justify-center gap-4">
                                {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>CREATE USER <UserPlus size={20} /></>}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-3">
                            <Shield size={20} className="text-orange-500" />
                            Module Access Control
                        </h3>

                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                            {permissionTabs.map((tab) => (
                                <div key={tab.id} className={`p-6 rounded-3xl border transition-all ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-100/30 border-slate-200/60 shadow-sm hover:bg-white'}`}>
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-black uppercase tracking-widest opacity-80">{tab.label}</span>
                                            <button
                                                type="button"
                                                onClick={() => toggleAllPermissions(tab.id)}
                                                disabled={formData.user_type === 'superadmin'}
                                                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${['view', 'create', 'edit', 'delete'].every(a => formData.permissions[tab.id]?.[a])
                                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                                    : isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-slate-200 text-slate-600'
                                                    } ${formData.user_type === 'superadmin' ? 'opacity-20 cursor-not-allowed' : 'hover:scale-110 active:scale-95'}`}
                                            >
                                                ALL
                                            </button>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${formData.permissions[tab.id]?.view ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                            {formData.permissions[tab.id]?.view ? 'Enabled' : 'Disabled'}
                                        </div>
                                    </div>

                                    {!tab.subs && (
                                        <div className="grid grid-cols-4 gap-2 mb-6">
                                            {['view', 'create', 'edit', 'delete'].map((action) => (
                                                <button
                                                    key={action}
                                                    type="button"
                                                    disabled={formData.user_type === 'superadmin'}
                                                    onClick={() => handlePermissionChange(tab.id, action)}
                                                    className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${formData.permissions[tab.id][action]
                                                        ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20'
                                                        : isDarkMode ? 'bg-white/5 border-white/5 text-slate-500' : 'bg-white border-slate-200 text-slate-400'
                                                        } ${formData.user_type === 'superadmin' ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
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
                                                                disabled={formData.user_type === 'superadmin'}
                                                                className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${['view', 'create', 'edit', 'delete'].every(a => formData.permissions[tab.id]?.[sub.id]?.[a])
                                                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                                                    : isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-500'
                                                                    } ${formData.user_type === 'superadmin' ? 'opacity-20 cursor-not-allowed' : 'hover:scale-110 active:scale-95'}`}
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
                                                                disabled={formData.user_type === 'superadmin'}
                                                                onClick={() => handlePermissionChange(tab.id, action, sub.id)}
                                                                className={`py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border ${formData.permissions[tab.id]?.[sub.id]?.[action]
                                                                    ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                                                                    : isDarkMode ? 'bg-white/5 border-white/5 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-500'
                                                                    } ${formData.user_type === 'superadmin' ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
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
