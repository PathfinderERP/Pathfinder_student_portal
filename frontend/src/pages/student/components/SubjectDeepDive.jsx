import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, ChevronDown, ChevronRight, CheckCircle2,
    XCircle, MinusCircle, BookOpen, Target, Loader2,
    AlertCircle, TrendingUp, TrendingDown, BarChart3
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';

// ─── helpers ────────────────────────────────────────────────────────────────
const colorForPct = (pct) => {
    if (pct >= 70) return { bar: 'from-emerald-500 to-teal-500', badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', label: 'Strong' };
    if (pct >= 40) return { bar: 'from-amber-400 to-orange-500', badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20', label: 'Average' };
    return { bar: 'from-rose-500 to-pink-600', badge: 'bg-rose-500/10 text-rose-500 border-rose-500/20', label: 'Weak' };
};

const StatPill = ({ icon: Icon, value, label, color, isDark }) => (
    <div className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl border ${isDark ? 'bg-white/4 border-white/8' : 'bg-slate-50 border-slate-100'}`}>
        <Icon size={14} className={color} />
        <span className={`text-base font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</span>
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</span>
    </div>
);

// ─── Topic Row ───────────────────────────────────────────────────────────────
const TopicRow = ({ topic, isDark, delay }) => {
    const col = colorForPct(topic.percentage);
    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay }}
            className={`flex items-center gap-4 p-3 rounded-xl border ${isDark ? 'bg-white/3 border-white/5 hover:bg-white/6' : 'bg-white border-slate-100 hover:bg-slate-50'} transition-colors duration-200`}
        >
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-bold truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{topic.name}</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ml-2 shrink-0 ${col.badge}`}>{col.label}</span>
                </div>
                <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/8' : 'bg-slate-100'}`}>
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${topic.percentage}%` }}
                        transition={{ duration: 1, delay: delay + 0.2 }}
                        className={`h-full rounded-full bg-gradient-to-r ${col.bar}`}
                    />
                </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1 text-emerald-500">
                    <CheckCircle2 size={11} />
                    <span className="text-[10px] font-black">{topic.correct}</span>
                </div>
                <div className="flex items-center gap-1 text-rose-500">
                    <XCircle size={11} />
                    <span className="text-[10px] font-black">{topic.incorrect}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                    <MinusCircle size={11} />
                    <span className="text-[10px] font-black">{topic.unattempted}</span>
                </div>
                <span className={`text-xs font-black w-10 text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{topic.percentage}%</span>
            </div>
        </motion.div>
    );
};

