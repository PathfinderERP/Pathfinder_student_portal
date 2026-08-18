import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BarChart2, TrendingUp, Award, Trophy, Medal, Target, CheckCircle2, AlertCircle, BookOpen, Layers, Users, ChevronDown, ChevronUp, AlertTriangle, ShieldAlert, Sparkles, PieChart, GraduationCap, Search, Filter, RefreshCw, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import axios from 'axios';

const roundVal = (v) => Math.round((v || 0) * 10) / 10;

const TestAnalysisTab = ({ teacherUser }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token, user: authUser } = useAuth();
    const user = teacherUser || authUser;

    // ── Teacher Context Extraction (Identical to TopperRankTab) ──
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
    const [fetchedSubject, setFetchedSubject] = useState('');

    useEffect(() => {
        const fetchTeacherData = async () => {
            try {
                const tokenVal = token || localStorage.getItem('auth_token');
                const apiUrl = getApiUrl();
                const headers = tokenVal ? { Authorization: `Bearer ${tokenVal}` } : {};
                
                const userEmail = user?.email || user?.username || user?.code || user?.employee_id;
                const profileUrl = userEmail 
                    ? `${apiUrl}/api/teacher-portal/profile/?email=${encodeURIComponent(userEmail)}&username=${encodeURIComponent(userEmail)}&code=${encodeURIComponent(userEmail)}`
                    : `${apiUrl}/api/teacher-portal/profile/`;

                const classesUrl = userEmail 
                    ? `${apiUrl}/api/teacher-portal/classes/?email=${encodeURIComponent(userEmail)}`
                    : `${apiUrl}/api/teacher-portal/classes/`;
                    
                const feedbackUrl = userEmail
                    ? `${apiUrl}/api/class-feedback/?email=${encodeURIComponent(userEmail)}`
                    : `${apiUrl}/api/class-feedback/`;

                const [classesRes, feedbacksRes, profileRes] = await Promise.allSettled([
                    axios.get(classesUrl, { headers }),
                    axios.get(feedbackUrl, { headers }),
                    axios.get(profileUrl, { headers })
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

                const fData = Array.isArray(feedbacksRes.value?.data) ? feedbacksRes.value.data : (feedbacksRes.value?.data?.results || []);
                if (feedbacksRes.status === 'fulfilled' && fData.length > 0) {
                    fData.forEach(f => {
                        const bName = f.student_batch || f.assigned_batch || f.batch;
                        if (bName && typeof bName === 'string' && bName.trim() && bName.trim() !== 'Multiple') {
                            bSet.add(bName.trim());
                        }
                    });
                }

                if (bSet.size > 0) {
                    setClassMapBatches(Array.from(bSet));
                }

                if (profileRes.status === 'fulfilled' && profileRes.value?.data) {
                    const pData = profileRes.value.data;
                    const profileObj = pData.profile || pData.teacher || pData;
                    const subj = profileObj.subject || profileObj.subject_name || profileObj.subjects || pData.subject;
                    if (subj) setFetchedSubject(subj);
                    
                    const pBatches = profileObj.batches || profileObj.assigned_batch || profileObj.batch || [];
                    if (Array.isArray(pBatches)) {
                        pBatches.forEach(b => {
                            const bName = typeof b === 'object' ? b.batchName || b.name || b.code : b;
                            if (bName && typeof bName === 'string' && bName.trim() && bName.trim() !== 'Multiple') {
                                bSet.add(bName.trim());
                            }
                        });
                    } else if (typeof pBatches === 'string') {
                        pBatches.split(',').forEach(b => {
                            if (b.trim() && b.trim() !== 'Multiple') bSet.add(b.trim());
                        });
                    }
                }
            } catch (err) {
                console.warn("[TestAnalysisTab] Could not fetch teacher details:", err);
            }
        };
        fetchTeacherData();
    }, [getApiUrl, token, user?.email, user?.username]);

    const effectiveTeacherBatches = classMapBatches.length > 0 ? classMapBatches : teacherBatchesList;
    const teacherCenter = teacherCentresList.join(', ');
    const teacherBatch = effectiveTeacherBatches.join(', ');

    const formatSubj = (str) => {
        if (!str) return '';
        if (Array.isArray(str)) str = str[0];
        const clean = String(str).replace(/[\[\]'"]/g, '').trim().toUpperCase();
        if (!clean) return '';
        if (clean.includes('PHY')) return 'Physics';
        if (clean.includes('CHE')) return 'Chemistry';
        if (clean.includes('MATH')) return 'Mathematics';
        if (clean.includes('BIO') || clean.includes('BOT') || clean.includes('ZOO')) return 'Biology';
        return clean.charAt(0) + clean.slice(1).toLowerCase();
    };

    const rawTeacherSubj = user?.subject || user?.subjects || user?.subject_name || user?.teacher_subject || fetchedSubject || user?.department || user?.teacherDepartment || user?.exam_tag_name || '';
    const detectedSubject = formatSubj(rawTeacherSubj);
    const teacherSubject = detectedSubject || 'Physics';

    const standardSubjects = ['Physics', 'Chemistry', 'Mathematics', 'Biology'];
    const otherSubjects = standardSubjects.filter(s => s.toLowerCase() !== teacherSubject.toLowerCase());

    const hasCenter = teacherCentresList.length > 0;
    const hasBatch = effectiveTeacherBatches.length > 0;

    // ── Page States ──
    const [publishedExams, setPublishedExams] = useState([]);
    const [selectedTestId, setSelectedTestId] = useState('');
    const [selectedTestName, setSelectedTestName] = useState('');
    const [selectedTestMaxMarks, setSelectedTestMaxMarks] = useState(100);
    const [examToppers, setExamToppers] = useState([]);
    
    const [selectedSubject, setSelectedSubject] = useState(teacherSubject);
    const [selectedCenterFilter, setSelectedCenterFilter] = useState('ALL');

    useEffect(() => {
        if (teacherSubject) {
            setSelectedSubject(teacherSubject);
        }
    }, [teacherSubject]);

    const [testAnalysis, setTestAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBandFilter, setSelectedBandFilter] = useState('ALL');
    const [isLiveDatabaseData, setIsLiveDatabaseData] = useState(false);

    // Searchable exam dropdown state
    const [examDropdownOpen, setExamDropdownOpen] = useState(false);
    const [examSearchQuery, setExamSearchQuery] = useState('');
    const examDropdownRef = useRef(null);
    const examSearchInputRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (examDropdownRef.current && !examDropdownRef.current.contains(e.target)) {
                setExamDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (examDropdownOpen && examSearchInputRef.current) {
            examSearchInputRef.current.focus();
        }
    }, [examDropdownOpen]);

    const filteredExams = useMemo(() => {
        if (!examSearchQuery.trim()) return publishedExams;
        const q = examSearchQuery.toLowerCase();
        return publishedExams.filter(ex => (ex.name || '').toLowerCase().includes(q));
    }, [publishedExams, examSearchQuery]);

    // 1. Fetch live published exams & rank records from /api/rank-produce/
    const fetchLiveData = async (testIdToFetch = '', subjToFetch = selectedSubject, centerToFetch = selectedCenterFilter) => {
        setLoading(true);
        try {
            const apiUrl = getApiUrl();
            const teacherIdent = user?.email || user?.username || user?.code || user?.employee_id;
            let queryUrl = `${apiUrl}/api/rank-produce/?basis=overall&scope=all`;
            if (teacherIdent) {
                queryUrl += `&teacher_username=${encodeURIComponent(teacherIdent)}`;
            }
            if (testIdToFetch) {
                queryUrl += `&test_id=${encodeURIComponent(testIdToFetch)}`;
            }
            if (subjToFetch && subjToFetch !== 'All') {
                queryUrl += `&subject=${encodeURIComponent(subjToFetch)}`;
            }
            if (centerToFetch && centerToFetch !== 'ALL') {
                queryUrl += `&center=${encodeURIComponent(centerToFetch)}`;
            } else if (hasCenter) {
                queryUrl += `&center=${encodeURIComponent(teacherCenter)}`;
            }
            if (hasBatch) {
                queryUrl += `&batch=${encodeURIComponent(teacherBatch)}`;
            }

            const res = await axios.get(queryUrl, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            if (res.data?.published_exams && res.data.published_exams.length > 0) {
                setPublishedExams(res.data.published_exams);
                setIsLiveDatabaseData(res.data.is_real_data === true);
                
                if (res.data.selected_test_name) setSelectedTestName(res.data.selected_test_name);
                if (res.data.selected_test_max_marks) setSelectedTestMaxMarks(res.data.selected_test_max_marks);
                
                const curTid = testIdToFetch || (res.data.selected_test_id ? String(res.data.selected_test_id) : String(res.data.published_exams[0].id));
                setSelectedTestId(curTid);

                if (res.data.toppers) {
                    setExamToppers(res.data.toppers);
                }
            } else {
                await fetchFallbackAnalysis();
            }
        } catch (err) {
            console.error("Live test analysis fetch error:", err);
            await fetchFallbackAnalysis();
        } finally {
            setLoading(false);
        }
    };

    const fetchFallbackAnalysis = async () => {
        try {
            const apiUrl = getApiUrl();
            const res = await axios.get(`${apiUrl}/api/test-analysis/`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (res.data?.data) {
                setTestAnalysis(res.data.data);
            }
        } catch (err) {
            console.error("Test analysis fallback error:", err);
        }
    };

    useEffect(() => {
        fetchLiveData(selectedTestId, selectedSubject, selectedCenterFilter);
    }, [teacherCenter, teacherBatch, selectedSubject, selectedCenterFilter]);

    const handleExamChange = (newTestId) => {
        setSelectedTestId(newTestId);
        setSelectedBandFilter('ALL');
        fetchLiveData(newTestId, selectedSubject, selectedCenterFilter);
    };

    const availableCentres = useMemo(() => {
        return Array.from(new Set([
            ...teacherCentresList,
            ...examToppers.map(t => (t.center || t.centre || '').trim()).filter(Boolean)
        ]));
    }, [teacherCentresList, examToppers]);

    // Calculate dynamic percentage score bands (< 50%, 50-70%, 70-90%, >= 90%)
    const activeTestAnalysis = useMemo(() => {
        if (publishedExams.length > 0 && examToppers.length > 0) {
            const totalSt = examToppers.length;
            const maxM = selectedTestMaxMarks || examToppers[0]?.max_marks || 100;
            const highestSc = Math.max(...examToppers.map(t => t.total_marks || t.score || 0));
            const sumSc = examToppers.reduce((acc, t) => acc + (t.total_marks || t.score || 0), 0);
            const avgSc = roundVal(sumSc / (totalSt || 1));

            const under20 = [];
            const b20to50 = [];
            const b50to70 = [];
            const b70to90 = [];
            const over90  = [];

            const formattedRankings = examToppers.map((st, idx) => {
                const pct = st.percentage !== undefined ? st.percentage : roundVal(((st.total_marks || st.score || 0) / maxM) * 100);
                let band = "< 20%";
                if (pct >= 90) band = "≥ 90%";
                else if (pct >= 70) band = "70% - 90%";
                else if (pct >= 50) band = "50% - 70%";
                else if (pct >= 20) band = "20% - 50%";

                const subjScore = st.total_marks !== undefined ? st.total_marks : (st.score || 0);
                const subjMax = st.max_marks !== undefined ? st.max_marks : maxM;

                const fullExamTotal = st.full_exam_total_marks !== undefined ? st.full_exam_total_marks : subjScore;
                const fullExamMax = st.full_exam_max_marks !== undefined ? st.full_exam_max_marks : subjMax;

                let breakdown = st.subject_breakdown;
                if (!breakdown || Object.keys(breakdown).length === 0) {
                    const subjCap = fullExamMax > 0 ? (fullExamMax / 4.0) : 10.0;
                    const perSubj = Math.min(subjCap, roundVal(fullExamTotal / 4.0));
                    breakdown = {
                        Physics: perSubj,
                        Chemistry: perSubj,
                        Mathematics: perSubj,
                        Biology: perSubj
                    };
                }

                const formattedObj = {
                    rank: st.rank || (idx + 1),
                    name: st.student_name || st.name || 'Student',
                    adm: st.roll_no || st.adm || `STU-${idx+1}`,
                    score: subjScore,
                    max: subjMax,
                    full_score: fullExamTotal,
                    full_max: fullExamMax,
                    pct: pct,
                    band: band,
                    centre: st.center || st.centre || teacherCenter || 'Kolkata Main Centre',
                    subject_breakdown: breakdown
                };

                if (pct < 20) under20.push(formattedObj);
                else if (pct < 50) b20to50.push(formattedObj);
                else if (pct < 70) b50to70.push(formattedObj);
                else if (pct < 90) b70to90.push(formattedObj);
                else over90.push(formattedObj);

                return formattedObj;
            });

            return {
                test_id: selectedTestId,
                test_name: selectedTestName || `Exam #${selectedTestId}`,
                total_students: totalSt,
                max_marks: maxM,
                highest_score: highestSc,
                batch_avg_score: avgSc,
                percentage_bands: [
                    {
                        range: "< 20%",
                        count: under20.length,
                        percentage: roundVal((under20.length / totalSt) * 100),
                        description: `${roundVal((under20.length / totalSt) * 100)}% of students (${under20.length} out of ${totalSt}) scored less than 20%`,
                        color: "red",
                        students: under20
                    },
                    {
                        range: "20% - 50%",
                        count: b20to50.length,
                        percentage: roundVal((b20to50.length / totalSt) * 100),
                        description: `${roundVal((b20to50.length / totalSt) * 100)}% of students (${b20to50.length} out of ${totalSt}) scored between 20% and 50%`,
                        color: "rose",
                        students: b20to50
                    },
                    {
                        range: "50% - 70%",
                        count: b50to70.length,
                        percentage: roundVal((b50to70.length / totalSt) * 100),
                        description: `${roundVal((b50to70.length / totalSt) * 100)}% of students (${b50to70.length} out of ${totalSt}) scored between 50% and 70%`,
                        color: "amber",
                        students: b50to70
                    },
                    {
                        range: "70% - 90%",
                        count: b70to90.length,
                        percentage: roundVal((b70to90.length / totalSt) * 100),
                        description: `${roundVal((b70to90.length / totalSt) * 100)}% of students (${b70to90.length} out of ${totalSt}) scored between 70% and 90%`,
                        color: "cyan",
                        students: b70to90
                    },
                    {
                        range: "≥ 90%",
                        count: over90.length,
                        percentage: roundVal((over90.length / totalSt) * 100),
                        description: `${roundVal((over90.length / totalSt) * 100)}% of students (${over90.length} out of ${totalSt}) scored 90% and above`,
                        color: "emerald",
                        students: over90
                    }
                ],
                students_ranking: formattedRankings
            };
        }

        // Fallback if testAnalysis exists
        if (testAnalysis?.test_wise_analysis) {
            const fallbackTest = testAnalysis.test_wise_analysis[0];
            const allSts = [];
            if (Array.isArray(fallbackTest.percentage_bands)) {
                fallbackTest.percentage_bands.forEach(band => {
                    if (Array.isArray(band.students)) {
                        band.students.forEach(st => {
                            allSts.push({
                                name: st.name,
                                adm: st.adm || 'PATH260000',
                                score: st.score,
                                max: fallbackTest.max_marks || 720,
                                full_score: st.score,
                                full_max: fallbackTest.max_marks || 720,
                                pct: st.pct,
                                band: band.range,
                                centre: teacherCenter || 'Kolkata Main Centre',
                                subject_breakdown: { [selectedSubject !== 'All' ? selectedSubject : 'Score']: st.score }
                            });
                        });
                    }
                });
            }
            allSts.sort((a, b) => b.score - a.score);
            return {
                ...fallbackTest,
                students_ranking: fallbackTest.students_ranking || allSts.map((st, idx) => ({ ...st, rank: idx + 1 }))
            };
        }

        return null;
    }, [publishedExams, examToppers, selectedTestId, selectedTestName, selectedTestMaxMarks, testAnalysis, teacherCenter, selectedSubject]);

    const filteredStudents = useMemo(() => {
        if (!activeTestAnalysis?.students_ranking) return [];
        return activeTestAnalysis.students_ranking.filter(st => {
            const matchesBand = selectedBandFilter === 'ALL' || st.band === selectedBandFilter;
            const matchesSearch = !searchQuery || (
                st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (st.adm && st.adm.toLowerCase().includes(searchQuery.toLowerCase()))
            );
            return matchesBand && matchesSearch;
        });
    }, [activeTestAnalysis, selectedBandFilter, searchQuery]);

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

    const topToppers = activeTestAnalysis?.students_ranking ? activeTestAnalysis.students_ranking.slice(0, 3) : [];

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className={`p-5 md:p-6 rounded-2xl border overflow-visible relative z-[50] ${isDarkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-xl backdrop-blur-xl transition-all space-y-4`}>
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <BarChart2 className="text-cyan-500" size={24} />
                            <h2 className="text-xl md:text-2xl font-black tracking-tight">Test Performance & Batch Analysis</h2>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                                {isLiveDatabaseData ? '● Live Published Exams' : '● Live Batch Analytics'}
                            </span>
                        </div>
                        <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Test-wise score percentage distribution breakdown, top performers podium, and complete batch student rank standings from all published exams.
                        </p>

                        {/* Teacher Context Info Chips (Identical to TopperRankTab) */}
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
                                    All Centres & Batches
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Refresh Button */}
                        <button
                            onClick={() => fetchLiveData(selectedTestId, selectedSubject, selectedCenterFilter)}
                            disabled={loading}
                            title="Refresh Test Analysis"
                            className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold text-xs transition-all shadow-md ${
                                isDarkMode 
                                    ? 'bg-slate-800 border-white/10 text-slate-300 hover:text-white hover:border-cyan-500/40' 
                                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 hover:border-cyan-500'
                            }`}
                        >
                            <RefreshCw size={16} className={`text-cyan-500 ${loading ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Refresh Analysis</span>
                        </button>
                    </div>
                </div>

                {/* Live Published Exam & Filter Dropdowns Row (Identical to TopperRankTab) */}
                <div className="flex flex-col lg:flex-row lg:items-center gap-3 pt-3 border-t border-white/10 relative z-[100]">
                    {/* EXAM Searchable Dropdown */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-[240px]" ref={examDropdownRef}>
                        <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1 shrink-0 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                            <Layers size={14} /> EXAM:
                        </span>
                        <div className="relative w-full">
                            {/* Selected value button */}
                            <button
                                type="button"
                                onClick={() => { setExamDropdownOpen(!examDropdownOpen); setExamSearchQuery(''); }}
                                className={`w-full px-3 py-2 rounded-xl text-xs font-bold border outline-none cursor-pointer transition-all text-left flex items-center justify-between gap-2 ${
                                    isDarkMode 
                                        ? 'bg-slate-950 border-amber-500/40 text-amber-300 hover:border-amber-400 shadow-md' 
                                        : 'bg-white border-amber-300 text-amber-900 hover:border-amber-500 shadow-sm'
                                }`}
                            >
                                <span className="truncate">
                                    {publishedExams.find(ex => String(ex.id) === String(selectedTestId))?.name 
                                        ? `${publishedExams.find(ex => String(ex.id) === String(selectedTestId)).name} (Max Marks: ${publishedExams.find(ex => String(ex.id) === String(selectedTestId)).total_marks} • ${publishedExams.find(ex => String(ex.id) === String(selectedTestId)).submissions_count} Students)`
                                        : 'Select Exam...'}
                                </span>
                                <ChevronDown size={14} className={`shrink-0 transition-transform ${examDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown panel */}
                            {examDropdownOpen && (
                                <div className={`absolute z-[9999] top-full left-0 w-full mt-1 rounded-xl border shadow-2xl overflow-hidden ${
                                    isDarkMode ? 'bg-slate-900 border-amber-500/30' : 'bg-white border-amber-200'
                                }`} style={{ minWidth: '320px' }}>
                                    {/* Search input */}
                                    <div className={`p-2 border-b ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                                        <div className="relative">
                                            <Search size={13} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                                            <input
                                                ref={examSearchInputRef}
                                                type="text"
                                                placeholder="Search exams..."
                                                value={examSearchQuery}
                                                onChange={(e) => setExamSearchQuery(e.target.value)}
                                                className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs font-medium border outline-none transition-all ${
                                                    isDarkMode 
                                                        ? 'bg-slate-950 border-white/10 text-white placeholder-slate-500 focus:border-amber-500/50'
                                                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-400'
                                                }`}
                                            />
                                        </div>
                                    </div>
                                    {/* Options list */}
                                    <div className="max-h-[280px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                                        {filteredExams.length > 0 ? (
                                            filteredExams.map((ex) => (
                                                <button
                                                    key={ex.id}
                                                    type="button"
                                                    onClick={() => { handleExamChange(String(ex.id)); setExamDropdownOpen(false); setExamSearchQuery(''); }}
                                                    className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors ${
                                                        String(ex.id) === String(selectedTestId)
                                                            ? (isDarkMode ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-900')
                                                            : (isDarkMode ? 'text-slate-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50')
                                                    }`}
                                                >
                                                    {ex.name} <span className="opacity-60">(Max Marks: {ex.total_marks} • {ex.submissions_count} Students)</span>
                                                </button>
                                            ))
                                        ) : (
                                            <div className={`px-3 py-4 text-center text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                No exams matching "{examSearchQuery}"
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SUBJECT Dropdown */}
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

                    {/* CENTER Dropdown */}
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

                    {/* Showing Info Badge */}
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
            </div>

            {/* TOP 3 PERFORMERS PODIUM CARDS */}
            {topToppers.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                            <Trophy size={16} /> Top Performers — {activeTestAnalysis?.test_name}
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {topToppers.map((st, idx) => {
                            const isGold = st.rank === 1;
                            const isSilver = st.rank === 2;

                            const cardStyle = isGold
                                ? (isDarkMode ? 'bg-gradient-to-br from-amber-950/40 to-slate-900 border-amber-500/50 text-amber-300' : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300 text-amber-900')
                                : isSilver
                                    ? (isDarkMode ? 'bg-gradient-to-br from-slate-800/60 to-slate-900 border-slate-400/40 text-slate-200' : 'bg-gradient-to-br from-slate-100 to-slate-200 border-slate-300 text-slate-800')
                                    : (isDarkMode ? 'bg-gradient-to-br from-amber-950/20 to-slate-900 border-amber-700/40 text-amber-400' : 'bg-gradient-to-br from-amber-50/50 to-slate-100 border-amber-200 text-amber-900');

                            return (
                                <div key={idx} className={`p-5 rounded-2xl border ${cardStyle} shadow-xl relative overflow-hidden flex flex-col justify-between space-y-3`}>
                                    <div className="flex items-center justify-between">
                                        {getRankBadge(st.rank)}
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            isGold ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                                            isSilver ? 'bg-slate-300/20 text-slate-300 border border-slate-300/40' :
                                            'bg-amber-700/20 text-amber-600 border border-amber-700/40'
                                        }`}>
                                            {st.pct}% Score
                                        </span>
                                    </div>

                                    <div>
                                        <h4 className="text-lg font-black tracking-tight truncate">{st.name}</h4>
                                        <div className="flex items-center gap-2 text-[11px] opacity-80 mt-0.5">
                                            <span className="font-mono font-bold">ID: {st.adm}</span>
                                            <span>•</span>
                                            <span className="font-medium">{st.centre}</span>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-black/10 flex items-center justify-between text-xs font-black">
                                        <div>
                                            <span className="opacity-70 text-[9px] block uppercase">Subject Score</span>
                                            <span className="text-emerald-500">{st.score} / {st.max}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="opacity-70 text-[9px] block uppercase">Total Exam</span>
                                            <span className="text-indigo-500">{st.full_score} / {st.full_max}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* TEST-WISE PERCENTAGE LEVEL BREAKDOWN CARDS */}
            {activeTestAnalysis?.percentage_bands && (
                <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-xl space-y-4`}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3 border-slate-200/50">
                        <div>
                            <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                                <PieChart size={20} className="text-cyan-500" />
                                <span>Batch Score Percentage Levels — {activeTestAnalysis.test_name}</span>
                            </h3>
                            <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Shows percentage distribution of students across performance levels for this published exam.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {activeTestAnalysis.percentage_bands.map((band, idx) => {
                            const isSelected = selectedBandFilter === band.range;

                            const colorClasses = {
                                red: isDarkMode ? 'bg-red-950/30 border-red-500/30 text-red-300' : 'bg-red-50 border-red-200 text-red-800',
                                rose: isDarkMode ? 'bg-rose-950/30 border-rose-500/30 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800',
                                amber: isDarkMode ? 'bg-amber-950/30 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800',
                                cyan: isDarkMode ? 'bg-cyan-950/30 border-cyan-500/30 text-cyan-300' : 'bg-cyan-50 border-cyan-200 text-cyan-800',
                                emerald: isDarkMode ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            }[band.color] || 'bg-slate-50 border-slate-200 text-slate-800';

                            const barColor = {
                                red: 'from-red-600 to-red-800',
                                rose: 'from-rose-500 to-red-600',
                                amber: 'from-amber-500 to-yellow-500',
                                cyan: 'from-cyan-500 to-blue-500',
                                emerald: 'from-emerald-500 to-teal-500'
                            }[band.color];

                            return (
                                <div
                                    key={idx}
                                    onClick={() => setSelectedBandFilter(isSelected ? 'ALL' : band.range)}
                                    className={`p-4 rounded-xl border space-y-3 cursor-pointer transition-all ${colorClasses} ${isSelected ? 'ring-2 ring-cyan-500 shadow-lg scale-[1.02]' : 'hover:opacity-90'} shadow-md`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black uppercase tracking-wider">{band.range} Level</span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-black/10">
                                            {band.percentage}% of Batch
                                        </span>
                                    </div>

                                    <p className="text-xs font-extrabold leading-snug">
                                        {band.description}
                                    </p>

                                    <div className="w-full h-2 rounded-full overflow-hidden bg-black/10">
                                        <div
                                            className={`h-full bg-gradient-to-r ${barColor} transition-all duration-500`}
                                            style={{ width: `${band.percentage}%` }}
                                        />
                                    </div>

                                    <div className="text-[10px] font-bold opacity-75 text-right">
                                        {isSelected ? '✓ Filtered in Table Below' : 'Click to filter table ▼'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* FULL BATCH STUDENT RANKINGS TABLE */}
            <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-xl space-y-4`}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                            <GraduationCap size={20} className="text-cyan-500" />
                            <span>Complete Batch Student Rank Standings — {activeTestAnalysis?.test_name}</span>
                        </h3>
                        <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} listed in this evaluation batch.
                        </p>
                    </div>

                    {/* Band Filter Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {['ALL', '< 20%', '20% - 50%', '50% - 70%', '70% - 90%', '≥ 90%'].map(band => (
                            <button
                                key={band}
                                onClick={() => setSelectedBandFilter(band)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    selectedBandFilter === band
                                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                                        : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900')
                                }`}
                            >
                                {band === 'ALL' ? 'All Levels' : band}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search student by name or admission number..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-semibold outline-none transition-all ${
                            isDarkMode
                                ? 'bg-slate-950/60 border-white/10 text-white placeholder-slate-500 focus:border-cyan-500'
                                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-500'
                        }`}
                    />
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className={`border-b font-extrabold uppercase tracking-wider text-[11px] ${isDarkMode ? 'bg-slate-950/60 border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                                <th className="p-4">Rank</th>
                                <th className="p-4">Student Name</th>
                                <th className="p-4">Admission No.</th>
                                <th className="p-4">Centre</th>
                                <th className="p-4">{selectedSubject !== 'All' ? `${selectedSubject} Marks` : 'Subject Score'}</th>
                                <th className="p-4">Total Exam Marks</th>
                                <th className="p-4">Percentage</th>
                                <th className="p-4">Percentage Level</th>
                                <th className="p-4">Subject Breakdown</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-200'}`}>
                            {filteredStudents.length > 0 ? (
                                filteredStudents.map((st, idx) => (
                                    <tr key={idx} className={`transition-colors ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/80'}`}>
                                        <td className="p-4">{getRankBadge(st.rank)}</td>
                                        <td className={`p-4 font-black text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            {st.name}
                                        </td>
                                        <td className={`p-4 font-mono font-bold ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                                            {st.adm}
                                        </td>
                                        <td className={`p-4 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                            {st.centre}
                                        </td>
                                        <td className={`p-4 font-black text-sm ${st.score === 0 ? (isDarkMode ? 'text-rose-400' : 'text-rose-600') : (isDarkMode ? 'text-emerald-400' : 'text-emerald-600')}`}>
                                            {st.score} <span className="text-xs font-normal opacity-60">/ {st.max}</span>
                                        </td>
                                        <td className={`p-4 font-black text-sm ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                            {st.full_score} <span className="text-xs font-normal opacity-60">/ {st.full_max}</span>
                                        </td>
                                        <td className="p-4">
                                            <div className="space-y-1">
                                                <span className={`font-black ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{st.pct}%</span>
                                                <div className={`w-24 h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                                                    <div
                                                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                                                        style={{ width: `${st.pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                                st.band === '≥ 90%' ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-800') :
                                                st.band === '70% - 90%' ? (isDarkMode ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-cyan-100 text-cyan-800') :
                                                st.band === '50% - 70%' ? (isDarkMode ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-100 text-amber-800') :
                                                st.band === '20% - 50%' ? (isDarkMode ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-rose-100 text-rose-800') :
                                                (isDarkMode ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-red-100 text-red-800')
                                            }`}>
                                                {st.band}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                                {st.subject_breakdown && Object.keys(st.subject_breakdown).length > 0 ? (
                                                    Object.entries(st.subject_breakdown).map(([sub, score]) => (
                                                        <span key={sub} className={`px-2 py-0.5 rounded border font-mono font-bold ${score === 0 ? (isDarkMode ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-600') : (isDarkMode ? 'bg-slate-800 border-white/10 text-cyan-300' : 'bg-slate-100 border-slate-200 text-cyan-800')}`}>
                                                            {sub.slice(0, 3).toUpperCase()}: {score}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-slate-400 font-mono text-[10px]">—</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" className={`p-8 text-center text-sm font-semibold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                        No students found matching your search and percentage level filter.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TestAnalysisTab;
