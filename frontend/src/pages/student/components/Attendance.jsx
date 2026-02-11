import React from 'react';
import { Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';

const Attendance = ({ isDarkMode }) => {
    // Mock data - replace with actual API data
    const attendanceData = {
        overall: 85,
        present: 170,
        absent: 15,
        total: 200,
        monthlyData: [
            { month: 'January', present: 20, absent: 2, percentage: 91 },
            { month: 'February', present: 18, absent: 1, percentage: 95 },
            { month: 'March', present: 22, absent: 3, percentage: 88 },
            { month: 'April', present: 19, absent: 2, percentage: 90 },
        ]
    };

    return (
        <div className="space-y-8 animate-fade-in-up pb-10">
            {/* Attendance Hero */}
            <div className={`p-8 rounded-[5px] border relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="px-3 py-1 rounded-[5px] bg-orange-500/10 text-orange-500 text-[10px] font-black uppercase tracking-[0.2em]">
                            Performance Tracking
                        </div>
                    </div>
                    <h2 className={`text-3xl font-black uppercase tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        Attendance Logs
                    </h2>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Comprehensive breakdown of your academic presence and session participation.
                    </p>
                </div>
                <Calendar size={200} className="absolute -right-10 -bottom-10 opacity-[0.03] rotate-12" />
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                    title="Overall Attendance"
                    value={`${attendanceData.overall}%`}
                    icon={Calendar}
                    color="purple"
                    isDark={isDarkMode}
                />
                <StatCard
                    title="Total Classes"
                    value={attendanceData.total}
                    icon={Clock}
                    color="blue"
                    isDark={isDarkMode}
                />
                <StatCard
                    title="Present"
                    value={attendanceData.present}
                    icon={CheckCircle}
                    color="indigo"
                    isDark={isDarkMode}
                />
                <StatCard
                    title="Absent"
                    value={attendanceData.absent}
                    icon={XCircle}
                    color="red"
                    isDark={isDarkMode}
                />
            </div>

            {/* Monthly Breakdown */}
            <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                <h3 className={`text-xs font-black uppercase tracking-[0.2em] mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Monthly Breakdown
                </h3>
                <div className="space-y-4">
                    {attendanceData.monthlyData.map((month, idx) => (
                        <div key={idx} className={`p-4 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {month.month}
                                </h4>
                                <span className={`text-xs font-black px-3 py-1 rounded-[5px] ${month.percentage >= 90
                                    ? 'bg-indigo-500/10 text-indigo-500'
                                    : month.percentage >= 75
                                        ? 'bg-orange-500/10 text-orange-500'
                                        : 'bg-red-500/10 text-red-500'
                                    }`}>
                                    {month.percentage}%
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div className="flex items-center gap-2">
                                    <CheckCircle size={14} className="text-indigo-500" />
                                    <span className={`font-bold ${isDarkMode ? 'text-white/70' : 'text-slate-700'}`}>Present: {month.present}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <XCircle size={14} className="text-red-500" />
                                    <span className={`font-bold ${isDarkMode ? 'text-white/70' : 'text-slate-700'}`}>Absent: {month.absent}</span>
                                </div>
                            </div>
                            {/* Progress Bar */}
                            <div className={`mt-3 h-2 rounded-[5px] overflow-hidden ${isDarkMode ? 'bg-white/5' : 'bg-slate-200'}`}>
                                <div
                                    className="h-full bg-gradient-to-r from-orange-500 to-indigo-500 transition-all"
                                    style={{ width: `${month.percentage}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon: Icon, color, isDark }) => {
    const colorClasses = {
        purple: 'from-purple-500 to-indigo-600',
        blue: 'from-blue-500 to-cyan-600',
        indigo: 'from-indigo-500 to-blue-600',
        red: 'from-red-500 to-orange-600',
    };

    return (
        <div className={`p-6 rounded-[5px] border ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-[5px] bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg`}>
                    <Icon size={24} className="text-white" strokeWidth={2.5} />
                </div>
            </div>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-white/60' : 'text-slate-900/60'}`}>{title}</p>
            <p className={`text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
        </div>
    );
};

export default Attendance;
