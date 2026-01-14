import React, { useState, useEffect } from 'react';
import { X, ChevronDown, Shield } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { permissionTabs } from '../constants';

const EditUserModal = ({ user, onClose, onUpdate }) => {
    const { isDarkMode } = useTheme();
    const { user: currentUser, getApiUrl } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const isCurrentSuperAdmin = currentUser?.user_type === 'superadmin';

    const getSafePermissions = (perms) => {
        const base = {
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
        };

        if (perms) {
            try {
                const p = typeof perms === 'string' ? JSON.parse(perms) : perms;
                return { ...base, ...p };
            } catch (e) {
                return base;
            }
        }
        return base;
    };

    const [formData, setFormData] = useState({
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        email: user?.email || '',
        user_type: user?.user_type || 'student',
        permissions: getSafePermissions(user?.permissions)
    });

    useEffect(() => {
        if (formData.user_type === 'superadmin') {
            const fullPermissions = JSON.parse(JSON.stringify(formData.permissions));
            Object.keys(fullPermissions).forEach(key => {
                if (typeof fullPermissions[key] === 'object' && fullPermissions[key] !== null) {
                    Object.keys(fullPermissions[key]).forEach(action => {
                        if (typeof fullPermissions[key][action] === 'object' && fullPermissions[key][action] !== null) {
                            Object.keys(fullPermissions[key][action]).forEach(subAction => {
                                fullPermissions[key][action][subAction] = true;
                            });
                        } else {
                            fullPermissions[key][action] = true;
                        }
                    });
                }
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
                    [subTab]: { ...newPerms[tab][subTab], [action]: !newPerms[tab][subTab][action] }
                };
            } else {
                newPerms[tab] = { ...newPerms[tab], [action]: !newPerms[tab][action] };
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
                ['view', 'create', 'edit', 'delete'].forEach(action => {
                    newPerms[tab][subTab][action] = !allTrue;
                });
            } else {
                const tabConfig = permissionTabs.find(t => t.id === tab);
                if (tabConfig.subs) {
                    const allSubsTrue = tabConfig.subs.every(sub =>
                        ['view', 'create', 'edit', 'delete'].every(action => newPerms[tab][sub.id][action])
                    );
                    tabConfig.subs.forEach(sub => {
                        ['view', 'create', 'edit', 'delete'].forEach(action => {
                            newPerms[tab][sub.id][action] = !allSubsTrue;
                        });
                    });
                } else {
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
        try {
            const apiUrl = getApiUrl();
            const response = await axios.patch(`${apiUrl}/api/users/${user.id}/`, formData);
            onUpdate(response.data);
            onClose();
        } catch (err) {
            console.error("Failed to update user", err);
            if (err.response?.status === 404) {
                alert(`User "${user.username}" not found in database. This entry will be removed.`);
                onUpdate({ ...user, _shouldRemove: true });
                onClose();
            } else {
                alert("Failed to update user details");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full ${isCurrentSuperAdmin ? 'max-w-4xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto rounded-[2.5rem] border shadow-2xl p-8 animate-in zoom-in duration-300 ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tight">Edit <span className="text-orange-500">User Access</span></h2>
                        <p className="text-xs font-bold opacity-50 uppercase tracking-widest mt-1">Updating: {user.username}</p>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-xl transition-all hover:scale-110 active:scale-95 ${isDarkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-100 text-slate-900 border border-slate-200'}`}>
                        <X size={20} strokeWidth={3} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className={`grid grid-cols-1 ${isCurrentSuperAdmin ? 'lg:grid-cols-2' : ''} gap-8`}>
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">First Name</label>
                                <input type="text" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                    className={`w-full p-3.5 rounded-2xl border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'}`} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Last Name</label>
                                <input type="text" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                    className={`w-full p-3.5 rounded-2xl border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'}`} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Email</label>
                            <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className={`w-full p-3.5 rounded-2xl border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'}`} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Role</label>
                            <div className="relative">
                                <select
                                    disabled={!isCurrentSuperAdmin}
                                    value={formData.user_type}
                                    onChange={e => setFormData({ ...formData, user_type: e.target.value })}
                                    style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                    className={`w-full p-3.5 pr-10 rounded-2xl border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 appearance-none 
                                        ${!isCurrentSuperAdmin ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
                                        ${isDarkMode ? 'bg-white/5 border-white/10 text-white [&>option]:bg-[#10141D]' : 'bg-slate-100 border-slate-200 text-slate-900 [&>option]:bg-white'}`}>
                                    <option value="student">Student</option>
                                    <option value="parent">Parent</option>
                                    <option value="staff">Staff</option>
                                    <option value="admin">Admin</option>
                                    <option value="superadmin">Super Admin</option>
                                </select>
                                <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
                            </div>
                        </div>

                        <button disabled={isLoading} type="submit" className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-600/30 transition-all active:scale-95 flex items-center justify-center gap-3">
                            {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Save Profile Changes"}
                        </button>
                    </div>

                    {isCurrentSuperAdmin && (
                        <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-50 flex items-center gap-2">
                                <Shield size={14} className="text-orange-500" /> Granular Permissions
                            </h3>
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {permissionTabs.map(tab => (
                                    <div key={tab.id} className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{tab.label}</span>
                                            <button type="button" onClick={() => toggleAllPermissions(tab.id)} disabled={formData.user_type === 'superadmin'}
                                                className={`px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all ${isDarkMode ? 'bg-white/5 text-slate-500 hover:text-white' : 'bg-slate-200 text-slate-600'} ${formData.user_type === 'superadmin' && 'opacity-20'}`}>ALL</button>
                                        </div>
                                        {!tab.subs ? (
                                            <div className="grid grid-cols-4 gap-2">
                                                {['view', 'create', 'edit', 'delete'].map(action => (
                                                    <button key={action} type="button" disabled={formData.user_type === 'superadmin'} onClick={() => handlePermissionChange(tab.id, action)}
                                                        className={`py-1.5 rounded-lg text-[8px] font-black uppercase border transition-all ${formData.permissions[tab.id]?.[action] ? 'bg-orange-500 border-orange-500 text-white' : isDarkMode ? 'bg-white/5 border-white/5 text-slate-600' : 'bg-white border-slate-200 text-slate-400'}`}>
                                                        {action}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {tab.subs.map(sub => (
                                                    <div key={sub.id} className="space-y-2">
                                                        <div className="flex justify-between items-center px-1">
                                                            <span className="text-[9px] font-bold opacity-60">{sub.label}</span>
                                                            <button type="button" onClick={() => toggleAllPermissions(tab.id, sub.id)} disabled={formData.user_type === 'superadmin'}
                                                                className={`text-[8px] font-black uppercase ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>Toggle</button>
                                                        </div>
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {['view', 'create', 'edit', 'delete'].map(action => (
                                                                <button key={action} type="button" disabled={formData.user_type === 'superadmin'} onClick={() => handlePermissionChange(tab.id, action, sub.id)}
                                                                    className={`py-1 rounded-md text-[8px] font-black uppercase border transition-all ${formData.permissions[tab.id]?.[sub.id]?.[action] ? 'bg-blue-500 border-blue-500 text-white' : isDarkMode ? 'bg-white/5 border-white/5 text-slate-700' : 'bg-white border-slate-100 text-slate-300'}`}>
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
                    )}
                </form>
            </div>
        </div>
    );
};

export default EditUserModal;
