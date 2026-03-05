import React, { useState, useEffect } from 'react';
import {
    Clock, Calendar, BookOpen, CheckCircle, Sparkles,
    ArrowRight, Mail, Briefcase, MapPin, Bell
} from 'lucide-react';

const TeacherOverview = ({ user }) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="space-y-10 selection:bg-indigo-500/30">
            {/* Welcome Hero - Sophisticated Indigo & Violet */}
            <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#4F46E5] via-[#6366F1] to-[#8B5CF6] p-8 md:p-12 text-white shadow-2xl shadow-indigo-500/20 group animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/20 rounded-full -ml-32 -mb-32 blur-2xl"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                    <div className="flex-1 space-y-6">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                            <Sparkles size={12} className="text-emerald-400" /> Session Sync Active
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-none uppercase">
                            Academic<br />
                            <span className="text-indigo-200/60 font-medium lowercase italic">workspace for</span> {user?.first_name}
                        </h2>
                        <p className="text-indigo-50/80 max-w-lg text-sm font-medium leading-relaxed">
                            Welcome to your personalized console. Orchestrate your classes, track student evolution, and manage materials from one secure interface.
                        </p>
                        <div className="flex flex-wrap gap-6 pt-4">
                            <QuickStat value="124" label="Registered" unit="Students" />
                            <QuickStat value="08" label="Scheduled" unit="Sessions" />
                            <QuickStat value="98%" label="Average" unit="Engagement" />
                        </div>
                    </div>
                    <div className="hidden lg:flex w-56 h-56 rounded-3xl border border-white/20 items-center justify-center bg-white/5 backdrop-blur-lg group-hover:rotate-6 transition-transform duration-700 relative">
                        <div className="absolute inset-0 bg-indigo-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all"></div>
                        <BookOpen size={80} strokeWidth={1} className="text-white relative z-10 opacity-90" />
                    </div>
                </div>
            </section>

            {/* Bento Grid Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Schedule & Tasks */}
                <div className="lg:col-span-2 space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">
                    {/* Upcoming Classes */}
                    <div className="bg-[#111827]/40 dark:bg-[#111827]/60 backdrop-blur-sm rounded-[2rem] border border-white/5 p-8 shadow-xl">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                                    <Clock size={20} className="text-indigo-400" /> Today's Agenda
                                </h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">High priority sessions prioritized</p>
                            </div>
                            <button className="flex items-center gap-2 text-[10px] font-black tracking-[0.2em] uppercase text-indigo-400 bg-indigo-400/5 px-4 py-2 rounded-xl border border-indigo-400/20 hover:bg-indigo-400/10 transition-all">
                                Calendar View <ArrowRight size={12} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <ScheduleItem
                                time="09:00 AM"
                                duration="90 min"
                                subject="Advanced Botany"
                                batch="NEET Batch A"
                                room="Lab 302"
                                status="Completed"
                            />
                            <ScheduleItem
                                time="11:30 AM"
                                duration="60 min"
                                subject="Molecular Biology"
                                batch="JEE Advanced"
                                room="Seminar Hall"
                                status="Ongoing"
                                active
                            />
                            <ScheduleItem
                                time="02:00 PM"
                                duration="60 min"
                                subject="Plant Physiology"
                                batch="Droppers Batch"
                                room="Online - Zoom"
                                status="Upcoming"
                            />
                        </div>
                    </div>

                    {/* Performance Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-[#111827]/40 dark:bg-[#111827]/60 rounded-[2rem] border border-white/5 p-8 shadow-xl">
                            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-6">Student Progress</h3>
                            <div className="flex items-end gap-3 h-32">
                                {[40, 65, 45, 90, 75, 55, 80].map((h, i) => (
                                    <div key={i} className="flex-1 bg-white/5 rounded-t-xl relative group">
                                        <div className="absolute bottom-0 w-full bg-indigo-500/40 rounded-t-xl transition-all duration-500 group-hover:bg-indigo-500" style={{ height: `${h}%` }}></div>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-4 text-[10px] font-bold text-center text-slate-500 uppercase tracking-widest">Global Batch Performance</p>
                        </div>
                        <div className="bg-gradient-to-br from-[#059669] to-[#10B981] rounded-[2rem] p-8 shadow-xl flex flex-col justify-center text-center space-y-2 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                            <h4 className="text-4xl font-black">92%</h4>
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Course Fidelity</p>
                            <div className="pt-2 flex justify-center">
                                <div className="px-3 py-1 bg-white/20 rounded-full text-[9px] font-black uppercase tracking-widest">Target Reached</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Profile & Announcements */}
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
                    {/* Profile Card */}
                    <div className="bg-[#111827]/40 dark:bg-[#111827]/60 rounded-[2rem] border border-white/5 p-8 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-[100px] -mr-8 -mt-8"></div>
                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="w-24 h-24 rounded-3xl border-2 border-indigo-500/30 p-1 bg-indigo-500/10">
                                <div className="w-full h-full rounded-2xl bg-[#0D1117] flex items-center justify-center font-black text-3xl text-indigo-400">
                                    {user?.first_name?.charAt(0)}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">{user?.first_name} {user?.last_name}</h3>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mt-1">{user?.designation || 'Senior Faculty'}</p>
                            </div>
                            <div className="w-full space-y-4 pt-4 border-t border-white/5">
                                <ProfileItem icon={<Mail size={14} />} label="Email" value={user?.email || 'N/A'} />
                                <ProfileItem icon={<Briefcase size={14} />} label="Dept" value={user?.teacherDepartment || 'Academic'} />
                                <ProfileItem icon={<MapPin size={14} />} label="Campus" value={user?.centres?.[0]?.centreName || 'Main Campus'} />
                            </div>
                        </div>
                    </div>

                    {/* Announcements */}
                    <div className="bg-[#111827]/40 dark:bg-[#111827]/60 rounded-[2rem] border border-white/5 p-8 shadow-xl">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Bell size={18} className="text-emerald-400" /> Notifications
                        </h3>
                        <div className="space-y-6">
                            <NotificationItem
                                title="Registry Update"
                                time="2h ago"
                                desc="Student batch lists have been updated via ERP sync."
                                type="info"
                            />
                            <NotificationItem
                                title="Material Ready"
                                time="5h ago"
                                desc="The new chemistry question bank is now available for distribution."
                                type="emerald"
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
const QuickStat = ({ value, label, unit }) => (
    <div className="flex flex-col">
        <span className="text-3xl font-black leading-none">{value}</span>
        <div className="flex flex-col mt-1">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">{label}</span>
            <span className="text-[8px] font-bold uppercase text-white/60">{unit}</span>
        </div>
    </div>
);

