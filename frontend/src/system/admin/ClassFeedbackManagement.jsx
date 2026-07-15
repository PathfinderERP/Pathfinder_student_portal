import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Search, Filter, Star, Clock, AlertCircle, MessageSquare, X, ChevronRight } from 'lucide-react';

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

const ClassFeedbackManagement = () => {
    const { getApiUrl, token } = useAuth();
    const { isDarkMode } = useTheme();
    
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [teacherFilter, setTeacherFilter] = useState('All');
    const [subjectFilter, setSubjectFilter] = useState('All');
    const [ratingFilter, setRatingFilter] = useState('All'); // 'All', 'High (>4)', 'Medium (3-4)', 'Low (<3)'
    
    // Details Modal State
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    
    // Student Filters for Details View
    const [studentSearch, setStudentSearch] = useState('');
    const [studentBatchFilter, setStudentBatchFilter] = useState('All');
    const [studentCenterFilter, setStudentCenterFilter] = useState('All');
    const [studentExamTagFilter, setStudentExamTagFilter] = useState('All');
    
    useEffect(() => {
        const fetchFeedbacks = async () => {
            try {
                setLoading(true);
                const apiUrl = getApiUrl();
                const response = await axios.get(`${apiUrl}/api/class-feedback/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setFeedbacks(response.data);
            } catch (err) {
                console.error("Failed to fetch class feedbacks", err);
                setError("Failed to load class feedbacks.");
            } finally {
                setLoading(false);
            }
        };
        if (token) fetchFeedbacks();
    }, [getApiUrl, token]);

    // Unique values for filters
    const teachers = useMemo(() => ['All', ...new Set(feedbacks.map(f => f.teacher_name).filter(Boolean))], [feedbacks]);
    const subjects = useMemo(() => ['All', ...new Set(feedbacks.map(f => f.subject).filter(Boolean))], [feedbacks]);

    const groupedFeedbacks = useMemo(() => {
        const groups = {};
        feedbacks.forEach(f => {
            const dateStr = f.date_of_class ? new Date(f.date_of_class).toLocaleDateString() : 'Unknown Date';
            const key = `${f.teacher_name}-${f.subject}-${dateStr}`;
            if (!groups[key]) {
                groups[key] = {
                    id: key,
                    teacher_name: f.teacher_name,
                    subject: f.subject,
                    date_of_class: f.date_of_class,
                    feedbacks: [],
                    average_score: 0
                };
            }
            groups[key].feedbacks.push(f);
        });

        // Calculate average scores for the class
        return Object.values(groups).map(group => {
            const totalScore = group.feedbacks.reduce((sum, f) => sum + f.average_score, 0);
            group.average_score = totalScore / group.feedbacks.length;
            return group;
        });
    }, [feedbacks]);

    const filteredGroups = useMemo(() => {
        return groupedFeedbacks.filter(g => {
            const matchesSearch = (g.teacher_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  (g.subject || '').toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesTeacher = teacherFilter === 'All' || g.teacher_name === teacherFilter;
            const matchesSubject = subjectFilter === 'All' || g.subject === subjectFilter;
            
            let matchesRating = true;
            if (ratingFilter === 'High (>4)') matchesRating = g.average_score >= 4;
            else if (ratingFilter === 'Medium (3-4)') matchesRating = g.average_score >= 3 && g.average_score < 4;
            else if (ratingFilter === 'Low (<3)') matchesRating = g.average_score < 3;
            
            return matchesSearch && matchesTeacher && matchesSubject && matchesRating;
        });
    }, [groupedFeedbacks, searchTerm, teacherFilter, subjectFilter, ratingFilter]);

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

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20">
            <div className={`w-12 h-12 border-4 rounded-full animate-spin mb-4 ${isDarkMode ? 'border-indigo-500/20 border-t-indigo-500' : 'border-indigo-200 border-t-indigo-600'}`}></div>
            <p className={`text-xs font-bold uppercase tracking-widest animate-pulse ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Loading Feedback</p>
        </div>
    );

    return (
        <div className="space-y-6">
            {!selectedFeedback ? (
                <>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Class Feedback</h1>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Monitor and analyze student feedback on classes.</p>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-100 text-red-700 rounded-lg flex items-center gap-2">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-[#1e293b] border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search teacher, subject..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white focus:border-indigo-500' : 'bg-gray-50 border-gray-300 focus:border-indigo-500'} focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors`}
                        />
                    </div>
                    
                    <select
                        value={teacherFilter}
                        onChange={(e) => setTeacherFilter(e.target.value)}
                        className={`w-full px-4 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white focus:border-indigo-500' : 'bg-gray-50 border-gray-300 focus:border-indigo-500'} focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors`}
                    >
                        {teachers.map(t => <option key={t} value={t}>{t === 'All' ? 'All Teachers' : t}</option>)}
                    </select>

                    <select
                        value={subjectFilter}
                        onChange={(e) => setSubjectFilter(e.target.value)}
                        className={`w-full px-4 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white focus:border-indigo-500' : 'bg-gray-50 border-gray-300 focus:border-indigo-500'} focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors`}
                    >
                        {subjects.map(s => <option key={s} value={s}>{s === 'All' ? 'All Subjects' : s}</option>)}
                    </select>
                    
                    <select
                        value={ratingFilter}
                        onChange={(e) => setRatingFilter(e.target.value)}
                        className={`w-full px-4 py-2 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white focus:border-indigo-500' : 'bg-gray-50 border-gray-300 focus:border-indigo-500'} focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors`}
                    >
                        {['All', 'High (>4)', 'Medium (3-4)', 'Low (<3)'].map(r => <option key={r} value={r}>{r === 'All' ? 'All Ratings' : r}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                {filteredGroups.map((group) => (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={group.id}
                        className={`p-6 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-6 ${isDarkMode ? 'bg-[#1e293b] border-gray-700 hover:border-indigo-500/50' : 'bg-white border-gray-200 hover:border-indigo-200'} transition-all shadow-sm`}
                    >
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{group.teacher_name}</h3>
                                <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full text-xs">
                                    <Star size={12} fill="currentColor" />
                                    <span className="font-bold">{group.average_score.toFixed(1)}</span>
                                </div>
                            </div>
                            <p className={`text-sm ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} font-black tracking-widest uppercase mb-3`}>{group.subject}</p>
                            
                            <div className="flex items-center gap-6 text-xs font-medium">
                                <div className={`flex items-center gap-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    <Clock size={14} />
                                    <span>{new Date(group.date_of_class).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                            <div className={`hidden md:flex flex-col items-end mr-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                <span className="text-2xl font-black">{group.feedbacks.length}</span>
                                <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">Responses</span>
                            </div>
                            
                            <button
                                onClick={() => {
                                    setSelectedFeedback(group);
                                    setStudentSearch('');
                                    setStudentBatchFilter('All');
                                    setStudentCenterFilter('All');
                                    setStudentExamTagFilter('All');
                                }}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap
                                    ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl'}`}
                            >
                                View Details
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </motion.div>
                ))}
                
                {filteredGroups.length === 0 && (
                    <div className={`col-span-full py-12 text-center rounded-xl border border-dashed ${isDarkMode ? 'border-gray-700 text-gray-500' : 'border-gray-300 text-gray-400'}`}>
                        <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No feedback sessions found matching the current filters.</p>
                    </div>
                )}
            </div>
            </>
            ) : (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
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
                                    <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedFeedback.teacher_name}</h2>
                                    <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs">
                                        <Star size={12} fill="currentColor" />
                                        <span className="font-bold">{selectedFeedback.average_score.toFixed(1)}</span>
                                    </div>
                                </div>
                                <p className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                    {selectedFeedback.subject}
                                </p>
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
                                    className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'} focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                                />
                            </div>
                            <select
                                value={studentBatchFilter}
                                onChange={(e) => setStudentBatchFilter(e.target.value)}
                                className={`w-full px-4 py-2 rounded-lg text-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'} focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                            >
                                {studentBatches.map(b => <option key={b} value={b}>{b === 'All' ? 'All Batches' : b}</option>)}
                            </select>
                            <select
                                value={studentCenterFilter}
                                onChange={(e) => setStudentCenterFilter(e.target.value)}
                                className={`w-full px-4 py-2 rounded-lg text-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'} focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                            >
                                {studentCenters.map(c => <option key={c} value={c}>{c === 'All' ? 'All Centers' : c}</option>)}
                            </select>
                            <select
                                value={studentExamTagFilter}
                                onChange={(e) => setStudentExamTagFilter(e.target.value)}
                                className={`w-full px-4 py-2 rounded-lg text-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'} focus:outline-none focus:ring-1 focus:ring-indigo-500`}
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
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                                                {(studentFb.student_name || studentFb.student_username || '?').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className={`text-[10px] font-black uppercase tracking-widest opacity-50 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Student</div>
                                                <div className={`text-sm font-bold flex items-center gap-2 flex-wrap ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                    <span>{studentFb.student_name || studentFb.student_username}</span>
                                                    {studentFb.student_batch && (
                                                        <span className={`text-[9px] px-2 py-0.5 rounded-md uppercase tracking-widest ${isDarkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
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
            )}
        </div>
    );
};

export default ClassFeedbackManagement;
