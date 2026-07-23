import React, { useState, useEffect } from 'react';
import { BookOpen, Activity, Play, CheckCircle2, XCircle, AlertCircle, Download } from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useAuth } from '../../../context/AuthContext';
import { useMasterData } from '../../../context/MasterDataContext';

const ChapterTest = ({ isDarkMode }) => {
    const { token, getApiUrl } = useAuth();
    const { subjects, chapters, fetchMasterData, isLoading } = useMasterData();

    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedChapter, setSelectedChapter] = useState('');
    const [selectedToughness, setSelectedToughness] = useState('');
    
    // AI Test State
    const [isGenerating, setIsGenerating] = useState(false);
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(0);

    useEffect(() => {
        fetchMasterData();
    }, [fetchMasterData]);

    const filteredChapters = React.useMemo(() => {
        if (!selectedSubject) return [];
        return chapters.filter(c => {
            const subjId = c.subject?.id || c.subject || c.subject_id;
            return String(subjId) === String(selectedSubject);
        });
    }, [chapters, selectedSubject]);

    const handleSubjectChange = (e) => {
        setSelectedSubject(e.target.value);
        setSelectedChapter('');
    };

    const handleChapterChange = (e) => {
        setSelectedChapter(e.target.value);
    };
    
    const handleExport = () => {
        if (!questions || questions.length === 0) return;

        const subjectObj = subjects.find(s => String(s.id) === String(selectedSubject));
        const subjectName = subjectObj ? (subjectObj.name || subjectObj.title) : selectedSubject;

        const chapterObj = filteredChapters.find(c => String(c.id) === String(selectedChapter));
        const chapterName = chapterObj ? (chapterObj.name || chapterObj.title) : selectedChapter;

        let content = `# Chapter Test: ${subjectName} - ${chapterName}\n`;
        content += `Toughness: ${selectedToughness}\n\n`;

        const cleanText = (str) => {
            if (!str) return '';
            let cleaned = str;
            // Replace common LaTeX symbols with Unicode
            cleaned = cleaned.replace(/\\rightarrow/g, '→');
            cleaned = cleaned.replace(/\\leftarrow/g, '←');
            cleaned = cleaned.replace(/\\times/g, '×');
            cleaned = cleaned.replace(/\\div/g, '÷');
            cleaned = cleaned.replace(/\\pm/g, '±');
            cleaned = cleaned.replace(/\\circ/g, '°');
            cleaned = cleaned.replace(/\\pi/g, 'π');
            cleaned = cleaned.replace(/\\theta/g, 'θ');
            cleaned = cleaned.replace(/\\alpha/g, 'α');
            cleaned = cleaned.replace(/\\beta/g, 'β');
            // Remove \text{...} wrappers but keep the text
            cleaned = cleaned.replace(/\\text{([^}]+)}/g, '$1');
            // Simplify fractions \frac{a}{b} -> a/b
            cleaned = cleaned.replace(/\\frac{([^}]+)}{([^}]+)}/g, '$1/$2');
            // Remove remaining LaTeX math delimiters $ and $$
            return cleaned.replace(/\$\$/g, '').replace(/\$/g, '');
        };

        questions.forEach((q, index) => {
            content += `Q${index + 1}. ${cleanText(q.question)}\n\n`;
            
            q.options.forEach((opt, optIndex) => {
                const optionLetter = String.fromCharCode(65 + optIndex);
                content += `${optionLetter}. ${cleanText(opt)}\n`;
            });

            content += `\nCorrect Answer: ${cleanText(q.correctAnswer)}\n`;
            content += `Explanation: ${cleanText(q.explanation)}\n`;
            content += `\n--------------------------------------------------\n\n`;
        });

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${selectedSubject}_${selectedChapter}_Test.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleGenerateTest = async () => {
        if (!selectedChapter || !selectedToughness) return;
        
        setIsGenerating(true);
        setQuestions([]);
        setAnswers({});
        setIsSubmitted(false);
        setScore(0);
        
        try {
            const subject = subjects.find(s => String(s.id) === String(selectedSubject));
            const chapter = chapters.find(c => String(c.id) === String(selectedChapter));
            
            const apiUrl = getApiUrl();
            const response = await axios.post(`${apiUrl}/api/student/ai-mentor/generate-test/`, {
                subject_name: subject?.name || subject?.title || 'Unknown Subject',
                chapter_name: chapter?.name || chapter?.title || 'Unknown Chapter',
                toughness: selectedToughness
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.data && Array.isArray(response.data)) {
                setQuestions(response.data);
            }
        } catch (error) {
            console.error("Failed to generate test:", error);
            alert("Failed to generate the test. Please try again later.");
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleAnswerSelect = (questionId, option) => {
        if (isSubmitted) return;
        setAnswers(prev => ({ ...prev, [questionId]: option }));
    };

    const handleSubmitTest = () => {
        let currentScore = 0;
        questions.forEach(q => {
            if (answers[q.id] === q.correctAnswer) {
                currentScore++;
            }
        });
        setScore(currentScore);
        setIsSubmitted(true);
    };

    if (isLoading) {
        return (
            <div className={`p-8 text-center rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5 text-slate-500' : 'bg-white border-slate-100 text-slate-400'}`}>
                <Activity className="animate-spin mx-auto mb-4" size={32} />
                <p>Loading Master Data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className={`p-6 md:p-8 rounded-[5px] border shadow-sm ${isDarkMode ? 'bg-[#0B0F15] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-4 mb-6">
                    <div className={`p-3 rounded-[5px] ${isDarkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Start a Chapter Test</h2>
                        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Select your topic of interest from the master curriculum to generate a test.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Subject Selection */}
                    <div className="space-y-2">
                        <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Select Subject</label>
                        <select
                            value={selectedSubject}
                            onChange={handleSubjectChange}
                            className={`w-full p-3 rounded-[5px] border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${
                                isDarkMode 
                                ? 'bg-[#151A23] border-white/10 text-white focus:border-orange-500/50' 
                                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-orange-500'
                            }`}
                        >
                            <option value="">-- Choose Subject --</option>
                            {subjects.map(s => (
                                <option key={s.id} value={s.id}>{s.name || s.title}</option>
                            ))}
                        </select>
                    </div>

                    {/* Chapter Selection */}
                    <div className="space-y-2">
                        <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Select Chapter</label>
                        <select
                            value={selectedChapter}
                            onChange={handleChapterChange}
                            disabled={!selectedSubject}
                            className={`w-full p-3 rounded-[5px] border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${
                                isDarkMode 
                                ? 'bg-[#151A23] border-white/10 text-white focus:border-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed' 
                                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-orange-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed'
                            }`}
                        >
                            <option value="">-- Choose Chapter --</option>
                            {filteredChapters.map(c => (
                                <option key={c.id} value={c.id}>{c.name || c.title}</option>
                            ))}
                        </select>
                    </div>

                    {/* Toughness Selection */}
                    <div className="space-y-2">
                        <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Select Toughness</label>
                        <select
                            value={selectedToughness}
                            onChange={(e) => setSelectedToughness(e.target.value)}
                            disabled={!selectedChapter}
                            className={`w-full p-3 rounded-[5px] border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${
                                isDarkMode 
                                ? 'bg-[#151A23] border-white/10 text-white focus:border-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed' 
                                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-orange-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed'
                            }`}
                        >
                            <option value="">-- Choose Toughness --</option>
                            <option value="EASY">Easy</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HARD">Hard</option>
                            <option value="EXTREME_HARD">Extreme Hard</option>
                        </select>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button
                        onClick={handleGenerateTest}
                        disabled={!selectedChapter || !selectedToughness || isGenerating}
                        className={`flex items-center gap-2 px-8 py-3 rounded-[5px] font-bold text-sm tracking-wider uppercase transition-all duration-300 ${
                            selectedChapter && selectedToughness && !isGenerating
                            ? 'bg-orange-500 text-white hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/30' 
                            : 'bg-slate-300 text-slate-500 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
                        }`}
                    >
                        {isGenerating ? <Activity className="animate-spin" size={18} /> : <Play size={18} />}
                        {isGenerating ? 'Generating...' : 'Generate Test'}
                    </button>
                </div>
            </div>
            
            {isGenerating && (
                <div className={`p-10 text-center rounded-[5px] border ${isDarkMode ? 'bg-[#0B0F15] border-white/5 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
                    <Activity className="animate-spin mx-auto mb-4 text-orange-500" size={40} />
                    <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Generating AI Test</h3>
                    <p>Creating 20 personalized multiple-choice questions...</p>
                </div>
            )}
            
            {questions.length > 0 && !isGenerating && (
                <div className="space-y-6 pb-12">
                    <div className="flex justify-end">
                        <button
                            onClick={handleExport}
                            className={`flex items-center gap-2 px-4 py-2 rounded-[5px] text-sm font-medium transition-colors ${
                                isDarkMode 
                                    ? 'bg-slate-800 hover:bg-slate-700 text-white' 
                                    : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                            }`}
                        >
                            <Download size={16} />
                            Export Questions
                        </button>
                    </div>
                    {questions.map((q, index) => (
                        <div key={q.id || index} className={`p-6 md:p-8 rounded-[5px] border shadow-sm ${isDarkMode ? 'bg-[#0B0F15] border-white/5' : 'bg-white border-slate-200'}`}>
                            <div className={`text-lg font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'} flex items-start`}>
                                <span className="text-orange-500 mr-2 shrink-0">Q{index + 1}.</span> 
                                <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
                                    <ReactMarkdown 
                                        remarkPlugins={[remarkMath]} 
                                        rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
                                    >
                                        {q.question}
                                    </ReactMarkdown>
                                </div>
                            </div>

                            {q.imageUrl && (
                                <div className="mb-6 flex justify-center">
                                    <img src={q.imageUrl} alt="Question Visual" className="max-h-64 rounded-[5px] object-contain border border-slate-200 dark:border-slate-800 bg-white" />
                                </div>
                            )}

                            {q.svgDiagram && (
                                <div 
                                    className="mb-6 flex justify-center p-4 bg-white border border-slate-200 dark:border-slate-800 rounded-[5px]"
                                    dangerouslySetInnerHTML={{ __html: q.svgDiagram }}
                                />
                            )}
                            
                            <div className="space-y-3">
                                {q.options.map((opt, optIndex) => {
                                    const isSelected = answers[q.id] === opt;
                                    const isCorrect = opt === q.correctAnswer;
                                    const showCorrect = isSubmitted && isCorrect;
                                    const showWrong = isSubmitted && isSelected && !isCorrect;
                                    
                                    let bgClass = isDarkMode ? 'bg-[#151A23] border-white/5 hover:border-orange-500/50' : 'bg-slate-50 border-slate-200 hover:border-orange-500/50';
                                    
                                    if (isSelected) bgClass = isDarkMode ? 'bg-orange-500/10 border-orange-500' : 'bg-orange-50 border-orange-500';
                                    if (showCorrect) bgClass = isDarkMode ? 'bg-green-500/10 border-green-500 bg-green-500/20' : 'bg-green-50 border-green-500 bg-green-100';
                                    if (showWrong) bgClass = isDarkMode ? 'bg-red-500/10 border-red-500 bg-red-500/20' : 'bg-red-50 border-red-500 bg-red-100';

                                    const optionLetter = String.fromCharCode(65 + optIndex);

                                    return (
                                        <div 
                                            key={optIndex}
                                            onClick={() => handleAnswerSelect(q.id, opt)}
                                            className={`p-4 rounded-[5px] border cursor-pointer transition-all flex items-center justify-between ${bgClass} ${isSubmitted ? 'cursor-default' : ''}`}
                                        >
                                            <div className={`${isDarkMode ? 'text-slate-300' : 'text-slate-700'} font-medium flex items-start gap-3`}>
                                                <span className="font-bold text-slate-500">{optionLetter}.</span>
                                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                                    <ReactMarkdown 
                                                        remarkPlugins={[remarkMath]} 
                                                        rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
                                                    >
                                                        {opt}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                            {showCorrect && <CheckCircle2 className="text-green-500 shrink-0 ml-3" size={20} />}
                                            {showWrong && <XCircle className="text-red-500 shrink-0 ml-3" size={20} />}
                                        </div>
                                    );
                                })}
                            </div>
                            
                            {isSubmitted && (
                                <div className={`mt-6 p-4 rounded-[5px] text-sm border-l-4 border-orange-500 ${isDarkMode ? 'bg-[#151A23] text-slate-400' : 'bg-orange-50 text-slate-700'}`}>
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="text-orange-500 shrink-0 mt-0.5" size={18} />
                                        <div>
                                            <strong className={`${isDarkMode ? 'text-slate-200' : 'text-slate-900'} block mb-1 uppercase tracking-wider text-xs`}>Explanation</strong>
                                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                                <ReactMarkdown 
                                                    remarkPlugins={[remarkMath]} 
                                                    rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
                                                >
                                                    {q.explanation}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    
                    {!isSubmitted ? (
                        <div className="flex justify-end pt-6">
                            <button
                                onClick={handleSubmitTest}
                                disabled={Object.keys(answers).length === 0}
                                className={`px-8 py-3 rounded-[5px] font-bold text-sm tracking-wider uppercase transition-all duration-300 ${
                                    Object.keys(answers).length > 0
                                    ? 'bg-green-500 text-white hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/30' 
                                    : 'bg-slate-300 text-slate-500 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
                                }`}
                            >
                                Submit Test
                            </button>
                        </div>
                    ) : (
                        <div className={`p-8 text-center rounded-[5px] border ${isDarkMode ? 'bg-[#0B0F15] border-white/5' : 'bg-white border-slate-200'}`}>
                            <h3 className={`text-2xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Test Completed!</h3>
                            <p className={`text-lg mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                You scored <span className="font-bold text-orange-500 text-3xl mx-2">{score}</span> out of {questions.length}
                            </p>
                            <button
                                onClick={() => {
                                    setQuestions([]);
                                    setAnswers({});
                                    setIsSubmitted(false);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="px-8 py-3 rounded-[5px] font-bold text-sm tracking-wider uppercase bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-md shadow-orange-500/20"
                            >
                                Take Another Test
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ChapterTest;