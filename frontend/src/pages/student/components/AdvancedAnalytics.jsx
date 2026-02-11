import React, { useState, useEffect } from 'react';
import {
    TrendingUp, Award, Clock, Target,
    BarChart2, Zap, Brain, ChevronUp,
    ChevronDown, Activity, Calendar, Filter,
    Layers, PieChart, Info, BookOpen
} from 'lucide-react';
import { motion } from 'framer-motion';

const AdvancedAnalytics = ({ isDarkMode }) => {
    const [selectedTimeframe, setSelectedTimeframe] = useState('This Month');

    // Mock data for analytics
    const analyticsData = {
        proficiency: [
            { subject: 'Physics', score: 82, trend: '+4%', subtopics: ['Mechanics', 'Optics', 'Thermodynamics'] },
            { subject: 'Chemistry', score: 68, trend: '-2%', subtopics: ['Organic', 'Inorganic', 'Physical'] },
            { subject: 'Mathematics', score: 91, trend: '+7%', subtopics: ['Calculus', 'Algebra', 'Trigonometry'] },
            { subject: 'Biology', score: 75, trend: '+1%', subtopics: ['Botany', 'Zoology', 'Genetics'] },
        ],
        heatmap: Array.from({ length: 35 }, (_, i) => ({
            day: i + 1,
            intensity: Math.floor(Math.random() * 5), // 0 to 4
            active: Math.random() > 0.2
        })),
        predictions: {
            predictedRank: "1,200 - 1,500",
            probabilityOfTarget: "78%",
            focusArea: "Organic Chemistry",
            strengthArea: "Calculus"
        }
    };

    return (
        <div className="space-y-8 animate-fade-in-up pb-10">
            {/* Header section with Stats */}
            <div className={`p-8 rounded-[5px] border relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="px-3 py-1 rounded-[5px] bg-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase tracking-[0.2em]">
                                Intelligence Engine
                            </div>
                        </div>
                        <h2 className="text-3xl font-black uppercase tracking-tight mb-2 bg-gradient-to-r from-orange-500 to-indigo-500 bg-clip-text text-transparent">
                            Advanced Analytics
                        </h2>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Deep-dive insights across your performance metrics and AI predicted learning trajectories.
                        </p>
                    </div>

                    <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-[5px]">
                        {['7 Days', '30 Days', 'This Session'].map((opt) => (
                            <button
                                key={opt}
                                onClick={() => setSelectedTimeframe(opt)}
                                className={`px-4 py-2 rounded-[5px] text-[10px] font-black uppercase tracking-widest transition-all ${selectedTimeframe === opt
                                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                        : 'text-slate-500 hover:text-orange-500'
                                    }`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>

                <BarChart2 size={200} className="absolute -right-10 -bottom-10 opacity-[0.03] rotate-12" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Predictions & AI Insights Card */}
                <div className={`lg:col-span-1 p-8 rounded-[5px] border flex flex-col gap-8 relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-[5px] bg-orange-500/10 text-orange-500">
                            <Brain size={20} strokeWidth={2.5} />
                        </div>
                        <h3 className={`font-black uppercase tracking-tight text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>AI Predictions</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="p-6 rounded-[5px] bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-xl shadow-indigo-600/20">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Predicted Rank (WBJEE)</p>
                            <p className="text-3xl font-black tracking-tight mb-4">{analyticsData.predictions.predictedRank}</p>
                            <div className="flex items-center gap-2 text-[10px] font-bold bg-white/10 w-fit px-3 py-1.5 rounded-full">
                                <TrendingUp size={12} /> Improving by 150 ranks weekly
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className={`p-4 rounded-[5px] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">Target Match</p>
                                <p className="text-xl font-black text-indigo-500">{analyticsData.predictions.probabilityOfTarget}</p>
                            </div>
                            <div className={`p-4 rounded-[5px] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">Mock percentile</p>
                                <p className="text-xl font-black text-orange-500">92.4%</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="p-2 rounded-[5px] bg-red-500/10 text-red-500">
                                    <Target size={16} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Critical Gap</p>
                                    <p className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>You need 12% more accuracy in Organic Chemistry mechanisms.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="p-2 rounded-[5px] bg-emerald-500/10 text-emerald-500">
                                    <Zap size={16} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Mastery Path</p>
                                    <p className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Great focus on Calculus! Maintain regular revision to secure top mark.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Performance Trends Section */}
                <div className={`lg:col-span-2 p-8 rounded-[5px] border relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-[5px] bg-indigo-500/10 text-indigo-500">
                                <Activity size={20} strokeWidth={2.5} />
                            </div>
                            <h3 className={`font-black uppercase tracking-tight text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Learning Proficiency</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                <span className="text-[9px] font-black uppercase opacity-60">Avg Score</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Subject Proficiency Bars */}
                        <div className="space-y-6">
                            {analyticsData.proficiency.map((prof, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{prof.subject}</span>
                                            <span className={`text-[10px] font-bold ${prof.trend.includes('+') ? 'text-emerald-500' : 'text-red-500'}`}>{prof.trend}</span>
                                        </div>
                                        <span className="text-xl font-black text-indigo-500">{prof.score}%</span>
                                    </div>
                                    <div className={`h-2.5 rounded-[5px] overflow-hidden ${isDarkMode ? 'bg-white/5' : 'bg-slate-100 shadow-inner'}`}>
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${prof.score}%` }}
                                            transition={{ duration: 1.5, delay: i * 0.1, ease: "easeOut" }}
                                            className={`h-full rounded-r-[5px] bg-gradient-to-r ${prof.subject === 'Physics' ? 'from-blue-500 to-indigo-600' :
                                                    prof.subject === 'Chemistry' ? 'from-orange-500 to-red-600' :
                                                        prof.subject === 'Mathematics' ? 'from-indigo-500 to-purple-600' :
                                                            'from-emerald-500 to-green-600'
                                                }`}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Heatmap Section */}
                        <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'} flex flex-col gap-4`}>
                            <div className="flex justify-between items-center">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Study Consistency (L35 Days)</p>
                                <Info size={14} className="opacity-30" />
                            </div>

                            <div className="grid grid-cols-7 gap-2">
                                {analyticsData.heatmap.map((cell, i) => (
                                    <div
                                        key={i}
                                        className={`aspect-square rounded-[2px] transition-all duration-300 hover:scale-125
                                            ${cell.active
                                                ? (cell.intensity > 3 ? 'bg-orange-500' : cell.intensity > 1 ? 'bg-orange-400/60' : 'bg-orange-300/30')
                                                : (isDarkMode ? 'bg-white/5' : 'bg-slate-200 opacity-50')
                                            }`}
                                        title={`Day ${cell.day}: ${cell.intensity} hrs`}
                                    />
                                ))}
                            </div>

                            <div className="flex justify-between items-center mt-2 border-t pt-4 border-dashed border-slate-200 dark:border-white/5">
                                <div className="flex items-center gap-1.5">
                                    <Award size={14} className="text-orange-500" />
                                    <span className="text-[10px] font-black uppercase text-orange-500">12 Day Streak</span>
                                </div>
                                <div className="flex items-center gap-1.5 opacity-50">
                                    <Clock size={14} />
                                    <span className="text-[10px] font-bold tracking-tight uppercase">Avg 3.2 hrs/day</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Time Advantage', val: '+45m', sub: 'vs batch avg', icon: Clock, color: 'indigo' },
                    { label: 'Accuracy', val: '86.4%', sub: 'Global: 68%', icon: Target, color: 'orange' },
                    { label: 'Solved Items', val: '1,240', sub: 'Last 500 Correct', icon: Layers, color: 'indigo' },
                    { label: 'Batch Rank', val: '4th', sub: 'Top 5 percent', icon: Award, color: 'orange' },
                ].map((card, i) => (
                    <div key={i} className={`p-6 rounded-[5px] border transition-all hover:scale-[1.02] ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                        <div className={`w-10 h-10 rounded-[5px] mb-4 flex items-center justify-center ${card.color === 'orange' ? 'bg-orange-500/10 text-orange-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                            <card.icon size={20} />
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">{card.label}</p>
                        <p className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{card.val}</p>
                        <p className="text-[10px] font-bold opacity-40 mt-1">{card.sub}</p>
                    </div>
                ))}
            </div>

            <div className={`p-8 rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2.5 rounded-[5px] bg-indigo-500/10 text-indigo-500">
                        <Calendar size={20} strokeWidth={2.5} />
                    </div>
                    <h3 className={`font-black uppercase tracking-tight text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Time Distribution Per Topic</h3>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 items-center">
                    <div className="space-y-4">
                        {[
                            { topic: 'Inorganic Chemistry', time: '12.5 hrs', percent: 25, color: 'bg-blue-500' },
                            { topic: 'Integral Calculus', time: '18.2 hrs', percent: 38, color: 'bg-indigo-500' },
                            { topic: 'Electromagnetic Waves', time: '9.4 hrs', percent: 18, color: 'bg-orange-500' },
                            { topic: 'General English', time: '4.8 hrs', percent: 9, color: 'bg-slate-400' },
                            { topic: 'Others', time: '5.2 hrs', percent: 10, color: 'bg-slate-300' },
                        ].map((item, i) => (
                            <div key={i} className="group cursor-default">
                                <div className="flex justify-between items-center mb-1.5 px-1">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${item.color}`}></div>
                                        <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.topic}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.time}</span>
                                        <span className="text-[10px] opacity-40 ml-2 font-bold">({item.percent}%)</span>
                                    </div>
                                </div>
                                <div className={`h-1.5 w-full rounded-full transition-all duration-500 overflow-hidden ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}>
                                    <div className={`h-full ${item.color} opacity-80 group-hover:opacity-100`} style={{ width: `${item.percent}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="hidden xl:flex items-center justify-center">
                        <div className="relative w-64 h-64">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="45" className="fill-transparent stroke-slate-100 dark:stroke-white/5" strokeWidth="8" />
                                <circle cx="50" cy="50" r="45" className="fill-transparent stroke-indigo-500" strokeWidth="10" strokeDasharray="282.7" strokeDashoffset="175" />
                                <circle cx="50" cy="50" r="45" className="fill-transparent stroke-orange-500" strokeWidth="10" strokeDasharray="282.7" strokeDashoffset="240" />
                                <circle cx="50" cy="50" r="45" className="fill-transparent stroke-blue-500" strokeWidth="10" strokeDasharray="282.7" strokeDashoffset="260" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Total Learning</p>
                                <p className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>50.1h</p>
                                <p className="text-[9px] font-bold text-emerald-500 uppercase">+12% vs last week</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdvancedAnalytics;
