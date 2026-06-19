import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { Activity, Brain, Trash2, Search, Filter, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

const QUESTION_MAPPING = {
    basic_name: "Name",
    basic_number: "Number",
    basic_class: "Class",
    basic_school: "School",
    basic_center: "Center",
    basic_career: "Dream career (if any)",
    q1: "When you sit to study, what usually happens?",
    q2: "Which way helps you understand best?",
    q3: "How often do you revise what you study?",
    q4: "What is your biggest problem while studying?",
    q5: "How long can you study without checking your phone?",
    q6: "Do you follow a study plan or timetable?",
    q7: "How regular are you with homework?",
    q8: "How confident are you in your studies?",
    q9: "What do you feel when exams are near?",
    q10: "What do you do when you get low marks?",
    q11: "Which subjects do you find difficult?",
    q12: "Why do you think those subjects are difficult?",
    q13: "Why do you study?",
    q14: "How clear are you about your future?",
    q15: "Do you feel pressure from studies?",
    q16: "What stresses you the most?",
    q17: "What kind of help do you think you need?",
    q18: "Would you like a system that tells you how to study better, where you are going wrong, and how to improve step-by-step?",
    q19: "Do you like learning through:",
    q20: "Would you prefer studying in your own language (e.g., Bengali) for better understanding?",
    q21: "If you could improve one thing about your studies, what would it be?"
};

const PsychometricResponses = () => {
    const { isDarkMode } = useTheme();
    const { getApiUrl, token } = useAuth();
    
    const [responses, setResponses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedRow, setExpandedRow] = useState(null);
    const [showQA, setShowQA] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [centreMap, setCentreMap] = useState({});
    
    // Filters
    const [showFilters, setShowFilters] = useState(false);
    const [filterCenter, setFilterCenter] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterCareer, setFilterCareer] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [jumpPageInput, setJumpPageInput] = useState('');
    const [questionMap, setQuestionMap] = useState(QUESTION_MAPPING);

    useEffect(() => {
        fetchResponses();
        fetchCentres();
        fetchQuestions();
    }, [token, getApiUrl]);

    const fetchQuestions = async () => {
        if (!token) return;
        try {
            const response = await axios.get(`${getApiUrl()}/api/master-data/psychometric-questions/?is_active=true`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const questions = Array.isArray(response.data) ? response.data : response.data.results || [];
            const newMap = { ...QUESTION_MAPPING };
            questions.forEach(q => {
                newMap[`q_${q.id}`] = q.text;
            });
            setQuestionMap(newMap);
        } catch (error) {
            console.error("Failed to fetch questions", error);
        }
    };

    const fetchCentres = async () => {
        if (!token) return;
        try {
            const response = await axios.get(`${getApiUrl()}/api/admin/erp-centres/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const fetchedData = response.data || [];
            const map = {};
            fetchedData.forEach(c => {
                const code = c.enterCode || c.centreName || c.name;
                const name = c.centreName || c.name || 'Unknown Center';
                if (code) map[code] = name;
            });
            setCentreMap(map);
        } catch (error) {
            console.error("Failed to fetch centres", error);
        }
    };

    const fetchResponses = async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const response = await axios.get(`${getApiUrl()}/api/admin/all-psychometric-profiles/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setResponses(response.data || []);
        } catch (error) {
            console.error('Failed to fetch psychometric profiles:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (email, e) => {
        e.stopPropagation();
        if (!window.confirm(`Are you sure you want to delete the Psychometric Evaluation for ${email}? They will need to take the test again.`)) return;

        try {
            await axios.delete(`${getApiUrl()}/api/admin/student-psychometric-profile/${encodeURIComponent(email)}/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setResponses(prev => prev.filter(r => r.email !== email));
        } catch (error) {
            console.error('Failed to delete psychometric profile:', error);
            alert("Failed to delete the profile. Please try again.");
        }
    };

    const filteredResponses = responses.filter(r => {
        const matchesSearch = (r.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
            (r.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.classification || '').toLowerCase().includes(searchTerm.toLowerCase());
            
        const raw = r.raw_responses || {};
        const matchesCenter = filterCenter ? (raw.basic_center === filterCenter) : true;
        const matchesClass = filterClass ? (raw.basic_class === filterClass) : true;
        const matchesCareer = filterCareer ? ((raw.basic_career || '').toLowerCase().includes(filterCareer.toLowerCase())) : true;
        
        return matchesSearch && matchesCenter && matchesClass && matchesCareer;
    });

    const uniqueClasses = [...new Set(responses.map(r => (r.raw_responses || {}).basic_class).filter(Boolean))].sort((a, b) => a - b);

    const totalPages = Math.ceil(filteredResponses.length / itemsPerPage);
    const paginatedResponses = filteredResponses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleJumpToPage = (e) => {
        e.preventDefault();
        const page = parseInt(jumpPageInput);
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            setJumpPageInput('');
        }
    };

    return (
        <div className="space-y-6">
            <div className={`p-8 rounded-[5px] border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                <div>
                    <h2 className="text-2xl font-black tracking-tight mb-1 flex items-center gap-3">
                        <Brain className="text-purple-500" size={28} />
                        Psychometric <span className="text-purple-500">Responses</span>
                    </h2>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        View and manage student AI-mentorship and psychometric evaluation records.
                    </p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                        <input
                            type="text"
                            placeholder="Search by name, email..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className={`w-full pl-9 pr-4 py-2.5 rounded-[5px] text-sm border focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                        />
                    </div>
                    <button 
                        onClick={fetchResponses}
                        disabled={isLoading}
                        className={`p-2.5 rounded-[5px] border transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                        title="Refresh Data"
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-2.5 rounded-[5px] border transition-colors ${showFilters ? 'bg-purple-500/10 border-purple-500/30 text-purple-600' : isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                    >
                        <Filter size={18} />
                    </button>
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className={`p-6 rounded-[5px] border shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                    <div>
                        <label className={`block text-xs font-bold mb-2 uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Center</label>
                        <select 
                            value={filterCenter}
                            onChange={(e) => { setFilterCenter(e.target.value); setCurrentPage(1); }}
                            className={`w-full px-4 py-2.5 rounded-[5px] text-sm border focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                        >
                            <option value="">All Centers</option>
                            {Object.entries(centreMap).map(([code, name]) => (
                                <option key={code} value={code}>{name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={`block text-xs font-bold mb-2 uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Class</label>
                        <select 
                            value={filterClass}
                            onChange={(e) => { setFilterClass(e.target.value); setCurrentPage(1); }}
                            className={`w-full px-4 py-2.5 rounded-[5px] text-sm border focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                        >
                            <option value="">All Classes</option>
                            {uniqueClasses.map(c => (
                                <option key={c} value={c}>Class {c}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={`block text-xs font-bold mb-2 uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Target Exam (Career)</label>
                        <input 
                            type="text"
                            placeholder="e.g. NEET, JEE..."
                            value={filterCareer}
                            onChange={(e) => { setFilterCareer(e.target.value); setCurrentPage(1); }}
                            className={`w-full px-4 py-2.5 rounded-[5px] text-sm border focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                        />
                    </div>
                </div>
            )}

            <div className={`rounded-[5px] border overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-white border-slate-200'}`}>
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64">
                        <Activity size={32} className="text-purple-500 animate-spin mb-4" />
                        <p className={`text-sm font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Loading Responses...</p>
                    </div>
                ) : filteredResponses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64">
                        <Brain size={48} className={`mb-4 opacity-20 ${isDarkMode ? 'text-white' : 'text-slate-900'}`} />
                        <h3 className="text-lg font-bold mb-1">No responses found</h3>
                        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>No psychometric evaluations match your search.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className={`text-[10px] uppercase font-black tracking-widest ${isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-50 text-slate-500'} border-b ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
                                <tr>
                                    <th className="px-6 py-4 w-12">SL</th>
                                    <th className="px-6 py-4">Student</th>
                                    <th className="px-6 py-4">Classification</th>
                                    <th className="px-6 py-4">Date & Time</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                                {paginatedResponses.map((res, index) => (
                                    <React.Fragment key={res.id}>
                                        <tr 
                                            className={`cursor-pointer transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'} ${expandedRow === res.email ? (isDarkMode ? 'bg-white/5' : 'bg-slate-50') : ''}`}
                                            onClick={() => {
                                                setExpandedRow(expandedRow === res.email ? null : res.email);
                                                setShowQA(false);
                                            }}
                                        >
                                            <td className="px-6 py-4 text-xs font-bold text-slate-400">
                                                {(currentPage - 1) * itemsPerPage + index + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold">{res.name}</div>
                                                <div className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{res.email}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                                                    {res.classification || 'Unknown'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-medium text-slate-500">
                                                {res.created_at ? (
                                                    <div>
                                                        {new Date(res.created_at).toLocaleDateString()}
                                                        <br />
                                                        <span className="text-[10px] opacity-70">
                                                            {new Date(res.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                ) : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    <button 
                                                        onClick={(e) => handleDelete(res.email, e)}
                                                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-2 rounded-[5px] transition-colors"
                                                        title="Delete Response"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                    <div className={`p-1 rounded-[5px] ${isDarkMode ? 'bg-white/10' : 'bg-slate-100'}`}>
                                                        {expandedRow === res.email ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                        
                                        {/* Expanded Row Content */}
                                        {expandedRow === res.email && (
                                            <tr>
                                                <td colSpan={5} className={`px-6 py-6 border-b ${isDarkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                        <div className="md:col-span-2">
                                                            <h4 className={`text-[10px] font-black uppercase tracking-widest mb-2 opacity-50`}>AI Summary</h4>
                                                            <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                                                {res.summary || 'No summary available.'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <h4 className={`text-[10px] font-black uppercase tracking-widest mb-2 opacity-50`}>Key Traits</h4>
                                                            <div className="flex flex-wrap gap-2">
                                                                {Array.isArray(res.traits) && res.traits.length > 0 ? (
                                                                    res.traits.map((trait, i) => (
                                                                        <span key={i} className={`px-2 py-1 rounded-[5px] text-[10px] font-bold uppercase tracking-widest border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                                                                            {trait}
                                                                        </span>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-xs opacity-50">No traits recorded</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Raw Responses Section */}
                                                    {res.raw_responses && Object.keys(res.raw_responses).length > 0 && (
                                                        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/10">
                                                            <div 
                                                                className="flex items-center justify-between cursor-pointer"
                                                                onClick={() => setShowQA(!showQA)}
                                                            >
                                                                <h4 className={`text-[10px] font-black uppercase tracking-widest mb-0 opacity-50`}>Detailed Q&A</h4>
                                                                <div className={`p-1 rounded-[5px] ${isDarkMode ? 'bg-white/10' : 'bg-slate-100'}`}>
                                                                    {showQA ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                                </div>
                                                            </div>
                                                            
                                                            {showQA && (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mt-4">
                                                                    {Object.entries(res.raw_responses).map(([question, answer], index) => {
                                                                        let displayAnswer = Array.isArray(answer) ? answer.join(', ') : answer;
                                                                        if (question === 'basic_center' && centreMap[answer]) {
                                                                            displayAnswer = centreMap[answer];
                                                                        }
                                                                        return (
                                                                            <div key={index} className={`p-4 rounded-[5px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100'}`}>
                                                                                <p className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{questionMap[question] || question}</p>
                                                                                <p className={`text-sm font-bold ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>{displayAnswer}</p>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 0 && (
                        <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/2">
                            <div className="flex items-center gap-4">
                                <span className="text-xs font-bold opacity-50 uppercase tracking-widest">Show</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                                    className={`px-3 py-2 rounded-[5px] border outline-none font-black text-[10px] transition-all cursor-pointer ${isDarkMode
                                        ? 'bg-[#10141d] border-white/10 text-white focus:border-purple-500/50'
                                        : 'bg-white border-slate-200 text-slate-800 focus:border-purple-500/50'
                                        }`}
                                >
                                    {[5, 10, 20, 50].map(val => (
                                        <option key={val} value={val}>{val} Rows</option>
                                    ))}
                                </select>
                                <span className="text-xs font-bold opacity-50 uppercase tracking-widest">per page</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    className={`px-4 py-2 rounded-[5px] font-bold text-xs transition-all active:scale-95 disabled:opacity-30 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 border border-white/10' : 'bg-slate-100 hover:bg-slate-200 border border-slate-200'}`}
                                >
                                    Prev
                                </button>
                                <div className="flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-[5px] gap-1">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-8 h-8 rounded-[5px] font-black text-[10px] transition-all ${currentPage === page
                                                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/40'
                                                : 'hover:bg-white/10 opacity-50 hover:opacity-100'
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    className={`px-4 py-2 rounded-[5px] font-bold text-xs transition-all active:scale-95 disabled:opacity-30 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 border border-white/10' : 'bg-slate-100 hover:bg-slate-200 border border-slate-200'}`}
                                >
                                    Next
                                </button>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold opacity-50 uppercase tracking-widest">Jump to</span>
                                <form onSubmit={handleJumpToPage} className="relative">
                                    <input
                                        type="number"
                                        value={jumpPageInput}
                                        onChange={(e) => setJumpPageInput(e.target.value)}
                                        placeholder="Page #"
                                        className={`w-20 px-3 py-2 rounded-[5px] border outline-none font-black text-[10px] transition-all text-center ${isDarkMode
                                            ? 'bg-[#10141d] border-white/10 text-white focus:border-purple-500/50'
                                            : 'bg-white border-slate-200 text-slate-800 focus:border-purple-500/50'
                                            }`}
                                    />
                                </form>
                            </div>
                        </div>
                    )}
                    </>
                )}
            </div>
        </div>
    );
};

export default PsychometricResponses;
