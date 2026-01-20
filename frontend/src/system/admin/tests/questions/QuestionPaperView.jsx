import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { X, Loader2, Printer, ArrowLeft } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { useAuth } from '../../../../context/AuthContext';

const QuestionPaperView = ({ test, onBack }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    const [paperData, setPaperData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPaperData = useCallback(async () => {
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const config = {
                headers: { 'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}` }
            };
            const response = await axios.get(`${apiUrl}/api/tests/${test.id}/question_paper/`, config);
            setPaperData(response.data);
        } catch (err) {
            console.error('Failed to fetch question paper data:', err);
        } finally {
            setIsLoading(false);
        }
    }, [test.id, getApiUrl, token]);

    useEffect(() => {
        fetchPaperData();
    }, [fetchPaperData]);

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest opacity-40">Compiling Question Paper...</p>
                </div>
            </div>
        );
    }

    if (!paperData) return null;

    return (
        <div className={`min-h-screen animate-in fade-in duration-500 pb-20 print:p-0 print:pb-0 ${isDarkMode ? 'bg-[#0B0F17]' : 'bg-gray-50/30'}`}>
            {/* Header (Hidden on Print) */}
            <div className="max-w-6xl mx-auto mt-6 px-4 print:hidden">
                <div className="bg-[#E65100] text-white p-4 rounded-2xl flex justify-between items-center shadow-2xl">
                    <div className="flex items-center gap-6">
                        <button onClick={onBack} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all active:scale-90">
                            <ArrowLeft size={24} strokeWidth={3} />
                        </button>
                        <h1 className="text-sm font-black uppercase tracking-[0.2em]">Question Paper</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-3 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                        >
                            <Printer size={18} />
                            Print JSON
                        </button>
                        <button onClick={onBack} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all active:scale-90">
                            <X size={24} strokeWidth={3} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Buffer */}
            <div className="p-10 max-w-6xl mx-auto print:p-0 print:max-w-none">
                {/* Paper Header Settings */}
                <div className={`flex justify-between items-center border-b-[1.5px] pb-4 mb-8 ${isDarkMode ? 'border-white/10' : 'border-slate-300'}`}>
                    <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                        Test Name : <span className="uppercase">{paperData.test_name} ({paperData.test_code})</span>
                    </div>
                    <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                        Duration : {paperData.duration}mins
                    </div>
                </div>

                {/* Sections and Questions */}
                <div className="space-y-12">
                    {paperData.sections.map((section, sIdx) => (
                        <div key={section.id} className="section-block">
                            {/* Section Header */}
                            <div className={`flex justify-between items-center border-b pb-1 mb-6 ${isDarkMode ? 'border-white/10' : 'border-slate-300'}`}>
                                <h3 className={`text-[11px] font-black uppercase tracking-tighter ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                    {section.name} ({section.subject_code})
                                </h3>
                                <div className={`flex gap-4 text-[9px] font-black uppercase ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                    <span>Maximum Mark : {section.correct_marks}</span>
                                    <span>|</span>
                                    <span>Negative Mark : {section.negative_marks}</span>
                                    <span>|</span>
                                    <span>Partial Mark : {section.partial_marks}</span>
                                </div>
                            </div>

                            {/* Questions */}
                            <div className="space-y-10">
                                {section.questions_detail.map((q, qIdx) => (
                                    <div key={q.id || q._id} className="question-item">
                                        <div className="flex items-center gap-1 mb-2">
                                            <span className="text-red-600 text-[11px] font-black italic">
                                                Question No:{qIdx + 1} ({q.question_type === 'SINGLE_CHOICE' ? 'MCQ' : q.question_type})
                                            </span>
                                        </div>

                                        {/* Question Content */}
                                        <div
                                            className={`text-[13px] leading-relaxed mb-4 print:text-black ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}
                                            dangerouslySetInnerHTML={{ __html: q.content }}
                                        />

                                        {/* Images if any */}
                                        {(q.image_1 || q.image_2) && (
                                            <div className="flex flex-wrap gap-4 mb-4">
                                                {q.image_1 && <img src={q.image_1} alt="Q1" className="max-h-20 max-w-[150px] rounded-md object-contain border border-slate-100 shadow-sm transition-all hover:scale-150 cursor-zoom-in" />}
                                                {q.image_2 && <img src={q.image_2} alt="Q2" className="max-h-20 max-w-[150px] rounded-md object-contain border border-slate-100 shadow-sm transition-all hover:scale-150 cursor-zoom-in" />}
                                            </div>
                                        )}

                                        {/* Options */}
                                        {q.question_options && q.question_options.length > 0 && (
                                            <div className="space-y-3 ml-2">
                                                {q.question_options.map((opt, oIdx) => (
                                                    <div key={oIdx} className={`flex gap-2 items-start text-[12px] ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
                                                        <span className="font-bold min-w-[20px]">{String.fromCharCode(97 + oIdx)}.</span>
                                                        <div dangerouslySetInnerHTML={{ __html: opt.content }} />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Answer (Only for Admin View) */}
                                        <div className={`mt-6 pt-2 border-t border-dashed ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                                            <div className="flex items-center gap-4 mb-4">
                                                <span className={`text-[11px] font-black ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Answer :-</span>
                                            </div>
                                            <div className="ml-2">
                                                {q.question_type === 'SINGLE_CHOICE' || q.question_type === 'MULTI_CHOICE' ? (
                                                    <div className={`flex gap-2 items-start text-[12px] font-medium italic ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                                                        <span className="font-black">
                                                            {q.question_options
                                                                .map((opt, idx) => opt.isCorrect ? String.fromCharCode(97 + idx) : null)
                                                                .filter(Boolean)
                                                                .join(', ')}.
                                                        </span>
                                                        <div dangerouslySetInnerHTML={{
                                                            __html: q.question_options
                                                                .map((opt, idx) => opt.isCorrect ? opt.content : null)
                                                                .filter(Boolean)
                                                                .join(', ')
                                                        }} />
                                                    </div>
                                                ) : (
                                                    <div className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                                                        Value: {q.answer_from} {q.answer_to ? ` To ${q.answer_to}` : ''}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                @media print {
                    @page {
                        margin: 2cm;
                    }
                    body {
                        background: white !important;
                        color: black !important;
                    }
                    .sticky {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default QuestionPaperView;
