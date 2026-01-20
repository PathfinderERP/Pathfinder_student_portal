import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Plus, Search, Trash2, RefreshCw, ArrowLeft,
    Loader2, ChevronRight, X, Eye, BookOpen, Database,
    ArrowUp, ArrowDown, Shuffle
} from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { useAuth } from '../../../../context/AuthContext';
import QuestionBank from '../../QuestionBank';

const TestQuestionManager = ({ test, onBack }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();

    const [sections, setSections] = useState([]);
    const [activeSectionId, setActiveSectionId] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Views: 'list' or 'selector'
    const [activeView, setActiveView] = useState('list');

    // Question Detail Modal
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const getAuthConfig = useCallback(() => {
        const activeToken = token || localStorage.getItem('auth_token');
        return activeToken ? { headers: { 'Authorization': `Bearer ${activeToken}` } } : {};
    }, [token]);

    const fetchSections = useCallback(async () => {
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const activeToken = token || localStorage.getItem('auth_token');
            const response = await axios.get(`${apiUrl}/api/tests/${test.id}/sections/`, {
                headers: { 'Authorization': `Bearer ${activeToken}` }
            });
            setSections(response.data);
            if (response.data.length > 0 && !activeSectionId) {
                setActiveSectionId(response.data[0].id);
            }
        } catch (err) {
            console.error('Failed to fetch sections:', err);
        } finally {
            setIsLoading(false);
        }
    }, [test.id, getApiUrl, getAuthConfig, activeSectionId]);

    const fetchSectionQuestions = useCallback(async () => {
        if (!activeSectionId) return;
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const activeToken = token || localStorage.getItem('auth_token');
            const response = await axios.get(`${apiUrl}/api/sections/${activeSectionId}/questions/`, {
                headers: { 'Authorization': `Bearer ${activeToken}` }
            });
            setQuestions(response.data);
        } catch (err) {
            console.error('Failed to fetch questions:', err);
        } finally {
            setIsLoading(false);
        }
    }, [activeSectionId, getApiUrl, getAuthConfig]);

    useEffect(() => {
        fetchSections();
    }, [fetchSections]);

    useEffect(() => {
        fetchSectionQuestions();
    }, [fetchSectionQuestions]);

    const handleRemoveQuestion = async (qid) => {
        if (!window.confirm('Are you sure you want to remove this question from the section?')) return;
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const activeToken = token || localStorage.getItem('auth_token');
            await axios.post(`${apiUrl}/api/sections/${activeSectionId}/remove_questions/`,
                { question_ids: [qid] },
                { headers: { 'Authorization': `Bearer ${activeToken}` } }
            );
            fetchSectionQuestions();
        } catch (err) {
            alert('Failed to remove question');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleAssignQuestions = async (questionIds) => {
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const activeToken = token || localStorage.getItem('auth_token');
            await axios.post(`${apiUrl}/api/sections/${activeSectionId}/assign_questions/`,
                { question_ids: questionIds },
                { headers: { 'Authorization': `Bearer ${activeToken}` } }
            );
            fetchSectionQuestions();
            setActiveView('list');
        } catch (err) {
            alert('Failed to assign questions');
        } finally {
            setIsActionLoading(false);
        }
    };

    const filteredQuestions = questions.filter(q =>
        q.content?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleMoveQuestion = async (index, direction) => {
        const newQuestions = [...questions];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= newQuestions.length) return;

        // Swap
        [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];

        setQuestions(newQuestions);

        // Save order to backend
        try {
            const apiUrl = getApiUrl();
            const activeToken = token || localStorage.getItem('auth_token');
            await axios.post(`${apiUrl}/api/sections/${activeSectionId}/reorder_questions/`,
                { ordered_ids: newQuestions.map(q => q.id || q._id) },
                { headers: { 'Authorization': `Bearer ${activeToken}` } }
            );
        } catch (err) {
            console.error('Failed to save question order:', err);
        }
    };

    const handleShuffleQuestions = async () => {
        if (!window.confirm('Shuffle all questions in this section?')) return;

        const shuffled = [...questions].sort(() => Math.random() - 0.5);
        setQuestions(shuffled);

        try {
            const apiUrl = getApiUrl();
            const activeToken = token || localStorage.getItem('auth_token');
            await axios.post(`${apiUrl}/api/sections/${activeSectionId}/reorder_questions/`,
                { ordered_ids: shuffled.map(q => q.id || q._id) },
                { headers: { 'Authorization': `Bearer ${activeToken}` } }
            );
        } catch (err) {
            console.error('Failed to save shuffled order:', err);
        }
    };

    const renderHeader = () => (
        <div className={`mb-6 p-6 rounded-2xl border transition-all ${isDarkMode ? 'bg-[#1A1F2B] border-white/5 shadow-2xl shadow-black/20' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'}`}>
            <div className="flex flex-wrap justify-between items-center gap-6">
                <div className="flex items-center gap-6">
                    <button
                        onClick={onBack}
                        className={`p-4 rounded-2xl transition-all hover:scale-110 active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'}`}
                    >
                        <ArrowLeft size={24} strokeWidth={3} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Test Management</span>
                            <ChevronRight size={12} className="opacity-20" />
                            <span className="text-sm font-black text-orange-500 uppercase tracking-tight">{test.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <h3 className="text-xl font-black uppercase tracking-tighter">
                                Question <span className="opacity-40">List</span>
                            </h3>
                            <div className="h-4 w-px bg-slate-200 opacity-20 mx-2" />
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Code :</span>
                                <span className="text-xs font-black text-blue-500 tracking-wider font-mono">{test.code}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all flex items-center gap-3 active:scale-95"
                    >
                        Show ALL Test
                    </button>
                </div>
            </div>
        </div>
    );

    const renderTabs = () => (
        <div className="flex flex-wrap gap-2 mb-8 items-center bg-black/5 p-2 rounded-2xl border border-white/5">
            <div className="px-4 py-2 mr-2">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Sections</span>
            </div>
            {sections.map(section => (
                <button
                    key={section.id}
                    onClick={() => setActiveSectionId(section.id)}
                    className={`px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeSectionId === section.id
                        ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                        : isDarkMode ? 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white' : 'bg-white text-slate-500 hover:bg-slate-50 shadow-sm border border-slate-100'
                        }`}
                >
                    {section.name}
                </button>
            ))}
        </div>
    );

    const renderContent = () => (
        <div className={`rounded-3xl border shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
            <div className="p-8 border-b border-inherit flex flex-wrap justify-between items-center gap-6">
                <div>
                    <h4 className="text-lg font-black uppercase tracking-tight">Questions <span className="text-orange-500">List</span></h4>
                    <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest mt-1">Manage questions for {sections.find(s => s.id === activeSectionId)?.name}</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-slate-500 group-focus-within:text-orange-500' : 'text-slate-400 group-focus-within:text-orange-500'}`} size={18} />
                        <input
                            type="text"
                            placeholder="Find question contents..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`pl-12 pr-6 py-3 rounded-xl border text-xs font-bold outline-none transition-all w-64 ${isDarkMode ? 'bg-white/5 border-white/10 focus:border-orange-500/50 focus:bg-white/10' : 'bg-slate-50 border-slate-200 focus:border-orange-500/50 focus:bg-white hover:border-slate-300'
                                }`}
                        />
                    </div>

                    <button
                        onClick={() => setActiveView('selector')}
                        className="px-6 py-3.5 bg-[#2E7D32] hover:bg-[#1B5E20] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-green-900/10 transition-all flex items-center gap-3 active:scale-95 group"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                        Open Question Bank +
                    </button>

                    <button
                        onClick={handleShuffleQuestions}
                        title="Shuffle Questions"
                        className={`p-3.5 rounded-xl border transition-all hover:scale-110 active:rotate-180 duration-500 ${isDarkMode ? 'bg-white/5 border-white/10 text-emerald-500' : 'bg-slate-50 border-slate-200 text-emerald-600 hover:bg-white hover:shadow-lg'}`}
                    >
                        <Shuffle size={20} />
                    </button>

                    <button
                        onClick={fetchSectionQuestions}
                        className={`p-3.5 rounded-xl border transition-all hover:scale-110 active:rotate-180 duration-500 ${isDarkMode ? 'bg-white/5 border-white/10 text-orange-500' : 'bg-slate-50 border-slate-200 text-orange-600 hover:bg-white hover:shadow-lg'}`}
                    >
                        <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left">
                    <thead>
                        <tr className={`text-[10px] font-black uppercase tracking-[0.2em] border-b ${isDarkMode ? 'bg-white/5 text-slate-500 border-white/5' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                            <th className="py-5 px-10">#</th>
                            <th className="py-5 px-10">Question</th>
                            <th className="py-5 px-10 text-center">Show Question</th>
                            <th className="py-5 px-10 text-right pr-12">Action</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-slate-50'}`}>
                        {isLoading ? (
                            Array(3).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan="4" className="py-12 px-10">
                                        <div className={`h-8 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`} />
                                    </td>
                                </tr>
                            ))
                        ) : filteredQuestions.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="py-32 text-center">
                                    <div className="flex flex-col items-center gap-4 opacity-10">
                                        <BookOpen size={64} />
                                        <p className="text-lg font-black uppercase tracking-widest">No Questions Found</p>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredQuestions.map((q, index) => (
                            <tr key={q.id || index} className={`group transition-all ${isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                                <td className="py-8 px-10">
                                    <div className="flex flex-col items-center">
                                        <span className={`text-[8px] font-black uppercase opacity-30 mb-1`}>Pos</span>
                                        <span className={`w-8 h-8 flex items-center justify-center rounded-lg font-black text-xs ${isDarkMode ? 'bg-white/5 text-orange-500' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
                                            {index + 1}
                                        </span>
                                    </div>
                                </td>
                                <td className="py-8 px-10">
                                    <div className={`max-w-2xl text-sm font-medium line-clamp-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}
                                        dangerouslySetInnerHTML={{ __html: q.content }} />
                                </td>
                                <td className="py-8 px-10 text-center">
                                    <button
                                        onClick={() => { setSelectedQuestion(q); setShowDetailModal(true); }}
                                        className={`px-5 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 ${isDarkMode ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20' : 'bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100'
                                            }`}
                                    >
                                        View Detail
                                    </button>
                                </td>
                                <td className="py-8 px-10 text-right pr-12">
                                    <div className="flex justify-end items-center gap-2">
                                        <div className="flex flex-col gap-1 mr-4">
                                            <button
                                                onClick={() => handleMoveQuestion(index, 'up')}
                                                disabled={index === 0}
                                                className={`p-1.5 rounded-md transition-all ${index === 0 ? 'opacity-10 cursor-not-allowed' : 'hover:bg-orange-500/10 text-orange-500'}`}
                                            >
                                                <ArrowUp size={14} strokeWidth={3} />
                                            </button>
                                            <button
                                                onClick={() => handleMoveQuestion(index, 'down')}
                                                disabled={index === filteredQuestions.length - 1}
                                                className={`p-1.5 rounded-md transition-all ${index === filteredQuestions.length - 1 ? 'opacity-10 cursor-not-allowed' : 'hover:bg-orange-500/10 text-orange-500'}`}
                                            >
                                                <ArrowDown size={14} strokeWidth={3} />
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveQuestion(q.id)}
                                            disabled={isActionLoading}
                                            className={`p-3 rounded-xl transition-all hover:scale-110 active:scale-90 ${isDarkMode ? 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white' : 'bg-red-50 text-red-500 hover:bg-red-600 hover:text-white border border-red-100'}`}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    // Question Detail Modal
    const renderDetailModal = () => {
        if (!showDetailModal || !selectedQuestion) return null;
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowDetailModal(false)} />
                <div className={`relative w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-[#10141D] border border-white/10' : 'bg-white'}`}>
                    <button onClick={() => setShowDetailModal(false)} className="absolute top-8 right-8 p-3 rounded-2xl hover:bg-red-500/10 text-red-500 transition-all active:scale-90">
                        <X size={24} strokeWidth={3} />
                    </button>

                    <div className="mb-8">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Question Details</span>
                        <h2 className="text-2xl font-black uppercase tracking-tight mt-1">Preview <span className="text-orange-500">Question</span></h2>
                    </div>

                    <div className="space-y-10">
                        <div className="p-8 rounded-3xl bg-black/5 border border-white/5">
                            <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4 ml-1">Content</h4>
                            <div className={`prose prose-sm max-w-none ${isDarkMode ? 'prose-invert' : ''}`} dangerouslySetInnerHTML={{ __html: selectedQuestion.content }} />
                        </div>

                        {selectedQuestion.question_options && selectedQuestion.question_options.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectedQuestion.question_options.map((opt, i) => (
                                    <div key={i} className={`p-5 rounded-2xl border transition-all ${opt.isCorrect
                                        ? 'bg-emerald-500/10 border-emerald-500/50'
                                        : isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'
                                        }`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${opt.isCorrect ? 'bg-emerald-500 text-white' : 'bg-black/10'
                                                }`}>
                                                {String.fromCharCode(65 + i)}
                                            </div>
                                            <div className="text-sm font-bold" dangerouslySetInnerHTML={{ __html: opt.content }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (activeView === 'selector') {
        return (
            <div className="animate-in slide-in-from-right-10 duration-500">
                <div className={`mb-8 p-8 rounded-[2.5rem] border flex justify-between items-center ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-2xl' : 'bg-white border-slate-200 shadow-xl'}`}>
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setActiveView('list')}
                            className={`p-4 rounded-2xl transition-all hover:scale-110 active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}
                        >
                            <ArrowLeft size={24} strokeWidth={3} />
                        </button>
                        <div>
                            <h2 className="text-3xl font-black uppercase tracking-tight">Select <span className="text-orange-500">Questions</span></h2>
                            <p className="text-[10px] font-bold opacity-30 uppercase tracking-[0.2em] mt-1">Add questions to {sections.find(s => s.id === activeSectionId)?.name}</p>
                        </div>
                    </div>
                </div>

                <div className={`rounded-[3rem] border overflow-hidden p-8 ${isDarkMode ? 'bg-[#0B0F17] border-white/10' : 'bg-white border-slate-200'}`}>
                    <div className="mb-8 p-6 rounded-3xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center gap-6">
                        <Database size={32} />
                        <div>
                            <p className="text-sm font-black uppercase tracking-widest">Repository Access</p>
                            <p className="text-xs font-bold opacity-70">Pick the best questions from your entire bank to augment this test section.</p>
                        </div>
                    </div>

                    <QuestionBank
                        isSelectionMode={true}
                        onAssignQuestions={handleAssignQuestions}
                        alreadySelectedIds={questions.map(q => q.id || q._id)}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 min-h-screen">
            {renderHeader()}
            {renderTabs()}
            {activeSectionId ? (
                renderContent()
            ) : (
                <div className="py-24 text-center">
                    <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest opacity-40">Warming up section data...</p>
                </div>
            )}
            {renderDetailModal()}
        </div>
    );
};

export default TestQuestionManager;