// ─── Chapter Card ────────────────────────────────────────────────────────────
const ChapterCard = ({ chapter, idx, isDark }) => {
    const [open, setOpen] = useState(idx === 0);
    const col = colorForPct(chapter.percentage);

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.07 }}
            className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-[#0f172a] border-white/6' : 'bg-white border-slate-200 shadow-md shadow-slate-100'}`}
        >
            {/* Chapter Header */}
            <button
                onClick={() => setOpen(!open)}
                className={`w-full flex items-center gap-4 p-5 text-left transition-colors duration-200 ${isDark ? 'hover:bg-white/3' : 'hover:bg-slate-50'}`}
            >
                {/* Rank badge */}
                <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black border ${col.badge}`}>
                    {idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className={`text-sm font-black uppercase tracking-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {chapter.name}
                        </h4>
                        <span className={`text-xs font-black ml-3 shrink-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {chapter.percentage}%
                        </span>
                    </div>
                    <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/8' : 'bg-slate-100'}`}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${chapter.percentage}%` }}
                            transition={{ duration: 1.2, delay: idx * 0.07 + 0.3 }}
                            className={`h-full rounded-full bg-gradient-to-r ${col.bar}`}
                        />
                    </div>
                </div>

                {/* Stats mini-row */}
                <div className="flex items-center gap-4 shrink-0 ml-2">
                    <div className="flex items-center gap-1 text-emerald-500">
                        <CheckCircle2 size={13} />
                        <span className="text-xs font-black">{chapter.correct}</span>
                    </div>
                    <div className="flex items-center gap-1 text-rose-500">
                        <XCircle size={13} />
                        <span className="text-xs font-black">{chapter.incorrect}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                        <MinusCircle size={13} />
                        <span className="text-xs font-black">{chapter.unattempted}</span>
                    </div>
                    {open ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                </div>
            </button>

            {/* Topics Accordion */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className={`px-5 pb-5 space-y-2 ${isDark ? 'border-t border-white/5' : 'border-t border-slate-100'} pt-4`}>
                            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 mb-3">
                                Topic Breakdown — {chapter.topics.length} topics
                            </p>
                            {chapter.topics.map((topic, ti) => (
                                <TopicRow key={ti} topic={topic} isDark={isDark} delay={ti * 0.05} />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const SubjectDeepDive = ({ subject, isDarkMode, onBack }) => {
    const { token, getApiUrl } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [aggregated, setAggregated] = useState(null); // { chapters: [...], testCount }

    useEffect(() => {
        if (!subject || !token) return;
        // Scroll to top when deep dive opens
        const el = document.querySelector('main');
        if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        fetchAnalysis();
    }, [subject, token]);

    const handleBack = (e) => {
        e.preventDefault();
        // Scroll to top before going back
        const el = document.querySelector('main');
        if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Call the parent's back handler
        onBack();
    };

    const fetchAnalysis = async () => {
        setLoading(true);
        setError(null);
        const apiUrl = getApiUrl();
        const tests = subject.tests || [];

        if (!tests.length) {
            setError('No test data available for this subject.');
            setLoading(false);
            return;
        }

        try {
            // Fetch analysis for each test (filter by section = subject name)
            const results = await Promise.allSettled(
                tests.map(t =>
                    axios.get(
                        `${apiUrl}/api/tests/${t.id}/my_analysis/?section=${encodeURIComponent(subject.name)}`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    )
                )
            );

            // Aggregate chapter/topic data across all tests
            const chapterMap = {}; // chapter_name -> { correct, incorrect, unattempted, total, score, max_score, topics: {topic_name: {...}} }
            let testCount = 0;

            results.forEach(r => {
                if (r.status !== 'fulfilled') return;
                const data = r.value.data;
                if (!data.chapters || data.chapters.length === 0) return;
                testCount++;

                data.chapters.forEach(chap => {
                    if (!chapterMap[chap.name]) {
                        chapterMap[chap.name] = { correct: 0, incorrect: 0, unattempted: 0, total: 0, score: 0, max_score: 0, topics: {} };
                    }
                    const c = chapterMap[chap.name];
                    c.correct += chap.correct;
                    c.incorrect += chap.incorrect;
                    c.unattempted += chap.unattempted;
                    c.total += chap.total;
                    c.score += chap.score;
                    c.max_score += chap.max_score;

                    chap.topics.forEach(topic => {
                        if (!c.topics[topic.name]) {
                            c.topics[topic.name] = { correct: 0, incorrect: 0, unattempted: 0, total: 0, score: 0, max_score: 0 };
                        }
                        const t = c.topics[topic.name];
                        t.correct += topic.correct;
                        t.incorrect += topic.incorrect;
                        t.unattempted += topic.unattempted;
                        t.total += topic.total;
                        t.score += topic.score;
                        t.max_score += topic.max_score;
                    });
                });
            });

            // Convert to sorted arrays
            const chapters = Object.entries(chapterMap).map(([name, c]) => {
                const pct = c.max_score > 0 ? Math.max(0, (c.score / c.max_score) * 100) : 0;
                const topics = Object.entries(c.topics).map(([tname, td]) => {
                    const tpct = td.max_score > 0 ? Math.max(0, (td.score / td.max_score) * 100) : 0;
                    return { name: tname, ...td, percentage: parseFloat(tpct.toFixed(1)) };
                }).sort((a, b) => b.percentage - a.percentage);
                return { name, ...c, percentage: parseFloat(pct.toFixed(1)), topics };
            }).sort((a, b) => b.percentage - a.percentage);

            setAggregated({ chapters, testCount });
        } catch (e) {
            console.error(e);
            setError('Failed to load chapter analysis. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Overall stats from aggregated chapters
    const overallStats = useMemo(() => {
        if (!aggregated) return null;
        const totals = aggregated.chapters.reduce((acc, c) => ({
            correct: acc.correct + c.correct,
            incorrect: acc.incorrect + c.incorrect,
            unattempted: acc.unattempted + c.unattempted,
            total: acc.total + c.total,
            score: acc.score + c.score,
            max_score: acc.max_score + c.max_score,
        }), { correct: 0, incorrect: 0, unattempted: 0, total: 0, score: 0, max_score: 0 });

        totals.accuracy = totals.total > 0 ? Math.round((totals.correct / (totals.correct + totals.incorrect || 1)) * 100) : 0;
        totals.percentage = totals.max_score > 0 ? Math.max(0, (totals.score / totals.max_score) * 100).toFixed(1) : 0;
        return totals;
    }, [aggregated]);

    const gradients = {
        blue: 'from-blue-500 to-indigo-600',
        purple: 'from-purple-500 to-fuchsia-600',
        emerald: 'from-emerald-500 to-teal-600',
        orange: 'from-orange-500 to-amber-600',
        rose: 'from-rose-500 to-pink-600',
        cyan: 'from-cyan-500 to-blue-600',
    };
    const gradient = gradients[subject?.color] || gradients.blue;

    return (
        <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Back + Header */}
            <div className={`p-8 rounded-2xl border relative overflow-hidden ${isDarkMode ? 'bg-[#0f172a] border-white/6 shadow-2xl' : 'bg-white border-slate-200 shadow-xl shadow-slate-100'}`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-[0.04] pointer-events-none`} />
                <button
                    type="button"
                    onClick={handleBack}
                    className={`relative z-10 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-6 transition-all hover:gap-3 ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    <ArrowLeft size={14} /> Back to Performance
                </button>

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-xl shrink-0`}>
                        <span className="text-white font-black text-2xl">{subject?.name?.[0]}</span>
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-1">Subject Deep-Dive</p>
                        <h2 className={`text-3xl font-black uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {subject?.name}
                        </h2>
                        <p className={`text-xs font-medium mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Chapter-wise & Topic-wise analysis · {subject?.count || 0} assessments
                        </p>
                    </div>
                    {overallStats && (
                        <div className={`text-center px-8 py-4 rounded-xl border shrink-0 ${isDarkMode ? 'bg-white/4 border-white/8' : 'bg-slate-50 border-slate-200'}`}>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Overall Score</p>
                            <p className={`text-4xl font-black tracking-tighter bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
                                {overallStats.percentage}%
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className={`flex flex-col items-center justify-center py-24 rounded-2xl border ${isDarkMode ? 'bg-[#0f172a] border-white/5' : 'bg-white border-slate-200'}`}>
                    <Loader2 size={36} className="text-blue-500 animate-spin mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Analysing chapters & topics…</p>
                </div>
            )}

            {/* Error */}
            {!loading && error && (
                <div className={`flex flex-col items-center py-20 rounded-2xl border text-center ${isDarkMode ? 'bg-red-500/5 border-red-500/10' : 'bg-red-50 border-red-100'}`}>
                    <AlertCircle size={40} className="text-red-500 mb-3" />
                    <p className="text-sm font-black text-red-500 mb-2">{error}</p>
                    <button onClick={fetchAnalysis} className="mt-4 px-6 py-2.5 bg-red-500 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-red-600 transition-colors">
                        Retry
                    </button>
                </div>
            )}

            {/* Content */}
            {!loading && !error && aggregated && (
                <>
                    {/* Summary Stats Bar */}
                    {overallStats && (
                        <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-[#0f172a] border-white/6' : 'bg-white border-slate-200 shadow-md'}`}>
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mb-4">Aggregated Performance Summary</p>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                                <StatPill icon={BarChart3} value={overallStats.total} label="Questions" color="text-blue-500" isDark={isDarkMode} />
                                <StatPill icon={CheckCircle2} value={overallStats.correct} label="Correct" color="text-emerald-500" isDark={isDarkMode} />
                                <StatPill icon={XCircle} value={overallStats.incorrect} label="Incorrect" color="text-rose-500" isDark={isDarkMode} />
                                <StatPill icon={MinusCircle} value={overallStats.unattempted} label="Skipped" color="text-slate-400" isDark={isDarkMode} />
                                <StatPill icon={Target} value={`${overallStats.accuracy}%`} label="Accuracy" color="text-indigo-500" isDark={isDarkMode} />
                                <StatPill icon={BookOpen} value={aggregated.testCount} label="Tests" color="text-amber-500" isDark={isDarkMode} />
                            </div>
                        </div>
                    )}

                    {/* Legend */}
                    <div className="flex flex-wrap items-center gap-4 px-1">
                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Legend:</p>
                        {[
                            { icon: CheckCircle2, color: 'text-emerald-500', label: 'Correct' },
                            { icon: XCircle, color: 'text-rose-500', label: 'Incorrect' },
                            { icon: MinusCircle, color: 'text-slate-400', label: 'Skipped' },
                        ].map(({ icon: Icon, color, label }) => (
                            <div key={label} className="flex items-center gap-1.5">
                                <Icon size={12} className={color} />
                                <span className="text-[10px] font-bold text-slate-500">{label}</span>
                            </div>
                        ))}
                    </div>

                    {/* No Data */}
                    {aggregated.chapters.length === 0 ? (
                        <div className={`flex flex-col items-center py-20 rounded-2xl border border-dashed text-center opacity-50 ${isDarkMode ? 'border-white/10' : 'border-slate-300'}`}>
                            <BookOpen size={40} className="mb-3" />
                            <p className="text-sm font-black uppercase tracking-widest">No chapter data found</p>
                            <p className="text-xs font-medium mt-2 text-slate-500">Questions may not have chapters/topics assigned yet.</p>
                        </div>
                    ) : (
                        /* Chapter Cards */
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h3 className={`text-sm font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    Chapter Analysis
                                </h3>
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                                    {aggregated.chapters.length} chapters · Sorted by score
                                </span>
                            </div>
                            {aggregated.chapters.map((chapter, idx) => (
                                <ChapterCard key={idx} chapter={chapter} idx={idx} isDark={isDarkMode} />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default SubjectDeepDive;
