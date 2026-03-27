import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { Loader2, Maximize2, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ExamInstructions = () => {
    const { id: testId } = useParams();
    const navigate = useNavigate();
    const { getApiUrl, token } = useAuth();
    const { isDarkMode } = useTheme();
    const [paperData, setPaperData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isChecked, setIsChecked] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [lockReason, setLockReason] = useState('');
    const [statusData, setStatusData] = useState(null);

    useEffect(() => {
        const fetchInstructions = async () => {
            try {
                // Check Status First
                const statusResp = await axios.get(`${getApiUrl()}/api/tests/${testId}/status/?_t=${Date.now()}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const sData = statusResp.data;
                setStatusData(sData);

                if (sData.is_finalized) {
                    navigate('/student');
                    return;
                }

                if (sData.status === 'interrupted' && !sData.allow_resume) {
                    setIsLocked(true);
                    setLockReason("SESSION INTERRUPTED. Your previous session was terminated unexpectedly. In accordance with security protocols, your account is now locked. Please contact the administrator to authorize a resume.");
                }

                const response = await axios.get(`${getApiUrl()}/api/tests/${testId}/question_paper/?_t=${Date.now()}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setPaperData(response.data);
            } catch (err) {
                console.error('Error fetching instructions:', err);
                navigate('/student');
            } finally {
                setIsLoading(false);
            }
        };

        if (token && testId) {
            fetchInstructions();
        }
    }, [token, testId, getApiUrl, navigate]);

    if (isLoading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-[#0B0F15] text-white' : 'bg-[#F2F5F8] text-slate-900'}`}>
                <div className="flex flex-col items-center">
                    <Loader2 className="w-10 h-10 animate-spin mb-4 text-orange-500" />
                    <p className="text-sm font-bold opacity-60">Validating Session Status...</p>
                </div>
            </div>
        );
    }

    if (isLocked) {
        return (
            <div className={`min-h-screen w-full flex items-center justify-center p-6 ${isDarkMode ? 'bg-[#0B0F15]' : 'bg-[#f8fafc]'}`}>
                <div className={`max-w-2xl p-12 rounded-[2rem] shadow-2xl text-center border flex flex-col items-center gap-8 relative overflow-hidden ${isDarkMode ? 'bg-[#161B22] border-white/5' : 'bg-white border-gray-100'}`}>
                    <div className="absolute top-0 inset-x-0 h-2 bg-red-600"></div>
                    <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center animate-pulse">
                        <Lock className="text-red-600 w-12 h-12" />
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-red-700 text-4xl font-black uppercase tracking-tighter">Security Lock</h2>
                        <div className="bg-red-50/50 p-8 rounded-2xl border border-red-100 italic text-red-800 font-bold leading-relaxed px-10">
                            {lockReason}
                        </div>
                    </div>
                    <button 
                        onClick={() => navigate('/student')}
                        className="px-12 py-4 bg-gray-900 text-white font-black rounded-xl uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const handleReadyToBegin = async () => {
        if (!isChecked) return;
        
        try {
            // Consume the resume permission (if any) before entering
            await axios.post(`${getApiUrl()}/api/tests/${testId}/start_exam/`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Enter Fullscreen
            try {
                const element = document.documentElement;
                if (element.requestFullscreen) {
                    await element.requestFullscreen();
                } else if (element.webkitRequestFullscreen) {
                    await element.webkitRequestFullscreen();
                } else if (element.msRequestFullscreen) {
                    await element.msRequestFullscreen();
                }
            } catch (fsErr) {
                console.warn("Fullscreen rejected:", fsErr);
            }

            navigate(`/student/exam/${testId}/paper`);
        } catch (err) {
            console.error("Failed to start session:", err);
            toast.error("Security Handshake Failed. Please refresh and try again.");
        }
    };

    if (!paperData) return null;

    const { test_name, duration, sections = [] } = paperData;
    
    // Calculate totals for summary
    const totalQuestions = sections.reduce((acc, s) => acc + (s.questions_detail?.length || 0), 0);
    const totalMarks = sections.reduce((acc, s) => acc + ((s.questions_detail?.length || 0) * (parseFloat(s.correct_marks) || 0)), 0);
    const subjectList = [...new Set(sections.map(s => s.name))].join(', ');

    return (
        <div className={`min-h-screen pb-20 p-6 md:p-8 lg:p-12 ${isDarkMode ? 'bg-[#0B0F15] text-white' : 'bg-white text-[#333333]'} font-sans`}>
            <div className="max-w-6xl mx-auto space-y-6">
                
                {/* Test Info */}
                <div className="space-y-1">
                    <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
                        Test Name :{test_name}
                    </h1>
                    <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
                        Duration:180 min
                    </p>
                </div>

                <div className="space-y-8 mt-10">
                    {/* General Instructions */}
                    <section>
                        <h2 className={`text-[17px] font-bold underline mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                            General Instructions:
                        </h2>
                        <ol className="list-decimal pl-6 space-y-4 text-[15px] leading-relaxed">
                            <li>The clock will be set at the server. The countdown timer in the top right corner of screen will display the remaining time available for you to complete the examination. When the timer reaches zero, the examination will end by itself. You will not be required to end or submit your examination.</li>
                            <li>The Questions Palette displayed on the right side of screen will show the status of each question using one of the following symbols:
                                <ul className="mt-4 space-y-6 pl-2">
                                    <li className="flex items-center gap-4">
                                        <div className="ml-4 flex items-center gap-4">
                                            <span className="text-[15px]">1.</span>
                                            <div className="w-[32px] h-[32px] bg-[#EEEEEE] border border-[#CCCCCC] rounded-[4px] shadow-inner"></div>
                                            <span>You have not visited the question yet.</span>
                                        </div>
                                    </li>
                                    <li className="flex items-center gap-4">
                                        <div className="ml-4 flex items-center gap-4 text-[15px]">
                                            <span>2.</span>
                                            <div className="relative w-[34px] h-[34px]">
                                                {/* Trapezoid type shape for 'Not Answered' */}
                                                <div className="w-full h-full bg-[#E44D26] rounded-b-[4px] rounded-tl-[10px]" style={{clipPath: 'polygon(0 0, 100% 0, 100% 70%, 70% 100%, 0 100%)'}}></div>
                                            </div>
                                            <span>You have not answered the question.</span>
                                        </div>
                                    </li>
                                    <li className="flex items-center gap-4">
                                        <div className="ml-4 flex items-center gap-4 text-[15px]">
                                            <span>3.</span>
                                            <div className="relative w-[34px] h-[34px]">
                                                {/* Trapezoid type shape for 'Answered' */}
                                                <div className="w-full h-full bg-[#39B54A] rounded-b-[4px] rounded-tr-[10px]" style={{clipPath: 'polygon(0 0, 100% 0, 100% 100%, 30% 100%, 0 70%)'}}></div>
                                            </div>
                                            <span>You have answered the question.</span>
                                        </div>
                                    </li>
                                    <li className="flex items-center gap-4">
                                        <div className="ml-4 flex items-center gap-4 text-[15px]">
                                            <span>4.</span>
                                            <div className="w-[34px] h-[34px] bg-[#4B2B90] rounded-full"></div>
                                            <span>You have NOT answered the question, but have marked the question for review.</span>
                                        </div>
                                    </li>
                                    <li className="flex items-center gap-4 text-[15px]">
                                        <div className="ml-4 flex items-center gap-4">
                                            <span>5.</span>
                                            <div className="relative w-[34px] h-[34px]">
                                                <div className="w-full h-full bg-[#4B2B90] rounded-full flex items-center justify-center">
                                                    <div className="absolute right-0 bottom-0 w-[14px] h-[14px] bg-[#39B54A] rounded-full border border-white flex items-center justify-center">
                                                        <div className="w-1.5 h-1.5 border-b border-r border-white rotate-45 mb-0.5"></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <span>The question(s) "Answered and Marked for Review" will be considered for evalution.</span>
                                        </div>
                                    </li>
                                </ul>
                            </li>
                        </ol>
                    </section>

                    {/* Navigating to a Question */}
                    <section>
                        <h2 className={`text-[17px] font-bold underline mb-4 mt-8 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                            Navigating to a Question:
                        </h2>
                        <ol className="list-decimal pl-6 space-y-4 text-[15px] leading-relaxed" start="7">
                            <li>To answer a question, do the following:
                                <ul className="list-[lower-alpha] pl-6 space-y-3 mt-3">
                                    <li>Click on the question number in the Question Palette at the right of your screen to go to that numbered question directly. Note that using this option does NOT save your answer to the current question.</li>
                                    <li>Click on <span className="font-bold">Save & Next</span> to save your answer for the current question and then go to the next question.</li>
                                    <li>Click on <span className="font-bold">Mark for Review & Next</span> to save your answer for the current question, mark it for review, and then go to the next question.</li>
                                </ul>
                            </li>
                        </ol>
                    </section>

                    {/* Answering a Question */}
                    <section>
                        <h2 className={`text-[17px] font-bold underline mb-4 mt-8 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                            Answering a Question:
                        </h2>
                        <ol className="list-decimal pl-6 space-y-4 text-[15px] leading-relaxed" start="8">
                            <li>Procedure for answering a multiple choice type question:
                                <ul className="list-[lower-alpha] pl-6 space-y-3 mt-3">
                                    <li>To select you answer, click on the button of one of the options.</li>
                                    <li>To deselect your chosen answer, click on the button of the chosen option again or click on the <span className="font-bold">Clear Response</span> button</li>
                                    <li>To change your chosen answer, click on the button of another option</li>
                                    <li>To save your answer, you MUST click on the <span className="font-bold">Save & Next</span> button.</li>
                                    <li>To mark the question for review, click on the <span className="font-bold">Mark for Review & Next</span> button.</li>
                                </ul>
                            </li>
                            <li start="9">To change your answer to a question that has already been answered, first select that question for answering and then follow the procedure for answering that type of question.</li>
                        </ol>
                    </section>

                    {/* Navigating through sections */}
                    <section>
                        <h2 className={`text-[17px] font-bold underline mb-4 mt-8 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                            Navigating through sections:
                        </h2>
                        <ol className="list-decimal pl-6 space-y-4 text-[15px] leading-relaxed" start="10">
                            <li>Sections in this question paper are displayed on the top bar of the screen. Questions in a section can be viewed by click on the section name. The section you are currently viewing is highlighted.</li>
                            <li>After click the <span className="font-bold">Save & Next</span> button on the last question for a section, you will automatically be taken to the first question of the next section.</li>
                            <li>You can shuffle between sections and questions anything during the examination as per your convenience only during the time stipulated.</li>
                            <li>Candidate can view the corresponding section summery as part of the legend that appears in every section above the question palette.</li>
                        </ol>
                    </section>
                </div>

                {/* Sub-instructions (1, 2, 3) and Sections (A, B) */}
                <div className="mt-16 space-y-12 leading-relaxed">
                    <div className="space-y-6">
                        <p className={`text-[17px] font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>Exam Instruction:- 1. The Test consists of {totalQuestions} questions. The maximum marks are {totalMarks}</p>
                        
                        <p className={`text-[17px] font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>2. There are {sections.length > 2 ? 'three' : 'two'} Parts in the question paper consisting of {subjectList}, having questions in each part, in each subject,</p>
                        
                        <p className={`text-[17px] font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>3. Each Part has two Sections containing 20(twenty) Single Choice Questions and 5 (Five) Numerical Type Questions candidates have to answer 5 (Five) questions in NUMERICAL type questions.</p>
                    </div>

                    {/* Section Mapping */}
                    {sections.map((section, idx) => {
                        const qCount = section.questions_detail?.length || 0;
                        const maxMarks = qCount * (parseFloat(section.correct_marks) || 0);
                        const isNumerical = section.questions_detail?.[0]?.question_type === 'NUMERICAL' || section.questions_detail?.[0]?.question_type === 'INTEGER_TYPE';

                        return (
                            <div key={idx} className="space-y-8">
                                <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>SECTION {String.fromCharCode(65 + idx)} (Maximum Marks : {maxMarks})</h3>
                                
                                <div className="space-y-6">
                                    <p>
                                        <span className={`inline-block mr-2 ${isDarkMode ? 'text-gray-500' : 'text-[#CCCCCC]'}`}>⏵</span>
                                        <span className="font-bold">This section contains {qCount === 20 ? 'TWENTY (20)' : qCount === 5 ? 'FIVE (05)' : qCount} questions.</span>
                                        {isNumerical ? (
                                            <> Candidates have to attempt FIVE (05) questions. <span className="font-bold">The answer to each question is a INTEGER VALUE.</span> ⏵ For each question, enter the correct numerical value of the answer using the mouse and on the on-screen virtual numeric keypad in the place designated to enter the answer. If the integer value has decimal places, <span className="font-bold underline">TRUNCATED/ROUND-OFF the value to Single Digit Integer value</span>. </>
                                        ) : (
                                            <> ⏵ Each question has FOUR options for correct answer(s). ONLY ONE of these four option is correct. ⏵ For each question, select the option(s) corresponding to the correct answer. ⏵ Answer to each question will be evaluated according to the following marking scheme :</>
                                        )}
                                        {isNumerical && <> ⏵ Answer to each question will be evaluated according to the following marking scheme :</>}
                                    </p>

                                    <div className="space-y-3 font-bold">
                                        <p className="underline underline-offset-4">Full Marks : +{section.correct_marks} If ONLY the correct {isNumerical ? 'numerical value is entered as answer' : 'option is chosen'}.</p>
                                        <p className="underline underline-offset-4">Zero Marks : 0 {isNumerical ? 'In all other cases.' : 'If none of the options is chosen (i.e. the question is unanswered).'}</p>
                                        {!isNumerical && <p className="underline underline-offset-4">Negative Marks : {section.negative_marks} In all other cases.</p>}
                                        {isNumerical && <p className="underline underline-offset-4 text-red-500">Negative Marks : {section.negative_marks} in all other cases.</p>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Red Rules */}
                    <div className="text-[#FF0000] font-bold space-y-2 mt-8 border-2 border-[#FF0000]/20 p-6 rounded-xl bg-red-50/30">
                        <p className="text-lg mb-2 underline">IMPORTANT SECURITY RULES:</p>
                        <p>1. You will be entered into Full Screen Mode automatically.</p>
                        <p>2. Exiting Full Screen Mode or switching tabs/windows (Alt+Tab) is strictly prohibited.</p>
                        <p>3. If a violation is detected, you will have exactly 5 seconds to resume the exam.</p>
                        <p>4. If 5 seconds pass without resuming, your session will be TERMINATED and submitted immediately due to security violation.</p>
                        <p className="pt-2 italic">* Any attempt to bypass these security measures will result in disqualification.</p>
                    </div>
                </div>

                {/* Accept Terms (If needed for flow) */}
                <div className="mt-16 pt-8 border-t border-gray-100 dark:border-white/5 space-y-6">
                    <div className="flex items-start gap-4">
                        <input 
                            type="checkbox" 
                            id="accept_instructions"
                            checked={isChecked}
                            onChange={(e) => setIsChecked(e.target.checked)}
                            className="mt-1 w-5 h-5 cursor-pointer accent-[#1976D2]"
                        />
                        <label htmlFor="accept_instructions" className="text-[15px] font-medium cursor-pointer select-none leading-relaxed">
                            I have read the instruction carefully and accept all the rules and regulation of the test.
                        </label>
                    </div>

                    <div className="flex justify-end mt-4">
                        <button
                            disabled={!isChecked}
                            onClick={handleReadyToBegin}
                            className={`px-8 py-2.5 font-semibold transition-all border rounded-[4px] text-[15px]
                            ${isChecked 
                                ? 'bg-[#1976D2] text-white border-[#1976D2] hover:bg-[#1565C0] cursor-pointer shadow-md' 
                                : 'bg-[#EEEEEE] text-[#777777] border-[#CCCCCC] cursor-not-allowed'}`}
                        >
                            Ready to Begin
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExamInstructions;
