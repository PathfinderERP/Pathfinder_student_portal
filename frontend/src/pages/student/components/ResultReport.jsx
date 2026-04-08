import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Target, Clock, Zap, CheckCircle, XCircle, MinusCircle, BarChart2, TrendingUp, Award, Loader2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';

// ─── Doughnut Chart with hover (flicker-free) ────────────────────────────────
const DoughnutChart = ({ slices, size = 160, thickness = 28 }) => {
    const [hovered, setHovered] = React.useState(null);
    const cx = size / 2;
    const r  = (size - thickness) / 2;
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
                width={size} height={size}
                viewBox={`0 0 ${size} ${size}`}
                style={{ transform: 'rotate(-90deg)', display: 'block', overflow: 'visible' }}
            >
                {/* Track ring */}
                <circle cx={cx} cy={cx} r={r} fill="none"
                    stroke="rgba(148,163,184,0.12)" strokeWidth={thickness} />

                {/* Segments — r stays fixed, only strokeWidth grows */}
                {arcs.map((arc, i) => {
                    const isHov = hovered === i;
                    return (
                        <g key={i}
                            onMouseEnter={() => setHovered(i)}
                            onMouseLeave={() => setHovered(null)}
                            style={{ cursor: 'pointer' }}
                        >
                            {/* Visual segment */}
                            <circle
                                cx={cx} cy={cx} r={r}
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
                            {/* Invisible wider hit-area — same geometry, never changes, captures mouse */}
                            <circle
                                cx={cx} cy={cx} r={r}
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
            <div style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
                transition: 'opacity 0.18s ease',
                opacity: hov ? 1 : 0,
            }}>
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



// ─── Main ─────────────────────────────────────────────────────────────────────
const ResultReport = ({ test, isDarkMode, onBack }) => {
    const { getApiUrl, token } = useAuth();
    const [activeTab, setActiveTab] = useState('score_overview');
    const [hovCard, setHovCard]     = useState(null);
    const [data, setData]           = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError]         = useState(null);
    const [activeSec, setActiveSec] = useState('');

    useEffect(() => {
        const fetchPerformance = async () => {
            if (!test?.id) return;
            setIsLoading(true);
            try {
                const res = await axios.get(`${getApiUrl()}/api/tests/${test.id}/student_performance/`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setData(res.data);
                if (res.data.all_section_names?.length > 0) {
                    setActiveSec(res.data.all_section_names[0]);
                }
            } catch (err) {
                console.error(err);
                setError(err.response?.data?.error || 'Failed to load report data');
            } finally {
                setIsLoading(false);
            }
        };
        fetchPerformance();
    }, [test?.id]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-6 opacity-50">
                <Loader2 size={50} className="animate-spin text-blue-500" />
                <span className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Loading Report...</span>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-4 opacity-70">
                <XCircle size={40} className="text-red-500" />
                <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{error || 'Result unavailable'}</span>
                <button onClick={onBack} className="text-blue-500 text-xs font-bold uppercase mt-4 hover:underline">Go Back</button>
            </div>
        );
    }

    const totalMaxMarks = Math.max(0.1, data.section_stats.reduce((acc, s) => acc + s.total_max, 0));

    const report = {
        testName: test?.name || 'Test Report',
        score: data.score ?? 0,
        totalMarks: totalMaxMarks,
        rank: `${data.rank}/${data.total_students || 1}`,
        attempted: `${data.total_attempted}/${data.total_questions}`,
        accuracy: `${data.accuracy?.toFixed(2)}%`,
        percentage: `${data.percentage?.toFixed(2)}%`,
        percentile: `${data.percentile?.toFixed(2)}%`,
        positiveMarks: `+${data.positive_marks.toFixed(2)}`,
        negativeMarks: `${data.negative_marks > 0 ? '-' : ''}${Math.abs(data.negative_marks).toFixed(2)}`,
        totalTime: data.duration_str,
        timeSpent: data.time_spent_str,
        submittedDate: data.submitted_date || 'N/A',
        totalQuestions: data.total_questions || 1,
        correct: data.correct,
        partial: data.partial,
        incorrect: data.incorrect,
        unattempted: data.unattempted,
        isMissed: data.is_missed || false,
    };

    const markSlices = [
        { label: 'Correct',     color: '#22c55e', pct: (report.correct || 0) / report.totalQuestions },
        { label: 'Incorrect',   color: '#ef4444', pct: (report.incorrect || 0) / report.totalQuestions },
        { label: 'Unattempted', color: '#94a3b8', pct: (report.unattempted || 0) / report.totalQuestions },
    ].map(s => ({ ...s, pct: isNaN(s.pct) ? 0 : s.pct }));

    const sumSectionsTime = Math.max(1, data.section_stats.reduce((acc, s) => acc + (s.time_spent || 0), 0));
    const sectionColors = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];
    const timeSlices = sumSectionsTime > 1 && data.section_stats.some(s => s.time_spent > 0)
        ? data.section_stats.map((s, idx) => ({
            label: s.name, 
            color: sectionColors[idx % sectionColors.length], 
            pct: (s.time_spent || 0) / sumSectionsTime
          }))
        : [{ label: 'Overall Time', color: '#22c55e', pct: 1 }];

    const tabs = [
        { key: 'score_overview', label: 'Score Overview',    icon: Trophy },
        { key: 'section_wise',   label: 'Section Wise',      icon: BarChart2 },
        { key: 'comparison',     label: 'Comparison Report', icon: TrendingUp },
        { key: 'solution',       label: 'Solution',          icon: Target },
    ];

    // ── shared classes ────────────────────────────────────────────────────────
    const card = isDarkMode
        ? 'bg-[#151B27] border border-white/[0.06] shadow-black/30'
        : 'bg-white border border-slate-100 shadow-sm';
    const subCard = isDarkMode
        ? 'bg-white/[0.03] border border-white/[0.06]'
        : 'bg-slate-50/60 border border-slate-100';
    const bodyText = isDarkMode ? 'text-slate-300' : 'text-slate-600';
    const muted    = isDarkMode ? 'text-slate-500' : 'text-slate-400';

    // ── stat rows for score overview ──────────────────────────────────────────
    const leftStats = [
        { k: 'Percentage',      v: report.percentage },
        { k: 'Percentile',      v: report.percentile },
        { k: 'Positive Marks',  v: report.positiveMarks,  color: 'text-emerald-500' },
        { k: 'Negative Marks',  v: report.negativeMarks,  color: 'text-red-500' },
    ];
    const midStats = [
        { k: 'Total Test Time', v: report.totalTime },
        { k: 'Time Spent',      v: report.timeSpent },
        { k: 'Submitted Date',  v: report.submittedDate },
        { k: 'Total Questions', v: report.totalQuestions },
    ];
    const rightStats = [
        { k: 'Correct',     v: report.correct,     icon: CheckCircle, color: 'text-emerald-500' },
        { k: 'Partial',     v: report.partial,      icon: MinusCircle, color: 'text-amber-500'   },
        { k: 'Incorrect',   v: report.incorrect,    icon: XCircle,     color: 'text-red-500'     },
        { k: 'Unattempted', v: report.unattempted,  icon: MinusCircle, color: 'text-slate-400'   },
    ];

    const sections = data.section_stats.map((s, i) => ({
        id: i + 1,
        section: s.name,
        total: s.total_questions,
        correct: s.correct,
        partial: s.partial,
        incorrect: s.incorrect,
        posM: s.positive_marks.toFixed(2),
        negM: s.negative_marks.toFixed(2),
        marks: s.net_marks.toFixed(2),
        totalM: s.total_max.toFixed(2),
        time: s.time_spent ? `${Math.floor(s.time_spent / 60)}m ${s.time_spent % 60}s` : '0m 0s'
    }));

    const scoreCompare = [
        { label: "Topper", value: data.top_score || 0, color: '#22c55e'},
        { label: "Average", value: data.average_score || 0, color: '#94a3b8'},
        ...(!report.isMissed ? [{ label: "Yours", value: data.score || 0, color: '#4871D9'}] : [])
    ];
    
    const accuracyCompare = [
        { label: "Topper", value: data.top_accuracy > 0 ? data.top_accuracy : 100, color: '#22c55e'},
        { label: "Average", value: data.average_accuracy || 50, color: '#94a3b8'},
        ...(!report.isMissed ? [{ label: "Yours", value: Math.round(data.accuracy || 0), color: '#4871D9'}] : [])
    ];

    const rankData = (data.top_10_scores || Array.from({ length: Math.min(10, data.total_students || 1) }).map((_, i) => i === 0 ? data.top_score : Math.max(0, data.top_score - i*5)))
        .map((score, i) => ({
            label: i === 0 ? 'Topper' : `Rank ${i+1}`,
            score: score,
            isYou: !report.isMissed && data.rank === i + 1
        }));
    if (!report.isMissed && !rankData.find(r => r.isYou)) {
        rankData.push({ label: 'You', score: data.score, isYou: true });
    }

    // Portal color palette for charts
    const PORTAL_BLUE   = '#4871D9';
    const PORTAL_BLUE2  = '#6B8EE0';  // lighter shade for hover
    const PORTAL_GREEN  = '#22c55e';
    const PORTAL_INDIGO = '#7C3AED';

    // ── premium grouped bar chart ─────────────────────────────────────────────
    const MiniBarChart = ({ title, data, maxVal, valueSuffix = '' }) => {
        const [hovered, setHovered]   = useState(null);
        const [tooltip, setTooltip]   = useState(null);
        const containerRef            = React.useRef(null);
        const chartH = 200, barW = 58, gap = 36, padL = 12, padB = 40, padT = 36;
        const totalW = padL + data.length * (barW + gap) + 16;
        const svgViewH = chartH + padB + padT;
        const gradIds = data.map((_, i) => `grad-${title.replace(/\s/g,'')}-${i}`);

        const handleBarEnter = (e, d, i) => {
            setHovered(i);
            const rect    = containerRef.current?.getBoundingClientRect();
            const svgEl   = e.currentTarget.closest('svg');
            const svgRect = svgEl?.getBoundingClientRect();
            if (!rect || !svgRect) return;
            const scaleX  = svgRect.width  / totalW;
            const scaleY  = svgRect.height / svgViewH;
            const barH    = Math.max((d.value / maxVal) * chartH, 4);
            const barTopSvg = padT + (chartH - barH);
            const px = svgRect.left - rect.left + (padL + i * (barW + gap) + barW / 2) * scaleX;
            const py = svgRect.top  - rect.top  + barTopSvg * scaleY - 18;
            setTooltip({ label: d.label, value: d.value, color: d.color, px, py });
        };

        return (
            <div ref={containerRef} className={`rounded-[12px] p-6 flex-1 min-w-0 relative ${subCard}`}>
                {/* HTML Tooltip */}
                {tooltip && (
                    <div
                        className={`pointer-events-none absolute z-50 px-3 py-2 rounded-[8px] text-center shadow-xl border
                            ${isDarkMode ? 'bg-[#1e293b] border-[#334155] text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
                        style={{
                            left: tooltip.px,
                            top: tooltip.py,
                            transform: 'translate(-50%, -100%)',
                            minWidth: 72,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <p className="font-black text-[12px]" style={{ color: tooltip.color }}>{tooltip.value}{valueSuffix}</p>
                        <p className={`text-[10px] font-semibold mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`}>{tooltip.label}</p>
                        <span className={`absolute left-1/2 -translate-x-1/2 bottom-[-5px] w-2.5 h-2.5 rotate-45 border-r border-b
                            ${isDarkMode ? 'bg-[#1e293b] border-[#334155]' : 'bg-white border-slate-200'}`} />
                    </div>
                )}

                <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-6 ${muted}`}>{title}</p>
                <svg width="100%" viewBox={`0 0 ${totalW} ${svgViewH}`} preserveAspectRatio="xMidYMid meet">
                    <defs>
                        {data.map((d, i) => (
                            <linearGradient key={i} id={gradIds[i]} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%"   stopColor={d.color} stopOpacity="1" />
                                <stop offset="100%" stopColor={d.color} stopOpacity="0.5" />
                            </linearGradient>
                        ))}
                    </defs>

                    {/* Baseline */}
                    <line x1={padL} y1={padT + chartH} x2={totalW - 8} y2={padT + chartH}
                        stroke={isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0'} strokeWidth="1" />

                    {data.map((d, i) => {
                        const barH = Math.max((d.value / maxVal) * chartH, 4);
                        const x    = padL + i * (barW + gap);
                        const y    = padT + (chartH - barH);
                        const isHov = hovered === i;
                        return (
                            <g key={i} style={{ cursor: 'pointer' }}
                                onMouseEnter={(e) => handleBarEnter(e, d, i)}
                                onMouseLeave={() => { setHovered(null); setTooltip(null); }}
                            >
                                {/* Glow shadow — brighter on hover */}
                                <rect x={x + 4} y={y + 6} width={barW} height={barH} rx={8}
                                    fill={d.color} opacity={isHov ? 0.35 : 0.15}
                                    style={{ filter: isHov ? 'blur(8px)' : 'blur(4px)', transition: 'opacity 0.2s' }} />
                                {/* Bar — slight scale-up on hover via y offset */}
                                <rect
                                    x={isHov ? x - 2 : x}
                                    y={isHov ? y - 4 : y}
                                    width={isHov ? barW + 4 : barW}
                                    height={isHov ? barH + 4 : barH}
                                    rx={8}
                                    fill={`url(#${gradIds[i]})`}
                                    style={{ transition: 'all 0.15s ease' }}
                                />
                                {/* Top sheen */}
                                <rect x={x + 5} y={isHov ? y - 1 : y + 3} width={barW - 10} height={5} rx={3}
                                    fill="white" opacity={isHov ? 0.32 : 0.22} />
                                {/* Value */}
                                <text x={x + barW / 2} y={y - 10} textAnchor="middle"
                                    fontSize="11" fontWeight="800"
                                    fill={isHov ? d.color : (isDarkMode ? '#e2e8f0' : '#1e293b')}>
                                    {d.value}{valueSuffix}
                                </text>
                                {/* X Label */}
                                <text x={x + barW / 2} y={chartH + padT + padB - 14} textAnchor="middle"
                                    fontSize="10" fontWeight={isHov ? '800' : '600'}
                                    fill={isHov ? d.color : (isDarkMode ? '#64748b' : '#94a3b8')}>
                                    {d.label}
                                </text>
                                {/* Dot */}
                                <circle cx={x + barW / 2} cy={chartH + padT + padB - 4} r={isHov ? 4 : 3}
                                    fill={d.color} opacity={isHov ? 1 : 0.8} />
                            </g>
                        );
                    })}
                </svg>
            </div>
        );
    };


    // ── rank bar chart with HTML tooltip ─────────────────────────────────────
    const RankBarChart = () => {
        const [tooltip, setTooltip] = useState(null);
        const containerRef = React.useRef(null);
        
        // Dynamically compute max score based on test bounds rather than hardcoding 250
        const maxScore = Math.max(10, report.totalMarks);
        const chartH = 220, barW = 42, gap = 16, padL = 44, padB = 44, padT = 24;
        const totalW = padL + rankData.length * (barW + gap) + 16;
        
        // Compute 5 perfectly spaced y-axis graduation lines
        const yLines = [0, 0.25, 0.5, 0.75, 1].map(pct => parseFloat((maxScore * pct).toFixed(1)));

        const handleMouseEnter = (e, d, i) => {
            const rect = containerRef.current?.getBoundingClientRect();
            const svgEl = e.currentTarget.closest('svg');
            const svgRect = svgEl?.getBoundingClientRect();
            if (!rect || !svgRect) return;

            const svgViewH = chartH + padB + padT;
            const scaleX = svgRect.width  / totalW;
            const scaleY = svgRect.height / svgViewH;

            // Bar center X in container-relative pixels
            const barCenterX = padL + i * (barW + gap) + barW / 2;
            const px = svgRect.left - rect.left + barCenterX * scaleX;

            // Bar top Y in container-relative pixels
            const barH = Math.max((d.score / maxScore) * chartH, 4);
            const barTopSvg = padT + (chartH - barH);
            const py = svgRect.top - rect.top + barTopSvg * scaleY - 8;

            setTooltip({ label: d.label, score: d.score, px, py });
        };

        return (
            <div ref={containerRef} className={`rounded-[12px] p-6 overflow-x-auto relative ${subCard}`}>
                {/* HTML Tooltip — renders above everything */}
                {tooltip && (
                    <div
                        className={`pointer-events-none absolute z-50 px-3 py-2 rounded-[8px] text-center shadow-xl border text-[11px]
                            ${isDarkMode ? 'bg-[#1e293b] border-[#334155] text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
                        style={{
                            left: tooltip.px,
                            top: tooltip.py,
                            transform: 'translate(-50%, -110%)',
                            minWidth: 80,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <p className="font-black text-[12px]">{tooltip.label}</p>
                        <p className={`text-[10px] font-semibold mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`}>
                            score · {tooltip.score}
                        </p>
                        {/* Arrow */}
                        <span className={`absolute left-1/2 -translate-x-1/2 bottom-[-5px] w-2.5 h-2.5 rotate-45 border-r border-b
                            ${isDarkMode ? 'bg-[#1e293b] border-[#334155]' : 'bg-white border-slate-200'}`} />
                    </div>
                )}

                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${muted}`}>Score vs Rank Distribution</p>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-sm" style={{ background: PORTAL_BLUE }} />
                            <span className={`text-[10px] font-semibold ${muted}`}>Others</span>
                        </div>
                        {!report.isMissed && (
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-sm" style={{ background: PORTAL_GREEN }} />
                                <span className={`text-[10px] font-semibold ${muted}`}>You</span>
                            </div>
                        )}
                    </div>
                </div>

                <svg width="100%" viewBox={`0 0 ${totalW} ${chartH + padB + padT}`} preserveAspectRatio="none" style={{ minWidth: 520 }}>
                    <defs>
                        <linearGradient id="rankGradBlue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor={PORTAL_BLUE}  stopOpacity="1" />
                            <stop offset="100%" stopColor={PORTAL_BLUE}   stopOpacity="0.4" />
                        </linearGradient>
                        <linearGradient id="rankGradGreen" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor={PORTAL_GREEN} stopOpacity="1" />
                            <stop offset="100%" stopColor={PORTAL_GREEN}  stopOpacity="0.45" />
                        </linearGradient>
                        <linearGradient id="rankGradHov" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor={PORTAL_BLUE2} stopOpacity="1" />
                            <stop offset="100%" stopColor={PORTAL_BLUE2}  stopOpacity="0.5" />
                        </linearGradient>
                    </defs>

                    {/* Y grid */}
                    {yLines.map((v) => {
                        const y = padT + chartH - (v / maxScore) * chartH;
                        return (
                            <g key={v}>
                                <line x1={padL} y1={y} x2={totalW - 10} y2={y}
                                    stroke={isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}
                                    strokeWidth="1" strokeDasharray={v === 0 ? '' : '4 4'} />
                                <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="9"
                                    fill={isDarkMode ? '#475569' : '#94a3b8'} fontWeight="600">{v}</text>
                            </g>
                        );
                    })}

                    {/* Bars */}
                    {rankData.map((d, i) => {
                        const barH = Math.max((d.score / maxScore) * chartH, 4);
                        const x = padL + i * (barW + gap);
                        const y = padT + (chartH - barH);
                        const isHov = tooltip?.label === d.label;
                        const fill = d.isYou ? 'url(#rankGradGreen)' : isHov ? 'url(#rankGradHov)' : 'url(#rankGradBlue)';
                        return (
                            <g key={i}
                                onMouseEnter={(e) => handleMouseEnter(e, d, i)}
                                onMouseLeave={() => setTooltip(null)}
                                style={{ cursor: 'pointer' }}
                            >
                                {/* Glow */}
                                {(isHov || d.isYou) && (
                                    <rect x={x - 2} y={y + 4} width={barW + 4} height={barH} rx={6}
                                        fill={d.isYou ? PORTAL_GREEN : PORTAL_BLUE2} opacity={0.18}
                                        style={{ filter: 'blur(5px)' }} />
                                )}
                                {/* Bar */}
                                <rect x={x} y={y} width={barW} height={barH} rx={6} fill={fill} />
                                {/* Sheen */}
                                <rect x={x + 4} y={y + 2} width={barW - 8} height={5} rx={3}
                                    fill="white" opacity={d.isYou ? 0.25 : 0.12} />
                                {/* X Label */}
                                <text x={x + barW / 2} y={chartH + padT + padB - 18} textAnchor="middle"
                                    fontSize="8.5" fontWeight={d.isYou ? '800' : '500'}
                                    fill={d.isYou ? (isDarkMode ? '#4ade80' : '#16a34a') : (isDarkMode ? '#475569' : '#94a3b8')}>
                                    {d.label}
                                </text>
                                {/* Dot */}
                                <circle cx={x + barW / 2} cy={chartH + padT + padB - 7} r={3}
                                    fill={d.isYou ? PORTAL_GREEN : PORTAL_BLUE} opacity={0.7} />
                            </g>
                        );
                    })}
                </svg>
            </div>
        );
    };

    return (
        <div className="space-y-5 animate-fade-in-up pb-10">
            {/* ── Back Button ──────────────────────────────────────────────── */}
            <button
                onClick={onBack}
                className={`flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest transition-all hover:opacity-70 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}
            >
                <ArrowLeft size={16} />
                Back to Results
            </button>

            {/* ── Report Card ───────────────────────────────────────────────── */}
            <div className={`rounded-[10px] overflow-hidden shadow-xl ${card}`}>

                {/* Header Strip */}
                <div className={`px-7 py-5 border-b ${isDarkMode ? 'border-white/[0.06] bg-gradient-to-r from-[#1a2235] to-[#151b27]' : 'border-slate-100 bg-gradient-to-r from-slate-50 to-white'}`}>
                    <div className="flex items-start justify-between flex-wrap gap-3">
                        <div>
                            <p className={`text-[10px] font-black uppercase tracking-[0.25em] mb-1 ${muted}`}>Student's Report</p>
                            <h2 className={`text-[15px] font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{report.testName}</h2>
                        </div>
                        {!report.isMissed && (
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-[6px] text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}>
                                <Award size={14} />
                                Rank {report.rank}
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className={`flex overflow-x-auto border-b ${isDarkMode ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                    {tabs.map((tab) => {
                        const active = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-5 py-4 text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all relative
                                    ${active
                                        ? (isDarkMode ? 'text-blue-400' : 'text-blue-600')
                                        : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')
                                    }`}
                            >
                                <tab.icon size={13} />
                                {tab.label}
                                {active && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500 rounded-t" />}
                            </button>
                        );
                    })}
                </div>

                {/* ── Tab: Score Overview ───────────────────────────────────── */}
                {activeTab === 'score_overview' && (
                    <div className="p-6 space-y-5">
                        {/* 4 Hero Cards */}
                        {(() => {
                            const heroCards = [
                                { label: 'Your Score',          value: `${report.score}/${report.totalMarks}`, color: 'from-emerald-500 to-green-400',  borderColor: '#22c55e', icon: Trophy },
                                { label: 'Your Rank',           value: report.rank,                            color: 'from-blue-500 to-indigo-400',     borderColor: '#6366f1', icon: Award  },
                                { label: 'Questions Attempted', value: report.attempted,                        color: 'from-violet-500 to-purple-400',  borderColor: '#8b5cf6', icon: Target },
                                { label: 'Accuracy',            value: report.accuracy,                         color: 'from-orange-500 to-amber-400',   borderColor: '#f97316', icon: Zap    },
                            ];
                            return (
                                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                                    {heroCards.map((c, i) => {
                                        const isHov = hovCard === i;
                                        // For missed exams, replace personal data with '—'
                                        let finalValue = c.value;
                                        if (report.isMissed) {
                                            if (c.label.toLowerCase().includes('your') || c.label.toLowerCase().includes('accuracy')) {
                                                finalValue = '—';
                                            }
                                        }

                                        return (
                                            <div
                                                key={i}
                                                onMouseEnter={() => setHovCard(i)}
                                                onMouseLeave={() => setHovCard(null)}
                                                className="relative rounded-[10px] p-5 overflow-hidden"
                                                style={{
                                                    background: isHov
                                                        ? (isDarkMode ? 'rgba(255,255,255,0.06)' : 'white')
                                                        : (isDarkMode ? 'rgba(255,255,255,0.03)' : 'white'),
                                                    border: `1px solid ${isHov ? c.borderColor + '55' : (isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9')}`,
                                                    boxShadow: isHov
                                                        ? `0 8px 32px ${c.borderColor}22, 0 0 0 1px ${c.borderColor}33`
                                                        : (isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.06)'),
                                                    transform: isHov ? 'translateY(-3px)' : 'translateY(0)',
                                                    transition: 'all 0.2s ease',
                                                    cursor: 'default',
                                                }}
                                            >
                                                <div
                                                    className={`absolute -right-4 -top-4 rounded-full bg-gradient-to-br ${c.color}`}
                                                    style={{ width: isHov ? 96 : 80, height: isHov ? 96 : 80, opacity: isHov ? 0.22 : 0.1, transition: 'all 0.2s ease' }}
                                                />
                                                <c.icon size={isHov ? 16 : 14} style={{ marginBottom: 10, color: c.borderColor, opacity: isHov ? 1 : 0.5, transition: 'all 0.2s ease' }} />
                                                <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${muted}`}>{c.label}</p>
                                                <p className={`font-black bg-gradient-to-br ${c.color} bg-clip-text text-transparent`}
                                                    style={{
                                                        fontSize: 24,
                                                        display: 'inline-block',
                                                        transform: isHov ? 'scale(1.06)' : 'scale(1)',
                                                        transformOrigin: 'left center',
                                                        transition: 'transform 0.2s ease',
                                                    }}>
                                                    {finalValue}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}


                        {/* Stats Grid */}
                        <div className={`rounded-[10px] p-5 ${subCard}`}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Left */}
                                <div className="space-y-3">
                                    <p className={`text-[10px] font-black uppercase tracking-widest mb-4 ${muted}`}>Performance</p>
                                    {leftStats.map(({ k, v, color }) => (
                                        <div key={k} className="flex items-center justify-between">
                                            <span className={`text-[12px] font-semibold ${muted}`}>{k}</span>
                                            <span className={`text-[13px] font-black ${color || (isDarkMode ? 'text-slate-200' : 'text-slate-700')}`}>{v}</span>
                                        </div>
                                    ))}
                                </div>
                                {/* Mid */}
                                <div className="space-y-3">
                                    <p className={`text-[10px] font-black uppercase tracking-widest mb-4 ${muted}`}>Time & Test Info</p>
                                    {midStats.map(({ k, v }) => (
                                        <div key={k} className="flex items-center justify-between">
                                            <span className={`text-[12px] font-semibold ${muted}`}>{k}</span>
                                            <span className={`text-[13px] font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{v}</span>
                                        </div>
                                    ))}
                                </div>
                                {/* Right */}
                                <div className="space-y-3">
                                    <p className={`text-[10px] font-black uppercase tracking-widest mb-4 ${muted}`}>Question Breakdown</p>
                                    {rightStats.map(({ k, v, icon: Icon, color }) => (
                                        <div key={k} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Icon size={13} className={color} />
                                                <span className={`text-[12px] font-semibold ${muted}`}>{k}</span>
                                            </div>
                                            <span className={`text-[13px] font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {[{ title: 'Marks Analysis', slices: markSlices }, { title: 'Time Taken', slices: timeSlices }].map(({ title, slices }) => (
                                <div key={title} className={`rounded-[10px] p-5 ${subCard} ${report.isMissed ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                                    <p className={`text-[10px] font-black uppercase tracking-widest mb-5 ${muted}`}>{title} {report.isMissed ? '(No Data)' : ''}</p>
                                    <div className="flex flex-col items-center gap-4">
                                        <DoughnutChart slices={report.isMissed ? [{label: 'Empty', color: isDarkMode ? '#1e293b' : '#f1f5f9', pct: 1}] : slices} size={160} thickness={28} />
                                        <div className="flex gap-5 flex-wrap justify-center">
                                            {slices.map((s, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                                                    <span className={`text-[11px] font-semibold ${muted}`}>{s.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Tab: Section Wise ─────────────────────────────────────── */}
                {activeTab === 'section_wise' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-white/[0.04] text-slate-400 border-b border-white/[0.06]' : 'bg-slate-50 text-slate-400 border-b border-slate-100'}`}>
                                    {['#','Sections','Total Questions','Correct','Partial','Incorrect','+ve Mark','-ve Mark','Marks','Total Marks','Time Spent'].map((col) => (
                                        <th key={col} className="px-5 py-4 font-black text-center">{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-white/[0.04]' : 'divide-slate-50'}`}>
                                {sections.map((row) => (
                                    <tr key={row.id} className={`text-[12px] transition-all ${isDarkMode ? 'hover:bg-white/[0.02] text-slate-300' : 'hover:bg-slate-50/80 text-slate-600'}`}>
                                        <td className="px-5 py-4 text-center font-bold opacity-40">{row.id}</td>
                                        <td className={`px-5 py-4 font-black text-[11px] tracking-tight ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{row.section}</td>
                                        <td className="px-5 py-4 text-center">{row.total}</td>
                                        <td className={`px-5 py-4 text-center font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{row.correct}</td>
                                        <td className="px-5 py-4 text-center opacity-50">{row.partial}</td>
                                        <td className={`px-5 py-4 text-center font-bold ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>{row.incorrect}</td>
                                        <td className={`px-5 py-4 text-center font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{row.posM}</td>
                                        <td className={`px-5 py-4 text-center font-bold ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>{row.negM}</td>
                                        <td className={`px-5 py-4 text-center font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{row.marks}</td>
                                        <td className="px-5 py-4 text-center opacity-60">{row.totalM}</td>
                                        <td className={`px-5 py-4 text-center text-[11px] font-bold ${isDarkMode ? 'text-indigo-400' : 'text-indigo-500'}`}>{row.time}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ── Tab: Comparison Report ────────────────────────────────── */}
                {activeTab === 'comparison' && (
                    <div className="p-6 space-y-5">
                        <div className="flex flex-col md:flex-row gap-5">
                            <MiniBarChart title="Score Analysis"    data={scoreCompare}    maxVal={Math.max(10, report.totalMarks)} />
                            <MiniBarChart title="Accuracy Analysis" data={accuracyCompare} maxVal={100} valueSuffix="%" />
                        </div>
                        <RankBarChart />
                    </div>
                )}

                {/* ── Tab: Solution ─────────────────────────────────────────── */}
                {activeTab === 'solution' && (() => {
                    const sectionTabs = (data.all_section_names || []).map(name => ({
                        key: name,
                        label: `${name}`
                    }));

                    const mockQuestions = data.section_questions[activeSec] || [];

                    const SolutionTab = () => {
                        const [expandedSol, setExpandedSol]   = useState({});
                        const toggleSol = (id) => setExpandedSol(prev => ({ ...prev, [id]: !prev[id] }));

                        const qBorder = isDarkMode ? 'border-white/[0.06]' : 'border-slate-200';
                        const qBg     = isDarkMode ? 'bg-[#10141D]'         : 'bg-white';
                        const optBg   = isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200';

                        return (
                            <div>
                                {/* Section Tabs */}
                                <div className={`flex overflow-x-auto gap-0 border-b ${isDarkMode ? 'border-white/[0.06]' : 'border-slate-200'}`}>
                                    {sectionTabs.map((st) => (
                                        <button
                                            key={st.key}
                                            onClick={() => setActiveSec(st.key)}
                                            className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all relative
                                                ${activeSec === st.key
                                                    ? (isDarkMode ? 'text-blue-400' : 'text-[#4871D9]')
                                                    : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')
                                                }`}
                                        >
                                            {st.label}
                                            {activeSec === st.key && (
                                                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#4871D9] rounded-t" />
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Section Stats Sub-header */}
                                {(() => {
                                    const activeSecData = sections.find(s => s.section === activeSec);
                                    if(!activeSecData) return null;
                                    const unattemptedCount = activeSecData.total - activeSecData.correct - activeSecData.partial - activeSecData.incorrect;
                                    return (
                                        <div className={`flex flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3 border-b text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'border-white/[0.06] bg-[#151B27]/50' : 'border-slate-200 bg-slate-50/80 shadow-inner shadow-slate-100/50'}`}>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                                <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Correct : <span className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}>{!report.isMissed ? activeSecData.correct : '—'}</span></span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                                                <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Incorrect : <span className={isDarkMode ? 'text-red-400' : 'text-red-500'}>{!report.isMissed ? activeSecData.incorrect : '—'}</span></span>
                                            </div>
                                            {(activeSecData.partial > 0 || report.isMissed) && (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                                                    <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Partial : <span className={isDarkMode ? 'text-amber-400' : 'text-amber-500'}>{!report.isMissed ? activeSecData.partial : '—'}</span></span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.4)]" />
                                                <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Unattempted : <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{unattemptedCount}</span></span>
                                            </div>
                                            <div className="ml-auto flex items-center gap-2 text-[11px]">
                                                <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Net Marks : <span className={isDarkMode ? 'text-blue-400' : 'text-blue-600'}>{activeSecData.marks}</span> / {activeSecData.totalM}</span>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Questions */}
                                <div className="divide-y divide-transparent space-y-3 p-5">
                                    {(mockQuestions || []).map((q, qIndex) => {
                                        const isCorrect   = q.result === 'CA';
                                        const isPartial   = q.result === 'PA';
                                        const isIncorrect = q.result === 'IA';
                                        const isSkipped   = q.result === 'NA';

                                        const correctOptionsStr = (q.correct_options || []).join(',');
                                        const userOptionsStr = Array.isArray(q.user_answer) ? q.user_answer.join(',') : q.user_answer;

                                        return (
                                            <div key={q.id} className={`rounded-[8px] border overflow-hidden ${qBorder} ${qBg}`}>
                                                {/* Q Header */}
                                                <div className={`flex items-center justify-between px-5 py-3 border-b ${isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-slate-50 border-slate-100'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`text-[12px] font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                                            Q.{qIndex + 1}
                                                        </span>
                                                        <span className={`text-[11px] font-semibold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                            Question Type : <span className={`font-black uppercase ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{q.type}</span>
                                                        </span>
                                                        {/* Status badge */}
                                                        {isCorrect   && <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">✓ Correct</span>}
                                                        {isPartial   && <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">~ Partial</span>}
                                                        {isIncorrect && <span className="text-[10px] font-black px-2 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20">✗ Incorrect</span>}
                                                        {isSkipped   && <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20">— Skipped</span>}
                                                    </div>
                                                    <div className={`text-[11px] font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        Maximum Mark : <span className="font-black text-emerald-500">{q.correct_marks}</span>
                                                        <span className="mx-1">|</span>
                                                        Negative Mark : <span className="font-black text-red-500">{q.negative_marks}</span>
                                                    </div>
                                                </div>

                                                {/* Question Text */}
                                                <div className="px-5 py-4">
                                                    <div className={`text-[13px] leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`} dangerouslySetInnerHTML={{ __html: q.content }} />
                                                </div>

                                                {/* Options */}
                                                <div className="px-5 pb-4 space-y-2">
                                                    {(q.options || []).map((opt, oi) => {
                                                        const optLabel = ['A','B','C','D','E','F'][oi];
                                                        const uAnsOpts = Array.isArray(q.user_answer) 
                                                            ? q.user_answer.map(x => String(x).toLowerCase().trim()) 
                                                            : (q.user_answer ? [String(q.user_answer).toLowerCase().trim()] : []);
                                                        
                                                        const isYours = uAnsOpts.some(ans => 
                                                            ans === String(opt.id).toLowerCase() || 
                                                            ans === optLabel?.toLowerCase() || 
                                                            (opt.content && ans === String(opt.content).replace(/(<([^>]+)>)/gi, "").toLowerCase())
                                                        );

                                                        const correctOptionsArr = Array.isArray(q.correct_options) ? q.correct_options : [];
                                                        const isCorrectOpt = correctOptionsArr.some(c => String(c).toLowerCase() === String(opt.id).toLowerCase()) || opt.isCorrect;
                                                        
                                                        let optStyle = optBg;
                                                        if (isYours && isCorrectOpt) optStyle = isDarkMode ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-300';
                                                        else if (isYours && !isCorrectOpt) optStyle = isDarkMode ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-300';
                                                        else if (isCorrectOpt) optStyle = isDarkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50/50 border-emerald-200';

                                                        return (
                                                            <div key={opt.id || oi} className={`flex items-center justify-between px-4 py-3 rounded-[6px] border text-[12px] transition-all ${optStyle}`}>
                                                                <span className={`${isDarkMode ? 'text-slate-300' : 'text-slate-600'} flex items-start gap-2`}>
                                                                    <span className="font-black mt-0.5">{optLabel}.</span>
                                                                    <div dangerouslySetInnerHTML={{ __html: opt.content || opt.text }} />
                                                                </span>
                                                                {isYours && isCorrectOpt && (
                                                                    <CheckCircle size={16} className="text-emerald-500 shrink-0 ml-4" />
                                                                )}
                                                                {isYours && !isCorrectOpt && (
                                                                    <XCircle size={16} className="text-red-500 shrink-0 ml-4" />
                                                                )}
                                                                {!isYours && isCorrectOpt && (
                                                                    <CheckCircle size={16} className="text-emerald-500/50 shrink-0 ml-4" />
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                    {q.type === 'NUMERICAL' && (
                                                        <div className={`p-4 rounded-[6px] border mt-2 ${isDarkMode ? 'bg-white/[0.02] border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                                                            <div className="flex items-center gap-6 text-[12px] font-semibold">
                                                                <div>Your Answer: <span className="font-black tracking-widest text-blue-500">{q.user_answer || 'N/A'}</span></div>
                                                                <div>Correct Answer: <span className="font-black tracking-widest text-emerald-500">{q.answer_from === q.answer_to ? q.answer_to : `${q.answer_from} - ${q.answer_to}`}</span></div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Meta & Solution */}
                                                <div className={`flex flex-wrap items-center gap-4 px-5 py-3 border-t text-[11px] ${isDarkMode ? 'border-white/[0.06] bg-white/[0.02]' : 'border-slate-100 bg-slate-50'}`}>
                                                    <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                                                        Marks : <span className={`font-black ${q.earned > 0 ? 'text-emerald-500' : q.earned < 0 ? 'text-red-500' : (isDarkMode ? 'text-slate-300' : 'text-slate-600')}`}>{q.earned}</span>
                                                    </span>
                                                    <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                                                        Your Time : <span className={`font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-600'}`}>{q.time_spent ? `${parseInt(q.time_spent/60)}m ${q.time_spent%60}s` : 'N/A'}</span>
                                                    </span>
                                                    <button
                                                        onClick={() => toggleSol(q.id)}
                                                        className="ml-auto text-[11px] font-black text-[#4871D9] hover:underline flex items-center gap-1"
                                                    >
                                                        Solution {expandedSol[q.id] ? '▲' : '▼'}
                                                    </button>
                                                </div>

                                                {expandedSol[q.id] && (
                                                    <div className={`px-5 py-4 border-t text-[12px] leading-relaxed ${isDarkMode ? 'border-white/[0.06] text-slate-400 bg-blue-500/5' : 'border-slate-100 text-slate-500 bg-blue-50/50'}`}>
                                                        <p className={`text-[10px] font-black uppercase tracking-widest mb-2 text-[#4871D9]`}>Solution</p>
                                                        <div dangerouslySetInnerHTML={{ __html: q.solution || '<p>No solution provided</p>' }} />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    };

                    return <SolutionTab />;
                })()}
            </div>
        </div>
    );
};

export default ResultReport;
