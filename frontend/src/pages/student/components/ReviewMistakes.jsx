import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';

const ReviewMistakes = ({ test, isDarkMode, onBack }) => {
    const { getApiUrl, token } = useAuth();
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reflections, setReflections] = useState({});
    const [manualSubtopics, setManualSubtopics] = useState({});
    const [mistakeReasons, setMistakeReasons] = useState([]);
    const [isSavingAll, setIsSavingAll] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState('All');

    useEffect(() => {
        const fetchPerformance = async () => {
            if (!test?.id) return;
            setIsLoading(true);
            try {
                const res = await axios.get(`${getApiUrl()}/api/tests/${test.id}/student_performance/`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setData(res.data);
            } catch (err) {
                console.error(err);
                setError(err.response?.data?.error || 'Failed to load report data');
            } finally {
                setIsLoading(false);
            }
        };
        const fetchMistakeReasons = async () => {
            try {
                const res = await axios.get(`${getApiUrl()}/api/master-data/mistake-reasons/`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const results = Array.isArray(res.data) ? res.data : (res.data.results || []);
                setMistakeReasons(results);
            } catch (err) {
                console.error("Failed to fetch mistake reasons:", err);
            }
        };
        fetchPerformance();
        fetchMistakeReasons();
    }, [test?.id, getApiUrl, token]);

    const handleSaveAllReflections = async (unsavedQuestions) => {
        setIsSavingAll(true);
        try {
            // Save sequentially to prevent database race conditions (overwriting concurrent updates)
            for (const q of unsavedQuestions) {
                const payload = {
                    question_id: q.id,
                    reflection: reflections[q.id]
                };
                if (manualSubtopics[q.id]) {
                    payload.manual_subtopic = manualSubtopics[q.id];
                }
                await axios.post(`${getApiUrl()}/api/tests/${test.id}/save_question_reflection/`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setData(prev => {
                const newData = { ...prev };
                if (newData.section_questions) {
                    for (const sec in newData.section_questions) {
                        newData.section_questions[sec] = newData.section_questions[sec].map(q => {
                            const unsavedQ = unsavedQuestions.find(uq => uq.id === q.id);
                            if (unsavedQ) {
                                return { 
                                    ...q, 
                                    student_reflection: reflections[q.id],
                                    manual_subtopic: manualSubtopics[q.id] 
                                };
                            }
                            return q;
                        });
                    }
                }
                return newData;
            });
        } catch (err) {
            console.error('Failed to save reflections', err);
        } finally {
            setIsSavingAll(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-6 opacity-50">
                <Loader2 size={50} className="animate-spin text-blue-500" />
                <span className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Loading Mistakes...</span>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-4 opacity-70">
                <XCircle size={40} className="text-red-500" />
                <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{error || 'Result unavailable'}</span>
                <button onClick={onBack} className="text-blue-500 text-xs font-bold uppercase mt-4 hover:underline">Go Back</button>
            </div>
        );
    }

    // Extract all incorrect questions
    const allMistakes = [];
    if (data.section_questions) {
        Object.keys(data.section_questions).forEach(sec => {
            data.section_questions[sec].forEach(q => {
                if (q.result === 'IA' && !q.is_wrong) {
                    allMistakes.push({ ...q, sectionName: sec });
                }
            });
        });
    }

    const qBorder = isDarkMode ? 'border-white/[0.06]' : 'border-slate-200';
    const qBg     = isDarkMode ? 'bg-[#10141D]'         : 'bg-white';
    const optBg   = isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200';

    const unsavedQuestions = allMistakes.filter(q => !q.student_reflection);
    const allReflectionsFilled = unsavedQuestions.length > 0 && unsavedQuestions.every(q => reflections[q.id] && reflections[q.id].trim().length > 0);

    const subjects = ['All', ...new Set(allMistakes.map(m => m.sectionName))];
    const displayedMistakes = selectedSubject === 'All' ? allMistakes : allMistakes.filter(m => m.sectionName === selectedSubject);

    return (
        <div className="space-y-6 pb-20 mt-4">
            {/* Header */}
            <div className={`p-6 rounded-[12px] border shadow-2xl relative overflow-hidden flex items-center justify-between
                ${isDarkMode ? 'bg-gradient-to-br from-[#151B27] to-[#10141D] border-white/5 shadow-black/40' : 'bg-white border-slate-100 shadow-slate-200/50'}`}>
                <div>
                    <button
                        onClick={onBack}
                        className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-6 transition-colors
                            ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <ArrowLeft size={14} /> Back to Results
                    </button>
                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Review Mistakes
                    </p>
                    <h2 className={`text-2xl font-black font-brand uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {test.name}
                    </h2>
                </div>
            </div>

            {/* Mistakes List */}
            {allMistakes.length === 0 ? (
                <div className={`p-10 text-center rounded-[12px] border ${isDarkMode ? 'bg-[#151B27] border-white/5 text-slate-400' : 'bg-white border-slate-100 text-slate-500'}`}>
                    <p className="text-sm font-bold uppercase tracking-widest">Great Job! No mistakes found.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Subject Filter */}
                    {subjects.length > 2 && (
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {subjects.map(subject => (
                                <button
                                    key={subject}
                                    onClick={() => setSelectedSubject(subject)}
                                    className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                                        selectedSubject === subject
                                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                            : isDarkMode
                                                ? 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10'
                                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 border border-slate-200'
                                    }`}
                                >
                                    {subject}
                                </button>
                            ))}
                        </div>
                    )}

                    {displayedMistakes.length === 0 ? (
                        <div className={`p-10 text-center rounded-[12px] border ${isDarkMode ? 'bg-[#151B27] border-white/5 text-slate-400' : 'bg-white border-slate-100 text-slate-500'}`}>
                            <p className="text-sm font-bold uppercase tracking-widest">No mistakes in this subject.</p>
                        </div>
                    ) : (
                        displayedMistakes.map((q, qIndex) => {
                            const correctOptionsStr = (q.correct_options || []).join(',');
                        const userOptionsStr = Array.isArray(q.user_answer) ? q.user_answer.join(',') : q.user_answer;
                        
                        const qTopic = typeof q.topic === 'object' && q.topic !== null ? (q.topic.name || 'N/A') : (q.topic || 'N/A');
                        const qSubtopic = typeof q.subtopic === 'object' && q.subtopic !== null ? (q.subtopic.name || 'N/A') : (q.subtopic || 'N/A');
                        const qChapter = typeof q.chapter === 'object' && q.chapter !== null ? (q.chapter.name || 'N/A') : (q.chapter || 'N/A');

                        return (
                            <div key={q.id} className={`rounded-[8px] border overflow-hidden ${qBorder} ${qBg}`}>
                                {/* Q Header */}
                                <div className={`flex items-center justify-between px-5 py-3 border-b ${isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-slate-50 border-slate-100'}`}>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className={`text-[12px] font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                            Mistake #{qIndex + 1}
                                        </span>
                                        <span className={`text-[11px] font-semibold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                            Section : <span className={`font-black uppercase ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{q.sectionName}</span>
                                        </span>
                                        <span className={`text-[11px] font-semibold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                            Type : <span className={`font-black uppercase ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                                {q.type === 'SINGLE_CHOICE' ? 'MCQ' :
                                                 q.type === 'MULTI_CHOICE' ? 'Multiple' :
                                                 q.type === 'INTEGER_TYPE' ? 'Integer' :
                                                 q.type === 'NUMERICAL' ? 'Numerical' :
                                                 q.type}
                                            </span>
                                        </span>
                                        <span className={`text-[11px] font-semibold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                            Chapter : <span className={`font-semibold uppercase ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{qChapter}</span>
                                        </span>
                                        <span className={`text-[11px] font-semibold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                            Topic : <span className={`font-semibold uppercase ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{qTopic}</span>
                                        </span>
                                        <span className={`text-[11px] font-semibold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                            Subtopic : <span className={`font-semibold uppercase ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                                {q.manual_subtopic || qSubtopic}
                                            </span>
                                        </span>
                                    </div>
                                    <div className={`text-[11px] font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Negative Mark : <span className="font-black text-red-500">{q.negative_marks}</span>
                                    </div>
                                </div>

                                {/* Question Text */}
                                <div className="px-5 py-4">
                                    <div className={`text-[13px] leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`} dangerouslySetInnerHTML={{ __html: q.content }} />
                                </div>

                                {/* Options */}
                                <div className="px-5 pb-4 space-y-2">
                                    {q.type !== 'INTEGER_TYPE' && q.type !== 'NUMERICAL' && (q.options || []).map((opt, oi) => {
                                        const optLabel = ['A','B','C','D','E','F'][oi];
                                        const uAnsOpts = Array.isArray(q.user_answer) 
                                            ? q.user_answer.map(x => String(x).toLowerCase().trim()) 
                                            : (q.user_answer ? [String(q.user_answer).toLowerCase().trim()] : []);
                                        
                                        const allOptIds = (q.options || []).map((o, i) => String(o.id || o._id || i).toLowerCase().trim());
                                        const anyIdMatch = uAnsOpts.some(ans => allOptIds.includes(ans));
                                        const optIdStr = String(opt.id || opt._id || oi).toLowerCase().trim();

                                        const isYours = anyIdMatch
                                            ? uAnsOpts.includes(optIdStr)
                                            : uAnsOpts.some(ans => 
                                                ans === optIdStr || 
                                                ans === optLabel?.toLowerCase() || 
                                                ans === String(oi + 1) ||
                                                (opt.content && ans === String(opt.content).replace(/(<([^>]+)>)/gi, "").toLowerCase().trim())
                                            );

                                        const correctOptionsArr = Array.isArray(q.correct_options) ? q.correct_options : [];
                                        const isCorrectOpt = correctOptionsArr.some(c => String(c).toLowerCase() === String(opt.id).toLowerCase()) || opt.isCorrect;
                                        
                                        let optStyle = optBg;
                                        if (isYours && isCorrectOpt) optStyle = isDarkMode ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-300';
                                        else if (isYours && !isCorrectOpt) optStyle = isDarkMode ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-300';
                                        else if (isCorrectOpt) optStyle = isDarkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50/50 border-emerald-200';

                                        return (
                                            <div key={opt.id || oi} className={`flex items-center justify-between px-4 py-3 rounded-[6px] border text-[12px] transition-all ${optStyle}`}>
                                                <span className={`${isDarkMode ? 'text-slate-300' : 'text-slate-600'} flex items-start gap-2`}>
                                                    <span className="font-black mt-0.5">{optLabel}.</span>
                                                    <div dangerouslySetInnerHTML={{ __html: opt.content || opt.text }} />
                                                </span>
                                                {isYours && isCorrectOpt && <CheckCircle size={16} className="text-emerald-500 shrink-0 ml-4" />}
                                                {isYours && !isCorrectOpt && <XCircle size={16} className="text-red-500 shrink-0 ml-4" />}
                                                {!isYours && isCorrectOpt && <CheckCircle size={16} className="text-emerald-500/50 shrink-0 ml-4" />}
                                            </div>
                                        );
                                    })}
                                    {(q.type === 'NUMERICAL' || q.type === 'INTEGER_TYPE') && (
                                        <div className={`p-4 rounded-[6px] border mt-2 ${isDarkMode ? 'bg-white/[0.02] border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                                            <div className="flex items-center gap-6 text-[12px] font-semibold">
                                                <div>Your Answer: <span className="font-black tracking-widest text-red-500">{q.user_answer || 'N/A'}</span></div>
                                                <div>Correct Answer: <span className="font-black tracking-widest text-emerald-500">{q.answer_from === q.answer_to ? q.answer_to : `${q.answer_from} - ${q.answer_to}`}</span></div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Solution */}
                                <div className={`px-5 py-4 border-t text-[12px] leading-relaxed ${isDarkMode ? 'border-white/[0.06] text-slate-400 bg-blue-500/5' : 'border-slate-100 text-slate-500 bg-blue-50/50'}`}>
                                    <p className={`text-[10px] font-black uppercase tracking-widest mb-2 text-[#4871D9]`}>Solution</p>
                                    <div dangerouslySetInnerHTML={{ __html: q.solution || '<p>No solution provided</p>' }} />
                                </div>

                                {/* Student Reflection */}
                                <div className={`px-5 py-4 border-t ${isDarkMode ? 'border-white/[0.06] bg-black/20' : 'border-slate-200 bg-slate-50'}`}>
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border inline-flex items-center gap-1.5 shadow-sm ${
                                            isDarkMode 
                                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                                                : 'bg-rose-50 text-rose-600 border-rose-200/60'
                                        }`}>
                                            My Reflection <span className="opacity-75 font-bold tracking-normal text-[9px]">(Why I got it wrong)</span>
                                        </span>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <select
                                            className={`flex-[1.5] w-full p-4 rounded-xl text-[13px] border-2 focus:outline-none focus:ring-4 focus:ring-rose-500/20 transition-all shadow-inner font-medium appearance-none ${
                                                isDarkMode 
                                                    ? 'bg-[#151B27] border-slate-700 focus:border-rose-500 text-white shadow-black/20' 
                                                    : 'bg-rose-50/30 border-rose-100 hover:bg-rose-50/50 focus:bg-white focus:border-rose-400 text-slate-800 shadow-slate-200/50'
                                            } ${q.student_reflection ? 'opacity-70 cursor-not-allowed border-dashed bg-slate-50' : ''}`}
                                            value={reflections[q.id] !== undefined ? reflections[q.id] : (q.student_reflection || '')}
                                            onChange={(e) => setReflections(prev => ({ ...prev, [q.id]: e.target.value }))}
                                            disabled={!!q.student_reflection}
                                        >
                                            <option value="">-- Select a reason --</option>
                                            {mistakeReasons.map(mr => (
                                                <option key={mr.id} value={mr.name}>{mr.name}</option>
                                            ))}
                                            {/* Allow keeping existing custom reflections that don't match */}
                                            {q.student_reflection && !mistakeReasons.find(mr => mr.name === q.student_reflection) && (
                                                <option value={q.student_reflection}>{q.student_reflection}</option>
                                            )}
                                        </select>

                                        <div className={`flex-[1] flex flex-col justify-center px-4 py-2 rounded-xl border-2 ${
                                            isDarkMode ? 'bg-[#151B27] border-slate-700' : 'bg-white border-indigo-100'
                                        }`}>
                                            <span className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-amber-500/80' : 'text-indigo-600'}`}>Subtopic</span>
                                            {qSubtopic === 'N/A' && !q.manual_subtopic ? (
                                                <input 
                                                    type="text" 
                                                    placeholder="Type subtopic here..." 
                                                    className={`w-full bg-transparent text-[13px] font-semibold focus:outline-none ${isDarkMode ? 'text-amber-100 placeholder-slate-500' : 'text-slate-700 placeholder-slate-400'}`}
                                                    value={manualSubtopics[q.id] !== undefined ? manualSubtopics[q.id] : ''}
                                                    onChange={(e) => setManualSubtopics(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                />
                                            ) : (
                                                <span className={`font-black uppercase text-[12px] ${isDarkMode ? 'text-amber-400' : 'text-indigo-700'}`}>{q.manual_subtopic || qSubtopic}</span>
                                            )}
                                        </div>
                                    </div>
                                        {q.student_reflection && (
                                            <div className="flex justify-end mt-2">
                                                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                                                    <CheckCircle size={14} /> Saved
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                        );
                        })
                    )}
                </div>
            )}

            {/* Global Save Button */}
            {allMistakes.length > 0 && unsavedQuestions.length > 0 && (
                <div className={`sticky bottom-6 z-10 flex justify-center mt-8`}>
                    <button
                        onClick={() => handleSaveAllReflections(unsavedQuestions)}
                        disabled={isSavingAll || !allReflectionsFilled}
                        className={`flex items-center gap-2 px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all shadow-xl ${
                            isSavingAll || !allReflectionsFilled
                                ? `bg-slate-400 text-white cursor-not-allowed ${isDarkMode ? 'opacity-50' : ''}`
                                : 'bg-rose-500 hover:bg-rose-600 text-white active:scale-95 shadow-rose-500/20'
                        }`}
                    >
                        {isSavingAll ? (
                            <><Loader2 size={16} className="animate-spin" /> Saving All...</>
                        ) : 'Save All Reflections'}
                    </button>
                </div>
            )}
            
            {allMistakes.length > 0 && unsavedQuestions.length === 0 && (
                <div className={`flex justify-center mt-8`}>
                    <span className="flex items-center gap-2 px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <CheckCircle size={16} /> All Reflections Saved
                    </span>
                </div>
            )}
        </div>
    );
};

export default ReviewMistakes;
