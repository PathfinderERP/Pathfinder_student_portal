import React, { useState, useEffect } from 'react';
import {
    ChevronRight, ArrowLeft, Award, Target,
    CheckCircle2, XCircle, Clock, Calendar,
    BarChart3, LayoutDashboard, Microscope,
    BookOpen, PieChart, Activity, Loader2
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';

const StudentPerformanceAnalysis = ({ student, test, onBack }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [activeTab, setActiveTab] = useState('Score Overview');
    const [activeSolutionSection, setActiveSolutionSection] = useState(null);
    const [expandedSolution, setExpandedSolution] = useState({});
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const tabs = ['Score Overview', 'Compare Result', 'Section Wise Result', 'Solution'];

    useEffect(() => {
        const fetchPerformance = async () => {
            if (!test?.id || !student?.enrollment) return;
            setIsLoading(true);
            setError(null);
            try {
                const apiUrl = getApiUrl();
                const res = await axios.get(
                    `${apiUrl}/api/tests/${test.id}/student_performance/?enrollment=${encodeURIComponent(student.enrollment)}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setData(res.data);
                if (res.data.all_section_names?.length > 0) {
                    setActiveSolutionSection(res.data.all_section_names[0]);
                }
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load performance data.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchPerformance();
    }, [test, student]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-6 opacity-50">
                <Loader2 size={50} className="animate-spin text-blue-500" />
                <span className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    Loading Performance Data...
                </span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-4 opacity-40">
                <XCircle size={50} />
                <p className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{error}</p>
                <button onClick={onBack} className="text-xs font-black text-blue-600 uppercase tracking-widest hover:underline">← Back</button>
            </div>
        );
    }

    const cardBg = isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/40';
    const maxScore = data?.section_stats?.reduce((acc, s) => acc + s.total_max, 0) || 100;
    const topperScore = data?.top_score ?? data?.score ?? 0;
    const avgScore = data?.average_score ?? 0;

    return (
        <div className="p-1 animate-fade-in text-[#2D3748] dark:text-slate-200">
            {/* Breadcrumb & Navigation */}
            <div className="mb-8">
                <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'opacity-40' : 'text-slate-600 opacity-90'}`}>
                    <span className="hover:text-blue-600 cursor-pointer" onClick={onBack}>Pages</span>
                    <ChevronRight size={10} />
                    <span className="hover:text-blue-600 cursor-pointer" onClick={onBack}>Result</span>
                    <ChevronRight size={10} />
                    <span className="text-blue-600 uppercase">Performance Analysis</span>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className={`p-2 rounded-[5px] border transition-all hover:bg-blue-50 hover:text-blue-600 ${isDarkMode ? 'bg-white/5 border-white/5 text-slate-400' : 'bg-white border-slate-100 text-slate-500'}`}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className={`text-4xl font-black tracking-tight uppercase leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Result</h2>
                        <p className={`text-[10px] font-black mt-1 uppercase tracking-widest leading-none ${isDarkMode ? 'opacity-30' : 'opacity-90 text-slate-600'}`}>
                            Performance Analysis for {data?.student_name || student?.name || 'Student'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Sub Tabs */}
            <div className={`flex gap-8 mb-10 border-b ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === tab
                            ? 'text-blue-600'
                            : isDarkMode ? 'text-slate-500 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        {tab}
                        {activeTab === tab && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600" />
                        )}
                    </button>
                ))}
            </div>

            {activeTab === 'Score Overview' && (
                <div className="animate-fade-in">
                    {/* Top Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        {[
                            { label: 'Your Score', value: data?.score ?? '—', color: 'text-emerald-600', icon: Award },
                            { label: 'Your Rank', value: data?.rank ? `#${data.rank}` : '—', color: 'text-blue-600', icon: LayoutDashboard },
                            { label: 'Question Attempted', value: data ? `${data.total_attempted}/${data.total_questions}` : '—', color: 'text-slate-600', icon: BookOpen },
                            { label: 'Accuracy', value: data ? `${data.accuracy}%` : '—', color: 'text-[#1B5E20]', icon: Target }
                        ].map((card, idx) => (
                            <div key={idx} className={`p-8 rounded-[10px] border shadow-xl flex flex-col items-center justify-center text-center transition-all hover:scale-[1.02] ${cardBg}`}>
                                <p className={`text-[12px] font-black uppercase tracking-[0.2em] mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{card.label}</p>
                                <p className={`text-2xl font-black ${card.color}`}>{card.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Detailed Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Column 1: Marks breakdown */}
                        <div className={`p-8 rounded-[10px] border shadow-xl ${cardBg}`}>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-[#1B5E20]">Percentage</span>
                                    <span className="text-sm font-black text-[#1B5E20]">{data?.percentage ?? '—'}%</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-blue-600">Percentile</span>
                                    <span className="text-sm font-black text-blue-600">{data?.percentile ?? '—'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-emerald-500">Positive Mark :</span>
                                    <span className="text-sm font-black text-emerald-500">+{data?.positive_marks ?? 0}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-red-500">Negative Mark :</span>
                                    <span className="text-sm font-black text-red-500">-{data?.negative_marks ?? 0}</span>
                                </div>
                            </div>
                        </div>

                        {/* Column 2: Time & Submission */}
                        <div className={`p-8 rounded-[10px] border shadow-xl ${cardBg}`}>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'opacity-60' : 'text-slate-600 opacity-90'}`}>Total Test Time :</span>
                                    <span className={`text-sm font-black ${isDarkMode ? 'opacity-80' : 'text-slate-900'}`}>{data?.duration_str ?? '—'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-blue-600">You Spend :</span>
                                    <span className="text-sm font-black text-blue-600">{data?.time_spent_str ?? '—'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'opacity-60' : 'text-slate-600 opacity-90'}`}>Submitted Date :</span>
                                    <span className={`text-sm font-black ${isDarkMode ? 'opacity-80' : 'text-slate-900'}`}>{data?.submitted_date || '—'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'opacity-60' : 'text-slate-600 opacity-90'}`}>Total Question :</span>
                                    <span className={`text-sm font-black ${isDarkMode ? 'opacity-80' : 'text-slate-900'}`}>{data?.total_questions ?? '—'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Column 3: Correct/Incorrect */}
                        <div className={`p-8 rounded-[10px] border shadow-xl ${cardBg}`}>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-emerald-500">Correct :</span>
                                    <span className="text-sm font-black text-emerald-500">{data?.correct ?? 0}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-blue-500">Partial :</span>
                                    <span className="text-sm font-black text-blue-500">{data?.partial ?? 0}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-red-500">Incorrect :</span>
                                    <span className="text-sm font-black text-red-500">{data?.incorrect ?? 0}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-[#1B5E20]">Unattempted :</span>
                                    <span className="text-sm font-black text-[#1B5E20]">{data?.unattempted ?? 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'Compare Result' && (
                <div className="animate-fade-in space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Score Analysis */}
                        <div className={`p-8 rounded-[10px] border shadow-xl ${cardBg}`}>
                            <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] text-center mb-8 ${isDarkMode ? 'opacity-40' : 'text-slate-600 opacity-80'}`}>Score Analysis</h3>
                            <div className="flex justify-around items-end h-64 px-4">
                                {[
                                    { label: "Topper's", value: `${topperScore}`, height: `${maxScore > 0 ? Math.round((topperScore / maxScore) * 100) : 0}%`, color: 'bg-emerald-400' },
                                    { label: "Average", value: `${avgScore}`, height: `${maxScore > 0 ? Math.round((avgScore / maxScore) * 100) : 0}%`, color: 'bg-indigo-400' },
                                    { label: "Your's", value: `${data?.score ?? 0}`, height: `${maxScore > 0 ? Math.round(((data?.score ?? 0) / maxScore) * 100) : 0}%`, color: 'bg-indigo-400' }
                                ].map((bar, i) => (
                                    <div key={i} className="flex flex-col items-center gap-4 flex-1">
                                        <span className={`text-[10px] font-bold mb-2 ${isDarkMode ? 'opacity-60' : 'text-slate-800 opacity-90'}`}>{bar.value}</span>
                                        <div className="w-12 rounded-t-[4px] bg-slate-100 dark:bg-white/5 overflow-hidden flex items-end" style={{ height: '180px' }}>
                                            <div className={`w-full ${bar.color} transition-all duration-1000 shadow-lg`} style={{ height: bar.height }} />
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest mt-2 ${isDarkMode ? 'opacity-40' : 'text-slate-600 opacity-80'}`}>{bar.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Accuracy Analysis */}
                        <div className={`p-8 rounded-[10px] border shadow-xl ${cardBg}`}>
                            <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] text-center mb-8 ${isDarkMode ? 'opacity-40' : 'text-slate-600 opacity-80'}`}>Accuracy Analysis</h3>
                            <div className="flex justify-around items-end h-64 px-4">
                                {[
                                    { label: "Topper's", value: `100%`, height: '100%', color: 'bg-emerald-400' },
                                    { label: "Average", value: `50%`, height: '50%', color: 'bg-indigo-400' },
                                    { label: "Your's", value: `${data?.accuracy ?? 0}%`, height: `${data?.accuracy ?? 0}%`, color: 'bg-indigo-400' }
                                ].map((bar, i) => (
                                    <div key={i} className="flex flex-col items-center gap-4 flex-1">
                                        <span className={`text-[10px] font-bold mb-2 ${isDarkMode ? 'opacity-60' : 'text-slate-800 opacity-90'}`}>{bar.value}</span>
                                        <div className="w-12 rounded-t-[4px] bg-slate-100 dark:bg-white/5 overflow-hidden flex items-end" style={{ height: '180px' }}>
                                            <div className={`w-full ${bar.color} transition-all duration-1000 shadow-lg`} style={{ height: bar.height }} />
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest mt-2 ${isDarkMode ? 'opacity-40' : 'text-slate-600 opacity-80'}`}>{bar.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Score Distribution Chart */}
                    <div className={`p-10 rounded-[10px] border shadow-xl ${cardBg}`}>
                        <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] text-center mb-8 ${isDarkMode ? 'opacity-40' : 'text-slate-600 opacity-80'}`}>Section Score Breakdown</h3>
                        <div className="flex justify-around items-end gap-2" style={{ height: '200px' }}>
                            {(data?.section_stats || []).map((sec, idx) => {
                                const pct = sec.total_max > 0 ? Math.round((sec.net_marks / sec.total_max) * 100) : 0;
                                return (
                                    <div key={idx} className="flex flex-col items-center flex-1 min-w-[60px] gap-3">
                                        <span className={`text-[10px] font-bold ${isDarkMode ? 'opacity-60' : 'text-slate-700'}`}>{sec.net_marks}/{sec.total_max}</span>
                                        <div className="w-full bg-slate-100 dark:bg-white/5 rounded-t-[4px] overflow-hidden flex items-end" style={{ height: '140px' }}>
                                            <div
                                                className={`w-full rounded-t-[4px] shadow-lg transition-all duration-1000 ${pct >= 60 ? 'bg-emerald-400' : pct >= 40 ? 'bg-indigo-400' : 'bg-orange-400'}`}
                                                style={{ height: `${Math.max(pct, 2)}%` }}
                                            />
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-tighter text-center ${isDarkMode ? 'opacity-40' : 'text-slate-600'}`}>{sec.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex justify-center gap-6 mt-6">
                            {[['bg-emerald-400', '≥60%'], ['bg-indigo-400', '40-59%'], ['bg-orange-400', '<40%']].map(([c, l]) => (
                                <div key={l} className="flex items-center gap-2">
                                    <div className={`w-3 h-3 ${c} rounded-sm`} />
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'opacity-40' : 'text-slate-600'}`}>{l}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'Section Wise Result' && (
                <div className="animate-fade-in">
                    <div className={`rounded-[5px] border overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className={`text-[10px] font-black uppercase tracking-widest text-white border-b ${isDarkMode ? 'bg-[#7c7cfc]/80 border-white/5' : 'bg-blue-600 border-blue-700'}`}>
                                        <th className="py-6 px-8">#</th>
                                        <th className="py-6 px-8">Sections</th>
                                        <th className="py-6 px-8 text-center">Total Q</th>
                                        <th className="py-6 px-8 text-center">Correct</th>
                                        <th className="py-6 px-8 text-center">Partial</th>
                                        <th className="py-6 px-8 text-center">Incorrect</th>
                                        <th className="py-6 px-8 text-center">Unattempted</th>
                                        <th className="py-6 px-8 text-center">+ve Marks</th>
                                        <th className="py-6 px-8 text-center">-ve Marks</th>
                                        <th className="py-6 px-8 text-center">Marks</th>
                                        <th className="py-6 px-8 text-center">Total Marks</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-50'}`}>
                                    {(data?.section_stats || []).map((sec, idx) => (
                                        <tr key={idx} className={`group transition-all ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-blue-50/20'}`}>
                                            <td className={`py-6 px-8 font-bold text-xs ${isDarkMode ? 'opacity-60' : 'text-slate-700 opacity-90'}`}>{idx + 1}</td>
                                            <td className="py-6 px-8">
                                                <span className={`font-extrabold text-xs uppercase tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{sec.name}</span>
                                            </td>
                                            <td className={`py-6 px-8 text-xs font-bold text-center ${isDarkMode ? 'opacity-80' : 'text-slate-800'}`}>{sec.total_questions}</td>
                                            <td className="py-6 px-8 text-xs font-bold text-center text-emerald-600">{sec.correct}</td>
                                            <td className="py-6 px-8 text-xs font-bold text-center text-blue-600">{sec.partial}</td>
                                            <td className="py-6 px-8 text-xs font-bold text-center text-red-600">{sec.incorrect}</td>
                                            <td className={`py-6 px-8 text-xs font-bold text-center ${isDarkMode ? 'opacity-50' : 'text-slate-600'}`}>{sec.unattempted}</td>
                                            <td className="py-6 px-8 text-xs font-bold text-center text-emerald-600">+{sec.positive_marks}</td>
                                            <td className="py-6 px-8 text-xs font-bold text-center text-red-600">-{sec.negative_marks}</td>
                                            <td className="py-6 px-8 text-xs font-black text-center text-blue-700">{sec.net_marks}</td>
                                            <td className={`py-6 px-8 text-xs font-black text-center ${isDarkMode ? 'opacity-40' : 'opacity-80 text-slate-700'}`}>{sec.total_max}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'Solution' && (
                <div className="animate-fade-in">
                    {/* Section tabs */}
                    <div className="flex gap-4 mb-3 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
                        {(data?.all_section_names || []).map((sec) => (
                            <button
                                key={sec}
                                onClick={() => setActiveSolutionSection(sec)}
                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-all rounded-[5px] whitespace-nowrap ${
                                    sec === activeSolutionSection
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                        : `opacity-60 hover:opacity-100 ${isDarkMode ? 'bg-white/5 border-white/5 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`
                                }`}
                            >
                                {sec}
                            </button>
                        ))}
                    </div>

                    {/* Section Summary Bar */}
                    {activeSolutionSection && (
                        <div className={`mb-8 p-5 rounded-[10px] border flex justify-between items-center animate-fade-in ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex gap-10">
                                <div className="space-y-1.5 flex flex-col items-center">
                                    <p className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'opacity-40' : 'text-slate-500 opacity-60'}`}>Correct</p>
                                    <span className="text-base font-black text-emerald-500">{data?.section_stats?.find(s => s.name === activeSolutionSection)?.correct ?? 0}</span>
                                </div>
                                <div className="space-y-1.5 flex flex-col items-center">
                                    <p className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'opacity-40' : 'text-slate-500 opacity-60'}`}>Incorrect</p>
                                    <span className="text-base font-black text-red-500">{data?.section_stats?.find(s => s.name === activeSolutionSection)?.incorrect ?? 0}</span>
                                </div>
                                <div className="space-y-1.5 flex flex-col items-center">
                                    <p className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'opacity-40' : 'text-slate-500 opacity-60'}`}>Unattempted</p>
                                    <span className={`text-base font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{data?.section_stats?.find(s => s.name === activeSolutionSection)?.unattempted ?? 0}</span>
                                </div>
                            </div>
                            <div className="text-right space-y-1">
                                <p className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'opacity-40' : 'text-slate-500 opacity-60'}`}>Section Net Marks</p>
                                <div className="flex items-baseline justify-end gap-1">
                                    <span className="text-xl font-black text-blue-600">{data?.section_stats?.find(s => s.name === activeSolutionSection)?.net_marks ?? 0}</span>
                                    <span className={`text-[11px] font-bold ${isDarkMode ? 'opacity-30' : 'text-slate-400'}`}>/ {data?.section_stats?.find(s => s.name === activeSolutionSection)?.total_max ?? 0}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Questions */}
                    <div className="space-y-10">
                        {(data?.section_questions?.[activeSolutionSection] || []).map((q, idx) => {
                            const userAnswerStr = Array.isArray(q.user_answer)
                                ? q.user_answer.map(String)
                                : q.user_answer != null ? [String(q.user_answer)] : [];
                            const isExpanded = expandedSolution[q.id];

                            return (
                                <div key={q.id} className="animate-slide-up">
                                    {/* Question Header */}
                                    <div className={`px-8 py-3 flex justify-between items-center rounded-t-[5px] border-x border-t ${isDarkMode ? 'bg-[#1a1f2e] border-white/5' : 'bg-slate-100/80 border-slate-100'}`}>
                                        <div className="flex items-center gap-4">
                                            <span className={`text-xs font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                                Q.{idx + 1} | {q.type.replace('_', ' ')}
                                            </span>
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                                q.result === 'CA' ? 'bg-emerald-500/10 text-emerald-600' :
                                                q.result === 'IA' ? 'bg-red-500/10 text-red-600' :
                                                q.result === 'PA' ? 'bg-blue-500/10 text-blue-600' :
                                                isDarkMode ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                {q.result === 'CA' ? '✓ Correct' : q.result === 'IA' ? '✗ Incorrect' : q.result === 'PA' ? '~ Partial' : 'Not Attempted'}
                                            </span>
                                        </div>
                                        <span className={`text-[10px] font-bold ${isDarkMode ? 'opacity-60' : 'text-slate-600 opacity-90'}`}>
                                            Max : +{q.correct_marks} | Neg : -{q.negative_marks} | Earned : {q.earned}
                                        </span>
                                    </div>

                                    {/* Question Content */}
                                    <div className={`p-8 border rounded-b-[5px] shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                                        <div 
                                            className={`text-xs font-bold mb-8 leading-relaxed prose-sm max-w-none ${isDarkMode ? 'opacity-90' : 'text-slate-800'}`}
                                            dangerouslySetInnerHTML={{ __html: q.content }}
                                        />

                                        <div className="space-y-3">
                                            {(q.options || []).map((opt, oi) => {
                                                const keys = ['a', 'b', 'c', 'd', 'e', 'f'];
                                                const optIdStr = String(opt.id || opt._id || oi);
                                                const isCorrect = q.correct_options.includes(optIdStr);
                                                
                                                // Robust matching for user answer (by ID, by index, or by label)
                                                const isUserAnswer = userAnswerStr.some(ua => {
                                                    const uaStr = String(ua).toLowerCase();
                                                    return (
                                                        uaStr === optIdStr.toLowerCase() || 
                                                        uaStr === String(oi) || 
                                                        uaStr === keys[oi] || 
                                                        uaStr === (opt?.content?.toLowerCase() || '')
                                                    );
                                                });
                                                
                                                return (
                                                    <div
                                                        key={optIdStr}
                                                        className={`p-4 rounded-[4px] border transition-all flex justify-between items-center ${
                                                            isCorrect && isUserAnswer ? 'border-emerald-500/40 bg-emerald-500/8' :
                                                            isCorrect ? 'border-emerald-500/30 bg-emerald-500/5' :
                                                            isUserAnswer ? 'border-red-500/30 bg-red-500/5' :
                                                            isDarkMode ? 'border-white/5' : 'border-slate-100'
                                                        }`}
                                                    >
                                                        <div className="flex gap-4 items-start">
                                                            <span className={`text-xs font-black uppercase min-w-[16px] ${isDarkMode ? 'opacity-50' : 'text-slate-600 opacity-80'}`}>{keys[oi] ?? oi})</span>
                                                            <div 
                                                                className={`text-xs font-bold leading-relaxed prose-sm max-w-none ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}
                                                                dangerouslySetInnerHTML={{ __html: opt.content || opt.text || optIdStr }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                                            {isCorrect && isUserAnswer && (
                                                                <span className="flex items-center gap-1 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                                                                    Your Answer (Correct) <CheckCircle2 size={14} />
                                                                </span>
                                                            )}
                                                            {isCorrect && !isUserAnswer && (
                                                                <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">Correct Option</span>
                                                            )}
                                                            {!isCorrect && isUserAnswer && (
                                                                <span className="flex items-center gap-1 text-red-500 text-[10px] font-black uppercase tracking-widest">
                                                                    Your Answer <XCircle size={14} />
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {/* Numerical type: show user's answer */}
                                            {(q.type === 'NUMERICAL' || q.type === 'INTEGER_TYPE') && (
                                                <div className={`p-4 rounded-[4px] border ${q.result === 'CA' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                                                    <span className={`text-xs font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                                        Your Answer: <span className={q.result === 'CA' ? 'text-emerald-600' : 'text-red-600'}>{q.user_answer ?? 'Not Attempted'}</span>
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Solution accordion */}
                                        {q.solution && (
                                            <div className="mt-6 pt-4 border-t dark:border-white/5">
                                                <button
                                                    onClick={() => setExpandedSolution(prev => ({ ...prev, [q.id]: !prev[q.id] }))}
                                                    className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 hover:opacity-80"
                                                >
                                                    <span>Solution</span>
                                                    <ChevronRight size={14} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                </button>
                                                {isExpanded && (
                                                    <div 
                                                        className={`mt-4 p-4 rounded-[4px] bg-slate-50 dark:bg-white/5 border dark:border-white/5 text-[11px] leading-relaxed prose-sm max-w-none ${isDarkMode ? 'opacity-80' : 'text-slate-700'}`}
                                                        dangerouslySetInnerHTML={{ __html: q.solution }}
                                                    />
                                                )}
                                            </div>
                                        )}

                                        <div className="mt-4 flex items-center gap-4 text-xs">
                                            <span className={`font-black uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                                Marks : {q.earned > 0 ? `+${q.earned}` : q.earned}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {(data?.section_questions?.[activeSolutionSection] || []).length === 0 && (
                            <div className={`flex flex-col items-center p-20 opacity-20 ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                                <BookOpen size={60} />
                                <p className="text-xs font-black uppercase tracking-widest mt-4">No questions found for this section</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentPerformanceAnalysis;
