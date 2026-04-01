import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Loader2, AlertCircle, BookOpen, CheckCircle2, XCircle, MinusCircle, Clock } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';

// ────────────────────────────────────────────────────────────────────
// Minimal SVG Pie Chart (pure CSS/SVG, no external lib needed)
// ────────────────────────────────────────────────────────────────────
const PieChart = ({ data, size = 160 }) => {
    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) return (
        <div style={{ width: size, height: size }} className="flex items-center justify-center rounded-full border-4 border-dashed border-slate-300/30">
            <span className="text-[10px] font-black opacity-30 uppercase tracking-widest text-center">No<br/>Data</span>
        </div>
    );

    let cumulative = 0;
    const radius = size / 2;
    const cx = radius;
    const cy = radius;
    const r = radius - 4;

    const slices = data.map(d => {
        const pct = d.value / total;
        const start = cumulative;
        cumulative += pct;
        return { ...d, start, end: cumulative, pct };
    }).filter(d => d.pct > 0);

    const polarToCartesian = (cx, cy, r, angle) => {
        const rad = (angle - 90) * (Math.PI / 180);
        return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
    };

    const arcPath = (cx, cy, r, startPct, endPct) => {
        const s = polarToCartesian(cx, cy, r, startPct * 360);
        const e = polarToCartesian(cx, cy, r, endPct * 360);
        const large = (endPct - startPct) > 0.5 ? 1 : 0;
        return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
    };

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {slices.map((s, i) => (
                <path
                    key={i}
                    d={arcPath(cx, cy, r, s.start, s.end)}
                    fill={s.color}
                    stroke="rgba(0,0,0,0.15)"
                    strokeWidth={1}
                    className="transition-all hover:opacity-90"
                />
            ))}
            <circle cx={cx} cy={cy} r={r * 0.38} fill="rgba(0,0,0,0.15)" />
        </svg>
    );
};

// ────────────────────────────────────────────────────────────────────
// Simple stat badge
// ────────────────────────────────────────────────────────────────────
const StatBadge = ({ icon: Icon, label, value, color, bg }) => (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-[5px] border ${bg}`}>
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0`} style={{ background: color }} />
        <span className="text-[10px] font-black uppercase tracking-wider opacity-70">{label}</span>
        <span className="text-sm font-black ml-auto">{value}</span>
    </div>
);

// ────────────────────────────────────────────────────────────────────
// Horizontal bar (for compact counts)
// ────────────────────────────────────────────────────────────────────
const Bar = ({ value, total, color }) => {
    const pct = total > 0 ? (value / total) * 100 : 0;
    return (
        <div className="flex items-center gap-2 w-full">
            <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="text-[10px] font-black w-8 text-right opacity-70">{pct.toFixed(0)}%</span>
        </div>
    );
};

