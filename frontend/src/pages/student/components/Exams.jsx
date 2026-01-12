import React from 'react';
import { FileText, Calendar, Clock, Award, TrendingUp } from 'lucide-react';

const Exams = ({ isDarkMode }) => {
    // Mock data - replace with actual API data
    const upcomingExams = [
        { name: 'Physics Unit Test', date: '2026-01-20', time: '10:00 AM', duration: '2 hours', syllabus: 'Chapters 1-5' },
        { name: 'Mathematics Mock Test', date: '2026-01-25', time: '2:00 PM', duration: '3 hours', syllabus: 'Full Syllabus' },
        { name: 'Chemistry Quiz', date: '2026-01-28', time: '11:00 AM', duration: '1 hour', syllabus: 'Organic Chemistry' },
    ];

    const completedExams = [
        { name: 'Biology Test', date: '2026-01-10', marks: 85, total: 100, rank: 5 },
        { name: 'English Test', date: '2026-01-05', marks: 92, total: 100, rank: 2 },
        { name: 'Physics Mock', date: '2025-12-28', marks: 78, total: 100, rank: 12 },
    ];

    return (
        <div className="space-y-6">
            {/* Upcoming Exams */}
            <div className={`p-6 rounded-[2rem] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-50 flex items-center gap-2 mb-6">
                    <Calendar size={14} className="text-orange-500" /> Upcoming Exams
                </h3>
                <div className="space-y-4">
                    {upcomingExams.map((exam, idx) => (
                        <div key={idx} className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h4 className={`font-black text-base mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        {exam.name}
                                    </h4>
                                    <p className="text-xs font-bold opacity-50">{exam.syllabus}</p>
                                </div>
                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-500 border border-orange-500/20">
                                    Upcoming
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-xs">
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} className="opacity-40" />
                                    <span className="font-bold opacity-70">{exam.date}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock size={14} className="opacity-40" />
                                    <span className="font-bold opacity-70">{exam.time}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FileText size={14} className="opacity-40" />
                                    <span className="font-bold opacity-70">{exam.duration}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Results */}
            <div className={`p-6 rounded-[2rem] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-50 flex items-center gap-2 mb-6">
                    <Award size={14} className="text-emerald-500" /> Recent Results
                </h3>
                <div className="space-y-4">
                    {completedExams.map((exam, idx) => (
                        <div key={idx} className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h4 className={`font-black text-base mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        {exam.name}
                                    </h4>
                                    <p className="text-xs font-bold opacity-50">{exam.date}</p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        {exam.marks}/{exam.total}
                                    </p>
                                    <p className="text-xs font-bold text-emerald-500">
                                        {((exam.marks / exam.total) * 100).toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <TrendingUp size={14} className="text-purple-500" />
                                    <span className="text-xs font-black opacity-70">Rank: #{exam.rank}</span>
                                </div>
                                {/* Progress Bar */}
                                <div className={`flex-1 ml-4 h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/5' : 'bg-slate-200'}`}>
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-green-400"
                                        style={{ width: `${(exam.marks / exam.total) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Exams;
