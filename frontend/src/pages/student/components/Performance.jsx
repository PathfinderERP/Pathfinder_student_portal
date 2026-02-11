import React from 'react';
import { TrendingUp, Award, Target, BarChart2 } from 'lucide-react';

const Performance = ({ isDarkMode }) => {
    // Mock data
    const subjects = [
        { name: 'Physics', score: 85, trend: '+5', color: 'blue' },
        { name: 'Chemistry', score: 78, trend: '-2', color: 'purple' },
        { name: 'Mathematics', score: 92, trend: '+8', color: 'green' },
        { name: 'Biology', score: 88, trend: '+3', color: 'orange' },
        { name: 'English', score: 75, trend: '+1', color: 'pink' },
    ];

    const overallStats = {
        average: 83.6,
        rank: 8,
        percentile: 94,
        improvement: '+12%'
    };

    return (
        <div className="space-y-6">
            {/* Overall Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                    title="Average Score"
                    value={`${overallStats.average}%`}
                    icon={BarChart2}
                    color="purple"
                    isDark={isDarkMode}
                />
                <StatCard
                    title="Class Rank"
                    value={`#${overallStats.rank}`}
                    icon={Award}
                    color="orange"
                    isDark={isDarkMode}
                />
                <StatCard
                    title="Percentile"
                    value={`${overallStats.percentile}th`}
                    icon={Target}
                    color="green"
                    isDark={isDarkMode}
                />
                <StatCard
                    title="Improvement"
                    value={overallStats.improvement}
                    icon={TrendingUp}
                    color="blue"
                    isDark={isDarkMode}
                />
            </div>

            {/* Subject-wise Performance */}
            <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-6 bg-gradient-to-r from-orange-500 to-indigo-500 bg-clip-text text-transparent">
                    Subject-wise Performance
                </h3>
                <div className="space-y-4">
                    {subjects.map((subject, idx) => (
                        <div key={idx} className={`p-5 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-[5px] bg-gradient-to-br ${getColorGradient(subject.color)} flex items-center justify-center shadow-lg`}>
                                        <span className="text-white font-black text-sm">{subject.name[0]}</span>
                                    </div>
                                    <div>
                                        <h4 className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            {subject.name}
                                        </h4>
                                        <p className="text-[10px] font-bold opacity-50">Current Score</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        {subject.score}%
                                    </p>
                                    <p className={`text-xs font-black ${subject.trend.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {subject.trend}
                                    </p>
                                </div>
                            </div>
                            {/* Progress Bar */}
                            <div className={`h-2 rounded-[5px] overflow-hidden ${isDarkMode ? 'bg-white/5' : 'bg-slate-200'}`}>
                                <div
                                    className={`h-full bg-gradient-to-r ${getColorGradient(subject.color)}`}
                                    style={{ width: `${subject.score}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon: Icon, color, isDark }) => {
    const colorClasses = {
        purple: 'from-purple-500 to-indigo-600',
        orange: 'from-orange-500 to-red-600',
        green: 'from-emerald-500 to-green-600',
        blue: 'from-blue-500 to-cyan-600',
    };

    return (
        <div className={`p-6 rounded-[5px] border ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-[5px] bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg`}>
                    <Icon size={24} className="text-white" strokeWidth={2.5} />
                </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">{title}</p>
            <p className={`text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
        </div>
    );
};

const getColorGradient = (color) => {
    const gradients = {
        blue: 'from-blue-500 to-cyan-600',
        purple: 'from-purple-500 to-indigo-600',
        green: 'from-emerald-500 to-green-600',
        orange: 'from-orange-500 to-red-600',
        pink: 'from-pink-500 to-rose-600',
    };
    return gradients[color] || gradients.blue;
};

export default Performance;
