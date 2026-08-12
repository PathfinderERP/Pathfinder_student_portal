import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, Clock, LogIn, LogOut, MessageSquare, ChevronRight, BookOpen, AlertTriangle, Star, Search, RefreshCw, Users, Layers, Tag } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';

const FEEDBACK_QUESTIONS = [
    "Explains concepts clearly and uses real-world examples to improve understanding.",
    "Maintains excellent classroom discipline and encourages student participation.",
    "Always well-prepared and delivers structured, easy-to-follow lessons.",
    "Provides timely feedback and supports students beyond classroom hours.",
    "Demonstrates strong subject knowledge and effective teaching methodologies.",
    "Creates a positive learning environment that motivates students to perform better.",
    "Uses interactive teaching methods and digital tools effectively.",
    "Regularly tracks student progress and addresses learning gaps proactively.",
    "Encourages critical thinking and problem-solving skills among students.",
    "Is approachable and willing to clarify doubts outside of regular class time."
];

const formatTimeDisplay = (timeVal) => {
    if (!timeVal || timeVal === '--:--') return null;
    let str = String(timeVal).trim();
    if (!str || str === '--:--') return null;

    if (str.includes(',')) {
        str = str.split(',')[1]?.trim() || str;
    }
    if (str.includes('T')) {
        try {
            const d = new Date(str);
            if (!isNaN(d.getTime())) {
                return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            }
        } catch (e) {}
    }
    return str;
};

const getMinuteFromMidnight = (timeStr) => {
    if (!timeStr || timeStr === '--:--') return null;
    let str = String(timeStr).trim();
    if (!str || str === '--:--') return null;

    if (str.includes(',')) {
        str = str.split(',')[1]?.trim() || str;
    }

    if (str.includes('T')) {
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
            return d.getHours() * 60 + d.getMinutes();
        }
    }

    const match12 = str.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)/i);
    if (match12) {
        let hrs = parseInt(match12[1], 10);
        const mins = parseInt(match12[2], 10);
        const ampm = match12[3].toUpperCase();
        if (ampm === 'PM' && hrs < 12) hrs += 12;
        if (ampm === 'AM' && hrs === 12) hrs = 0;
        return hrs * 60 + mins;
    }

    const match24 = str.match(/^(\d{1,2}):(\d{2})/);
    if (match24) {
        const hrs = parseInt(match24[1], 10);
        const mins = parseInt(match24[2], 10);
        return hrs * 60 + mins;
    }

    return null;
};

const calculatePunctuality = (entryTimeStr, startTimeStr) => {
    const entryMin = getMinuteFromMidnight(entryTimeStr);
    const startMin = getMinuteFromMidnight(startTimeStr);

    if (entryMin === null || startMin === null) return null;

    const diff = entryMin - startMin; // positive = late, negative = early

    if (diff > 1) {
        return { label: `${Math.round(diff)}m Late`, status: 'late' };
    } else if (diff < -1) {
        return { label: `${Math.round(Math.abs(diff))}m Early`, status: 'early' };
    } else {
        return { label: 'On Time', status: 'ontime' };
    }
};

