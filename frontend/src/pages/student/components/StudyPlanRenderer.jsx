import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    Brain, AlertTriangle, TrendingUp, Calendar, Clock, BookOpen,
    Users, BarChart2, CheckCircle2, Zap, ChevronDown, ChevronRight,
    Sparkles, Target, Activity, Shield, Star
} from 'lucide-react';

// ── Attempt to parse JSON from the ai_plan string ──────────────────────────
function parsePlanData(rawText) {
    if (!rawText) return null;
    // Strip markdown code fences if present
    let text = rawText.trim();
    const fenceMatch = text.match(/^```(?:json)?\s*([\s\S]+?)\s*```$/);
    if (fenceMatch) text = fenceMatch[1];
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

// ── Sub-components ──────────────────────────────────────────────────────────

const MetricBar = ({ label, value, color = 'indigo', isDark }) => {
    const colors = {
        indigo: 'bg-indigo-500',
        emerald: 'bg-emerald-500',
        amber: 'bg-amber-500',
        rose: 'bg-rose-500',
        violet: 'bg-violet-500',
    };
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{label}</span>
                <span className={isDark ? 'text-white' : 'text-slate-900'}>{value}%</span>
            </div>
            <div className={`h-1.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-200'} overflow-hidden`}>
                <div
                    className={`h-full rounded-full ${colors[color]} transition-all duration-700`}
                    style={{ width: `${value}%` }}
                />
            </div>
        </div>
    );
};

