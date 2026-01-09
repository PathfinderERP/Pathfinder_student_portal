import React from 'react';
import {
    LayoutDashboard, BookOpen, Calendar, Award,
    Clock, Bell, ExternalLink, RefreshCw, TrendingUp
} from 'lucide-react';
import PortalLayout from '../../components/common/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const StudentDashboard = () => {
    const { user } = useAuth();
    const { isDarkMode } = useTheme();

    const sidebarItems = [
        { icon: LayoutDashboard, label: 'Dashboard', active: true },
        { icon: BookOpen, label: 'My Courses' },
        { icon: Calendar, label: 'Class Schedule' },
        { icon: Award, label: 'Assignments' },
        { icon: Award, label: 'Exams' },
        { icon: Clock, label: 'Attendance' },
        { icon: Bell, label: 'Notifications' },
    ];

    const headerActions = (
        <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer hover:border-orange-500/50
            ${isDarkMode ? 'bg-slate-800/50 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
            <ExternalLink size={14} />
            <span>Course Portal</span>
        </div>
    );

    return (
        <PortalLayout
            sidebarItems={sidebarItems}
            title="Student Dashboard"
            subtitle="Progress tracking and academic resources"
            headerActions={headerActions}
        >
            {/* Dashboard Overview Banner */}
            <div className={`relative overflow-hidden p-10 rounded-[2.5rem] shadow-2xl transition-all border
                ${isDarkMode
                    ? 'bg-gradient-to-r from-[#1A365D] to-[#1A202C] border-white/5'
                    : 'bg-gradient-to-br from-blue-50 to-white border-blue-100 shadow-blue-900/5'}`}>

                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/10 blur-[120px] rounded-full"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div>
                        <h2 className={`text-4xl font-black tracking-tight mb-3 uppercase ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            STUDENT <span className="text-blue-500">OVERVIEW</span>
                        </h2>
                        <p className={`text-sm font-medium max-w-xl leading-relaxed ${isDarkMode ? 'text-blue-100/60' : 'text-slate-600'}`}>
                            Welcome back, <span className={`${isDarkMode ? 'text-white' : 'text-blue-600'} font-bold`}>{user?.username}</span>. You have <span className="text-blue-500 font-black px-1">2 assignments</span> due this week. Stay ahead of schedule!
                        </p>
                    </div>
                    <button className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border
                        ${isDarkMode ? 'bg-white/10 hover:bg-white/20 border-white/20 text-white' : 'bg-blue-600 hover:bg-blue-700 border-blue-600 text-white shadow-lg shadow-blue-600/20'}`}>
                        <RefreshCw size={14} />
                        SYNC PROGRESS
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'ENROLLED COURSES', value: '4', icon: BookOpen, color: 'blue', trend: 'CS101, MAT202...' },
                    { label: 'ASSIGNMENTS DUE', value: '2', icon: Award, color: 'purple', trend: 'Next due tomorrow' },
                    { label: 'ATTENDANCE RATE', value: '92%', icon: Clock, color: 'emerald', trend: 'Excellent standing' },
                    { label: 'AVERAGE GRADE', value: 'A-', icon: TrendingUp, color: 'orange', trend: 'Top 15% of class' },
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
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full bg-emerald-500`}></div>
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

export default StudentDashboard;
