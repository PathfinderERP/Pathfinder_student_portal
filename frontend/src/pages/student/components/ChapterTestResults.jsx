import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Search, Loader2, Eye, ChevronDown, ChevronUp, Target, FileText, Clock, ChevronRight } from 'lucide-react';
import MathRenderer from '../../../components/MathRenderer';

const QuestionReviewItem = ({ q, index, isDarkMode, userAnswer }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isCorrect = userAnswer === q.correctAnswer;

    return (
        <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-[#0B0F15] border-white/5' : 'bg-white border-slate-200'}`}>
            <div className="flex gap-4 mb-4">
                <div className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-[5px] font-bold text-sm ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                    {index + 1}
                </div>
                <div className="flex-1">
                    <div className={`text-base font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        <MathRenderer html={q.question} />
                    </div>
                    
                    {/* Question images */}
                    {q.image_1 && (
                        <div className="mb-6 flex justify-center">
                            <img src={q.image_1} alt="Question visual" className="max-h-64 rounded-[5px] object-contain border border-slate-200 dark:border-slate-800 bg-white" />
                        </div>
                    )}
                    {q.image_2 && (
                        <div className="mb-6 flex justify-center">
                            <img src={q.image_2} alt="Question visual 2" className="max-h-64 rounded-[5px] object-contain border border-slate-200 dark:border-slate-800 bg-white" />
                        </div>
                    )}

                    <div className="grid gap-3">
                        {q.options.map((opt, i) => {
                            const isSelected = opt === userAnswer;
                            const isActualCorrect = opt === q.correctAnswer;
                            
                            let optClass = isDarkMode ? 'border-white/5 text-slate-300 bg-slate-900/50' : 'border-slate-200 text-slate-600 bg-slate-50';
                            
                            if (isActualCorrect) {
                                optClass = isDarkMode ? 'border-green-500/50 bg-green-500/10 text-green-400' : 'border-green-500 bg-green-50 text-green-700';
                            } else if (isSelected && !isCorrect) {
                                optClass = isDarkMode ? 'border-red-500/50 bg-red-500/10 text-red-400' : 'border-red-500 bg-red-50 text-red-700';
                            }
                            
                            return (
                                <div key={i} className={`p-3 rounded-[5px] border text-sm flex items-start gap-3 ${optClass}`}>
                                    <span className="font-bold opacity-50 shrink-0 mt-0.5">{String.fromCharCode(65 + i)}</span>
                                    <div><MathRenderer html={opt} /></div>
                                </div>
                            );
                        })}
                    </div>
                    
                    {q.explanation && (
                        <div className="mt-4">
                            <button 
                                onClick={() => setIsExpanded(!isExpanded)}
                                className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-[5px] transition-colors ${
                                    isDarkMode 
                                        ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' 
                                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                }`}
                            >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                {isExpanded ? 'Hide Explanation' : 'View Explanation'}
                            </button>
                            
                            {isExpanded && (
                                <div className={`mt-3 p-4 rounded-[5px] text-sm ${isDarkMode ? 'bg-blue-900/20 text-blue-300 border border-blue-500/20' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
                                    <span className="font-bold block mb-1">Explanation:</span>
                                    <MathRenderer html={q.explanation} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function ChapterTestResults({ isDarkMode }) {
    const { token, getApiUrl } = useAuth();
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedResult, setSelectedResult] = useState(null);
    const [expandedGroups, setExpandedGroups] = useState({});

    // Filtering & Pagination State
    const [subjectFilter, setSubjectFilter] = useState('');
    const [chapterFilter, setChapterFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [jumpToPage, setJumpToPage] = useState('');

    const groupedResults = React.useMemo(() => {
        const groups = {};
        results.forEach(result => {
            const key = `${result.subject_name}_${result.chapter_name}`;
            if (!groups[key]) {
                groups[key] = {
                    subject_name: result.subject_name,
                    chapter_name: result.chapter_name,
                    attempts: [],
                };
            }
            groups[key].attempts.push(result);
        });
        
        return Object.values(groups).map(group => {
            group.attempts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            return group;
        }).sort((a, b) => {
            const lastA = new Date(a.attempts[0].created_at).getTime();
            const lastB = new Date(b.attempts[0].created_at).getTime();
            return lastB - lastA;
        });
    }, [results]);

    const toggleGroup = (key) => {
        setExpandedGroups(prev => ({...prev, [key]: !prev[key]}));
    };

    const uniqueSubjects = React.useMemo(() => {
        const subjects = new Set(groupedResults.map(g => g.subject_name));
        return Array.from(subjects).sort();
    }, [groupedResults]);

    const uniqueChapters = React.useMemo(() => {
        let filtered = groupedResults;
        if (subjectFilter) {
            filtered = groupedResults.filter(g => g.subject_name === subjectFilter);
        }
        const chapters = new Set(filtered.map(g => g.chapter_name));
        return Array.from(chapters).sort();
    }, [groupedResults, subjectFilter]);

    const filteredGroups = React.useMemo(() => {
        return groupedResults.filter(group => {
            const matchSubject = subjectFilter ? group.subject_name === subjectFilter : true;
            const matchChapter = chapterFilter ? group.chapter_name === chapterFilter : true;
            return matchSubject && matchChapter;
        });
    }, [groupedResults, subjectFilter, chapterFilter]);

    const totalPages = Math.ceil(filteredGroups.length / itemsPerPage);
    const paginatedGroups = React.useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredGroups.slice(start, start + itemsPerPage);
    }, [filteredGroups, currentPage, itemsPerPage]);

    const stats = React.useMemo(() => {
        if (!results.length) return { totalTests: 0, avgScore: 0, totalTime: 0 };
        
        let totalPercentage = 0;
        let totalTime = 0;
        
        results.forEach(r => {
            if (r.total_questions > 0) {
                totalPercentage += (r.score / r.total_questions) * 100;
            }
            totalTime += (r.time_taken_seconds || 0);
        });
        
        return {
            totalTests: results.length,
            avgScore: Math.round(totalPercentage / results.length),
            totalTime
        };
    }, [results]);

    useEffect(() => {
        setCurrentPage(1);
    }, [subjectFilter, chapterFilter, itemsPerPage]);

    useEffect(() => {
        setChapterFilter('');
    }, [subjectFilter]);

    const handleJump = (e) => {
        e.preventDefault();
        const page = parseInt(jumpToPage);
        if (!isNaN(page) && page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            setJumpToPage('');
        }
    };

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const response = await axios.get(`${getApiUrl()}/api/chapter-tests/results/`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setResults(response.data);
            } catch (error) {
                console.error("Failed to fetch chapter test results", error);
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchResults();
    }, [token, getApiUrl]);

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading results...</div>;
    }

    if (selectedResult) {
        return (
            <div className="space-y-6 animate-fade-in-up">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setSelectedResult(null)}
                        className={`text-sm font-bold px-4 py-2 rounded-[5px] ${isDarkMode ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'}`}
                    >
                        &larr; Back to History
                    </button>
                    <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {selectedResult.subject_name} - {selectedResult.chapter_name}
                    </h2>
                </div>

                <div className={`p-6 rounded-[5px] border flex gap-8 items-center ${isDarkMode ? 'bg-[#0B0F15] border-white/5' : 'bg-white border-slate-200'}`}>
                    <div>
                        <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Score</div>
                        <div className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{selectedResult.score} / {selectedResult.total_questions}</div>
                    </div>
                    <div>
                        <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Time Taken</div>
                        <div className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{Math.floor(selectedResult.time_taken_seconds / 60)}m {selectedResult.time_taken_seconds % 60}s</div>
                    </div>
                    <div>
                        <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Date</div>
                        <div className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{new Date(selectedResult.created_at).toLocaleDateString()}</div>
                    </div>
                </div>
                
                <div className="mt-8 space-y-4">
                    <h3 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Detailed Analysis</h3>
                    {selectedResult.question_data && selectedResult.question_data.length > 0 ? (
                        <div className="space-y-6">
                            {selectedResult.question_data.map((q, index) => {
                                const userAnswer = selectedResult.responses[q.id];
                                const isCorrect = userAnswer === q.correctAnswer;
                                const isUnanswered = !userAnswer;

                                return (
                                    <QuestionReviewItem 
                                        key={q.id || index}
                                        q={q}
                                        index={index}
                                        isDarkMode={isDarkMode}
                                        userAnswer={userAnswer}
                                    />
                                );
                            })}
                        </div>
                    ) : (
                        <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-slate-900/50 border-white/5 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                            <p className="text-sm">
                                You answered {Object.keys(selectedResult.responses || {}).length} questions out of {selectedResult.total_questions}.
                            </p>
                            <p className="text-sm mt-2">
                                Detailed question snapshots were not recorded for this test attempt.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            {results.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Total Tests Card */}
                    <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-[#0B0F15] border-white/5' : 'bg-white border-slate-200'} shadow-sm flex items-center gap-4`}>
                        <div className={`p-4 rounded-full ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                            <FileText size={24} />
                        </div>
                        <div>
                            <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Total Tests</div>
                            <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{stats.totalTests}</div>
                        </div>
                    </div>

                    {/* Average Score Card */}
                    <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-[#0B0F15] border-white/5' : 'bg-white border-slate-200'} shadow-sm flex items-center gap-4`}>
                        <div className={`p-4 rounded-full ${isDarkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'}`}>
                            <Target size={24} />
                        </div>
                        <div>
                            <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Average Score</div>
                            <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{stats.avgScore}%</div>
                        </div>
                    </div>

                    {/* Total Time Card */}
                    <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-[#0B0F15] border-white/5' : 'bg-white border-slate-200'} shadow-sm flex items-center gap-4`}>
                        <div className={`p-4 rounded-full ${isDarkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                            <Clock size={24} />
                        </div>
                        <div>
                            <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Time Spent</div>
                            <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {Math.floor(stats.totalTime / 3600)}h {Math.floor((stats.totalTime % 3600) / 60)}m
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className={`p-6 md:p-8 rounded-[5px] border shadow-sm ${isDarkMode ? 'bg-[#0B0F15] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-4 mb-6">
                    <div className={`p-3 rounded-[5px] ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                        <Target size={24} />
                    </div>
                    <div>
                        <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Chapter Test Results</h2>
                        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Track your performance across all chapter practice tests.
                        </p>
                    </div>
                </div>

                {results.length > 0 && (
                    <div className={`p-4 mb-6 rounded-[5px] border flex flex-col md:flex-row gap-4 items-center justify-between ${isDarkMode ? 'bg-[#0B0F15] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                            <select 
                                value={subjectFilter}
                                onChange={(e) => setSubjectFilter(e.target.value)}
                                className={`px-3 py-2 rounded-[5px] border text-sm w-full sm:w-48 outline-none focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer ${isDarkMode ? 'bg-[#151A23] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                            >
                                <option value="">All Subjects</option>
                                {uniqueSubjects.map(sub => (
                                    <option key={sub} value={sub}>{sub}</option>
                                ))}
                            </select>
                            <select 
                                value={chapterFilter}
                                onChange={(e) => setChapterFilter(e.target.value)}
                                className={`px-3 py-2 rounded-[5px] border text-sm w-full sm:w-48 outline-none focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer ${isDarkMode ? 'bg-[#151A23] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                            >
                                <option value="">All Chapters</option>
                                {uniqueChapters.map(chap => (
                                    <option key={chap} value={chap}>{chap}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Per page:</span>
                            <select 
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className={`px-2 py-1.5 rounded-[5px] border text-sm outline-none cursor-pointer ${isDarkMode ? 'bg-[#151A23] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                    </div>
                )}

                {results.length === 0 ? (
                    <div className="text-center py-12">
                        <FileText size={48} className={`mx-auto mb-4 ${isDarkMode ? 'text-slate-800' : 'text-slate-200'}`} />
                        <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>No Results Yet</h3>
                        <p className={`text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Take a Chapter Test to see your history here.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className={`text-xs uppercase font-black ${isDarkMode ? 'bg-slate-900 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                                <tr>
                                    <th className="px-6 py-4 rounded-l-[5px]">Date</th>
                                    <th className="px-6 py-4">Subject</th>
                                    <th className="px-6 py-4">Chapter</th>
                                    <th className="px-6 py-4">Score</th>
                                    <th className="px-6 py-4">Time</th>
                                    <th className="px-6 py-4 rounded-r-[5px]"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedGroups.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className={`px-6 py-8 text-center text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                            No results found matching your filters.
                                        </td>
                                    </tr>
                                ) : paginatedGroups.map((group) => {
                                    const key = `${group.subject_name}_${group.chapter_name}`;
                                    const isExpanded = expandedGroups[key];
                                    const latestAttempt = group.attempts[0];
                                    const totalTimeSeconds = group.attempts.reduce((sum, result) => sum + (result.time_taken_seconds || 0), 0);
                                    
                                    return (
                                        <React.Fragment key={key}>
                                            <tr 
                                                onClick={() => toggleGroup(key)}
                                                className={`border-b cursor-pointer transition-colors ${isDarkMode ? 'border-white/5 hover:bg-slate-800/50' : 'border-slate-100 hover:bg-slate-50'}`}
                                            >
                                                <td className={`px-6 py-4 font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                    {new Date(latestAttempt.created_at).toLocaleDateString()}
                                                </td>
                                                <td className={`px-6 py-4 font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                    {group.subject_name}
                                                </td>
                                                <td className={`px-6 py-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                    {group.chapter_name}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-[4px] ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                                        {group.attempts.length} Attempt{group.attempts.length > 1 ? 's' : ''}
                                                    </span>
                                                </td>
                                                <td className={`px-6 py-4 font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock size={14} />
                                                        <span>{Math.floor(totalTimeSeconds / 60)}m {totalTimeSeconds % 60}s</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {isExpanded ? <ChevronUp size={16} className={isDarkMode ? 'text-slate-600' : 'text-slate-400'} /> : <ChevronDown size={16} className={isDarkMode ? 'text-slate-600' : 'text-slate-400'} />}
                                                </td>
                                            </tr>
                                            
                                            {isExpanded && group.attempts.map((result, idx) => (
                                                <tr 
                                                    key={result.id} 
                                                    onClick={() => setSelectedResult(result)}
                                                    className={`border-b cursor-pointer transition-colors ${isDarkMode ? 'border-white/5 bg-slate-900/30 hover:bg-slate-800/50' : 'border-slate-100 bg-slate-50/50 hover:bg-slate-100'}`}
                                                >
                                                    <td className={`px-6 py-3 pl-12 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                        {new Date(result.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                    </td>
                                                    <td className={`px-6 py-3 text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                        Attempt {group.attempts.length - idx}
                                                    </td>
                                                    <td className={`px-6 py-3 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                        {result.difficulty && <span className="text-[10px] uppercase bg-slate-500/20 px-2 py-1 rounded-sm">{result.difficulty}</span>}
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <span className={`font-bold text-sm px-2 py-1 rounded-[4px] ${
                                                            result.score / result.total_questions >= 0.7 
                                                                ? 'bg-green-500/20 text-green-600 dark:text-green-400' 
                                                                : result.score / result.total_questions >= 0.4 
                                                                    ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' 
                                                                    : 'bg-red-500/20 text-red-600 dark:text-red-400'
                                                        }`}>
                                                            {result.score}/{result.total_questions}
                                                        </span>
                                                    </td>
                                                    <td className={`px-6 py-3 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        <div className="flex items-center gap-1.5">
                                                            <Clock size={14} />
                                                            <span>{Math.floor(result.time_taken_seconds / 60)}m {result.time_taken_seconds % 60}s</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                        <ChevronRight size={16} className={isDarkMode ? 'text-slate-600' : 'text-slate-400'} />
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {filteredGroups.length > itemsPerPage && (
                    <div className={`mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-[5px] border ${isDarkMode ? 'bg-[#0B0F15] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                        <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredGroups.length)} of {filteredGroups.length} results
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className={`px-3 py-1.5 rounded-[5px] text-sm font-medium transition-colors ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                            >
                                Previous
                            </button>
                            <span className={`text-sm font-medium px-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                Page {currentPage} of {totalPages || 1}
                            </span>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className={`px-3 py-1.5 rounded-[5px] text-sm font-medium transition-colors ${(currentPage === totalPages || totalPages === 0) ? 'opacity-50 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                            >
                                Next
                            </button>
                            
                            <form onSubmit={handleJump} className="ml-2 flex items-center gap-2">
                                <input 
                                    type="number" 
                                    min="1"
                                    max={totalPages}
                                    placeholder="Go to"
                                    value={jumpToPage}
                                    onChange={(e) => setJumpToPage(e.target.value)}
                                    className={`w-16 px-2 py-1.5 text-sm rounded-[5px] border outline-none focus:ring-1 focus:ring-blue-500 transition-all ${isDarkMode ? 'bg-[#151A23] border-white/10 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'}`}
                                />
                                <button type="submit" className={`px-2 py-1.5 rounded-[5px] text-sm font-medium transition-colors ${isDarkMode ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}>
                                    Jump
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