const TeacherClasses = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    
    // Main UI State
    const [activeTab, setActiveTab] = useState('upcoming');
    const [assignmentSearch, setAssignmentSearch] = useState('');
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    
    // Data State
    const [upcomingClasses, setUpcomingClasses] = useState([]);
    const [previousClasses, setPreviousClasses] = useState([]);
    const [feedbacks, setFeedbacks] = useState([]);
    
    // Status State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters for Detail View
    const [studentSearch, setStudentSearch] = useState('');
    const [studentBatchFilter, setStudentBatchFilter] = useState('All');
    const [studentCenterFilter, setStudentCenterFilter] = useState('All');
    const [studentExamTagFilter, setStudentExamTagFilter] = useState('All');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const tokenVal = token || localStorage.getItem('auth_token');
            const apiUrl = getApiUrl();
            
            const [classesRes, feedbacksRes] = await Promise.all([
                fetch(`${apiUrl}/api/teacher-portal/classes/`, {
                    headers: { 'Authorization': `Bearer ${tokenVal}` }
                }),
                axios.get(`${apiUrl}/api/class-feedback/`, {
                    headers: { 'Authorization': `Bearer ${tokenVal}` }
                })
            ]);

            if (!classesRes.ok) {
                throw new Error('Failed to fetch classes');
            }

            const classesData = await classesRes.json();
            const feedbacksData = feedbacksRes.data;

            setUpcomingClasses(classesData.upcoming || []);
            setFeedbacks(feedbacksData || []);
            
            // Merge feedbacks into previous classes to ensure no feedback is orphaned
            let prev = classesData.previous || [];
            const prevKeys = new Set(prev.map(c => `${c.subject}-${new Date(c.date).toLocaleDateString()}`));

            // Group feedbacks by subject+date so we can collect real batch names
            const feedbacksByKey = {};
            feedbacksData.forEach(f => {
                const dateStr = f.date_of_class ? new Date(f.date_of_class).toLocaleDateString() : 'Unknown Date';
                const key = `${f.subject}-${dateStr}`;
                if (!feedbacksByKey[key]) feedbacksByKey[key] = [];
                feedbacksByKey[key].push(f);
            });
            
            feedbacksData.forEach(f => {
                const dateStr = f.date_of_class ? new Date(f.date_of_class).toLocaleDateString() : 'Unknown Date';
                const key = `${f.subject}-${dateStr}`;
                if (!prevKeys.has(key)) {
                    // Collect unique real batch names from feedback student_batch values
                    const batchesForClass = [
                        ...new Set(
                            (feedbacksByKey[key] || [])
                                .map(fb => fb.student_batch)
                                .filter(Boolean)
                        )
                    ];
                    const batchLabel = batchesForClass.length > 0
                        ? batchesForClass.join(', ')
                        : 'Unknown';

                    // Class doesn't exist in ERP data, add it synthetically
                    prev.push({
                        id: `synthetic-${key}`,
                        subject: f.subject,
                        date: f.date_of_class,
                        batch: batchLabel,
                        _batches: batchesForClass,   // keep array for Assignment Map
                        entryTime: f.entry_time || f.start_time || '--:--',
                        exitTime: f.exit_time || f.end_time || '--:--',
                        synthetic: true
                    });
                    prevKeys.add(key);
                }
            });
            
            // Sort by date descending
            prev.sort((a, b) => new Date(b.date) - new Date(a.date));
            setPreviousClasses(prev);

        } catch (err) {
            console.error("Error fetching teacher data:", err);
            setError(err.message || "Failed to load classes and feedback.");
        } finally {
            setLoading(false);
        }
    }, [token, getApiUrl]);

    useEffect(() => {
        if (token || localStorage.getItem('auth_token')) {
            fetchData();
        }
    }, [token, fetchData]);

    // Group feedbacks by subject-date
    const groupedFeedbacks = useMemo(() => {
        const groups = {};
        feedbacks.forEach(f => {
            const dateStr = f.date_of_class ? new Date(f.date_of_class).toLocaleDateString() : 'Unknown Date';
            const key = `${f.subject}-${dateStr}`;
            if (!groups[key]) {
                groups[key] = {
                    id: key,
                    subject: f.subject,
                    date_of_class: f.date_of_class,
                    feedbacks: [],
                    average_score: 0,
                    entry_time: f.entry_time || f.start_time || null,
                    exit_time: f.exit_time || f.end_time || null
                };
            }
            if (!groups[key].entry_time && (f.entry_time || f.start_time)) {
                groups[key].entry_time = f.entry_time || f.start_time;
            }
            if (!groups[key].exit_time && (f.exit_time || f.end_time)) {
                groups[key].exit_time = f.exit_time || f.end_time;
            }
            groups[key].feedbacks.push(f);
        });

        Object.values(groups).forEach(group => {
            const totalScore = group.feedbacks.reduce((sum, fb) => sum + fb.average_score, 0);
            group.average_score = totalScore / group.feedbacks.length;
        });
        
        return groups;
    }, [feedbacks]);

    // Detail View Derived State
    const filteredStudentFeedbacks = useMemo(() => {
        if (!selectedFeedback) return [];
        return selectedFeedback.feedbacks.filter(fb => {
            const matchSearch = (fb.student_name || fb.student_username || '').toLowerCase().includes(studentSearch.toLowerCase());
            const matchBatch = studentBatchFilter === 'All' || fb.student_batch === studentBatchFilter;
            const matchCenter = studentCenterFilter === 'All' || fb.student_center === studentCenterFilter;
            const matchExamTag = studentExamTagFilter === 'All' || fb.student_exam_tag === studentExamTagFilter;
            return matchSearch && matchBatch && matchCenter && matchExamTag;
        });
    }, [selectedFeedback, studentSearch, studentBatchFilter, studentCenterFilter, studentExamTagFilter]);

    const studentBatches = useMemo(() => {
        if (!selectedFeedback) return ['All'];
        return ['All', ...new Set(selectedFeedback.feedbacks.map(fb => fb.student_batch).filter(Boolean))];
    }, [selectedFeedback]);

    const studentCenters = useMemo(() => {
        if (!selectedFeedback) return ['All'];
        return ['All', ...new Set(selectedFeedback.feedbacks.map(fb => fb.student_center).filter(Boolean))];
    }, [selectedFeedback]);

    const studentExamTags = useMemo(() => {
        if (!selectedFeedback) return ['All'];
        return ['All', ...new Set(selectedFeedback.feedbacks.map(fb => fb.student_exam_tag).filter(Boolean))];
    }, [selectedFeedback]);

    if (loading) {
        return (
            <div className={`w-full h-64 flex flex-col items-center justify-center rounded-xl border ${isDarkMode ? 'bg-[#10141d]/80 border-gray-800' : 'bg-white border-slate-200'}`}>
                <div className={`w-12 h-12 border-4 rounded-full animate-spin mb-4 ${isDarkMode ? 'border-cyan-500/20 border-t-cyan-500' : 'border-cyan-200 border-t-cyan-600'}`}></div>
                <p className={`text-sm font-bold uppercase tracking-wider animate-pulse ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Loading Schedule...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`w-full h-64 flex flex-col items-center justify-center rounded-xl border p-6 text-center ${isDarkMode ? 'bg-[#10141d]/80 border-rose-900/50' : 'bg-rose-50 border-rose-200'}`}>
                <AlertTriangle size={48} className="text-rose-500 mb-4" />
                <h3 className={`text-lg font-black ${isDarkMode ? 'text-rose-400' : 'text-rose-700'}`}>Connection Error</h3>
                <p className={`text-sm mt-2 max-w-md ${isDarkMode ? 'text-rose-500/80' : 'text-rose-600/80'}`}>{error}</p>
            </div>
        );
    }

    // DETAIL VIEW: Feedback breakdown for a selected class
    if (selectedFeedback) {
        return (
            <div className="w-full space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <button 
                    onClick={() => setSelectedFeedback(null)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold tracking-widest transition-colors w-fit ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                >
                    <ChevronRight size={16} className="rotate-180" />
                    Back to Sessions
                </button>
                
                <div className={`w-full overflow-hidden flex flex-col rounded-2xl shadow-xl ${isDarkMode ? 'bg-[#1e293b] border border-gray-700' : 'bg-white border border-gray-200'}`}>
                    <div className={`p-6 border-b flex justify-between items-start ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedFeedback.subject}</h2>
                                <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs">
                                    <Star size={12} fill="currentColor" />
                                    <span className="font-bold">{selectedFeedback.average_score.toFixed(1)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={`p-6 border-b grid grid-cols-1 md:grid-cols-4 gap-4 ${isDarkMode ? 'border-gray-800 bg-[#10141D]/50' : 'border-gray-100 bg-gray-50'}`}>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search student..."
                                value={studentSearch}
                                onChange={(e) => setStudentSearch(e.target.value)}
                                className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'} focus:outline-none focus:ring-1 focus:ring-cyan-500`}
                            />
                        </div>
                        <select
                            value={studentBatchFilter}
                            onChange={(e) => setStudentBatchFilter(e.target.value)}
                            className={`w-full px-4 py-2 rounded-lg text-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'} focus:outline-none focus:ring-1 focus:ring-cyan-500`}
                        >
                            {studentBatches.map(b => <option key={b} value={b}>{b === 'All' ? 'All Batches' : b}</option>)}
                        </select>
                        <select
                            value={studentCenterFilter}
                            onChange={(e) => setStudentCenterFilter(e.target.value)}
                            className={`w-full px-4 py-2 rounded-lg text-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'} focus:outline-none focus:ring-1 focus:ring-cyan-500`}
                        >
                            {studentCenters.map(c => <option key={c} value={c}>{c === 'All' ? 'All Centers' : c}</option>)}
                        </select>
                        <select
                            value={studentExamTagFilter}
                            onChange={(e) => setStudentExamTagFilter(e.target.value)}
                            className={`w-full px-4 py-2 rounded-lg text-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'} focus:outline-none focus:ring-1 focus:ring-cyan-500`}
                        >
                            {studentExamTags.map(t => <option key={t} value={t}>{t === 'All' ? 'All Exam Tags' : t}</option>)}
                        </select>
                    </div>
                    
                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-12">
                        <div className="flex items-center gap-6 border-b pb-6 border-gray-200 dark:border-gray-800">
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-black uppercase tracking-widest opacity-50 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Date</span>
                                <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {new Date(selectedFeedback.date_of_class).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </span>
                            </div>
                            <div className="h-8 w-px bg-gray-200 dark:bg-gray-800"></div>
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-black uppercase tracking-widest opacity-50 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Responses</span>
                                <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {filteredStudentFeedbacks.length}
                                </span>
                            </div>
                        </div>
                        
                        {filteredStudentFeedbacks.length === 0 && (
                            <div className="py-12 text-center text-gray-500 border border-dashed rounded-lg">
                                No student responses match the current filters.
                            </div>
                        )}

                        {filteredStudentFeedbacks.map((studentFb, fbIdx) => (
                            <div key={studentFb.id || fbIdx} className="space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isDarkMode ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-600'}`}>
                                            {(studentFb.student_name || studentFb.student_username || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className={`text-[10px] font-black uppercase tracking-widest opacity-50 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Student</div>
                                            <div className={`text-sm font-bold flex items-center gap-2 flex-wrap ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                <span>{studentFb.student_name || studentFb.student_username}</span>
                                                {studentFb.student_batch && (
                                                    <span className={`text-[9px] px-2 py-0.5 rounded-md uppercase tracking-widest ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-100 text-cyan-600'}`}>
                                                        {studentFb.student_batch}
                                                    </span>
                                                )}
                                                {studentFb.student_center && (
                                                    <span className={`text-[9px] px-2 py-0.5 rounded-md uppercase tracking-widest ${isDarkMode ? 'bg-teal-500/10 text-teal-400' : 'bg-teal-100 text-teal-600'}`}>
                                                        {studentFb.student_center}
                                                    </span>
                                                )}
                                                {studentFb.student_exam_tag && (
                                                    <span className={`text-[9px] px-2 py-0.5 rounded-md uppercase tracking-widest ${isDarkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                                                        {studentFb.student_exam_tag}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-sm font-bold bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
                                        <Star size={14} fill="currentColor" />
                                        <span>{studentFb.average_score.toFixed(1)}</span>
                                    </div>
                                </div>
                                
                                <div className="space-y-3">
                                    {FEEDBACK_QUESTIONS.map((question, idx) => {
                                        const answer = studentFb.responses[idx];
                                        if (!answer) return null;
                                        
                                        return (
                                            <div key={idx} className={`p-4 rounded-xl border ${isDarkMode ? 'bg-[#1e293b] border-gray-800' : 'bg-gray-50 border-gray-100'} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
                                                <div className="flex-1 flex gap-3 items-start">
                                                    <span className={`text-sm font-black opacity-30 mt-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{(idx + 1).toString().padStart(2, '0')}</span>
                                                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{question}</p>
                                                </div>
                                                <div className={`px-4 py-1.5 rounded-full text-xs font-black border uppercase tracking-widest whitespace-nowrap
                                                    ${answer === 'EXCELLENT' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                                    answer === 'GOOD' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
                                                    answer === 'AVERAGE' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                                                    'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                                    {answer}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // MAIN VIEW: Classes List
    return (
        <div className="w-full animate-in fade-in duration-500 space-y-6">
            
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <h1 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Class Schedule</h1>
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Manage your upcoming sessions and review past classes.
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        loading 
                        ? 'opacity-50 cursor-not-allowed border ' + (isDarkMode ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400')
                        : isDarkMode ? 'bg-[#1e293b] hover:bg-cyan-500/10 text-cyan-400 border border-gray-700 hover:border-cyan-500/30' : 'bg-white hover:bg-cyan-50 text-cyan-600 border border-gray-200 hover:border-cyan-200 shadow-sm'
                    }`}
                    title="Refresh Schedule"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Custom Tabs */}
            <div className={`flex items-center gap-1 p-1 rounded-xl w-full max-w-[480px] ${isDarkMode ? 'bg-[#1e293b]' : 'bg-slate-100'}`}>
                <button
                    onClick={() => setActiveTab('upcoming')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                        activeTab === 'upcoming'
                            ? (isDarkMode ? 'bg-cyan-500/20 text-cyan-400 shadow-sm' : 'bg-white text-cyan-700 shadow-sm')
                            : (isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800')
                    }`}
                >
                    Upcoming
                </button>
                <button
                    onClick={() => setActiveTab('previous')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                        activeTab === 'previous'
                            ? (isDarkMode ? 'bg-cyan-500/20 text-cyan-400 shadow-sm' : 'bg-white text-cyan-700 shadow-sm')
                            : (isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800')
                    }`}
                >
                    Previous
                </button>
                <button
                    onClick={() => setActiveTab('assignments')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                        activeTab === 'assignments'
                            ? (isDarkMode ? 'bg-cyan-500/20 text-cyan-400 shadow-sm' : 'bg-white text-cyan-700 shadow-sm')
                            : (isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800')
                    }`}
                >
                    Class-Batch Map
                </button>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === 'assignments' ? (
                    <ClassBatchAssignments
                        upcomingClasses={upcomingClasses}
                        previousClasses={previousClasses}
                        isDarkMode={isDarkMode}
                        search={assignmentSearch}
                        onSearchChange={setAssignmentSearch}
                    />
                ) : activeTab === 'upcoming' ? (
                    upcomingClasses.length === 0 ? (
                        <div className={`p-8 text-center rounded-xl border ${isDarkMode ? 'bg-[#10141d]/50 border-gray-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                            No upcoming classes scheduled.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {upcomingClasses.map(cls => (
                                <div key={cls.id} className={`rounded-xl border p-5 transition-transform hover:-translate-y-1 duration-300 ${isDarkMode ? 'bg-[#10141d]/80 border-gray-800 hover:border-cyan-500/30' : 'bg-white border-slate-200 hover:border-cyan-200 hover:shadow-lg hover:shadow-cyan-500/5'}`}>
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                                            <BookOpen size={20} />
                                        </div>
                                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                            {cls.batch}
                                        </span>
                                    </div>
                                    <h3 className={`text-lg font-black mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{cls.subject}</h3>
                                    <div className="space-y-2 mt-4">
                                        <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                            <Calendar size={16} className={isDarkMode ? 'text-cyan-400' : 'text-cyan-600'} />
                                            <span>{new Date(cls.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                                        </div>
                                        <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                            <Clock size={16} className={isDarkMode ? 'text-cyan-400' : 'text-cyan-600'} />
                                            <span>{cls.startTime} - {cls.endTime}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    previousClasses.length === 0 ? (
                        <div className={`p-8 text-center rounded-xl border ${isDarkMode ? 'bg-[#10141d]/50 border-gray-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                            No previous classes recorded.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {previousClasses.map(cls => {
                                const dateStr = cls.date ? new Date(cls.date).toLocaleDateString() : 'Unknown Date';
                                const key = `${cls.subject}-${dateStr}`;
                                const classFeedback = groupedFeedbacks[key];

                                const rawEntry = (cls.entryTime && cls.entryTime !== '--:--') ? cls.entryTime :
                                                 (cls.entry_time && cls.entry_time !== '--:--') ? cls.entry_time :
                                                 (cls.actualStartTime && cls.actualStartTime !== '--:--') ? cls.actualStartTime :
                                                 (cls.in_time && cls.in_time !== '--:--') ? cls.in_time :
                                                 (cls.start_time && cls.start_time !== '--:--') ? cls.start_time :
                                                 (cls.entry && cls.entry !== '--:--') ? cls.entry :
                                                 classFeedback?.entry_time ||
                                                 classFeedback?.feedbacks?.find(f => f.entry_time || f.start_time)?.entry_time ||
                                                 classFeedback?.feedbacks?.find(f => f.entry_time || f.start_time)?.start_time;

                                const rawExit = (cls.exitTime && cls.exitTime !== '--:--') ? cls.exitTime :
                                                (cls.exit_time && cls.exit_time !== '--:--') ? cls.exit_time :
                                                (cls.actualEndTime && cls.actualEndTime !== '--:--') ? cls.actualEndTime :
                                                (cls.out_time && cls.out_time !== '--:--') ? cls.out_time :
                                                (cls.end_time && cls.end_time !== '--:--') ? cls.end_time :
                                                (cls.exit && cls.exit !== '--:--') ? cls.exit :
                                                classFeedback?.exit_time ||
                                                classFeedback?.feedbacks?.find(f => f.exit_time || f.end_time)?.exit_time ||
                                                classFeedback?.feedbacks?.find(f => f.exit_time || f.end_time)?.end_time;

                                const entryDisplay = formatTimeDisplay(rawEntry) || '--:--';
                                const exitDisplay = formatTimeDisplay(rawExit) || '--:--';

                                const rawStart = cls.startTime || cls.start_time || cls.scheduledStartTime || classFeedback?.start_time || classFeedback?.feedbacks?.find(f => f.start_time)?.start_time;
                                const rawEnd = cls.endTime || cls.end_time || cls.scheduledEndTime || classFeedback?.end_time || classFeedback?.feedbacks?.find(f => f.end_time)?.end_time;

                                let allottedDisplay = null;
                                const startFormatted = formatTimeDisplay(rawStart);
                                const endFormatted = formatTimeDisplay(rawEnd);

                                if (startFormatted && endFormatted) {
                                    allottedDisplay = `${startFormatted} - ${endFormatted}`;
                                } else if (startFormatted) {
                                    allottedDisplay = startFormatted;
                                } else if (cls.time || cls.classTime || cls.scheduled_time) {
                                    allottedDisplay = cls.time || cls.classTime || cls.scheduled_time;
                                }

                                const punctuality = calculatePunctuality(rawEntry, rawStart);

                                return (
                                <div key={cls.id || key} className={`rounded-xl border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${isDarkMode ? 'bg-[#10141d]/80 border-gray-800 hover:border-gray-700' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`hidden md:flex p-3 rounded-xl ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                                            <Calendar size={24} />
                                        </div>
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <h3 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{cls.subject}</h3>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                                    {cls.batch}
                                                </span>
                                                {punctuality && (
                                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                                        punctuality.status === 'late'
                                                            ? (isDarkMode ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-amber-100 text-amber-700 border border-amber-200')
                                                            : punctuality.status === 'early'
                                                                ? (isDarkMode ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-100 text-blue-700 border border-blue-200')
                                                                : (isDarkMode ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border border-emerald-200')
                                                    }`}>
                                                        {punctuality.label}
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`text-sm font-medium flex flex-wrap items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                <span>{new Date(cls.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                                {allottedDisplay && (
                                                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded ${isDarkMode ? 'bg-slate-800/80 text-cyan-400' : 'bg-cyan-50 text-cyan-700 border border-cyan-100'}`}>
                                                        <Clock size={12} />
                                                        Allotted: {allottedDisplay}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className={`flex gap-6 py-2 px-4 rounded-lg border ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                        <div className="flex flex-col">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Entry</span>
                                            <div className={`flex items-center gap-1.5 text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                                                <LogIn size={14} className="text-emerald-500" />
                                                {entryDisplay}
                                            </div>
                                        </div>
                                        <div className={`w-px ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                                        <div className="flex flex-col">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Exit</span>
                                            <div className={`flex items-center gap-1.5 text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                                                <LogOut size={14} className="text-rose-500" />
                                                {exitDisplay}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        {classFeedback ? (
                                            <div className="flex flex-col md:items-end gap-2">
                                                <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full text-xs">
                                                    <Star size={12} fill="currentColor" />
                                                    <span className="font-bold">{classFeedback.average_score.toFixed(1)} Average</span>
                                                </div>
                                                <button 
                                                    onClick={() => setSelectedFeedback(classFeedback)}
                                                    className={`w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                                                    isDarkMode 
                                                        ? 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20' 
                                                        : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'
                                                }`}>
                                                    <MessageSquare size={16} />
                                                    View Feedback ({classFeedback.feedbacks.length})
                                                    <ChevronRight size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button 
                                                disabled
                                                className={`w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                                                isDarkMode 
                                                    ? 'bg-slate-800 text-slate-500' 
                                                    : 'bg-slate-100 text-slate-400'
                                            }`}>
                                                <MessageSquare size={16} />
                                                No Feedback
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )})}
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

// ─── Class-Batch Assignment Component ─────────────────────────────────────────
const ClassBatchAssignments = ({ upcomingClasses, previousClasses, isDarkMode, search, onSearchChange }) => {
    // Build a map: subject → { batches: Set, schedule: [], totalClasses: number }
    const assignments = useMemo(() => {
        const map = {};

        const processClass = (cls, type) => {
            const subject = cls.subject || 'Unknown Subject';

            if (!map[subject]) {
                map[subject] = {
                    subject,
                    batches: new Set(),
                    upcoming: [],
                    previous: [],
                };
            }

            // Prefer the _batches array (from synthetic classes with real data),
            // otherwise split the batch string, but ignore the legacy "Multiple" placeholder.
            const batchArr = Array.isArray(cls._batches) && cls._batches.length > 0
                ? cls._batches
                : (cls.batch && cls.batch !== 'Multiple')
                    ? cls.batch.split(',').map(b => b.trim()).filter(Boolean)
                    : [];

            batchArr.forEach(b => map[subject].batches.add(b));

            if (type === 'upcoming') {
                map[subject].upcoming.push(cls);
            } else {
                map[subject].previous.push(cls);
            }
        };

        upcomingClasses.forEach(c => processClass(c, 'upcoming'));
        previousClasses.forEach(c => processClass(c, 'previous'));

        return Object.values(map).sort((a, b) => a.subject.localeCompare(b.subject));
    }, [upcomingClasses, previousClasses]);

    const filtered = useMemo(() =>
        assignments.filter(a =>
            a.subject.toLowerCase().includes(search.toLowerCase()) ||
            [...a.batches].some(b => b.toLowerCase().includes(search.toLowerCase()))
        ),
        [assignments, search]
    );

    const batchColors = [
        { bg: isDarkMode ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-700' },
        { bg: isDarkMode ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-700' },
        { bg: isDarkMode ? 'bg-violet-500/10 border-violet-500/20 text-violet-400' : 'bg-violet-50 border-violet-200 text-violet-700' },
        { bg: isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700' },
        { bg: isDarkMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700' },
        { bg: isDarkMode ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-700' },
    ];

    return (
        <div className="space-y-6">
            {/* Header + Search */}
            <div className={`rounded-2xl border p-5 flex flex-col md:flex-row md:items-center gap-4 ${
                isDarkMode ? 'bg-gradient-to-r from-cyan-500/10 to-indigo-500/5 border-cyan-500/20' : 'bg-gradient-to-r from-cyan-50 to-indigo-50 border-cyan-200'
            }`}>
                <div className="flex items-center gap-3 flex-1">
                    <div className={`p-3 rounded-xl ${ isDarkMode ? 'bg-cyan-500/15 text-cyan-400' : 'bg-cyan-100 text-cyan-600' }`}>
                        <Layers size={22} />
                    </div>
                    <div>
                        <h2 className={`text-lg font-black ${ isDarkMode ? 'text-white' : 'text-slate-900' }`}>Class-Batch Assignment Map</h2>
                        <p className={`text-sm ${ isDarkMode ? 'text-slate-400' : 'text-slate-500' }`}>
                            {filtered.length} subject{filtered.length !== 1 ? 's' : ''} across {new Set(assignments.flatMap(a => [...a.batches])).size} batch{new Set(assignments.flatMap(a => [...a.batches])).size !== 1 ? 'es' : ''}
                        </p>
                    </div>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search subject or batch..."
                        value={search}
                        onChange={e => onSearchChange(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                            isDarkMode ? 'bg-[#1e293b] border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-slate-800'
                        }`}
                    />
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className={`p-12 text-center rounded-xl border ${
                    isDarkMode ? 'bg-[#10141d]/50 border-gray-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                    <Layers size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-bold">No matching assignments found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map((item, idx) => {
                        const totalClasses = item.upcoming.length + item.previous.length;
                        const batches = [...item.batches];

                        return (
                            <div
                                key={item.subject}
                                className={`rounded-2xl border overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                                    isDarkMode
                                        ? 'bg-[#10141d]/80 border-gray-800 hover:border-cyan-500/30 hover:shadow-cyan-500/5'
                                        : 'bg-white border-slate-200 hover:border-cyan-200 hover:shadow-cyan-500/10'
                                }`}
                            >
                                {/* Colored top accent */}
                                <div className={`h-1 w-full ${
                                    idx % 6 === 0 ? 'bg-gradient-to-r from-cyan-500 to-indigo-500' :
                                    idx % 6 === 1 ? 'bg-gradient-to-r from-violet-500 to-purple-500' :
                                    idx % 6 === 2 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                                    idx % 6 === 3 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                                    idx % 6 === 4 ? 'bg-gradient-to-r from-rose-500 to-pink-500' :
                                                   'bg-gradient-to-r from-blue-500 to-cyan-500'
                                }`} />

                                <div className="p-5">
                                    {/* Subject header */}
                                    <div className="flex items-start justify-between gap-2 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${
                                                isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                                            }`}>
                                                <BookOpen size={18} />
                                            </div>
                                            <h3 className={`text-base font-black ${ isDarkMode ? 'text-white' : 'text-slate-900' }`}>
                                                {item.subject}
                                            </h3>
                                        </div>
                                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${
                                            isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {totalClasses} class{totalClasses !== 1 ? 'es' : ''}
                                        </span>
                                    </div>

                                    {/* Batches */}
                                    <div className="mb-4">
                                        <div className={`flex items-center gap-1.5 mb-2`}>
                                            <Tag size={11} className={isDarkMode ? 'text-slate-500' : 'text-slate-400'} />
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${ isDarkMode ? 'text-slate-500' : 'text-slate-400' }`}>
                                                Assigned Batches
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {batches.length === 0 ? (
                                                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
                                                    isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                                                }`}>
                                                    <Users size={10} />
                                                    Batch data from ERP
                                                </span>
                                            ) : batches.map((batch, bi) => (
                                                <span
                                                    key={batch}
                                                    className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
                                                        batchColors[bi % batchColors.length].bg
                                                    }`}
                                                >
                                                    <Users size={10} />
                                                    {batch}
                                                </span>

                                            ))}
                                        </div>
                                    </div>

                                    {/* Stats row */}
                                    <div className={`flex items-center gap-3 pt-3 border-t ${ isDarkMode ? 'border-gray-800' : 'border-slate-100' }`}>
                                        {item.upcoming.length > 0 && (
                                            <div className={`flex items-center gap-1.5 text-xs font-bold ${ isDarkMode ? 'text-emerald-400' : 'text-emerald-600' }`}>
                                                <Clock size={12} />
                                                <span>{item.upcoming.length} upcoming</span>
                                            </div>
                                        )}
                                        {item.previous.length > 0 && (
                                            <div className={`flex items-center gap-1.5 text-xs font-bold ${ isDarkMode ? 'text-slate-400' : 'text-slate-500' }`}>
                                                <Calendar size={12} />
                                                <span>{item.previous.length} past</span>
                                            </div>
                                        )}
                                        {/* Next upcoming date */}
                                        {item.upcoming.length > 0 && item.upcoming[0].date && (
                                            <span className={`ml-auto text-[10px] font-bold ${ isDarkMode ? 'text-cyan-400' : 'text-cyan-600' }`}>
                                                Next: {new Date(item.upcoming[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TeacherClasses;
