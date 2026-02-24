import React from 'react';
import {
    LayoutDashboard, Users, BookOpen, Calendar,
    Award, DollarSign, MessageCircle, Clock,
    RefreshCw, GraduationCap
} from 'lucide-react';
import PortalLayout from '../../components/common/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const ParentDashboard = () => {
    const { user } = useAuth();
    const { isDarkMode } = useTheme();

    const sidebarItems = [
        { icon: LayoutDashboard, label: 'Dashboard', active: true },
        { icon: Users, label: 'My Children' },
        { icon: BookOpen, label: 'Academic Reports' },
        { icon: DollarSign, label: 'Fee Payments' },
        { icon: Calendar, label: 'School Calendar' },
        { icon: Clock, label: 'Attendance' },
    ];

    const headerActions = null;

    return (
        <PortalLayout
            sidebarItems={sidebarItems}
            title="Parent Dashboard"
            subtitle="Monitoring family academic performance"
            headerActions={headerActions}
        >
            {/* Parent Overview Banner */}
            <div className={`relative overflow-hidden p-10 rounded-[5px] shadow-2xl transition-all border
                ${isDarkMode
                    ? 'bg-gradient-to-r from-[#064E3B] to-[#1A202C] border-white/5'
                    : 'bg-gradient-to-br from-emerald-50 to-white border-emerald-100 shadow-emerald-900/5'}`}>

                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div>
                        <h2 className={`text-4xl font-black tracking-tight mb-3 uppercase ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            FAMILY <span className="text-emerald-500">OVERVIEW</span>
                        </h2>
                        <p className={`text-sm font-medium max-w-xl leading-relaxed ${isDarkMode ? 'text-emerald-100/60' : 'text-slate-600'}`}>
                            Welcome back, <span className={`${isDarkMode ? 'text-white' : 'text-emerald-600'} font-bold`}>{user?.username}</span>. Your children are showing <span className="text-emerald-500 font-black px-1">consistent progress</span>. A new report card is available for Alex.
                        </p>
                    </div>
                    <button className={`flex items-center gap-2 px-5 py-2.5 rounded-[5px] text-xs font-black uppercase tracking-widest transition-all border
                        ${isDarkMode ? 'bg-white/10 hover:bg-white/20 border-white/20 text-white' : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white shadow-lg shadow-emerald-600/20'}`}>
                        <RefreshCw size={14} />
                        REFRESH METRICS
                    </button>
                </div>
            </div>

            {/* Child Cards Row */}
            <div className="flex gap-6 overflow-x-auto pb-6">
                {[
                    { name: 'Alex Smith', grade: 'Grade 10', performance: 'Excellent', color: 'blue' },
                    { name: 'Emily Smith', grade: 'Grade 8', performance: 'Steady', color: 'purple' },
                ].map((child, i) => (
                    <div key={i} className={`flex-shrink-0 p-8 rounded-[5px] border min-w-[320px] transition-all hover:-translate-y-2
                        ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-2xl' : 'bg-white border-slate-100 shadow-xl'}`}>
                        <div className="flex items-center justify-between mb-6">
                            <div className={`p-3 rounded-[5px] ${child.color === 'blue' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                                <GraduationCap size={24} />
                            </div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">Active Student</div>
                        </div>
                        <h3 className={`text-2xl font-black mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{child.name}</h3>
                        <p className="text-xs font-bold text-slate-500 mb-6">{child.grade} • {child.performance} Standing</p>
                        <button className="w-full flex items-center justify-center gap-2 py-3 rounded-[5px] bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all">
                            VIEW DETAILED REPORT
                        </button>
                    </div>
                ))}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'FEE STATUS', value: '$1,200', icon: DollarSign, color: 'orange', trend: 'Due in 5 days' },
                    { label: 'ATTENDANCE', value: '94%', icon: Clock, color: 'emerald', trend: 'Class average 90%' },
                    { label: 'AWARDS', value: '5', icon: Award, color: 'purple', trend: 'Earned this term' },
                ].map((stat, i) => (
                    <div key={i} className={`p-8 rounded-[5px] border transition-all duration-300 group hover:-translate-y-2
                        ${isDarkMode
                            ? 'bg-[#10141D] border-white/5 shadow-xl'
                            : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50'}`}>
                        <div className="relative mb-8">
                            <div className={`p-3.5 rounded-[5px] w-fit relative z-10 transition-transform group-hover:scale-110 duration-500
                                ${stat.color === 'blue' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' :
                                    stat.color === 'purple' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' :
                                        stat.color === 'emerald' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' :
                                            'bg-orange-500 text-white shadow-lg shadow-orange-500/30'}`}>
                                <stat.icon size={24} strokeWidth={2.5} />
                            </div>
                        </div>
                        <div className={`text-[10px] font-black uppercase tracking-[0.15em] mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            {stat.label}
                        </div>
                        <div className={`text-4xl font-black tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {stat.value}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${stat.color === 'orange' ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                            <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {stat.trend}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </PortalLayout>
    );
};

export default ParentDashboard;
