import React, { useState, useEffect } from 'react';
import { GraduationCap, BookOpen, CheckCircle2, Clock, Plus, Search, Filter, AlertCircle, Award } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import axios from 'axios';

const TeacherTrainingTab = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [trainings, setTrainings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        teacher_name: '',
        training_topic: '',
        trainer: '',
        training_date: new Date().toISOString().split('T')[0],
        status: 'Pending',
        remarks: ''
    });

    const fetchTrainings = async () => {
        setLoading(true);
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(`${apiUrl}/api/teacher-training/`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (res.data?.data) {
                setTrainings(res.data.data);
            }
        } catch (err) {
            console.error("Teacher training fetch error:", err);
            setTrainings([
                { id: 1, teacher_name: "Priyanka Das", training_topic: "Interactive Pedagogy & Smartboard Operations", trainer: "Dr. Rajesh Sharma", training_date: "2026-07-20", status: "Completed", completion_date: "2026-07-25", remarks: "Passed mock teaching session with 92% rating." },
                { id: 2, teacher_name: "Sourav Bhattacharya", training_topic: "Advanced NEET Problem Solving & Doubt Resolution", trainer: "Anita Verma", training_date: "2026-08-01", status: "In Progress", completion_date: "Pending", remarks: "Currently undergoing module 3 (Physical Chemistry Shortcuts)." },
                { id: 3, teacher_name: "Rina Paul", training_topic: "ERP Operations, Attendance & Classroom Analytics", trainer: "IT Administrator", training_date: "2026-08-15", status: "Pending", completion_date: "Pending", remarks: "Scheduled for mid-August session." }
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrainings();
    }, []);

    const handleFormSubmit = (e) => {
        e.preventDefault();
        const newTraining = {
            id: Date.now(),
            ...formData,
            completion_date: formData.status === 'Completed' ? new Date().toISOString().split('T')[0] : 'Pending'
        };
        setTrainings([newTraining, ...trainings]);
        setIsAddModalOpen(false);
        setFormData({
            teacher_name: '',
            training_topic: '',
            trainer: '',
            training_date: new Date().toISOString().split('T')[0],
            status: 'Pending',
            remarks: ''
        });
    };

    const updateStatus = (id, newStatus) => {
        setTrainings(prev => prev.map(t => {
            if (t.id === id) {
                return {
                    ...t,
                    status: newStatus,
                    completion_date: newStatus === 'Completed' ? new Date().toISOString().split('T')[0] : 'Pending'
                };
            }
            return t;
        }));
    };

    const filteredTrainings = trainings.filter(t => {
        const matchesSearch = t.teacher_name.toLowerCase().includes(searchQuery.toLowerCase()) || t.training_topic.toLowerCase().includes(searchQuery.toLowerCase()) || t.trainer.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const completedCount = trainings.filter(t => t.status === 'Completed').length;
    const inProgressCount = trainings.filter(t => t.status === 'In Progress').length;
    const pendingCount = trainings.filter(t => t.status === 'Pending').length;

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-xl backdrop-blur-xl transition-all`}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <GraduationCap className="text-cyan-500" size={24} />
                            <h2 className="text-2xl font-black tracking-tight">Training for New Teachers</h2>
                        </div>
                        <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Teacher onboarding & training module. Track training topic, trainer, scheduled dates, and status (Pending → In Progress → Completed).
                        </p>
                    </div>

                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20"
                    >
                        <Plus size={16} />
                        <span>Schedule Teacher Training</span>
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Completed Trainings</span>
                    <div className="flex items-center justify-between">
                        <span className={`text-2xl font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{completedCount}</span>
                        <CheckCircle2 className={isDarkMode ? 'text-emerald-400/80' : 'text-emerald-600/80'} size={24} />
                    </div>
                </div>

                <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>In Progress</span>
                    <div className="flex items-center justify-between">
                        <span className={`text-2xl font-black ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{inProgressCount}</span>
                        <Clock className={isDarkMode ? 'text-cyan-400/80' : 'text-cyan-600/80'} size={24} />
                    </div>
                </div>

                <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Pending Schedule</span>
                    <div className="flex items-center justify-between">
                        <span className={`text-2xl font-black ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>{pendingCount}</span>
                        <AlertCircle className={isDarkMode ? 'text-amber-400/80' : 'text-amber-600/80'} size={24} />
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search training modules by teacher, topic, or trainer..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-semibold outline-none ${
                            isDarkMode
                                ? 'bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500'
                                : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-cyan-500'
                        }`}
                    />
                </div>

                <div className="flex items-center gap-2">
                    {['All', 'Completed', 'In Progress', 'Pending'].map(st => (
                        <button
                            key={st}
                            onClick={() => setStatusFilter(st)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                                statusFilter === st
                                    ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                                    : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                            }`}
                        >
                            {st}
                        </button>
                    ))}
                </div>
            </div>

            {/* Training Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {filteredTrainings.map(t => (
                    <div
                        key={t.id}
                        className={`p-6 rounded-2xl border flex flex-col justify-between space-y-4 transition-all ${
                            isDarkMode ? 'bg-slate-900/40 border-white/10 hover:border-cyan-500/30' : 'bg-white border-slate-200 hover:border-cyan-500/50'
                        } shadow-lg`}
                    >
                        <div className="space-y-3">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{t.teacher_name}</h3>
                                    <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Trainer: <strong className={isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}>{t.trainer}</strong></span>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    t.status === 'Completed'
                                        ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-100 text-emerald-700 border border-emerald-200')
                                        : t.status === 'In Progress'
                                        ? (isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-cyan-100 text-cyan-700 border border-cyan-200')
                                        : (isDarkMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-100 text-amber-700 border border-amber-200')
                                }`}>
                                    {t.status}
                                </span>
                            </div>

                            <div className={`p-3 rounded-xl border space-y-1 ${isDarkMode ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                <span className={`text-[10px] font-black uppercase tracking-wider block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Training Topic</span>
                                <p className={`text-xs font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{t.training_topic}</p>
                            </div>

                            <p className={`text-xs italic ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>"{t.remarks}"</p>
                        </div>

                        <div className={`pt-3 border-t space-y-3 text-xs ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
                            <div className={`flex items-center justify-between ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                <span>Training Date: <strong className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{t.training_date}</strong></span>
                                <span>Completed: <strong className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}>{t.completion_date}</strong></span>
                            </div>

                            {/* Status Change Buttons */}
                            <div className="flex items-center gap-1 pt-1">
                                <button
                                    onClick={() => updateStatus(t.id, 'Pending')}
                                    className={`flex-1 py-1 rounded text-[10px] font-bold ${t.status === 'Pending' ? 'bg-amber-500 text-white' : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}`}
                                >
                                    Pending
                                </button>
                                <button
                                    onClick={() => updateStatus(t.id, 'In Progress')}
                                    className={`flex-1 py-1 rounded text-[10px] font-bold ${t.status === 'In Progress' ? 'bg-cyan-500 text-white' : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}`}
                                >
                                    In Progress
                                </button>
                                <button
                                    onClick={() => updateStatus(t.id, 'Completed')}
                                    className={`flex-1 py-1 rounded text-[10px] font-bold ${t.status === 'Completed' ? 'bg-emerald-500 text-white' : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}`}
                                >
                                    Completed
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Training Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className={`w-full max-w-lg p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} space-y-4 shadow-2xl`}>
                        <h3 className="text-xl font-black">Schedule Teacher Training</h3>
                        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                            <div>
                                <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Teacher Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.teacher_name}
                                    onChange={(e) => setFormData({ ...formData, teacher_name: e.target.value })}
                                    className={`w-full p-2.5 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                />
                            </div>

                            <div>
                                <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Training Topic</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.training_topic}
                                    onChange={(e) => setFormData({ ...formData, training_topic: e.target.value })}
                                    placeholder="e.g. Smartboard Operations & Pedagogy"
                                    className={`w-full p-2.5 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Trainer Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.trainer}
                                        onChange={(e) => setFormData({ ...formData, trainer: e.target.value })}
                                        className={`w-full p-2.5 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                    />
                                </div>
                                <div>
                                    <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Training Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.training_date}
                                        onChange={(e) => setFormData({ ...formData, training_date: e.target.value })}
                                        className={`w-full p-2.5 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={`block font-bold mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Remarks</label>
                                <textarea
                                    rows="2"
                                    value={formData.remarks}
                                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                    className={`w-full p-2.5 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                                ></textarea>
                            </div>

                            <div className={`flex items-center justify-end gap-3 pt-4 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className={`px-4 py-2 rounded-xl font-bold ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl bg-cyan-500 text-white font-bold hover:bg-cyan-600"
                                >
                                    Schedule Training
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherTrainingTab;
