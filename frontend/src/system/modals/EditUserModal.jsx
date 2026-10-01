import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, ChevronDown, Shield, MapPin, Search, Check, Building2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { permissionTabs, getSafePermissions } from '../constants';

const EditUserModal = ({ user, onClose, onUpdate }) => {
    const { isDarkMode } = useTheme();
    const { user: currentUser, getApiUrl, token } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const isCurrentSuperAdmin = currentUser?.user_type === 'superadmin';

    // Centres Master Data
    const [centresList, setCentresList] = useState([]);
    const [isCentresLoading, setIsCentresLoading] = useState(false);
    const [centreSearch, setCentreSearch] = useState('');
    const [isCentreDropdownOpen, setIsCentreDropdownOpen] = useState(false);
    const centreDropdownRef = useRef(null);

    const parseInitialCentres = (centres) => {
        if (!centres) return [];
        if (Array.isArray(centres)) {
            return centres.map(c => {
                if (typeof c === 'string') {
                    return { id: c, code: c, name: c };
                }
                return {
                    id: c.id || c._id || c.code || '',
                    code: c.code || c.id || '',
                    name: c.name || c.code || 'Centre'
                };
            });
        }
        return [];
    };

    const [formData, setFormData] = useState({
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        email: user?.email || '',
        user_type: user?.user_type || 'student',
        assigned_centres: parseInitialCentres(user?.assigned_centres || user?.centres),
        permissions: getSafePermissions(user?.permissions)
    });

    useEffect(() => {
        const fetchCentres = async () => {
            setIsCentresLoading(true);
            try {
                const apiUrl = getApiUrl();
                const res = await axios.get(`${apiUrl}/api/centres/`, {
                    headers: { Authorization: `Bearer ${token || localStorage.getItem('auth_token')}` }
                });
                const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
                setCentresList(list);
            } catch (err) {
                console.error("Failed to fetch centres in EditUserModal", err);
            } finally {
                setIsCentresLoading(false);
            }
        };
        fetchCentres();
    }, [getApiUrl, token]);

    // Close centre dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (centreDropdownRef.current && !centreDropdownRef.current.contains(e.target)) {
                setIsCentreDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredCentres = useMemo(() => {
        if (!centreSearch.trim()) return centresList;
        const q = centreSearch.toLowerCase().trim();
        return centresList.filter(c =>
            (c.name && c.name.toLowerCase().includes(q)) ||
            (c.code && c.code.toLowerCase().includes(q)) ||
            (c.location && c.location.toLowerCase().includes(q))
        );
    }, [centresList, centreSearch]);

    const isCentreSelected = (centre) => {
        const cId = centre.id || centre._id || centre.code;
        return formData.assigned_centres.some(ac =>
            (typeof ac === 'object' ? (ac.id || ac._id || ac.code) : ac) === cId
        );
    };

    const toggleCentreSelection = (centre) => {
        const cId = centre.id || centre._id || centre.code;
        const centreObj = {
            id: cId,
            code: centre.code || cId,
            name: centre.name || centre.code || 'Centre'
        };

        setFormData(prev => {
            const exists = prev.assigned_centres.some(ac =>
                (typeof ac === 'object' ? (ac.id || ac._id || ac.code) : ac) === cId
            );
            if (exists) {
                return {
                    ...prev,
                    assigned_centres: prev.assigned_centres.filter(ac =>
                        (typeof ac === 'object' ? (ac.id || ac._id || ac.code) : ac) !== cId
                    )
                };
            } else {
                return {
                    ...prev,
                    assigned_centres: [...prev.assigned_centres, centreObj]
                };
            }
        });
    };

    const handleSelectAllCentres = () => {
        const allObjs = centresList.map(c => ({
            id: c.id || c._id || c.code,
            code: c.code || c.id,
            name: c.name || c.code
        }));
        setFormData(prev => ({ ...prev, assigned_centres: allObjs }));
    };

    const handleClearCentres = () => {
        setFormData(prev => ({ ...prev, assigned_centres: [] }));
    };

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
        <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-10">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
            <div className={`relative w-full ${isCurrentSuperAdmin ? 'max-w-4xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto rounded-[5px] border shadow-2xl p-8 animate-in zoom-in duration-300 ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tight">Edit <span className="text-orange-500">User Access</span></h2>
                        <p className="text-xs font-bold opacity-50 uppercase tracking-widest mt-1">Updating: {user.username}</p>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-[5px] transition-all hover:scale-110 active:scale-95 ${isDarkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-100 text-slate-900 border border-slate-200'}`}>
                        <X size={20} strokeWidth={3} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className={`grid grid-cols-1 ${isCurrentSuperAdmin ? 'lg:grid-cols-2' : ''} gap-8`}>
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">First Name</label>
                                <input type="text" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                    className={`w-full p-3.5 rounded-[5px] border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'}`} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Last Name</label>
                                <input type="text" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                    className={`w-full p-3.5 rounded-[5px] border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'}`} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Email</label>
                            <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className={`w-full p-3.5 rounded-[5px] border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'}`} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Role</label>
                            <div className="relative">
                                <select
                                    disabled={!isCurrentSuperAdmin}
                                    value={formData.user_type}
                                    onChange={e => setFormData({ ...formData, user_type: e.target.value })}
                                    style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                    className={`w-full p-3.5 pr-10 rounded-[5px] border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 appearance-none 
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

                        {/* Assigned Centres (Searchable Multi-Select) */}
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
                                    <MapPin size={14} className="text-orange-500" />
                                    <span>Assigned Centres</span>
                                    {formData.assigned_centres.length > 0 && (
                                        <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-500 text-[9px] font-bold">
                                            {formData.assigned_centres.length} Selected
                                        </span>
                                    )}
                                </label>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleSelectAllCentres}
                                        className="text-[9px] font-black uppercase tracking-wider text-orange-500 hover:underline"
                                    >
                                        Select All
                                    </button>
                                    <span className="opacity-30">•</span>
                                    <button
                                        type="button"
                                        onClick={handleClearCentres}
                                        className="text-[9px] font-black uppercase tracking-wider text-slate-400 hover:text-red-500 hover:underline"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>

                            <div ref={centreDropdownRef} className="relative">
                                {/* Dropdown Input / Trigger */}
                                <div
                                    onClick={() => setIsCentreDropdownOpen(prev => !prev)}
                                    className={`w-full p-3.5 rounded-[5px] border font-bold text-sm outline-none transition-all cursor-pointer flex items-center justify-between
                                        ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'}
                                        ${isCentreDropdownOpen ? 'ring-2 ring-orange-500/30 border-orange-500/50' : ''}`}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <Building2 size={16} className="opacity-40 shrink-0" />
                                        <span className="truncate text-xs">
                                            {formData.assigned_centres.length === 0
                                                ? 'Click to select centres...'
                                                : formData.assigned_centres.length === centresList.length
                                                    ? 'All Centres Selected'
                                                    : `${formData.assigned_centres.length} Centre(s) Selected`}
                                        </span>
                                    </div>
                                    <ChevronDown size={16} className={`opacity-40 transition-transform ${isCentreDropdownOpen ? 'rotate-180' : ''}`} />
                                </div>

                                {/* Dropdown Menu */}
                                {isCentreDropdownOpen && (
                                    <div className={`absolute z-50 left-0 right-0 mt-2 p-3 rounded-xl border shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150
                                        ${isDarkMode ? 'bg-[#0B0E14] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                    >
                                        {/* Search box inside dropdown */}
                                        <div className="relative">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
                                            <input
                                                type="text"
                                                value={centreSearch}
                                                onChange={e => setCentreSearch(e.target.value)}
                                                placeholder="Search centre by name or code..."
                                                className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border outline-none font-medium
                                                    ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'}`}
                                            />
                                            {centreSearch && (
                                                <button type="button" onClick={() => setCentreSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100">
                                                    <X size={12} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Centres Checklist */}
                                        <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                                            {isCentresLoading ? (
                                                <div className="p-4 text-center text-xs opacity-50 font-bold uppercase tracking-wider">
                                                    Loading Master Centres...
                                                </div>
                                            ) : filteredCentres.length === 0 ? (
                                                <div className="p-4 text-center text-xs opacity-50 font-bold">
                                                    No centres matching "{centreSearch}"
                                                </div>
                                            ) : (
                                                filteredCentres.map(c => {
                                                    const isSelected = isCentreSelected(c);
                                                    return (
                                                        <div
                                                            key={c.id || c._id || c.code}
                                                            onClick={() => toggleCentreSelection(c)}
                                                            className={`p-2 rounded-lg text-xs font-semibold flex items-center justify-between cursor-pointer transition-all
                                                                ${isSelected
                                                                    ? 'bg-orange-500/15 text-orange-500 border border-orange-500/30'
                                                                    : isDarkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <div className={`w-4 h-4 rounded flex items-center justify-center transition-all ${isSelected ? 'bg-orange-500 text-white' : 'border border-slate-400'}`}>
                                                                    {isSelected && <Check size={12} strokeWidth={3} />}
                                                                </div>
                                                                <div className="truncate">
                                                                    <span className="font-bold">{c.name}</span>
                                                                    {c.location && <span className="opacity-50 text-[10px] ml-1.5 font-normal">({c.location})</span>}
                                                                </div>
                                                            </div>
                                                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200/50 dark:bg-white/10 opacity-70 shrink-0 ml-2">
                                                                {c.code}
                                                            </span>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Selected Centre Badges */}
                            {formData.assigned_centres.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1 max-h-24 overflow-y-auto custom-scrollbar">
                                    {formData.assigned_centres.map(c => {
                                        const cId = typeof c === 'object' ? (c.id || c.code) : c;
                                        const cName = typeof c === 'object' ? (c.name || c.code) : c;
                                        return (
                                            <span
                                                key={cId}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[10px] font-bold"
                                            >
                                                <span>{cName}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleCentreSelection(typeof c === 'object' ? c : { id: c, code: c, name: c })}
                                                    className="hover:text-red-500 transition-colors"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <button disabled={isLoading} type="submit" className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-[5px] font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-600/30 transition-all active:scale-95 flex items-center justify-center gap-3">
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
                                    <div key={tab.id} className={`p-4 rounded-[5px] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{tab.label}</span>
                                            <button type="button" onClick={() => toggleAllPermissions(tab.id)}
                                                className={`px-2 py-0.5 rounded-[3px] text-[8px] font-black uppercase transition-all ${isDarkMode ? 'bg-white/5 text-slate-400 hover:text-white' : 'bg-slate-200 text-slate-600'}`}>ALL</button>
                                        </div>
                                        {!tab.subs ? (
                                            <div className="grid grid-cols-4 gap-2">
                                                {['view', 'create', 'edit', 'delete'].map(action => (
                                                    <button key={action} type="button" onClick={() => handlePermissionChange(tab.id, action)}
                                                        className={`py-1.5 rounded-[5px] text-[8px] font-black uppercase border transition-all cursor-pointer hover:scale-105 active:scale-95 ${formData.permissions[tab.id]?.[action] ? 'bg-orange-500 border-orange-500 text-white font-black' : isDarkMode ? 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
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
                                                            <button type="button" onClick={() => toggleAllPermissions(tab.id, sub.id)}
                                                                className={`text-[8px] font-black uppercase ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>Toggle</button>
                                                        </div>
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {['view', 'create', 'edit', 'delete'].map(action => (
                                                                <button key={action} type="button" onClick={() => handlePermissionChange(tab.id, action, sub.id)}
                                                                    className={`py-1 rounded-[3px] text-[8px] font-black uppercase border transition-all cursor-pointer hover:scale-105 active:scale-95 ${formData.permissions[tab.id]?.[sub.id]?.[action] ? 'bg-blue-500 border-blue-500 text-white font-black' : isDarkMode ? 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-100'}`}>
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
