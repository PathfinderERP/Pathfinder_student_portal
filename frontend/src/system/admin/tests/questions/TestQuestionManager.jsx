import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Plus, Search, Trash2, RefreshCw, ArrowLeft,
    Loader2, ChevronRight, ChevronDown, X, Eye, BookOpen, Database,
    ArrowUp, ArrowDown, Shuffle, GripVertical, BellRing
} from 'lucide-react';
import { Reorder, useDragControls } from 'framer-motion';
import { useTheme } from '../../../../context/ThemeContext';
import { useAuth } from '../../../../context/AuthContext';
import QuestionBank from '../../QuestionBank';

const QuestionItem = ({ q, qid, displayPos, sectionId, isDarkMode, isActionLoading, setSelectedQuestion, setShowDetailModal, handleMoveQuestion, handleRemoveQuestion, searchTerm, totalCount, isSelected, onToggleSelect }) => {
    const controls = useDragControls();
    const canDrag = searchTerm.trim() === '' && !isSelected; // Also disable drag on selected to avoid conflict

    return (
        <Reorder.Item
            key={sectionId ? `${sectionId}_${qid}` : qid}
            value={q}
            dragListener={false}
            dragControls={controls}
            as="div"
            layout
            whileDrag={{ 
                scale: 1.02, 
                boxShadow: isDarkMode ? "0 25px 50px -12px rgba(0,0,0,0.5)" : "0 25px 50px -12px rgba(0,0,0,0.1)",
                backgroundColor: isDarkMode ? "#1C212E" : "white",
                zIndex: 100
            }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className={`flex items-center gap-6 p-6 border-b transition-colors relative select-none ${isDarkMode ? 'hover:bg-white/[0.02] border-white/5' : 'hover:bg-slate-50 border-slate-50'} ${canDrag ? '' : 'opacity-70 group'}`}
        >
             {/* SELECT CHECKBOX */}
             <div className="w-10 flex justify-center flex-shrink-0">
                <button 
                    onClick={() => onToggleSelect(qid)}
                    className={`w-5 h-5 rounded-[4px] border-2 transition-all flex items-center justify-center ${isSelected 
                        ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-600/20' 
                        : isDarkMode ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-white border-slate-300 hover:border-slate-400'}`}
                >
                    {isSelected && <X size={12} strokeWidth={4} className="text-white" />}
                </button>
             </div>

             {/* DRAG HANDLE */}
             <div 
                onPointerDown={(e) => canDrag && controls.start(e)}
                className={`w-10 flex justify-center flex-shrink-0 transition-all ${canDrag ? 'cursor-grab active:cursor-grabbing text-slate-400 hover:text-blue-500' : 'opacity-10 cursor-not-allowed'}`}
             >
                <GripVertical size={20} />
             </div>
             
             {/* POSITION BALL */}
             <div className="w-14 flex justify-center flex-shrink-0">
                <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black uppercase opacity-20 mb-1 tracking-[0.2em] w-full text-center">Pos</span>
                    <div className={`w-9 h-9 flex items-center justify-center rounded-[8px] font-black text-xs transition-colors ${isDarkMode ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 'bg-orange-50 text-orange-600 border border-orange-100 shadow-sm'}`}>
                        {displayPos}
                    </div>
                </div>
             </div>

             {/* CONTENT */}
             <div className="flex-1 min-w-0 pr-10">
                <div 
                    className={`text-sm font-medium line-clamp-2 leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}
                    dangerouslySetInnerHTML={{ __html: q.content }}
                />
             </div>

             {/* VIEW BUTTON */}
             <div className="w-32 flex justify-center flex-shrink-0">
                <button
                    onClick={() => { setSelectedQuestion(q); setShowDetailModal(true); }}
                    className={`px-5 py-2 rounded-[5px] font-black text-[9px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20' : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 shadow-sm'}`}
                >
                    View Detail
                </button>
             </div>

             {/* ACTIONS */}
             <div className="w-48 flex justify-end items-center gap-4 pr-4 flex-shrink-0">
                <div className="flex flex-col gap-1">
                    <button
                        onClick={() => handleMoveQuestion(qid, 'up', sectionId)}
                        disabled={displayPos === 1}
                        className={`p-1.5 rounded-[5px] transition-all ${displayPos === 1 ? 'opacity-10 cursor-not-allowed' : 'hover:bg-orange-500/10 text-orange-500 hover:scale-110 active:scale-90'}`}
                    >
                        <ArrowUp size={14} strokeWidth={3} />
                    </button>
                    <button
                        onClick={() => handleMoveQuestion(qid, 'down', sectionId)}
                        disabled={displayPos === totalCount}
                        className={`p-1.5 rounded-[5px] transition-all ${displayPos === totalCount ? 'opacity-10 cursor-not-allowed' : 'hover:bg-orange-500/10 text-orange-500 hover:scale-110 active:scale-90'}`}
                    >
                        <ArrowDown size={14} strokeWidth={3} />
                    </button>
                </div>

                <div className="w-px h-8 bg-slate-200 dark:bg-white/5 mx-1" />

                <button
                    onClick={() => handleRemoveQuestion(q.id)}
                    disabled={isActionLoading}
                    className={`p-3.5 rounded-[5px] transition-all hover:scale-110 active:scale-90 ${isDarkMode ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-red-50 text-red-500 hover:bg-red-600 hover:text-white border border-red-100 shadow-sm'}`}
                >
                    <Trash2 size={18} />
                </button>
             </div>
        </Reorder.Item>
    );
};

const SectionBlock = ({ section, sidx, sectionQs, searchTerm, reorderKey, isDarkMode, selectedQIds, setSelectedQIds, isActionLoading, setSelectedQuestion, setShowDetailModal, handleMoveQuestion, handleRemoveQuestion, handleReorder, handleShuffleQuestions }) => {
    const controls = useDragControls();
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <Reorder.Item
            value={section}
            dragListener={false}
            dragControls={controls}
            className="mb-8 last:mb-0"
        >
            <div className={`px-10 py-5 border-b flex items-center justify-between group/header ${isDarkMode ? 'bg-white/[0.04] border-white/5' : 'bg-slate-50/80 border-slate-100 shadow-sm'}`}>
                <div className="flex items-center gap-6">
                    <div 
                        onPointerDown={(e) => { e.stopPropagation(); controls.start(e); }}
                        className="p-2 cursor-grab active:cursor-grabbing opacity-0 group-hover/header:opacity-100 transition-opacity"
                    >
                        <GripVertical size={16} className="text-slate-400" />
                    </div>
                    <div className="w-10 h-10 rounded-full bg-orange-600/10 border border-orange-600/20 flex items-center justify-center text-orange-600 text-xs font-black shadow-inner">
                        {sidx + 1}
                    </div>
                    <div>
                        <h5 className="text-[12px] font-black uppercase tracking-widest text-orange-500 flex items-center gap-3">
                            {section.name}
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span className="text-[10px] opacity-40 lowercase font-bold">{sectionQs.length} items</span>
                        </h5>
                        <p className="text-[8px] font-bold opacity-20 uppercase tracking-[0.3em] mt-0.5">Section Context Identified</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => handleShuffleQuestions(section.id)}
                        className={`p-2.5 rounded-[5px] transition-all hover:bg-orange-500/10 text-orange-500 hover:scale-110 active:rotate-180 duration-500`}
                        title={`Shuffle Questions in ${section.name}`}
                    >
                        <Shuffle size={15} />
                    </button>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`p-2.5 rounded-[5px] transition-all hover:bg-blue-500/10 text-blue-500`}
                        title={isExpanded ? "Collapse Section" : "Expand Section"}
                    >
                        {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <Reorder.Group
                    key={`section-${section.id}-${reorderKey}`}

                axis="y"
                values={sectionQs}
                onReorder={(newOrder) => handleReorder(newOrder, section.id)}
                className="divide-y divide-white/5 bg-white/5 backdrop-blur-sm"
            >
                {sectionQs.map((q, idx) => {
                    const qid = q.id || q._id;
                    const compositeKey = `${section.id}_${qid}`;
                    const matchesSearch = !searchTerm.trim() || q.content?.toLowerCase().includes(searchTerm.toLowerCase());
                    if (!matchesSearch) return null;
                    
                    return (
                        <QuestionItem 
                            key={compositeKey} 
                            q={q} 
                            qid={qid}
                            displayPos={idx + 1}
                            sectionId={section.id}
                            idx={idx} 
                            isSelected={selectedQIds.includes(compositeKey)}
                            onToggleSelect={() => {
                                setSelectedQIds(prev => prev.includes(compositeKey) ? prev.filter(i => i !== compositeKey) : [...prev, compositeKey]);
                            }}
                            isDarkMode={isDarkMode}
                            isActionLoading={isActionLoading}
                            setSelectedQuestion={setSelectedQuestion}
                            setShowDetailModal={setShowDetailModal}
                            handleMoveQuestion={handleMoveQuestion}
                            handleRemoveQuestion={handleRemoveQuestion}
                            searchTerm={searchTerm}
                            totalCount={sectionQs.length}
                        />
                    );
                })}
            </Reorder.Group>
            )}
        </Reorder.Item>
    );
};

