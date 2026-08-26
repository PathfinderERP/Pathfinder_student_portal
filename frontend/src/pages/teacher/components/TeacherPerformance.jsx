import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    BarChart3, TrendingUp, Target,
    Users, MapPin, BookOpen, MessageSquare,
    CheckCircle, AlertCircle, RefreshCw, Star, Trophy
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import TopperRankTab from '../../../components/tabs/TopperRankTab';

/* ─── helpers ───────────────────────────────────────────── */
const fmtDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const StarRating = ({ value, size = 12 }) => (
    <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(i => {
            const fill = Math.min(1, Math.max(0, (value || 0) - (i - 1)));
            return (
                <div key={i} className="relative" style={{ width: size, height: size }}>
                    <Star size={size} className="text-slate-600 absolute inset-0" />
                    <div className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                        <Star size={size} className="text-amber-400" />
                    </div>
                </div>
            );
        })}
        <span className="text-[9px] font-bold text-amber-400 ml-1">{(value || 0).toFixed(1)}</span>
    </div>
);

const RatingBar = ({ value, color = 'from-cyan-500 to-emerald-500', isDarkMode }) => (
    <div className={`w-full h-2 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'} overflow-hidden`}>
        <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
            style={{ width: `${Math.min(100, ((value || 0) / 5) * 100)}%` }} />
    </div>
);