const ScheduleItem = ({ time, duration, subject, batch, room, status, active }) => (
    <div className={`p-5 rounded-2xl border transition-all duration-300 ${active ? 'bg-indigo-500/10 border-indigo-500/30 ring-1 ring-indigo-500/20' : 'bg-white/5 border-white/10 hover:bg-white/[0.08]'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className={`p-3.5 rounded-xl ${active ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-white/10 text-slate-500'}`}>
                    <Calendar size={20} />
                </div>
                <div>
                    <h4 className="font-black text-white text-sm uppercase tracking-tight">{subject}</h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{batch} • {room}</p>
                </div>
            </div>
            <div className="flex items-center gap-6">
                <div className="text-right">
                    <p className="text-xs font-black text-white">{time}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase">{duration}</p>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : status === 'Ongoing' ? 'bg-indigo-500 text-white border-indigo-400/50 animate-pulse' : 'bg-slate-700/30 text-slate-400 border-white/5'}`}>
                    {status}
                </div>
            </div>
        </div>
    </div>
);

const ProfileItem = ({ icon, label, value }) => (
    <div className="flex items-center justify-between gap-4 py-1">
        <div className="flex items-center gap-2 text-slate-500">
            <div className="p-1.5 bg-white/5 rounded-lg text-indigo-400">{icon}</div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</span>
        </div>
        <span className="text-[10px] font-bold text-white truncate max-w-[120px]">{value}</span>
    </div>
);

const NotificationItem = ({ title, time, desc, type }) => (
    <div className="relative pl-6 border-l-2 border-white/5 pb-2 group cursor-pointer">
        <div className={`absolute left-0 top-0 -translate-x-[calc(50%+1px)] w-2.5 h-2.5 rounded-full ${type === 'emerald' ? 'bg-emerald-500 ring-4 ring-emerald-500/10' : 'bg-indigo-500 ring-4 ring-indigo-500/10'} group-hover:scale-125 transition-transform`}></div>
        <div className="flex justify-between items-center mb-1">
            <h4 className="text-[11px] font-black text-white uppercase tracking-tight">{title}</h4>
            <span className="text-[9px] font-bold text-slate-600 uppercase">{time}</span>
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed italic group-hover:text-slate-400 transition-colors">{desc}</p>
    </div>
);

export default TeacherOverview;
