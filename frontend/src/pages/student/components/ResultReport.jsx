import React, { useState } from 'react';
import { ArrowLeft, Trophy, Target, Clock, Zap, CheckCircle, XCircle, MinusCircle, BarChart2, TrendingUp, Award } from 'lucide-react';

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
    const [activeTab, setActiveTab] = useState('score_overview');
    const [hovCard, setHovCard]     = useState(null);

    const report = {
        testName: test?.name || 'Test Report',
        score: test?.marks ?? 238,
        totalMarks: test?.total ?? 300,
        rank: '1/173',
        attempted: '72/75',
        accuracy: '69.33%',
        percentage: '79.33%',
        percentile: '100.00%',
        positiveMarks: '+248.00',
        negativeMarks: '-10.00',
        totalTime: '180 min',
        timeSpent: '145 min 2 sec',
        submittedDate: 'Thu Mar 26 2026',
        totalQuestions: 75,
        correct: 62,
        partial: 0,
        incorrect: 10,
        unattempted: 3,
    };

    const markSlices = [
        { label: 'Correct',     color: '#22c55e', pct: report.correct     / report.totalQuestions },
        { label: 'Incorrect',   color: '#ef4444', pct: report.incorrect   / report.totalQuestions },
        { label: 'Unattempted', color: '#94a3b8', pct: report.unattempted / report.totalQuestions },
    ];
    const timeSlices = [
        { label: 'Correct',   color: '#22c55e', pct: 0.72 },
        { label: 'Incorrect', color: '#ef4444', pct: 0.12 },
        { label: 'Others',    color: '#94a3b8', pct: 0.16 },
    ];

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

    // ── section wise data ─────────────────────────────────────────────────────
    const sections = [
        { id:1, section:'PHY_SINGLE_CHOICE', total:20, correct:15, partial:0, incorrect:4,  posM:'60.00', negM:'-4.00',  marks:'56.00', totalM:'80.00', time:'46 min 19 sec' },
        { id:2, section:'PHY_INTEGER',       total:5,  correct:4,  partial:0, incorrect:0,  posM:'16.00', negM:'-0.00',  marks:'16.00', totalM:'20.00', time:'22 min 18 sec' },
        { id:3, section:'CHE_SINGLE_CHOICE', total:20, correct:17, partial:0, incorrect:3,  posM:'68.00', negM:'-3.00',  marks:'65.00', totalM:'80.00', time:'36 min 22 sec' },
        { id:4, section:'CHE_INTEGER',       total:5,  correct:3,  partial:0, incorrect:2,  posM:'12.00', negM:'-2.00',  marks:'10.00', totalM:'20.00', time:'5 min 55 sec'  },
        { id:5, section:'MATH_SINGLE_CHOICE',total:20, correct:19, partial:0, incorrect:0,  posM:'76.00', negM:'-0.00',  marks:'76.00', totalM:'80.00', time:'29 min 46 sec' },
        { id:6, section:'MATH_INTEGER',      total:5,  correct:4,  partial:0, incorrect:1,  posM:'16.00', negM:'-1.00',  marks:'15.00', totalM:'20.00', time:'4 min 40 sec'  },
    ];

    // ── comparison data ───────────────────────────────────────────────────────
    const scoreCompare    = [{ label:"Topper's", value:238, color:'#22c55e'},{label:'Average',value:64.97,color:'#94a3b8'},{label:"Your's",value:238,color:'#4871D9'}];
    const accuracyCompare = [{ label:"Topper's", value:69.33, color:'#22c55e'},{label:'Average',value:3.98,color:'#94a3b8'},{label:"Your's",value:69.33,color:'#4871D9'}];
    const rankData = [
        {label:'Rank1',score:238,isYou:false},{label:'Rank2',score:230,isYou:false},{label:'Rank3',score:192,isYou:false},
        {label:'Rank4',score:185,isYou:false},{label:'Rank5',score:182,isYou:false},{label:'Rank6',score:180,isYou:false},
        {label:'Rank7',score:178,isYou:false},{label:'Rank8',score:168,isYou:false},{label:'Rank9',score:157,isYou:false},
        {label:'Rank10',score:152,isYou:false},{label:'You',score:238,isYou:true},
    ];

    // Portal color palette for charts
    const PORTAL_BLUE   = '#4871D9';
    const PORTAL_BLUE2  = '#6B8EE0';  // lighter shade for hover
    const PORTAL_GREEN  = '#22c55e';
    const PORTAL_INDIGO = '#7C3AED';

    // ── premium grouped bar chart ─────────────────────────────────────────────
    const MiniBarChart = ({ title, data, maxVal }) => {
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
                        <p className="font-black text-[12px]" style={{ color: tooltip.color }}>{tooltip.value}</p>
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
                                    {d.value}
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
        const maxScore = 250, chartH = 220, barW = 42, gap = 16, padL = 44, padB = 44, padT = 24;
        const totalW = padL + rankData.length * (barW + gap) + 16;
        const yLines = [0, 60, 120, 180, 240];

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
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-sm" style={{ background: PORTAL_GREEN }} />
                            <span className={`text-[10px] font-semibold ${muted}`}>You</span>
                        </div>
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
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-[6px] text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}>
                            <Award size={14} />
                            Rank {report.rank}
                        </div>
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
                                                    {c.value}
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
                                <div key={title} className={`rounded-[10px] p-5 ${subCard}`}>
                                    <p className={`text-[10px] font-black uppercase tracking-widest mb-5 ${muted}`}>{title}</p>
                                    <div className="flex flex-col items-center gap-4">
                                        <DoughnutChart slices={slices} size={160} thickness={28} />
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
                            <MiniBarChart title="Score Analysis"    data={scoreCompare}    maxVal={250} />
                            <MiniBarChart title="Accuracy Analysis" data={accuracyCompare} maxVal={80}  />
                        </div>
                        <RankBarChart />
                    </div>
                )}

                {/* ── Tab: Solution ─────────────────────────────────────────── */}
                {activeTab === 'solution' && (() => {
                    const sectionTabs = [
                        { key: 'PHY_SCQ',  label: 'PHY_SINGLE_CHOICE(20)' },
                        { key: 'PHY_INT',  label: 'PHY_INTEGER(5)'         },
                        { key: 'CHE_SCQ',  label: 'CHE_SINGLE_CHOICE(20)' },
                        { key: 'CHE_INT',  label: 'CHE_INTEGER(5)'         },
                        { key: 'MATH_SCQ', label: 'MATH_SINGLE_CHOICE(20)'},
                        { key: 'MATH_INT', label: 'MATH_INTEGER(5)'        },
                    ];

                    const mockQuestions = [
                        {
                            id: 1, type: 'MCQ', maxMark: 4, negMark: 1,
                            text: 'A prism of refractive index n and angle A is placed in minimum deviation position. If the angle of minimum deviation is equal to the angle A, then the value of A is',
                            options: [
                                { id: 'A', text: 'sin⁻¹(n/2)' },
                                { id: 'B', text: 'sin⁻¹(√(n/2))' },
                                { id: 'C', text: '2 sin⁻¹(√((1-n²)/2))' },
                                { id: 'D', text: '2 sin⁻¹(√((1-n²)/4))' },
                            ],
                            correctOption: 'D', yourOption: 'D',
                            marks: 4, yourTime: '3 min 48 sec', minTime: '0 min 11 sec',
                            solution: 'Using the prism formula at minimum deviation: sin((A+D)/2) = n·sin(A/2). When D=A, sin(A) = n·sin(A/2) = 2n·sin(A/2)·cos(A/2), giving cos(A/2) = n/2, so A = 2cos⁻¹(n/2).',
                        },
                        {
                            id: 2, type: 'MCQ', maxMark: 4, negMark: 1,
                            text: 'The magnetic field of an electromagnetic wave is given by B = B₀sin(kx - ωt). The electric field associated is',
                            options: [
                                { id: 'A', text: 'E = cB₀sin(kx - ωt)' },
                                { id: 'B', text: 'E = B₀/c · sin(kx - ωt)' },
                                { id: 'C', text: 'E = -cB₀sin(kx - ωt)' },
                                { id: 'D', text: 'E = cB₀cos(kx - ωt)' },
                            ],
                            correctOption: 'A', yourOption: 'C',
                            marks: -1, yourTime: '2 min 12 sec', minTime: '0 min 8 sec',
                            solution: 'E = cB for electromagnetic waves. The electric and magnetic fields are in phase, so E = cB₀sin(kx - ωt).',
                        },
                        {
                            id: 3, type: 'MCQ', maxMark: 4, negMark: 1,
                            text: 'A ball is thrown vertically upward with velocity u. The distance covered by it in the last second of its ascent is',
                            options: [
                                { id: 'A', text: 'g/2' },
                                { id: 'B', text: 'u - g' },
                                { id: 'C', text: 'u·g' },
                                { id: 'D', text: 'u/2 - g' },
                            ],
                            correctOption: 'A', yourOption: null,
                            marks: 0, yourTime: '0 min 0 sec', minTime: '0 min 14 sec',
                            solution: 'In the last second of ascent, velocity decreases from g to 0. Distance = g/2 (using s = ut - ½gt² for t=1s from top).',
                        },
                    ];

                    const SolutionTab = () => {
                        const [activeSec, setActiveSec]       = useState('PHY_SCQ');
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

                                {/* Questions */}
                                <div className="divide-y divide-transparent space-y-3 p-5">
                                    {mockQuestions.map((q) => {
                                        const isCorrect   = q.yourOption === q.correctOption;
                                        const isIncorrect = q.yourOption && q.yourOption !== q.correctOption;
                                        const isSkipped   = !q.yourOption;

                                        return (
                                            <div key={q.id} className={`rounded-[8px] border overflow-hidden ${qBorder} ${qBg}`}>
                                                {/* Q Header */}
                                                <div className={`flex items-center justify-between px-5 py-3 border-b ${isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-slate-50 border-slate-100'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`text-[12px] font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                                            Q.{q.id}
                                                        </span>
                                                        <span className={`text-[11px] font-semibold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                            Question Type : <span className={`font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{q.type}</span>
                                                        </span>
                                                        {/* Status badge */}
                                                        {isCorrect   && <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">✓ Correct</span>}
                                                        {isIncorrect && <span className="text-[10px] font-black px-2 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20">✗ Incorrect</span>}
                                                        {isSkipped   && <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20">— Skipped</span>}
                                                    </div>
                                                    <div className={`text-[11px] font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        Maximum Mark : <span className="font-black text-emerald-500">{q.maxMark}</span>
                                                        <span className="mx-1">|</span>
                                                        Negative Mark : <span className="font-black text-red-500">{q.negMark}</span>
                                                    </div>
                                                </div>

                                                {/* Question Text */}
                                                <div className="px-5 py-4">
                                                    <p className={`text-[13px] leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                                        {q.text}
                                                    </p>
                                                </div>

                                                {/* Options */}
                                                <div className="px-5 pb-4 space-y-2">
                                                    {q.options.map((opt) => {
                                                        const isYours   = opt.id === q.yourOption;
                                                        const isCorrectOpt = opt.id === q.correctOption;
                                                        let optStyle = optBg;
                                                        if (isYours && isCorrectOpt) optStyle = isDarkMode ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-300';
                                                        else if (isYours && !isCorrectOpt) optStyle = isDarkMode ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-300';
                                                        else if (isCorrectOpt) optStyle = isDarkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50/50 border-emerald-200';

                                                        return (
                                                            <div key={opt.id} className={`flex items-center justify-between px-4 py-3 rounded-[6px] border text-[12px] ${optStyle}`}>
                                                                <span className={`${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                                                    <span className="font-black mr-2">{opt.id}.</span>
                                                                    {opt.text}
                                                                </span>
                                                                {isYours && isCorrectOpt && (
                                                                    <span className="text-[11px] font-black text-emerald-500 ml-4 whitespace-nowrap">Your Option is Correct ✓</span>
                                                                )}
                                                                {isYours && !isCorrectOpt && (
                                                                    <span className="text-[11px] font-black text-red-500 ml-4 whitespace-nowrap">Your Option ✗</span>
                                                                )}
                                                                {!isYours && isCorrectOpt && (
                                                                    <span className="text-[11px] font-black text-emerald-500 ml-4 whitespace-nowrap">Correct Answer ✓</span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Footer */}
                                                <div className={`flex flex-wrap items-center gap-4 px-5 py-3 border-t text-[11px] ${isDarkMode ? 'border-white/[0.06] bg-white/[0.02]' : 'border-slate-100 bg-slate-50'}`}>
                                                    <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                                                        Marks : <span className={`font-black ${q.marks > 0 ? 'text-emerald-500' : q.marks < 0 ? 'text-red-500' : (isDarkMode ? 'text-slate-300' : 'text-slate-600')}`}>{q.marks}</span>
                                                    </span>
                                                    <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                                                        Your Time : <span className={`font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-600'}`}>{q.yourTime}</span>
                                                    </span>
                                                    <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                                                        Min Time Taken (correct ans) : <span className={`font-black ${isDarkMode ? 'text-slate-200' : 'text-slate-600'}`}>{q.minTime}</span>
                                                    </span>
                                                    <button
                                                        onClick={() => toggleSol(q.id)}
                                                        className="ml-auto text-[11px] font-black text-[#4871D9] hover:underline flex items-center gap-1"
                                                    >
                                                        Solution {expandedSol[q.id] ? '▲' : '▼'}
                                                    </button>
                                                </div>

                                                {/* Solution Drawer */}
                                                {expandedSol[q.id] && (
                                                    <div className={`px-5 py-4 border-t text-[12px] leading-relaxed ${isDarkMode ? 'border-white/[0.06] text-slate-400 bg-blue-500/5' : 'border-slate-100 text-slate-500 bg-blue-50/50'}`}>
                                                        <p className={`text-[10px] font-black uppercase tracking-widest mb-2 text-[#4871D9]`}>Solution</p>
                                                        {q.solution}
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
