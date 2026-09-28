import React, { useState, useEffect, useMemo } from 'react';
import { 
    ArrowLeft, Trophy, Target, Clock, Zap, CheckCircle, XCircle, 
    MinusCircle, BarChart2, Award, Loader2, Download, Check, 
    HelpCircle, ChevronDown, ChevronUp, RotateCcw, AlertCircle, Sparkles, Printer
} from 'lucide-react';
import axios from 'axios';
import html2pdf from 'html2pdf.js';
import { useAuth } from '../../../context/AuthContext';
import MathRenderer from '../../../components/MathRenderer';
import ChapterTestDownloadableReport from './ChapterTestDownloadableReport';

// ─── Doughnut Chart (Interactive) ─────────────────────────────────────────────
const DoughnutChart = ({ slices, size = 160, thickness = 28 }) => {
    const [hovered, setHovered] = useState(null);
    const cx = size / 2;
    const r = (size - thickness) / 2;
    const circumference = 2 * Math.PI * r;

    let offset = 0;
    const arcs = slices.map((s) => {
        const arc = { ...s, offset: offset * circumference, dash: s.pct * circumference };
        offset += s.pct;
        return arc;
    });

    const hov = hovered !== null ? slices[hovered] : null;

    return (
        <div style={{ position: 'relative', width: size, height: size }}>
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                style={{ transform: 'rotate(-90deg)', display: 'block', overflow: 'visible' }}
            >
                {/* Track ring */}
                <circle
                    cx={cx}
                    cy={cx}
                    r={r}
                    fill="none"
                    stroke="rgba(148,163,184,0.12)"
                    strokeWidth={thickness}
                />

                {/* Segments */}
                {arcs.map((arc, i) => {
                    const isHov = hovered === i;
                    return (
                        <g
                            key={i}
                            onMouseEnter={() => setHovered(i)}
                            onMouseLeave={() => setHovered(null)}
                            style={{ cursor: 'pointer' }}
                        >
                            <circle
                                cx={cx}
                                cy={cx}
                                r={r}
                                fill="none"
                                stroke={arc.color}
                                strokeWidth={isHov ? thickness + 8 : thickness}
                                strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
                                strokeDashoffset={-arc.offset}
                                strokeLinecap="butt"
                                style={{
                                    transition: 'stroke-width 0.18s ease, opacity 0.18s ease',
                                    opacity: hovered !== null && !isHov ? 0.4 : 1,
                                    filter: isHov ? `drop-shadow(0 0 6px ${arc.color}99)` : 'none',
                                }}
                            />
                            <circle
                                cx={cx}
                                cy={cx}
                                r={r}
                                fill="none"
                                stroke="transparent"
                                strokeWidth={thickness + 16}
                                strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
                                strokeDashoffset={-arc.offset}
                                strokeLinecap="butt"
                            />
                        </g>
                    );
                })}
            </svg>

            {/* Center label on hover */}
            <div
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none',
                    transition: 'opacity 0.18s ease',
                    opacity: hov ? 1 : 0,
                }}
            >
                {hov && (
                    <>
                        <p style={{ fontSize: 18, fontWeight: 900, color: hov.color, lineHeight: 1, margin: 0 }}>
                            {Math.round(hov.pct * 100)}%
                        </p>
                        <p style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', marginTop: 3, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            {hov.label}
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default function ChapterTestResultReport({ testResult, isDarkMode, onBack, onRetake }) {
    const { token, getApiUrl, user } = useAuth();
    const [activeTab, setActiveTab] = useState('score_overview');
    const [filterStatus, setFilterStatus] = useState('all'); // all | correct | incorrect | skipped
    const [expandedSol, setExpandedSol] = useState({});
    const [mistakeReasons, setMistakeReasons] = useState([]);
    const [savedReflections, setSavedReflections] = useState(testResult?.reflections || {});
    const [reflections, setReflections] = useState(testResult?.reflections || {});
    const [isSavingAll, setIsSavingAll] = useState(false);
    const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Fetch mistake reasons from master data
    useEffect(() => {
        const fetchMistakeReasons = async () => {
            try {
                const res = await axios.get(`${getApiUrl()}/api/master-data/mistake-reasons/`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
                setMistakeReasons(list);
            } catch (err) {
                console.error('Failed to fetch mistake reasons', err);
            }
        };
        if (token) fetchMistakeReasons();
    }, [token, getApiUrl]);

    // Keep reflections in sync with testResult
    useEffect(() => {
        if (testResult?.reflections) {
            setSavedReflections(testResult.reflections);
            setReflections(prev => ({ ...prev, ...testResult.reflections }));
        }
    }, [testResult?.reflections]);

    // Dedicated PDF / Print Report Generator
    const handleDownloadPdf = () => {
        const reportNode = document.getElementById('chapter-test-downloadable-report');
        if (!reportNode) {
            window.print();
            return;
        }

        setIsDownloading(true);
        try {
            // Collect all Tailwind, App stylesheets, and KaTeX fonts from document head
            const headStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
                .map(node => node.outerHTML)
                .join('\n');

            const clone = reportNode.cloneNode(true);
            clone.style.position = 'static';
            clone.style.left = 'auto';
            clone.style.top = 'auto';
            clone.style.display = 'block';

            // Ensure absolute URLs for images in the iframe
            const imgs = clone.querySelectorAll('img');
            imgs.forEach(img => {
                const src = img.getAttribute('src');
                if (src && src.startsWith('/')) {
                    img.src = window.location.origin + src;
                }
            });

            let iframe = document.getElementById('chapter-test-print-frame');
            if (iframe) {
                document.body.removeChild(iframe);
            }

            iframe = document.createElement('iframe');
            iframe.id = 'chapter-test-print-frame';
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0px';
            iframe.style.height = '0px';
            iframe.style.border = '0px';
            document.body.appendChild(iframe);

            const doc = iframe.contentWindow.document;
            doc.open();
            doc.write(`
                <!DOCTYPE html>
                <html lang="en">
                    <head>
                        <title></title>
                        <meta charset="utf-8" />
                        ${headStyles}
                        <style>
                            @page {
                                size: A4 portrait;
                                margin: 8mm 10mm 12mm 10mm !important;
                                @bottom-right {
                                    content: "Page " counter(page);
                                    font-family: system-ui, -apple-system, sans-serif;
                                    font-size: 8pt;
                                    font-weight: 600;
                                    color: #64748b;
                                }
                                @bottom-left {
                                    content: "Pathfinder Educational Centre";
                                    font-family: system-ui, -apple-system, sans-serif;
                                    font-size: 8pt;
                                    color: #94a3b8;
                                }
                            }
                            @media print {
                                @page {
                                    size: A4 portrait;
                                    margin: 8mm 10mm 12mm 10mm !important;
                                    @bottom-right {
                                        content: "Page " counter(page);
                                        font-family: system-ui, -apple-system, sans-serif;
                                        font-size: 8pt;
                                        font-weight: 600;
                                        color: #64748b;
                                    }
                                    @bottom-left {
                                        content: "Pathfinder Educational Centre";
                                        font-family: system-ui, -apple-system, sans-serif;
                                        font-size: 8pt;
                                        color: #94a3b8;
                                    }
                                }
                                html, body {
                                    margin: 0mm !important;
                                    padding: 0mm !important;
                                    background-color: #ffffff !important;
                                    -webkit-print-color-adjust: exact !important;
                                    print-color-adjust: exact !important;
                                }
                                .report-page-1, .report-page-2 {
                                    padding: 4mm 6mm !important;
                                    box-sizing: border-box !important;
                                }
                            }
                            body {
                                margin: 0 !important;
                                padding: 0 !important;
                                box-sizing: border-box !important;
                                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
                                background-color: #ffffff !important;
                                color: #0f172a !important;
                            }
                            #chapter-test-downloadable-report {
                                width: 100% !important;
                                max-width: 100% !important;
                                min-width: 100% !important;
                                padding: 0 !important;
                                margin: 0 !important;
                                background-color: #ffffff !important;
                            }
                            .page-break {
                                page-break-before: always !important;
                                break-before: page !important;
                            }
                            .report-avoid-break {
                                page-break-inside: avoid !important;
                                break-inside: avoid !important;
                            }
                        </style>
                    </head>
                    <body>
                        ${clone.outerHTML}
                    </body>
                </html>
            `);
            doc.close();

            // Temporarily suppress parent document title during print so headers are blank
            const origTitle = document.title;
            document.title = '';

            // Allow styles, fonts, and images to render in iframe
            setTimeout(() => {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
                setTimeout(() => {
                    document.title = origTitle;
                    setIsDownloading(false);
                }, 1000);
            }, 600);
        } catch (err) {
            console.error('PDF / Print generation error:', err);
            setIsDownloading(false);
            window.print();
        }
    };

    const toggleSol = (id) => {
        setExpandedSol(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const questions = testResult?.question_data || [];
    const responses = testResult?.responses || {};

    // Calculate detailed question stats
    const questionAnalysis = useMemo(() => {
        let correct = 0;
        let incorrect = 0;
        let unattempted = 0;

        const detailedList = questions.map((q, idx) => {
            const userAns = responses[q.id];
            const isAnswered = userAns !== undefined && userAns !== null && userAns !== '';
            const isCorrect = isAnswered && userAns === q.correctAnswer;
            const isIncorrect = isAnswered && userAns !== q.correctAnswer;
            const isSkipped = !isAnswered;

            if (isCorrect) correct++;
            else if (isIncorrect) incorrect++;
            else unattempted++;

            return {
                ...q,
                index: idx + 1,
                userAnswer: userAns,
                isCorrect,
                isIncorrect,
                isSkipped,
                reflection: reflections[q.id] || savedReflections[q.id] || ''
            };
        });

        const totalQ = questions.length || 1;
        const totalAttempted = correct + incorrect;
        const accuracy = totalAttempted > 0 ? Math.round((correct / totalAttempted) * 100) : 0;
        const percentage = Math.round((correct / totalQ) * 100);

        return {
            list: detailedList,
            correct,
            incorrect,
            unattempted,
            totalQ: questions.length,
            totalAttempted,
            accuracy,
            percentage
        };
    }, [questions, responses, reflections, savedReflections]);

    const { list, correct, incorrect, unattempted, totalQ, totalAttempted, accuracy, percentage } = questionAnalysis;

    // Slices for Doughnut Chart
    const markSlices = [
        { label: 'Correct', color: '#22c55e', pct: totalQ > 0 ? correct / totalQ : 0 },
        { label: 'Incorrect', color: '#ef4444', pct: totalQ > 0 ? incorrect / totalQ : 0 },
        { label: 'Unattempted', color: '#94a3b8', pct: totalQ > 0 ? unattempted / totalQ : 0 },
    ].map(s => ({ ...s, pct: isNaN(s.pct) ? 0 : s.pct }));

    // Questions to save reflections for
    const incorrectlyAnsweredList = list.filter(q => q.isIncorrect);
    const unsavedQuestions = incorrectlyAnsweredList.filter(q => !savedReflections[q.id]);
    const allSaved = incorrectlyAnsweredList.length > 0 && unsavedQuestions.length === 0;
    const allUnsavedFilled = unsavedQuestions.length > 0 && unsavedQuestions.every(q => reflections[q.id] && reflections[q.id].trim().length > 0);

    const handleSaveAllReflections = async () => {
        if (!testResult?.id) return;
        setIsSavingAll(true);
        try {
            const res = await axios.post(
                `${getApiUrl()}/api/chapter-tests/results/${testResult.id}/save_reflections/`,
                { reflections },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.data?.reflections) {
                setSavedReflections(res.data.reflections);
                setReflections(res.data.reflections);
                testResult.reflections = res.data.reflections;
            }
            setSaveSuccessMsg(true);
            setTimeout(() => setSaveSuccessMsg(false), 5000);
        } catch (err) {
            console.error('Failed to save reflections', err);
            alert('Failed to save reflections. Please try again.');
        } finally {
            setIsSavingAll(false);
        }
    };

    // Filtered questions list
    const filteredQuestions = useMemo(() => {
        if (filterStatus === 'correct') return list.filter(q => q.isCorrect);
        if (filterStatus === 'incorrect') return list.filter(q => q.isIncorrect);
        if (filterStatus === 'skipped') return list.filter(q => q.isSkipped);
        return list;
    }, [list, filterStatus]);

    // Formatting time
    const timeSpentFormatted = useMemo(() => {
        const secs = testResult?.time_taken_seconds || 0;
        const mins = Math.floor(secs / 60);
        const remSecs = secs % 60;
        return `${mins}m ${remSecs}s`;
    }, [testResult?.time_taken_seconds]);

    const formattedDate = useMemo(() => {
        if (!testResult?.created_at) return new Date().toLocaleDateString();
        return new Date(testResult.created_at).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }, [testResult?.created_at]);

    // UI card styles
    const card = isDarkMode
        ? 'bg-[#151B27] border border-white/[0.06] shadow-black/30'
        : 'bg-white border border-slate-100 shadow-sm';
    const subCard = isDarkMode
        ? 'bg-white/[0.03] border border-white/[0.06]'
        : 'bg-slate-50/60 border border-slate-100';
    const muted = isDarkMode ? 'text-slate-500' : 'text-slate-400';

    const tabs = [
        { key: 'score_overview', label: 'Score Overview', icon: Trophy },
        { key: 'solution', label: 'Solutions & Mistake Analysis', icon: Target },
    ];

    return (
        <div className="space-y-5 animate-fade-in-up pb-12">
            {/* ── Top Bar: Back & Action buttons ── */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                {onBack && (
                    <button
                        onClick={onBack}
                        className={`flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest transition-all hover:opacity-75 ${
                            isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <ArrowLeft size={16} />
                        Back to History
                    </button>
                )}

                <div className="flex items-center gap-3 ml-auto flex-wrap">
                    <button
                        onClick={handleDownloadPdf}
                        disabled={isDownloading}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 ${
                            isDarkMode 
                                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30' 
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                        } ${isDownloading ? 'opacity-70 cursor-wait' : ''}`}
                        title="Download official PDF report with full solutions & mistake analysis"
                    >
                        {isDownloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                        <span>{isDownloading ? 'Generating PDF...' : 'Download Report'}</span>
                    </button>

                    {onRetake && (
                        <button
                            onClick={onRetake}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider bg-orange-500 hover:bg-orange-600 text-white transition-all shadow-md shadow-orange-500/20 active:scale-95"
                        >
                            <RotateCcw size={15} />
                            Take Another Test
                        </button>
                    )}
                </div>
            </div>

            {/* ── Main Report Card ── */}
            <div className={`rounded-xl overflow-hidden shadow-xl ${card}`}>
                {/* Header Banner */}
                <div className={`px-7 py-6 border-b ${
                    isDarkMode 
                        ? 'border-white/[0.06] bg-gradient-to-r from-[#1a2235] via-[#151B27] to-[#121620]' 
                        : 'border-slate-100 bg-gradient-to-r from-orange-50/40 via-slate-50 to-white'
                }`}>
                    <div className="flex items-start justify-between flex-wrap gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-500 border border-orange-500/20">
                                    Chapter Test Report
                                </span>
                                <span className={`text-[11px] font-semibold ${muted}`}>
                                    {formattedDate}
                                </span>
                            </div>
                            <h1 className={`text-xl md:text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {testResult?.subject_name}
                            </h1>
                            <p className={`text-sm font-semibold mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                {testResult?.chapter_name}
                            </p>
                        </div>

                        {/* Top Highlights */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className={`px-4 py-2.5 rounded-xl border text-center ${
                                isDarkMode ? 'bg-[#0B0F15] border-white/5' : 'bg-white border-slate-200'
                            }`}>
                                <div className={`text-[10px] font-bold uppercase tracking-wider ${muted}`}>Score</div>
                                <div className={`text-lg font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                    {testResult?.score ?? correct} <span className="text-xs text-slate-400">/ {totalQ}</span>
                                </div>
                            </div>
                            <div className={`px-4 py-2.5 rounded-xl border text-center ${
                                isDarkMode ? 'bg-[#0B0F15] border-white/5' : 'bg-white border-slate-200'
                            }`}>
                                <div className={`text-[10px] font-bold uppercase tracking-wider ${muted}`}>Accuracy</div>
                                <div className={`text-lg font-black ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                    {accuracy}%
                                </div>
                            </div>
                            <div className={`px-4 py-2.5 rounded-xl border text-center ${
                                isDarkMode ? 'bg-[#0B0F15] border-white/5' : 'bg-white border-slate-200'
                            }`}>
                                <div className={`text-[10px] font-bold uppercase tracking-wider ${muted}`}>Time</div>
                                <div className={`text-lg font-black ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                                    {timeSpentFormatted}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className={`flex border-b overflow-x-auto ${isDarkMode ? 'border-white/[0.06] bg-[#0E131D]' : 'border-slate-100 bg-slate-50/50'}`}>
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2.5 px-6 py-4 text-xs font-black uppercase tracking-wider transition-all relative whitespace-nowrap ${
                                    isActive
                                        ? isDarkMode ? 'text-orange-400 bg-white/[0.02]' : 'text-orange-600 bg-white'
                                        : isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-700'
                                }`}
                            >
                                <Icon size={16} />
                                {tab.label}
                                {isActive && (
                                    <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-orange-500 rounded-t" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* ── Tab Content: Score Overview ── */}
                {activeTab === 'score_overview' && (
                    <div className="p-6 md:p-8 space-y-8 animate-fade-in">
                        {/* Top Visual Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Doughnut Chart Card */}
                            <div className={`p-6 rounded-xl flex flex-col items-center justify-center text-center ${subCard}`}>
                                <p className={`text-[11px] font-black uppercase tracking-widest mb-4 ${muted}`}>Questions Distribution</p>
                                <DoughnutChart slices={markSlices} size={170} thickness={28} />
                                <div className="flex items-center justify-center gap-4 mt-6 text-xs font-bold flex-wrap">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                        <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Correct ({correct})</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                        <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>Incorrect ({incorrect})</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                                        <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Skipped ({unattempted})</span>
                                    </div>
                                </div>
                            </div>

                            {/* Performance Stats Metrics */}
                            <div className={`p-6 rounded-xl md:col-span-2 flex flex-col justify-between ${subCard}`}>
                                <div>
                                    <p className={`text-[11px] font-black uppercase tracking-widest mb-5 ${muted}`}>Summary Metrics</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-[#0B0F15] border-white/5' : 'bg-white border-slate-200'}`}>
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Questions</div>
                                            <div className={`text-xl font-black mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{totalQ}</div>
                                        </div>
                                        <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-[#0B0F15] border-white/5' : 'bg-white border-slate-200'}`}>
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Attempted</div>
                                            <div className={`text-xl font-black mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{totalAttempted} / {totalQ}</div>
                                        </div>
                                        <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-[#0B0F15] border-white/5' : 'bg-white border-slate-200'}`}>
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Percentage</div>
                                            <div className={`text-xl font-black mt-1 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>{percentage}%</div>
                                        </div>
                                        <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-[#0B0F15] border-white/5' : 'bg-white border-slate-200'}`}>
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Correct Answers</div>
                                            <div className="text-xl font-black mt-1 text-emerald-500">{correct}</div>
                                        </div>
                                        <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-[#0B0F15] border-white/5' : 'bg-white border-slate-200'}`}>
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Incorrect Answers</div>
                                            <div className="text-xl font-black mt-1 text-red-500">{incorrect}</div>
                                        </div>
                                        <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-[#0B0F15] border-white/5' : 'bg-white border-slate-200'}`}>
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Time Taken</div>
                                            <div className={`text-xl font-black mt-1 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>{timeSpentFormatted}</div>
                                        </div>
                                    </div>
                                </div>

                                {incorrect > 0 && (
                                    <div className={`mt-6 p-4 rounded-xl border flex items-center justify-between gap-4 flex-wrap ${
                                        isDarkMode ? 'bg-orange-500/10 border-orange-500/20 text-orange-300' : 'bg-orange-50 border-orange-200 text-orange-800'
                                    }`}>
                                        <div className="flex items-center gap-3">
                                            <Sparkles size={20} className="text-orange-500 shrink-0" />
                                            <div>
                                                <div className="text-xs font-black uppercase tracking-wider">Mistake Analysis Available</div>
                                                <div className="text-[12px] opacity-80">You have {incorrect} incorrect questions to review and tag reasons for.</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setActiveTab('solution');
                                                setFilterStatus('incorrect');
                                            }}
                                            className="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider bg-orange-500 hover:bg-orange-600 text-white transition-all shadow-sm"
                                        >
                                            Review Mistakes &rarr;
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Tab Content: Solutions & Mistake Analysis ── */}
                {activeTab === 'solution' && (
                    <div className="animate-fade-in">
                        {/* Status Filter Bar */}
                        <div className={`flex items-center justify-between px-6 py-4 border-b flex-wrap gap-4 ${
                            isDarkMode ? 'border-white/[0.06] bg-[#0E131D]' : 'border-slate-100 bg-slate-50/50'
                        }`}>
                            <div className="flex items-center gap-2 flex-wrap">
                                {[
                                    { key: 'all', label: `All (${list.length})` },
                                    { key: 'correct', label: `Correct (${correct})`, color: 'text-emerald-500' },
                                    { key: 'incorrect', label: `Incorrect (${incorrect})`, color: 'text-red-500' },
                                    { key: 'skipped', label: `Skipped (${unattempted})`, color: 'text-slate-400' },
                                ].map(f => (
                                    <button
                                        key={f.key}
                                        onClick={() => setFilterStatus(f.key)}
                                        className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all border ${
                                            filterStatus === f.key
                                                ? isDarkMode 
                                                    ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20' 
                                                    : 'bg-orange-500 text-white border-orange-500 shadow-sm'
                                                : isDarkMode 
                                                    ? 'bg-[#151B27] text-slate-400 border-white/5 hover:border-white/10' 
                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>

                            {saveSuccessMsg && (
                                <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-emerald-500 animate-fade-in">
                                    <CheckCircle size={15} /> All Reflections Saved
                                </div>
                            )}
                        </div>

                        {/* Questions List */}
                        <div className="p-6 space-y-6">
                            {filteredQuestions.length === 0 ? (
                                <div className="text-center py-16 text-slate-400 text-sm font-semibold">
                                    No questions match the selected filter.
                                </div>
                            ) : (
                                filteredQuestions.map((q) => {
                                    const isCorrect = q.isCorrect;
                                    const isIncorrect = q.isIncorrect;
                                    const isSkipped = q.isSkipped;
                                    const hasReflection = !!(reflections[q.id] || testResult?.reflections?.[q.id]);

                                    return (
                                        <div
                                            key={q.id || q.index}
                                            className={`rounded-xl border overflow-hidden transition-all shadow-sm ${
                                                isDarkMode 
                                                    ? 'bg-[#10141D] border-white/[0.06]' 
                                                    : 'bg-white border-slate-200'
                                            }`}
                                        >
                                            {/* Question Header */}
                                            <div className={`flex items-center justify-between px-5 py-3.5 border-b flex-wrap gap-2 ${
                                                isDarkMode ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-slate-50/80 border-slate-100'
                                            }`}>
                                                <div className="flex items-center gap-3">
                                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                                                        isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-800'
                                                    }`}>
                                                        Q.{q.index}
                                                    </span>
                                                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                                                        MCQ
                                                    </span>
                                                    {/* Status badge */}
                                                    {isCorrect && (
                                                        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                            <CheckCircle size={12} /> Correct
                                                        </span>
                                                    )}
                                                    {isIncorrect && (
                                                        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                                                            <XCircle size={12} /> Incorrect
                                                        </span>
                                                    )}
                                                    {isSkipped && (
                                                        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
                                                            <MinusCircle size={12} /> Unattempted
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Subtopic Tag if present */}
                                                {q.subtopic && q.subtopic !== 'N/A' && (
                                                    <div className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                        {q.subtopic}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Question Body */}
                                            <div className="p-6 space-y-4">
                                                <div className={`text-[14px] leading-relaxed font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                                    <MathRenderer html={q.question || q.content} />
                                                </div>

                                                {/* Question Visuals */}
                                                {q.image_1 && (
                                                    <div className="my-4 flex justify-center">
                                                        <img src={q.image_1} alt="Visual 1" className="max-h-64 rounded-lg object-contain border border-slate-200 dark:border-slate-800 bg-white" />
                                                    </div>
                                                )}
                                                {q.image_2 && (
                                                    <div className="my-4 flex justify-center">
                                                        <img src={q.image_2} alt="Visual 2" className="max-h-64 rounded-lg object-contain border border-slate-200 dark:border-slate-800 bg-white" />
                                                    </div>
                                                )}

                                                {/* Options */}
                                                <div className="grid gap-2.5 pt-2">
                                                    {(q.options || []).map((opt, oi) => {
                                                        const isSelected = opt === q.userAnswer;
                                                        const isActualCorrect = opt === q.correctAnswer;

                                                        let optClass = isDarkMode
                                                            ? 'border-white/5 text-slate-300 bg-slate-900/40'
                                                            : 'border-slate-200 text-slate-700 bg-slate-50/50';

                                                        if (isActualCorrect) {
                                                            optClass = isDarkMode
                                                                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                                                                : 'border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold';
                                                        } else if (isSelected && !isCorrect) {
                                                            optClass = isDarkMode
                                                                ? 'border-red-500/50 bg-red-500/10 text-red-300'
                                                                : 'border-red-500 bg-red-50 text-red-800 font-semibold';
                                                        }

                                                        const optLetter = String.fromCharCode(65 + oi);

                                                        return (
                                                            <div
                                                                key={oi}
                                                                className={`p-3.5 rounded-lg border text-sm flex items-start justify-between gap-3 transition-all ${optClass}`}
                                                            >
                                                                <div className="flex items-start gap-3 flex-1">
                                                                    <span className="font-bold opacity-60 shrink-0 mt-0.5">{optLetter}.</span>
                                                                    <div className="flex-1">
                                                                        <MathRenderer html={opt} />
                                                                    </div>
                                                                </div>

                                                                {isActualCorrect && (
                                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 shrink-0 ml-2">
                                                                        <CheckCircle size={16} />
                                                                        <span className="hidden sm:inline text-[11px] uppercase tracking-wider">Correct Answer</span>
                                                                    </div>
                                                                )}
                                                                {isSelected && !isActualCorrect && (
                                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-red-500 shrink-0 ml-2">
                                                                        <XCircle size={16} />
                                                                        <span className="hidden sm:inline text-[11px] uppercase tracking-wider">Your Answer</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Action bar for Solution toggle */}
                                            <div className={`flex items-center justify-between px-6 py-3 border-t text-xs font-semibold ${
                                                isDarkMode ? 'border-white/[0.06] bg-white/[0.02]' : 'border-slate-100 bg-slate-50/60'
                                            }`}>
                                                <span className={muted}>
                                                    Marks: <span className={`font-black ${isCorrect ? 'text-emerald-500' : isIncorrect ? 'text-red-500' : ''}`}>{isCorrect ? '+1' : isIncorrect ? '0' : '0'}</span>
                                                </span>

                                                <button
                                                    onClick={() => toggleSol(q.id)}
                                                    className="flex items-center gap-1.5 font-bold text-orange-500 hover:text-orange-600 uppercase tracking-wider text-[11px] transition-colors"
                                                >
                                                    {expandedSol[q.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                    {expandedSol[q.id] ? 'Hide Solution' : 'View Solution'}
                                                </button>
                                            </div>

                                            {/* Expanded Solution */}
                                            {expandedSol[q.id] && (
                                                <div className={`px-6 py-5 border-t text-sm leading-relaxed ${
                                                    isDarkMode ? 'border-white/[0.06] bg-orange-500/5 text-slate-300' : 'border-slate-100 bg-orange-50/40 text-slate-700'
                                                }`}>
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-2 flex items-center gap-1.5">
                                                        <AlertCircle size={14} /> Step-by-Step Explanation
                                                    </div>
                                                    <MathRenderer html={q.explanation || '<p>No detailed solution provided for this question.</p>'} />
                                                </div>
                                            )}

                                            {/* ── Mistake Analysis Reflection Section for Incorrect Questions ── */}
                                            {isIncorrect && (() => {
                                                const isSaved = !!savedReflections[q.id];
                                                const currentVal = reflections[q.id] || savedReflections[q.id] || '';

                                                return (
                                                    <div className={`px-6 py-5 border-t ${
                                                        isDarkMode ? 'border-white/[0.06] bg-black/25' : 'border-slate-200 bg-slate-50'
                                                    }`}>
                                                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border inline-flex items-center gap-1.5 shadow-sm ${
                                                                isDarkMode 
                                                                    ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' 
                                                                    : 'bg-orange-50 text-orange-700 border-orange-200'
                                                            }`}>
                                                                My Reflection <span className="opacity-75 font-bold tracking-normal text-[9px]">(Why I got it wrong)</span>
                                                            </span>

                                                            {isSaved ? (
                                                                <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 animate-fade-in">
                                                                    <CheckCircle size={13} /> Reason Locked & Saved
                                                                </span>
                                                            ) : currentVal ? (
                                                                <span className="flex items-center gap-1.5 text-[11px] font-bold text-orange-500 animate-pulse">
                                                                    ● Reason Selected (Save Below)
                                                                </span>
                                                            ) : null}
                                                        </div>

                                                        <div className="flex flex-col sm:flex-row gap-3">
                                                            {/* Reflection Reason Select */}
                                                            <div className="flex-[1.6]">
                                                                <select
                                                                    className={`w-full p-3.5 rounded-xl text-xs font-semibold border-2 transition-all focus:outline-none ${
                                                                        isSaved 
                                                                            ? isDarkMode 
                                                                                ? 'bg-slate-900/60 border-emerald-500/30 text-emerald-300/90 opacity-90 cursor-not-allowed' 
                                                                                : 'bg-emerald-50/50 border-emerald-300 text-emerald-900 opacity-90 cursor-not-allowed'
                                                                            : isDarkMode 
                                                                                ? 'bg-[#151B27] border-slate-700 text-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20' 
                                                                                : 'bg-white border-slate-200 text-slate-800 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 shadow-sm'
                                                                    }`}
                                                                    value={currentVal}
                                                                    onChange={(e) => {
                                                                        if (isSaved) return;
                                                                        const val = e.target.value;
                                                                        setReflections(prev => ({ ...prev, [q.id]: val }));
                                                                    }}
                                                                    disabled={isSaved || isSavingAll}
                                                                >
                                                                    <option value="">-- Select reason for mistake --</option>
                                                                    {mistakeReasons.map((mr) => (
                                                                        <option key={mr.id} value={mr.name}>{mr.name}</option>
                                                                    ))}
                                                                    {/* Fallback standard reasons if master data is empty */}
                                                                    {mistakeReasons.length === 0 && (
                                                                        <>
                                                                            <option value="Conceptual Error">Conceptual Error</option>
                                                                            <option value="Calculation / Numerical Mistake">Calculation / Numerical Mistake</option>
                                                                            <option value="Misread Question">Misread Question</option>
                                                                            <option value="Formula Forgotten">Formula Forgotten</option>
                                                                            <option value="Time Pressure / Rushed">Time Pressure / Rushed</option>
                                                                            <option value="Silly Mistake">Silly Mistake</option>
                                                                            <option value="Guessed Answer">Guessed Answer</option>
                                                                        </>
                                                                    )}
                                                                </select>
                                                            </div>

                                                            {/* Subtopic Tag */}
                                                            <div className={`flex-[1] flex flex-col justify-center px-4 py-2.5 rounded-xl border-2 ${
                                                                isDarkMode ? 'bg-[#151B27] border-slate-700' : 'bg-white border-slate-200'
                                                            }`}>
                                                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                                                                    Topic / Subtopic
                                                                </span>
                                                                <span className={`text-xs font-black uppercase truncate ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                                                    {q.subtopic || testResult?.chapter_name || 'General'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Sticky Global Save Reflections Button / Success State */}
                        {incorrectlyAnsweredList.length > 0 && (
                            <div className="sticky bottom-6 z-10 flex justify-center mt-6 pb-6">
                                {allSaved ? (
                                    <div className="flex items-center gap-2.5 px-8 py-3.5 rounded-full text-xs font-black uppercase tracking-widest bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 shadow-2xl backdrop-blur-md animate-scale-up">
                                        <CheckCircle size={18} /> All Mistake Reflections Saved Successfully
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleSaveAllReflections}
                                        disabled={isSavingAll || !allUnsavedFilled}
                                        className={`flex items-center gap-2 px-8 py-3.5 rounded-full text-xs font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 ${
                                            isSavingAll || !allUnsavedFilled
                                                ? 'bg-slate-400 text-white cursor-not-allowed opacity-60'
                                                : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/30'
                                        }`}
                                    >
                                        {isSavingAll ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" /> Saving Reflections...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle size={16} /> Save Mistake Reflections ({unsavedQuestions.length} pending)
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Toast Success Notification ── */}
            {saveSuccessMsg && (
                <div className="fixed bottom-8 right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-xl bg-emerald-600 text-white shadow-2xl border border-emerald-400/40 animate-bounce-in">
                    <CheckCircle size={22} className="shrink-0" />
                    <div>
                        <div className="text-xs font-black uppercase tracking-wider">Reflections Saved!</div>
                        <div className="text-[11px] opacity-90">All reasons have been locked and saved to your test record.</div>
                    </div>
                </div>
            )}

            {/* ── Hidden Printable & Downloadable Report Document for PDF Generation ── */}
            <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', width: '1050px', zIndex: -100, pointerEvents: 'none' }}>
                <ChapterTestDownloadableReport
                    testResult={testResult}
                    user={user}
                    questionAnalysis={questionAnalysis}
                    mistakeReasonsList={mistakeReasons}
                />
            </div>
        </div>
    );
}
