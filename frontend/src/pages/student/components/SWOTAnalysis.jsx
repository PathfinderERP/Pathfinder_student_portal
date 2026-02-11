import React from 'react';
import {
    Zap, AlertTriangle, Lightbulb, Shield,
    Target, TrendingUp, CheckCircle, ArrowRight,
    Brain, Award, Star, Clock
} from 'lucide-react';

const SWOTAnalysis = ({ isDarkMode }) => {
    const swotData = {
        strengths: {
            title: "Strengths",
            subtitle: "Internal positive factors",
            icon: Shield,
            color: "indigo",
            items: [
                { text: "Strong logical reasoning in Mathematics", score: 92 },
                { text: "Consistent attendance (94%)", score: 94 },
                { text: "Active participation in physics labs", score: 88 },
                { text: "Quick learner for new concepts", score: 85 }
            ]
        },
        weaknesses: {
            title: "Weaknesses",
            subtitle: "Internal areas for improvement",
            icon: AlertTriangle,
            color: "red",
            items: [
                { text: "Time management during mock tests", score: 65 },
                { text: "Difficulty with advanced organic chemistry", score: 58 },
                { text: "Occasional procrastination on assignments", score: 70 },
                { text: "Hesitation in asking doubts during live classes", score: 62 }
            ]
        },
        opportunities: {
            title: "Opportunities",
            subtitle: "External factors for growth",
            icon: Lightbulb,
            color: "blue",
            items: [
                { text: "Upcoming WBJEE specialized workshop", tag: "Workshop" },
                { text: "Advanced mathematics elective next semester", tag: "Elective" },
                { text: "Peer tutoring program starting in March", tag: "Leadership" },
                { text: "Online resource library for entrance exams", tag: "Resource" }
            ]
        },
        threats: {
            title: "Threats",
            subtitle: "External challenges to mitigate",
            icon: Zap,
            color: "orange",
            items: [
                { text: "Increased difficulty level of upcoming topics", level: "High" },
                { text: "Conflict with external board examination schedule", level: "Medium" },
                { text: "Rising competition in percentile rankings", level: "Medium" },
                { text: "Technical requirements for online assessments", level: "Low" }
            ]
        }
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header Section */}
            <div className={`p-8 rounded-[5px] border relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'}`}>
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Target size={160} />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                    <div className={`w-20 h-20 rounded-[5px] bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-2xl`}>
                        <Brain size={40} className="text-white" />
                    </div>
                    <div className="text-center md:text-left">
                        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-2 bg-gradient-to-r from-orange-500 to-indigo-500 bg-clip-text text-transparent">
                            Academic SWOT Analysis
                        </h2>
                        <p className={`text-sm font-medium max-w-2xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            A deep dive into your academic profile. Leveraging AI-driven insights to identify your core strengths, address vulnerabilities, and capitalize on growth opportunities.
                        </p>
                    </div>
                </div>
            </div>

            {/* SWOT Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Strengths */}
                <SWOTCard data={swotData.strengths} isDark={isDarkMode} />

                {/* Weaknesses */}
                <SWOTCard data={swotData.weaknesses} isDark={isDarkMode} />

                {/* Opportunities */}
                <SWOTCard data={swotData.opportunities} isDark={isDarkMode} />

                {/* Threats */}
                <SWOTCard data={swotData.threats} isDark={isDarkMode} />
            </div>

            {/* AI Recommendation Section */}
            <div className={`p-8 rounded-[5px] border relative overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'}`}>
                <div className="absolute -bottom-10 -right-10 opacity-5 rotate-12">
                    <Award size={240} />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="px-3 py-1 rounded-[5px] bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-[0.2em]">
                            AI Recommendation
                        </div>
                    </div>
                    <h3 className="text-xl md:text-2xl font-black mb-4 bg-gradient-to-r from-orange-500 to-indigo-500 bg-clip-text text-transparent">
                        Personalized Strategy for WBJEE Success
                    </h3>
                    <div className="space-y-4 max-w-3xl">
                        <RecommendationItem
                            icon={CheckCircle}
                            text="Leverage your Mathematics strength by completing advanced problem sets from the online library."
                            color="indigo"
                            isDark={isDarkMode}
                        />
                        <RecommendationItem
                            icon={Clock}
                            text="Schedule 45-minute focused bursts for Inorganic Chemistry to mitigate study fatigue."
                            color="orange"
                            isDark={isDarkMode}
                        />
                        <RecommendationItem
                            icon={TrendingUp}
                            text="Participate in the upcoming workshop to gain exposure to higher-difficulty mock scenarios."
                            color="blue"
                            isDark={isDarkMode}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

const SWOTCard = ({ data, isDark }) => {
    const { title, subtitle, icon: Icon, color, items } = data;

    const colorVariants = {
        indigo: 'from-indigo-500 to-blue-600 border-indigo-500/10 bg-indigo-500/5 text-indigo-500',
        red: 'from-red-500 to-rose-600 border-red-500/10 bg-red-500/5 text-red-500',
        blue: 'from-blue-500 to-cyan-600 border-blue-500/10 bg-blue-500/5 text-blue-500',
        orange: 'from-orange-500 to-amber-600 border-orange-500/10 bg-orange-500/5 text-orange-500'
    };

    const gradient = colorVariants[color].split(' ').slice(0, 2).join(' ');

    return (
        <div className={`p-8 rounded-[5px] border group transition-all duration-500 hover:shadow-2xl ${isDark ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]' : 'bg-white border-slate-200 shadow-lg shadow-slate-200/30'}`}>
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-[5px] bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                        <Icon size={28} className="text-white" />
                    </div>
                    <div>
                        <h4 className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h4>
                        <p className={`text-xs font-bold opacity-50 uppercase tracking-widest`}>{subtitle}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {items.map((item, idx) => (
                    <div key={idx} className={`p-4 rounded-[5px] border flex items-center justify-between group/item transition-all duration-300 ${isDark ? 'bg-white/5 border-white/5 border-l-2' : 'bg-slate-50 border-slate-100 border-l-2'} ${item.score ? (item.score > 80 ? 'border-l-indigo-500' : 'border-l-slate-400') : 'border-l-blue-500'}`}>
                        <div className="flex items-center gap-3">
                            <span className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{item.text}</span>
                        </div>

                        {item.score && (
                            <div className="text-right">
                                <span className={`text-xs font-black ${item.score > 80 ? 'text-indigo-500' : (item.score < 60 ? 'text-red-500' : 'text-slate-400')}`}>
                                    {item.score}%
                                </span>
                            </div>
                        )}

                        {item.tag && (
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter bg-blue-500/10 text-blue-500 border border-blue-500/20`}>
                                {item.tag}
                            </span>
                        )}

                        {item.level && (
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${item.level === 'High' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'}`}>
                                {item.level} Risk
                            </span>
                        )}
                    </div>
                ))}
            </div>

            <button className={`mt-8 flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-30 group-hover:opacity-100 transition-opacity duration-500 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                View Details <ArrowRight size={14} />
            </button>
        </div>
    );
};

const RecommendationItem = ({ icon: Icon, text, color, isDark }) => {
    const colorClasses = {
        indigo: 'bg-indigo-500/10 text-indigo-500',
        orange: 'bg-orange-500/10 text-orange-500',
        blue: 'bg-blue-500/10 text-blue-500'
    };

    return (
        <div className={`flex gap-4 p-4 rounded-[5px] transition-all duration-300 ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
            <div className={`shrink-0 w-10 h-10 rounded-[5px] ${colorClasses[color]} flex items-center justify-center`}>
                <Icon size={20} />
            </div>
            <p className={`text-sm font-bold leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {text}
            </p>
        </div>
    );
};

export default SWOTAnalysis;