const TrendChart = ({ data, isDarkMode }) => {
    const [hovIdx, setHovIdx] = useState(null);
    const filtered = data || [];
    const nonNull = filtered.filter(d => d.avg_rating !== null);
    if (nonNull.length === 0) return (
        <div className="flex items-center justify-center h-32 text-slate-500 text-xs uppercase tracking-widest">
            No feedback data in last 30 days
        </div>
    );
    const max = Math.max(...nonNull.map(d => d.avg_rating), 5);
    const cH = 100, cW = 600, pL = 28, pR = 12, pT = 8, pB = 24;
    const pts = filtered.map((d, i) => {
        if (d.avg_rating === null) return null;
        return {
            x: pL + (i / (filtered.length - 1)) * (cW - pL - pR),
            y: pT + (1 - d.avg_rating / max) * (cH - pT - pB),
            ...d
        };
    }).filter(Boolean);
    const poly = pts.map(p => `${p.x},${p.y}`).join(' ');
    const area = pts.length > 1
        ? `M${pts[0].x},${cH - pB} ` + pts.map(p => `L${p.x},${p.y}`).join(' ') + ` L${pts[pts.length-1].x},${cH - pB} Z`
        : '';
    const hov = hovIdx !== null ? pts[hovIdx] : null;
    return (
        <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${cW} ${cH}`} className="w-full" style={{ minWidth: 320, height: 120 }}>
                <defs>
                    <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="1" />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                    </linearGradient>
                </defs>
                {[1,2,3,4,5].map(v => {
                    const y = pT + (1 - v/max)*(cH-pT-pB);
                    return <g key={v}>
                        <line x1={pL} y1={y} x2={cW-pR} y2={y} stroke={isDarkMode?'#1e293b':'#f1f5f9'} strokeWidth="1"/>
                        <text x={pL-4} y={y+3} fill={isDarkMode?'#475569':'#94a3b8'} fontSize="7" textAnchor="end">{v}</text>
                    </g>;
                })}
                {area && <path d={area} fill="url(#aGrad)" opacity="0.18"/>}
                {pts.length > 1 && <polyline points={poly} fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>}
                {pts.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={hovIdx===i?5:3} fill={hovIdx===i?'#f59e0b':'#06b6d4'}
                        style={{cursor:'pointer'}} onMouseEnter={()=>setHovIdx(i)} onMouseLeave={()=>setHovIdx(null)}/>
                ))}
                {hov && (() => {
                    const tW=90, tH=30, tx=Math.min(hov.x+6,cW-pR-tW), ty=Math.max(pT,hov.y-tH-4);
                    return <g>
                        <rect x={tx} y={ty} width={tW} height={tH} rx="3" fill={isDarkMode?'#1e293b':'#0f172a'} opacity="0.92"/>
                        <text x={tx+tW/2} y={ty+11} fill="#f59e0b" fontSize="8" textAnchor="middle" fontWeight="bold">{hov.avg_rating?.toFixed(2)} ★</text>
                        <text x={tx+tW/2} y={ty+22} fill="#94a3b8" fontSize="7" textAnchor="middle">{fmtDate(hov.date)} · {hov.count} reviews</text>
                    </g>;
                })()}
                {filtered.map((d,i) => {
                    if(i%5!==0 && i!==filtered.length-1) return null;
                    const x = pL+(i/(filtered.length-1))*(cW-pL-pR);
                    return <text key={i} x={x} y={cH-pB+12} fill={isDarkMode?'#475569':'#94a3b8'} fontSize="7" textAnchor="middle">{fmtDate(d.date)}</text>;
                })}
            </svg>
        </div>
    );
};

const DonutChart = ({ resolved, pending, unassigned, rejected, total }) => {
    if (total === 0) return <div className="flex items-center justify-center h-24 text-slate-500 text-xs uppercase tracking-widest">No doubts</div>;
    const slices = [
        { val: resolved, color: '#10b981', label: 'Resolved' },
        { val: pending,  color: '#f59e0b', label: 'Pending' },
        { val: unassigned, color: '#6366f1', label: 'Unassigned' },
        { val: rejected, color: '#f43f5e', label: 'Rejected' },
    ];
    const r=40, cx=56, cy=56, sw=14, circ=2*Math.PI*r;
    let off=0;
    return (
        <div className="flex items-center gap-6">
            <svg width={112} height={112} className="shrink-0">
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={sw}/>
                {slices.map((s,i)=>{
                    const dash=(s.val/total)*circ, gap=circ-dash;
                    const el=<circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={sw}
                        strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-off} transform={`rotate(-90 ${cx} ${cy})`}/>;
                    off+=dash; return el;
                })}
                <text x={cx} y={cy-5} textAnchor="middle" fill="#fff" fontSize="13" fontWeight="bold">{total}</text>
                <text x={cx} y={cy+10} textAnchor="middle" fill="#64748b" fontSize="7">TOTAL</text>
            </svg>
            <div className="space-y-2">
                {slices.map(s=>(
                    <div key={s.label} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:s.color}}/>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{s.label}</span>
                        <span className="ml-2 text-[9px] font-black text-white">{s.val}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const KpiCard = ({ icon, label, value, color, bg, T }) => (
    <div className={`p-5 rounded-[5px] border ${T.card} flex items-center gap-4 hover:-translate-y-1 transition-all duration-300`}>
        <div className={`w-11 h-11 rounded-[5px] flex items-center justify-center border ${bg} ${color} shrink-0`}>{icon}</div>
        <div className="min-w-0">
            <p className={`text-[8px] font-black uppercase tracking-[0.2em] ${T.sub} truncate`}>{label}</p>
            <h3 className={`text-xl font-black uppercase tracking-tighter ${T.text}`}>{value}</h3>
        </div>
    </div>
);

/* ═══════════════════ MAIN ════════════════════════════════ */
const TeacherPerformance = ({ user }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeView, setActiveView] = useState('batch');
    const [lastRefresh, setLastRefresh] = useState(null);

    const T = useMemo(() => ({
        card: isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200 shadow-sm',
        text: isDarkMode ? 'text-white' : 'text-slate-900',
        sub:  isDarkMode ? 'text-slate-400' : 'text-slate-500',
        border: isDarkMode ? 'border-slate-800' : 'border-slate-200',
        item: isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200',
    }), [isDarkMode]);

    const fetchData = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const tok = token || localStorage.getItem('auth_token');
            const res = await fetch(`${getApiUrl()}/api/teacher-portal/performance-analytics/`, {
                headers: { Authorization: `Bearer ${tok}` }
            });
            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            setData(await res.json());
            setLastRefresh(new Date());
        } catch(e) {
            console.error('[TeacherPerformance]', e);
            setError(e.message);
        } finally { setLoading(false); }
    }, [token, getApiUrl]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const Sk = ({ h='h-16' }) => <div className={`${h} rounded-[5px] animate-pulse ${isDarkMode?'bg-slate-800':'bg-slate-100'}`}/>;

    if (loading) return (
        <div className="space-y-6">
            <Sk h="h-24"/>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i=><Sk key={i}/>)}</div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2"><Sk h="h-64"/></div>
                <Sk h="h-64"/>
            </div>
            <Sk h="h-40"/>
        </div>
    );

    if (error) return (
        <div className={`p-8 rounded-[5px] border ${T.card} text-center space-y-3`}>
            <AlertCircle size={32} className="text-rose-500 mx-auto"/>
            <p className={`text-sm font-bold ${T.text}`}>Failed to load analytics</p>
            <p className="text-xs text-slate-500">{error}</p>
            <button onClick={fetchData} className="mt-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-cyan-500 text-black rounded-[3px] hover:bg-cyan-400 transition-colors">
                Retry
            </button>
        </div>
    );

    const o = data?.overall || {};
    const batchData   = data?.batch_data   || [];
    const centreData  = data?.centre_data  || [];
    const subjectData = data?.subject_data || [];
    const trend       = data?.rating_trend || [];
    const doubtBySub  = data?.doubt_by_subject || [];

    const activeList = activeView === 'batch' ? batchData : activeView === 'centre' ? centreData : subjectData;
    const activeKey  = activeView === 'batch' ? 'batch'  : activeView === 'centre' ? 'centre'  : 'subject';
    const activeLabel= activeView === 'batch' ? 'Batch'  : activeView === 'centre' ? 'Centre'  : 'Subject';

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 font-mono">

            {/* Header */}
            <div className={`p-6 rounded-[5px] border ${T.card} border-l-4 border-l-cyan-500 bg-gradient-to-r ${isDarkMode?'from-cyan-500/5 to-transparent':'from-cyan-50 to-transparent'}`}>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <h2 className={`text-2xl font-black uppercase tracking-tight ${T.text}`}>Performance Analytics</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Batch-wise · Centre-wise · Rating Analysis</p>
                    </div>
                    <button onClick={fetchData}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-[3px] border text-[9px] font-black uppercase tracking-widest transition-colors ${T.item} ${T.border} hover:border-cyan-500/50 ${T.sub}`}>
                        <RefreshCw size={11} className={loading?'animate-spin':''}/>{lastRefresh ? `Synced ${lastRefresh.toLocaleTimeString()}` : 'Refresh'}
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard icon={<Star size={18}/>} label="Overall Rating" value={o.avg_rating?`${o.avg_rating} / 5`:'N/A'} color="text-amber-400" bg="bg-amber-500/10 border-amber-500/20" T={T}/>
                <KpiCard icon={<MessageSquare size={18}/>} label="Feedback Sessions" value={o.total_feedbacks??0} color="text-cyan-400" bg="bg-cyan-500/10 border-cyan-500/20" T={T}/>
                <KpiCard icon={<CheckCircle size={18}/>} label="Doubts Resolved" value={`${o.resolved_doubts??0} / ${o.total_doubts??0}`} color="text-emerald-400" bg="bg-emerald-500/10 border-emerald-500/20" T={T}/>
                <KpiCard icon={<Target size={18}/>} label="Resolution Rate" value={o.resolution_rate?`${o.resolution_rate}%`:'0%'} color="text-violet-400" bg="bg-violet-500/10 border-violet-500/20" T={T}/>
            </div>

            {/* Analysis + Donut */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className={`lg:col-span-2 p-6 rounded-[5px] border ${T.card} space-y-5`}>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] ${T.text} flex items-center gap-2`}>
                            <BarChart3 size={14} className="text-cyan-400"/> {activeLabel}-wise Analysis
                        </h3>
                        <div className={`flex rounded-[3px] border ${T.border} overflow-hidden`}>
                            {[{id:'batch',icon:<Users size={10}/>,label:'Batch'},{id:'centre',icon:<MapPin size={10}/>,label:'Centre'},{id:'subject',icon:<BookOpen size={10}/>,label:'Subject'}].map(v=>(
                                <button key={v.id} onClick={()=>setActiveView(v.id)}
                                    className={`flex items-center gap-1 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider transition-colors ${activeView===v.id?'bg-cyan-500 text-black':`${isDarkMode?'text-slate-400 hover:bg-slate-800':'text-slate-500 hover:bg-slate-100'}`}`}>
                                    {v.icon} {v.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {activeList.length === 0 ? (
                        <div className={`py-12 text-center ${T.sub} text-[10px] uppercase tracking-widest`}>No data available</div>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                            {activeList.map((item, i) => {
                                const name = item[activeKey] || '—';
                                const rating = item.avg_rating || 0;
                                const rankColor = i===0?'text-amber-400':i===1?'text-slate-400':i===2?'text-orange-600':T.sub;
                                return (
                                    <div key={`${name}-${i}`} className={`p-4 rounded-[5px] border ${T.item} hover:border-cyan-500/30 transition-all duration-200`}>
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className={`text-[9px] font-black w-5 shrink-0 ${rankColor}`}>#{i+1}</span>
                                                <span className={`text-xs font-bold uppercase tracking-wide truncate ${T.text}`}>{name}</span>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                {(item.student_count||0)>0 && <span className={`text-[9px] font-bold ${T.sub} flex items-center gap-1`}><Users size={9}/> {item.student_count} stu.</span>}
                                                <span className={`text-[9px] font-bold ${T.sub}`}>{item.feedback_count||0} reviews</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <RatingBar value={rating} isDarkMode={isDarkMode}
                                                color={rating>=4?'from-emerald-500 to-cyan-400':rating>=3?'from-amber-400 to-yellow-300':'from-rose-500 to-orange-400'}/>
                                            <StarRating value={rating}/>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className={`p-6 rounded-[5px] border ${T.card} space-y-5`}>
                    <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] ${T.text} flex items-center gap-2`}>
                        <MessageSquare size={14} className="text-violet-400"/> Doubt Breakdown
                    </h3>
                    <DonutChart resolved={o.resolved_doubts??0} pending={o.pending_doubts??0}
                        unassigned={o.unassigned_doubts??0} rejected={o.rejected_doubts??0} total={o.total_doubts??0}/>
                    {doubtBySub.length>0 && (
                        <div className={`pt-4 border-t ${T.border} space-y-2`}>
                            <p className={`text-[9px] font-black uppercase tracking-widest ${T.sub}`}>By Subject</p>
                            {doubtBySub.slice(0,5).map(ds=>(
                                <div key={ds.subject} className="flex items-center gap-2">
                                    <span className={`text-[9px] font-bold ${T.text} flex-1 truncate uppercase`}>{ds.subject}</span>
                                    <div className={`flex-1 h-1.5 rounded-full ${isDarkMode?'bg-slate-800':'bg-slate-200'} overflow-hidden`}>
                                        <div className="h-full rounded-full bg-violet-500 transition-all duration-500"
                                            style={{width:`${Math.min(100,(ds.count/(doubtBySub[0]?.count||1))*100)}%`}}/>
                                    </div>
                                    <span className="text-[9px] font-black text-violet-400 w-6 text-right">{ds.count}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Trend */}
            <div className={`p-6 rounded-[5px] border ${T.card} space-y-4`}>
                <div className="flex items-center justify-between">
                    <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] ${T.text} flex items-center gap-2`}>
                        <TrendingUp size={14} className="text-cyan-400"/> 30-Day Rating Trend
                    </h3>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 bg-cyan-400"/>
                        <span className={`text-[9px] font-bold ${T.sub} uppercase tracking-wider`}>Avg Rating / Day</span>
                    </div>
                </div>
                <TrendChart data={trend} isDarkMode={isDarkMode}/>
            </div>

            {/* Subject Grid */}
            {subjectData.length>0 && (
                <div className={`p-6 rounded-[5px] border ${T.card} space-y-4`}>
                    <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] ${T.text} flex items-center gap-2`}>
                        <BookOpen size={14} className="text-indigo-400"/> Subject-wise Rating
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {subjectData.map(s=>(
                            <div key={s.subject} className={`p-4 rounded-[5px] border ${T.item} space-y-2`}>
                                <div className="flex items-center justify-between">
                                    <span className={`text-[10px] font-bold uppercase tracking-wide ${T.text}`}>{s.subject}</span>
                                    <span className={`text-[9px] font-bold ${T.sub}`}>{s.feedback_count} reviews</span>
                                </div>
                                <StarRating value={s.avg_rating} size={13}/>
                                <RatingBar value={s.avg_rating} isDarkMode={isDarkMode}
                                    color={s.avg_rating>=4?'from-emerald-500 to-cyan-400':s.avg_rating>=3?'from-amber-400 to-yellow-300':'from-rose-500 to-orange-400'}/>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Topper Rankings ─────────────────────────── */}
            <div className={`rounded-[5px] border ${T.card} overflow-hidden`}>
                <div className={`px-6 py-4 border-b ${T.border} flex items-center gap-2 bg-gradient-to-r ${isDarkMode ? 'from-amber-500/5 to-transparent' : 'from-amber-50 to-transparent'}`}>
                    <Trophy size={15} className="text-amber-400" />
                    <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] ${T.text}`}>Topper Rankings</h3>
                    <span className={`ml-2 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[2px] border ${isDarkMode ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' : 'border-amber-300 text-amber-700 bg-amber-50'}`}>
                        Batch &amp; Centre Filtered
                    </span>
                </div>
                <div className="p-4">
                    <TopperRankTab teacherUser={user} />
                </div>
            </div>
        </div>
    );
};

export default TeacherPerformance;

