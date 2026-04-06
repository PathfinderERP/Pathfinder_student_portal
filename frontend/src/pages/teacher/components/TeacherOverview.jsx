import React, { useState, useEffect } from 'react';
import {
    Clock, Calendar, BookOpen, CheckCircle, Sparkles,
    ArrowRight, Mail, Briefcase, MapPin, Bell
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

const TeacherOverview = ({ user }) => {
    const { isDarkMode } = useTheme();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const theme = {
        bg: isDarkMode ? 'bg-[#0F172A]' : 'bg-white',
        card: isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200',
        text: isDarkMode ? 'text-white' : 'text-slate-900',
        subtext: isDarkMode ? 'text-slate-400' : 'text-slate-500',
        border: isDarkMode ? 'border-slate-800' : 'border-slate-200',
        accentBg: isDarkMode ? 'bg-slate-900/50' : 'bg-slate-100',
        itemBg: isDarkMode ? 'bg-[#1E293B]/20' : 'bg-slate-50'
    };

    return (
        <div className={`space-y-6 selection:bg-cyan-500/30 font-mono ${isDarkMode ? 'dark' : ''}`}>
            {/* Control Center Hero */}
            <section className={`relative overflow-hidden rounded-[5px] ${isDarkMode ? 'bg-[#0F172A]' : 'bg-slate-900'} p-8 md:p-10 text-white border-l-4 border-cyan-500 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500`}>
                <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                    <div className="flex-1 space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-[2px] text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-400">
                            <Sparkles size={12} /> System Status: Operational
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-none uppercase">
                            Console<br />
                            <span className="text-cyan-500 underline decoration-2 underline-offset-8">Terminal: {user?.first_name}</span>
                        </h2>
                        <p className="text-slate-400 max-w-lg text-xs font-medium leading-relaxed uppercase tracking-wider">
                            {user?.role_label || 'User'} access granted. Initializing session protocols. All ERP subsystems are responding.
                        </p>
                        <div className="flex flex-wrap gap-8 pt-4">
                            <QuickStat value="124" label="Nodes" unit="Users" color="text-cyan-400" />
                            <QuickStat value="08" label="Events" unit="Today" color="text-indigo-400" />
                            <QuickStat value="98%" label="Uptime" unit="Activity" color="text-rose-400" />
                        </div>
                    </div>
                    <div className={`hidden lg:flex w-48 h-48 border-2 ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-700 bg-slate-800/50'} items-center justify-center relative group rounded-[5px]`}>
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-500"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-500"></div>
                        <BookOpen size={60} strokeWidth={1} className="text-cyan-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>
            </section>

            {/* Technical Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Protocol Log - Schedule */}
                <div className="lg:col-span-2 space-y-6 animate-in fade-in duration-500">
                    <div className={`${theme.card} rounded-[5px] border p-6 shadow-xl`}>
                        <div className={`flex items-center justify-between mb-8 border-b ${theme.border} pb-4`}>
                            <div>
                                <h3 className={`text-sm font-bold ${theme.text} uppercase tracking-[0.3em] flex items-center gap-2`}>
                                    <Clock size={16} className="text-cyan-400" /> Sequence Agenda
                                </h3>
                            </div>
                            <button className="flex items-center gap-2 text-[9px] font-bold tracking-[0.2em] uppercase text-cyan-400 hover:text-white transition-colors">
                                View Full Log <ArrowRight size={10} />
                            </button>
                        </div>
                        <div className="space-y-2">
                            <ScheduleItem
                                time="09:00"
                                duration="90M"
                                subject="Advanced Botany"
                                batch="NEET-A"
                                room="L302"
                                status="DONE"
                                theme={theme}
                            />
                            <ScheduleItem
                                time="11:30"
                                duration="60M"
                                subject="Molecular bio"
                                batch="JEE-ADV"
                                room="S-HALL"
                                status="LIVE"
                                active
                                theme={theme}
                            />
                            <ScheduleItem
                                time="14:00"
                                duration="60M"
                                subject="Plant Physio"
                                batch="DRP-B"
                                room="RM-Z"
                                status="NEXT"
                                theme={theme}
                            />
                        </div>
                    </div>

                    {/* Analytics Modules */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={`${theme.card} rounded-[5px] border p-6 shadow-xl`}>
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-6">Load Distribution</h3>
                            <div className="flex items-end gap-1.5 h-24">
                                {[40, 65, 45, 90, 75, 55, 80].map((h, i) => (
                                    <div key={i} className={`flex-1 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'} relative group`}>
                                        <div className="absolute bottom-0 w-full bg-cyan-500/50 transition-all duration-300 group-hover:bg-cyan-400" style={{ height: `${h}%` }}></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className={`${theme.card} rounded-[5px] border-l-4 border-rose-500 p-6 shadow-xl flex flex-col justify-center space-y-2`}>
                            <h4 className="text-3xl font-black text-rose-500">92.0%</h4>
                            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">Syllabus Completion</p>
                            <div className={`w-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'} h-1 mt-2`}>
                                <div className="bg-rose-500 h-full" style={{ width: '92%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* System Specs - Profile & Notifications */}
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className={`${theme.card} rounded-[5px] border p-6 shadow-2xl relative overflow-hidden`}>
                        <div className="text-center space-y-6">
                            <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'} w-20 h-20 border-2 mx-auto flex items-center justify-center font-black text-2xl text-cyan-400 rounded-[5px]`}>
                                {user?.first_name?.charAt(0)}
                            </div>
                            <div>
                                <h3 className={`text-lg font-bold ${theme.text} uppercase tracking-tighter`}>{user?.first_name} {user?.last_name}</h3>
                                <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-cyan-500 mt-1">Tier: {user?.role_label || 'User'}</p>
                            </div>
                            <div className={`w-full space-y-2 pt-4 border-t ${theme.border}`}>
                                <ProfileItem icon={<Mail size={12} />} label="ID" value={user?.employee_id || user?.username || 'N/A'} theme={theme} />
                                <ProfileItem icon={<Briefcase size={12} />} label="SEC" value={user?.teacherDepartment || 'Academic'} theme={theme} />
                                <ProfileItem icon={<MapPin size={12} />} label="LOC" value={user?.centres?.[0]?.centreName || 'HQ'} theme={theme} />
                            </div>
                        </div>
                    </div>

                    <div className={`${theme.card} rounded-[5px] border p-6 shadow-xl`}>
                        <h3 className={`text-xs font-bold ${theme.text} uppercase tracking-[0.3em] mb-6 flex items-center gap-2`}>
                            <Bell size={14} className="text-rose-500" /> Interrupts
                        </h3>
                        <div className="space-y-4">
                            <NotificationItem
                                title="Registry Update"
                                time="120M"
                                type="cyan"
                                theme={theme}
                            />
                            <NotificationItem
                                title="Kernel Alert"
                                time="300M"
                                type="rose"
                                theme={theme}
                            />
                        </div>
                    </div>
                </div>
            </div>
            <div className="h-20"></div>
        </div>
    );
};

// Sub-components
const QuickStat = ({ value, label, unit, color }) => (
    <div className="flex flex-col">
        <span className={`text-2xl font-black leading-none ${color}`}>{value}</span>
        <div className="flex flex-col mt-1">
            <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-slate-500">{label}</span>
            <span className="text-[7px] font-black uppercase text-slate-400">{unit}</span>
        </div>
    </div>
);

const ScheduleItem = ({ time, duration, subject, batch, room, status, active, theme }) => (
    <div className={`p-4 border transition-all duration-200 rounded-[5px] ${active ? 'bg-cyan-500/5 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : `${theme.itemBg} ${theme.border} hover:border-slate-400`}`}>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <span className={`text-[10px] font-bold ${active ? 'text-cyan-400' : 'text-slate-500'}`}>{time}</span>
                <div className={`h-4 w-[2px] ${theme.border} bg-current opacity-20`}></div>
                <div>
                    <h4 className={`text-xs font-bold uppercase tracking-widest ${active ? theme.text : 'text-slate-500'}`}>{subject}</h4>
                    <p className={`text-[8px] font-bold uppercase tracking-widest ${active ? 'text-cyan-600' : 'text-slate-400'}`}>{batch} / {room}</p>
                </div>
            </div>
            <div className={`px-2 py-0.5 text-[8px] font-black tracking-[0.2em] border ${status === 'DONE' ? 'text-slate-500 border-slate-300 dark:border-slate-800' : status === 'LIVE' ? 'text-cyan-400 border-cyan-500 animate-pulse' : 'text-rose-500 border-rose-900'}`}>
                {status}
            </div>
        </div>
    </div>
);

const ProfileItem = ({ icon, label, value, theme }) => (
    <div className={`flex items-center justify-between gap-4 py-1.5 border-b ${theme.border} last:border-0 font-mono`}>
        <div className="flex items-center gap-2">
            <span className="text-cyan-500">{icon}</span>
            <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
        </div>
        <span className={`text-[9px] font-bold ${theme.text} truncate max-w-[140px] uppercase opacity-80`}>{value}</span>
    </div>
);

const NotificationItem = ({ title, time, type, theme }) => (
    <div className={`flex items-center justify-between p-3 border ${theme.border} ${theme.accentBg} rounded-[5px] hover:border-cyan-500/50 transition-colors cursor-pointer group`}>
        <div className="flex items-center gap-3">
            <div className={`w-1 h-3 ${type === 'rose' ? 'bg-rose-500' : 'bg-cyan-400'}`}></div>
            <h4 className={`text-[10px] font-bold ${theme.text} uppercase tracking-widest opacity-70 group-hover:opacity-100 transition-opacity`}>{title}</h4>
        </div>
        <span className="text-[8px] font-bold text-slate-500 uppercase italic">{time}</span>
    </div>
);

export default TeacherOverview;
