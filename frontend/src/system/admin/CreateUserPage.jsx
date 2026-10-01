import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import {
    User, Mail, Eye, EyeOff, ChevronDown, UserPlus, Shield, ArrowLeft, ShieldCheck,
    MapPin, Search, Check, X, CheckSquare, Square, Building2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { permissionTabs, getSafePermissions } from '../constants';

const CreateUserPage = ({ onBack }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Centres from Master Data
    const [centresList, setCentresList] = useState([]);
    const [isCentresLoading, setIsCentresLoading] = useState(false);
    const [centreSearch, setCentreSearch] = useState('');
    const [isCentreDropdownOpen, setIsCentreDropdownOpen] = useState(false);
    const centreDropdownRef = useRef(null);

    const [formData, setFormData] = useState({
        username: '',
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        user_type: 'student',
        assigned_centres: [],
        permissions: getSafePermissions()
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
                console.error("Failed to fetch centres", err);
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
                        <p className={`text-sm font-medium opacity-50 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Configure account credentials, branch centre allocation, and granular access control.</p>
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
                                        className={`w-full p-4 rounded-[5px] border font-bold text-sm outline-none transition-all cursor-pointer flex items-center justify-between
                                            ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'}
                                            ${isCentreDropdownOpen ? 'ring-2 ring-orange-500/30 border-orange-500/50' : ''}`}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <Building2 size={16} className="opacity-40 shrink-0" />
                                            <span className="truncate text-xs">
                                                {formData.assigned_centres.length === 0
                                                    ? 'Click to select centres from Master Data...'
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
                                            <div className="max-h-56 overflow-y-auto space-y-1 custom-scrollbar pr-1">
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
                                                                className={`p-2.5 rounded-lg text-xs font-semibold flex items-center justify-between cursor-pointer transition-all
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

                                {/* Selected Centre Tags Display */}
                                {formData.assigned_centres.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {formData.assigned_centres.map(c => {
                                            const cId = typeof c === 'object' ? (c.id || c._id || c.code) : c;
                                            const cName = typeof c === 'object' ? (c.name || c.code) : c;
                                            return (
                                                <span
                                                    key={cId}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-orange-500/10 border border-orange-500/30 text-orange-500"
                                                >
                                                    <MapPin size={10} />
                                                    <span className="truncate max-w-[150px]">{cName}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleCentreSelection(c)}
                                                        className="hover:text-red-500 hover:scale-110 transition-all ml-0.5"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
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
