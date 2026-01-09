import React, { useState } from 'react';
import {
    Users, BookOpen, MapPin, GraduationCap,
    Newspaper, Briefcase, ShieldCheck, Settings,
    LayoutDashboard, Plus, ChevronRight, ExternalLink
} from 'lucide-react';
import PortalLayout from '../../components/common/PortalLayout';
import CreateUserModal from '../../components/CreateUserModal';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const SystemDashboard = () => {
    const { user } = useAuth();
    const { isDarkMode } = useTheme();
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);

    const isSuperAdmin = user?.user_type === 'superadmin';

    const sidebarItems = [
        { icon: LayoutDashboard, label: 'Dashboard', active: true },
        { icon: BookOpen, label: 'Courses' },
        { icon: Users, label: 'Applicants' },
        { icon: MapPin, label: 'Centres' },
        { icon: GraduationCap, label: 'Alumni' },
        { icon: Users, label: 'Users' },
        { icon: ShieldCheck, label: 'Student Corner' },
        { icon: Newspaper, label: 'Blog' },
        { icon: Briefcase, label: 'Jobs' },
        { icon: ShieldCheck, label: 'Admin Management' },
        { icon: Settings, label: 'Settings' },
    ];

    const headerActions = (
        <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer hover:border-orange-500/50
            ${isDarkMode ? 'bg-slate-800/50 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
            <ExternalLink size={14} />
            <span>View Site</span>
        </div>
    );

    return (
        <PortalLayout
            sidebarItems={sidebarItems}
            title={isSuperAdmin ? "Super Admin Dashboard" : "Admin Dashboard"}
            subtitle="Manage your application content and users"
            headerActions={headerActions}
        >
            <CreateUserModal
                isOpen={isCreateModalOpen}
                onClose={() => setCreateModalOpen(false)}
                onSuccess={() => alert("User created successfully!")}
            />

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
                    { label: 'TOTAL USERS', value: '21', icon: Users, color: 'blue', trend: '+12% this month' },
                    { label: 'ACTIVE COURSES', value: '117', icon: GraduationCap, color: 'purple', trend: 'Updated recently' },
                    { label: 'TRAINING CENTRES', value: '28', icon: MapPin, color: 'emerald', trend: 'Across active regions' },
                    { label: 'JOB OPENINGS', value: '2', icon: Briefcase, color: 'orange', trend: 'Currently hiring' },
                ].map((stat, i) => (
                    <div key={i} className={`p-8 rounded-[2rem] border transition-all duration-300 group hover:-translate-y-2
                        ${isDarkMode
                            ? 'bg-[#10141D] border-white/5 shadow-xl hover:shadow-orange-500/5'
                            : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50'}`}>

                        <div className="relative mb-8">
                            <div className={`p-3.5 rounded-2xl w-fit relative z-10 transition-transform group-hover:scale-110 duration-500
                                ${stat.color === 'blue' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' :
                                    stat.color === 'purple' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' :
                                        stat.color === 'emerald' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' :
                                            'bg-orange-500 text-white shadow-lg shadow-orange-500/30'}`}>
                                <stat.icon size={24} strokeWidth={2.5} />
                            </div>
                            <div className={`absolute -top-4 -left-4 w-12 h-12 rounded-full opacity-20 blur-xl
                                ${stat.color === 'blue' ? 'bg-blue-500' : stat.color === 'purple' ? 'bg-purple-500' : stat.color === 'emerald' ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
                        </div>

                        <div className={`text-[10px] font-black uppercase tracking-[0.15em] mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            {stat.label}
                        </div>
                        <div className={`text-4xl font-black tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {stat.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Action Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div onClick={() => setCreateModalOpen(true)} className={`p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-end min-h-[220px] transition-transform hover:scale-[1.01] duration-500 cursor-pointer group border
                    ${isDarkMode
                        ? 'bg-gradient-to-br from-orange-500 to-[#F97316] border-orange-400'
                        : 'bg-gradient-to-br from-orange-50 to-white border-orange-100 shadow-orange-200/50'}`}>

                    <div className={`absolute top-8 left-10 p-4 backdrop-blur-md rounded-2xl transition-all duration-300
                        ${isDarkMode ? 'bg-white/20 text-white' : 'bg-orange-600 text-white shadow-lg shadow-orange-600/30 group-hover:scale-110'}`}>
                        <Plus size={32} strokeWidth={3} />
                    </div>

                    <div className={`absolute top-0 right-0 h-full bg-white/5 -skew-x-12 translate-x-12 transition-all duration-500 ${isDarkMode ? 'w-[40%]' : 'w-0'}`}></div>

                    <h3 className={`text-3xl font-black tracking-tight leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Create New User</h3>
                    <div className={`mt-4 flex items-center gap-2 font-bold text-sm ${isDarkMode ? 'text-white/80' : 'text-slate-500'}`}>
                        <span>Register a new portal user</span>
                        <ChevronRight size={18} className="group-hover:translate-x-2 transition-transform" />
                    </div>
                </div>

                <div className={`p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-end min-h-[220px] transition-transform hover:scale-[1.01] duration-500 cursor-pointer group border
                    ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-200 shadow-slate-200/50'}`}>
                    <div className={`absolute top-8 left-10 p-4 backdrop-blur-md rounded-2xl ${isDarkMode ? 'bg-white/10 text-white' : 'bg-slate-900 text-white'}`}>
                        <Briefcase size={32} strokeWidth={3} />
                    </div>
                    <h3 className={`text-3xl font-black tracking-tight leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Post Job Opening</h3>
                    <div className={`mt-4 flex items-center gap-2 font-bold text-sm ${isDarkMode ? 'text-white/60' : 'text-slate-500'}`}>
                        <span>Advertise new opportunities</span>
                        <ChevronRight size={18} className="group-hover:translate-x-2 transition-transform" />
                    </div>
                </div>
            </div>
        </PortalLayout>
    );
};

export default SystemDashboard;
