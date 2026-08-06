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
                                {results.map((result) => (
                                    <tr 
                                        key={result.id} 
                                        onClick={() => setSelectedResult(result)}
                                        className={`border-b cursor-pointer transition-colors ${isDarkMode ? 'border-white/5 hover:bg-slate-800/50' : 'border-slate-100 hover:bg-slate-50'}`}
                                    >
                                        <td className={`px-6 py-4 font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                            {new Date(result.created_at).toLocaleDateString()}
                                        </td>
                                        <td className={`px-6 py-4 font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                            {result.subject_name}
                                        </td>
                                        <td className={`px-6 py-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                            {result.chapter_name}
                                            {result.difficulty && <span className="ml-2 text-[10px] uppercase bg-slate-500/20 px-2 py-1 rounded-sm">{result.difficulty}</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`font-black px-2 py-1 rounded-[4px] ${
                                                result.score / result.total_questions >= 0.7 
                                                    ? 'bg-green-500/20 text-green-600 dark:text-green-400' 
                                                    : result.score / result.total_questions >= 0.4 
                                                        ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' 
                                                        : 'bg-red-500/20 text-red-600 dark:text-red-400'
                                            }`}>
                                                {result.score}/{result.total_questions}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                            <div className="flex items-center gap-1.5">
                                                <Clock size={14} />
                                                <span>{Math.floor(result.time_taken_seconds / 60)}m {result.time_taken_seconds % 60}s</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <ChevronRight size={16} className={isDarkMode ? 'text-slate-600' : 'text-slate-400'} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
