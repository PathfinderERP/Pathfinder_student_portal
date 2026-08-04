import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, Activity, Play, CheckCircle2, XCircle, AlertCircle, Download, Database } from 'lucide-react';
import axios from 'axios';
import Select from 'react-select';
import { useAuth } from '../../../context/AuthContext';
import { useMasterData } from '../../../context/MasterDataContext';

// ─── Constants ────────────────────────────────────────────────────────────────
const DIFFICULTY_OPTIONS = [
    { value: '', label: 'All Levels' },
    { value: 'very_easy', label: 'Very Easy' },
    { value: 'easy', label: 'Easy' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'hard', label: 'Hard' },
    { value: 'very_hard', label: 'Very Hard' },
];

const MAX_QUESTIONS = 20;

// Fisher-Yates shuffle
const shuffleArray = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

/**
 * Normalise a raw Question from the question bank into the shape used
 * internally by the test UI.
 *
 * question_options structure: [{ id, content, isCorrect }]
 */
const normaliseQuestion = (raw) => {
    const opts = Array.isArray(raw.question_options) ? raw.question_options : [];
    const options = opts.map((o) => o.content).filter(Boolean);
    const correctOpt = opts.find((o) => o.isCorrect);
    const correctAnswer = correctOpt ? correctOpt.content : null;

    return {
        id: raw.id || String(raw._id),
        question: raw.content || '',
        options,
        correctAnswer,
        explanation: raw.solution || '',
        image_1: raw.image_1 || null,
        image_2: raw.image_2 || null,
        difficulty_level: raw.difficulty_level,
        question_type: raw.question_type,
        answer_from: raw.answer_from,
        answer_to: raw.answer_to,
    };
};

