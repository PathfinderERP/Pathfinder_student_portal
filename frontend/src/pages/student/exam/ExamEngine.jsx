import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { 
    Loader2, 
    User, 
    ChevronLeft, 
    ChevronRight, 
    Maximize2 
} from 'lucide-react';

const ExamEngine = () => {
    const { id: testId } = useParams();
    const navigate = useNavigate();
    const { getApiUrl, token, user } = useAuth();
    const { isDarkMode } = useTheme();
    const containerRef = useRef(null);

    // Removed auto-fullscreen to prevent 'user gesture' errors
    // Browsers block automatic fullscreen requests that aren't triggered by a click.

    // State
    const [paperData, setPaperData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeSectionIdx, setActiveSectionIdx] = useState(0);
    const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [responses, setResponses] = useState({}); // { questionId: { option, status } }
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [studentData, setStudentData] = useState(null);
    const [canSubmit, setCanSubmit] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [reportData, setReportData] = useState([]);
    const [showViolation, setShowViolation] = useState(false);
    const [violationMessage, setViolationMessage] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '' });

    const triggerToast = (msg) => {
        setToast({ show: true, message: msg });
        setTimeout(() => setToast({ show: false, message: '' }), 3000);
    };

    // Fetch Paper
    useEffect(() => {
        const fetchPaper = async () => {
            try {
                const response = await axios.get(`${getApiUrl()}/api/tests/${testId}/question_paper/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setPaperData(response.data);
                setTimeLeft(parseInt(response.data.duration || 180) * 60);

                // Also fetch ERP data for student details
                try {
                    const erpResponse = await axios.get(`${getApiUrl()}/api/student/erp-data/`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    setStudentData(erpResponse.data);
                } catch (erpErr) {
                    console.error('Error fetching ERP data:', erpErr);
                }
            } catch (err) {
                console.error('Error fetching paper:', err);
                navigate('/student/dashboard');
            } finally {
                setIsLoading(false);
            }
        };
        fetchPaper();
    }, [testId, token, getApiUrl, navigate]);

    // Timer
    useEffect(() => {
        if (timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    // Derived Data (Safe check because hooks are above returns)
    const currentSection = paperData?.sections?.[activeSectionIdx];
    const currentQuestion = currentSection?.questions_detail?.[activeQuestionIdx];

    // Define all functions first (they are stable)
    const updateStatus = useCallback((status, option = null) => {
        if (!currentQuestion) return;
        const qId = currentQuestion.id || `${activeSectionIdx}-${activeQuestionIdx}`;
        setResponses(prev => ({
            ...prev,
            [qId]: { 
                status, 
                selectedOption: option || prev[qId]?.selectedOption || null 
            }
        }));
    }, [currentQuestion, activeSectionIdx, activeQuestionIdx]);

    const handleNext = useCallback(() => {
        if (!paperData) return;
        if (activeQuestionIdx < currentSection.questions_detail.length - 1) {
            setActiveQuestionIdx(prev => prev + 1);
        } else if (activeSectionIdx < paperData.sections.length - 1) {
            setActiveSectionIdx(prev => prev + 1);
            setActiveQuestionIdx(0);
        }
    }, [activeQuestionIdx, activeSectionIdx, paperData, currentSection]);

    const handleBack = useCallback(() => {
        if (!paperData) return;
        if (activeQuestionIdx > 0) {
            setActiveQuestionIdx(prev => prev - 1);
        } else if (activeSectionIdx > 0) {
            const prevSectionIdx = activeSectionIdx - 1;
            const prevSection = paperData.sections[prevSectionIdx];
            setActiveSectionIdx(prevSectionIdx);
            setActiveQuestionIdx(prevSection.questions_detail.length - 1);
        }
    }, [activeQuestionIdx, activeSectionIdx, paperData]);

    const handleSaveAndNext = () => {
        const qId = currentQuestion.id || `${activeSectionIdx}-${activeQuestionIdx}`;
        const currentResp = responses[qId];
        
        if (!currentResp?.selectedOption) {
            triggerToast('Please select an option to save your answer.');
            return;
        }

        updateStatus('ANSWERED', currentResp?.selectedOption);
        handleNext();
    };

    const handleMarkForReview = () => {
        const qId = currentQuestion.id || `${activeSectionIdx}-${activeQuestionIdx}`;
        const currentResp = responses[qId];
        
        // In real portals, if option is selected, status is 'MARKED_ANSWERED'
        // If no option, status is just 'MARKED'
        const newStatus = currentResp?.selectedOption ? 'MARKED_ANSWERED' : 'MARKED';
        updateStatus(newStatus, currentResp?.selectedOption);
        handleNext();
    };

    useEffect(() => {
        if (document.fullscreenElement) {
            setIsFullscreen(true);
        }
    }, [isLoading]);

    const enterFullscreen = () => {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) { /* Safari */
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) { /* IE11 */
            elem.msRequestFullscreen();
        }
    };

    // Strict Integrity Enforcement
    useEffect(() => {
        // Detect Fullscreen Exit
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                setIsFullscreen(false);
                setShowViolation(true);
                setViolationMessage("Security Alert: Exiting Full Screen is prohibited. Your activity has been logged. Please return to Full Screen immediately to continue.");
            } else {
                setIsFullscreen(true);
                setShowViolation(false);
            }
        };

        // Detect Tab/Window Switch
        const handleVisibilityChange = () => {
            if (document.hidden) {
                setShowViolation(true);
                setViolationMessage("Security Alert: Tab switching is strictly prohibited. Your activity has been logged. Further attempts will result in immediate disqualification.");
            }
        };

        // Disable Escape and common shortcuts
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                // Browsers usually exit fullscreen before this, but we handle the change above
            }
            
            if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'))) {
                e.preventDefault();
                setShowViolation(true);
                setViolationMessage("Security Alert: Developer tools access is prohibited.");
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('contextmenu', (e) => e.preventDefault());

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('contextmenu', (e) => e.preventDefault());
        };
    }, []);

    const handleClear = () => {
        const qId = currentQuestion.id || `${activeSectionIdx}-${activeQuestionIdx}`;
        setResponses(prev => {
            const newRes = { ...prev };
            delete newRes[qId];
            return newRes;
        });
    };

    const handleSubmit = () => {
        if (!paperData) return;

        // Calculate Stats
        const summary = paperData.sections.map(section => {
            let attempted = 0;
            section.questions_detail.forEach(q => {
                const qId = q.id;
                const resp = responses[qId];
                if (resp?.status === 'ANSWERED' || resp?.status === 'MARKED_ANSWERED') {
                    attempted++;
                }
            });
            return {
                name: section.name,
                attempted: attempted,
                total: section.questions_detail.length,
                unattempted: section.questions_detail.length - attempted
            };
        });

        setReportData(summary);
        setIsSubmitted(true);
    };

    // Auto-mark as visited when viewing
    useEffect(() => {
        if (!paperData || isLoading || !currentQuestion) return;
        const qId = currentQuestion.id || `${activeSectionIdx}-${activeQuestionIdx}`;
        if (!responses[qId]) {
            updateStatus('VISITED');
        }
    }, [activeQuestionIdx, activeSectionIdx, paperData, isLoading, currentQuestion, responses, updateStatus]);

    // NOW handle conditional returns
    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        </div>
    );

    if (!paperData || !currentQuestion) return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 gap-4">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-gray-500 font-bold animate-pulse text-xs tracking-widest uppercase">Initializing Exam Environment...</p>
        </div>
    );


    if (isSubmitted) {
        const totalAttempted = reportData.reduce((acc, curr) => acc + curr.attempted, 0);
        const totalQuestions = reportData.reduce((acc, curr) => acc + curr.total, 0);
        const totalUnattempted = reportData.reduce((acc, curr) => acc + curr.unattempted, 0);

        return (
            <div className="min-h-screen w-full bg-[#f8fafc] flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-500">
                {/* VIOLATION OVERLAY - Fixed to the top of everything */}
                {showViolation && (
                    <div className="fixed inset-0 bg-red-600/95 backdrop-blur-[10px] z-[99999] flex items-center justify-center p-8 animate-in fade-in duration-300">
                        <div className="max-w-2xl bg-white p-12 rounded-2xl shadow-[0_30px_100px_rgba(220,38,38,0.5)] text-center border-4 border-red-500">
                            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
                                <span className="text-red-600 text-6xl font-black italic">!</span>
                            </div>
                            <h2 className="text-red-700 text-4xl font-black uppercase mb-4 tracking-tighter">VIOLATION DETECTED</h2>
                            <p className="text-gray-800 text-lg font-bold mb-10 leading-relaxed italic border-y py-6 border-red-100">
                                {violationMessage}
                                <br/><br/>
                                <span className="text-red-600 underline">WARNING:</span> THIS INCIDENT HAS BEEN REPORTED TO THE ADMINISTRATOR. YOUR EXAM MAY BE TERMINATED IMMEDIATELY.
                            </p>
                            <div className="flex flex-col gap-4">
                                <button 
                                    onClick={() => {
                                        setShowViolation(false);
                                        enterFullscreen();
                                    }}
                                    className="px-10 py-4 bg-red-600 text-white font-black rounded-lg uppercase tracking-widest hover:bg-black transition-all shadow-xl"
                                >
                                    Re-Enter Full Screen & Resume
                                </button>
                                <button 
                                    onClick={() => {
                                        if (document.exitFullscreen) document.exitFullscreen();
                                        navigate('/student/dashboard');
                                    }}
                                    className="text-gray-500 hover:text-red-700 font-bold transition-colors"
                                >
                                    Quit and Return to Dashboard
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <div className="w-full max-w-4xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.05)] rounded-xl border border-gray-100 overflow-hidden">
                    <div className="bg-[#0D47A1] p-8 text-center relative overflow-hidden">
                        {/* Decorative background elements */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-400/10 rounded-full -ml-16 -mb-16 blur-2xl"></div>
                        
                        <h1 className="text-white text-3xl font-black uppercase tracking-tight relative z-10">Submission Report</h1>
                        <p className="text-blue-100 text-sm mt-2 font-medium opacity-80 tracking-wide uppercase">Your exam has been successfully recorded</p>
                    </div>

                    <div className="p-10">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b-2 border-gray-100">
                                        <th className="pb-4 pt-2 text-[12px] font-black text-gray-400 uppercase tracking-wider">Section</th>
                                        <th className="pb-4 pt-2 text-[12px] font-black text-gray-400 uppercase tracking-wider text-center">Attempted</th>
                                        <th className="pb-4 pt-2 text-[12px] font-black text-gray-400 uppercase tracking-wider text-center">Unattempted</th>
                                        <th className="pb-4 pt-2 text-[12px] font-black text-gray-400 uppercase tracking-wider text-center">Total Questions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {reportData.map((row, i) => (
                                        <tr key={i} className="group hover:bg-gray-50/50 transition-colors">
                                            <td className="py-4 text-[13px] font-bold text-gray-700 uppercase tracking-tight">{row.name}</td>
                                            <td className="py-4 text-center">
                                                <span className="inline-flex items-center px-3 py-1 bg-green-50 text-green-700 text-[13px] font-black rounded-md border border-green-100 italic">
                                                    {row.attempted}
                                                </span>
                                            </td>
                                            <td className="py-4 text-center">
                                                <span className="inline-flex items-center px-3 py-1 bg-orange-50 text-orange-700 text-[13px] font-black rounded-md border border-orange-100 italic">
                                                    {row.unattempted}
                                                </span>
                                            </td>
                                            <td className="py-4 text-center text-[13px] font-bold text-gray-500">{row.total}</td>
                                        </tr>
                                    ))}
                                    {/* Total Row */}
                                    <tr className="bg-gray-50/80 border-t-2 border-gray-100">
                                        <td className="py-4 text-[14px] font-black text-gray-900 uppercase">Grand Total</td>
                                        <td className="py-4 text-center">
                                            <span className="text-[16px] font-black text-green-600">{totalAttempted}</span>
                                        </td>
                                        <td className="py-4 text-center">
                                            <span className="text-[16px] font-black text-orange-600">{totalUnattempted}</span>
                                        </td>
                                        <td className="py-4 text-center text-[16px] font-black text-gray-900">{totalQuestions}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-12 flex justify-center">
                            <button 
                                onClick={() => navigate('/student/dashboard')}
                                className="group relative px-10 py-4 bg-[#0D47A1] text-white font-black text-sm uppercase tracking-widest rounded-lg shadow-[0_10px_30px_rgba(13,71,161,0.2)] hover:shadow-[0_15px_40px_rgba(13,71,161,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all overflow-hidden"
                            >
                                <span className="relative z-10 flex items-center gap-3 italic">
                                    All Good <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </button>
                        </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                            Official Exam Portal Submission Receipt • ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Correct extraction from ERP Data
    const studentInfo = studentData?.student?.studentsDetails?.[0] || {};
    const admissionNo = studentData?.admissionNumber || user?.enrollment_id || user?.id || 'ID_PENDING';
    const studentName = studentInfo.studentName || user?.full_name || user?.username || 'STUDENT';
    const studentEmail = studentInfo.studentEmail || user?.email || user?.username || 'N/A';

    return (
        <div className="flex flex-col h-screen bg-white font-sans overflow-hidden select-none">
            {/* Header - Row Based Styled Timer Area */}
            <div className="bg-[#EF6C00] text-white px-6 py-2 flex justify-between items-center shadow-md z-10 min-h-[60px]">
                <h1 className="text-xl font-black truncate uppercase tracking-tight antialiased">
                    {paperData.test_name}
                </h1>

                <div className="bg-white px-8 py-2 shadow-lg flex items-center justify-center">
                    <div className={`text-[#EF6C00] font-black text-xl tracking-tight transition-opacity
                        ${timeLeft < 300 && (timeLeft % 2 === 0) ? 'opacity-50' : 'opacity-100'}`}>
                        Time Left: {formatTime(timeLeft)}
                    </div>
                </div>
            </div>

            {/* Sections Bar */}
            <div className="bg-[#EF6C00] px-4 py-3 flex flex-wrap gap-2 border-t border-white/10 z-10">
                <span className="text-white font-bold text-sm mr-2 self-center">Sections</span>
                {paperData.sections.map((section, idx) => (
                    <button
                        key={idx}
                        onClick={() => { setActiveSectionIdx(idx); setActiveQuestionIdx(0); }}
                        className={`px-4 py-1.5 text-xs font-bold rounded-[2px] transition-all uppercase
                        ${activeSectionIdx === idx 
                            ? 'bg-[#1565C0] text-white shadow-lg border-b-2 border-white' 
                            : 'bg-[#1976D2] text-white hover:bg-[#1565C0] border border-blue-400/30'}`}
                    >
                        {section.name} (0/{section.questions_detail.length})
                    </button>
                ))}
            </div>

            {/* Main Layout */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Side - Question Content */}
                <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden bg-white border-r border-gray-200 relative">
                    <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center text-xs font-bold text-gray-600">
                        <span>Question Type : {currentQuestion.question_type || 'MCQ'}</span>
                        <div className="flex gap-4">
                            <span className="text-green-600">Maximum Mark : {currentSection.correct_marks}</span>
                            <span className="text-[#EF6C00]">Negative Mark : {currentSection.negative_marks}</span>
                        </div>
                    </div>

                    <div className="flex-1 p-8 relative overflow-x-hidden">
                        {/* Watermark - Clipped Container */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] opacity-[0.035] select-none flex flex-wrap gap-x-12 gap-y-10 items-center justify-center rotate-[-35deg]">
                                {Array(400).fill(`${studentName} - ${admissionNo}`).map((text, i) => (
                                    <span key={i} className="text-[12px] font-black text-gray-900 whitespace-nowrap uppercase tracking-[0.1em]">
                                        {text}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-start gap-4 mb-8 relative z-10">
                            <span className="font-bold text-gray-800 shrink-0">Question No: {activeQuestionIdx + 1}</span>
                            <div className="prose max-w-none w-full">
                                
                                {currentQuestion.content && (
                                    <div dangerouslySetInnerHTML={{ __html: currentQuestion.content }} />
                                )}
                                
                                {currentQuestion.question_img && (
                                    <div className="my-6">
                                        <img src={currentQuestion.question_img} alt="Question" className="max-w-full h-auto border p-2 bg-white shadow-sm" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Options */}
                        <div className="space-y-4 ml-12 relative z-10">
                            {['A', 'B', 'C', 'D'].map((opt) => {
                                const qId = currentQuestion.id || `${activeSectionIdx}-${activeQuestionIdx}`;
                                const isSelected = responses[qId]?.selectedOption === opt;
                                
                                return (
                                    <label key={opt} className={`flex items-center gap-4 p-3 border rounded-md cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-blue-50/50 border-gray-100 bg-white/10'}`}>
                                        <input 
                                            type="radio" 
                                            name={`q-${activeSectionIdx}-${activeQuestionIdx}`}
                                            checked={isSelected}
                                            onChange={() => updateStatus(responses[qId]?.status || 'VISITED', opt)}
                                            className="w-4 h-4 accent-blue-600" 
                                        />
                                        <span className="text-sm">({opt}) Option content follows here...</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* Bottom Action Bar - Multi-row Layout per Requirement */}
                    <div className="p-4 bg-white border-t border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
                        {/* Row 1: Main Actions */}
                        <div className="flex gap-3 mb-4">
                            <button 
                                onClick={handleClear}
                                className="px-5 py-2.5 border-2 bg-white border-blue-400 text-blue-600 font-black text-[12px] rounded-[4px] uppercase hover:bg-blue-50 transition-all shadow-sm"
                            >
                                Clear
                            </button>
                            <button 
                                onClick={handleMarkForReview}
                                className="px-6 py-2.5 bg-[#0D47A1] text-white font-black text-[12px] rounded-[4px] uppercase hover:bg-blue-900 shadow-md transition-all"
                            >
                                Mark for Review & Next
                            </button>
                            <button 
                                onClick={handleSaveAndNext}
                                className="px-8 py-2.5 bg-[#2E7D32] text-white font-black text-[12px] rounded-[4px] uppercase hover:bg-green-800 shadow-md transition-all"
                            >
                                Save & Next
                            </button>
                        </div>

                        {/* Row 2: Navigation - Under Actions */}
                        <div className="flex justify-start gap-3">
                            <button 
                                onClick={handleBack}
                                className="px-8 py-2.5 bg-white border-2 border-gray-300 text-gray-700 font-black text-[12px] rounded-[4px] uppercase hover:bg-gray-50 transition-all active:scale-95"
                            >
                                &lt;&lt; Back
                            </button>
                            <button 
                                onClick={handleNext}
                                className="px-8 py-2.5 bg-white border-2 border-gray-300 text-gray-700 font-black text-[12px] rounded-[4px] uppercase hover:bg-gray-50 transition-all active:scale-95"
                            >
                                Next &gt;&gt;
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Side - Sidebar (Increased Width) */}
                <div className="w-[380px] flex flex-col bg-white border-l border-gray-200">
                    {/* User Profile */}
                    <div className="p-4 flex gap-4 bg-gray-50/80 border-b border-gray-100">
                        <div className="w-20 h-20 bg-white border-2 border-gray-200 rounded-sm flex items-center justify-center shrink-0">
                            <User className="w-12 h-12 text-gray-300" />
                        </div>
                        <div className="flex flex-col justify-center overflow-hidden gap-1">
                            <p className="text-[12px] text-gray-900 uppercase font-black truncate leading-tight">Name : {studentName}</p>
                            <p className="text-[12px] text-gray-900 uppercase font-black truncate leading-tight">Enrollment Id : {admissionNo}</p>
                            <p className="text-[12px] text-gray-900 uppercase font-black truncate leading-tight italic opacity-70">Email : {studentEmail}</p>
                        </div>
                    </div>

                    {/* Question Palette */}
                    <div className="flex-1 p-5 bg-blue-50/30 overflow-y-auto">
                        <div className="grid grid-cols-6 gap-y-5 gap-x-3">
                            {currentSection.questions_detail.map((q, idx) => {
                                const qId = q.id || `${activeSectionIdx}-${idx}`;
                                const resp = responses[qId];
                                const status = resp?.status || 'NOT_VISITED';
                                const isActive = activeQuestionIdx === idx;
                                
                                const isAnswered = status === 'ANSWERED';
                                const isMarked = status === 'MARKED';
                                const isMarkedAnswered = status === 'MARKED_ANSWERED';
                                const isNotAnswered = status === 'VISITED';

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveQuestionIdx(idx)}
                                        className={`relative w-[38px] h-[34px] flex items-center justify-center text-[13px] font-bold transition-all
                                        ${isActive ? 'scale-110 ring-2 ring-blue-400 ring-offset-1 z-10' : ''}`}
                                    >
                                        {/* Background Shapes */}
                                        {isAnswered ? (
                                            // Answered: Cut bottom-left
                                            <div className="absolute inset-0 bg-[#2E7D32]" style={{clipPath: 'polygon(0 0, 100% 0, 100% 100%, 25% 100%, 0 75%)'}}></div>
                                        ) : (isMarked || isMarkedAnswered) ? (
                                            // Marked: Full Circle
                                            <div className="absolute inset-0 bg-[#4B2B90] rounded-full flex items-center justify-center">
                                                {isMarkedAnswered && (
                                                    <div className="absolute bottom-1 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm translate-x-[2px] translate-y-[2px]"></div>
                                                )}
                                            </div>
                                        ) : isNotAnswered ? (
                                            // Not Answered: Cut bottom-right
                                            <div className="absolute inset-0 bg-[#EF6C00]" style={{clipPath: 'polygon(0 0, 100% 0, 100% 75%, 75% 100%, 0 100%)'}}></div>
                                        ) : (
                                            // Not Visited: Standard Gray
                                            <div className="absolute inset-0 bg-[#EEEEEE] border border-gray-300 rounded-[4px]"></div>
                                        )}
                                        
                                        {/* Question Number - High Visibility Fix */}
                                        <span className={`relative z-[10] font-black text-[13px] drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)] antialiased
                                            ${(isAnswered || isMarked || isMarkedAnswered || isNotAnswered) ? 'text-white' : 'text-gray-900'}`}
                                        >
                                            {idx + 1}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Submit Section */}
                    <div className="p-4 bg-gray-100/50 border-t border-gray-200">
                        <div className="flex items-center gap-3 mb-4">
                            <input 
                                type="checkbox" 
                                id="submit_lock" 
                                checked={canSubmit}
                                onChange={(e) => setCanSubmit(e.target.checked)}
                                className="w-4 h-4 cursor-pointer accent-blue-600" 
                            />
                            <label htmlFor="submit_lock" className="text-[11px] font-bold text-gray-700 cursor-pointer select-none">I want to submit.</label>
                        </div>
                        <button 
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            className={`w-full py-2 font-black text-[11px] uppercase rounded-[3px] transition-all
                            ${canSubmit 
                                ? 'bg-blue-600 text-white cursor-pointer hover:bg-blue-700 shadow-lg' 
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                        >
                            Submit
                        </button>
                    </div>
                </div>
            </div>

            {/* Custom Toast - Professional Real-Time UI */}
            {toast.show && (
                <div className="fixed top-32 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className="bg-[#FF9100] text-white px-8 py-3 rounded-[4px] flex items-center gap-4 shadow-[0_10px_40px_rgba(255,145,0,0.3)] border border-white/20">
                        <div className="bg-white/20 p-1.5 rounded-full">
                            <div className="w-2.5 h-2.5 bg-white rounded-full animate-ping"></div>
                        </div>
                        <span className="text-[13px] font-black uppercase tracking-tight antialiased">
                            {toast.message}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamEngine;
