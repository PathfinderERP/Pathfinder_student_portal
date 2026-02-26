import React, { useState } from 'react';
import {
    ChevronRight, ArrowLeft, Award, Target,
    CheckCircle2, XCircle, Clock, Calendar,
    BarChart3, LayoutDashboard, Microscope,
    BookOpen, PieChart, Activity
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const OMRStudentPerformance = ({ student, onBack }) => {
    const { isDarkMode } = useTheme();
    const [activeTab, setActiveTab] = useState('Score Overview');

    const tabs = ['Score Overview', 'Compare Result', 'Section Wise Result', 'Solution'];

    // Mock data based on the screenshot provided
    const performanceData = {
        score: student?.marks || '73.83',
        rank: student?.rank || '1',
        attempted: '54/75',
        accuracy: student?.accuracy || '66.00%',
        stats: {
            percentage: '73.83%',
            percentile: '100.00',
            positiveMark: '+73.00',
            negativeMark: '-0.50',
            totalTime: '1 Hr',
            timeSpent: '52 Mins',
            submittedDate: 'Sat Sep 07 2024',
            totalQuestions: 75,
            correct: 51,
            partial: 1,
            incorrect: 2,
            unattempted: 21
        }
    };

    return (
        <div className="p-1 animate-fade-in text-[#2D3748] dark:text-slate-200">
            {/* Breadcrumb & Navigation */}
            <div className="mb-8">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">
                    <span className="hover:text-blue-600 cursor-pointer" onClick={onBack}>Pages</span>
                    <ChevronRight size={10} />
                    <span className="hover:text-blue-600 cursor-pointer" onClick={onBack}>Result</span>
                    <ChevronRight size={10} />
                    <span className="text-blue-600 uppercase">Performance Analysis</span>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className={`p-2 rounded-[5px] border transition-all hover:bg-blue-50 hover:text-blue-600 ${isDarkMode ? 'bg-white/5 border-white/5 text-slate-400' : 'bg-white border-slate-100 text-slate-500'}`}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-4xl font-black tracking-tight uppercase leading-none dark:text-white">Result</h2>
                        <p className="text-[10px] font-black opacity-30 mt-1 uppercase tracking-widest leading-none dark:text-slate-400">
                            Performance Analysis for {student?.name || 'Student'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Sub Tabs */}
            <div className="flex gap-8 mb-10 border-b dark:border-white/5">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === tab
                            ? 'text-blue-600'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                            }`}
                    >
                        {tab}
                        {activeTab === tab && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 animate-scale-up" />
                        )}
                    </button>
                ))}
            </div>

            {activeTab === 'Score Overview' ? (
                <div className="animate-fade-in">
                    {/* Top Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        {[
                            { label: 'Your Score', value: performanceData.score, color: 'text-emerald-600', icon: Award },
                            { label: 'Your Rank', value: performanceData.rank, color: 'text-blue-600', icon: LayoutDashboard },
                            { label: 'Question Attempted', value: performanceData.attempted, color: 'text-slate-600', icon: BookOpen },
                            { label: 'Accuracy', value: performanceData.accuracy, color: 'text-[#1B5E20]', icon: Target }
                        ].map((card, idx) => (
                            <div key={idx} className={`p-8 rounded-[10px] border shadow-xl flex flex-col items-center justify-center text-center transition-all hover:scale-[1.02] ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                                <p className={`text-[12px] font-black uppercase tracking-[0.2em] mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{card.label}</p>
                                <p className={`text-2xl font-black ${card.color} dark:text-white`}>{card.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Detailed Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Summary Column 1 */}
                        <div className={`p-8 rounded-[10px] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-[#1B5E20]">Percentage</span>
                                    <span className="text-sm font-black text-[#1B5E20]">{performanceData.stats.percentage}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-blue-600">Percentile</span>
                                    <span className="text-sm font-black text-blue-600">{performanceData.stats.percentile}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-emerald-500">Positive Mark :</span>
                                    <span className="text-sm font-black text-emerald-500">{performanceData.stats.positiveMark}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-red-500">Negative Mark :</span>
                                    <span className="text-sm font-black text-red-500">{performanceData.stats.negativeMark}</span>
                                </div>
                            </div>
                        </div>

                        {/* Summary Column 2 */}
                        <div className={`p-8 rounded-[10px] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-black uppercase tracking-widest opacity-60">Total Test Time :</span>
                                    <span className="text-sm font-black opacity-80">{performanceData.stats.totalTime}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-blue-600">You Spend :</span>
                                    <span className="text-sm font-black text-blue-600">{performanceData.stats.timeSpent}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-black uppercase tracking-widest opacity-60">Submitted date :</span>
                                    <span className="text-sm font-black opacity-80">{performanceData.stats.submittedDate}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-black uppercase tracking-widest opacity-60">Total Question :</span>
                                    <span className="text-sm font-black opacity-80">{performanceData.stats.totalQuestions}</span>
                                </div>
                            </div>
                        </div>

                        {/* Summary Column 3 */}
                        <div className={`p-8 rounded-[10px] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-emerald-500">Correct :</span>
                                    <span className="text-sm font-black text-emerald-500">{performanceData.stats.correct}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-blue-500">Partial :</span>
                                    <span className="text-sm font-black text-blue-500">{performanceData.stats.partial}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-red-500">Incorrect :</span>
                                    <span className="text-sm font-black text-red-500">{performanceData.stats.incorrect}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-[#1B5E20]">unattempted :</span>
                                    <span className="text-sm font-black text-[#1B5E20]">{performanceData.stats.unattempted}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'Compare Result' ? (
                <div className="animate-fade-in space-y-8">
                    {/* Top Analysis Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Score Analysis */}
                        <div className={`p-8 rounded-[10px] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-center mb-8 opacity-40">Score Analysis</h3>
                            <div className="flex justify-around items-end h-64 px-4">
                                {[
                                    { label: "Topper's", value: '73.83%', height: '100%', color: 'bg-emerald-400' },
                                    { label: "Average", value: '18.53%', height: '25%', color: 'bg-indigo-400' },
                                    { label: "Your's", value: '73.83%', height: '100%', color: 'bg-indigo-400' }
                                ].map((bar, i) => (
                                    <div key={i} className="flex flex-col items-center gap-4 flex-1">
                                        <span className="text-[10px] font-bold opacity-60 mb-2">{bar.value}</span>
                                        <div className={`w-12 rounded-t-[4px] relative bg-slate-100 dark:bg-white/5 overflow-hidden flex items-end`} style={{ height: '180px' }}>
                                            <div className={`w-full ${bar.color} transition-all duration-1000 delay-${i * 200} shadow-lg`} style={{ height: bar.height }} />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-2">{bar.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Accuracy Analysis */}
                        <div className={`p-8 rounded-[10px] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-center mb-8 opacity-40">Accuracy Analysis</h3>
                            <div className="flex justify-around items-end h-64 px-4">
                                {[
                                    { label: "Topper's", value: '66.00%', height: '100%', color: 'bg-emerald-400' },
                                    { label: "Average", value: '1.63 %', height: '15%', color: 'bg-indigo-400' },
                                    { label: "Your's", value: '66.00%', height: '100%', color: 'bg-indigo-400' }
                                ].map((bar, i) => (
                                    <div key={i} className="flex flex-col items-center gap-4 flex-1">
                                        <span className="text-[10px] font-bold opacity-60 mb-2">{bar.value}</span>
                                        <div className={`w-12 rounded-t-[4px] relative bg-slate-100 dark:bg-white/5 overflow-hidden flex items-end`} style={{ height: '180px' }}>
                                            <div className={`w-full ${bar.color} transition-all duration-1000 delay-${i * 200} shadow-lg`} style={{ height: bar.height }} />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-2">{bar.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Comparison Chart */}
                    <div className={`p-10 rounded-[10px] border shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                        <div className="relative h-96 w-full flex flex-col justify-end">
                            {/* Grid Lines */}
                            <div className="absolute inset-0 flex flex-col justify-between py-10 opacity-5">
                                {[80, 60, 40, 20, 0].map(val => (
                                    <div key={val} className="flex items-center gap-4">
                                        <span className="text-[10px] font-bold w-4">{val}</span>
                                        <div className="flex-1 h-px bg-slate-500 border-dashed" style={{ borderTopWidth: '1px', borderStyle: 'dotted' }} />
                                    </div>
                                ))}
                            </div>

                            {/* Bars Container */}
                            <div className="flex justify-around items-end h-72 px-8 relative z-10 gap-2">
                                {[
                                    { rank: 'Rank1', score: 75, color: 'bg-indigo-400' },
                                    { rank: 'Rank2', score: 68, color: 'bg-indigo-400' },
                                    { rank: 'Rank3', score: 67, color: 'bg-indigo-400' },
                                    { rank: 'Rank4', score: 61, color: 'bg-indigo-400' },
                                    { rank: 'Rank5', score: 60, color: 'bg-indigo-400' },
                                    { rank: 'Rank6', score: 59.5, color: 'bg-indigo-400' },
                                    { rank: 'Rank7', score: 56.5, color: 'bg-indigo-400' },
                                    { rank: 'Rank8', score: 55, color: 'bg-indigo-400' },
                                    { rank: 'Rank9', score: 53.5, color: 'bg-indigo-400' },
                                    { rank: 'Rank10', score: 53.5, color: 'bg-indigo-400' },
                                    { rank: 'You', score: 73.83, color: 'bg-emerald-400' }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex flex-col items-center flex-1 min-w-[30px] gap-4">
                                        <div className={`w-full ${item.color} rounded-t-[4px] shadow-lg transition-all duration-1000`} style={{ height: `${(item.score / 80) * 100}%` }} />
                                        <span className="text-[10px] font-black uppercase tracking-tight opacity-40 whitespace-nowrap">{item.rank}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Legend */}
                            <div className="flex justify-center gap-6 mt-10">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-indigo-400 rounded-sm" />
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">score</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-emerald-400 rounded-sm" />
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">your Mark</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'Section Wise Result' ? (
                <div className="animate-fade-in">
                    {/* Section Results Table */}
                    <div className={`rounded-[5px] border overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className={`text-[10px] font-black uppercase tracking-widest text-white border-b ${isDarkMode ? 'bg-[#7c7cfc]/80 border-white/5' : 'bg-[#9393f9] border-slate-100'}`}>
                                        <th className="py-6 px-10">#</th>
                                        <th className="py-6 px-10">Sections</th>
                                        <th className="py-6 px-10">Total Questions</th>
                                        <th className="py-6 px-10">Correct</th>
                                        <th className="py-6 px-10">Partial</th>
                                        <th className="py-6 px-10">Incorrect</th>
                                        <th className="py-6 px-10">+ve Mark</th>
                                        <th className="py-6 px-10">-ve Mark</th>
                                        <th className="py-6 px-10">Marks</th>
                                        <th className="py-6 px-10">Total Marks</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-50'}`}>
                                    {[
                                        { id: 1, name: 'MATH_CATEGORY_1', total: 50, correct: 29, partial: 0, incorrect: 0, positive: '29.00', negative: '-0.00', marks: '29.00', totalMarks: '50.00' },
                                        { id: 2, name: 'MATH_CATEGORY_2', total: 15, correct: 14, partial: 0, incorrect: 1, positive: '28.00', negative: '-0.50', marks: '27.50', totalMarks: '30.00' },
                                        { id: 3, name: 'MATH_CATEGORY_3', total: 10, correct: 8, partial: 1, incorrect: 1, positive: '17.33', negative: '-0.00', marks: '17.33', totalMarks: '20.00' }
                                    ].map((section, idx) => (
                                        <tr key={section.id} className={`group transition-all ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-blue-50/20'}`}>
                                            <td className="py-6 px-10 font-bold text-xs opacity-60">{section.id}</td>
                                            <td className="py-6 px-10">
                                                <span className="font-extrabold text-xs uppercase tracking-tight text-[#2D3748] dark:text-slate-200">{section.name}</span>
                                            </td>
                                            <td className="py-6 px-10 text-xs font-bold opacity-80">{section.total}</td>
                                            <td className="py-6 px-10 text-xs font-bold text-emerald-500">{section.correct}</td>
                                            <td className="py-6 px-10 text-xs font-bold text-blue-500">{section.partial}</td>
                                            <td className="py-6 px-10 text-xs font-bold text-red-500">{section.incorrect}</td>
                                            <td className="py-6 px-10 text-xs font-bold text-emerald-500">{section.positive}</td>
                                            <td className="py-6 px-10 text-xs font-bold text-red-500">{section.negative}</td>
                                            <td className="py-6 px-10 text-xs font-black text-blue-600">{section.marks}</td>
                                            <td className="py-6 px-10 text-xs font-black opacity-40">{section.totalMarks}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'Solution' ? (
                <div className="animate-fade-in">
                    {/* Solution Sub-Sections */}
                    <div className="flex gap-4 mb-8 overflow-x-auto pb-2 custom-scrollbar">
                        {['MATH_CATEGORY_1', 'MATH_CATEGORY_2', 'MATH_CATEGORY_3'].map((sec) => (
                            <button
                                key={sec}
                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-all rounded-[5px] whitespace-nowrap ${sec === 'MATH_CATEGORY_1'
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                        : 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/5 opacity-50 hover:opacity-100'
                                    }`}
                            >
                                {sec}
                            </button>
                        ))}
                    </div>

                    {/* Questions List */}
                    <div className="space-y-12">
                        {[
                            {
                                id: 1,
                                type: 'MCQ',
                                maxMarks: 1,
                                negativeMarks: 0.25,
                                text: 'If the first term of an A.P. is 3 and the sum of its first 25 terms is equal to the sum of its next 15 terms, then the common difference of this A.P., is',
                                options: [
                                    { key: 'a', text: '1/6', isCorrect: true },
                                    { key: 'b', text: '1/5' },
                                    { key: 'c', text: '1/4' },
                                    { key: 'd', text: '1/7' }
                                ],
                                userMarks: 0
                            },
                            {
                                id: 2,
                                type: 'MCQ',
                                maxMarks: 1,
                                negativeMarks: 0.25,
                                text: 'If 2^logx + 3^logx = 10^logx, then x =',
                                options: [
                                    { key: 'a', text: '63' },
                                    { key: 'b', text: '10', isUserCorrect: true, isCorrect: true },
                                    { key: 'c', text: '1' },
                                    { key: 'd', text: '6' }
                                ],
                                userMarks: 1
                            },
                            {
                                id: 3,
                                type: 'MCQ',
                                maxMarks: 1,
                                negativeMarks: 0.25,
                                text: 'The number of values of \'x\' satisfying x + log10(1 + 2^x) = x log10 5 + log10 6, is',
                                options: [
                                    { key: 'a', text: '0' },
                                    { key: 'b', text: '1', isCorrect: true },
                                    { key: 'c', text: '2' },
                                    { key: 'd', text: 'infinity' }
                                ],
                                userMarks: 0
                            }
                        ].map((q) => (
                            <div key={q.id} className="animate-slide-up">
                                {/* Question Header */}
                                <div className={`px-8 py-3 flex justify-between items-center rounded-t-[5px] border-x border-t ${isDarkMode ? 'bg-[#1a1f2e] border-white/5' : 'bg-slate-100/80 border-slate-100'}`}>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs font-black uppercase tracking-tight">Q.{q.id} Question Type : {q.type}</span>
                                    </div>
                                    <span className="text-[10px] font-bold opacity-60">Maximum Mark : {q.maxMarks} | Negative Mark : {q.negativeMarks}</span>
                                </div>

                                {/* Question Content */}
                                <div className={`p-8 border rounded-b-[5px] shadow-xl ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/40'}`}>
                                    <p className="text-xs font-bold mb-8 leading-relaxed opacity-90">{q.text}</p>

                                    <div className="space-y-3">
                                        {q.options.map((opt) => (
                                            <div key={opt.key} className={`p-4 rounded-[4px] border border-blue-500/10 transition-all flex justify-between items-center ${opt.isCorrect || opt.isUserCorrect
                                                    ? 'border-emerald-500/30 bg-emerald-500/5'
                                                    : 'hover:bg-blue-50/10'
                                                }`}>
                                                <div className="flex gap-4 items-center">
                                                    <span className="text-xs font-black opacity-50 uppercase">{opt.key})</span>
                                                    <span className="text-xs font-bold leading-none">{opt.text}</span>
                                                </div>
                                                {opt.isUserCorrect ? (
                                                    <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                                                        <span>Your Option is Correct</span>
                                                        <CheckCircle2 size={14} />
                                                    </div>
                                                ) : opt.isCorrect ? (
                                                    <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest leading-none">Correct Option</span>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Footer Info */}
                                    <div className="mt-8 pt-6 border-t dark:border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-6">
                                            <span className="text-xs font-black uppercase tracking-tighter">Marks : {q.userMarks}</span>
                                            <button className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 hover:opacity-80">
                                                <span>Solution</span>
                                                <ChevronRight size={14} className="rotate-90" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-20 opacity-20 select-none">
                    <Activity size={80} strokeWidth={1} />
                    <h2 className="text-2xl font-black uppercase tracking-[0.5em] mt-6">{activeTab} Details</h2>
                    <p className="text-xs font-bold mt-2 font-mono tracking-widest">WILL BE UPDATED IN NEXT VERSION</p>
                </div>
            )}
        </div>
    );
};

export default OMRStudentPerformance;