const TestQuestionManager = ({ test, onBack, initialSectionId }) => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();

    const [sections, setSections] = useState([]);
    const [sectionOrder, setSectionOrder] = useState([]); // custom display order for combined view
    const [activeTab, setActiveTab] = useState(initialSectionId || 'combined');
    const [questions, setQuestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedQIds, setSelectedQIds] = useState([]);
    const [reorderKey, setReorderKey] = useState(0); // force Reorder.Group remount on shuffle

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
            setSectionOrder(response.data); // initialize order matching API order
            if (response.data.length > 0 && !activeTab) {
                setActiveTab(initialSectionId || response.data[0].id);
            }
        } catch (err) {
            console.error('Failed to fetch sections:', err);
        } finally {
            setIsLoading(false);
        }
    }, [test.id, getApiUrl, token, initialSectionId]);


    const fetchSectionQuestions = useCallback(async () => {
        if (!activeTab) return;
        setIsLoading(true);
        try {
            const apiUrl = getApiUrl();
            const activeToken = token || localStorage.getItem('auth_token');
            
            let targetIds = [];
            if (activeTab === 'combined') {
                targetIds = sections.map(s => s.id);
            } else {
                targetIds = [activeTab];
            }
            
            if (targetIds.length === 0) {
                setIsLoading(false);
                return;
            }

            const promises = targetIds.map(id => 
                axios.get(`${apiUrl}/api/sections/${id}/questions/`, {
                    headers: { 'Authorization': `Bearer ${activeToken}` }
                }).then(res => res.data.map(q => ({...q, section_id: id})))
            );
            
            const results = await Promise.all(promises);
            // Flatten — use composite key (section_id + question_id) so the same question
            // can appear under multiple sections if it's assigned to more than one
            const allFetched = results.flat();
            const uniqueQuestions = [];
            const seenKeys = new Set();
            
            allFetched.forEach(q => {
                const qid = q.id || q._id;
                const compositeKey = `${q.section_id}_${qid}`;
                if (!seenKeys.has(compositeKey)) {
                    uniqueQuestions.push(q);
                    seenKeys.add(compositeKey);
                }
            });
            
            setQuestions(uniqueQuestions);
        } catch (err) {
            console.error('Failed to fetch questions:', err);
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, sections, getApiUrl, token]);

    useEffect(() => {
        fetchSections();
    }, [fetchSections]);

    useEffect(() => {
        fetchSectionQuestions();
    }, [fetchSectionQuestions]);

    const handleRemoveQuestion = async (qid) => {
        if (!window.confirm('Are you sure you want to remove this question from all selected sections?')) return;
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const activeToken = token || localStorage.getItem('auth_token');
            
            const targetIds = activeTab === 'combined' ? sections.map(s => s.id) : [activeTab];
            
            // Call remove for ALL targeted sections
            await Promise.all(targetIds.map(sid => 
                axios.post(`${apiUrl}/api/sections/${sid}/remove_questions/`,
                    { question_ids: [qid] },
                    { headers: { 'Authorization': `Bearer ${activeToken}` } }
                )
            ));
            
            fetchSectionQuestions();
            setSelectedQIds(prev => prev.filter(id => id !== qid));
        } catch (err) {
            alert('Failed to remove question');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleBulkRemove = async () => {
        if (selectedQIds.length === 0) return;
        if (!window.confirm(`Are you sure you want to remove ${selectedQIds.length} selected questions from all active sections?`)) return;
        
        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const activeToken = token || localStorage.getItem('auth_token');
            
            const targetIds = activeTab === 'combined' ? sections.map(s => s.id) : [activeTab];
            
            await Promise.all(targetIds.map(sid => 
                axios.post(`${apiUrl}/api/sections/${sid}/remove_questions/`,
                    { question_ids: selectedQIds },
                    { headers: { 'Authorization': `Bearer ${activeToken}` } }
                )
            ));
            
            setSelectedQIds([]);
            fetchSectionQuestions();
        } catch (err) {
            alert('Failed to bulk remove questions');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleAssignQuestions = async (questionIds) => {
        if (!activeTab) {
            alert('Please select a section');
            return;
        }

        const targetIds = activeTab === 'combined' ? [sections[0]?.id] : [activeTab];
        
        // Strictly check for limit before assigning
        const sectionsWithOverflow = targetIds.filter(sid => {
            const section = sections.find(s => s.id === sid);
            const limit = section?.total_questions || 0;
            if (activeTab !== 'combined') {
                return (questions.length + questionIds.length) > limit;
            }
            return false;
        });

        if (sectionsWithOverflow.length > 0) {
            const firstSec = sections.find(s => s.id === sectionsWithOverflow[0]);
            alert(`Limit Exceeded! ${firstSec.name} only allows ${firstSec.total_questions} questions. You are trying to add ${questionIds.length} more.`);
            return;
        }

        setIsActionLoading(true);
        try {
            const apiUrl = getApiUrl();
            const activeToken = token || localStorage.getItem('auth_token');
            
            await Promise.all(targetIds.map(sid => 
                axios.post(`${apiUrl}/api/sections/${sid}/assign_questions/`,
                    { question_ids: questionIds },
                    { headers: { 'Authorization': `Bearer ${activeToken}` } }
                )
            ));
            
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

    const handleReorder = async (newSectionQuestions, sid) => {
        const targetSid = sid || activeTab;
        if (targetSid === 'combined') return;

        // Update main questions state by replacing only this section's questions
        setQuestions(prev => {
            const others = prev.filter(q => String(q.section_id) !== String(targetSid));
            return [...others, ...newSectionQuestions];
        });
        
        // Save order to backend
        try {
            const apiUrl = getApiUrl();
            const activeToken = token || localStorage.getItem('auth_token');
            await axios.post(`${apiUrl}/api/sections/${targetSid}/reorder_questions/`,
                { ordered_ids: newSectionQuestions.map(q => q.id || q._id) },
                { headers: { 'Authorization': `Bearer ${activeToken}` } }
            );
        } catch (err) {
            console.error('Failed to save question order:', err);
        }
    };

    const handleMoveQuestion = async (id, direction, sid) => {
        const targetSid = sid || activeTab;
        if (targetSid === 'combined') return;

        const sectionQuestions = questions.filter(q => String(q.section_id) === String(targetSid));
        const index = sectionQuestions.findIndex(q => (q.id || q._id) === id);
        if (index === -1) return;

        const newQuestions = [...sectionQuestions];
        // Swap
        [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
        
        handleReorder(newQuestions, targetSid);
    };

    const handleShuffleQuestions = async (sid) => {
        const targetSid = typeof sid === 'string' || typeof sid === 'number' ? sid : activeTab;
        if (targetSid === 'combined') {
            alert('Please use the shuffle button on a specific section header.');
            return;
        }
        if (!window.confirm(`Shuffle all questions in this section?`)) return;

        const sectionQuestions = questions.filter(q => String(q.section_id) === String(targetSid));
        const shuffled = [...sectionQuestions].sort(() => Math.random() - 0.5);

        handleReorder(shuffled, targetSid);
        setReorderKey(k => k + 1); // Force Framer Motion remount only for explicit shuffles
    };

    const handleShuffleSections = () => {
        if (!window.confirm('Shuffle the order of sections in the Combined View?')) return;
        setSectionOrder(prev => [...prev].sort(() => Math.random() - 0.5));
        setReorderKey(k => k + 1); // Force Framer Motion remount only for explicit shuffles
    };

    const renderHeader = () => (
        <div className={`mb-6 p-6 rounded-[5px] border transition-all ${isDarkMode ? 'bg-[#1A1F2B] border-white/5 shadow-2xl shadow-black/20' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'}`}>
            <div className="flex flex-wrap justify-between items-center gap-6">
                <div className="flex items-center gap-6">
                    <button
                        onClick={onBack}
                        className={`p-4 rounded-[5px] transition-all hover:scale-110 active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'}`}
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
                        className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[5px] font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all flex items-center gap-3 active:scale-95"
                    >
                        Show ALL Test
                    </button>
                </div>
            </div>
        </div>
    );

    const renderTabs = () => (
        <div className="flex flex-wrap gap-2 mb-8 items-center bg-black/5 p-2 rounded-[5px] border border-white/5">
            <div className="px-4 py-2 mr-2">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Sections</span>
            </div>
            
            {/* Special Combined Tab */}
            <button
                onClick={() => setActiveTab('combined')}
                className={`px-5 py-3 rounded-[5px] font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3 border shadow-sm ${activeTab === 'combined'
                    ? 'bg-orange-600 text-white border-orange-500 shadow-orange-600/30'
                    : isDarkMode ? 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white' : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'
                    }`}
            >
                <Database size={14} />
                Combined View
            </button>

            <div className="w-px h-8 bg-white/10 mx-2" />

            {sections.map((section, idx) => {
                const isActive = activeTab === section.id;
                return (
                    <button
                        key={section.id}
                        onClick={() => setActiveTab(section.id)}
                        className={`px-5 py-3 rounded-[5px] font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3 border shadow-sm ${isActive
                            ? 'bg-blue-600 text-white border-blue-500 shadow-blue-600/30'
                            : isDarkMode ? 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white' : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'
                            }`}
                    >
                        <div className={`w-2 h-2 rounded-full transition-all ${isActive ? 'bg-white animate-pulse' : 'bg-slate-500 opacity-30'}`} />
                        {section.name}
                    </button>
                );
            })}
        </div>
    );

    const renderContent = () => {
        const currentCount = questions.length;
        const totalAllowed = activeTab === 'combined' 
            ? sections.reduce((acc, s) => acc + (s.total_questions || 0), 0)
            : sections.find(s => s.id === activeTab)?.total_questions || 0;

        const filteredQuestions = questions.filter(q =>
            q.content?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
            <div className={`rounded-[5px] border shadow-2xl overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                {/* Header Section */}
                <div className={`px-10 py-10 flex flex-col md:flex-row md:items-center justify-between gap-8 border-b ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                    <div>
                        <div className="flex items-center gap-4">
                            <h4 className="text-lg font-black uppercase tracking-tight text-slate-200">
                                {activeTab === 'combined' ? 'Complete Test' : sections.find(s => s.id === activeTab)?.name}{' '}
                                <span className="text-orange-500">List</span>
                            </h4>
                            <div className={`px-4 py-1 rounded-[5px] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border shadow-sm transition-all duration-500 ${currentCount > totalAllowed 
                                ? 'bg-red-500/10 text-red-500 border-red-500/30 animate-pulse' 
                                : currentCount === totalAllowed ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-transparent'}`}>
                                {currentCount > totalAllowed && <BellRing size={12} />}
                                {currentCount} / {totalAllowed} Questions
                                {currentCount > totalAllowed && <span className="ml-1 opacity-70">(Limit Exceeded)</span>}
                            </div>
                        </div>
                        <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest mt-1">
                            {activeTab === 'combined' ? `Viewing all sections together` : `Manage questions for ${sections.find(s => s.id === activeTab)?.name}`}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-blue-500 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Find question contents..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`pl-12 pr-6 py-3.5 w-72 rounded-[5px] border text-xs font-bold transition-all focus:ring-4 ${isDarkMode ? 'bg-black/20 border-white/10 focus:border-blue-500/50 focus:ring-blue-500/10 text-white' : 'bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500/5'}`}
                            />
                        </div>

                        <button
                            onClick={() => setActiveView('selector')}
                            className="px-6 py-3.5 bg-[#2E7D32] hover:bg-[#1B5E20] text-white rounded-[5px] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-green-900/10 transition-all flex items-center gap-3 active:scale-95 group"
                        >
                            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                            Open Question Bank +
                        </button>

                        {activeTab !== 'combined' ? (
                            <button
                                onClick={() => handleShuffleQuestions(activeTab)}
                                title="Shuffle Questions in this Section"
                                className={`p-3.5 rounded-[5px] border transition-all hover:scale-110 active:rotate-180 duration-500 ${isDarkMode ? 'bg-white/5 border-white/10 text-emerald-500' : 'bg-slate-50 border-slate-200 text-emerald-600 hover:bg-white hover:shadow-lg'}`}
                            >
                                <Shuffle size={20} />
                            </button>
                        ) : (
                            <button
                                onClick={handleShuffleSections}
                                title="Shuffle Section Order"
                                className={`p-3.5 rounded-[5px] border transition-all hover:scale-110 active:rotate-180 duration-500 flex items-center gap-2 ${isDarkMode ? 'bg-white/5 border-white/10 text-purple-400' : 'bg-slate-50 border-slate-200 text-purple-600 hover:bg-white hover:shadow-lg'}`}
                            >
                                <Shuffle size={20} />
                                <span className="text-[9px] font-black uppercase tracking-widest">Sections</span>
                            </button>
                        )}

                        <button
                            onClick={fetchSectionQuestions}
                            className={`p-3.5 rounded-[5px] border transition-all hover:scale-110 active:rotate-180 duration-500 ${isDarkMode ? 'bg-white/5 border-white/10 text-orange-500' : 'bg-slate-50 border-slate-200 text-orange-600 hover:bg-white hover:shadow-lg'}`}
                        >
                            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-hidden pt-2">
                    {/* Header for Div-based List */}
                    <div className={`flex items-center gap-6 px-10 py-5 text-[10px] font-black uppercase tracking-[0.2em] border-b ${isDarkMode ? 'bg-white/[0.02] text-slate-500 border-white/5' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                        <div className="w-10 text-center">
                            <button 
                                onClick={() => {
                                    if (selectedQIds.length === filteredQuestions.length) setSelectedQIds([]);
                                    else setSelectedQIds(filteredQuestions.map(q => q.id || q._id));
                                }}
                                className={`w-5 h-5 rounded-[4px] border-2 transition-all flex items-center justify-center mx-auto ${selectedQIds.length > 0 && selectedQIds.length === filteredQuestions.length
                                    ? 'bg-blue-600 border-blue-600' 
                                    : isDarkMode ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-white border-slate-300'}`}
                            >
                                {selectedQIds.length > 0 && (
                                    <div className={selectedQIds.length === filteredQuestions.length ? 'text-white' : 'w-2 h-0.5 bg-blue-500'} >
                                        {selectedQIds.length === filteredQuestions.length && <X size={12} strokeWidth={4} />}
                                    </div>
                                )}
                            </button>
                        </div>
                        <div className="w-10 text-center">Drg</div>
                        <div className="w-12 text-center">#</div>
                        <div className="flex-1">Question Content</div>
                        <div className="w-32 text-center">Preview</div>
                        <div className="w-48 text-right pr-6">Action</div>
                    </div>

                    <div className="flex flex-col min-h-[400px]">
                        {isLoading ? (
                            Array(3).fill(0).map((_, i) => (
                                <div key={i} className="p-10 animate-pulse border-b border-white/5">
                                    <div className={`h-12 rounded-[5px] ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`} />
                                </div>
                            ))
                        ) : filteredQuestions.length === 0 ? (
                            <div className="py-32 flex flex-col items-center gap-4 opacity-10">
                                <BookOpen size={64} />
                                <p className="text-lg font-black uppercase tracking-widest">No Questions Found</p>
                            </div>
                        ) : activeTab === 'combined' ? (
                            <Reorder.Group
                                axis="y"
                                values={sectionOrder}
                                onReorder={setSectionOrder}
                                className="flex flex-col"
                            >
                                {sectionOrder.map((section, sidx) => {
                                    const sectionQs = questions.filter(q => String(q.section_id) === String(section.id));
                                    if (sectionQs.length === 0) return null;

                                    return (
                                        <SectionBlock
                                            key={section.id}
                                            section={section}
                                            sidx={sidx}
                                            sectionQs={sectionQs}
                                            searchTerm={searchTerm}
                                            reorderKey={reorderKey}
                                            isDarkMode={isDarkMode}
                                            selectedQIds={selectedQIds}
                                            setSelectedQIds={setSelectedQIds}
                                            isActionLoading={isActionLoading}
                                            setSelectedQuestion={setSelectedQuestion}
                                            setShowDetailModal={setShowDetailModal}
                                            handleMoveQuestion={handleMoveQuestion}
                                            handleRemoveQuestion={handleRemoveQuestion}
                                            handleReorder={handleReorder}
                                            handleShuffleQuestions={handleShuffleQuestions}
                                        />
                                    );
                                })}
                            </Reorder.Group>
                        ) : (
                            <Reorder.Group
                                key={`single-${activeTab}-${reorderKey}`}
                                axis="y"
                                values={filteredQuestions}
                                onReorder={handleReorder}
                                className="divide-y divide-white/5"
                                layoutScroll
                            >
                                {filteredQuestions.map((q, idx) => {
                                    const qid = q.id || q._id;
                                    return (
                                        <QuestionItem 
                                            key={qid} 
                                            q={q} 
                                            qid={qid}
                                            displayPos={idx + 1}
                                            sectionId={activeTab}
                                            idx={idx} 
                                            isSelected={selectedQIds.includes(qid)}
                                            onToggleSelect={(id) => {
                                                setSelectedQIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
                                            }}
                                            canDrag={true}
                                            isDarkMode={isDarkMode}
                                            isActionLoading={isActionLoading}
                                            setSelectedQuestion={setSelectedQuestion}
                                            setShowDetailModal={setShowDetailModal}
                                            handleMoveQuestion={handleMoveQuestion}
                                            handleRemoveQuestion={handleRemoveQuestion}
                                            searchTerm={searchTerm}
                                            totalCount={filteredQuestions.length}
                                        />
                                    );
                                })}
                            </Reorder.Group>
                        )}
                    </div>
                </div>

                {/* Bulk Actions Bar */}
                {selectedQIds.length > 0 && (
                    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[150] animate-in slide-in-from-bottom-10 duration-500">
                        <div className="bg-slate-900 border border-white/10 rounded-[5px] p-2 flex items-center gap-4 shadow-2xl backdrop-blur-xl">
                            <div className="px-4 py-2 border-r border-white/10">
                                <span className="text-white text-[10px] font-black uppercase tracking-widest">{selectedQIds.length} Selected</span>
                            </div>
                            <button 
                                onClick={handleBulkRemove}
                                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-[5px] text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-600/20 active:scale-95 transition-all flex items-center gap-3"
                            >
                                <Trash2 size={16} /> Bulk Delete
                            </button>
                            <button 
                                onClick={() => setSelectedQIds([])}
                                className="px-4 py-2.5 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Question Detail Modal
    const renderDetailModal = () => {
        if (!showDetailModal || !selectedQuestion) return null;
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowDetailModal(false)} />
                <div className={`relative w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-[5px] p-10 shadow-2xl animate-in zoom-in-95 duration-300 ${isDarkMode ? 'bg-[#10141D] border border-white/10' : 'bg-white'}`}>
                    <button onClick={() => setShowDetailModal(false)} className="absolute top-8 right-8 p-3 rounded-[5px] hover:bg-red-500/10 text-red-500 transition-all active:scale-90">
                        <X size={24} strokeWidth={3} />
                    </button>

                    <div className="mb-8">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Question Details</span>
                        <h2 className="text-2xl font-black uppercase tracking-tight mt-1">Preview <span className="text-orange-500">Question</span></h2>
                    </div>

                    <div className="space-y-10">
                        <div className="p-8 rounded-[5px] bg-black/5 border border-white/5">
                            <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4 ml-1">Content</h4>
                            <div className={`prose prose-sm max-w-none ${isDarkMode ? 'prose-invert' : ''}`} dangerouslySetInnerHTML={{ __html: selectedQuestion.content }} />
                        </div>

                        {selectedQuestion.question_options && selectedQuestion.question_options.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectedQuestion.question_options.map((opt, i) => (
                                    <div key={i} className={`p-5 rounded-[5px] border transition-all ${opt.isCorrect
                                        ? 'bg-emerald-500/10 border-emerald-500/50'
                                        : isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'
                                        }`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-[5px] flex items-center justify-center font-black text-sm ${opt.isCorrect ? 'bg-emerald-500 text-white' : 'bg-black/10'
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
                <div className={`mb-8 p-8 rounded-[5px] border flex justify-between items-center ${isDarkMode ? 'bg-[#10141D] border-white/5 shadow-2xl' : 'bg-white border-slate-200 shadow-xl'}`}>
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setActiveView('list')}
                            className={`p-4 rounded-[5px] transition-all hover:scale-110 active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}
                        >
                            <ArrowLeft size={24} strokeWidth={3} />
                        </button>
                        <div>
                            <h2 className="text-3xl font-black uppercase tracking-tight">Select <span className="text-orange-500">Questions</span></h2>
                            <p className="text-[10px] font-bold opacity-30 uppercase tracking-[0.2em] mt-1">Add questions to {activeTab === 'combined' ? 'the first section' : sections.find(s => s.id === activeTab)?.name}</p>
                        </div>
                    </div>
                </div>

                <div className={`rounded-[5px] border overflow-hidden p-8 ${isDarkMode ? 'bg-[#0B0F17] border-white/10' : 'bg-white border-slate-200'}`}>
                    {activeTab === 'combined' && (
                        <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-[5px] text-orange-500 flex items-center gap-3">
                            <Plus size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Questions will be assigned to Section 1 by default</span>
                        </div>
                    )}
                    <div className="mb-8 p-6 rounded-[5px] bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center gap-6">
                        <Database size={32} />
                        <div>
                            <p className="text-sm font-black uppercase tracking-widest">Repository Access</p>
                            <p className="text-xs font-bold opacity-70">Pick the best questions from your entire bank to augment this test section.</p>
                        </div>
                    </div>

                    {(() => {
                        const totalAllowedForSelector = activeTab === 'combined' 
                            ? sections.reduce((acc, s) => acc + (s.total_questions || 0), 0)
                            : sections.find(s => s.id === activeTab)?.total_questions || 0;
                        const currentCountForSelector = questions.length;

                        return (
                            <QuestionBank
                                isSelectionMode={true}
                                onAssignQuestions={handleAssignQuestions}
                                alreadySelectedIds={questions.map(q => q.id || q._id)}
                                totalAllowed={totalAllowedForSelector}
                                currentCount={currentCountForSelector}
                            />
                        );
                    })()}
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 min-h-screen">
            {renderHeader()}
            {renderTabs()}
            {activeTab ? (
                renderContent()
            ) : (
                <div className="py-24 text-center">
                    <Database className="w-16 h-16 text-slate-500 opacity-10 mx-auto mb-6" />
                    <p className="text-sm font-black uppercase tracking-widest opacity-40">Select a section to begin</p>
                </div>
            )}
            {renderDetailModal()}
        </div>
    );
};

export default TestQuestionManager;