const SectionCard = ({ title, icon: Icon, color = 'indigo', children, isDark, defaultOpen = true }) => {
    const [open, setOpen] = useState(defaultOpen);
    const colorMap = {
        indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-500', border: 'border-indigo-500/30' },
        emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/30' },
        amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/30' },
        rose: { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/30' },
        violet: { bg: 'bg-violet-500/10', text: 'text-violet-500', border: 'border-violet-500/30' },
    };
    const c = colorMap[color];
    return (
        <div className={`rounded-xl border ${isDark ? 'border-white/10 bg-[#10141D]' : 'bg-white border-slate-200 shadow-sm'} overflow-hidden`}>
            <button
                onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center justify-between p-5 gap-3 ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'} transition-colors`}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.bg}`}>
                        <Icon size={18} className={c.text} />
                    </div>
                    <span className={`text-sm font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</span>
                </div>
                {open ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
            </button>
            {open && <div className="px-5 pb-5">{children}</div>}
        </div>
    );
};

const InterventionRule = ({ type, text, isDark }) => {
    const styles = {
        red_flag: { bg: isDark ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50 border-rose-200', text: 'text-rose-500', label: '🚩 Red Flag' },
        growth: { bg: isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200', text: 'text-emerald-600', label: '📈 Growth Trigger' },
        warning: { bg: isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200', text: 'text-amber-600', label: '⚠️ Warning' },
    };
    const s = styles[type] || styles.growth;
    return (
        <div className={`p-4 rounded-lg border ${s.bg}`}>
            <span className={`text-[9px] font-black uppercase tracking-widest ${s.text} block mb-1`}>{s.label}</span>
            <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{text}</p>
        </div>
    );
};

const SubjectCard = ({ subject, score, diagnosis, immediate_action, isDark }) => {
    const scoreNum = parseInt(score);
    const color = scoreNum >= 75 ? 'emerald' : scoreNum >= 50 ? 'amber' : 'rose';
    const colorMap = {
        emerald: { bar: 'bg-emerald-500', badge: isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-700' },
        amber: { bar: 'bg-amber-500', badge: isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-100 text-amber-700' },
        rose: { bar: 'bg-rose-500', badge: isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-100 text-rose-700' },
    };
    const c = colorMap[color];
    return (
        <div className={`p-5 rounded-xl border ${isDark ? 'bg-[#0a0d14] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between mb-3">
                <span className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{subject}</span>
                <span className={`text-xs font-black px-2.5 py-1 rounded-full ${c.badge}`}>{score}</span>
            </div>
            <div className={`h-2 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-200'} mb-4 overflow-hidden`}>
                <div className={`h-full ${c.bar} rounded-full`} style={{ width: score }} />
            </div>
            {diagnosis && <p className={`text-[11px] font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{diagnosis}</p>}
            {immediate_action && (
                <div className={`flex items-start gap-2 mt-2 p-2.5 rounded-lg ${isDark ? 'bg-indigo-500/10' : 'bg-indigo-50'}`}>
                    <Zap size={12} className="text-indigo-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-bold text-indigo-500">{immediate_action}</p>
                </div>
            )}
        </div>
    );
};

// ── Markdown renderer for master_plan_markdown ──────────────────────────────
const PlanMarkdown = ({ content, isDark }) => (
    <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
            h1: ({ ...props }) => (
                <h1 className={`font-black text-2xl mb-6 mt-8 pb-3 border-b flex items-center gap-3 ${isDark ? 'text-white border-white/10' : 'text-slate-900 border-slate-200'}`} {...props}>
                    <Sparkles className="text-indigo-500 shrink-0" size={22} />
                    <span>{props.children}</span>
                </h1>
            ),
            h2: ({ ...props }) => (
                <h2 className={`font-black text-lg uppercase tracking-tight mt-10 mb-4 pb-2 border-b flex items-center gap-2 ${isDark ? 'border-white/10 text-white' : 'border-slate-200 text-slate-900'}`} {...props}>
                    <div className="w-6 h-6 rounded bg-indigo-500/10 flex items-center justify-center shrink-0">
                        <Target className="text-indigo-500" size={13} />
                    </div>
                    {props.children}
                </h2>
            ),
            h3: ({ ...props }) => (
                <h3 className={`font-black text-base mt-7 mb-3 flex items-center gap-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} {...props}>
                    <ChevronRight className="text-emerald-500" size={15} />
                    {props.children}
                </h3>
            ),
            h4: ({ ...props }) => (
                <h4 className={`font-bold text-sm mt-4 mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`} {...props} />
            ),
            p: ({ ...props }) => (
                <p className={`text-sm font-medium leading-relaxed mb-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`} {...props} />
            ),
            strong: ({ ...props }) => (
                <strong className={`font-black px-1 py-0.5 rounded ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-700'}`} {...props} />
            ),
            em: ({ ...props }) => (
                <em className={`font-medium not-italic ${isDark ? 'text-amber-400' : 'text-amber-600'}`} {...props} />
            ),
            ul: ({ ...props }) => <ul className="space-y-2 my-4" {...props} />,
            ol: ({ ...props }) => <ol className="space-y-2 my-4 list-decimal list-inside" {...props} />,
            li: ({ ...props }) => (
                <li className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${isDark ? 'bg-white/[0.02] border-white/5 hover:border-indigo-500/20' : 'bg-slate-50 border-slate-100 hover:border-indigo-200'}`} {...props}>
                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="text-emerald-500" size={10} />
                    </div>
                    <div className="flex-1 text-sm font-medium">{props.children}</div>
                </li>
            ),
            blockquote: ({ ...props }) => (
                <div className={`my-6 p-4 rounded-lg border-l-4 flex gap-3 ${isDark ? 'bg-indigo-500/10 border-indigo-500' : 'bg-indigo-50 border-indigo-500'}`}>
                    <Sparkles className="text-indigo-500 shrink-0 mt-0.5" size={16} />
                    <blockquote className={`text-sm font-bold italic ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`} {...props} />
                </div>
            ),
            table: ({ ...props }) => (
                <div className={`overflow-x-auto my-6 rounded-xl shadow border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    <table className="w-full text-left border-collapse min-w-[500px]" {...props} />
                </div>
            ),
            thead: ({ ...props }) => (
                <thead className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'bg-indigo-500/10 text-indigo-300' : 'bg-indigo-50 text-indigo-700'}`} {...props} />
            ),
            th: ({ ...props }) => <th className="p-3 border-b border-indigo-500/10" {...props} />,
            td: ({ ...props }) => (
                <td className={`p-3 text-xs font-medium border-b ${isDark ? 'border-white/5 text-slate-300 hover:bg-white/5' : 'border-slate-100 text-slate-700 hover:bg-slate-50'}`} {...props} />
            ),
            tr: ({ ...props }) => <tr className="transition-colors" {...props} />,
            tbody: ({ ...props }) => <tbody className="divide-y divide-slate-100 dark:divide-white/5" {...props} />,
            code: ({ inline, ...props }) => inline
                ? <code className={`px-1.5 py-0.5 rounded text-xs font-mono ${isDark ? 'bg-white/10 text-emerald-300' : 'bg-slate-100 text-emerald-700'}`} {...props} />
                : <pre className={`p-4 rounded-lg text-xs font-mono overflow-x-auto my-4 ${isDark ? 'bg-black/40 text-slate-300' : 'bg-slate-100 text-slate-700'}`}><code {...props} /></pre>,
        }}
    >
        {content}
    </ReactMarkdown>
);

// ── Main Renderer ───────────────────────────────────────────────────────────
export default function StudyPlanRenderer({ aiPlan, isDark }) {
    const plan = parsePlanData(aiPlan);

    // Fallback: if not valid JSON, render as markdown
    if (!plan) {
        return (
            <div className={`p-6 md:p-10 rounded-xl border ${isDark ? 'bg-[#0a0d14] border-white/10' : 'bg-white border-slate-200'}`}>
                <PlanMarkdown content={aiPlan} isDark={isDark} />
            </div>
        );
    }

    const { metrics, psychological_profile, subject_performance, diagnoses,
        master_plan_markdown, strategy_blocks, mentor_intervention_rules,
        parent_monitoring_dashboard, subject_wise_plan, psychology_behaviour_plan } = plan;

    const riskColor = {
        Low: 'emerald', Medium: 'amber', High: 'rose', 'Very High': 'rose',
    }[metrics?.risk_level] || 'amber';

    const riskBadge = {
        Low: isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-700',
        Medium: isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-100 text-amber-700',
        High: isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-100 text-rose-700',
        'Very High': isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-100 text-rose-700',
    }[metrics?.risk_level] || (isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-100 text-amber-700');

    return (
        <div className="space-y-6 w-full">

            {/* ── Top Metrics Banner ── */}
            {metrics && (
                <div className={`grid grid-cols-2 md:grid-cols-4 gap-4`}>
                    {[
                        { label: 'Planner Score', value: metrics.planner_score, suffix: '/100', color: 'indigo' },
                        { label: 'Academic Score', value: metrics.academic_score_percentage + '%', color: 'emerald' },
                        { label: 'Mindset Score', value: metrics.mindset_score_percentage + '%', color: 'violet' },
                        { label: 'Risk Level', value: metrics.risk_level, badge: riskBadge },
                    ].map(m => (
                        <div key={m.label} className={`p-4 rounded-xl border ${isDark ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">{m.label}</p>
                            {m.badge ? (
                                <span className={`text-sm font-black px-2 py-0.5 rounded-full ${m.badge}`}>{m.value}</span>
                            ) : (
                                <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{m.value}<span className="text-xs text-slate-400 ml-1">{m.suffix}</span></p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ── Primary Gap + Plan Intensity ── */}
            {metrics && (metrics.primary_gap || metrics.plan_intensity) && (
                <div className={`flex flex-wrap gap-3 p-4 rounded-xl border ${isDark ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                    {metrics.primary_gap && (
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={14} className="text-amber-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Primary Gap:</span>
                            <span className={`text-[10px] font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{metrics.primary_gap}</span>
                        </div>
                    )}
                    {metrics.plan_intensity && (
                        <div className="flex items-center gap-2 ml-auto">
                            <Zap size={14} className="text-indigo-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Plan Intensity:</span>
                            <span className={`text-[10px] font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{metrics.plan_intensity}</span>
                        </div>
                    )}
                </div>
            )}

            {/* ── Strategy Blocks ── */}
            {strategy_blocks && (
                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4`}>
                    {[
                        { key: 'daily_core_block', label: 'Daily Core Block', icon: Clock },
                        { key: 'weekly_test_rhythm', label: 'Weekly Test Rhythm', icon: Activity },
                        { key: 'psychology_habit', label: 'Psychology Habit', icon: Brain },
                        { key: 'mentor_review', label: 'Mentor Review', icon: Users },
                    ].filter(b => strategy_blocks[b.key]).map(b => (
                        <div key={b.key} className={`p-4 rounded-xl border ${isDark ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <b.icon size={14} className="text-indigo-500" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{b.label}</span>
                            </div>
                            <p className={`text-xs font-medium leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{strategy_blocks[b.key]}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Mentor Intervention + Parent Dashboard side by side ── */}
            {(mentor_intervention_rules?.length > 0 || parent_monitoring_dashboard) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mentor_intervention_rules?.length > 0 && (
                        <SectionCard title="Mentor Intervention Rules" icon={Shield} color="rose" isDark={isDark}>
                            <div className="space-y-3">
                                {mentor_intervention_rules.map((rule, i) => (
                                    <InterventionRule key={i} {...rule} isDark={isDark} />
                                ))}
                            </div>
                        </SectionCard>
                    )}
                    {parent_monitoring_dashboard && (
                        <SectionCard title="Parent Monitoring Dashboard" icon={Users} color="indigo" isDark={isDark}>
                            <div className="space-y-3">
                                {Object.entries(parent_monitoring_dashboard).map(([key, val]) => {
                                    const labelMap = { daily: '📅 Daily', weekly: '📆 Weekly', monthly: '📊 Monthly', do_not: '🚫 Do Not' };
                                    const colorMap = {
                                        daily: isDark ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-700',
                                        weekly: isDark ? 'bg-violet-500/10 border-violet-500/20 text-violet-400' : 'bg-violet-50 border-violet-200 text-violet-700',
                                        monthly: isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700',
                                        do_not: isDark ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-700',
                                    };
                                    return (
                                        <div key={key} className={`p-3 rounded-lg border ${colorMap[key] || colorMap.daily}`}>
                                            <span className="text-[9px] font-black uppercase tracking-widest block mb-1">{labelMap[key] || key}</span>
                                            <p className="text-xs font-medium">{val}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </SectionCard>
                    )}
                </div>
            )}

            {/* ── Subject Performance ── */}
            {subject_performance?.length > 0 && (
                <SectionCard title="Subject-wise Performance" icon={BarChart2} color="emerald" isDark={isDark}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {subject_performance.map((s, i) => (
                            <SubjectCard key={i} {...s} isDark={isDark} />
                        ))}
                    </div>
                </SectionCard>
            )}

            {/* ── Psychological Profile ── */}
            {psychological_profile && (
                <SectionCard title="Psychological Profile" icon={Brain} color="violet" isDark={isDark} defaultOpen={false}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-2">
                        {Object.entries(psychological_profile).map(([key, val]) => {
                            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                            const color = val >= 70 ? 'emerald' : val >= 45 ? 'indigo' : 'rose';
                            return <MetricBar key={key} label={label} value={val} color={color} isDark={isDark} />;
                        })}
                    </div>
                </SectionCard>
            )}

            {/* ── Diagnoses ── */}
            {diagnoses && (
                <SectionCard title="Diagnostic Report" icon={Target} color="amber" isDark={isDark} defaultOpen={false}>
                    <div className="space-y-5 pt-1">
                        {Object.entries(diagnoses).map(([key, items]) => {
                            if (!Array.isArray(items) || items.length === 0) return null;
                            const labelMap = { academic: { label: '📚 Academic', color: 'indigo' }, behavioural: { label: '🧠 Behavioural', color: 'amber' }, exam_pattern: { label: '📝 Exam Pattern', color: 'violet' } };
                            const { label, color } = labelMap[key] || { label: key, color: 'indigo' };
                            const colorMap = {
                                indigo: isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-700',
                                amber: isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700',
                                violet: isDark ? 'bg-violet-500/10 text-violet-400' : 'bg-violet-50 text-violet-700',
                            };
                            return (
                                <div key={key}>
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${colorMap[color]} inline-block mb-3`}>{label}</span>
                                    <ul className="space-y-2">
                                        {items.map((item, i) => (
                                            <li key={i} className={`flex items-start gap-2 text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                                <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                </SectionCard>
            )}

            {/* ── Subject-wise Plan ── */}
            {subject_wise_plan?.length > 0 && (
                <SectionCard title="Subject-wise Study Plan" icon={BookOpen} color="emerald" isDark={isDark}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {subject_wise_plan.map((s, i) => (
                            <div key={i} className={`p-4 rounded-xl border ${isDark ? 'bg-[#0a0d14] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                                <p className={`font-black text-sm mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{s.subject}</p>
                                <p className={`text-xs font-medium leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{s.plan}</p>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}

            {/* ── Psychology + Behaviour Plan ── */}
            {psychology_behaviour_plan?.length > 0 && (
                <SectionCard title="Psychology & Behaviour Plan" icon={Star} color="violet" isDark={isDark} defaultOpen={false}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {psychology_behaviour_plan.map((item, i) => (
                            <div key={i} className={`p-4 rounded-xl border ${isDark ? 'bg-violet-500/5 border-violet-500/20' : 'bg-violet-50 border-violet-200'}`}>
                                <p className="font-black text-sm text-violet-500 mb-1">{item.area}</p>
                                <p className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{item.plan}</p>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}

            {/* ── Master Plan Markdown ── */}
            {master_plan_markdown && (
                <SectionCard title="Detailed Master Plan" icon={Calendar} color="indigo" isDark={isDark}>
                    <div className={`mt-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <PlanMarkdown content={master_plan_markdown} isDark={isDark} />
                    </div>
                </SectionCard>
            )}
        </div>
    );
}