// ─── Select styles factory ─────────────────────────────────────────────────────
const buildSelectStyles = (isDarkMode, disabled = false) => ({
    control: (base, state) => ({
        ...base,
        backgroundColor: isDarkMode ? '#151A23' : '#f8fafc',
        borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
        padding: '2px',
        fontSize: '0.875rem',
        boxShadow: 'none',
        opacity: state.isDisabled || disabled ? 0.5 : 1,
        '&:hover': {
            borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : '#cbd5e1',
        },
    }),
    menu: (base) => ({
        ...base,
        backgroundColor: isDarkMode ? '#151A23' : '#ffffff',
        border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
        fontSize: '0.875rem',
        zIndex: 50,
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected
            ? '#f97316'
            : state.isFocused
            ? isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9'
            : 'transparent',
        color: state.isSelected ? '#ffffff' : isDarkMode ? '#e2e8f0' : '#1e293b',
        '&:active': { backgroundColor: '#f97316' },
    }),
    singleValue: (base) => ({ ...base, color: isDarkMode ? '#ffffff' : '#1e293b' }),
    input: (base) => ({ ...base, color: isDarkMode ? '#ffffff' : '#1e293b' }),
    placeholder: (base) => ({ ...base, color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#94a3b8' }),
});

// ─── Component ─────────────────────────────────────────────────────────────────
const ChapterTest = ({ isDarkMode }) => {
    const { token, getApiUrl, user } = useAuth();
    const { subjects, chapters, fetchMasterData, isLoading } = useMasterData();

    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedChapter, setSelectedChapter] = useState('');
    const [selectedDifficulty, setSelectedDifficulty] = useState(null); // null = not selected yet

    // Chapters that have at least one question in the question bank
    const [availableChapterIds, setAvailableChapterIds] = useState(null); // null = not fetched yet
    const [isLoadingChapters, setIsLoadingChapters] = useState(false);

    // Test state
    const [isFetching, setIsFetching] = useState(false);
    const [questions, setQuestions] = useState([]);
    const [noQuestionsFound, setNoQuestionsFound] = useState(false);
    const [answers, setAnswers] = useState({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [totalAvailable, setTotalAvailable] = useState(0);

    useEffect(() => {
        fetchMasterData();
    }, [fetchMasterData]);

    // ── Fetch chapters that have questions whenever subject changes ────────────
    useEffect(() => {
        if (!selectedSubject) {
            setAvailableChapterIds(null);
            return;
        }
        let cancelled = false;
        setIsLoadingChapters(true);
        setAvailableChapterIds(null);
        const apiUrl = getApiUrl();
        
        const params = new URLSearchParams();
        params.set('subject', selectedSubject);
        params.set('exam_type_name', 'CHAPTER TEST'); // Only fetch chapters with specifically tagged chapter test questions
        if (user?.class_level) params.set('class_level', user.class_level);
        if (user?.target_exam) params.set('target_exam', user.target_exam);

        axios
            .get(`${apiUrl}/api/questions/chapters-with-questions/?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                if (!cancelled) {
                    const ids = (res.data || []).map((c) => String(c.id));
                    setAvailableChapterIds(ids);
                }
            })
            .catch(() => {
                if (!cancelled) setAvailableChapterIds([]); // show empty on error
            })
            .finally(() => {
                if (!cancelled) setIsLoadingChapters(false);
            });
        return () => { cancelled = true; };
    }, [selectedSubject, getApiUrl, token, user?.class_level, user?.target_exam]);

    // ── Chapters filtered by selected subject AND availability in question bank ─
    const filteredChapters = React.useMemo(() => {
        if (!selectedSubject) return [];
        const bySubject = chapters.filter((c) => {
            const subjId = c.subject?.id || c.subject || c.subject_id;
            return String(subjId) === String(selectedSubject);
        });
        if (availableChapterIds === null) return bySubject; // still loading — show all temporarily
        return bySubject.filter((c) => availableChapterIds.includes(String(c.id)));
    }, [chapters, selectedSubject, availableChapterIds]);

    // ── Handlers ───────────────────────────────────────────────────────────────
    const handleSubjectChange = (opt) => {
        setSelectedSubject(opt ? opt.value : '');
        setSelectedChapter('');
        setSelectedDifficulty(null);
        setAvailableChapterIds(null);
        resetTestState();
    };

    const handleChapterChange = (opt) => {
        setSelectedChapter(opt ? opt.value : '');
        setSelectedDifficulty(null);
        resetTestState();
    };

    const handleDifficultyChange = (opt) => {
        setSelectedDifficulty(opt);
        resetTestState();
    };

    const resetTestState = () => {
        setQuestions([]);
        setAnswers({});
        setIsSubmitted(false);
        setScore(0);
        setNoQuestionsFound(false);
        setTotalAvailable(0);
    };

    // ── Generate (fetch from question bank) ────────────────────────────────────
    const handleGenerateTest = useCallback(async () => {
        if (!selectedChapter || selectedDifficulty === null) return;

        setIsFetching(true);
        setQuestions([]);
        setAnswers({});
        setIsSubmitted(false);
        setScore(0);
        setNoQuestionsFound(false);

        try {
            const apiUrl = getApiUrl();

            // Build query params
            const params = new URLSearchParams();
            params.set('chapter', selectedChapter);
            params.set('exam_type_name', 'CHAPTER TEST'); // Specifically fetch chapter test questions
            if (selectedDifficulty.value) {
                params.set('difficulty_level', selectedDifficulty.value);
            }
            if (user?.class_level) params.set('class_level', user.class_level);
            if (user?.target_exam) params.set('target_exam', user.target_exam);

            const response = await axios.get(
                `${apiUrl}/api/questions/?${params.toString()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // The questions API can return array or paginated {results:[]}
            let raw = [];
            if (Array.isArray(response.data)) {
                raw = response.data;
            } else if (Array.isArray(response.data?.results)) {
                raw = response.data.results;
            }

            if (raw.length === 0) {
                setNoQuestionsFound(true);
                return;
            }

            setTotalAvailable(raw.length);

            // Normalise → shuffle → cap at MAX_QUESTIONS
            const normalised = raw.map(normaliseQuestion).filter((q) => q.options.length > 0 && q.correctAnswer);
            const shuffled = shuffleArray(normalised).slice(0, MAX_QUESTIONS);

            if (shuffled.length === 0) {
                setNoQuestionsFound(true);
                return;
            }

            setQuestions(shuffled);
        } catch (error) {
            console.error('Failed to fetch questions:', error);
            alert('Failed to load questions. Please try again.');
        } finally {
            setIsFetching(false);
        }
    }, [selectedChapter, selectedDifficulty, getApiUrl, token, user?.class_level, user?.target_exam]);

    // ── Answer / Submit ────────────────────────────────────────────────────────
    const handleAnswerSelect = (questionId, option) => {
        if (isSubmitted) return;
        setAnswers((prev) => ({ ...prev, [questionId]: option }));
    };

    const handleSubmitTest = () => {
        let currentScore = 0;
        questions.forEach((q) => {
            if (answers[q.id] === q.correctAnswer) currentScore++;
        });
        setScore(currentScore);
        setIsSubmitted(true);
    };

    // ── Export ─────────────────────────────────────────────────────────────────
    const handleExport = () => {
        if (!questions || questions.length === 0) return;

        const subjectObj = subjects.find((s) => String(s.id) === String(selectedSubject));
        const subjectName = subjectObj ? subjectObj.name || subjectObj.title : selectedSubject;

        const chapterObj = filteredChapters.find((c) => String(c.id) === String(selectedChapter));
        const chapterName = chapterObj ? chapterObj.name || chapterObj.title : selectedChapter;

        const diffLabel = selectedDifficulty?.label || 'All Levels';

        let content = `# Chapter Test: ${subjectName} - ${chapterName}\n`;
        content += `Difficulty: ${diffLabel}\n\n`;

        questions.forEach((q, index) => {
            content += `Q${index + 1}. ${q.question}\n\n`;
            q.options.forEach((opt, i) => {
                content += `${String.fromCharCode(65 + i)}. ${opt}\n`;
            });
            content += `\nCorrect Answer: ${q.correctAnswer}\n`;
            if (q.explanation) content += `Explanation: ${q.explanation}\n`;
            content += `\n--------------------------------------------------\n\n`;
        });

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${subjectName}_${chapterName}_Test.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // ── Computed flags ─────────────────────────────────────────────────────────
    const canGenerate = selectedChapter && selectedDifficulty !== null && !isFetching;

    // ─── Loading skeleton ──────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className={`p-8 text-center rounded-[5px] border ${isDarkMode ? 'bg-[#10141D] border-white/5 text-slate-500' : 'bg-white border-slate-100 text-slate-400'}`}>
                <Activity className="animate-spin mx-auto mb-4" size={32} />
                <p>Loading Master Data...</p>
            </div>
        );
    }

    // ─── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* ── Selection Card ── */}
            <div className={`p-6 md:p-8 rounded-[5px] border shadow-sm ${isDarkMode ? 'bg-[#0B0F15] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-4 mb-6">
                    <div className={`p-3 rounded-[5px] ${isDarkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Start a Chapter Test</h2>
                        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Select your topic from the master curriculum — questions are pulled from the real question bank.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Subject */}
                    <div className="space-y-2">
                        <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Select Subject</label>
                        <Select
                            value={selectedSubject ? { value: selectedSubject, label: subjects.find((s) => String(s.id) === String(selectedSubject))?.name || subjects.find((s) => String(s.id) === String(selectedSubject))?.title } : null}
                            onChange={handleSubjectChange}
                            options={subjects.map((s) => ({ value: s.id, label: s.name || s.title }))}
                            placeholder="-- Search Subject --"
                            isClearable
                            classNamePrefix="react-select"
                            styles={buildSelectStyles(isDarkMode)}
                        />
                    </div>

                    {/* Chapter */}
                    <div className="space-y-2">
                        <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            Select Chapter
                            {isLoadingChapters && <span className="ml-2 text-orange-400 normal-case font-normal">loading...</span>}
                            {!isLoadingChapters && availableChapterIds !== null && (
                                <span className={`ml-2 normal-case font-normal ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    ({filteredChapters.length} available)
                                </span>
                            )}
                        </label>
                        <Select
                            value={selectedChapter ? { value: selectedChapter, label: filteredChapters.find((c) => String(c.id) === String(selectedChapter))?.name || filteredChapters.find((c) => String(c.id) === String(selectedChapter))?.title } : null}
                            onChange={handleChapterChange}
                            options={filteredChapters.map((c) => ({ value: c.id, label: c.name || c.title }))}
                            isDisabled={!selectedSubject || isLoadingChapters}
                            isLoading={isLoadingChapters}
                            placeholder={isLoadingChapters ? 'Loading chapters...' : filteredChapters.length === 0 && availableChapterIds !== null ? 'No chapters with questions' : '-- Search Chapter --'}
                            isClearable
                            classNamePrefix="react-select"
                            styles={buildSelectStyles(isDarkMode)}
                            noOptionsMessage={() => 'No chapters have questions for this subject'}
                        />
                    </div>

                    {/* Difficulty Level */}
                    <div className="space-y-2">
                        <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Difficulty Level</label>
                        <Select
                            value={selectedDifficulty}
                            onChange={handleDifficultyChange}
                            options={DIFFICULTY_OPTIONS}
                            isDisabled={!selectedChapter}
                            placeholder="-- Select Level --"
                            isClearable={false}
                            classNamePrefix="react-select"
                            styles={buildSelectStyles(isDarkMode)}
                        />
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button
                        onClick={handleGenerateTest}
                        disabled={!canGenerate}
                        className={`flex items-center gap-2 px-8 py-3 rounded-[5px] font-bold text-sm tracking-wider uppercase transition-all duration-300 ${
                            canGenerate
                                ? 'bg-orange-500 text-white hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/30'
                                : 'bg-slate-300 text-slate-500 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
                        }`}
                    >
                        {isFetching ? <Activity className="animate-spin" size={18} /> : <Play size={18} />}
                        {isFetching ? 'Loading...' : 'Generate Test'}
                    </button>
                </div>
            </div>

            {/* ── Fetching spinner ── */}
            {isFetching && (
                <div className={`p-10 text-center rounded-[5px] border ${isDarkMode ? 'bg-[#0B0F15] border-white/5 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
                    <Activity className="animate-spin mx-auto mb-4 text-orange-500" size={40} />
                    <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Loading Questions</h3>
                    <p>Fetching questions from the question bank...</p>
                </div>
            )}

            {/* ── No questions found ── */}
            {noQuestionsFound && !isFetching && (
                <div className={`p-10 text-center rounded-[5px] border ${isDarkMode ? 'bg-[#0B0F15] border-white/5' : 'bg-white border-slate-200'}`}>
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                        <Database size={32} />
                    </div>
                    <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>No Questions Found</h3>
                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        There are no questions in the question bank for this chapter and difficulty level. Try selecting a different combination.
                    </p>
                </div>
            )}

            {/* ── Questions list ── */}
            {questions.length > 0 && !isFetching && (
                <div className="space-y-6 pb-12">
                    {/* Header bar */}
                    <div className={`flex items-center justify-between px-4 py-3 rounded-[5px] border ${isDarkMode ? 'bg-[#0B0F15] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-3">
                            <Database size={16} className="text-orange-500" />
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                Showing <span className="font-bold text-orange-500">{questions.length}</span> questions
                                {totalAvailable > questions.length && (
                                    <span className={`ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>(of {totalAvailable} available)</span>
                                )}
                            </span>
                        </div>
                        {!isSubmitted && (
                            <button
                                onClick={handleExport}
                                className={`flex items-center gap-2 px-4 py-2 rounded-[5px] text-sm font-medium transition-colors ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'}`}
                            >
                                <Download size={14} />
                                Export
                            </button>
                        )}
                    </div>

                    {/* Question cards */}
                    {questions.map((q, index) => (
                        <div
                            key={q.id || index}
                            className={`p-6 md:p-8 rounded-[5px] border shadow-sm ${isDarkMode ? 'bg-[#0B0F15] border-white/5' : 'bg-white border-slate-200'}`}
                        >
                            {/* Question text */}
                            <div className={`text-base font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-slate-900'} flex items-start`}>
                                <span className="text-orange-500 mr-2 shrink-0 text-lg">Q{index + 1}.</span>
                                <div
                                    className="html-content max-w-none flex-1"
                                    dangerouslySetInnerHTML={{ __html: q.question }}
                                />
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

                            {/* Options */}
                            <div className="space-y-3">
                                {q.options.map((opt, optIndex) => {
                                    const isSelected = answers[q.id] === opt;
                                    const isCorrect = opt === q.correctAnswer;
                                    const showCorrect = isSubmitted && isCorrect;
                                    const showWrong = isSubmitted && isSelected && !isCorrect;

                                    let bgClass = isDarkMode
                                        ? 'bg-[#151A23] border-white/5 hover:border-orange-500/50'
                                        : 'bg-slate-50 border-slate-200 hover:border-orange-500/50';

                                    if (isSelected && !isSubmitted) bgClass = isDarkMode ? 'bg-orange-500/10 border-orange-500' : 'bg-orange-50 border-orange-500';
                                    if (showCorrect) bgClass = isDarkMode ? 'bg-green-500/20 border-green-500' : 'bg-green-50 border-green-500';
                                    if (showWrong) bgClass = isDarkMode ? 'bg-red-500/20 border-red-500' : 'bg-red-50 border-red-500';

                                    const optionLetter = String.fromCharCode(65 + optIndex);

                                    return (
                                        <div
                                            key={optIndex}
                                            onClick={() => handleAnswerSelect(q.id, opt)}
                                            className={`p-4 rounded-[5px] border cursor-pointer transition-all flex items-center justify-between ${bgClass} ${isSubmitted ? 'cursor-default' : ''}`}
                                        >
                                            <div className={`${isDarkMode ? 'text-slate-300' : 'text-slate-700'} font-medium flex items-start gap-3`}>
                                                <span className="font-bold text-slate-500 shrink-0">{optionLetter}.</span>
                                                <div
                                                    className="html-content flex-1"
                                                    dangerouslySetInnerHTML={{ __html: opt }}
                                                />
                                            </div>
                                            {showCorrect && <CheckCircle2 className="text-green-500 shrink-0 ml-3" size={20} />}
                                            {showWrong && <XCircle className="text-red-500 shrink-0 ml-3" size={20} />}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Explanation (after submit) */}
                            {isSubmitted && q.explanation && (
                                <div className={`mt-6 p-4 rounded-[5px] text-sm border-l-4 border-orange-500 ${isDarkMode ? 'bg-[#151A23] text-slate-400' : 'bg-orange-50 text-slate-700'}`}>
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="text-orange-500 shrink-0 mt-0.5" size={18} />
                                        <div>
                                            <strong className={`${isDarkMode ? 'text-slate-200' : 'text-slate-900'} block mb-1 uppercase tracking-wider text-xs`}>
                                                Explanation
                                            </strong>
                                            <div
                                                className="html-content"
                                                dangerouslySetInnerHTML={{ __html: q.explanation }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Submit / Result */}
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
                                You scored{' '}
                                <span className="font-bold text-orange-500 text-3xl mx-2">{score}</span>
                                out of {questions.length}
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={handleExport}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-[5px] font-bold text-sm tracking-wider uppercase transition-all ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'}`}
                                >
                                    <Download size={16} />
                                    Export
                                </button>
                                <button
                                    onClick={() => {
                                        setQuestions([]);
                                        setAnswers({});
                                        setIsSubmitted(false);
                                        setNoQuestionsFound(false);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="px-8 py-3 rounded-[5px] font-bold text-sm tracking-wider uppercase bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-md shadow-orange-500/20"
                                >
                                    Take Another Test
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ChapterTest;