// ────────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────────
const QuestionAnalysis = ({ testId, testName, onBack }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();

    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeSection, setActiveSection] = useState(0);

    useEffect(() => {
        const fetch = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const apiUrl = getApiUrl();
                const res = await axios.get(
                    `${apiUrl}/api/tests/${testId}/question_analysis/`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setData(res.data);
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load analysis.');
            } finally {
                setIsLoading(false);
            }
        };
        fetch();
    }, [testId]);

    const PIE_COLORS = {
        correct:      '#22c55e',
        incorrect:    '#ef4444',
        partial:      '#f97316',
        not_attempted:'#94a3b8',
    };

    const buildPieData = (q) => [
        { label: 'Correct Attempt',   value: q.correct,       color: PIE_COLORS.correct },
        { label: 'Incorrect Attempt', value: q.incorrect,     color: PIE_COLORS.incorrect },
        { label: 'Partial Attempt',   value: q.partial,       color: PIE_COLORS.partial },
        { label: 'Not Attempt',       value: q.not_attempted, color: PIE_COLORS.not_attempted },
    ];

    // ── Loading ──────────────────────────────────────────────────────
    if (isLoading) return (
        <div className="animate-in fade-in duration-500 flex flex-col gap-8">
            <div className={`p-8 rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className={`p-2.5 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}><ArrowLeft size={18} /></button>
                    <div>
                        <h2 className="text-2xl font-black uppercase">Question <span className="text-green-500">Analysis</span></h2>
                        <p className={`text-xs font-bold mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{testName}</p>
                    </div>
                </div>
            </div>
            <div className="flex flex-col items-center gap-4 py-24 opacity-60">
                <Loader2 size={40} className="animate-spin text-green-500" />
                <p className="text-sm font-black uppercase tracking-widest">Computing question statistics...</p>
            </div>
        </div>
    );

    // ── Error ────────────────────────────────────────────────────────
    if (error) return (
        <div className="animate-in fade-in duration-500 flex flex-col gap-8">
            <div className={`p-8 rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className={`p-2.5 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}><ArrowLeft size={18} /></button>
                    <h2 className="text-2xl font-black uppercase">Question <span className="text-green-500">Analysis</span></h2>
                </div>
            </div>
            <div className="flex flex-col items-center gap-3 py-20 opacity-60">
                <AlertCircle size={44} className="text-red-500" />
                <p className="font-black uppercase tracking-widest text-sm">{error}</p>
            </div>
        </div>
    );

    const sections = data?.sections || [];
    const currentSection = sections[activeSection] || {};
    const questions = currentSection.questions || [];

    // Total submitted students across this section (take from first question's total)
    const totalStudents = questions[0]?.total ?? 0;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">

            {/* ── Header ─────────────────────────────────────────── */}
            <div className={`p-8 rounded-[5px] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className={`p-2.5 rounded-[5px] border transition-all hover:scale-110 ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-slate-700' : 'bg-slate-50 border-slate-200 hover:bg-slate-900 hover:text-white'}`}
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight">
                                Question <span className="text-green-500">Analysis</span>
                            </h2>
                            <p className={`text-xs font-bold mt-1 uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                {data.test_name} &nbsp;·&nbsp; ({data.test_code}) &nbsp;·&nbsp; {data.duration} mins
                            </p>
                        </div>
                    </div>

                    {/* Overall stats bar */}
                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-wider">
                        <div className={`px-4 py-2 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                            <span className="opacity-50">Total Attempted</span>&nbsp;
                            <span className="text-sm">{totalStudents}</span>
                        </div>
                        <div className={`px-4 py-2 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                            <span className="opacity-50">Questions</span>&nbsp;
                            <span className="text-sm">{questions.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Section Tabs ────────────────────────────────────── */}
            {sections.length > 1 && (
                <div className="flex flex-wrap gap-2">
                    {sections.map((sec, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveSection(i)}
                            className={`px-5 py-2.5 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all border ${
                                activeSection === i
                                    ? 'bg-green-600 border-green-600 text-white shadow-lg shadow-green-600/20'
                                    : (isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-200 hover:bg-slate-50')
                            }`}
                        >
                            {sec.name}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Legend ─────────────────────────────────────────── */}
            <div className={`p-5 rounded-[5px] border flex flex-wrap items-center gap-4 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100'}`}>
                {[
                    { label: 'Correct Attempt',   color: PIE_COLORS.correct },
                    { label: 'Incorrect Attempt', color: PIE_COLORS.incorrect },
                    { label: 'Partial Attempt',   color: PIE_COLORS.partial },
                    { label: 'Not Attempt',       color: PIE_COLORS.not_attempted },
                ].map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: item.color }} />
                        <span className="text-[10px] font-black uppercase tracking-wider opacity-70">{item.label}</span>
                    </div>
                ))}
            </div>

            {/* ── Question Cards ──────────────────────────────────── */}
            {questions.length === 0 ? (
                <div className={`p-16 rounded-[5px] border text-center ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100'}`}>
                    <div className="opacity-20 flex flex-col items-center gap-3">
                        <BookOpen size={48} />
                        <p className="text-sm font-black uppercase tracking-[0.2em]">No Questions Found</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {questions.map((q, qi) => {
                        const pieData = buildPieData(q);
                        const total = q.total;
                        const attended = total - q.not_attempted;
                        const pctAttended = total > 0 ? ((attended / total) * 100).toFixed(1) : 0;

                        return (
                            <div
                                key={q.id}
                                className={`rounded-[5px] border overflow-hidden shadow-lg transition-all hover:shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/30' : 'bg-white border-slate-100 shadow-slate-100'}`}
                            >
                                {/* Question header strip */}
                                <div className={`px-6 py-3 border-b flex items-center justify-between flex-wrap gap-2 ${isDarkMode ? 'bg-white/[0.03] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-green-500">
                                            Question No: {qi + 1}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}>
                                            {currentSection.name}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}>
                                            {q.type.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest opacity-60">
                                        <span className="text-green-400">+{q.correct_marks} Max</span>
                                        <span className="text-red-400">-{q.negative_marks} Neg</span>
                                        <span>{pctAttended}% Attempted</span>
                                    </div>
                                </div>

                                {/* Content + Chart row */}
                                <div className="flex flex-col md:flex-row gap-0">
                                    {/* Question text (left ~60%) */}
                                    <div className={`flex-1 px-6 py-5 border-r ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                                        <div
                                            className={`text-sm leading-relaxed font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'} [&_img]:max-w-xs [&_img]:rounded`}
                                            dangerouslySetInnerHTML={{ __html: q.content || '<span class="opacity-30 italic">No question text</span>' }}
                                        />

                                        {/* Options (for Choice questions) */}
                                        {q.options && q.options.length > 0 && (
                                            <div className="mt-8 space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-500/20 to-transparent" />
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 whitespace-nowrap">Options & Analysis</span>
                                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-500/20 to-transparent" />
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {q.options.map((opt, idx) => (
                                                        <div 
                                                            key={opt.id} 
                                                            className={`group flex items-start gap-4 p-4 rounded-[5px] border transition-all duration-300 ${
                                                                opt.isCorrect 
                                                                    ? (isDarkMode ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200 shadow-lg shadow-green-500/5') 
                                                                    : (isDarkMode ? 'bg-white/2 border-white/5 hover:bg-white/5' : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50')
                                                            }`}
                                                        >
                                                            <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border transition-all duration-300 ${
                                                                opt.isCorrect
                                                                    ? 'bg-green-500 border-green-600 text-white scale-110 shadow-lg shadow-green-500/30'
                                                                    : (isDarkMode ? 'bg-white/5 border-white/10 opacity-30 group-hover:opacity-60' : 'bg-white border-slate-200 opacity-40 group-hover:opacity-70')
                                                            }`}>
                                                                {String.fromCharCode(65 + idx)}
                                                            </div>
                                                            <div className="flex-1 space-y-1">
                                                                <div 
                                                                    className={`text-xs font-bold leading-relaxed ${opt.isCorrect ? (isDarkMode ? 'text-green-400' : 'text-green-700') : (isDarkMode ? 'text-slate-400' : 'text-slate-600')}`}
                                                                    dangerouslySetInnerHTML={{ __html: opt.content }} 
                                                                />
                                                            </div>
                                                            {opt.isCorrect && (
                                                                <div className="p-1 rounded-full bg-green-500/20 text-green-500">
                                                                    <CheckCircle2 size={14} strokeWidth={3} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Solution / Explanation */}
                                        {q.solution && (
                                            <div className="mt-8 pt-8 border-t border-dashed border-slate-500/20">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="p-2 rounded-[5px] bg-amber-500/10 text-amber-500">
                                                        <FileText size={16} />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Explanation / Solution</span>
                                                </div>
                                                <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-amber-500/5 border-amber-500/10 shadow-black/20' : 'bg-amber-50/50 border-amber-100 shadow-amber-500/5'} shadow-lg`}>
                                                    <div 
                                                        className={`text-sm leading-relaxed font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'} [&_img]:max-w-xs [&_img]:rounded`}
                                                        dangerouslySetInnerHTML={{ __html: q.solution }} 
                                                    />
                                                </div>
                                            </div>
                                        )}


                                        {/* Numerical/Integer Answer */}
                                        {(q.type === 'NUMERICAL' || q.type === 'INTEGER_TYPE') && q.answer_from !== null && (
                                            <div className="mt-8 pt-8 border-t border-dashed border-slate-500/20">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="p-2 rounded-[5px] bg-blue-500/10 text-blue-500">
                                                        <Clock size={16} />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Correct Answer Key</span>
                                                </div>
                                                <div className={`p-6 rounded-[5px] border flex flex-col sm:flex-row items-center gap-6 ${isDarkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200 shadow-lg shadow-blue-500/5'}`}>
                                                    <div className="flex-1 text-center sm:text-left">
                                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">Expected Range</p>
                                                        <p className="text-2xl font-black text-blue-500 tracking-tight">
                                                            {q.answer_from} <span className="text-sm font-bold opacity-30 mx-2">to</span> {q.answer_to}
                                                        </p>
                                                    </div>
                                                    <div className={`h-12 w-[1px] hidden sm:block ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-500/10'}`} />
                                                    <div className="text-center sm:text-right">
                                                        <span className={`px-4 py-2 rounded-[5px] text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-white text-blue-600 border border-blue-100'}`}>
                                                            Numerical Input
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Pie chart + stats (right ~40%) */}
                                    <div className="md:w-80 flex-shrink-0 px-6 py-5 flex flex-col items-center gap-5">
                                        <PieChart data={pieData} size={170} />

                                        {/* Stat rows */}
                                        <div className="w-full space-y-2">
                                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider mb-1">
                                                <span className="opacity-40">Breakdown</span>
                                                <span className="opacity-40">Count</span>
                                            </div>
                                            {[
                                                { label: 'Correct',      value: q.correct,       color: PIE_COLORS.correct,      bg: isDarkMode ? 'bg-green-500/5 border-green-500/10' : 'bg-green-50 border-green-100' },
                                                { label: 'Incorrect',    value: q.incorrect,     color: PIE_COLORS.incorrect,    bg: isDarkMode ? 'bg-red-500/5 border-red-500/10' : 'bg-red-50 border-red-100' },
                                                { label: 'Partial',      value: q.partial,       color: PIE_COLORS.partial,      bg: isDarkMode ? 'bg-orange-500/5 border-orange-500/10' : 'bg-orange-50 border-orange-100' },
                                                { label: 'Not Attempted',value: q.not_attempted, color: PIE_COLORS.not_attempted,bg: isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100' },
                                            ].map(item => (
                                                <div key={item.label} className={`px-3 py-2 rounded-[5px] border ${item.bg}`}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                                                            <span className="text-[9px] font-black uppercase tracking-wider opacity-70">{item.label}</span>
                                                        </div>
                                                        <span className="text-xs font-black">{item.value}</span>
                                                    </div>
                                                    <Bar value={item.value} total={q.total} color={item.color} />
                                                </div>
                                            ))}
                                        </div>
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

export default QuestionAnalysis;
