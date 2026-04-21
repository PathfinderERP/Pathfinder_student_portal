import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { 
    Loader2, 
    User, 
    ChevronLeft, 
    ChevronRight, 
    Maximize2,
    AlertCircle,
    Sun,
    Moon,
    Lock
} from 'lucide-react';

const ExamEngine = () => {
    const { id: testId } = useParams();
    const navigate = useNavigate();
    const { getApiUrl, token, user } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
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
    const [violationTimer, setViolationTimer] = useState(5);
    const [submissionType, setSubmissionType] = useState('MANUAL'); // 'MANUAL', 'TIME_UP', 'VIOLATION'
    const [questionTimes, setQuestionTimes] = useState({}); // { qId: seconds }
    const [lastViewedPerSection, setLastViewedPerSection] = useState({});

    const triggerToast = (msg) => {
        setToast({ show: true, message: msg });
        setTimeout(() => setToast({ show: false, message: '' }), 3000);
    };

    const [isLocked, setIsLocked] = useState(false);
    const [lockReason, setLockReason] = useState('');
    const [isStabilizing, setIsStabilizing] = useState(true);
    const [error, setError] = useState(null);
    const [showResumeModal, setShowResumeModal] = useState(false);
    const isSubmittedRef = useRef(false);

    const handleReturnToDashboard = () => {
        try {
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
            }
        } catch (err) {}
        navigate('/student');
    };

    // Initial stabilization period to prevent false violations during load/transition
    useEffect(() => {
        const timer = setTimeout(() => setIsStabilizing(false), 3000);
        return () => clearTimeout(timer);
    }, []);

    // Prepare responses for backend (Map to {questionId: {answer: ...}})
    // Local: {qId: {status, selectedOption}}
    const getBackendResponses = useCallback(() => {
        const backendResponses = {};
        Object.entries(responses).forEach(([qId, data]) => {
            if (data.selectedOption || data.status) {
                backendResponses[qId] = { 
                    answer: data.selectedOption,
                    status: data.status,
                    time: questionTimes[qId] || 0
                };
            }
        });
        return backendResponses;
    }, [responses]);

    const handleSaveProgress = useCallback(async (isFinal = false) => {
        if (isSubmitted || isLocked || !paperData) return;
        try {
            await axios.post(`${getApiUrl()}/api/tests/${testId}/save_progress/`, {
                responses: getBackendResponses(),
                time_spent: parseInt(paperData.duration * 60) - timeLeft
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log("Progress auto-saved...");
        } catch (err) {
            console.error("Save failed:", err);
        }
    }, [testId, token, getApiUrl, responses, timeLeft, paperData, isSubmitted, isLocked, getBackendResponses]);

    // Fetch Paper & Session Status
    useEffect(() => {
        const fetchAll = async () => {
            try {
                // 1. Check Status
                const statusResp = await axios.get(`${getApiUrl()}/api/tests/${testId}/status/?_t=${Date.now()}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const sData = statusResp.data;

                if (sData.is_finalized && !sData.allow_resume) {
                    setIsSubmitted(true);
                    setIsLoading(false);
                    return;
                }

                if (sData.status === 'interrupted' && !sData.allow_resume) {
                    setIsLocked(true);
                    setLockReason("SESSION INTERRUPTED. Your previous session was terminated unexpectedly. In accordance with security protocols, your account is now locked. Please contact the administrator to authorize a resume.");
                    setIsLoading(false);
                    return;
                }

                // 2. Fetch Paper
                const response = await axios.get(`${getApiUrl()}/api/tests/${testId}/question_paper/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setPaperData(response.data);
                
                // Restore time or set default
                if (sData.time_spent > 0) {
                    setTimeLeft(Math.max(1, (parseInt(response.data.duration || 180) * 60) - sData.time_spent));
                    setShowResumeModal(true);
                } else {
                    setTimeLeft(parseInt(response.data.duration || 180) * 60);
                }

                // Restore responses
                if (sData.responses) {
                    const localResps = {};
                    Object.entries(sData.responses).forEach(([qId, data]) => {
                        localResps[qId] = {
                            status: data.status || (data.answer ? 'ANSWERED' : 'VISITED'),
                            selectedOption: data.answer || null
                        };
                    });
                    setResponses(localResps);
                }

                // 3. EPR Data
                try {
                    const erpResponse = await axios.get(`${getApiUrl()}/api/student/erp-data/?_t=${Date.now()}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    setStudentData(erpResponse.data);
                } catch (erpErr) {}

            } catch (err) {
                console.error('Initialization error:', err);
                
                let errorTitle = "Initialization Error";
                let detailedMsg = "Failed to initialize exam environment.";

                if (err.response) {
                    // Server responded with an error
                    const status = err.response.status;
                    const errorData = err.response.data;
                    
                    if (status === 403) {
                        errorTitle = "Access Denied";
                        detailedMsg = errorData?.error || errorData?.detail || "You are not authorized for this test. Please check your allotment.";
                    } else if (status === 404) {
                        errorTitle = "Test Not Found";
                        detailedMsg = "The requested test paper or session could not be located. It may have been un-allotted or deleted.";
                    } else if (status >= 500) {
                        errorTitle = "Server Error (500)";
                        detailedMsg = "The server encountered an error while building your test environment. This is often caused by a database configuration issue. Error: " + (errorData?.detail || "Internal Server Overload");
                    } else {
                        detailedMsg = `Error ${status}: ${errorData?.detail || "An unexpected error occurred during setup."}`;
                    }
                } else if (err.request) {
                    // Request was made but no response received
                    detailedMsg = "Network Timeout: Could not connect to the exam server. Please check your internet connection.";
                } else {
                    detailedMsg = err.message;
                }

                setError({ title: errorTitle, message: detailedMsg });
            } finally {
                setIsLoading(false);
                // Trigger an initial "Handshake" save to consume the allow_resume token
                // and mark this browser session as active.
                setTimeout(() => {
                    handleSaveProgress();
                }, 1000);
            }
        };
        fetchAll();
    }, [testId, token, getApiUrl, navigate]);

    // Fast Auto-Save Loop
    useEffect(() => {
        if (isSubmitted || isLocked || !paperData) return;
        const interval = setInterval(() => {
            handleSaveProgress();
        }, 60000); // Every 60 seconds
        return () => clearInterval(interval);
    }, [handleSaveProgress, isSubmitted, isLocked, paperData]);

    // Timer
    useEffect(() => {
        if (timeLeft <= 0) {
            if (!isSubmitted && paperData) {
                handleSubmit('TIME_UP');
            }
            return;
        }
        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft, isSubmitted, paperData]);

    const formatTime = useCallback((seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return h > 0 
            ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
            : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }, []);

    // Derived Data
    const currentSection = useMemo(() => paperData?.sections?.[activeSectionIdx], [paperData, activeSectionIdx]);
    const currentQuestion = useMemo(() => currentSection?.questions_detail?.[activeQuestionIdx], [currentSection, activeQuestionIdx]);

    // Auto-Seek to first section with questions if the current one is empty
    useEffect(() => {
        if (paperData?.sections && !currentQuestion) {
            const firstValid = paperData.sections.findIndex(s => s.questions_detail?.length > 0);
            if (firstValid > -1 && firstValid !== activeSectionIdx) {
                setActiveSectionIdx(firstValid);
                setActiveQuestionIdx(0);
            }
        }
    }, [paperData, activeSectionIdx, currentQuestion]);

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
        if (!paperData || !currentSection) return;
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

    const handleSaveAndNext = useCallback(() => {
        if (!currentQuestion) return;
        const qId = currentQuestion.id || `${activeSectionIdx}-${activeQuestionIdx}`;
        const currentResp = responses[qId];
        
        if (!currentResp?.selectedOption) {
            triggerToast('Please select an option to save your answer.');
            return;
        }

        updateStatus('ANSWERED', currentResp?.selectedOption);
        handleNext();
    }, [currentQuestion, activeSectionIdx, activeQuestionIdx, responses, updateStatus, handleNext]);

    const handleMarkForReview = useCallback(() => {
        if (!currentQuestion) return;
        const qId = currentQuestion.id || `${activeSectionIdx}-${activeQuestionIdx}`;
        const currentResp = responses[qId];
        
        const newStatus = currentResp?.selectedOption ? 'MARKED_ANSWERED' : 'MARKED';
        updateStatus(newStatus, currentResp?.selectedOption);
        handleNext();
    }, [currentQuestion, activeSectionIdx, activeQuestionIdx, responses, updateStatus, handleNext]);

    const enterFullscreen = useCallback(() => {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => {
                console.error("Error entering fullscreen:", err);
                triggerToast("Please allow Full Screen to continue.");
            });
        } else if (elem.webkitRequestFullscreen) { /* Safari */
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) { /* IE11 */
            elem.msRequestFullscreen();
        }
    }, []);

    const exitFullscreen = useCallback(() => {
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(err => console.error("Error exiting fullscreen:", err));
        } else if (document.webkitExitFullscreen) { /* Safari */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE11 */
            document.msExitFullscreen();
        }
    }, []);

    const handleClear = useCallback(() => {
        if (!currentQuestion) return;
        const qId = currentQuestion.id || `${activeSectionIdx}-${activeQuestionIdx}`;
        setResponses(prev => {
            const newRes = { ...prev };
            delete newRes[qId];
            return newRes;
        });
    }, [currentQuestion, activeSectionIdx, activeQuestionIdx]);

    const handleSubmit = useCallback(async (type = 'MANUAL') => {
        if (!paperData || isSubmitting) return;
        setIsSubmitting(true);
        setSubmissionType(type);

        const totalDurationSeconds = parseInt(paperData.duration || 180) * 60;
        const timeSpent = totalDurationSeconds - timeLeft;

        const backendResponses = getBackendResponses();

        try {
            const apiUrl = getApiUrl();
            await axios.post(`${apiUrl}/api/tests/${testId}/submit/`, {
                responses: backendResponses,
                submission_type: type,
                time_spent: timeSpent
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

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
            exitFullscreen();
        } catch (err) {
            console.error('Error submitting exam:', err);
            triggerToast('Connection error. Retrying submission...');
        } finally {
            setIsSubmitting(false);
        }
    }, [paperData, isSubmitting, timeLeft, getBackendResponses, getApiUrl, testId, token, responses, exitFullscreen]);

    // Use a ref to track submission status for event listeners
    useEffect(() => {
        isSubmittedRef.current = isSubmitted;
    }, [isSubmitted]);

    // Handlers (Moved outside useEffect for stability)
    const handleFullscreenChange = useCallback(() => {
        if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
            setIsFullscreen(false);
            if (navigator.keyboard && navigator.keyboard.unlock) {
                navigator.keyboard.unlock();
            }
            if (!isSubmittedRef.current && !isStabilizing) {
                setShowViolation(true);
                setViolationMessage("Security Alert: Exiting Full Screen is prohibited. Your activity has been logged. Please return to Full Screen immediately to resume.");
            }
        } else {
            setIsFullscreen(true);
            setShowViolation(false);
            if (navigator.keyboard && navigator.keyboard.lock) {
                navigator.keyboard.lock(['Escape']).catch(() => {});
            }
        }
    }, [isStabilizing]);

    const handleVisibilityChange = useCallback(() => {
        if (document.hidden && !isSubmittedRef.current && !isStabilizing) {
            setShowViolation(true);
            setViolationMessage("Security Alert: Tab switching is strictly prohibited. Your activity has been logged. Further attempts will result in immediate disqualification.");
        }
    }, [isStabilizing]);

    const handleBlur = useCallback(() => {
        if (!document.hasFocus() && !isSubmittedRef.current && !isStabilizing) {
            setShowViolation(true);
            setViolationMessage("Security Alert: System focus lost. Alt+Tab, Window switching or Tab switching is strictly prohibited. Your activity has been logged.");
        }
    }, [isStabilizing]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape' && !isSubmittedRef.current) {
            e.preventDefault();
            setShowViolation(true);
            setViolationMessage("Security Alert: Use of the Escape key to exit Full Screen is strictly prohibited. Your activity has been logged.");
        }
        
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'))) {
            e.preventDefault();
            setShowViolation(true);
            setViolationMessage("Security Alert: Developer tools access is prohibited.");
        }
    }, [isStabilizing]);
    
    // Strict Integrity Enforcement
    useEffect(() => {
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('keydown', handleKeyDown);
        const handleContext = (e) => e.preventDefault();
        window.addEventListener('contextmenu', handleContext);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('contextmenu', handleContext);
        };
    }, [handleFullscreenChange, handleVisibilityChange, handleBlur, handleKeyDown]);

    // Auto-mark as visited when viewing
    useEffect(() => {
        if (!paperData || isLoading || !currentQuestion) return;
        const qId = currentQuestion.id || `${activeSectionIdx}-${activeQuestionIdx}`;
        if (!responses[qId]) {
            updateStatus('VISITED');
        }
    }, [activeQuestionIdx, activeSectionIdx, paperData, isLoading, currentQuestion, responses, updateStatus]);

    // Violation Auto-Submit Timer
    useEffect(() => {
        let interval = null;
        if (showViolation && !isSubmitted && violationTimer > 0) {
            interval = setInterval(() => {
                setViolationTimer(prev => prev - 1);
            }, 1000);
        } else if (showViolation && !isSubmitted && violationTimer === 0) {
            handleSubmit('VIOLATION');
        }

        if (!showViolation) {
            setViolationTimer(5);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [showViolation, violationTimer, isSubmitted]);

    // Individual Question Timer (Persistent per question)
    useEffect(() => {
        if (isSubmitted || showViolation || !currentQuestion) return;
        
        const interval = setInterval(() => {
            const qId = currentQuestion.id || `${activeSectionIdx}-${activeQuestionIdx}`;
            setQuestionTimes(prev => ({
                ...prev,
                [qId]: (prev[qId] || 0) + 1
            }));
        }, 1000);
        return () => clearInterval(interval);
    }, [activeSectionIdx, activeQuestionIdx, isSubmitted, showViolation, currentQuestion]);

    // Correct extraction from ERP Data
    const studentInfo = useMemo(() => studentData?.student?.studentsDetails?.[0] || {}, [studentData]);
    const admissionNo = useMemo(() => studentData?.admissionNumber || user?.enrollment_id || user?.id || 'ID_PENDING', [studentData, user]);
    const studentName = useMemo(() => studentInfo.studentName || user?.full_name || user?.username || 'STUDENT', [studentInfo, user]);
    const studentEmail = useMemo(() => studentInfo.studentEmail || user?.email || user?.username || 'N/A', [studentInfo, user]);

    // NOW handle conditional returns
    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        </div>
    );

    if (isLocked) {
        return (
            <div className="min-h-screen w-full bg-[#f8fafc] flex items-center justify-center p-6 animate-in fade-in duration-500">
                <div className="max-w-2xl bg-white p-12 rounded-[2rem] shadow-[0_50px_100px_rgba(0,0,0,0.08)] text-center border border-gray-100 flex flex-col items-center gap-8 relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-2 bg-red-600"></div>
                    
                    <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center animate-pulse">
                        <Lock className="text-red-600 w-12 h-12" />
                    </div>
                    
                    <div className="space-y-4">
                        <h2 className="text-red-700 text-4xl font-black uppercase tracking-tighter">Security Lock</h2>
                        <div className="bg-red-50 p-8 rounded-2xl border border-red-100 italic text-red-800 font-bold leading-relaxed px-10">
                            {lockReason}
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleReturnToDashboard}
                        className="px-12 py-4 bg-gray-900 text-white font-black rounded-xl uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95"
                    >
                        Return to Dashboard
                    </button>
                    
                    <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em]">Security Protocol v2.4.0 • Academic Integrity Protection</p>
                </div>
            </div>
        );
    }

    if (error) return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 p-6">
            <div className={`max-w-md w-full bg-white p-12 rounded-[2rem] shadow-2xl border text-center space-y-8 animate-in zoom-in duration-500
                ${error.title?.toLowerCase().includes('denied') ? 'border-red-100' : 'border-gray-100'}`}>
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto animate-pulse
                    ${error.title?.toLowerCase().includes('denied') ? 'bg-red-50' : 'bg-gray-50'}`}>
                    <AlertCircle className={`w-12 h-12 ${error.title?.toLowerCase().includes('denied') ? 'text-red-500' : 'text-gray-500'}`} />
                </div>
                <div className="space-y-4">
                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{error.title}</h2>
                    <p className="text-gray-500 font-bold leading-relaxed px-4">{error.message}</p>
                </div>
                <button 
                    onClick={handleReturnToDashboard}
                    className="w-full py-5 bg-gray-900 text-white font-black rounded-xl uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95"
                >
                    Return to Dashboard
                </button>
            </div>
        </div>
    );

    if (!isSubmitted && (!paperData || !currentQuestion)) return (
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
                    <div className="fixed inset-0 bg-white/95 backdrop-blur-[15px] z-[99999] flex items-center justify-center p-8 animate-in fade-in zoom-in-95 duration-500">
                        <div className="max-w-xl bg-white p-12 rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.1)] text-center border border-gray-100 relative overflow-hidden">
                            {/* Decorative background circle */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-red-50 rounded-full -mt-32 -z-10 blur-3xl opacity-50"></div>
                            
                            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce transition-all">
                                <AlertCircle className="text-red-600 w-12 h-12" />
                            </div>
                            
                            <h2 className="text-red-600 text-4xl font-black uppercase mb-4 tracking-tighter">Violation Detected</h2>
                            
                            <div className="text-gray-600 space-y-6">
                                <p className="text-lg font-bold leading-relaxed border-y py-6 border-red-50/50 italic px-4">
                                    {violationMessage}
                                </p>
                                
                            <div className="bg-red-50/80 px-8 py-4 rounded-2xl border border-red-100 flex flex-col gap-1 items-center">
                                <span className="text-red-700 font-black text-xs uppercase tracking-widest">Auto-Submit Countdown</span>
                                <p className="text-red-700 font-black text-4xl animate-pulse">
                                    00:0{violationTimer}
                                </p>
                                <p className="text-red-700 font-bold text-sm text-center">
                                    THE EXAM WILL BE AUTOMATICALLY TERMINATED AND SUBMITTED IF NOT RESUMED IMMEDIATELY.
                                </p>
                            </div>
                            </div>
                            
                            <div className="mt-10 flex flex-col gap-6">
                                <button 
                                    onClick={() => {
                                        setShowViolation(false);
                                        enterFullscreen();
                                    }}
                                    className="px-12 py-5 bg-red-600 text-white font-black rounded-2xl uppercase tracking-widest hover:bg-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-red-600/20"
                                >
                                    Re-Enter Full Screen & Resume
                                </button>
                                <button 
                                    onClick={handleReturnToDashboard}
                                    className="text-gray-400 hover:text-red-600 font-bold tracking-tight transition-all uppercase text-xs"
                                >
                                    Quit and Return to Dashboard
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <div className="w-full max-w-4xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.05)] rounded-xl border border-gray-100 overflow-hidden">
                    <div className={`${
                        submissionType === 'VIOLATION' ? 'bg-red-600' : 
                        submissionType === 'TIME_UP' ? 'bg-[#EF6C00]' : 
                        'bg-[#0D47A1]'
                    } p-8 text-center relative overflow-hidden`}>
                        {/* Decorative background elements */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-400/10 rounded-full -ml-16 -mb-16 blur-2xl"></div>
                        
                        <h1 className="text-white text-3xl font-black uppercase tracking-tight relative z-10">
                            {submissionType === 'VIOLATION' ? 'Terminated (Violation)' : 
                             submissionType === 'TIME_UP' ? 'Exam Time Over' : 
                             'Submission Report'}
                        </h1>
                        <p className="text-blue-100 text-sm mt-2 font-medium opacity-80 tracking-wide uppercase">
                            {submissionType === 'VIOLATION' ? 'Your exam was automatically submitted due to security breach' : 
                             submissionType === 'TIME_UP' ? 'Your session expired and answers were auto-saved' : 
                             'Your exam has been successfully recorded'}
                        </p>
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

                        <div className="mt-12 flex flex-col items-center gap-4">
                            {submissionType === 'VIOLATION' && (
                                <p className="text-red-600 font-bold text-xs uppercase animate-pulse">
                                    Final attempt log registered. Result pending review.
                                </p>
                            )}
                            <button 
                                onClick={handleReturnToDashboard}
                                className={`group relative px-10 py-4 ${
                                    submissionType === 'VIOLATION' ? 'bg-red-600' : 
                                    submissionType === 'TIME_UP' ? 'bg-[#EF6C00]' : 
                                    'bg-[#0D47A1]'
                                } text-white font-black text-sm uppercase tracking-widest rounded-lg shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all overflow-hidden`}
                            >
                                <span className="relative z-10 flex items-center gap-3 italic">
                                    {submissionType === 'VIOLATION' ? 'Exit Portal' : 'All Good'} 
                                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
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


    return (
        <div className={`flex flex-col h-screen ${isDarkMode ? 'bg-[#0f172a] text-slate-100' : 'bg-white text-gray-900'} font-sans overflow-hidden select-none transition-colors duration-300`}>
            {/* Header - Row Based Styled Timer Area */}
            <div className="bg-[#EF6C00] text-white px-6 py-2 flex justify-between items-center shadow-md z-10 min-h-[60px]">
                <h1 className="text-xl font-black truncate uppercase tracking-tight antialiased">
                    {paperData.test_name}
                </h1>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={toggleTheme}
                        className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white border border-white/20 flex items-center justify-center h-[40px] w-[40px] shadow-sm active:scale-95"
                        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {isDarkMode ? <Sun className="w-5 h-5 text-yellow-300" /> : <Moon className="w-5 h-5 text-blue-100" />}
                    </button>
                    
                    <div className="bg-white px-8 py-2 shadow-lg flex items-center justify-center transition-colors min-w-[200px]">
                        <div className={`text-[#EF6C00] font-black text-xl tracking-tight transition-opacity
                            ${timeLeft < 300 && (timeLeft % 2 === 0) ? 'opacity-50' : 'opacity-100'}`}>
                            Time Left: {formatTime(timeLeft)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Sections Bar */}
            <div className="bg-[#EF6C00] px-4 py-3 flex flex-wrap gap-2 border-t border-white/10 z-10">
                <span className="text-white font-bold text-sm mr-2 self-center">Sections</span>
                {paperData.sections.map((section, idx) => {
                        const attemptedCount = section.questions_detail.reduce((count, q) => {
                            const qId = q.id;
                            const resp = responses[qId];
                            if (resp?.status === 'ANSWERED' || resp?.status === 'MARKED_ANSWERED') {
                                return count + 1;
                            }
                            return count;
                        }, 0);

                        return (
                            <button
                                key={idx}
                                onClick={() => { 
                                    setLastViewedPerSection(prev => ({...prev, [activeSectionIdx]: activeQuestionIdx}));
                                    setActiveSectionIdx(idx); 
                                    setActiveQuestionIdx(lastViewedPerSection[idx] || 0); 
                                }}
                                className={`px-4 py-1.5 text-xs font-bold rounded-[2px] transition-all uppercase
                                ${activeSectionIdx === idx 
                                    ? 'bg-[#1565C0] text-white shadow-lg border-b-2 border-white' 
                                    : 'bg-[#1976D2] text-white hover:bg-[#1565C0] border border-blue-400/30'}`}
                            >
                                {section.name} ({attemptedCount}/{section.questions_detail.length})
                            </button>
                        );
                })}
            </div>

            {/* Main Layout */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Side - Question Content */}
                <div className={`flex-1 flex flex-col overflow-y-auto overflow-x-hidden ${isDarkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-gray-200'} border-r relative transition-colors`}>
                    <div className={`px-6 py-3 border-b ${isDarkMode ? 'border-slate-800 bg-slate-900/50 text-slate-400' : 'border-gray-100 bg-gray-50/50 text-gray-600'} flex justify-between items-center text-xs font-bold`}>
                        <span>Question Type : {currentQuestion.question_type || 'MCQ'}</span>
                        <div className="flex gap-4">
                            <span className="text-green-600 dark:text-green-400">Maximum Mark : {currentSection.correct_marks}</span>
                            <span className="text-[#EF6C00]">Negative Mark : {currentSection.negative_marks}</span>
                        </div>
                    </div>

                    <div className="flex-1 p-8 relative overflow-x-hidden">
                        {/* Watermark - Clipped Container */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] opacity-[0.035] dark:opacity-[0.02] select-none flex flex-wrap gap-x-12 gap-y-10 items-center justify-center rotate-[-35deg]">
                                {Array(400).fill(`${studentName} - ${admissionNo}`).map((text, i) => (
                                    <span key={i} className={`text-[12px] font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} whitespace-nowrap uppercase tracking-[0.1em]`}>
                                        {text}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col mb-8 relative z-10">
                            <div className={`flex items-center justify-between pb-4 border-b mb-6 ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                                <h3 className={`text-lg font-black uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    Question No : {activeQuestionIdx + 1}
                                </h3>
                                <div className="flex items-center gap-3 bg-white/5 p-1 rounded-[5px] pl-4 border border-transparent">
                                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Focus Time</span>
                                    <div className={`px-4 py-1.5 rounded-[5px] font-black font-mono text-sm border shadow-sm transition-all
                                        ${isDarkMode ? 'bg-slate-900 border-slate-700 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                                        {formatTime(questionTimes[currentQuestion?.id || `${activeSectionIdx}-${activeQuestionIdx}`] || 0)}
                                    </div>
                                </div>
                            </div>
                            
                            <div className={`prose max-w-none w-full ${isDarkMode ? 'prose-invert text-slate-300' : ''}`}>
                                
                                {currentQuestion.content && (
                                    <div dangerouslySetInnerHTML={{ __html: currentQuestion.content }} />
                                )}
                                
                                {currentQuestion.question_img && (
                                    <div className="my-6">
                                        <img src={currentQuestion.question_img} alt="Question" className={`max-w-full h-auto border p-2 ${isDarkMode ? 'bg-white/10 border-slate-700' : 'bg-white border-gray-200'} shadow-sm`} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Question Content/Options */}
                        <div className="space-y-6 ml-12 relative z-10">
                            {/* MCQ / Choice Based Questions */}
                            {(currentQuestion.question_type === 'SINGLE_CHOICE' || currentQuestion.question_type === 'MULTI_CHOICE') && (
                                <div className="space-y-4">
                                    {(currentQuestion.question_options || []).map((opt, idx) => {
                                        const qId = currentQuestion.id || `${activeSectionIdx}-${activeQuestionIdx}`;
                                        const label = String.fromCharCode(65 + idx); // 0 -> A, 1 -> B, etc.
                                        const isSelected = responses[qId]?.selectedOption === label;
                                        
                                        return (
                                            <label key={idx} className={`flex items-start gap-4 p-4 border rounded-[5px] cursor-pointer transition-colors shadow-sm
                                                ${isSelected 
                                                    ? (isDarkMode ? 'bg-blue-500/20 border-blue-500/50 text-blue-100 ring-1 ring-blue-500/20' : 'bg-blue-50 border-blue-200 ring-1 ring-blue-100 shadow-md') 
                                                    : (isDarkMode ? 'hover:bg-slate-800 border-slate-800 text-slate-300' : 'hover:bg-gray-50 border-gray-200 bg-white')}`}>
                                                
                                                <div className="pt-1">
                                                    <input 
                                                        type="radio" 
                                                        name={`q-${activeSectionIdx}-${activeQuestionIdx}`}
                                                        checked={isSelected}
                                                        onChange={() => updateStatus(responses[qId]?.status || 'VISITED', label)}
                                                        className="w-4 h-4 accent-blue-600 cursor-pointer" 
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-3 w-full">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`font-black text-sm ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}>({label})</span>
                                                        <div className={`prose-sm ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`} dangerouslySetInnerHTML={{ __html: opt.content }} />
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Numerical / Integer Type Questions */}
                            {(currentQuestion.question_type === 'NUMERICAL' || currentQuestion.question_type === 'INTEGER_TYPE') && (
                                <div className={`p-6 rounded-[5px] border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
                                    <p className={`text-xs font-black uppercase tracking-widest mb-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Numerical Answer :</p>
                                    <div className="max-w-xs">
                                        <input 
                                            type="number"
                                            step="any"
                                            placeholder="Enter your answer here..."
                                            value={responses[currentQuestion.id || `${activeSectionIdx}-${activeQuestionIdx}`]?.selectedOption || ''}
                                            onChange={(e) => updateStatus('ANSWERED', e.target.value)}
                                            className={`w-full px-5 py-4 text-lg font-black rounded-[5px] border outline-none transition-all
                                                ${isDarkMode 
                                                    ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10' 
                                                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5'}`}
                                        />
                                    </div>
                                    <p className="mt-4 text-[10px] font-bold opacity-40 uppercase italic tracking-wider">Note: Answer can be a decimal or an integer as per the question requirements.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Action Bar - Multi-row Layout per Requirement */}
                    <div className={`p-4 border-t transition-colors ${isDarkMode ? 'bg-[#0f172a] border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.2)]' : 'bg-white border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]'}`}>
                        {/* Row 1: Main Actions */}
                        <div className="flex gap-3 mb-4">
                            <button 
                                onClick={handleClear}
                                className={`px-5 py-2.5 border-2 font-black text-[12px] rounded-[4px] uppercase transition-all shadow-sm
                                    ${isDarkMode 
                                        ? 'bg-transparent border-slate-700 text-slate-400 hover:bg-slate-800' 
                                        : 'bg-white border-blue-400 text-blue-600 hover:bg-blue-50'}`}
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
                                className={`px-8 py-2.5 border-2 font-black text-[12px] rounded-[4px] uppercase transition-all active:scale-95
                                    ${isDarkMode 
                                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' 
                                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                            >
                                &lt;&lt; Back
                            </button>
                            <button 
                                onClick={handleNext}
                                className={`px-8 py-2.5 border-2 font-black text-[12px] rounded-[4px] uppercase transition-all active:scale-95
                                    ${isDarkMode 
                                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' 
                                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                            >
                                Next &gt;&gt;
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Side - Sidebar (Increased Width) */}
                <div className={`w-[380px] flex flex-col border-l transition-colors ${isDarkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-gray-200'}`}>
                    {/* User Profile */}
                    <div className={`p-4 flex gap-4 border-b transition-colors ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-gray-50/80 border-gray-100'}`}>
                        <div className={`w-20 h-20 border-2 rounded-sm flex items-center justify-center shrink-0 transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                            <User className={`w-12 h-12 ${isDarkMode ? 'text-slate-600' : 'text-gray-300'}`} />
                        </div>
                        <div className="flex flex-col justify-center overflow-hidden gap-1">
                            <p className={`text-[12px] uppercase font-black truncate leading-tight ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>Name : {studentName}</p>
                            <p className={`text-[12px] uppercase font-black truncate leading-tight ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>Enrollment Id : {admissionNo}</p>
                            <p className={`text-[12px] uppercase font-black truncate leading-tight italic opacity-70 ${isDarkMode ? 'text-slate-400' : 'text-gray-900'}`}>Email : {studentEmail}</p>
                        </div>
                    </div>

                    {/* Question Palette */}
                    <div className={`flex-1 p-5 overflow-y-auto transition-colors ${isDarkMode ? 'bg-slate-900/30' : 'bg-blue-50/30'}`}>
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
                                        ${isActive ? (isDarkMode ? 'scale-110 ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0f172a] z-10' : 'scale-110 ring-2 ring-blue-400 ring-offset-1 z-10') : ''}`}
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
                                            <div className={`absolute inset-0 border rounded-[4px] transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-[#EEEEEE] border-gray-300'}`}></div>
                                        )}
                                        
                                        {/* Question Number - High Visibility Fix */}
                                        <span className={`relative z-[10] font-black text-[13px] drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)] antialiased
                                            ${(isAnswered || isMarked || isMarkedAnswered || isNotAnswered) ? 'text-white' : (isDarkMode ? 'text-slate-400' : 'text-gray-900')}`}
                                        >
                                            {idx + 1}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Submit Section */}
                    <div className={`p-4 border-t transition-colors ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-gray-100/50 border-gray-200'}`}>
                        <div className="flex items-center gap-3 mb-4">
                            <input 
                                type="checkbox" 
                                id="submit_lock" 
                                checked={canSubmit}
                                onChange={(e) => setCanSubmit(e.target.checked)}
                                className="w-4 h-4 cursor-pointer accent-blue-600" 
                            />
                            <label htmlFor="submit_lock" className={`text-[11px] font-bold cursor-pointer select-none ${isDarkMode ? 'text-slate-400' : 'text-gray-700'}`}>I want to submit.</label>
                        </div>
                        <button 
                            onClick={() => handleSubmit('MANUAL')}
                            disabled={!canSubmit || isSubmitting}
                            className={`w-full py-2 font-black text-[11px] uppercase rounded-[3px] transition-all flex items-center justify-center gap-2
                            ${(canSubmit && !isSubmitting)
                                ? 'bg-blue-600 text-white cursor-pointer hover:bg-blue-700 shadow-lg shadow-blue-600/20' 
                                : (isDarkMode ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed')}`}
                        >
                            {isSubmitting && <Loader2 size={12} className="animate-spin" />}
                            {isSubmitting ? 'Submitting...' : 'Submit'}
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

            {/* Violation Overlay during active exam */}
            {showViolation && (
                <div className="fixed inset-0 bg-white/95 backdrop-blur-[15px] z-[99999] flex items-center justify-center p-8 animate-in fade-in zoom-in-95 duration-500">
                    <div className="max-w-xl bg-white p-12 rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.1)] text-center border border-gray-100 relative overflow-hidden">
                        {/* Decorative background circle */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-red-50 rounded-full -mt-32 -z-10 blur-3xl opacity-50"></div>
                        
                        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce transition-all">
                            <AlertCircle className="text-red-600 w-12 h-12" />
                        </div>
                        
                        <h2 className="text-red-600 text-4xl font-black uppercase mb-4 tracking-tighter">Violation Detected</h2>
                        
                        <div className="text-gray-600 space-y-6">
                            <p className="text-lg font-bold leading-relaxed border-y py-6 border-red-50/50 italic px-4">
                                {violationMessage}
                            </p>
                            
                            <div className="bg-red-50/80 px-8 py-4 rounded-2xl border border-red-100 flex flex-col gap-1 items-center">
                                <span className="text-red-700 font-black text-xs uppercase tracking-widest">Auto-Submit Countdown</span>
                                <p className="text-red-700 font-black text-4xl animate-pulse">
                                    00:0{violationTimer}
                                </p>
                                <p className="text-red-700 font-bold text-sm text-center">
                                    THE EXAM WILL BE AUTOMATICALLY TERMINATED AND SUBMITTED IF NOT RESUMED IMMEDIATELY.
                                </p>
                            </div>
                        </div>
                        
                        <div className="mt-10 flex flex-col gap-6">
                            <button 
                                onClick={() => {
                                    setShowViolation(false);
                                    enterFullscreen();
                                }}
                                className="px-12 py-5 bg-red-600 text-white font-black rounded-2xl uppercase tracking-widest hover:bg-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-red-600/20"
                            >
                                Re-Enter Full Screen & Resume
                            </button>
                            <button 
                                onClick={handleReturnToDashboard}
                                className="text-gray-400 hover:text-red-600 font-bold tracking-tight transition-all uppercase text-xs"
                            >
                                Quit and Return to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamEngine;
