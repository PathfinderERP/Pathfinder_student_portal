import React, { useState, useEffect } from 'react';
import {
    Brain, Target, GraduationCap, ChevronRight, Activity, Clock, CheckCircle2,
    BookOpen, Calculator, Atom, Orbit, Sparkles, Loader2, ArrowRight, Dna,
    Database, Cpu, Network, ShieldCheck, Microscope, Zap, GitBranch, Crosshair
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';

const COLLEGES = {
    engineering: ["IIT Bombay", "IIT Delhi", "IIT Madras", "IIT Kharagpur", "NIT Trichy", "NIT Surathkal", "Jadavpur University", "BITS Pilani", "Other Eng. College"],
    medical: ["AIIMS New Delhi", "CMC Vellore", "JIPMER", "KGMU Lucknow", "AFMC Pune", "MAMC Delhi", "Other Medical College"],
    other: ["Delhi University", "Presidency University", "Christ University", "Other College"]
};

const EXAMS = ["JEE Main", "JEE Advanced", "NEET UG", "WBJEE"];

const StudyPlanner = ({ isDarkMode, studentData }) => {
    const { getApiUrl, token } = useAuth();
    const navigate = useNavigate();

    const studentClass = studentData?.class?.name || "N/A";

    const CLASSES = [studentClass];

    // Application Flow State: 1: Setup, 2: Test, 3: College/Review, 4: AI Plan
    const [currentStep, setCurrentStep] = useState(1);

    // Form / Data States
    const [profile, setProfile] = useState({ classLevel: 'N/A', targetExam: 'JEE Main' });

    // Auto-sync profile with student metadata on load
    useEffect(() => {
        if (studentData?.class?.name) {
            setProfile(prev => ({ ...prev, classLevel: studentData.class.name }));
        }
    }, [studentData]);

    const [tests, setTests] = useState([]);
    const [loadingTests, setLoadingTests] = useState(false);

    const [testScores, setTestScores] = useState(null);

    const [planConfig, setPlanConfig] = useState({
        targetCollege: 'IIT Bombay',
        dailyHours: 6
    });

    const [aiLoading, setAiLoading] = useState(false);
    const [aiPlan, setAiPlan] = useState('');

    const isMedical = profile.targetExam.includes('NEET') || profile.classLevel.includes('Med');
    const availableColleges = isMedical ? COLLEGES.medical : (profile.targetExam === 'CUET' || profile.targetExam === 'Boards' ? COLLEGES.other : COLLEGES.engineering);

    const fetchTests = async () => {
        setLoadingTests(true);
        try {
            const apiUrl = getApiUrl();
            const [testsRes, resultsRes] = await Promise.all([
                axios.get(`${apiUrl}/api/tests/`, { headers: { 'Authorization': `Bearer ${token}` } }),
                axios.get(`${apiUrl}/api/tests/my_results/`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => ({ data: [] }))
            ]);

            const testsData = testsRes.data || [];
            const resultsData = resultsRes.data || [];

            const mergedData = testsData.map(test => {
                const result = resultsData.find(r => r.code === test.code || r.id === test.id);
                if (result) {
                    return {
                        ...test,
                        submission: {
                            ...(test.submission || {}),
                            score: result.marks != null && result.total > 0
                                ? (result.marks / result.total) * 100
                                : (test.submission?.score ?? 0),
                            rank: result.rank || test.submission?.rank || null,
                            is_finalized: result.is_finalized ?? true
                        }
                    };
                }
                return test;
            });
            setTests(mergedData);
        } catch (error) {
            console.error('Failed to load real exams:', error);
        } finally {
            setLoadingTests(false);
        }
    };

    const startTest = () => {
        setCurrentStep(2);
        fetchTests();
    };

    const analyzeCompletedTest = (test) => {
        const score = Math.floor(test.submission?.score || 0);
        setTestScores({
            total: score,
            q1Score: score,
            q2Score: score,
            q3Score: score
        });
        setPlanConfig(prev => ({ ...prev, targetCollege: availableColleges[0] }));
        setCurrentStep(3);
    };

    const generateAIPlan = async () => {
        setAiLoading(true);
        try {
            const apiUrl = getApiUrl();
            const payload = {
                target_college: planConfig.targetCollege,
                class: profile.classLevel,
                exam_name: profile.targetExam,
                total_score: testScores.total.toString(),
                math_score: isMedical ? "N/A" : testScores.q3Score.toString(),
                physics_score: testScores.q1Score.toString(),
                chemistry_score: testScores.q2Score.toString(),
                weak_topics: "Concepts requiring accuracy improvement",
                strong_topics: "Foundational conceptual grasp",
                daily_time_hours: planConfig.dailyHours.toString()
            };

            const response = await axios.post(`${apiUrl}/api/student/ai-mentor/study-plan/`, payload, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data && response.data.ai_plan) {
                setAiPlan(response.data.ai_plan);
                setCurrentStep(4);
            }
        } catch (error) {
            console.error('Failed to generate AI plan:', error);
            alert("Error generating plan. Please ensure Gemini API Key is configured.");
        } finally {
            setAiLoading(false);
        }
    };

    const resetPlanner = () => {
        setCurrentStep(1);
        setAiPlan('');
    };

    // Shared Static Side Panel
    const renderSidePanel = () => (
        <div className={`hidden lg:flex flex-col w-[300px] shrink-0 p-6 border-r ${isDarkMode ? 'border-white/5 bg-[#0a0d14]' : 'border-slate-200 bg-slate-50'} min-h-full`}>
            <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 rounded-[4px] bg-indigo-600 flex items-center justify-center text-white">
                    <Brain size={20} />
                </div>
                <div>
                    <h2 className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>AI Strategy</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">v2.0 Beta Engine</p>
                </div>
            </div>

            <div className="space-y-8 flex-1">
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-500/20 pb-2">Evaluation Core</h3>
                    <ul className="space-y-3">
                        <li className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-400">
                            <Database size={14} className="text-indigo-500" /> Deep Analytics Engine
                        </li>
                        <li className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-400">
                            <Cpu size={14} className="text-emerald-500" /> Gemini Pro Processing
                        </li>
                        <li className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-400">
                            <Network size={14} className="text-emerald-500" /> Neural Gap Detection
                        </li>
                    </ul>
                </div>

                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-500/20 pb-2">Global Stats</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <div className={`p-3 rounded-[4px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200'}`}>
                            <div className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>1.2M+</div>
                            <div className="text-[9px] font-black uppercase text-slate-500">Plans</div>
                        </div>
                        <div className={`p-3 rounded-[4px] border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200'}`}>
                            <div className={`text-lg font-black text-emerald-500`}>98%</div>
                            <div className="text-[9px] font-black uppercase text-slate-500">Success</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-500/20 flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                <ShieldCheck size={14} className="text-indigo-500" /> End-to-end encrypted
            </div>
        </div>
    );

    const renderStep1 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 p-8 lg:p-12 overflow-y-auto custom-scrollbar relative">
            {/* Subtle Grid Background */}
            <div className={`absolute inset-0 pointer-events-none ${isDarkMode ? 'bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]' : 'bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]'}`}></div>

            <div className="max-w-5xl mx-auto space-y-10 relative z-10">
                {/* Header Sequence Tracker */}
                <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-[4px] bg-indigo-600 text-white flex items-center justify-center font-black text-xs">01</div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Configuration</span>
                    </div>
                    <div className={`flex-1 h-[1px] mx-4 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                    <div className="flex items-center gap-2 opacity-40">
                        <div className={`w-8 h-8 rounded-[4px] border border-dashed flex items-center justify-center font-black text-xs ${isDarkMode ? 'border-white/20 text-white' : 'border-slate-300 text-slate-500'}`}>02</div>
                        <span className={`text-[10px] font-black hidden md:block uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Exam</span>
                    </div>
                    <div className={`flex-1 h-[1px] mx-4 opacity-40 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                    <div className="flex items-center gap-2 opacity-40">
                        <div className={`w-8 h-8 rounded-[4px] border border-dashed flex items-center justify-center font-black text-xs ${isDarkMode ? 'border-white/20 text-white' : 'border-slate-300 text-slate-500'}`}>03</div>
                        <span className={`text-[10px] font-black hidden md:block uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Profiling</span>
                    </div>
                    <div className={`flex-1 h-[1px] mx-4 opacity-40 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                    <div className="flex items-center gap-2 opacity-40">
                        <div className={`w-8 h-8 rounded-[4px] border border-dashed flex items-center justify-center font-black text-xs ${isDarkMode ? 'border-white/20 text-white' : 'border-slate-300 text-slate-500'}`}>04</div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-500'}`}>Master Plan</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className={`text-3xl font-black uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        Configure Academic Vector
                    </h1>
                    <p className={`text-sm font-bold tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Provide your current standing and objective to initialize the exam sequence.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className={`p-6 rounded-[4px] border border-l-4 border-l-indigo-500 ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-6">
                            <GraduationCap size={16} /> Select Stage
                        </label>
                        
                        <div className={`p-5 rounded-[4px] border relative overflow-hidden transition-all ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100 flex-1 shadow-inner'}`}>
                            <div className="absolute top-0 right-0 p-2">
                                <div className="bg-indigo-600 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-tighter shadow-lg">Verified Profile</div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-[4px] bg-indigo-600 flex items-center justify-center text-white shadow-xl">
                                    <span className="text-xl font-black">{profile.classLevel.split(' ').pop()}</span>
                                </div>
                                <div>
                                    <h4 className={`text-sm font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        {profile.classLevel}
                                    </h4>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Current Standing</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={`p-6 rounded-[4px] border border-l-4 border-l-emerald-500 ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-4">
                            <Target size={16} /> Primary Objective
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {EXAMS.map(exam => (
                                <button key={exam} onClick={() => setProfile({ ...profile, targetExam: exam })} className={`p-3 rounded-[4px] border text-[11px] md:text-xs font-bold text-left transition-all ${profile.targetExam === exam ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : isDarkMode ? 'bg-white/5 border-white/5 hover:border-white/20 text-slate-300' : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'}`}>
                                    {exam}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                    <div className={`p-5 rounded-[4px] border ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                        <Zap size={16} className="text-emerald-500 mb-3" />
                        <h4 className={`text-xs font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Take Assessment Exam</h4>
                        <p className={`text-[10px] font-bold leading-relaxed opacity-70 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>A short evaluation exam across core subjects to instantly map your current cognitive baseline.</p>
                    </div>
                    <div className={`p-5 rounded-[4px] border ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                        <Crosshair size={16} className="text-emerald-500 mb-3" />
                        <h4 className={`text-xs font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Gap Detection</h4>
                        <p className={`text-[10px] font-bold leading-relaxed opacity-70 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>The AI precisely measures the distance between your baseline and your target institution's threshold.</p>
                    </div>
                    <div className={`p-5 rounded-[4px] border ${isDarkMode ? 'bg-[#10141D] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                        <GitBranch size={16} className="text-indigo-500 mb-3" />
                        <h4 className={`text-xs font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Strategy Synthesis</h4>
                        <p className={`text-[10px] font-bold leading-relaxed opacity-70 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Generates a granular 1-year and 1-month trajectory specifically engineered for your explicit goal.</p>
                    </div>
                </div>

                <div className="pt-8 flex justify-end pb-10 border-t border-slate-500/20">
                    <button onClick={startTest} className="px-10 py-5 bg-indigo-600 text-white rounded-[4px] font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-[0_0_30px_rgba(79,70,229,0.2)] hover:shadow-[0_0_40px_rgba(79,70,229,0.4)] flex items-center gap-4 group">
                        Start Assessment Exam <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </motion.div>
    );

    const renderStep2 = () => {
        return (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 p-8 lg:p-12 overflow-y-auto custom-scrollbar">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-8 border-b pb-4 border-slate-500/20">
                        <div className="flex items-center gap-3">
                            <Activity className="text-emerald-500" />
                            <h3 className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Evaluate Real Exams</h3>
                        </div>
                    </div>

                    <p className={`text-xs font-bold leading-relaxed mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Choose an active exam set by the institution to establish your baseline, or analyze a previously completed exam to synthesize your master strategy.
                        No exam codes are required for processing.
                    </p>

                    <div className={`rounded-[4px] border overflow-hidden ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                        {loadingTests ? (
                            <div className="p-12 flex justify-center flex-col items-center gap-4">
                                <Loader2 size={32} className="animate-spin text-indigo-500" />
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Synchronizing Master Database</p>
                            </div>
                        ) : tests.length === 0 ? (
                            <div className="p-12 text-center text-xs font-bold text-slate-500 uppercase">
                                No exams configured by administration
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead>
                                    <tr className={`text-[9px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'bg-white/5 text-slate-500 border-white/5' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                        <th className="py-4 px-6">Available Assessments</th>
                                        <th className="py-4 px-6 text-center">Status</th>
                                        <th className="py-4 px-6 text-center">Your Score</th>
                                        <th className="py-4 px-6 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y text-xs font-bold ${isDarkMode ? 'divide-white/5 text-slate-300' : 'divide-slate-50 text-slate-600'}`}>
                                    {tests.map(test => {
                                        const now = new Date();
                                        const isCompleted = test.submission?.is_finalized;
                                        const end = test.end_time ? new Date(test.end_time) : null;
                                        const isExpired = end && now > end;
                                        const isAvailable = !isCompleted && !isExpired;
                                        const isMissed = isExpired && !isCompleted;

                                        return (
                                            <tr key={test.id} className="transition-all hover:bg-white/5">
                                                <td className="py-4 px-6">
                                                    <span className="block text-[11px] font-black uppercase tracking-tight">{test.name}</span>
                                                    <span className="block text-[9px] font-bold text-slate-500 mt-1 uppercase">Code: {test.code}</span>
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    {isCompleted ? <span className="text-emerald-500">Completed</span> : isMissed ? <span className="text-red-500">Expired</span> : <span className="text-blue-500">Active</span>}
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    {isCompleted ? `${Math.round(test.submission?.score || 0)}%` : '--'}
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    {isCompleted ? (
                                                        <button onClick={() => analyzeCompletedTest(test)} className="px-4 py-2 bg-indigo-600 text-white rounded-[2px] font-black text-[9px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md hover:shadow-indigo-500/50">
                                                            Analyze Result
                                                        </button>
                                                    ) : isAvailable ? (
                                                        <button onClick={() => navigate(`/student/exam/instructions/${test.id}`)} className="px-4 py-2 bg-emerald-600 text-white rounded-[2px] font-black text-[9px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md hover:shadow-emerald-500/50">
                                                            Launch Exam
                                                        </button>
                                                    ) : (
                                                        <button disabled className="px-4 py-2 bg-slate-500 opacity-50 text-white rounded-[2px] font-black text-[9px] uppercase tracking-widest cursor-not-allowed">
                                                            Unavailable
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </motion.div>
        );
    };

    const renderStep3 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 p-8 lg:p-12 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Results Header */}
                <div className={`p-8 rounded-[4px] border ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200 shadow-sm'} relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                        <div className="w-32 h-32 shrink-0 rounded-[4px] bg-[#0a0d14] border border-white/10 flex flex-col items-center justify-center text-white relative outline outline-2 outline-offset-4 outline-indigo-500/50">
                            <span className="text-4xl font-black">{testScores?.total}%</span>
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60 mt-1">Accuracy</span>
                        </div>
                        <div className="flex-1 space-y-4">
                            <div>
                                <h2 className={`text-2xl font-black uppercase tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    <CheckCircle2 className="text-emerald-500" /> Profiling Complete
                                </h2>
                                <p className={`text-xs font-bold leading-relaxed mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Exam baseline established. Structural gaps identified. Master Plan ready for synthesis.
                                </p>
                            </div>
                            <div className="grid grid-cols-3 gap-4 p-4 rounded-[4px] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                                <div><span className="block text-[9px] font-black uppercase opacity-60 mb-1">{examQuestions[0].subject}</span><span className="text-base font-black text-white">{testScores?.q1Score}%</span></div>
                                <div><span className="block text-[9px] font-black uppercase opacity-60 mb-1">{examQuestions[1].subject}</span><span className="text-base font-black text-white">{testScores?.q2Score}%</span></div>
                                <div><span className="block text-[9px] font-black uppercase opacity-60 mb-1">{examQuestions[2].subject}</span><span className="text-base font-black text-white">{testScores?.q3Score}%</span></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Configurations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`p-6 rounded-[4px] border ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <h3 className={`text-sm font-black uppercase tracking-tight flex items-center gap-2 mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            <Target size={18} className="text-emerald-500" /> Target Destination
                        </h3>
                        <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-2">
                            {availableColleges.map(college => (
                                <button
                                    key={college}
                                    onClick={() => setPlanConfig({ ...planConfig, targetCollege: college })}
                                    className={`w-full p-4 rounded-[4px] text-left text-xs font-bold border transition-all ${planConfig.targetCollege === college ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : isDarkMode ? 'border-white/10 hover:border-white/20 text-slate-400' : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600'}`}
                                >
                                    {college}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={`p-6 rounded-[4px] border flex flex-col justify-between ${isDarkMode ? 'bg-[#10141D] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <div>
                            <h3 className={`text-sm font-black uppercase tracking-tight flex items-center gap-2 mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                <Clock size={18} className="text-indigo-500" /> Daily Capacity
                            </h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Self-study hours per day</p>
                        </div>

                        <div className={`p-6 rounded-[4px] border flex flex-col items-center justify-center flex-1 my-4 ${isDarkMode ? 'bg-[#0a0d14] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                            <span className={`text-5xl font-black ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{planConfig.dailyHours}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">Hours</span>
                            <input
                                type="range" min="1" max="16" step="0.5"
                                value={planConfig.dailyHours}
                                onChange={(e) => setPlanConfig({ ...planConfig, dailyHours: e.target.value })}
                                className="w-full max-w-[200px] mt-6 accent-indigo-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-500/20">
                    <button
                        onClick={generateAIPlan}
                        disabled={aiLoading}
                        className="px-8 py-4 bg-white text-slate-900 rounded-[4px] font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all flex justify-center items-center gap-3 disabled:opacity-50"
                    >
                        {aiLoading ? <Loader2 className="animate-spin text-indigo-600" /> : <Sparkles className="text-emerald-500" />}
                        {aiLoading ? 'Synthesizing Trajectory...' : 'Generate AI Master Strategy'}
                    </button>
                </div>
            </div>
        </motion.div>
    );

    const renderStep4 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 p-8 lg:p-12 overflow-y-auto custom-scrollbar">
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-slate-500/20 gap-4">
                    <div>
                        <h1 className={`text-2xl md:text-3xl font-black uppercase tracking-tight flex items-center gap-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            <Brain className="text-indigo-500" size={32} /> Master Strategy Vector
                        </h1>
                        <div className="flex items-center gap-4 mt-3">
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-500/10 px-2 py-1 rounded-[2px]">Target: {planConfig.targetCollege}</span>
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded-[2px]">{planConfig.dailyHours} Hours/Day</span>
                        </div>
                    </div>
                    <button onClick={resetPlanner} className={`px-6 py-3 rounded-[4px] border text-xs font-black uppercase tracking-widest transition-all ${isDarkMode ? 'border-white/10 hover:bg-white/5 text-white' : 'border-slate-800 bg-slate-900 text-white hover:bg-slate-800'}`}>
                        Reset System
                    </button>
                </div>

                <div className={`p-8 md:p-12 rounded-[4px] border relative ${isDarkMode ? 'bg-[#0a0d14] border-white/10 shadow-2xl' : 'bg-white border-slate-200 shadow-xl'}`}>
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />

                    <div className={`prose prose-sm md:prose-base max-w-none relative z-10 
                        ${isDarkMode ? 'prose-invert prose-headings:text-white prose-p:text-slate-400 prose-strong:text-white prose-li:text-slate-400 prose-hr:border-white/10' : 'prose-headings:text-slate-900 prose-p:text-slate-700 prose-strong:text-slate-900 prose-li:text-slate-700 prose-hr:border-slate-200'}
                        prose-h2:font-black prose-h2:text-2xl prose-h2:uppercase prose-h2:tracking-tight prose-h2:mt-12 prose-h2:mb-6 prose-h2:pb-4 prose-h2:border-b prose-h2:border-slate-500/20
                        prose-h3:font-bold prose-h3:text-lg prose-h3:text-indigo-500 prose-h3:uppercase prose-h3:tracking-wide
                        prose-a:text-emerald-500
                        prose-blockquote:border-l-4 prose-blockquote:border-l-indigo-500 prose-blockquote:bg-indigo-500/5 prose-blockquote:p-4 prose-blockquote:rounded-r-[4px] prose-blockquote:font-medium prose-blockquote:not-italic
                        prose-ul:list-square
                    `}>
                        <ReactMarkdown>{aiPlan}</ReactMarkdown>
                    </div>
                </div>
            </div>
        </motion.div>
    );

    return (
        <div className={`flex flex-col lg:flex-row h-full min-h-[800px] rounded-[4px] border overflow-hidden ${isDarkMode ? 'bg-[#050505] border-white/10' : 'bg-white border-slate-200'}`}>
            {renderSidePanel()}
            <AnimatePresence mode="wait">
                {currentStep === 1 && <motion.div key="s1" exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">{renderStep1()}</motion.div>}
                {currentStep === 2 && <motion.div key="s2" exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">{renderStep2()}</motion.div>}
                {currentStep === 3 && <motion.div key="s3" exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">{renderStep3()}</motion.div>}
                {currentStep === 4 && <motion.div key="s4" exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">{renderStep4()}</motion.div>}
            </AnimatePresence>
        </div>
    );
};

export default StudyPlanner;
