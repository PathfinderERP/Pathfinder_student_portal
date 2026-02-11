import React, { useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon, Clock, CheckCircle2, Circle,
    Plus, ChevronLeft, ChevronRight, Filter,
    LayoutGrid, List, MoreVertical, Star,
    Zap, AlertCircle, BookOpen, GraduationCap, X,
    Edit2, Timer, Play, Pause, Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';

// Timer Component
const SessionTimer = ({ task, onClose, isDarkMode }) => {
    const [seconds, setSeconds] = useState(0);
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        let interval = null;
        if (isActive) {
            interval = setInterval(() => {
                setSeconds(seconds => seconds + 1);
            }, 1000);
        } else if (!isActive && seconds !== 0) {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isActive, seconds]);

    const formatTime = (totalSeconds) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={onClose}
            />
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`relative w-full max-w-md p-10 rounded-2xl border shadow-2xl flex flex-col items-center text-center space-y-8 ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-100'}`}
            >
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-black uppercase tracking-widest mb-4">
                        <Zap size={12} /> Focus Session
                    </div>
                    <h3 className={`text-2xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {task.topic}
                    </h3>
                    <p className={`text-sm font-medium mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {task.subject} • {task.duration} Target
                    </p>
                </div>

                <div className={`text-6xl font-black tracking-tighter tabular-nums ${isActive ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {formatTime(seconds)}
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsActive(!isActive)}
                        className={`p-4 rounded-full transition-all ${isActive
                            ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                            : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:scale-105'}`}
                    >
                        {isActive ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                    </button>
                    <button
                        onClick={onClose}
                        className="p-4 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
                    >
                        <Square size={24} fill="currentColor" />
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const StudyPlanner = ({ isDarkMode }) => {
    const { getApiUrl, token } = useAuth();
    const [view, setView] = useState('Weekly');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [activeSessionTask, setActiveSessionTask] = useState(null);
    const [editingTask, setEditingTask] = useState(null);

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const initialFormState = {
        topic: '',
        subject: 'Maths',
        date: selectedDate,
        time: '10:00',
        duration: '1h',
        priority: 'Medium'
    };

    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        if (!editingTask) {
            setFormData(prev => ({ ...prev, date: selectedDate }));
        }
    }, [selectedDate, editingTask]);

    const fetchTasks = async () => {
        try {
            const apiUrl = getApiUrl();
            const response = await axios.get(`${apiUrl}/api/study-tasks/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setTasks(response.data);
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const handleCreateOrUpdate = async (e) => {
        e.preventDefault();
        try {
            const apiUrl = getApiUrl();
            if (editingTask) {
                await axios.patch(`${apiUrl}/api/study-tasks/${editingTask.id}/`, formData, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } else {
                await axios.post(`${apiUrl}/api/study-tasks/`, formData, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
            setIsCreateModalOpen(false);
            setEditingTask(null);
            setFormData(initialFormState);
            fetchTasks();
        } catch (error) {
            console.error('Failed to save task:', error);
            alert('Failed to save task');
        }
    };

    const openEditModal = (task) => {
        setEditingTask(task);
        setFormData({
            topic: task.topic,
            subject: task.subject,
            date: task.date,
            time: task.time, // Ensure this matches "HH:MM:SS" or "HH:MM" format
            duration: task.duration,
            priority: task.priority
        });
        setIsCreateModalOpen(true);
    };

    const toggleTask = async (id, currentStatus) => {
        try {
            const apiUrl = getApiUrl();
            await axios.patch(`${apiUrl}/api/study-tasks/${id}/`, {
                completed: !currentStatus
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchTasks();
        } catch (error) {
            console.error('Failed to toggle task:', error);
        }
    };

    const deleteTask = async (id) => {
        if (!window.confirm('Are you sure you want to delete this task?')) return;
        try {
            const apiUrl = getApiUrl();
            await axios.delete(`${apiUrl}/api/study-tasks/${id}/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchTasks();
        } catch (error) {
            console.error('Failed to delete task:', error);
        }
    };

    const startSession = (task) => {
        // Parse dates
        const now = new Date();
        const taskDate = new Date(task.date);
        const [hours, minutes] = task.time.split(':');
        taskDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        // Allow start if within 10 minutes before
        const timeDiff = (taskDate - now) / 1000 / 60; // difference in minutes

        if (timeDiff > 10) {
            alert(`Session cannot be started yet. Please wait until ${task.time}.`);
            return;
        }

        setActiveSessionTask(task);
    };

    // Calendar Helper Functions
    const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

    const monthDays = [];
    const daysCount = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);

    for (let i = 0; i < firstDay; i++) {
        monthDays.push(null);
    }
    for (let i = 1; i <= daysCount; i++) {
        monthDays.push(i);
    }

    const prevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(prev => prev - 1);
        } else {
            setCurrentMonth(prev => prev - 1);
        }
    };

    const nextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(prev => prev + 1);
        } else {
            setCurrentMonth(prev => prev + 1);
        }
    };

    const completedTasks = tasks.filter(t => t.completed).length;
    const totalTasks = tasks.length;
    const progressWidth = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Calculate today's stats specifically
    const todTasks = tasks.filter(t => t.date === selectedDate);
    const todTotal = todTasks.length;
    const todCompleted = todTasks.filter(t => t.completed).length;
    const todProgress = todTotal > 0 ? (todCompleted / todTotal) * 100 : 0;

    return (
        <div className="space-y-8 animate-fade-in-up pb-10">
            {/* Session Timer Overlay */}
            <AnimatePresence>
                {activeSessionTask && (
                    <SessionTimer
                        task={activeSessionTask}
                        onClose={() => setActiveSessionTask(null)}
                        isDarkMode={isDarkMode}
                    />
                )}
            </AnimatePresence>

            {/* Planner Header */}
            <div className={`p-8 rounded-[5px] border relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="px-3 py-1 rounded-[5px] bg-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase tracking-[0.2em]">
                                Time Management
                            </div>
                        </div>
                        <h2 className={`text-3xl font-black uppercase tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            Study Planner
                        </h2>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Organize your learning schedule, track assignments, and optimize your study windows.
                        </p>
                    </div>

                    <button
                        onClick={() => {
                            setEditingTask(null);
                            setFormData(initialFormState);
                            setIsCreateModalOpen(true);
                        }}
                        className="px-6 py-4 bg-gradient-to-r from-orange-500 to-indigo-600 text-white rounded-[5px] font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-2 group">
                        <Plus size={18} strokeWidth={3} className="group-hover:rotate-90 transition-all duration-300" />
                        <span>Create Schedule</span>
                    </button>
                </div>

                <CalendarIcon size={200} className="absolute -right-10 -bottom-10 opacity-[0.03] rotate-12" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                {/* Left Column: Calendar & Filters */}
                <div className="xl:col-span-1 space-y-8">
                    {/* Functional Calendar */}
                    <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                        <div className="flex items-center justify-between mb-6">
                            <h4 className={`text-sm font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {monthNames[currentMonth]} {currentYear}
                            </h4>
                            <div className="flex gap-2">
                                <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-[5px] transition-colors"><ChevronLeft size={16} /></button>
                                <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-[5px] transition-colors"><ChevronRight size={16} /></button>
                            </div>
                        </div>
                        <div className="grid grid-cols-7 gap-2 text-center mb-4">
                            {weekDays.map(d => <span key={d} className="text-[10px] font-black opacity-30 uppercase">{d[0]}</span>)}
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                            {monthDays.map((d, idx) => {
                                if (d === null) return <div key={`empty-${idx}`} />;
                                const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                                const isSelected = selectedDate === dateStr;
                                const isToday = new Date().toISOString().split('T')[0] === dateStr;
                                const hasTask = tasks.some(t => t.date === dateStr);

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedDate(dateStr)}
                                        className={`aspect-square rounded-[5px] text-xs font-bold flex flex-col items-center justify-center transition-all relative ${isSelected
                                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                            : isToday
                                                ? 'bg-indigo-500/10 text-indigo-500'
                                                : 'hover:bg-slate-100 dark:hover:bg-white/5 opacity-60'
                                            }`}
                                    >
                                        {d}
                                        {hasTask && !isSelected && (
                                            <div className="absolute bottom-1 w-1 h-1 rounded-full bg-orange-500" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Stats Summary */}
                    <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'} space-y-6`}>
                        <div className="flex items-center gap-3">
                            <Zap size={18} className="text-orange-500" />
                            <h4 className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Load Analysis</h4>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold opacity-60 uppercase tracking-tighter">Tasks for Date</span>
                                <span className="font-black">{todTotal.toString().padStart(2, '0')}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold opacity-60 uppercase tracking-tighter">Completion</span>
                                <span className="font-black text-indigo-500">{todProgress.toFixed(0)}%</span>
                            </div>
                        </div>
                        <div className={`h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}>
                            <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${todProgress}%` }} />
                        </div>
                        <p className="text-[9px] font-bold opacity-40 uppercase tracking-tight text-center">{todCompleted} of {todTotal} blocks completed</p>
                    </div>
                </div>

                {/* Right Column: Schedule / Tasks */}
                <div className="xl:col-span-3 space-y-6">
                    {/* View Controls */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <h3 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {selectedDate === new Date().toISOString().split('T')[0] ? "Today's Agenda" : "Planned Agenda"}
                                </h3>
                                <div className="px-2 py-0.5 rounded-[5px] bg-orange-500/10 text-orange-500 text-[10px] font-black uppercase">
                                    {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </div>
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
                    <div className="space-y-4 min-h-[400px]">
                        {tasks.filter(t => t.date === selectedDate).length > 0 ? (
                            tasks.filter(t => t.date === selectedDate).map((task, i) => (
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
                                            onClick={() => toggleTask(task.id, task.completed)}
                                            className={`shrink-0 w-8 h-8 rounded-[5px] flex items-center justify-center transition-all ${task.completed ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'border-2 border-slate-300 dark:border-white/10 hover:border-orange-500 text-transparent'
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
                                            <div className="flex items-center gap-4 opacity-40 font-bold uppercase text-[10px]">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock size={12} /> {task.time}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-indigo-500">
                                                    <Zap size={12} /> {task.duration}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 ml-14 md:ml-0">
                                        {!task.completed && (
                                            <button
                                                onClick={() => startSession(task)}
                                                className={`px-4 py-2 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100'}`}
                                            >
                                                Start Session
                                            </button>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => openEditModal(task)}
                                                className="p-2 opacity-20 hover:opacity-100 hover:text-indigo-500 transition-all">
                                                <Edit2 size={20} />
                                            </button>
                                            <button
                                                onClick={() => deleteTask(task.id)}
                                                className="p-2 opacity-20 hover:opacity-100 hover:text-red-500 transition-all">
                                                <X size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className={`flex flex-col items-center justify-center p-20 border border-dashed rounded-[5px] ${isDarkMode ? 'border-white/5 opacity-20' : 'border-slate-200 opacity-40'}`}>
                                <CalendarIcon size={48} className="mb-4" />
                                <p className="font-black uppercase tracking-widest text-xs">No tasks for this day</p>
                            </div>
                        )}
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

            {/* Create/Edit Task Modal */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm shadow-[0_0_100px_rgba(30,41,59,0.5)]"
                            onClick={() => setIsCreateModalOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={`relative w-full max-w-lg p-8 rounded-[5px] border shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-100'}`}
                        >
                            <div className="flex items-center justify-between mb-8">
                                <h3 className={`text-2xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {editingTask ? 'Edit Schedule' : 'Create Schedule'}
                                </h3>
                                <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full opacity-50 hover:opacity-100 transition-all"><X size={20} /></button>
                            </div>

                            <form onSubmit={handleCreateOrUpdate} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase opacity-40">Topic / Task Name</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.topic}
                                        onChange={e => setFormData({ ...formData, topic: e.target.value })}
                                        className={`w-full p-4 rounded-[5px] border outline-none font-bold ${isDarkMode ? 'bg-white/5 border-white/5 text-white' : 'bg-slate-50 border-slate-100'}`}
                                        placeholder="e.g. Calculus Practice"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase opacity-40">Subject</label>
                                        <select
                                            value={formData.subject}
                                            onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                            className={`w-full p-4 rounded-[5px] border outline-none font-bold ${isDarkMode ? 'bg-slate-800 border-white/5 text-white' : 'bg-slate-50 border-slate-100'}`}
                                        >
                                            <option>Maths</option>
                                            <option>Physics</option>
                                            <option>Chemistry</option>
                                            <option>English</option>
                                            <option>Others</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase opacity-40">Priority</label>
                                        <select
                                            value={formData.priority}
                                            onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                            className={`w-full p-4 rounded-[5px] border outline-none font-bold ${isDarkMode ? 'bg-slate-800 border-white/5 text-white' : 'bg-slate-50 border-slate-100'}`}
                                        >
                                            <option>High</option>
                                            <option>Medium</option>
                                            <option>Low</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase opacity-40">Date</label>
                                        <input
                                            required
                                            type="date"
                                            value={formData.date}
                                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                                            className={`w-full p-4 rounded-[5px] border outline-none font-bold text-xs ${isDarkMode ? 'bg-white/5 border-white/5 text-white' : 'bg-slate-50 border-slate-100'}`}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase opacity-40">Time</label>
                                        <input
                                            required
                                            type="time"
                                            value={formData.time}
                                            onChange={e => setFormData({ ...formData, time: e.target.value })}
                                            className={`w-full p-4 rounded-[5px] border outline-none font-bold text-xs ${isDarkMode ? 'bg-white/5 border-white/5 text-white' : 'bg-slate-50 border-slate-100'}`}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase opacity-40">Duration</label>
                                        <input
                                            required
                                            type="text"
                                            value={formData.duration}
                                            onChange={e => setFormData({ ...formData, duration: e.target.value })}
                                            className={`w-full p-4 rounded-[5px] border outline-none font-bold text-xs ${isDarkMode ? 'bg-white/5 border-white/5 text-white' : 'bg-slate-50 border-slate-100'}`}
                                            placeholder="e.g. 2h"
                                        />
                                    </div>
                                </div>
                                <div className="pt-8 flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateModalOpen(false)}
                                        className={`flex-1 py-4 rounded-[5px] font-black text-xs uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'} transition-all`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-4 bg-orange-500 text-white rounded-[5px] font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-500/20 active:scale-95 hover:bg-orange-600 transition-all"
                                    >
                                        {editingTask ? 'Update Task' : 'Save Task'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StudyPlanner;
