import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    LayoutDashboard, MapPin, Layers, FileText, Database,
    ShieldCheck, Settings, Plus, ChevronRight, ExternalLink,
    Users, GraduationCap, Briefcase, FilePlus, Camera, Upload, X, User, Clock, ArrowLeft, Shield, UserPlus, Power, Key, Eye, EyeOff, ChevronDown
} from 'lucide-react';
import PortalLayout from '../../components/common/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

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
                admin_parent: { view: false, create: false, edit: false, delete: false }
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
                const tabConfig = tabs.find(t => t.id === tab);
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

    const tabs = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'centre_mgmt', label: 'Centre Management' },
        { id: 'section_mgmt', label: 'Section Management' },
        {
            id: 'test_mgmt',
            label: 'Test Management',
            subs: [
                { id: 'test_create', label: 'Test Create' },
                { id: 'test_allotment', label: 'Test Allotment' },
                { id: 'test_responses', label: 'Test Responses' },
                { id: 'test_result', label: 'Test Result' }
            ]
        },
        { id: 'question_bank', label: 'Question Bank' },
        {
            id: 'admin_mgmt',
            label: 'Admin Management',
            subs: [
                { id: 'admin_system', label: 'System' },
                { id: 'admin_student', label: 'Student' },
                { id: 'admin_parent', label: 'Parent' }
            ]
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className={`p-10 rounded-[2.5rem] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-[#F8FAFC] border-slate-200 shadow-slate-200/50'}`}>
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
                            {tabs.map((tab) => (
                                <div key={tab.id} className={`p-6 rounded-3xl border transition-all ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-100/30 border-slate-200/60 shadow-sm hover:bg-white'}`}>
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-black uppercase tracking-widest opacity-80">{tab.label}</span>
                                            <button
                                                type="button"
                                                onClick={() => toggleAllPermissions(tab.id)}
                                                disabled={formData.user_type === 'superadmin'}
                                                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${['view', 'create', 'edit', 'delete'].every(a => formData.permissions[tab.id][a])
                                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                                    : isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-slate-200 text-slate-600'
                                                    } ${formData.user_type === 'superadmin' ? 'opacity-20 cursor-not-allowed' : 'hover:scale-110 active:scale-95'}`}
                                            >
                                                ALL
                                            </button>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${formData.permissions[tab.id].view ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                            {formData.permissions[tab.id].view ? 'Enabled' : 'Disabled'}
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
                                                                className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${['view', 'create', 'edit', 'delete'].every(a => formData.permissions[tab.id][sub.id][a])
                                                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                                                    : isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-500'
                                                                    } ${formData.user_type === 'superadmin' ? 'opacity-20 cursor-not-allowed' : 'hover:scale-110 active:scale-95'}`}
                                                            >
                                                                ALL
                                                            </button>
                                                        </div>
                                                        {formData.permissions[tab.id][sub.id].view && (
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
                                                                className={`py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border ${formData.permissions[tab.id][sub.id][action]
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

const SystemDashboard = () => {
    const { user, updateProfile, getApiUrl, normalizeUser } = useAuth();
    const { isDarkMode } = useTheme();
    const [activeTab, setActiveTab] = useState('Dashboard');
    const [isUploading, setIsUploading] = useState(false);
    const [usersList, setUsersList] = useState([]);
    const [successMessage, setSuccessMessage] = useState('');
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [selectedUserForPass, setSelectedUserForPass] = useState(null);
    const [newPass, setNewPass] = useState('');
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [showResetPass, setShowResetPass] = useState(false);

    const handleToggleStatus = async (userObj) => {
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            await axios.patch(`${apiUrl}/api/users/${userObj.id}/`, { is_active: !userObj.is_active });
            // Manual update in list to avoid refetch lag
            setUsersList(prev => prev.map(u => u.id === userObj.id ? { ...u, is_active: !u.is_active } : u));
        } catch (error) {
            console.error("Failed to toggle status", error);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            await axios.post(`${apiUrl}/api/users/${selectedUserForPass.id}/change_password/`, { password: newPass });
            setPasswordModalOpen(false);
            setNewPass('');
            setSelectedUserForPass(null);
            setShowResetPass(false);
            setSuccessMessage("Password reset successfully!");
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error("Failed to reset password", error);
        } finally {
            setIsActionLoading(false);
        }
    };

    // Profile Form State
    const [profileData, setProfileData] = useState({
        email: user?.email || '',
        first_name: user?.first_name || '',
        last_name: user?.last_name || ''
    });

    // Update local state when user prop changes
    useEffect(() => {
        if (user) {
            setProfileData({
                email: user.email || '',
                first_name: user.first_name || '',
                last_name: user.last_name || ''
            });
        }
    }, [user]);

    const handleUpdateProfile = async () => {
        const formData = new FormData();
        Object.keys(profileData).forEach(key => {
            formData.append(key, profileData[key]);
        });

        setIsUploading(true);
        try {
            await updateProfile(formData);
            setSuccessMessage('Profile updated successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error("Update failed", error);
        } finally {
            setIsUploading(false);
        }
    };

    useEffect(() => {
        if (activeTab.startsWith('Admin')) {
            const fetchUsers = async () => {
                try {
                    const apiUrl = getApiUrl();
                    const response = await axios.get(`${apiUrl}/api/users/`);
                    let data = response.data;

                    // Filter based on tab if needed, or just show all for now
                    // For System/Student/Parent submenus
                    if (activeTab === 'Admin Student') data = data.filter(u => u.user_type === 'student');
                    else if (activeTab === 'Admin Parent') data = data.filter(u => u.user_type === 'parent');
                    else if (activeTab === 'Admin System') data = data.filter(u => !['student', 'parent'].includes(u.user_type));

                    const normalizedUsers = data.map(u => normalizeUser(u));
                    setUsersList(normalizedUsers);
                } catch (error) {
                    console.error("Failed to fetch users", error);
                }
            };
            fetchUsers();
        }
    }, [activeTab, getApiUrl, normalizeUser]);

    const isSuperAdmin = user?.user_type === 'superadmin';

    const sidebarItems = [
        { icon: LayoutDashboard, label: 'Dashboard', active: activeTab === 'Dashboard', onClick: () => setActiveTab('Dashboard') },
        { icon: MapPin, label: 'Centre Management', active: activeTab === 'Centre Management', onClick: () => setActiveTab('Centre Management') },
        { icon: Layers, label: 'Section Management', active: activeTab === 'Section Management', onClick: () => setActiveTab('Section Management') },
        {
            icon: FileText,
            label: 'Test Management',
            active: activeTab.startsWith('Test'),
            subItems: [
                { label: 'Test Create', active: activeTab === 'Test Create', onClick: () => setActiveTab('Test Create') },
                { label: 'Test Allotment', active: activeTab === 'Test Allotment', onClick: () => setActiveTab('Test Allotment') },
                { label: 'Test Responses', active: activeTab === 'Test Responses', onClick: () => setActiveTab('Test Responses') },
                { label: 'Test Result', active: activeTab === 'Test Result', onClick: () => setActiveTab('Test Result') }
            ]
        },
        { icon: Database, label: 'Question Bank', active: activeTab === 'Question Bank', onClick: () => setActiveTab('Question Bank') },
        {
            icon: ShieldCheck,
            label: 'Admin Management',
            active: activeTab.startsWith('Admin'),
            subItems: [
                { label: 'System', active: activeTab === 'Admin System', onClick: () => setActiveTab('Admin System') },
                { label: 'Student', active: activeTab === 'Admin Student', onClick: () => setActiveTab('Admin Student') },
                { label: 'Parent', active: activeTab === 'Admin Parent', onClick: () => setActiveTab('Admin Parent') },
            ]
        },
        { icon: User, label: 'Profile', active: activeTab === 'Profile', onClick: () => setActiveTab('Profile') },
        { icon: Settings, label: 'Settings', active: activeTab === 'Settings', onClick: () => setActiveTab('Settings') },
    ];

    const headerActions = (
        <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer hover:border-orange-500/50
            ${isDarkMode ? 'bg-slate-800/50 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
            <ExternalLink size={14} />
            <span>View Site</span>
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'Dashboard':
                return (
                    <>
                        {/* Dashboard Overview Banner */}
                        <div className={`relative overflow-hidden p-10 rounded-[2.5rem] shadow-2xl transition-all border
                            ${isDarkMode
                                ? 'bg-gradient-to-r from-[#1A202C] to-[#111827] border-white/5'
                                : 'bg-gradient-to-br from-orange-50 to-white border-orange-100 shadow-orange-900/5'}`}>

                            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-orange-500/10 blur-[100px] rounded-full"></div>

                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                                <div>
                                    <h2 className="text-4xl font-black tracking-tight mb-3">
                                        DASHBOARD <span className="text-orange-500 tracking-wider">OVERVIEW</span>
                                    </h2>
                                    <p className={`text-sm font-medium max-w-xl leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                        Welcome back. Here is your daily activity summary and system health check.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { label: 'TOTAL CENTRES', value: '28', icon: MapPin, color: 'emerald', trend: 'Across active regions' },
                                { label: 'ACTIVE SECTIONS', value: '142', icon: Layers, color: 'blue', trend: '+5 new this week' },
                                { label: 'TOTAL TESTS', value: '856', icon: FileText, color: 'purple', trend: 'In current cycle' },
                                { label: 'QUESTION BANK', value: '4.2k', icon: Database, color: 'orange', trend: 'Categorized items' },
                            ].map((stat, i) => (
                                <div key={i} className={`relative overflow-hidden p-8 rounded-[2rem] border transition-all duration-500 group hover:-translate-y-2
                                    ${isDarkMode
                                        ? `bg-[#0B0E14] border-white/5 shadow-2xl`
                                        : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50'}`}
                                    style={{
                                        boxShadow: stat.color === 'blue' ? `0 20px 40px -20px ${isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.4)'}` :
                                            stat.color === 'purple' ? `0 20px 40px -20px ${isDarkMode ? 'rgba(168, 85, 247, 0.3)' : 'rgba(168, 85, 247, 0.4)'}` :
                                                stat.color === 'emerald' ? `0 20px 40px -20px ${isDarkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.4)'}` :
                                                    `0 20px 40px -20px ${isDarkMode ? 'rgba(249, 115, 22, 0.3)' : 'rgba(249, 115, 22, 0.4)'}`
                                    }}
                                >
                                    <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full transition-transform duration-700 ease-out group-hover:scale-110
                                        ${stat.color === 'blue' ? 'bg-blue-500/10' :
                                            stat.color === 'purple' ? 'bg-purple-500/10' :
                                                stat.color === 'emerald' ? 'bg-emerald-500/10' :
                                                    'bg-orange-500/10'}`}></div>

                                    <div className="relative z-10">
                                        <div className="relative mb-6">
                                            <div className={`p-3 rounded-2xl w-fit relative z-10 transition-transform group-hover:scale-110 duration-500
                                                ${stat.color === 'blue' ? 'bg-blue-600 text-white' :
                                                    stat.color === 'purple' ? 'bg-purple-600 text-white' :
                                                        stat.color === 'emerald' ? 'bg-emerald-600 text-white' :
                                                            'bg-orange-600 text-white'}`}>
                                                <stat.icon size={22} strokeWidth={2.5} />
                                            </div>
                                        </div>

                                        <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {stat.label}
                                        </div>
                                        <div className={`text-4xl font-black tracking-tight mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            {stat.value}
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <div className={`w-1 h-1 rounded-full ${stat.color === 'blue' ? 'bg-blue-500' :
                                                stat.color === 'purple' ? 'bg-purple-500' :
                                                    stat.color === 'emerald' ? 'bg-emerald-500' :
                                                        'bg-orange-500'
                                                }`}></div>
                                            <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                {stat.trend}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Action Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className={`p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-end min-h-[220px] transition-transform hover:scale-[1.01] duration-500 cursor-pointer group border
                                ${isDarkMode
                                    ? 'bg-gradient-to-br from-orange-500 to-[#F97316] border-orange-400'
                                    : 'bg-gradient-to-br from-orange-50 to-white border-orange-100 shadow-orange-900/5'}`}>

                                <div className={`absolute top-8 left-10 p-4 backdrop-blur-md rounded-2xl transition-all duration-300
                                    ${isDarkMode ? 'bg-white/20 text-white' : 'bg-orange-600 text-white shadow-lg shadow-orange-600/30 group-hover:scale-110'}`}>
                                    <FilePlus size={32} strokeWidth={3} />
                                </div>

                                <div className={`absolute top-0 right-0 h-full bg-white/5 -skew-x-12 translate-x-12 transition-all duration-500 ${isDarkMode ? 'w-[40%]' : 'w-0'}`}></div>

                                <h3 className={`text-3xl font-black tracking-tight leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Create New Test</h3>
                                <div className={`mt-4 flex items-center gap-2 font-bold text-sm ${isDarkMode ? 'text-white/80' : 'text-slate-500'}`}>
                                    <span>Set up a new assessment</span>
                                    <ChevronRight size={18} className="group-hover:translate-x-2 transition-transform" />
                                </div>
                            </div>

                            <div className={`p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-end min-h-[220px] transition-transform hover:scale-[1.01] duration-500 cursor-pointer group border
                                ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-200 shadow-slate-200/50'}`}>
                                <div className={`absolute top-8 left-10 p-4 backdrop-blur-md rounded-2xl ${isDarkMode ? 'bg-white/10 text-white' : 'bg-slate-900 text-white'}`}>
                                    <MapPin size={32} strokeWidth={3} />
                                </div>
                                <h3 className={`text-3xl font-black tracking-tight leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Manage Centres</h3>
                                <div className={`mt-4 flex items-center gap-2 font-bold text-sm ${isDarkMode ? 'text-white/60' : 'text-slate-500'}`}>
                                    <span>Configure training locations</span>
                                    <ChevronRight size={18} className="group-hover:translate-x-2 transition-transform" />
                                </div>
                            </div>
                        </div>
                    </>
                );
            case 'Create User':
                if (!isSuperAdmin) {
                    setActiveTab('Dashboard');
                    return null;
                }
                return <CreateUserPage onBack={() => setActiveTab('Dashboard')} />;
            case 'Admin System':
            case 'Admin Student':
            case 'Admin Parent':
                const tabTitle = activeTab.split(' ')[1];
                return (
                    <div className="space-y-8">
                        <div className={`p-10 rounded-[2.5rem] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-[#F8FAFC] border-slate-200 shadow-slate-200/50'}`}>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                                <div>
                                    <h2 className="text-3xl font-black tracking-tight mb-2 uppercase"><span className="text-orange-500">{tabTitle}</span> Management</h2>
                                    <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Manage {tabTitle.toLowerCase()} level access and configurations.</p>
                                </div>
                                {activeTab === 'Admin System' && (
                                    <button onClick={() => setActiveTab('Create User')} className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-orange-600/20 active:scale-95">
                                        <Plus size={20} strokeWidth={3} />
                                        <span>Add New System</span>
                                    </button>
                                )}
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'text-slate-500 border-white/5' : 'text-slate-400 border-slate-100'}`}>
                                            <th className="pb-4 px-4 font-black">User</th>
                                            <th className="pb-4 px-4 font-black">Role</th>
                                            <th className="pb-4 px-4 font-black">Email</th>
                                            <th className="pb-4 px-4 font-black">Last Login</th>
                                            <th className="pb-4 px-4 font-black text-center">Status</th>
                                            <th className="pb-4 px-4 text-right font-black">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-transparent">
                                        {usersList.map((admin, i) => (
                                            <tr key={i} className={`group ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-100'} transition-colors`}>
                                                <td className="py-5 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs overflow-hidden border-2 transition-transform group-hover:scale-110 ${isDarkMode ? 'bg-orange-900/20 text-orange-500 border-white/5' : 'bg-orange-100 text-orange-600 border-slate-200'}`}>
                                                            {admin.profile_image ? (
                                                                <img src={admin.profile_image} alt={admin.username} className="w-full h-full object-cover" />
                                                            ) : (
                                                                admin.username?.charAt(0).toUpperCase()
                                                            )}
                                                        </div>
                                                        <span className={`font-bold text-sm ${!admin.is_active && 'opacity-40 grayscale'}`}>{admin.username}</span>
                                                    </div>
                                                </td>
                                                <td className="py-5 px-4 text-sm font-bold opacity-70">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tighter hover:scale-110 transition-transform cursor-default ${admin.user_type === 'superadmin' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                                                        'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                                        }`}>
                                                        {admin.user_type?.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-4 text-sm font-medium opacity-60 italic whitespace-nowrap">{admin.email}</td>
                                                <td className="py-5 px-4 text-xs font-bold opacity-50 whitespace-nowrap text-center">2 mins ago</td>
                                                <td className="py-5 px-4">
                                                    <div className="flex justify-center">
                                                        <button
                                                            onClick={() => handleToggleStatus(admin)}
                                                            disabled={isActionLoading || admin.id === user.id}
                                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase transition-all shadow-sm ${admin.is_active
                                                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white'
                                                                : 'bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500 hover:text-white'
                                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                                        >
                                                            <Power size={10} strokeWidth={4} />
                                                            {admin.is_active ? 'Active' : 'Locked'}
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <div className="flex justify-end items-center gap-2">
                                                        <button
                                                            onClick={() => { setSelectedUserForPass(admin); setPasswordModalOpen(true); }}
                                                            className={`p-2 rounded-xl transition-all hover:scale-110 shadow-sm ${isDarkMode ? 'bg-white/5 text-slate-400 hover:text-orange-500 border border-white/5' : 'bg-slate-100 text-slate-500 hover:bg-orange-600 hover:text-white border border-slate-200'}`}
                                                            title="Change Password"
                                                        >
                                                            <Key size={16} strokeWidth={2.5} />
                                                        </button>
                                                        <button className={`p-2 rounded-xl transition-all hover:scale-110 shadow-sm ${isDarkMode ? 'bg-white/5 text-slate-400 hover:text-white border border-white/5' : 'bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white border border-slate-200'}`}>
                                                            <Settings size={16} strokeWidth={2.5} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className={`p-10 rounded-[2.5rem] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-[#F8FAFC] border-slate-200 shadow-slate-200/50'}`}>
                            <div className="flex items-center gap-3 mb-8">
                                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-orange-500/10 text-orange-500' : 'bg-orange-50 text-orange-600'}`}>
                                    <Clock size={20} />
                                </div>
                                <h3 className="text-xl font-black uppercase tracking-tight">Recent Login <span className="text-orange-500">History</span></h3>
                            </div>
                            <div className="space-y-4">
                                {[
                                    { user: 'admin', time: 'Jan 09, 14:55', ip: '103.44.22.11', status: 'Success' },
                                    { user: 'atanu', time: 'Jan 09, 14:20', ip: '103.44.22.15', status: 'Success' },
                                ].map((log, i) => (
                                    <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border transition-all hover:translate-x-2 ${isDarkMode ? 'bg-white/[0.02] border-white/5 hover:bg-white/5' : 'bg-slate-100/50 border-slate-200/60 hover:bg-slate-100'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
                                                {log.user.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm tracking-tight">{log.user}</p>
                                                <p className="text-[10px] opacity-50 font-medium">{log.ip} • Windows 11</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black opacity-40 uppercase mb-0.5">{log.time}</p>
                                            <span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">{log.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 'Profile':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className={`lg:col-span-2 p-10 rounded-[2.5rem] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100'}`}>
                            <h2 className="text-3xl font-black tracking-tight mb-8 uppercase">My <span className="text-orange-500">Profile</span></h2>

                            <div className="space-y-10">
                                {/* Profile Image Management */}
                                <div className="flex flex-col md:flex-row items-center gap-8 pb-10 border-b border-orange-500/10">
                                    <div className="relative group">
                                        <div className={`relative w-32 h-32 rounded-[2.5rem] overflow-hidden border-4 transition-all duration-500 group-hover:scale-105 ${isDarkMode ? 'border-white/10' : 'border-slate-100 shadow-xl shadow-slate-200'}`}>
                                            {isUploading && (
                                                <div className="absolute inset-0 z-20 bg-black/50 flex items-center justify-center">
                                                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                </div>
                                            )}
                                            {user?.profile_image ? (
                                                <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className={`w-full h-full flex items-center justify-center font-black text-4xl ${isDarkMode ? 'bg-orange-500/10 text-orange-500' : 'bg-orange-50 text-orange-600'}`}>
                                                    {user?.username?.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <label className={`absolute -bottom-2 -right-2 p-3 rounded-2xl cursor-pointer transition-all duration-300 shadow-lg hover:scale-110 active:scale-95 z-30 ${isDarkMode ? 'bg-orange-600 text-white shadow-orange-600/20' : 'bg-slate-900 text-white shadow-slate-900/20'}`}>
                                            <Camera size={20} strokeWidth={2.5} />
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={async (e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        const formData = new FormData();
                                                        formData.append('profile_image', file);
                                                        setIsUploading(true);
                                                        try {
                                                            await updateProfile(formData);
                                                        } finally {
                                                            setIsUploading(false);
                                                        }
                                                    }
                                                }}
                                            />
                                        </label>

                                        {user?.profile_image && (
                                            <button
                                                onClick={async () => {
                                                    const formData = new FormData();
                                                    formData.append('profile_image', ''); // Clear image
                                                    setIsUploading(true);
                                                    try {
                                                        await updateProfile(formData);
                                                    } finally {
                                                        setIsUploading(false);
                                                    }
                                                }}
                                                className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-lg shadow-lg hover:bg-red-600 transition-colors z-30"
                                            >
                                                <X size={14} strokeWidth={3} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex-1 text-center md:text-left">
                                        <h3 className="text-xl font-black tracking-tight mb-2">Account Photo</h3>
                                        <p className={`text-sm font-medium mb-4 italic max-w-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                            Your photo will be used for your profile and visibility across the management portal.
                                        </p>
                                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                            <div className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                                                JPG, PNG or WEBP (Max 2MB)
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {successMessage && (
                                    <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
                                        <ShieldCheck size={18} />
                                        <p className="text-sm font-bold uppercase tracking-widest">{successMessage}</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">Username</label>
                                        <input type="text" readOnly value={user?.username} className={`w-full p-4 rounded-xl border font-bold text-sm cursor-not-allowed opacity-60 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">Email Address</label>
                                        <input
                                            type="text"
                                            value={profileData.email}
                                            onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                            className={`w-full p-4 rounded-xl border font-bold text-sm ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">First Name</label>
                                        <input
                                            type="text"
                                            value={profileData.first_name}
                                            onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                                            className={`w-full p-4 rounded-xl border font-bold text-sm ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">Last Name</label>
                                        <input
                                            type="text"
                                            value={profileData.last_name}
                                            onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                                            className={`w-full p-4 rounded-xl border font-bold text-sm ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                        />
                                    </div>
                                </div>

                                <div className="pt-6">
                                    <button
                                        onClick={handleUpdateProfile}
                                        disabled={isUploading}
                                        className={`px-8 py-4 bg-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3`}
                                    >
                                        {isUploading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                        {isUploading ? 'Updating...' : 'Update Profile'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className={`p-8 rounded-[2.5rem] border shadow-xl ${isDarkMode ? 'bg-gradient-to-br from-[#1E293B] to-[#0F172A] border-white/5' : 'bg-white border-slate-100'}`}>
                                <h3 className="text-xl font-bold mb-4">Account Stats</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold opacity-50">Role</span>
                                        <span className="text-xs font-black uppercase text-orange-500">{user?.user_type}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold opacity-50">Member Since</span>
                                        <span className="text-xs font-black opacity-80">January 2026</span>
                                    </div>
                                </div>
                            </div>

                            <div className={`p-8 rounded-[2.5rem] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-[#F8FAFC] border-slate-200/60 shadow-slate-200/50'}`}>
                                <div className="flex items-center gap-3 mb-6">
                                    <Clock size={16} className="text-orange-500" />
                                    <h3 className="text-lg font-black uppercase tracking-tight">Login <span className="text-orange-500">History</span></h3>
                                </div>
                                <div className="space-y-4">
                                    {[
                                        { time: 'Jan 09, 14:55', status: 'Success', ip: '103.44.22.11' },
                                        { time: 'Jan 08, 10:20', status: 'Success', ip: '103.44.23.01' },
                                    ].map((log, i) => (
                                        <div key={i} className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-100/50 border-slate-200/60'}`}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] font-black opacity-40">{log.time}</span>
                                                <span className="text-[9px] font-black uppercase text-emerald-500">{log.status}</span>
                                            </div>
                                            <p className="text-[11px] font-bold opacity-70 italic">{log.ip} • Chrome / Windows</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'Settings':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className={`lg:col-span-2 p-10 rounded-[2.5rem] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100'}`}>
                            <h2 className="text-3xl font-black tracking-tight mb-8 uppercase">System <span className="text-orange-500">Settings</span></h2>

                            <div className="space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">Portal Name</label>
                                        <input type="text" defaultValue="Pathfinder Student Portal" className={`w-full p-4 rounded-xl border font-bold text-sm ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'}`} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">Support Email</label>
                                        <input type="text" defaultValue="support@pathfinder.com" className={`w-full p-4 rounded-xl border font-bold text-sm ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'}`} />
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-white/5">
                                    <h3 className="text-sm font-black uppercase tracking-widest mb-6 opacity-70">Security & Access</h3>
                                    <div className="space-y-4">
                                        {[
                                            { label: 'Public Registration', desc: 'Allow students to create accounts without admin approval', enabled: true },
                                            { label: 'Dark Mode Default', desc: 'Force dark theme for new users', enabled: false },
                                            { label: 'System Maintenance', desc: 'Put the portal into read-only mode for updates', enabled: false }
                                        ].map((setting, i) => (
                                            <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50/50 border-slate-100'}`}>
                                                <div>
                                                    <p className="font-bold text-sm">{setting.label}</p>
                                                    <p className="text-[11px] opacity-60 font-medium">{setting.desc}</p>
                                                </div>
                                                <div className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors ${setting.enabled ? 'bg-orange-600' : 'bg-slate-300'}`}>
                                                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${setting.enabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-6">
                                    <button className="px-8 py-4 bg-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/30">Save All Changes</button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className={`p-8 rounded-[2.5rem] border shadow-xl ${isDarkMode ? 'bg-gradient-to-br from-[#1E293B] to-[#0F172A] border-white/5' : 'bg-white border-slate-100'}`}>
                                <h3 className="text-xl font-bold mb-6">Backup Status</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                        <p className="text-xs font-bold opacity-70">Database connected</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                        <p className="text-xs font-bold opacity-70">Daily backup complete</p>
                                    </div>
                                    <p className="text-[10px] opacity-40 italic pt-4">Last backup: 46 minutes ago</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            default:
                return (
                    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                        <div className={`p-6 rounded-[2rem] mb-6 ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}>
                            <Settings size={48} className="text-orange-500" />
                        </div>
                        <h2 className="text-3xl font-black uppercase tracking-tight mb-2">UNDER <span className="text-orange-500">DEVELOPMENT</span></h2>
                        <p className={`text-sm font-medium opacity-60 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>We are working hard to bring the {activeTab} view to life very soon.</p>
                    </div>
                );
        }
    };

    return (
        <PortalLayout
            sidebarItems={sidebarItems}
            title={isSuperAdmin ? "Super Admin Dashboard" : "Admin Dashboard"}
            subtitle={activeTab === 'Dashboard' ? "Manage your application content and users" : `System Administration > ${activeTab}`}
            headerActions={headerActions}
        >

            {renderContent()}

            {/* Password Reset Modal */}
            {passwordModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40 animate-in fade-in duration-300">
                    <div className={`w-full max-w-md p-8 rounded-[2.5rem] border shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-orange-600 text-white rounded-2xl shadow-lg shadow-orange-600/30">
                                <Key size={24} strokeWidth={3} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight">Reset <span className="text-orange-500">Password</span></h3>
                                <p className="text-xs font-bold opacity-50">Set a new access key for {selectedUserForPass?.username}</p>
                            </div>
                        </div>

                        <form onSubmit={handleResetPassword} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">New Password</label>
                                <div className="relative">
                                    <input
                                        required
                                        type={showResetPass ? "text" : "password"}
                                        value={newPass}
                                        onChange={e => setNewPass(e.target.value)}
                                        style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                        className={`w-full p-4 pr-12 rounded-2xl border font-bold text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500/20 
                                            ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'}
                                            autofill:transition-colors autofill:duration-[5000000ms]`}
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowResetPass(!showResetPass)}
                                        className={`absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-xl transition-all hover:scale-110 active:scale-95 ${isDarkMode ? 'text-slate-500 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-200'}`}
                                    >
                                        {showResetPass ? <EyeOff size={18} strokeWidth={2.5} /> : <Eye size={18} strokeWidth={2.5} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setPasswordModalOpen(false)}
                                    className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={isActionLoading}
                                    type="submit"
                                    className="flex-1 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-orange-600/20 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {isActionLoading ? 'Saving...' : 'Confirm Reset'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </PortalLayout>
    );
};

export default SystemDashboard;
