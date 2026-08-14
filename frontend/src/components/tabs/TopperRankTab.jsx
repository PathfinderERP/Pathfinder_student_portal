import React, { useState, useEffect } from 'react';
import { Award, Trophy, Medal, Star, TrendingUp, BarChart2, CheckCircle2, Search, Filter, Layers, Building2, BookOpen, Users, RefreshCw, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import axios from 'axios';

const TopperRankTab = ({ teacherUser }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token, user: authUser } = useAuth();
    const user = teacherUser || authUser;
    
    let teacherCentresList = [];
    if (Array.isArray(user?.centres) && user.centres.length > 0) {
        teacherCentresList = user.centres.map(c => String(c).trim()).filter(Boolean);
    } else if (user?.centre_name) {
        teacherCentresList = String(user.centre_name).split(',').map(c => c.trim()).filter(Boolean);
    } else if (user?.center) {
        teacherCentresList = String(user.center).split(',').map(c => c.trim()).filter(Boolean);
    }

    let teacherBatchesList = [];
    if (Array.isArray(user?.batches) && user.batches.length > 0) {
        teacherBatchesList = user.batches.map(b => (typeof b === 'object' ? b.batchName || b.name || b.code : b)).map(String).map(b => b.trim()).filter(Boolean);
    } else if (user?.assigned_batch) {
        teacherBatchesList = String(user.assigned_batch).split(',').map(b => b.trim()).filter(Boolean);
    } else if (user?.batch) {
        teacherBatchesList = String(user.batch).split(',').map(b => b.trim()).filter(Boolean);
    }

    const [classMapBatches, setClassMapBatches] = useState([]);

    // Fetch teacher classes & class feedbacks on mount to extract exact Class-Batch Map
    useEffect(() => {
        const fetchClassMap = async () => {
            try {
                const tokenVal = token || localStorage.getItem('auth_token');
                const apiUrl = getApiUrl();
                const headers = tokenVal ? { Authorization: `Bearer ${tokenVal}` } : {};
                
                const [classesRes, feedbacksRes] = await Promise.allSettled([
                    axios.get(`${apiUrl}/api/teacher-portal/classes/`, { headers }),
                    axios.get(`${apiUrl}/api/class-feedback/`, { headers })
                ]);
                
                const bSet = new Set();
                
                if (classesRes.status === 'fulfilled' && classesRes.value?.data) {
                    const allCls = [...(classesRes.value.data.upcoming || []), ...(classesRes.value.data.previous || [])];
                    allCls.forEach(cls => {
                        const bArr = Array.isArray(cls._batches) && cls._batches.length > 0
                            ? cls._batches
                            : (cls.batch && cls.batch !== 'Multiple')
                                ? cls.batch.split(',').map(b => b.trim()).filter(Boolean)
                                : [];
                        bArr.forEach(b => bSet.add(b));
                    });
                }

                if (feedbacksRes.status === 'fulfilled' && Array.isArray(feedbacksRes.value?.data)) {
                    feedbacksRes.value.data.forEach(f => {
                        const bName = f.student_batch || f.assigned_batch || f.batch;
                        if (bName && typeof bName === 'string' && bName.trim() && bName.trim() !== 'Multiple') {
                            bSet.add(bName.trim());
                        }
                    });
                }

                if (bSet.size > 0) {
                    setClassMapBatches(Array.from(bSet));
                }
            } catch (err) {
                console.warn("[TopperRankTab] Could not fetch teacher classes/feedback for Class-Batch map:", err);
            }
        };
        fetchClassMap();
    }, [getApiUrl, token]);

    const effectiveTeacherBatches = teacherBatchesList.length > 0 ? teacherBatchesList : classMapBatches;
    const teacherCenter = teacherCentresList.join(', ');
    const teacherBatch = effectiveTeacherBatches.join(', ');

    const formatSubj = (str) => {
        if (!str) return 'Physics';
        const clean = String(str).trim().toUpperCase();
        if (clean.includes('PHY')) return 'Physics';
        if (clean.includes('CHE')) return 'Chemistry';
        if (clean.includes('MATH')) return 'Mathematics';
        if (clean.includes('BIO') || clean.includes('BOT') || clean.includes('ZOO')) return 'Biology';
        return clean.charAt(0) + clean.slice(1).toLowerCase();
    };

    const rawTeacherSubj = user?.subject || user?.department || user?.exam_tag_name || '';
    const teacherSubject = formatSubj(Array.isArray(rawTeacherSubj) ? rawTeacherSubj[0] : rawTeacherSubj);
    const standardSubjects = ['Physics', 'Chemistry', 'Mathematics', 'Biology'];
    const otherSubjects = standardSubjects.filter(s => s.toLowerCase() !== teacherSubject.toLowerCase());

    const hasCenter = teacherCentresList.length > 0;
    const hasBatch = effectiveTeacherBatches.length > 0;

    const [rankingBasis, setRankingBasis] = useState('overall');
    const [scopeFilter, setScopeFilter] = useState('all');
    const [selectedCenterFilter, setSelectedCenterFilter] = useState('ALL');
    const [toppers, setToppers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isRealData, setIsRealData] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

    const [selectedSubject, setSelectedSubject] = useState(teacherSubject);

    const [publishedExams, setPublishedExams] = useState([]);
    const [selectedTestId, setSelectedTestId] = useState('');
    const [selectedTestName, setSelectedTestName] = useState('');
    const [selectedTestMaxMarks, setSelectedTestMaxMarks] = useState(0);

    const fetchToppers = async () => {
        setLoading(true);
        try {
            const apiUrl = getApiUrl();
            let queryUrl = `${apiUrl}/api/rank-produce/?basis=${rankingBasis}&scope=${scopeFilter}`;
            
            if (selectedTestId) {
                queryUrl += `&test_id=${encodeURIComponent(selectedTestId)}`;
            }
            if (selectedSubject) {
                queryUrl += `&subject=${encodeURIComponent(selectedSubject)}`;
            }

            // Always restrict to teacher's assigned centres if teacher has centres assigned
            if (hasCenter) {
                queryUrl += `&center=${encodeURIComponent(teacherCenter)}`;
            }
            // Always restrict to teacher's assigned batches if teacher has batches assigned
            if (hasBatch) {
                queryUrl += `&batch=${encodeURIComponent(teacherBatch)}`;
            }

            const res = await axios.get(queryUrl, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (res.data?.toppers) {
                setToppers(res.data.toppers);
                setIsRealData(res.data.is_real_data === true);
                if (res.data.published_exams) setPublishedExams(res.data.published_exams);
                if (res.data.selected_test_name) setSelectedTestName(res.data.selected_test_name);
                if (res.data.selected_test_max_marks) setSelectedTestMaxMarks(res.data.selected_test_max_marks);
                if (!selectedTestId && res.data.selected_test_id) {
                    setSelectedTestId(String(res.data.selected_test_id));
                }
                if (res.data.db_note) console.info('[TopperRankTab]', res.data.db_note);
            }
            setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        } catch (err) {
            console.error("Topper ranks fetch error:", err);
            setIsRealData(false);
            setToppers([
                { rank: 1, student_name: "Aarav Ganguly", roll_no: "PF-2026-0042", batch: "MED-12A", center: "Kolkata Central", total_marks: 96, max_marks: 100, percentage: 96.00, subject_breakdown: { Physics: 96 }, percentile: 99.98 },
                { rank: 2, student_name: "Abhinav Mukhopadhyay", roll_no: "PF-2026-0055", batch: "Batch A", center: "Dumdum Center", total_marks: 94, max_marks: 100, percentage: 94.00, subject_breakdown: { Physics: 94 }, percentile: 99.92 },
                { rank: 3, student_name: "Diya Sengupta", roll_no: "PF-2026-0089", batch: "MED-12A", center: "Durgapur", total_marks: 92, max_marks: 100, percentage: 92.00, subject_breakdown: { Physics: 92 }, percentile: 99.85 },
                { rank: 4, student_name: "Devjyoti Paul", roll_no: "PF-2026-0098", batch: "Batch A", center: "Dumdum Center", total_marks: 90, max_marks: 100, percentage: 90.00, subject_breakdown: { Physics: 90 }, percentile: 99.80 },
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchToppers();
    }, [rankingBasis, scopeFilter, selectedTestId, selectedSubject, classMapBatches]);

    const availableCentres = Array.from(new Set([
        ...teacherCentresList,
        ...toppers.map(t => (t.center || '').trim()).filter(Boolean)
    ]));

    const handleExportCSV = () => {
        if (!filteredToppers || filteredToppers.length === 0) {
            alert("No ranker data available to export.");
            return;
        }
        
        const headers = ["Rank", "Student Name", "Roll No", "Batch", "Center", "Subject Marks", "Total Exam Marks", "Percentage", "Percentile"];
        const rows = filteredToppers.map(st => [
            st.rank,
            `"${(st.student_name || '').replace(/"/g, '""')}"`,
            `"${(st.roll_no || '').replace(/"/g, '""')}"`,
            `"${(st.batch || '').replace(/"/g, '""')}"`,
            `"${(st.center || '').replace(/"/g, '""')}"`,
            `"${st.total_marks} / ${st.max_marks}"`,
            `"${st.full_exam_total_marks !== undefined ? st.full_exam_total_marks : st.total_marks} / ${st.full_exam_max_marks !== undefined ? st.full_exam_max_marks : st.max_marks}"`,
            `${st.percentage}%`,
            st.percentile
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        const examLabel = selectedTestName ? selectedTestName.replace(/[^a-zA-Z0-9]/g, '_') : 'Toppers';
        link.setAttribute('download', `${examLabel}_Topper_Ranks.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredToppers = toppers.filter(st => {
        const matchesSearch = st.student_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            st.roll_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
            st.batch.toLowerCase().includes(searchQuery.toLowerCase()) ||
            st.center.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCenter = selectedCenterFilter === 'ALL' || 
            st.center.toLowerCase().trim() === selectedCenterFilter.toLowerCase().trim() ||
            st.center.toLowerCase().includes(selectedCenterFilter.toLowerCase().trim());
        
        if (scopeFilter === 'center') {
            return matchesSearch && matchesCenter && st.center.toLowerCase().includes(teacherCenter.toLowerCase());
        }
        if (scopeFilter === 'batch') {
            return matchesSearch && matchesCenter && st.batch.toLowerCase().includes(teacherBatch.toLowerCase());
        }
        return matchesSearch && matchesCenter;
    });

    const getRankBadge = (rank) => {
        if (rank === 1) return (
            <div className={`px-2.5 py-1 rounded-xl flex items-center gap-1 font-black text-xs ${isDarkMode ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-amber-500/10 text-amber-600 border border-amber-500/30'}`}>
                <Trophy size={16} /> #1
            </div>
        );
        if (rank === 2) return (
            <div className={`px-2.5 py-1 rounded-xl flex items-center gap-1 font-black text-xs ${isDarkMode ? 'bg-slate-300/20 text-slate-300 border border-slate-300/40' : 'bg-slate-200 text-slate-700 border border-slate-300'}`}>
                <Medal size={16} /> #2
            </div>
        );
        if (rank === 3) return (
            <div className={`px-2.5 py-1 rounded-xl flex items-center gap-1 font-black text-xs ${isDarkMode ? 'bg-amber-700/20 text-amber-600 border border-amber-700/40' : 'bg-amber-700/10 text-amber-700 border border-amber-700/30'}`}>
                <Award size={16} /> #3
            </div>
        );
        return (
            <div className={`px-2.5 py-1 rounded-xl flex items-center gap-1 font-black text-xs ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-cyan-100 text-cyan-700 border border-cyan-200'}`}>
                #{rank}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className={`p-5 md:p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-xl backdrop-blur-xl transition-all space-y-4`}>
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Trophy className="text-amber-400" size={24} />
                            <h2 className="text-xl md:text-2xl font-black tracking-tight">Rank Produce (Topper Ranks)</h2>
                            {isRealData ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                                    ● Live Data
                                </span>
                            ) : (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${isDarkMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-amber-100 text-amber-700 border border-amber-300'}`}>
                                    ◌ Sample Data
                                </span>
                            )}
                        </div>
                        <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {isRealData
                                ? 'Showing exam-wise student performance & topper rankings from published exams.'
                                : 'No published exam results found yet. Sample data shown below.'}
                        </p>
                        {/* Teacher context info chips */}
                        <div className="flex flex-wrap gap-2 pt-1">
                            {hasCenter && (
                                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-cyan-50 text-cyan-700 border border-cyan-200'}`}>
                                    <Building2 size={11} /> {teacherCenter}
                                </span>
                            )}
                            {hasBatch && (
                                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 ${isDarkMode ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' : 'bg-violet-50 text-violet-700 border border-violet-200'}`}>
                                    <Users size={11} /> {teacherBatch}
                                </span>
                            )}
                            {teacherSubject && teacherSubject !== 'Overall' && (
                                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 ${isDarkMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                    <BookOpen size={11} /> {teacherSubject}
                                </span>
                            )}
                            {!hasCenter && !hasBatch && (
                                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Centre & batch not assigned — showing all students
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Refresh Button */}
                        <button
                            onClick={fetchToppers}
                            disabled={loading}
                            title="Refresh Topper Standings"
                            className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold text-xs transition-all shadow-md ${
                                isDarkMode 
                                    ? 'bg-slate-800 border-white/10 text-slate-300 hover:text-white hover:border-amber-500/40' 
                                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 hover:border-amber-500'
                            }`}
                        >
                            <RefreshCw size={16} className={`text-amber-500 ${loading ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Refresh Ranks</span>
                        </button>

                        {/* Ranking Criteria Toggle */}
                        <div className={`flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl border ${isDarkMode ? 'bg-slate-950/40 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                            {[
                                { id: 'overall', label: 'Overall' },
                                { id: 'test', label: 'Recent Test' },
                                { id: 'subject', label: `${teacherSubject} Rank` }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setRankingBasis(tab.id)}
                                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                                        rankingBasis === tab.id
                                            ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20'
                                            : (isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Exam & Subject-Wise Selector Row */}
                {publishedExams.length > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-3 border-t border-white/10">
                        <div className="flex items-center gap-1.5 flex-1 min-w-[260px]">
                            <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1 shrink-0 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                                <Layers size={14} /> EXAM:
                            </span>
                            <select
                                value={selectedTestId}
                                onChange={(e) => setSelectedTestId(e.target.value)}
                                className={`w-full px-3 py-2 rounded-xl text-xs font-bold border outline-none cursor-pointer transition-all ${
                                    isDarkMode 
                                        ? 'bg-slate-950 border-amber-500/40 text-amber-300 focus:border-amber-400 shadow-md' 
                                        : 'bg-white border-amber-300 text-amber-900 focus:border-amber-500 shadow-sm'
                                }`}
                            >
                                {publishedExams.map(ex => (
                                    <option key={ex.id} value={ex.id}>
                                        {ex.name} (Max Marks: {ex.total_marks} • {ex.submissions_count} Students)
                                    </option>
                                ))}
                                <option value="all">⚡ All Exams Combined (Overall Aggregate)</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1 shrink-0 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                <BookOpen size={14} /> SUBJECT:
                            </span>
                            <select
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold border outline-none cursor-pointer transition-all ${
                                    isDarkMode 
                                        ? 'bg-slate-950 border-cyan-500/40 text-cyan-300 focus:border-cyan-400 shadow-md' 
                                        : 'bg-white border-cyan-300 text-cyan-900 focus:border-cyan-500 shadow-sm'
                                }`}
                            >
                                <option value={teacherSubject}>📌 {teacherSubject} (Assigned Subject)</option>
                                {otherSubjects.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                                <option value="All">All Subjects (Full Paper Score)</option>
                            </select>
                        </div>

                        {/* Centre Filter Dropdown */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1 shrink-0 ${isDarkMode ? 'text-violet-400' : 'text-violet-600'}`}>
                                <Building2 size={14} /> CENTER:
                            </span>
                            <select
                                value={selectedCenterFilter}
                                onChange={(e) => setSelectedCenterFilter(e.target.value)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold border outline-none cursor-pointer transition-all ${
                                    isDarkMode 
                                        ? 'bg-slate-950 border-violet-500/40 text-violet-300 focus:border-violet-400 shadow-md' 
                                        : 'bg-white border-violet-300 text-violet-900 focus:border-violet-500 shadow-sm'
                                }`}
                            >
                                <option value="ALL">🏢 All Assigned Centres</option>
                                {availableCentres.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        {selectedTestName && (
                            <span className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shrink-0 ${
                                isDarkMode 
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                                <span>Showing: <strong>{selectedSubject !== 'All' ? `${selectedSubject} Marks` : 'Full Paper'}</strong></span>
                                {selectedTestMaxMarks > 0 && (
                                    <span className="opacity-80">• Max: {selectedTestMaxMarks} Marks</span>
                                )}
                            </span>
                        )}
                    </div>
                )}

                {/* Scope Filters (Teacher Context) */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>VIEW SCOPE:</span>
                        
                        {/* All Institutional — always available */}
                        <button
                            onClick={() => setScopeFilter('all')}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                                scopeFilter === 'all'
                                    ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                                    : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                            }`}
                        >
                            <Trophy size={14} /> All Institutional Toppers
                        </button>

                        {/* Centre Toppers — only if teacher has centre_name */}
                        {hasCenter && (
                            <button
                                onClick={() => setScopeFilter('center')}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                                    scopeFilter === 'center'
                                        ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                                        : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                                }`}
                            >
                                <Building2 size={14} /> {teacherCenter} Toppers
                            </button>
                        )}

                        {/* Batch Toppers — only if teacher has centre */}
                        {hasCenter && (
                            <button
                                onClick={() => setScopeFilter('batch')}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                                    scopeFilter === 'batch'
                                        ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                                        : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                                }`}
                            >
                                <Users size={14} /> {hasBatch ? teacherBatch : 'Batch'} Toppers
                            </button>
                        )}

                        {/* Subject Toppers — always available using teacher's subject */}
                        <button
                            onClick={() => setScopeFilter('subject')}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                                scopeFilter === 'subject'
                                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                                    : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                            }`}
                        >
                            <BookOpen size={14} /> {teacherSubject !== 'Overall' ? teacherSubject : 'Subject'} Toppers
                        </button>
                    </div>

                    <div className={`text-[11px] font-medium flex items-center gap-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span>Updated at {lastUpdated}</span>
                    </div>
                </div>
            </div>

            {/* Context Summary Banner */}
            {scopeFilter !== 'all' && (
                <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 text-xs ${
                    isDarkMode ? 'bg-cyan-950/30 border-cyan-500/30 text-cyan-200' : 'bg-cyan-50 border-cyan-200 text-cyan-900'
                }`}>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-cyan-500 flex-shrink-0" />
                        <span>
                            Filtered for <strong>{scopeFilter === 'center' ? teacherCenter : scopeFilter === 'batch' ? `${teacherCenter} (${teacherBatch})` : `${teacherSubject} Subject`}</strong> toppers (Regular & OMR Exams).
                        </span>
                    </div>
                    <button
                        onClick={() => setScopeFilter('all')}
                        className="text-cyan-500 font-bold hover:underline whitespace-nowrap"
                    >
                        Reset Filter
                    </button>
                </div>
            )}

            {/* Top 3 Podium Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredToppers.slice(0, 3).map((top, idx) => (
                    <div
                        key={idx}
                        className={`relative p-5 md:p-6 rounded-2xl border flex flex-col justify-between overflow-hidden transition-all duration-300 ${
                            top.rank === 1
                                ? (isDarkMode ? 'bg-gradient-to-br from-amber-950/40 to-slate-900 border-amber-500/50 shadow-amber-500/10' : 'bg-gradient-to-br from-amber-50 via-white to-orange-50/80 border-amber-300 shadow-amber-500/10')
                                : top.rank === 2
                                ? (isDarkMode ? 'bg-gradient-to-br from-slate-900 to-slate-950 border-slate-400/40 shadow-slate-400/10' : 'bg-gradient-to-br from-slate-50 via-white to-slate-100/90 border-slate-300 shadow-slate-400/10')
                                : (isDarkMode ? 'bg-gradient-to-br from-amber-950/20 to-slate-950 border-amber-700/40 shadow-amber-700/10' : 'bg-gradient-to-br from-orange-50/50 via-white to-amber-50/80 border-amber-400/40 shadow-amber-700/10')
                        } shadow-xl`}
                    >
                        <div className="flex items-center justify-between">
                            {getRankBadge(top.rank)}
                            <span className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{top.percentile} Percentile</span>
                        </div>

                        <div className="my-4 space-y-1">
                            <h3 className={`text-lg md:text-xl font-black truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{top.student_name}</h3>
                            <p className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{top.roll_no} • {top.batch}</p>
                            <p className={`text-xs font-bold ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{top.center}</p>
                        </div>

                        <div className={`pt-4 border-t flex items-center justify-between ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                            <div>
                                <span className={`text-[10px] font-bold uppercase block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Score</span>
                                <span className={`text-base md:text-lg font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{top.total_marks} <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>/ {top.max_marks}</span></span>
                            </div>
                            <div className="text-right">
                                <span className={`text-[10px] font-bold uppercase block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Percentage</span>
                                <span className={`text-base md:text-lg font-black ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>{top.percentage}%</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Controls & Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search rankers by name, roll no, batch, or center..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-semibold outline-none ${
                            isDarkMode
                                ? 'bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500 focus:border-amber-500/50'
                                : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-amber-500'
                        }`}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportCSV}
                        disabled={loading || filteredToppers.length === 0}
                        title="Export Currently Filtered Rankers to CSV"
                        className={`px-4 py-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 ${
                            isDarkMode
                                ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-600/30'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                        }`}
                    >
                        <Download size={14} className="text-emerald-500" />
                        <span>Export CSV</span>
                    </button>

                    <button
                        onClick={fetchToppers}
                        disabled={loading}
                        className={`px-4 py-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider transition-all shadow-md ${
                            isDarkMode
                                ? 'bg-slate-900 border-white/10 text-slate-300 hover:bg-slate-800'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        <RefreshCw size={14} className={`text-amber-500 ${loading ? 'animate-spin' : ''}`} />
                        <span>Sync & Refresh Data</span>
                    </button>
                </div>
            </div>

            {/* Leaderboard Table (Responsive Overflow Container) */}
            <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'} shadow-xl`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs border-collapse min-w-[750px]">
                        <thead>
                            <tr className={`border-b font-extrabold uppercase tracking-wider text-[11px] ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                                <th className="p-4">Rank</th>
                                <th className="p-4">Student Name & Roll</th>
                                <th className="p-4">Batch & Center</th>
                                <th className="p-4">{selectedSubject !== 'All' ? `${selectedSubject} Marks` : 'Subject Marks'}</th>
                                <th className="p-4">Total Exam Marks</th>
                                <th className="p-4">Percentage</th>
                                <th className="p-4">Subject Breakdown</th>
                                <th className="p-4">Percentile</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-200'}`}>
                            {filteredToppers.map(st => (
                                <tr key={st.rank} className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/80'}`}>
                                    <td className="p-4">{getRankBadge(st.rank)}</td>
                                    <td className="p-4">
                                        <p className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{st.student_name}</p>
                                        <p className={`text-[11px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{st.roll_no}</p>
                                    </td>
                                    <td className="p-4">
                                        <p className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>{st.batch}</p>
                                        <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{st.center}</p>
                                    </td>
                                    <td className={`p-4 font-black text-sm ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                        {st.total_marks} / {st.max_marks}
                                    </td>
                                    <td className={`p-4 font-black text-sm ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                        {st.full_exam_total_marks !== undefined ? st.full_exam_total_marks : st.total_marks} / {st.full_exam_max_marks !== undefined ? st.full_exam_max_marks : st.max_marks}
                                    </td>
                                    <td className={`p-4 font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>{st.percentage}%</td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                            {Object.entries(st.subject_breakdown).map(([sub, score]) => (
                                                <span key={sub} className={`px-2 py-0.5 rounded border font-mono ${isDarkMode ? 'bg-slate-800 border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                                                    {sub.slice(0, 3)}: {score}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className={`p-4 font-black ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{st.percentile} %ile</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TopperRankTab;
