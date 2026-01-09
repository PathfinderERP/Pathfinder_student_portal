import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    LayoutDashboard, MapPin, Layers, FileText, Database,
    ShieldCheck, Settings, Plus, ChevronRight, ExternalLink,
    Users, GraduationCap, Briefcase, FilePlus, Camera, Upload, X, User
} from 'lucide-react';
import PortalLayout from '../../components/common/PortalLayout';
import CreateUserModal from '../../components/CreateUserModal';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const SystemDashboard = () => {
    const { user, updateProfile, getApiUrl, normalizeUser } = useAuth();
    const { isDarkMode } = useTheme();
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('Dashboard');
    const [isUploading, setIsUploading] = useState(false);
    const [usersList, setUsersList] = useState([]);
    const [successMessage, setSuccessMessage] = useState('');

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
        if (activeTab === 'Admin Management') {
            const fetchUsers = async () => {
                try {
                    const apiUrl = getApiUrl();
                    const response = await axios.get(`${apiUrl}/api/users/`);
                    const normalizedUsers = response.data.map(u => normalizeUser(u));
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
        { icon: ShieldCheck, label: 'Admin Management', active: activeTab === 'Admin Management', onClick: () => setActiveTab('Admin Management') },
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
            case 'Admin Management':
                return (
                    <div className={`p-10 rounded-[2.5rem] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100'}`}>
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">Admin <span className="text-orange-500">Management</span></h2>
                                <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Manage system administrators and their core permissions.</p>
                            </div>
                            <button onClick={() => setCreateModalOpen(true)} className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-orange-600/20 active:scale-95">
                                <Plus size={20} strokeWidth={3} />
                                <span>Add New Admin</span>
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'text-slate-500 border-white/5' : 'text-slate-400 border-slate-100'}`}>
                                        <th className="pb-4 px-4 font-black">User</th>
                                        <th className="pb-4 px-4 font-black">Role</th>
                                        <th className="pb-4 px-4 font-black">Email</th>
                                        <th className="pb-4 px-4 font-black text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-transparent">
                                    {usersList.map((admin, i) => (
                                        <tr key={i} className={`group ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'} transition-colors`}>
                                            <td className="py-5 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs overflow-hidden border-2 ${isDarkMode ? 'bg-orange-900/20 text-orange-500 border-white/5' : 'bg-orange-100 text-orange-600 border-slate-100'}`}>
                                                        {admin.profile_image ? (
                                                            <img src={admin.profile_image} alt={admin.username} className="w-full h-full object-cover" />
                                                        ) : (
                                                            admin.username?.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <span className="font-bold text-sm">{admin.username}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-4 text-sm font-bold opacity-70">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tighter hover:scale-110 transition-transform cursor-default ${admin.user_type === 'superadmin' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                                                    'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                                    }`}>
                                                    {admin.user_type?.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="py-5 px-4 text-sm font-medium opacity-60 italic">{admin.email}</td>
                                            <td className="py-5 px-4 text-right">
                                                <button className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-900'}`}>
                                                    <Settings size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div >
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
                                        <input type="text" defaultValue="Pathfinder Student Portal" className={`w-full p-4 rounded-xl border font-bold text-sm ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">Support Email</label>
                                        <input type="text" defaultValue="support@pathfinder.com" className={`w-full p-4 rounded-xl border font-bold text-sm ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} />
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
            <CreateUserModal
                isOpen={isCreateModalOpen}
                onClose={() => setCreateModalOpen(false)}
                onSuccess={() => alert("User created successfully!")}
            />

            {renderContent()}
        </PortalLayout>
    );
};

export default SystemDashboard;
