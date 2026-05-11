import React, { useState, useEffect } from 'react';
import {
    TrendingUp, Award, Clock, Target,
    BarChart2, Zap, Brain, ChevronUp,
    ChevronDown, Activity, Calendar, Filter,
    Layers, PieChart, Info, BookOpen, Loader2, PlayCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';

const AdvancedAnalytics = ({ isDarkMode }) => {
    const { getApiUrl, token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [selectedTimeframe, setSelectedTimeframe] = useState('This Month');
    const [realData, setRealData] = useState(null);
    const [curriculumData, setCurriculumData] = useState(null);
    const [refetchTick, setRefetchTick] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchAnalytics = async (isManual = false) => {
        try {
            if (isManual) setIsRefreshing(true);
            else setLoading(true);
            const response = await axios.get(`${getApiUrl()}/api/student/activity-analytics/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setRealData(response.data);
            
            // Fetch curriculum progress
            const curriculumRes = await axios.get(`${getApiUrl()}/api/student/curriculum-progress/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setCurriculumData(curriculumRes.data);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (token) fetchAnalytics(refetchTick > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, refetchTick]);

    // Mock data for things not yet tracked by activity logs
    const mockPredictions = {
        predictedRank: "1,200 - 1,500",
        probabilityOfTarget: "78%",
        focusArea: "Organic Chemistry",
        strengthArea: "Calculus",
        proficiency: [
            { subject: 'Physics', score: 82, trend: '+4%', subtopics: ['Mechanics', 'Optics', 'Thermodynamics'] },
            { subject: 'Chemistry', score: 68, trend: '-2%', subtopics: ['Organic', 'Inorganic', 'Physical'] },
            { subject: 'Mathematics', score: 91, trend: '+7%', subtopics: ['Calculus', 'Algebra', 'Trigonometry'] },
            { subject: 'Biology', score: 75, trend: '+1%', subtopics: ['Botany', 'Zoology', 'Genetics'] },
        ]
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 animate-pulse">Synchronizing Intelligence Engine...</p>
            </div>
        );
    }

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
                        <h2 className={`text-3xl font-black uppercase tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            Advanced Analytics
                        </h2>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Deep-dive insights across your performance metrics and AI predicted learning trajectories.
                        </p>
                        {realData && (
                            <p className="text-[10px] font-bold text-emerald-500 mt-2 uppercase tracking-widest">
                                • Last Synced: {new Date().toLocaleTimeString()}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Refresh Button */}
                        <button
                            onClick={() => setRefetchTick(t => t + 1)}
                            disabled={isRefreshing}
                            className={`flex items-center gap-2 px-4 py-2 rounded-[5px] border text-[10px] font-black uppercase tracking-widest transition-all
                                ${isDarkMode ? 'border-white/10 text-slate-400 hover:text-white hover:border-white/30' : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-400'}
                                ${isRefreshing ? 'opacity-60 cursor-not-allowed' : ''}`}
                            title="Refresh Analytics"
                        >
                            <Activity size={12} className={isRefreshing ? 'animate-spin' : ''} />
                            {isRefreshing ? 'Syncing...' : 'Refresh'}
                        </button>

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
                            <p className="text-3xl font-black tracking-tight mb-4">Calculating...</p>
                            <div className="flex items-center gap-2 text-[10px] font-bold bg-white/10 w-fit px-3 py-1.5 rounded-full">
                                <TrendingUp size={12} /> Analyzing study patterns
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className={`p-4 rounded-[5px] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">Active Days</p>
                                <p className="text-xl font-black text-indigo-500">{realData?.summary?.active_days || 0}d</p>
                            </div>
                            <div className={`p-4 rounded-[5px] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">Total Hours</p>
                                <p className="text-xl font-black text-orange-500">{realData?.total_hours || 0}h</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="p-2 rounded-[5px] bg-emerald-500/10 text-emerald-500">
                                    <Zap size={16} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Mastery Path</p>
                                    <p className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        {realData?.total_hours > 0 
                                            ? `Great job on your ${realData.total_hours}h study session! Keep it up.` 
                                            : "Start your first study session to see AI learning insights."}
                                    </p>
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
                            {(realData?.proficiency || []).map((prof, i) => (
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

                            <div className="grid grid-cols-7 gap-2 h-32">
                                {(realData?.heatmap || []).map((cell, i) => (
                                    <div
                                        key={i}
                                        className={`rounded-[2px] transition-all duration-300 hover:scale-125 cursor-help
                                            ${cell.active
                                                ? (cell.intensity > 3 ? 'bg-orange-500' : cell.intensity > 1 ? 'bg-orange-400/60' : 'bg-orange-300/30')
                                                : (isDarkMode ? 'bg-white/10' : 'bg-slate-200')
                                            }`}
                                        title={`${cell.day}: ${cell.hours} hrs`}
                                    />
                                ))}
                            </div>

                            <div className="flex justify-between items-center mt-2 border-t pt-4 border-dashed border-slate-200 dark:border-white/5">
                                <div className="flex items-center gap-1.5">
                                    <Award size={14} className="text-orange-500" />
                                    <span className="text-[10px] font-black uppercase text-orange-500">{realData?.streak || 0} Day Streak</span>
                                </div>
                                <div className="flex items-center gap-1.5 opacity-50">
                                    <Clock size={14} />
                                    <span className="text-[10px] font-bold tracking-tight uppercase">Avg {realData?.avg_daily_hours || 0} hrs/day</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Active Days', val: realData?.summary?.active_days || 0, sub: 'Out of last 35', icon: Calendar, color: 'indigo' },
                    { label: 'Study Sections', val: realData?.summary?.unique_sections || 0, sub: 'Total visited', icon: Layers, color: 'orange' },
                    { label: 'Video Plays', val: realData?.summary?.video_plays || 0, sub: 'Resources accessed', icon: PlayCircle, color: 'indigo' },
                    { label: 'Current Streak', val: realData?.streak || 0, sub: 'Consecutive days', icon: Award, color: 'orange' },
                ].map((card, i) => (
                    <div key={i} className={`p-6 rounded-[5px] border transition-all hover:scale-[1.02] ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                        <div className={`w-10 h-10 rounded-[5px] mb-4 flex items-center justify-center ${card.color === 'orange' ? 'bg-orange-500/10 text-orange-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                            {card.icon === PlayCircle ? <Activity size={20} /> : <card.icon size={20} />}
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
                        {(realData?.distribution || []).map((item, i) => (
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
                        {(!realData?.distribution || realData.distribution.length === 0) && (
                            <div className="text-center py-10 opacity-30 text-[10px] font-black uppercase tracking-widest">No activity data recorded yet</div>
                        )}
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
                                <p className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{realData?.total_hours || 0}h</p>
                                <p className="text-[9px] font-bold text-emerald-500 uppercase">Live Metrics</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Curriculum Mastery Section */}
            <div className={`p-8 rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-[5px] bg-indigo-500/10 text-indigo-500">
                            <BookOpen size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className={`font-black uppercase tracking-tight text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Curriculum Mastery</h3>
                            <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-0.5">Topic-wise learning coverage breakdown</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                         <div className="text-right">
                             <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Course Coverage</p>
                             <p className="text-sm font-black text-emerald-500">
                                 {curriculumData ? Math.round(curriculumData.reduce((acc, curr) => acc + curr.progress, 0) / (curriculumData.length || 1)) : 0}%
                             </p>
                         </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {curriculumData?.map((subject, sIdx) => (
                        <div key={sIdx} className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex items-center justify-between mb-6">
                                <h4 className={`font-black uppercase tracking-widest text-xs ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                                    {subject.subject}
                                </h4>
                                <span className="text-[10px] font-black text-indigo-500">{subject.progress}% Mastery</span>
                            </div>
                            
                            <div className="space-y-4">
                                {subject.chapters.map((chapter, cIdx) => (
                                    <div key={cIdx} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className={`text-[10px] font-bold uppercase tracking-tight ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                {chapter.name}
                                            </p>
                                            <p className="text-[9px] font-black opacity-40">{chapter.progress}%</p>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                                                style={{ width: `${chapter.progress}%` }}
                                            />
                                        </div>
                                        
                                        {/* Topics List with Video Breakdown */}
                                        <div className="pt-2 pl-2 space-y-3 border-l border-slate-200 dark:border-white/5">
                                            {chapter.topics.map((topic, tIdx) => (
                                                <div key={tIdx} className="space-y-2">
                                                    <div className="flex items-center justify-between group">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${topic.status === 'completed' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-white/10'}`} />
                                                            <p className={`text-[10px] font-black uppercase tracking-tight ${topic.status === 'completed' ? (isDarkMode ? 'text-slate-300' : 'text-slate-800') : 'opacity-30'}`}>
                                                                {topic.name}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Video Sub-list */}
                                                    <div className="pl-3 space-y-1.5">
                                                        {topic.videos?.map((video, vIdx) => (
                                                            <div key={vIdx} className="flex items-center justify-between group/vid">
                                                                <div className="flex items-center gap-2">
                                                                    <PlayCircle size={10} className={video.status === 'completed' ? 'text-emerald-500' : 'text-slate-400 opacity-40'} />
                                                                    <p className={`text-[9px] font-bold tracking-tight ${video.status === 'completed' ? (isDarkMode ? 'text-slate-400' : 'text-slate-600') : 'opacity-20'}`}>
                                                                        {video.title}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {video.duration_watched !== "0 min" && (
                                                                        <span className="text-[8px] font-black text-indigo-500/60 uppercase">{video.duration_watched}</span>
                                                                    )}
                                                                    <span className={`text-[8px] font-black uppercase tracking-widest ${video.status === 'completed' ? 'text-emerald-500' : 'opacity-10'}`}>
                                                                        {video.status === 'completed' ? 'DONE' : 'PENDING'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Video Activity Section */}
            <div className={`p-8 rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 rounded-[5px] bg-orange-500/10 text-orange-500">
                        <PlayCircle size={20} strokeWidth={2.5} />
                    </div>
                    <h3 className={`font-black uppercase tracking-tight text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Recent Video Activity</h3>
                </div>

                <div className="space-y-4">
                    {realData?.recent_videos?.length > 0 ? (
                        realData.recent_videos.map((video, i) => (
                            <div key={i} className={`flex items-center justify-between p-4 rounded-[5px] border ${isDarkMode ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'} transition-all group`}>
                                <div className="flex items-center gap-4">
                                    <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 group-hover:scale-110 transition-transform">
                                        <PlayCircle size={16} />
                                    </div>
                                    <div>
                                        <p className={`text-sm font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            {video.title}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">
                                                Resource ID: {video.id}
                                            </p>
                                            <div className="w-1 h-1 rounded-full bg-slate-300" />
                                            <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">
                                                {video.duration_watched} Watched
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {new Date(video.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                    </p>
                                    <p className="text-[10px] font-bold opacity-30 mt-0.5">
                                        {new Date(video.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 opacity-30 text-center">
                            <PlayCircle size={48} className="mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Video Activity Detected Yet</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdvancedAnalytics;
