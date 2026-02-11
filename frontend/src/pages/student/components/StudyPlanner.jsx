import React, { useState } from 'react';
import {
    Calendar, Clock, CheckCircle2, Circle,
    Plus, ChevronLeft, ChevronRight, Filter,
    LayoutGrid, List, MoreVertical, Star,
    Zap, AlertCircle, BookOpen, GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StudyPlanner = ({ isDarkMode }) => {
    const [view, setView] = useState('Weekly'); // 'Weekly' or 'Grid'
    const [selectedDate, setSelectedDate] = useState(new Date());

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const currentWeek = [11, 12, 13, 14, 15, 16, 17]; // Mock current week dates

    const [tasks, setTasks] = useState([
        { id: 1, topic: 'Inverse Trigonometry', subject: 'Maths', time: '10:00 AM', duration: '2h', priority: 'High', completed: true },
        { id: 2, topic: 'Chemical Bonding Revision', subject: 'Chemistry', time: '01:30 PM', duration: '1.5h', priority: 'Medium', completed: false },
        { id: 3, topic: 'Laws of Motion Problems', subject: 'Physics', time: '04:00 PM', duration: '3h', priority: 'High', completed: false },
        { id: 4, topic: 'English: Grammar Basics', subject: 'English', time: '08:00 PM', duration: '1h', priority: 'Low', completed: false },
    ]);

    const toggleTask = (id) => {
        setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    };

    return (
        <div className="space-y-8 animate-fade-in-up pb-10">
            {/* Planner Header */}
            <div className={`p-8 rounded-[5px] border relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="px-3 py-1 rounded-[5px] bg-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase tracking-[0.2em]">
                                Time Management
                            </div>
                        </div>
                        <h2 className="text-3xl font-black uppercase tracking-tight mb-2 bg-gradient-to-r from-orange-500 to-indigo-500 bg-clip-text text-transparent">
                            Study Planner
                        </h2>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Organize your learning schedule, track assignments, and optimize your study windows.
                        </p>
                    </div>

                    <button className="px-6 py-4 bg-gradient-to-r from-orange-500 to-indigo-600 text-white rounded-[5px] font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-2 group">
                        <Plus size={18} strokeWidth={3} className="group-hover:rotate-90 transition-all duration-300" />
                        <span>Create Schedule</span>
                    </button>
                </div>

                <Calendar size={200} className="absolute -right-10 -bottom-10 opacity-[0.03] rotate-12" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                {/* Left Column: Calendar & Filters */}
                <div className="xl:col-span-1 space-y-8">
                    {/* Small Calendar Mock */}
                    <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                        <div className="flex items-center justify-between mb-6">
                            <h4 className={`text-sm font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>February 2026</h4>
                            <div className="flex gap-2">
                                <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-[5px] opacity-50"><ChevronLeft size={16} /></button>
                                <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-[5px] opacity-50"><ChevronRight size={16} /></button>
                            </div>
                        </div>
                        <div className="grid grid-cols-7 gap-2 text-center mb-4">
                            {weekDays.map(d => <span key={d} className="text-[10px] font-black opacity-30 uppercase">{d[0]}</span>)}
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                            {currentWeek.map(d => (
                                <button
                                    key={d}
                                    className={`aspect-square rounded-[5px] text-xs font-bold flex items-center justify-center transition-all ${d === 14
                                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                            : 'hover:bg-slate-100 dark:hover:bg-white/5 opacity-60'
                                        }`}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Stats Summary */}
                    <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'} space-y-6`}>
                        <div className="flex items-center gap-3">
                            <Zap size={18} className="text-orange-500" />
                            <h4 className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Today's Load</h4>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold opacity-60 uppercase tracking-tighter">Total Tasks</span>
                                <span className="font-black">04</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold opacity-60 uppercase tracking-tighter">Hours Planned</span>
                                <span className="font-black text-indigo-500">7.5h</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold opacity-60 uppercase tracking-tighter">Focus Score</span>
                                <span className="font-black text-emerald-500">88%</span>
                            </div>
                        </div>
                        <div className={`h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}>
                            <div className="h-full bg-orange-500 w-[25%]" />
                        </div>
                        <p className="text-[9px] font-bold opacity-40 uppercase tracking-tight text-center">1 of 4 blocks completed</p>
                    </div>
                </div>

                {/* Right Column: Schedule / Tasks */}
                <div className="xl:col-span-3 space-y-6">
                    {/* View Controls */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <h3 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Today's Agenda</h3>
                                <div className="px-2 py-0.5 rounded-[5px] bg-orange-500/10 text-orange-500 text-[10px] font-black uppercase">Feb 14</div>
                            </div>
                        </div>

                        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-[5px]">
                            <button
                                onClick={() => setView('Weekly')}
                                className={`p-2 rounded-[5px] transition-all ${view === 'Weekly' ? 'bg-white dark:bg-white/10 shadow-sm text-orange-500' : 'opacity-40'}`}
                            >
                                <List size={18} />
                            </button>
                            <button
                                onClick={() => setView('Grid')}
                                className={`p-2 rounded-[5px] transition-all ${view === 'Grid' ? 'bg-white dark:bg-white/10 shadow-sm text-orange-500' : 'opacity-40'}`}
                            >
                                <LayoutGrid size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Task List */}
                    <div className="space-y-4">
                        {tasks.map((task, i) => (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                key={task.id}
                                className={`group p-6 rounded-[5px] border transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6 ${task.completed
                                        ? (isDarkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100')
                                        : (isDarkMode ? 'bg-[#10141D] border-white/5 hover:border-indigo-500/30' : 'bg-white border-slate-100 shadow-sm hover:border-indigo-200 shadow-slate-200/50')
                                    }`}
                            >
                                <div className="flex items-center gap-6">
                                    <button
                                        onClick={() => toggleTask(task.id)}
                                        className={`shrink-0 w-8 h-8 rounded-[5px] flex items-center justify-center transition-all ${task.completed ? 'bg-emerald-500 text-white' : 'border-2 border-slate-300 dark:border-white/10 hover:border-orange-500 text-transparent'
                                            }`}
                                    >
                                        <CheckCircle2 size={20} strokeWidth={3} />
                                    </button>

                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-[5px] ${task.subject === 'Maths' ? 'bg-blue-500/10 text-blue-500' :
                                                    task.subject === 'Physics' ? 'bg-purple-500/10 text-purple-600' :
                                                        task.subject === 'Chemistry' ? 'bg-orange-500/10 text-orange-500' :
                                                            'bg-slate-500/10 text-slate-500'
                                                }`}>
                                                {task.subject}
                                            </span>
                                            {task.priority === 'High' && !task.completed && (
                                                <div className="flex items-center gap-1 text-[9px] font-bold text-red-500 uppercase">
                                                    <AlertCircle size={10} strokeWidth={3} /> Priority
                                                </div>
                                            )}
                                        </div>
                                        <h4 className={`text-base font-black uppercase tracking-tight ${task.completed ? 'line-through opacity-40' : (isDarkMode ? 'text-white' : 'text-slate-900')}`}>
                                            {task.topic}
                                        </h4>
                                        <div className="flex items-center gap-4 opacity-40">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight">
                                                <Clock size={12} /> {task.time}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight text-indigo-500">
                                                <Zap size={12} /> {task.duration}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 ml-14 md:ml-0">
                                    {!task.completed && (
                                        <button className={`px-4 py-2 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100'}`}>
                                            Start Session
                                        </button>
                                    )}
                                    <button className="p-2 opacity-20 hover:opacity-100 transition-opacity">
                                        <MoreVertical size={20} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* AI Motivation Card */}
                    <div className={`p-8 rounded-[5px] border overflow-hidden relative ${isDarkMode ? 'bg-indigo-900/20 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100 shadow-sm'}`}>
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                            <div className="w-16 h-16 shrink-0 rounded-[5px] bg-gradient-to-br from-orange-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-orange-500/20">
                                <Star size={32} strokeWidth={2.5} />
                            </div>
                            <div className="space-y-2">
                                <h5 className={`text-lg font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>AI Smart Suggestions</h5>
                                <p className={`text-sm font-medium leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    You've identified <span className="text-orange-500 font-extrabold underline tracking-tighter uppercase">Calculus</span> as your strength. I suggest adding a 30 min 'Advanced Practice' block tonight to maintain your 92% retention rate.
                                </p>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 p-4 opacity-[0.05] grayscale brightness-0">
                            <GraduationCap size={160} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudyPlanner;
